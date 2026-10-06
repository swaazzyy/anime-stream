package providers

import (
	"os"
	"testing"
)

// Live canary for the AnimeAV1 scraper and the curated list: LIVE=1 go test ./providers/
// AnimeAV1 can change its page data at any time, and a wrong curated cover ID shows another anime's art.
func TestLiveAnimeAV1(t *testing.T) {
	if os.Getenv("LIVE") == "" {
		t.Skip("set LIVE=1 to hit animeav1.com")
	}

	dn, err := FetchAnimeAV1Details("death-note")
	if err != nil {
		t.Fatal(err)
	}
	if dn.Year != 2006 || dn.Status != "Finalizado" || dn.TotalEpisodes != 37 {
		t.Errorf("death-note: year %d, status %q, %d episodes; want 2006, Finalizado, 37", dn.Year, dn.Status, dn.TotalEpisodes)
	}
	if servers, _, err := ScrapeAnimeAV1Episode("one-piece", 1); err != nil || len(servers) == 0 {
		t.Errorf("one-piece episode 1: %d servers, %v", len(servers), err)
	}

	for _, c := range CuratedAnimeAV1 {
		live, err := FetchAnimeAV1Details(c.ID)
		if err != nil {
			t.Errorf("%s: %v", c.ID, err)
			continue
		}
		if got, want := ExtractMediaID(c.Poster), ExtractMediaID(live.Poster); got != want {
			t.Errorf("%s: curated cover %s, AnimeAV1 media %s", c.ID, got, want)
		}
	}
}
