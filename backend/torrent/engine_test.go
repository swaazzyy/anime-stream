package torrent

import (
	"context"
	"testing"
)

// Episode 0 ("Episodio 0" specials) used to index sampleURLs[-1] and crash the whole server,
// and a cancelled (paused) download used to flip the task to "error".
func TestFallbackEpisodeZeroPaused(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // offline: the request fails at once, like a download paused mid-flight
	task := &DownloadTask{ID: "t", EpisodeNumber: 0, Status: "paused"}
	e := &Engine{tasks: map[string]*DownloadTask{task.ID: task}}

	e.runActiveDownloadFallback(ctx, task)

	if task.Status != "paused" {
		t.Fatalf("status = %q, want paused", task.Status)
	}
}
