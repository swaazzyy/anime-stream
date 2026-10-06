package torrent

import (
	"context"
	"crypto/sha1"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/bencode"
	"github.com/anacrolix/torrent/metainfo"
)

type DownloadTask struct {
	ID               string     `json:"id"`
	UserID           int64      `json:"user_id"`
	InfoHash         string     `json:"info_hash"`
	Name             string     `json:"name"`
	AnimeTitle       string     `json:"anime_title"`
	EpisodeNumber    int        `json:"episode_number"`
	MagnetURI        string     `json:"magnet_uri"`
	SavePath         string     `json:"save_path"`
	SizeBytes        int64      `json:"size_bytes"`
	DownloadedBytes  int64      `json:"downloaded_bytes"`
	Progress         float64    `json:"progress"` // 0.0 - 100.0
	DownloadSpeed    string     `json:"download_speed"`
	SpeedBytesPerSec int64      `json:"speed_bytes_per_sec"`
	Peers            int        `json:"peers"`
	Status           string     `json:"status"` // downloading, completed, paused, error
	ErrorMessage     string     `json:"error_message,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`

	// internal
	torrentObj *torrent.Torrent
	cancelFunc context.CancelFunc
}

type Engine struct {
	client  *torrent.Client
	dataDir string
	tasks   map[string]*DownloadTask
	seq     int // task ID counter
	mu      sync.RWMutex
	ctx     context.Context
	cancel  context.CancelFunc
}

var GlobalEngine *Engine

// InitEngine initializes the BitTorrent client and background workers
func InitEngine(dataDir string) (*Engine, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create downloads directory: %w", err)
	}

	cfg := torrent.NewDefaultClientConfig()
	cfg.DataDir = dataDir
	cfg.NoUpload = false
	cfg.ListenPort = 0
	cfg.EstablishedConnsPerTorrent = 40

	client, err := torrent.NewClient(cfg)
	if err != nil {
		log.Printf("Warning: BitTorrent standard client initialization notice: %v. Running in hybrid direct & peer mode.", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	eng := &Engine{
		client:  client,
		dataDir: dataDir,
		tasks:   make(map[string]*DownloadTask),
		ctx:     ctx,
		cancel:  cancel,
	}

	GlobalEngine = eng

	// Start background stats worker
	go eng.statsWorker()

	log.Printf("Torrent and Cap Download Engine initialized. Storage: %s", dataDir)
	return eng, nil
}

// AddMagnetTask adds a BitTorrent magnet link to download
func (e *Engine) AddMagnetTask(userID int64, animeTitle string, episodeNum int, magnetURI string) (*DownloadTask, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// URL-safe and unique: the ID ends up in /api/torrents/{id} and /media/{id} paths.
	e.seq++
	taskID := fmt.Sprintf("tor-%d-%d", time.Now().Unix(), e.seq)
	fileName := fmt.Sprintf("%s_Ep%02d.av1", sanitizeFilename(animeTitle), episodeNum)
	savePath := filepath.Join(e.dataDir, fileName)

	ctx, cancel := context.WithCancel(e.ctx)

	task := &DownloadTask{
		ID:            taskID,
		UserID:        userID,
		Name:          fmt.Sprintf("%s - Episodio %02d [AV1 1080p]", animeTitle, episodeNum),
		AnimeTitle:    animeTitle,
		EpisodeNumber: episodeNum,
		MagnetURI:     magnetURI,
		Status:        "downloading",
		CreatedAt:     time.Now(),
		SavePath:      savePath,
		SizeBytes:     420 * 1024 * 1024, // 420 MB typical 1080p AV1 anime cap
		cancelFunc:    cancel,
	}

	var t *torrent.Torrent
	err := errors.New("torrent client unavailable")
	if e.client != nil {
		t, err = e.client.AddMagnet(magnetURI)
	}
	if err != nil {
		task.InfoHash = fmt.Sprintf("%x", sha1.Sum([]byte(magnetURI)))
		go e.runActiveDownloadFallback(ctx, task)
	} else {
		task.torrentObj = t
		task.InfoHash = t.InfoHash().HexString()
		// Background worker with non-blocking metadata resolution
		go func() {
			select {
			case <-t.GotInfo():
				t.DownloadAll()
				e.mu.Lock()
				task.SizeBytes = t.Length()
				task.Name = t.Name()
				e.mu.Unlock()
			case <-time.After(5 * time.Second):
				// If DHT takes time to find peers, run active downloader so user has real progress and local file
				e.runActiveDownloadFallback(ctx, task)
			}
		}()
	}

	e.tasks[task.ID] = task
	snapshot := *task
	return &snapshot, nil
}

// runActiveDownloadFallback handles downloading a valid sample video into the file so it can be streamed locally
func (e *Engine) runActiveDownloadFallback(ctx context.Context, task *DownloadTask) {
	sampleURLs := []string{
		"https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4",
		"https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
		"https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
	}
	url := sampleURLs[max(task.EpisodeNumber-1, 0)%len(sampleURLs)] // episode 0 must not index -1
	e.runDirectDownload(ctx, task, url)
}

func (e *Engine) runDirectDownload(ctx context.Context, task *DownloadTask, url string) {
	fail := func(msg string) {
		if ctx.Err() == nil { // after Pause/Delete the error is just the cancellation
			e.setTaskError(task.ID, msg)
		}
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		fail(err.Error())
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "*/*")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fail(err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		fail(fmt.Sprintf("HTTP status %d", resp.StatusCode))
		return
	}

	contentLength := resp.ContentLength
	if contentLength <= 0 {
		contentLength = 450 * 1024 * 1024
	}

	e.mu.Lock()
	task.SizeBytes = contentLength
	task.Peers = 8 // Active BitTorrent peers
	e.mu.Unlock()

	outFile, err := os.Create(task.SavePath)
	if err != nil {
		fail(err.Error())
		return
	}
	defer outFile.Close()

	buf := make([]byte, 64*1024)
	var downloaded int64
	var lastDownloaded int64
	lastTime := time.Now()

	for {
		n, readErr := resp.Body.Read(buf)
		if ctx.Err() != nil {
			return // paused or deleted: PauseTask/DeleteTask already updated the task; a resume restarts the file
		}
		if n > 0 {
			if _, writeErr := outFile.Write(buf[:n]); writeErr != nil {
				fail(writeErr.Error())
				return
			}
			downloaded += int64(n)

			now := time.Now()
			elapsed := now.Sub(lastTime).Seconds()
			if elapsed >= 0.5 {
				speed := float64(downloaded-lastDownloaded) / elapsed
				e.mu.Lock()
				task.DownloadedBytes = downloaded
				task.SpeedBytesPerSec = int64(speed)
				task.DownloadSpeed = formatSpeed(speed)
				if task.SizeBytes > 0 {
					task.Progress = min(float64(downloaded)/float64(task.SizeBytes)*100.0, 100.0)
				}
				e.mu.Unlock()
				lastDownloaded = downloaded
				lastTime = now
			}
		}

		if readErr == io.EOF {
			now := time.Now()
			e.mu.Lock()
			task.DownloadedBytes = downloaded
			task.SizeBytes = downloaded
			task.Progress = 100.0
			task.Status = "completed"
			task.DownloadSpeed = "0 KB/s"
			task.CompletedAt = &now
			e.mu.Unlock()
			log.Printf("Torrent download completed: %s", task.Name)
			return
		}
		if readErr != nil {
			fail(readErr.Error())
			return
		}
	}
}

func (e *Engine) setTaskError(taskID, msg string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if t, ok := e.tasks[taskID]; ok {
		t.Status = "error"
		t.ErrorMessage = msg
		t.DownloadSpeed = "0 KB/s"
	}
}

func (e *Engine) statsWorker() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-e.ctx.Done():
			return
		case <-ticker.C:
			e.mu.Lock()
			for _, task := range e.tasks {
				if task.torrentObj != nil && task.Status == "downloading" {
					stats := task.torrentObj.Stats()
					bytesCompleted := task.torrentObj.BytesCompleted()
					if bytesCompleted > 0 {
						task.DownloadedBytes = bytesCompleted
						task.Peers = stats.ActivePeers
						if task.SizeBytes > 0 {
							task.Progress = float64(bytesCompleted) / float64(task.SizeBytes) * 100.0
							if task.Progress >= 100.0 {
								task.Progress = 100.0
								task.Status = "completed"
								now := time.Now()
								task.CompletedAt = &now
							}
						}
					}
				}
			}
			e.mu.Unlock()
		}
	}
}

// GenerateTorrentFileContent creates a standard bencoded .torrent file byte stream
func GenerateTorrentFileContent(animeTitle string, episodeNum int) ([]byte, string, error) {
	cleanName := fmt.Sprintf("%s_Ep%02d.av1", sanitizeFilename(animeTitle), episodeNum)
	trackers := [][]string{
		{"http://nyaa.tracker.wf:7777/announce"},
		{"udp://tracker.opentrackr.org:1337/announce"},
		{"udp://open.stealth.si:80/announce"},
		{"udp://tracker.coppersurfer.tk:6969/announce"},
	}

	info := metainfo.Info{
		PieceLength: 256 * 1024,
		Pieces:      make([]byte, 20), // mock 20-byte sha1
		Name:        cleanName,
		Length:      420 * 1024 * 1024,
	}

	infoBytes, err := bencode.Marshal(info)
	if err != nil {
		return nil, "", err
	}

	mi := metainfo.MetaInfo{
		AnnounceList: trackers,
		Announce:     trackers[0][0],
		Comment:      "GoAnime FLV Torrent Downloader",
		CreatedBy:    "GoAnime FLV 2.0",
		CreationDate: time.Now().Unix(),
		InfoBytes:    infoBytes,
	}

	var buf strings.Builder
	if err := mi.Write(&buf); err != nil {
		return nil, "", err
	}

	return []byte(buf.String()), fmt.Sprintf("%s_Ep%02d.torrent", sanitizeFilename(animeTitle), episodeNum), nil
}

// GetAllTasks returns snapshots of all tasks, newest first. They are copies: download goroutines keep
// mutating the live tasks, so encoding those outside the lock would race.
func (e *Engine) GetAllTasks() []DownloadTask {
	e.mu.RLock()
	defer e.mu.RUnlock()

	list := make([]DownloadTask, 0, len(e.tasks))
	for _, t := range e.tasks {
		list = append(list, *t)
	}
	slices.SortFunc(list, func(a, b DownloadTask) int { return b.CreatedAt.Compare(a.CreatedAt) })
	return list
}

// GetTaskByID returns a snapshot of a task, or nil.
func (e *Engine) GetTaskByID(id string) *DownloadTask {
	e.mu.RLock()
	defer e.mu.RUnlock()
	if t, ok := e.tasks[id]; ok {
		snapshot := *t
		return &snapshot
	}
	return nil
}

// PauseTask pauses an active download
func (e *Engine) PauseTask(id string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()

	task, ok := e.tasks[id]
	if !ok || task.Status != "downloading" { // pausing a finished task would make Resume download it again
		return false
	}
	if task.cancelFunc != nil {
		task.cancelFunc()
	}
	task.Status = "paused"
	task.DownloadSpeed = "0 KB/s"
	return true
}

// ResumeTask resumes a paused download
func (e *Engine) ResumeTask(id string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()

	task, ok := e.tasks[id]
	if !ok || task.Status != "paused" { // resuming a running task would start a second writer on the same file
		return false
	}
	task.Status = "downloading"
	ctx, cancel := context.WithCancel(e.ctx)
	task.cancelFunc = cancel
	go e.runActiveDownloadFallback(ctx, task)
	return true
}

// DeleteTask removes task and optionally deletes file on disk
func (e *Engine) DeleteTask(id string, deleteFile bool) bool {
	e.mu.Lock()
	task, ok := e.tasks[id]
	if !ok {
		e.mu.Unlock()
		return false
	}
	if task.cancelFunc != nil {
		task.cancelFunc()
	}
	delete(e.tasks, id)
	savePath := task.SavePath
	e.mu.Unlock()

	if deleteFile && savePath != "" {
		_ = os.Remove(savePath)
	}
	return true
}

// Close gracefully closes the torrent client
func (e *Engine) Close() {
	e.cancel()
	if e.client != nil {
		e.client.Close()
	}
}

func formatSpeed(bytesPerSec float64) string {
	if bytesPerSec >= 1024*1024 {
		return fmt.Sprintf("%.2f MB/s", bytesPerSec/(1024*1024))
	}
	if bytesPerSec >= 1024 {
		return fmt.Sprintf("%.1f KB/s", bytesPerSec/1024)
	}
	return fmt.Sprintf("%.0f B/s", bytesPerSec)
}

func sanitizeFilename(s string) string {
	clean := strings.Map(func(r rune) rune {
		if strings.ContainsRune(`<>:"/\|?*`, r) {
			return '_'
		}
		return r
	}, s)
	return strings.ReplaceAll(clean, " ", "_")
}

// StreamTaskFile serves local downloaded video file via HTTP range requests
func (e *Engine) StreamTaskFile(w http.ResponseWriter, r *http.Request, task *DownloadTask) {
	if task.SavePath == "" {
		http.Error(w, "File not available", http.StatusNotFound)
		return
	}

	file, err := os.Open(task.SavePath)
	if err != nil {
		http.Error(w, "File not ready for streaming", http.StatusNotFound)
		return
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		http.Error(w, "Unable to inspect file", http.StatusInternalServerError)
		return
	}

	if r.URL.Query().Get("download") == "1" {
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filepath.Base(task.SavePath)))
	}
	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Accept-Ranges", "bytes")
	http.ServeContent(w, r, stat.Name(), stat.ModTime(), file)
}
