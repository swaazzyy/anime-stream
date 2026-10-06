package providers

import (
	"fmt"
	"log"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Anime struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	JapaneseTitle string    `json:"japanese_title"`
	Synopsis      string    `json:"synopsis"`
	Poster        string    `json:"poster"`
	Banner        string    `json:"banner"`
	Genres        []string  `json:"genres"`
	Score         float64   `json:"score"`
	Status        string    `json:"status"` // Airing, Finished
	TotalEpisodes int       `json:"total_episodes"`
	Year          int       `json:"year"`
	Type          string    `json:"type"` // TV, Movie
	TrailerURL    string    `json:"trailer_url,omitempty"`
	Studio        string    `json:"studio,omitempty"`
	Episodes      []Episode `json:"episodes,omitempty"`

	fetchedAt time.Time // set on live AnimeAV1 detail fetches; zero means "never fresh"
}

// detailsTTL bounds how long cached details are served, so airing shows pick up new episodes.
const detailsTTL = 30 * time.Minute

type Episode struct {
	Number    int              `json:"number"`
	Title     string           `json:"title"`
	Thumbnail string           `json:"thumbnail"`
	Duration  int              `json:"duration"` // in seconds
	Synopsis  string           `json:"synopsis,omitempty"`
	Servers   []Server         `json:"servers,omitempty"`
	Downloads []DownloadOption `json:"downloads,omitempty"`
}

type Server struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	ServerType string `json:"server_type"` // embed, direct_mp4
	URL        string `json:"url"`
	Quality    string `json:"quality"`
	Audio      string `json:"audio"`
}

type DownloadOption struct {
	Name    string `json:"name"`
	Type    string `json:"type"` // magnet, torrent_file, direct, direct_mp4
	URL     string `json:"url"`
	Size    string `json:"size"`
	Quality string `json:"quality"`
	Audio   string `json:"audio"`
}

type CatalogResponse struct {
	HeroSlides []Anime              `json:"hero_slides"`
	Trending   []Anime              `json:"trending"`
	Popular    []Anime              `json:"popular"`
	LatestCaps []AnimeAV1LatestCard `json:"latest_caps"`
	TopRated   []Anime              `json:"top_rated"`
}

var (
	cacheMutex    sync.RWMutex
	animeCache    = make(map[string]*Anime)
	catalogMutex  sync.RWMutex
	cachedCatalog CatalogResponse
)

// buildInstantCatalog constructs an immediate catalog from the curated list (no network except latest caps)
func buildInstantCatalog() CatalogResponse {
	popular := slices.Clone(CuratedAnimeAV1)
	slices.Reverse(popular)

	topRated := []Anime{}
	for _, a := range CuratedAnimeAV1 {
		if a.Score >= 8.5 {
			topRated = append(topRated, a)
		}
	}

	return CatalogResponse{
		HeroSlides: CuratedAnimeAV1[:5],
		Trending:   CuratedAnimeAV1,
		Popular:    popular,
		LatestCaps: GetAnimeAV1LatestEpisodes(),
		TopRated:   topRated,
	}
}

// EnrichAnimeWithRealDetails fills episode counts and ratings from the cache, the curated list or live AnimeAV1
// details. It waits at most 3s; slower lookups only fill the cache (they never touch list, which the caller
// may already be serving), so the next listing picks them up.
func EnrichAnimeWithRealDetails(list []Anime) []Anime {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)

	for i := range list {
		if enrichFromKnown(&list[i]) {
			continue
		}
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if details, err := FetchAnimeAV1Details(id); err == nil {
				cacheMutex.Lock()
				animeCache[details.ID] = details
				cacheMutex.Unlock()
			}
		}(list[i].ID)
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
	}

	for i := range list {
		enrichFromKnown(&list[i])
	}
	return list
}

// enrichFromKnown copies episode count and rating from the cache or the curated list (movies count 1 episode).
// It reports whether a was resolved without a network lookup.
func enrichFromKnown(a *Anime) bool {
	cacheMutex.RLock()
	src := animeCache[a.ID]
	cacheMutex.RUnlock()

	if src == nil || src.TotalEpisodes == 0 {
		src = nil
		slug := Slugify(a.Title)
		for i := range CuratedAnimeAV1 {
			if CuratedAnimeAV1[i].ID == a.ID || CuratedAnimeAV1[i].ID == slug {
				src = &CuratedAnimeAV1[i]
				break
			}
		}
	}
	if src != nil {
		a.TotalEpisodes = src.TotalEpisodes
		if src.Score > 0 {
			a.Score = src.Score
		}
		return true
	}
	if a.Type == "Película" || strings.Contains(strings.ToLower(a.Title), "movie") || strings.Contains(strings.ToLower(a.Title), "película") {
		a.TotalEpisodes = 1
		return true
	}
	return false
}

// refreshCatalogFromNetwork queries live AnimeAV1 in background
func refreshCatalogFromNetwork() {
	fetchOr := func(page int, order string) []Anime {
		items, err := FetchAnimeAV1Catalog(page, order, "") // already enriched
		if err != nil || len(items) == 0 {
			return CuratedAnimeAV1
		}
		return items
	}
	trending := fetchOr(1, "default")
	popular := fetchOr(1, "popular")
	topRated := fetchOr(2, "popular")

	heroSlides := []Anime{CuratedAnimeAV1[0]} // One Piece
	seen := map[string]bool{CuratedAnimeAV1[0].ID: true}
	for _, a := range append(slices.Clone(popular), trending...) {
		if len(heroSlides) < 5 && !seen[a.ID] {
			seen[a.ID] = true
			heroSlides = append(heroSlides, a)
		}
	}

	cacheMutex.Lock()
	for _, list := range [][]Anime{trending, popular, topRated} {
		for i := range list {
			animeCache[list[i].ID] = &list[i]
		}
	}
	cacheMutex.Unlock()

	catalogMutex.Lock()
	cachedCatalog = CatalogResponse{
		HeroSlides: heroSlides,
		Trending:   trending,
		Popular:    popular,
		LatestCaps: GetAnimeAV1LatestEpisodes(),
		TopRated:   topRated,
	}
	catalogMutex.Unlock()
}

func init() {
	// Initialize AnimeAV1 Curated Library (matches reference image)
	for i := range CuratedAnimeAV1 {
		CuratedAnimeAV1[i].Episodes = GenerateAnimeAV1Episodes(&CuratedAnimeAV1[i], CuratedAnimeAV1[i].TotalEpisodes)
		animeCache[CuratedAnimeAV1[i].ID] = &CuratedAnimeAV1[i]
	}

	// Instantly cache initial catalog so UI renders immediately without wait
	cachedCatalog = buildInstantCatalog()

	// Pre-cache AnimeAV1 catalog and refresh in background
	go func() {
		refreshCatalogFromNetwork()
		for page := 1; page <= 3; page++ {
			items, err := FetchAnimeAV1Catalog(page, "default", "")
			if err == nil {
				cacheMutex.Lock()
				for i := range items {
					if _, exists := animeCache[items[i].ID]; !exists {
						animeCache[items[i].ID] = &items[i]
					}
				}
				cacheMutex.Unlock()
			}
		}
		log.Printf("AnimeAV1 catalog preloaded into cache (%d items)", len(animeCache))

		ticker := time.NewTicker(10 * time.Minute)
		for range ticker.C {
			refreshCatalogFromNetwork()
		}
	}()
}

// GetCatalogData returns structured AnimeAV1 Crunchyroll-style rows instantly
func GetCatalogData() CatalogResponse {
	catalogMutex.RLock()
	defer catalogMutex.RUnlock()
	return cachedCatalog
}

// SearchAnime searches AnimeAV1 catalog live and cache.
// filters (category, genre, status, order) are applied by animeav1 itself, so only its results are returned then.
func SearchAnime(query string, filters url.Values) ([]Anime, error) {
	query = strings.TrimSpace(query)
	results := []Anime{}
	qLower := strings.ToLower(query)
	if strings.Contains(qLower, "hentai") {
		return results, nil
	}
	if len(filters) > 0 {
		if query != "" {
			filters.Set("search", query)
		}
		filtered, err := FetchAnimeAV1Filtered(filters)
		if err != nil && strings.Contains(err.Error(), "no media matches") {
			return results, nil // valid filter combo with zero results
		}
		return filtered, err
	}
	if query == "" {
		return CuratedAnimeAV1, nil
	}

	seen := make(map[string]bool)
	add := func(a Anime) {
		if !seen[a.ID] {
			seen[a.ID] = true
			results = append(results, a)
		}
	}
	matches := func(fields ...string) bool {
		for _, f := range fields {
			if strings.Contains(strings.ToLower(f), qLower) {
				return true
			}
		}
		return false
	}

	// 1. Direct slug lookup if query looks like a slug or title (e.g. sword-art-online-alicization-war-of-underworld)
	if directAnime, err := FetchAnimeAV1Details(Slugify(query)); err == nil && directAnime != nil {
		add(*directAnime)
		cacheMutex.Lock()
		animeCache[directAnime.ID] = directAnime
		cacheMutex.Unlock()
	}

	// 2. Live search from AnimeAV1.com (plus a spaced variant for slug-like queries); already enriched
	av1Results, _ := FetchAnimeAV1Catalog(1, "default", query)
	if strings.Contains(query, "-") {
		more, _ := FetchAnimeAV1Catalog(1, "default", strings.ReplaceAll(query, "-", " "))
		av1Results = append(av1Results, more...)
	}
	for _, a := range av1Results {
		add(a)
	}

	// 3. Check CuratedAnimeAV1
	for _, a := range CuratedAnimeAV1 {
		if matches(a.Title, a.ID) {
			add(a)
		}
	}

	// 4. Check local animeCache
	cacheMutex.RLock()
	for _, a := range animeCache {
		if matches(a.Title, a.JapaneseTitle, a.ID) {
			add(*a)
		}
	}
	cacheMutex.RUnlock()

	// 5. Fallback AniList search if nothing was found
	if len(results) == 0 {
		aniResults, _ := SearchAniList(query)
		for _, a := range aniResults {
			if !strings.Contains(strings.ToLower(a.Title), "hentai") {
				add(a)
			}
		}
	}

	return results, nil
}

// GetAnimeByID finds anime by ID in AnimeAV1 live details, cache, Curated, or AniList fallback
func GetAnimeByID(id string) (*Anime, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("anime id required")
	}
	if strings.Contains(strings.ToLower(id), "hentai") {
		return nil, fmt.Errorf("contenido no disponible")
	}

	// 1. Check local memory cache if it has recently fetched episodes
	cacheMutex.RLock()
	cached := animeCache[id]
	cacheMutex.RUnlock()
	hasEpisodes := cached != nil && len(cached.Episodes) > 0
	if hasEpisodes && time.Since(cached.fetchedAt) < detailsTTL {
		return cached, nil
	}

	// 2. Live fetch anime from AnimeAV1 by slug (extracts real episodes)
	liveAnime, err := FetchAnimeAV1Details(id)
	if err == nil && liveAnime != nil {
		cacheMutex.Lock()
		animeCache[id] = liveAnime
		animeCache[liveAnime.ID] = liveAnime
		cacheMutex.Unlock()
		return liveAnime, nil
	}
	if hasEpisodes { // stale (or curated / AniList-only) beats nothing; don't retry the live fetch until the TTL passes
		retryLater := *cached // copy: cached entries are read without the lock
		retryLater.fetchedAt = time.Now()
		cacheMutex.Lock()
		animeCache[id] = &retryLater
		cacheMutex.Unlock()
		return &retryLater, nil
	}

	// 3. Fallback: check CuratedAnimeAV1
	for _, a := range CuratedAnimeAV1 {
		if a.ID == id || Slugify(a.Title) == id || strings.EqualFold(a.Title, id) {
			if len(a.Episodes) == 0 {
				a.Episodes = GenerateAnimeAV1Episodes(&a, a.TotalEpisodes)
			}
			return &a, nil
		}
	}

	// 4. If ID is numeric (e.g. AniList ID like "108759"), lookup via AniList
	if intID, err := strconv.Atoi(id); err == nil && intID > 0 {
		if ani, err := FetchAniListMediaDetails(intID); err == nil && ani != nil {
			titleSlug := Slugify(ani.Title)
			// Match in Curated
			for _, a := range CuratedAnimeAV1 {
				if a.ID == titleSlug || Slugify(a.Title) == titleSlug || strings.Contains(strings.ToLower(a.Title), strings.ToLower(ani.Title)) {
					cacheMutex.Lock()
					animeCache[id] = &a
					animeCache[titleSlug] = &a
					cacheMutex.Unlock()
					return &a, nil
				}
			}
			// Match on AnimeAV1 live
			if av1, err := FetchAnimeAV1Details(titleSlug); err == nil && av1 != nil {
				cacheMutex.Lock()
				animeCache[id] = av1
				animeCache[titleSlug] = av1
				cacheMutex.Unlock()
				return av1, nil
			}
			// Fallback: AniList media enriched with AnimeAV1 episodes
			ani.Episodes = GenerateAnimeAV1Episodes(ani, ani.TotalEpisodes)
			cacheMutex.Lock()
			animeCache[id] = ani
			cacheMutex.Unlock()
			return ani, nil
		}
	}

	// 5. Try search AnimeAV1 & cache
	if results, err := SearchAnime(id, nil); err == nil && len(results) > 0 {
		match := &results[0]
		if len(match.Episodes) == 0 {
			match.Episodes = GenerateAnimeAV1Episodes(match, match.TotalEpisodes)
		}
		cacheMutex.Lock()
		animeCache[id] = match
		cacheMutex.Unlock()
		return match, nil
	}

	return nil, fmt.Errorf("anime not found on animeav1: %s", id)
}
