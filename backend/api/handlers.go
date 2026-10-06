package api

import (
	"cmp"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"anime-stream-backend/auth"
	"anime-stream-backend/database"
	"anime-stream-backend/providers"
	"anime-stream-backend/torrent"
)

type credentials struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResp struct {
	Token string         `json:"token"`
	User  *database.User `json:"user"`
}

type AddDownloadReq struct {
	MagnetURI     string `json:"magnet_uri"`
	AnimeTitle    string `json:"anime_title"`
	EpisodeNumber int    `json:"episode_number"`
}

// WriteJSON is a helper to encode JSON responses
func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}

// userID returns the logged-in user's ID, or 0 for the shared guest profile.
func userID(r *http.Request) int64 {
	if u := auth.GetUserFromContext(r.Context()); u != nil {
		return u.ID
	}
	return 0
}

// Auth Handlers
func HandleRegister(w http.ResponseWriter, r *http.Request) {
	var req credentials
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
		WriteError(w, http.StatusBadRequest, "Username and password required")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	user, err := database.CreateUser(req.Username, req.Email, hash)
	if err != nil {
		WriteError(w, http.StatusConflict, "Username or email already exists")
		return
	}

	writeAuth(w, http.StatusCreated, user)
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req credentials
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := database.GetUserByUsername(req.Username)
	if err != nil || !auth.CheckPasswordHash(req.Password, user.Password) {
		WriteError(w, http.StatusUnauthorized, "Invalid username or password")
		return
	}

	writeAuth(w, http.StatusOK, user)
}

func writeAuth(w http.ResponseWriter, status int, user *database.User) {
	token, err := auth.GenerateToken(user.ID, user.Username)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to create authentication token")
		return
	}
	WriteJSON(w, status, AuthResp{Token: token, User: user})
}

func HandleMe(w http.ResponseWriter, r *http.Request) {
	authUser := auth.GetUserFromContext(r.Context())
	if authUser == nil {
		WriteJSON(w, http.StatusOK, map[string]interface{}{"authenticated": false})
		return
	}

	user, err := database.GetUserByID(authUser.ID)
	if err != nil {
		WriteError(w, http.StatusNotFound, "User not found")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"authenticated": true,
		"user":          user,
	})
}

type updateProfileReq struct {
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

type updatePasswordReq struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func HandleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == 0 {
		WriteError(w, http.StatusUnauthorized, "Debes iniciar sesión para editar tu perfil")
		return
	}

	// Avatar is a URL or a client-compressed 256px JPEG data URL (~40 KB); cap it so the users table can't be stuffed.
	const maxAvatar = 512 << 10
	var req updateProfileReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxAvatar+4096)).Decode(&req); err != nil || len(req.Avatar) > maxAvatar {
		WriteError(w, http.StatusBadRequest, "Datos de perfil inválidos o avatar demasiado grande")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" {
		WriteError(w, http.StatusBadRequest, "El nombre de usuario no puede estar vacío")
		return
	}

	user, err := database.UpdateUserProfile(uid, req.Username, req.Avatar)
	if err != nil && strings.Contains(err.Error(), "UNIQUE") {
		WriteError(w, http.StatusConflict, fmt.Sprintf("El nombre de usuario '%s' ya está en uso", req.Username))
		return
	}
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Error al guardar el perfil")
		return
	}

	writeAuth(w, http.StatusOK, user)
}

func HandleUpdatePassword(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == 0 {
		WriteError(w, http.StatusUnauthorized, "Debes iniciar sesión para cambiar tu contraseña")
		return
	}

	var req updatePasswordReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if len(req.NewPassword) < 4 {
		WriteError(w, http.StatusBadRequest, "La nueva contraseña debe tener al menos 4 caracteres")
		return
	}

	user, err := database.GetUserByID(uid)
	if err != nil {
		WriteError(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	if !auth.CheckPasswordHash(req.CurrentPassword, user.Password) {
		WriteError(w, http.StatusBadRequest, "La contraseña actual es incorrecta")
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Error al procesar la nueva contraseña")
		return
	}

	if err := database.UpdateUserPasswordHash(uid, hash); err != nil {
		WriteError(w, http.StatusInternalServerError, "Error al guardar la nueva contraseña")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Contraseña actualizada exitosamente"})
}

// listView drops the episode lists that catalog rows and search grids never show (One Piece alone is 1000+ entries).
func listView(list []providers.Anime) []providers.Anime {
	out := slices.Clone(list)
	for i := range out {
		out[i].Episodes = nil
	}
	return out
}

// Catalog & Anime Handlers
func HandleCatalog(w http.ResponseWriter, r *http.Request) {
	c := providers.GetCatalogData()
	c.HeroSlides, c.Trending, c.Popular, c.TopRated = listView(c.HeroSlides), listView(c.Trending), listView(c.Popular), listView(c.TopRated)
	WriteJSON(w, http.StatusOK, c)
}

func HandleSearchAnime(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filters := url.Values{}
	for _, k := range []string{"category", "genre", "status", "order"} {
		if v := q.Get(k); v != "" {
			filters.Set(k, v)
		}
	}
	results, err := providers.SearchAnime(q.Get("q"), filters)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, listView(results))
}

func resolveAnime(id string) (*providers.Anime, error) {
	if torrent.GlobalEngine != nil {
		if task := torrent.GlobalEngine.GetTaskByID(id); task != nil {
			return &providers.Anime{
				ID:            task.ID,
				Title:         task.AnimeTitle,
				Type:          "Descarga Local AV1",
				Status:        "Finalizado",
				TotalEpisodes: 1,
				Episodes:      []providers.Episode{{Number: task.EpisodeNumber, Title: fmt.Sprintf("Episodio %d", task.EpisodeNumber)}}, // the one local file
				Poster:        "https://cdn.animeav1.com/covers/4444.jpg",
				Synopsis:      fmt.Sprintf("Episodio %d descargado localmente en formato AV1 (.av1).", task.EpisodeNumber),
			}, nil
		}
	}

	anime, err := providers.GetAnimeByID(id)
	if err == nil && anime != nil {
		return anime, nil
	}

	// Try database lookup by anime_id to get title for fallback resolution
	var title string
	_ = database.DB.QueryRow("SELECT anime_title FROM watch_history WHERE anime_id = ? LIMIT 1", id).Scan(&title)
	if title == "" {
		_ = database.DB.QueryRow("SELECT anime_title FROM watchlist WHERE anime_id = ? LIMIT 1", id).Scan(&title)
	}
	if title != "" {
		if a, err2 := providers.GetAnimeByID(providers.Slugify(title)); err2 == nil && a != nil {
			return a, nil
		}
	}
	return nil, err
}

func HandleGetAnime(w http.ResponseWriter, r *http.Request) {
	anime, err := resolveAnime(r.PathValue("id"))
	if err != nil {
		WriteError(w, http.StatusNotFound, err.Error())
		return
	}

	uid := userID(r)
	inWatchlist, watchlistStatus, userScore := database.IsInWatchlist(uid, anime.ID)
	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"anime":            anime,
		"in_watchlist":     inWatchlist,
		"watchlist_status": watchlistStatus,
		"user_score":       userScore,
		"is_favorite":      database.IsFavorite(uid, anime.ID),
	})
}

func HandleGetEpisode(w http.ResponseWriter, r *http.Request) {
	epNum, err := strconv.Atoi(r.PathValue("ep"))
	if err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid episode number")
		return
	}

	id := r.PathValue("id")
	if torrent.GlobalEngine != nil {
		if task := torrent.GlobalEngine.GetTaskByID(id); task != nil {
			episode := providers.Episode{
				Number:    task.EpisodeNumber,
				Title:     fmt.Sprintf("Episodio %d [Local AV1]", task.EpisodeNumber),
				Thumbnail: "https://cdn.animeav1.com/screenshots/4444/1.jpg",
				Duration:  1440,
				Synopsis:  fmt.Sprintf("Capítulo reproducido desde el almacenamiento local en formato .av1 (%s).", task.Name),
				Servers: []providers.Server{
					{
						ID:         "local_av1_server",
						Name:       "Reproductor Local (.av1)",
						ServerType: "direct",
						URL:        fmt.Sprintf("/api/torrents/%s/stream", task.ID),
						Quality:    "1080p AV1",
					},
				},
			}
			WriteJSON(w, http.StatusOK, episode)
			return
		}
	}

	anime, err := resolveAnime(id)
	if err != nil {
		WriteError(w, http.StatusNotFound, err.Error())
		return
	}

	// Prefer the listed episode's thumbnail (looked up by number: lists may start at Episodio 0), then the CDN screenshot.
	thumbnail := cmp.Or(anime.Poster, anime.Banner)
	if mediaID := providers.ExtractMediaID(anime.Poster, anime.Banner); mediaID != "" {
		thumbnail = fmt.Sprintf("%s/screenshots/%s/%d.jpg", providers.AnimeAV1CDNBase, mediaID, epNum)
	}
	duration := 1440
	for _, ep := range anime.Episodes {
		if ep.Number == epNum {
			thumbnail = cmp.Or(ep.Thumbnail, thumbnail)
			duration = cmp.Or(ep.Duration, duration) // movies are listed at 7200
		}
	}
	slug := anime.ID
	if slug == "" {
		slug = providers.Slugify(anime.Title)
	}
	servers, downloads := providers.GetLiveAnimeAV1Episode(slug, anime.Title, epNum)
	episode := providers.Episode{
		Number:    epNum,
		Title:     fmt.Sprintf("Episodio %d", epNum),
		Thumbnail: thumbnail,
		Duration:  duration,
		Synopsis:  fmt.Sprintf("Capítulo %d de %s transmitido vía AnimeAV1 con servidores Zilla Networks, MEGA, UPNShare y Voe.", epNum, anime.Title),
		Servers:   servers,
		Downloads: downloads,
	}
	WriteJSON(w, http.StatusOK, episode)
}

// Watch History / Continue Watching Handlers
func HandleHistory(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)

	switch r.Method {
	case http.MethodGet:
		history, err := database.GetContinueWatching(uid, 20)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, history)

	case http.MethodPost:
		var req database.WatchHistory
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "Invalid progress body")
			return
		}
		if err := database.SaveWatchProgress(uid, req); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, map[string]string{"status": "saved"})

	case http.MethodDelete:
		animeID := r.URL.Query().Get("anime_id")
		epNum, _ := strconv.Atoi(r.URL.Query().Get("episode"))
		if animeID != "" {
			_ = database.DeleteWatchHistory(uid, animeID, epNum)
		}
		WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})

	default:
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// Watchlist / "For the future" Handlers
func HandleWatchlist(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)

	switch r.Method {
	case http.MethodGet:
		list, err := database.GetWatchlist(uid, r.URL.Query().Get("status"))
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, list)

	case http.MethodPost:
		var req database.WatchlistItem
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "Invalid watchlist body")
			return
		}
		if req.Status == "" {
			req.Status = "plan_to_watch"
		}
		if err := database.SetWatchlistItem(uid, req); err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})

	case http.MethodDelete:
		animeID := r.URL.Query().Get("anime_id")
		if animeID == "" {
			WriteError(w, http.StatusBadRequest, "anime_id required")
			return
		}
		_ = database.RemoveFromWatchlist(uid, animeID)
		WriteJSON(w, http.StatusOK, map[string]string{"status": "removed"})

	default:
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// Favorites Handlers
func HandleFavorites(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)

	switch r.Method {
	case http.MethodGet:
		favs, err := database.GetFavorites(uid)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, favs)

	case http.MethodPost:
		var req database.FavoriteItem
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "Invalid favorite payload")
			return
		}
		isFav, err := database.ToggleFavorite(uid, req)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}
		WriteJSON(w, http.StatusOK, map[string]interface{}{"is_favorite": isFav})

	default:
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// Torrent & Cap Download Handlers (registered only when torrent.GlobalEngine is up)
func HandleTorrents(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		WriteJSON(w, http.StatusOK, torrent.GlobalEngine.GetAllTasks())

	case http.MethodPost:
		var req AddDownloadReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, "Invalid download request")
			return
		}

		if req.MagnetURI == "" {
			cleanTitle := url.QueryEscape(fmt.Sprintf("%s - %02d [AV1 1080p]", req.AnimeTitle, req.EpisodeNumber))
			req.MagnetURI = fmt.Sprintf("magnet:?xt=urn:btih:3b245504fb5f3c478318134704090602f5eab35e&dn=%s", cleanTitle)
		}
		task, err := torrent.GlobalEngine.AddMagnetTask(userID(r), req.AnimeTitle, req.EpisodeNumber, req.MagnetURI)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, "Failed to start download: "+err.Error())
			return
		}
		WriteJSON(w, http.StatusCreated, task)

	default:
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// HandleTorrentAction handles POST /api/torrents/{id}/{pause|resume}
func HandleTorrentAction(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	switch r.PathValue("action") {
	case "pause":
		WriteJSON(w, http.StatusOK, map[string]bool{"paused": torrent.GlobalEngine.PauseTask(id)})
	case "resume":
		WriteJSON(w, http.StatusOK, map[string]bool{"resumed": torrent.GlobalEngine.ResumeTask(id)})
	default:
		WriteError(w, http.StatusBadRequest, "Invalid action")
	}
}

func HandleDeleteTorrent(w http.ResponseWriter, r *http.Request) {
	deleteFile := r.URL.Query().Get("delete_file") == "true"
	WriteJSON(w, http.StatusOK, map[string]bool{"success": torrent.GlobalEngine.DeleteTask(r.PathValue("id"), deleteFile)})
}

func HandleStreamTorrent(w http.ResponseWriter, r *http.Request) {
	task := torrent.GlobalEngine.GetTaskByID(r.PathValue("id"))
	if task == nil {
		WriteError(w, http.StatusNotFound, "Task not found")
		return
	}
	// Video playback keeps one response open for minutes; lift the server's 60s WriteTimeout.
	_ = http.NewResponseController(w).SetWriteDeadline(time.Time{})
	torrent.GlobalEngine.StreamTaskFile(w, r, task)
}

func HandleDownloadTorrentFile(w http.ResponseWriter, r *http.Request) {
	title := r.URL.Query().Get("title")
	if title == "" {
		title = "Anime_Episode"
	}
	epStr := r.URL.Query().Get("episode")
	epNum, _ := strconv.Atoi(epStr)
	if epNum <= 0 {
		epNum = 1
	}

	content, filename, err := torrent.GenerateTorrentFileContent(title, epNum)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to generate torrent: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/x-bittorrent")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Length", strconv.Itoa(len(content)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(content)
}
