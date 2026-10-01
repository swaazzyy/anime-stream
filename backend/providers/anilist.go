package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const anilistGraphQLURL = "https://graphql.anilist.co"

type anilistGraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

type anilistMedia struct {
	ID    int `json:"id"`
	Title struct {
		Romaji  string `json:"romaji"`
		English string `json:"english"`
		Native  string `json:"native"`
	} `json:"title"`
	CoverImage struct {
		ExtraLarge string `json:"extraLarge"`
		Large      string `json:"large"`
	} `json:"coverImage"`
	BannerImage       string   `json:"bannerImage"`
	Description       string   `json:"description"`
	Episodes          int      `json:"episodes"`
	AverageScore      float64  `json:"averageScore"`
	Status            string   `json:"status"`
	SeasonYear        int      `json:"seasonYear"`
	Format            string   `json:"format"`
	Genres            []string `json:"genres"`
	StreamingEpisodes []struct {
		Title     string `json:"title"`
		Thumbnail string `json:"thumbnail"`
		URL       string `json:"url"`
		Site      string `json:"site"`
	} `json:"streamingEpisodes"`
	Studios struct {
		Nodes []struct {
			Name string `json:"name"`
		} `json:"nodes"`
	} `json:"studios"`
	Trailer struct {
		ID   string `json:"id"`
		Site string `json:"site"`
	} `json:"trailer"`
}

type anilistPageResponse struct {
	Data struct {
		Page struct {
			Media []anilistMedia `json:"media"`
		} `json:"Page"`
		Media *anilistMedia `json:"Media"`
	} `json:"data"`
}

const anilistMediaFields = `
	id
	title { romaji english native }
	coverImage { extraLarge large }
	bannerImage
	description
	episodes
	averageScore
	status
	seasonYear
	format
	genres
	streamingEpisodes { title thumbnail url }
	studios(isMain: true) { nodes { name } }
	trailer { id site }
`

var anilistClient = &http.Client{Timeout: 12 * time.Second}

func executeAniListQuery(query string, variables map[string]interface{}) (*anilistPageResponse, error) {
	reqBody, err := json.Marshal(anilistGraphQLRequest{
		Query:     query,
		Variables: variables,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", anilistGraphQLURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AnimeStream/2.0 (AniList & AnimeFLV Integration)")

	resp, err := anilistClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("anilist api request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anilist api returned http %d", resp.StatusCode)
	}

	var res anilistPageResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, fmt.Errorf("failed to decode anilist json response: %w", err)
	}

	return &res, nil
}

func convertMediaToAnime(m *anilistMedia) Anime {
	title := m.Title.English
	if title == "" {
		title = m.Title.Romaji
	}

	poster := m.CoverImage.ExtraLarge
	if poster == "" {
		poster = m.CoverImage.Large
	}

	banner := m.BannerImage
	if banner == "" {
		banner = poster
	}

	studio := "Anime Studio"
	if len(m.Studios.Nodes) > 0 {
		studio = m.Studios.Nodes[0].Name
	}

	trailerURL := ""
	if m.Trailer.Site == "youtube" && m.Trailer.ID != "" {
		trailerURL = fmt.Sprintf("https://www.youtube.com/embed/%s", m.Trailer.ID)
	}

	// Clean HTML from description
	cleanDesc := cleanHTML(m.Description)

	status := "Finished"
	if m.Status == "RELEASING" {
		status = "Airing"
	}

	score := m.AverageScore / 10.0
	if score <= 0 {
		score = 8.5
	}

	eps := m.Episodes
	if eps <= 0 {
		eps = 12
	}

	// Build episodes with exported images
	episodes := make([]Episode, 0, eps)
	totalEps := eps
	if totalEps > 48 {
		totalEps = 24 // limit for fast initial response
	}

	// Map any available streamingEpisode images by index
	streamImgMap := make(map[int]string)
	streamTitleMap := make(map[int]string)
	for i, se := range m.StreamingEpisodes {
		epIdx := i + 1
		if se.Thumbnail != "" {
			streamImgMap[epIdx] = se.Thumbnail
		}
		if se.Title != "" {
			streamTitleMap[epIdx] = se.Title
		}
	}

	slug := Slugify(m.Title.Romaji)
	for i := 1; i <= totalEps; i++ {
		epThumbnail := banner
		if img, ok := streamImgMap[i]; ok {
			epThumbnail = img
		} else {
			// AnimeFLV screenshot standard fallback format
			epThumbnail = fmt.Sprintf("https://cdn.animeflv.net/screenshots/%d/%d.jpg", m.ID, i)
		}

		epTitle := fmt.Sprintf("Episodio %d", i)
		if t, ok := streamTitleMap[i]; ok {
			epTitle = t
		}

		// Generate AnimeFLV servers with embed stream links
		servers, downloads := GetAnimeFLVEpisodeServers(slug, m.Title.Romaji, i)

		episodes = append(episodes, Episode{
			Number:    i,
			Title:     epTitle,
			Thumbnail: epThumbnail,
			Duration:  1440,
			Synopsis:  fmt.Sprintf("Capítulo %d de %s en audio japonés con subtítulos al español. Servidores disponibles: Streamwish, Mega, Streamtape, YourUpload, Mp4Upload.", i, title),
			Servers:   servers,
			Downloads: downloads,
		})
	}

	return Anime{
		ID:            strconv.Itoa(m.ID),
		Title:         title,
		JapaneseTitle: m.Title.Native,
		Synopsis:      cleanDesc,
		Poster:        poster,
		Banner:        banner,
		Genres:        m.Genres,
		Score:         score,
		Status:        status,
		TotalEpisodes: eps,
		Year:          m.SeasonYear,
		Type:          m.Format,
		TrailerURL:    trailerURL,
		Studio:        studio,
		Episodes:      episodes,
	}
}

// SearchAniList performs real-time anime search on AniList GraphQL API
func SearchAniList(q string) ([]Anime, error) {
	query := `
	query ($search: String) {
		Page(page: 1, perPage: 15) {
			media(type: ANIME, search: $search, sort: SEARCH_MATCH) {` + anilistMediaFields + `}
		}
	}
	`

	res, err := executeAniListQuery(query, map[string]interface{}{"search": q})
	if err != nil {
		return nil, err
	}

	var results []Anime
	for _, m := range res.Data.Page.Media {
		results = append(results, convertMediaToAnime(&m))
	}

	return results, nil
}

// FetchAniListMediaDetails fetches a single anime by its AniList ID
func FetchAniListMediaDetails(id int) (*Anime, error) {
	query := `
	query ($id: Int) {
		Media(id: $id, type: ANIME) {` + anilistMediaFields + `}
	}
	`

	res, err := executeAniListQuery(query, map[string]interface{}{"id": id})
	if err != nil {
		return nil, err
	}

	if res.Data.Media == nil {
		return nil, fmt.Errorf("anime not found on anilist: %d", id)
	}

	anime := convertMediaToAnime(res.Data.Media)
	return &anime, nil
}

var htmlCleaner = strings.NewReplacer("<br>", "\n", "<br/>", "\n", "<br />", "\n", "<i>", "", "</i>", "", "<b>", "", "</b>", "", "<p>", "", "</p>", "\n")

func cleanHTML(s string) string { return strings.TrimSpace(htmlCleaner.Replace(s)) }

func Slugify(s string) string {
	s = strings.ToLower(s)
	f := func(c rune) bool {
		return !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'))
	}
	words := strings.FieldsFunc(s, f)
	return strings.Join(words, "-")
}
