package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
	"time"

	"anime-stream-backend/api"
	"anime-stream-backend/auth"
	"anime-stream-backend/database"
)

//go:embed all:dist
var embeddedDist embed.FS

// corsMiddleware adds standard CORS headers for client-server communication
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	port := getenv("PORT", "8080")

	// 1. Initialize SQLite Database
	dbPath := getenv("DB_PATH", "anime_stream.db")
	db, err := database.InitDB(dbPath)
	if err != nil {
		// SQLite also creates -wal/-shm files next to the DB, so its folder must be writable, not just the file.
		log.Fatalf("Fatal: Database initialization failed for %s: %v (its folder must be writable by this user; DB_PATH moves it)", dbPath, err)
	}
	defer db.Close()

	secret, err := database.JWTSecret()
	if err != nil {
		log.Fatalf("Fatal: Could not load the token signing key: %v", err)
	}
	auth.SetSecret(secret)

	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("POST /api/auth/register", api.HandleRegister)
	mux.HandleFunc("POST /api/auth/login", api.HandleLogin)
	mux.HandleFunc("GET /api/auth/me", api.HandleMe)
	mux.HandleFunc("PUT /api/auth/profile", api.HandleUpdateProfile)
	mux.HandleFunc("PUT /api/auth/password", api.HandleUpdatePassword)

	// Catalog & Anime routes
	mux.HandleFunc("GET /api/anime/catalog", api.HandleCatalog)
	mux.HandleFunc("GET /api/anime/search", api.HandleSearchAnime)
	mux.HandleFunc("GET /api/anime/{id}", api.HandleGetAnime)
	mux.HandleFunc("GET /api/anime/{id}/episode/{ep}", api.HandleGetEpisode)

	// Watch History ("Still Viewing"), Watchlist ("For the future"), Favorites
	mux.HandleFunc("/api/history", api.HandleHistory)
	mux.HandleFunc("/api/watchlist", api.HandleWatchlist)
	mux.HandleFunc("/api/favorites", api.HandleFavorites)

	// VPN & Gluetun status route
	mux.HandleFunc("GET /api/vpn/status", api.HandleVPNStatus)

	// Frontend is embedded at build time (vite builds straight into backend/dist); FRONTEND_DIST overrides it with a folder on disk.
	distFS, _ := fs.Sub(embeddedDist, "dist")
	if dir := os.Getenv("FRONTEND_DIST"); dir != "" {
		distFS = os.DirFS(dir)
		log.Printf("Serving frontend from FRONTEND_DIST: %s", dir)
	}
	fileServer := http.FileServerFS(distFS)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		// SPA fallback: client-side routes (/media/:slug/:ep, /watchlist, ...) get index.html
		if fi, err := fs.Stat(distFS, strings.TrimPrefix(path.Clean(r.URL.Path), "/")); err != nil || fi.IsDir() {
			http.ServeFileFS(w, r, distFS, "index.html")
			return
		}
		fileServer.ServeHTTP(w, r)
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      http.MaxBytesHandler(corsMiddleware(auth.Middleware(mux)), 1<<20), // no API body needs more than 1 MB
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown handling
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("🚀 Anime Streaming Server listening on http://localhost:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced shutdown: %v", err)
	}

	log.Println("Server exited cleanly.")
}
