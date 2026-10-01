package main

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"
)

type ServerItem struct {
	Server string `json:"server"`
	URL    string `json:"url"`
}

var client = &http.Client{Timeout: 5 * time.Second}

func fetchEpisode(slug string, epNum int) ([]ServerItem, []ServerItem, error) {
	url := fmt.Sprintf("https://animeav1.com/media/%s/%d", slug, epNum)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}
	html := string(body)

	var embeds, downloads []ServerItem
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

	return embeds, downloads, nil
}

func main() {
	slugs := []string{"one-piece", "tensei-shitara-ken-deshita-ii", "dogulwang"}
	for _, s := range slugs {
		emb, dl, err := fetchEpisode(s, 1)
		fmt.Printf("Slug: %s -> Error: %v, Embeds: %d, Downloads: %d\n", s, err, len(emb), len(dl))
		for _, e := range emb {
			fmt.Printf("   Embed: %s -> %s\n", e.Server, e.URL)
		}
		for _, d := range dl {
			fmt.Printf("   Download: %s -> %s\n", d.Server, d.URL)
		}
	}
}
