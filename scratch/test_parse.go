package main

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strconv"
)

type AnimeMedia struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Slug          string   `json:"slug"`
	Synopsis      string   `json:"synopsis"`
	Poster        string   `json:"poster"`
	Backdrop      string   `json:"backdrop"`
	Trailer       string   `json:"trailer"`
	EpisodesCount int      `json:"episodes_count"`
	Score         float64  `json:"score"`
	Genres        []string `json:"genres"`
	Category      string   `json:"category"`
}

type ServerItem struct {
	Server string `json:"server"`
	URL    string `json:"url"`
}

func parseMediaFromHTML(html string) (*AnimeMedia, []int) {
	// Extract media object
	// id:(\d+),categoryId:\d+,title:"([^"]+)"
	idMatch := regexp.MustCompile(`media:\{id:(\d+)`).FindStringSubmatch(html)
	if len(idMatch) < 2 {
		return nil, nil
	}
	mediaID := idMatch[1]

	titleMatch := regexp.MustCompile(`media:\{[^}]*title:"([^"]+)"`).FindStringSubmatch(html)
	title := ""
	if len(titleMatch) >= 2 {
		title = titleMatch[1]
	}

	slugMatch := regexp.MustCompile(`slug:"([^"]+)"`).FindStringSubmatch(html)
	slug := ""
	if len(slugMatch) >= 2 {
		slug = slugMatch[1]
	}

	synopsisMatch := regexp.MustCompile(`synopsis:"((?:[^"\\]|\\.)*)"`).FindStringSubmatch(html)
	synopsis := ""
	if len(synopsisMatch) >= 2 {
		synopsis = synopsisMatch[1]
	}

	episodesCount := 12
	epCountMatch := regexp.MustCompile(`episodesCount:(\d+)`).FindStringSubmatch(html)
	if len(epCountMatch) >= 2 {
		episodesCount, _ = strconv.Atoi(epCountMatch[1])
	}

	score := 8.0
	scoreMatch := regexp.MustCompile(`score:([0-9.]+)`).FindStringSubmatch(html)
	if len(scoreMatch) >= 2 {
		score, _ = strconv.ParseFloat(scoreMatch[1], 64)
	}

	trailerMatch := regexp.MustCompile(`trailer:"([^"]+)"`).FindStringSubmatch(html)
	trailer := ""
	if len(trailerMatch) >= 2 {
		trailer = "https://www.youtube.com/embed/" + trailerMatch[1]
	}

	// Extract genres
	genresRegex := regexp.MustCompile(`\{id:\d+,name:"([^"]+)",type:\d+,slug:"[^"]+",malId:\d+\}`)
	genresMatches := genresRegex.FindAllStringSubmatch(html, -1)
	var genres []string
	for _, gm := range genresMatches {
		genres = append(genres, gm[1])
	}

	// Extract episodes list
	// episodes:[{id:60319,number:1},{id:...,number:2}]
	epRegex := regexp.MustCompile(`\{id:\d+,number:(\d+)\}`)
	epMatches := epRegex.FindAllStringSubmatch(html, -1)
	var epNumbers []int
	for _, em := range epMatches {
		n, _ := strconv.Atoi(em[1])
		if n > 0 {
			epNumbers = append(epNumbers, n)
		}
	}

	media := &AnimeMedia{
		ID:            mediaID,
		Title:         title,
		Slug:          slug,
		Synopsis:      synopsis,
		Poster:        fmt.Sprintf("https://cdn.animeav1.com/covers/%s.jpg", mediaID),
		Backdrop:      fmt.Sprintf("https://cdn.animeav1.com/backdrops/%s.jpg", mediaID),
		Trailer:       trailer,
		EpisodesCount: episodesCount,
		Score:         score,
		Genres:        genres,
	}
	return media, epNumbers
}

func parseEpisodeFromHTML(html string) (embeds []ServerItem, downloads []ServerItem) {
	// Parse embeds: {SUB:[{server:"UPNShare",url:"https://animeav1.uns.bio/#vmwty1"},...]}
	embedsBlockRegex := regexp.MustCompile(`embeds:\{SUB:\[([\s\S]*?)\]\}`)
	if m := embedsBlockRegex.FindStringSubmatch(html); len(m) >= 2 {
		itemRegex := regexp.MustCompile(`\{server:"([^"]+)",url:"([^"]+)"\}`)
		for _, item := range itemRegex.FindAllStringSubmatch(m[1], -1) {
			embeds = append(embeds, ServerItem{Server: item[1], URL: item[2]})
		}
	}

	// Parse downloads: {SUB:[{server:"TransferIt",url:"..."},{server:"Mega",url:"..."}]}
	dlBlockRegex := regexp.MustCompile(`downloads:\{SUB:\[([\s\S]*?)\]\}`)
	if m := dlBlockRegex.FindStringSubmatch(html); len(m) >= 2 {
		itemRegex := regexp.MustCompile(`\{server:"([^"]+)",url:"([^"]+)"\}`)
		for _, item := range itemRegex.FindAllStringSubmatch(m[1], -1) {
			downloads = append(downloads, ServerItem{Server: item[1], URL: item[2]})
		}
	}
	return
}

func main() {
	epData, _ := os.ReadFile("scratch/data_slice_utf8.txt")
	embeds, downloads := parseEpisodeFromHTML(string(epData))
	media, eps := parseMediaFromHTML(string(epData))

	fmt.Printf("Media: %+v, Total eps found: %d\n", media, len(eps))
	b1, _ := json.MarshalIndent(embeds, "", "  ")
	b2, _ := json.MarshalIndent(downloads, "", "  ")
	fmt.Printf("Embeds:\n%s\nDownloads:\n%s\n", string(b1), string(b2))
}
