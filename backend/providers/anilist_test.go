package providers

import "testing"

// AniList-only shows used to be cut to 24 episodes past 48, hiding the rest from the episode list and "next episode".
func TestAniListKeepsAllEpisodes(t *testing.T) {
	a := convertMediaToAnime(&anilistMedia{ID: 1, Episodes: 100})
	if len(a.Episodes) != 100 || a.Episodes[99].Number != 100 {
		t.Fatalf("got %d episodes, want 100", len(a.Episodes))
	}
}
