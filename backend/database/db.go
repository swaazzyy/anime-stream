package database

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Avatar    string    `json:"avatar"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type WatchHistory struct {
	ID              int64     `json:"id"`
	UserID          int64     `json:"user_id"`
	AnimeID         string    `json:"anime_id"`
	AnimeTitle      string    `json:"anime_title"`
	AnimePoster     string    `json:"anime_poster"`
	EpisodeNumber   int       `json:"episode_number"`
	EpisodeTitle    string    `json:"episode_title"`
	ProgressSeconds int       `json:"progress_seconds"`
	DurationSeconds int       `json:"duration_seconds"`
	Completed       bool      `json:"completed"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type WatchlistItem struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	AnimeID     string    `json:"anime_id"`
	AnimeTitle  string    `json:"anime_title"`
	AnimePoster string    `json:"anime_poster"`
	Status      string    `json:"status"` // plan_to_watch, watching, completed, dropped
	Score       int       `json:"score"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type FavoriteItem struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	AnimeID     string    `json:"anime_id"`
	AnimeTitle  string    `json:"anime_title"`
	AnimePoster string    `json:"anime_poster"`
	CreatedAt   time.Time `json:"created_at"`
}

// InitDB initializes SQLite database and creates tables if they don't exist
func InitDB(dbPath string) (*sql.DB, error) {
	connStr := fmt.Sprintf("%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)", dbPath)
	db, err := sql.Open("sqlite", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping sqlite database: %w", err)
	}

	DB = db

	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS watch_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		anime_id TEXT NOT NULL,
		anime_title TEXT NOT NULL,
		anime_poster TEXT NOT NULL,
		episode_number INTEGER NOT NULL,
		episode_title TEXT NOT NULL,
		progress_seconds INTEGER NOT NULL DEFAULT 0,
		duration_seconds INTEGER NOT NULL DEFAULT 0,
		completed BOOLEAN NOT NULL DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, anime_id, episode_number),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS watchlist (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		anime_id TEXT NOT NULL,
		anime_title TEXT NOT NULL,
		anime_poster TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'plan_to_watch',
		score INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, anime_id),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS favorites (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		anime_id TEXT NOT NULL,
		anime_title TEXT NOT NULL,
		anime_poster TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, anime_id),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`

	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	// Add avatar column if it doesn't exist
	_, _ = db.Exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT '';")

	// Clean up and normalize legacy non-slug IDs in watch_history and watchlist.
	// (Match by ID only: a title match would also rewrite the other "Alicization" seasons.)
	_, _ = db.Exec(`UPDATE watch_history SET anime_id = 'sword-art-online-alicization-war-of-underworld' WHERE anime_id = '108759';`)
	_, _ = db.Exec(`UPDATE watch_history SET anime_id = 'dororo' WHERE anime_id = 'accion' AND anime_title = 'Dororo';`)
	_, _ = db.Exec(`UPDATE watchlist SET anime_id = 'sword-art-online-alicization-war-of-underworld' WHERE anime_id = '108759';`)
	_, _ = db.Exec(`UPDATE watchlist SET anime_id = 'dororo' WHERE anime_id = 'accion' AND anime_title = 'Dororo';`)

	log.Println("SQLite database initialized successfully at", dbPath)
	return db, nil
}

// JWTSecret returns this install's random token-signing key, created on first start and kept across restarts.
func JWTSecret() ([]byte, error) {
	if _, err := DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('jwt_secret', ?)", rand.Text()); err != nil {
		return nil, err
	}
	var secret string
	err := DB.QueryRow("SELECT value FROM settings WHERE key = 'jwt_secret'").Scan(&secret)
	return []byte(secret), err
}

// User methods
func CreateUser(username, email, passwordHash string) (*User, error) {
	res, err := DB.Exec("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", username, email, passwordHash)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &User{
		ID:        id,
		Username:  username,
		Email:     email,
		CreatedAt: time.Now(),
	}, nil
}

func getUser(column string, value any) (*User, error) {
	var u User
	err := DB.QueryRow("SELECT id, username, email, COALESCE(avatar, ''), password_hash, created_at FROM users WHERE "+column+" = ?", value).
		Scan(&u.ID, &u.Username, &u.Email, &u.Avatar, &u.Password, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func GetUserByUsername(username string) (*User, error) { return getUser("username", username) }
func GetUserByID(id int64) (*User, error)              { return getUser("id", id) }

// UpdateUserProfile renames/re-avatars a user; a taken username fails on the users.username UNIQUE constraint.
func UpdateUserProfile(userID int64, username, avatar string) (*User, error) {
	if _, err := DB.Exec("UPDATE users SET username = ?, avatar = ? WHERE id = ?", username, avatar, userID); err != nil {
		return nil, err
	}
	return GetUserByID(userID)
}

func UpdateUserPasswordHash(userID int64, passwordHash string) error {
	_, err := DB.Exec("UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, userID)
	return err
}

// WatchHistory methods (Still Viewing / Continue Watching)
func SaveWatchProgress(userID int64, h WatchHistory) error {
	// Normalize known anime IDs
	if h.AnimeID == "108759" {
		h.AnimeID = "sword-art-online-alicization-war-of-underworld"
	} else if h.AnimeID == "accion" && strings.Contains(strings.ToLower(h.AnimeTitle), "dororo") {
		h.AnimeID = "dororo"
	}

	query := `
	INSERT INTO watch_history (user_id, anime_id, anime_title, anime_poster, episode_number, episode_title, progress_seconds, duration_seconds, completed, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	ON CONFLICT(user_id, anime_id, episode_number) DO UPDATE SET
		anime_title = excluded.anime_title,
		anime_poster = excluded.anime_poster,
		episode_title = excluded.episode_title,
		progress_seconds = excluded.progress_seconds,
		duration_seconds = excluded.duration_seconds,
		completed = excluded.completed,
		updated_at = CURRENT_TIMESTAMP;
	`
	_, err := DB.Exec(query, userID, h.AnimeID, h.AnimeTitle, h.AnimePoster, h.EpisodeNumber, h.EpisodeTitle, h.ProgressSeconds, h.DurationSeconds, h.Completed)
	return err
}

func GetContinueWatching(userID int64, limit int) ([]WatchHistory, error) {
	query := `
	SELECT id, user_id, anime_id, anime_title, anime_poster, episode_number, episode_title, progress_seconds, duration_seconds, completed, updated_at
	FROM watch_history
	WHERE user_id = ? AND completed = 0 AND progress_seconds > 10
	ORDER BY updated_at DESC
	LIMIT ?
	`
	rows, err := DB.Query(query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []WatchHistory
	for rows.Next() {
		var h WatchHistory
		if err := rows.Scan(&h.ID, &h.UserID, &h.AnimeID, &h.AnimeTitle, &h.AnimePoster, &h.EpisodeNumber, &h.EpisodeTitle, &h.ProgressSeconds, &h.DurationSeconds, &h.Completed, &h.UpdatedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, rows.Err()
}

func DeleteWatchHistory(userID int64, animeID string, episodeNum int) error {
	_, err := DB.Exec("DELETE FROM watch_history WHERE user_id = ? AND anime_id = ? AND episode_number = ?", userID, animeID, episodeNum)
	return err
}

// Watchlist methods (For the Future / My Lists)
func SetWatchlistItem(userID int64, item WatchlistItem) error {
	query := `
	INSERT INTO watchlist (user_id, anime_id, anime_title, anime_poster, status, score, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	ON CONFLICT(user_id, anime_id) DO UPDATE SET
		anime_title = excluded.anime_title,
		anime_poster = excluded.anime_poster,
		status = excluded.status,
		score = excluded.score,
		updated_at = CURRENT_TIMESTAMP;
	`
	_, err := DB.Exec(query, userID, item.AnimeID, item.AnimeTitle, item.AnimePoster, item.Status, item.Score)
	return err
}

// GetWatchlist returns the user's list; statusFilter "" or "all" means every status.
func GetWatchlist(userID int64, statusFilter string) ([]WatchlistItem, error) {
	query := `
	SELECT id, user_id, anime_id, anime_title, anime_poster, status, score, created_at, updated_at
	FROM watchlist
	WHERE user_id = ? AND (? IN ('', 'all') OR status = ?)
	ORDER BY updated_at DESC
	`
	rows, err := DB.Query(query, userID, statusFilter, statusFilter)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []WatchlistItem
	for rows.Next() {
		var item WatchlistItem
		if err := rows.Scan(&item.ID, &item.UserID, &item.AnimeID, &item.AnimeTitle, &item.AnimePoster, &item.Status, &item.Score, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func RemoveFromWatchlist(userID int64, animeID string) error {
	_, err := DB.Exec("DELETE FROM watchlist WHERE user_id = ? AND anime_id = ?", userID, animeID)
	return err
}

func IsInWatchlist(userID int64, animeID string) (bool, string, int) {
	var status string
	var score int
	if err := DB.QueryRow("SELECT status, score FROM watchlist WHERE user_id = ? AND anime_id = ?", userID, animeID).Scan(&status, &score); err != nil {
		return false, "", 0
	}
	return true, status, score
}

func IsFavorite(userID int64, animeID string) bool {
	var one int
	return DB.QueryRow("SELECT 1 FROM favorites WHERE user_id = ? AND anime_id = ?", userID, animeID).Scan(&one) == nil
}

// Favorites methods
func ToggleFavorite(userID int64, f FavoriteItem) (bool, error) {
	res, err := DB.Exec("DELETE FROM favorites WHERE user_id = ? AND anime_id = ?", userID, f.AnimeID)
	if err != nil {
		return false, err
	}
	if n, _ := res.RowsAffected(); n > 0 {
		return false, nil
	}
	_, err = DB.Exec("INSERT INTO favorites (user_id, anime_id, anime_title, anime_poster) VALUES (?, ?, ?, ?)", userID, f.AnimeID, f.AnimeTitle, f.AnimePoster)
	return true, err
}

func GetFavorites(userID int64) ([]FavoriteItem, error) {
	query := `SELECT id, user_id, anime_id, anime_title, anime_poster, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC`
	rows, err := DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var favs []FavoriteItem
	for rows.Next() {
		var f FavoriteItem
		if err := rows.Scan(&f.ID, &f.UserID, &f.AnimeID, &f.AnimeTitle, &f.AnimePoster, &f.CreatedAt); err != nil {
			return nil, err
		}
		favs = append(favs, f)
	}
	return favs, rows.Err()
}
