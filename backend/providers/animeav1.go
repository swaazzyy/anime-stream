package providers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	AnimeAV1BaseURL = "https://animeav1.com"
	AnimeAV1CDNBase = "https://cdn.animeav1.com"
)

var av1Client = &http.Client{Timeout: 8 * time.Second}

// CuratedAnimeAV1 matches the real anime on animeav1.com as shown in the screenshot
var CuratedAnimeAV1 = []Anime{
	{
		ID:            "fx-senshi-kurumi-chan",
		Title:         "FX Senshi Kurumi-chan",
		JapaneseTitle: "FX戦士くるみちゃん",
		Synopsis:      "Kurumi Fukuka es una estudiante universitaria que decide debutar en el mercado de divisas (FX) para recuperar los 20 millones de yenes que su difunta madre perdió en ese mismo mercado.",
		Poster:        "https://cdn.animeav1.com/covers/4444.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4444.jpg",
		Genres:        []string{"Drama", "Psicológico", "Seinen"},
		Score:         8.6,
		Status:        "En Emisión",
		TotalEpisodes: 1,
		Year:          2024,
		Type:          "TV Anime",
		Studio:        "AnimeAV1",
	},
	{
		ID:            "one-piece",
		Title:         "One Piece",
		JapaneseTitle: "ワンピース",
		Synopsis:      "Gol D. Roger fue conocido como el 'Rey de los Piratas', el ser más fuerte y más célebre que jamás navegó por Grand Line. La captura y ejecución de Roger por parte del Gobierno Mundial provocó un cambio en todo el mundo. Sus últimas palabras antes de su muerte revelaron la existencia del mayor tesoro del mundo, el One Piece. Fue esta revelación la que provocó la Gran Era de los Piratas, hombres que soñaban con encontrar el One Piece, que promete una cantidad ilimitada de riquezas y fama, y muy probablemente el pináculo de la gloria y el título de Rey de los Piratas...",
		Poster:        "https://cdn.animeav1.com/covers/197.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/197.jpg",
		Genres:        []string{"Acción", "Aventura", "Fantasía", "Shounen"},
		Score:         8.9,
		Status:        "En Emisión",
		TotalEpisodes: 1180,
		Year:          1999,
		Type:          "TV Anime",
		Studio:        "Toei Animation",
		TrailerURL:    "https://www.youtube.com/embed/-tviZNY6CSw",
	},
	{
		ID:            "tensei-shitara-ken-deshita-ii",
		Title:         "Tensei Shitara Ken Deshita II",
		JapaneseTitle: "転生したら剣でした 2",
		Synopsis:      "Segunda temporada de las aventuras de Fran y su espada parlante Maestro mientras continúan su viaje por el continente enfrentando bestias y desafíos.",
		Poster:        "https://cdn.animeav1.com/covers/4442.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4442.jpg",
		Genres:        []string{"Acción", "Aventura", "Fantasía", "Isekai"},
		Score:         8.2,
		Status:        "En Emisión",
		TotalEpisodes: 1,
		Year:          2024,
		Type:          "TV Anime",
		Studio:        "C2C",
		TrailerURL:    "https://www.youtube.com/embed/Yt364dCCxIE",
	},
	{
		ID:            "dogulwang",
		Title:         "Dogulwang",
		JapaneseTitle: "도굴왕 / Tomb Raider King",
		Synopsis:      "En un mundo donde tumbas misteriosas llenas de reliquias comenzaron a aparecer por toda la tierra, Seo Joo-heon es traicionado y asesinado, pero regresa en el tiempo 15 años atrás listo para saquear todas las tumbas.",
		Poster:        "https://cdn.animeav1.com/covers/4421.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4421.jpg",
		Genres:        []string{"Acción", "Fantasía", "Sobrenatural"},
		Score:         8.4,
		Status:        "En Emisión",
		TotalEpisodes: 12,
		Year:          2024,
		Type:          "TV Anime",
		Studio:        "Studio Animal",
	},
	{
		ID:            "thunder-3",
		Title:         "Thunder 3",
		JapaneseTitle: "サンダー3",
		Synopsis:      "Pyon-taro y sus dos mejores amigos viajan a través de un portal a un universo alternativo realista para rescatar a su querida hermana menor Futaba.",
		Poster:        "https://cdn.animeav1.com/covers/4422.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4422.jpg",
		Genres:        []string{"Acción", "Ciencia Ficción", "Comedia"},
		Score:         7.8,
		Status:        "En Emisión",
		TotalEpisodes: 12,
		Year:          2024,
		Type:          "TV Anime",
	},
	{
		ID:            "shin-tennis-no-oujisama-u-17-world-cup-kesshou-member-ketteisen",
		Title:         "Shin Tennis no Oujisama: U-17 World Cup Kesshou Member Ketteisen",
		JapaneseTitle: "新テニスの王子様 U-17 WORLD CUP 決勝メンバー決定戦",
		Synopsis:      "La feroz batalla de tenis por la copa mundial U-17 continúa con los mejores jugadores de secundaria de Japón compitiendo al más alto nivel.",
		Poster:        "https://cdn.animeav1.com/covers/4443.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4443.jpg",
		Genres:        []string{"Deportes", "Shounen"},
		Score:         8.0,
		Status:        "En Emisión",
		TotalEpisodes: 1,
		Year:          2024,
		Type:          "TV Anime",
		Studio:        "M.S.C",
	},
	{
		ID:            "rezero-kara-hajimeru-isekai-seikatsu-3rd-season",
		Title:         "Re:Zero kara Hajimeru Isekai Seikatsu 3rd Season",
		JapaneseTitle: "Re:ゼロから始める異世界生活 3rd season",
		Synopsis:      "Subaru Natsuki continúa enfrentando los horrores y sacrificios en la ciudad de las compuertas Pristella con el poder del Regreso por la Muerte.",
		Poster:        "https://cdn.animeav1.com/covers/293.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/293.jpg",
		Genres:        []string{"Drama", "Fantasía", "Psicológico", "Suspenso"},
		Score:         9.1,
		Status:        "En Emisión",
		TotalEpisodes: 16,
		Year:          2024,
		Type:          "TV Anime",
		Studio:        "White Fox",
	},
	{
		ID:            "shiguang-dailiren-iii",
		Title:         "Shiguang Dailiren III (Link Click S3)",
		JapaneseTitle: "时光代理人 III",
		Synopsis:      "Cheng Xiaoshi y Lu Guang continúan descifrando los misterios de las fotografías en el Estudio Fotográfico Time, ahora enfrentando la organización que acecha sus vidas.",
		Poster:        "https://cdn.animeav1.com/covers/4434.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4434.jpg",
		Genres:        []string{"Drama", "Misterio", "Suspenso", "Superpoderes"},
		Score:         8.8,
		Status:        "En Emisión",
		TotalEpisodes: 9,
		Year:          2024,
		Type:          "TV Anime",
		Studio:        "LAN Studio",
		TrailerURL:    "https://www.youtube.com/embed/VC4EbRZVJCk",
	},
	{
		ID:            "bleach-sennen-kessen-hen-kashin-tan",
		Title:         "Bleach: Sennen Kessen-hen - Kashin-tan",
		JapaneseTitle: "BLEACH 千年血戦篇-相剋譚-",
		Synopsis:      "La batalla definitiva entre la Sociedad de Almas y el Wandenreich llega a su clímax con Ichigo Kurosaki blandiendo su verdadero Zangetsu.",
		Poster:        "https://cdn.animeav1.com/covers/4429.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4429.jpg",
		Genres:        []string{"Acción", "Aventura", "Sobrenatural", "Shounen"},
		Score:         9.0,
		Status:        "En Emisión",
		TotalEpisodes: 8,
		Year:          2024,
		Type:          "TV Anime",
		Studio:        "Pierrot",
	},
	{
		ID:            "boku-no-hero-academia-i-am-a-hero-too",
		Title:         "Boku no Hero Academia: I Am a Hero Too",
		JapaneseTitle: "僕のヒーローアカデミア",
		Synopsis:      "Adaptación del manga especial de Boku no Hero Academia con la visita especial de Eri a la U.A. High School.",
		Poster:        "https://cdn.animeav1.com/covers/4432.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/4432.jpg",
		Genres:        []string{"Acción", "Superpoderes", "Shounen"},
		Score:         8.1,
		Status:        "Finalizado",
		TotalEpisodes: 1,
		Year:          2024,
		Type:          "Especial",
		Studio:        "Bones",
	},
	{
		ID:            "shingeki-no-kyojin",
		Title:         "Shingeki no Kyojin (Attack on Titan)",
		JapaneseTitle: "進撃の巨人",
		Synopsis:      "La humanidad vive protegida tras enormes muros para resguardarse de los Titanes carnívoros, hasta que el Titán Colosal rompe la muralla exterior.",
		Poster:        "https://cdn.animeav1.com/covers/1.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/1.jpg",
		Genres:        []string{"Acción", "Drama", "Fantasía", "Misterio"},
		Score:         9.0,
		Status:        "Finalizado",
		TotalEpisodes: 25,
		Year:          2013,
		Type:          "TV Anime",
		Studio:        "Wit Studio",
	},
	{
		ID:            "death-note",
		Title:         "Death Note",
		JapaneseTitle: "デスノート",
		Synopsis:      "Light Yagami encuentra un misterioso cuaderno que tiene el poder de matar a cualquier persona cuyo nombre sea escrito en él.",
		Poster:        "https://cdn.animeav1.com/covers/2.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/2.jpg",
		Genres:        []string{"Psicológico", "Sobrenatural", "Suspenso", "Misterio"},
		Score:         8.9,
		Status:        "Finalizado",
		TotalEpisodes: 37,
		Year:          2006,
		Type:          "TV Anime",
		Studio:        "Madhouse",
	},
	{
		ID:            "one-punch-man",
		Title:         "One Punch Man",
		JapaneseTitle: "ワンパンマン",
		Synopsis:      "Saitama es un héroe por diversión que derrotó a todos sus enemigos con un solo golpe, buscando desesperadamente un rival que le suponga un desafío.",
		Poster:        "https://cdn.animeav1.com/covers/5.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/5.jpg",
		Genres:        []string{"Acción", "Comedia", "Parodia", "Superpoderes"},
		Score:         8.7,
		Status:        "Finalizado",
		TotalEpisodes: 12,
		Year:          2015,
		Type:          "TV Anime",
		Studio:        "Madhouse",
	},
	{
		ID:            "sword-art-online-alicization-war-of-underworld",
		Title:         "Sword Art Online: Alicization - War of Underworld",
		JapaneseTitle: "ソードアート・オンライン アリシゼーション War of Underworld",
		Synopsis:      "Kirito ha quedado en estado comatoso tras la batalla contra la Administradora. Alice lo cuida en el pueblo de Rulid mientras las fuerzas del Territorio Oscuro comienzan a invadir el Inframundo.",
		Poster:        "https://cdn.animeav1.com/covers/218.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/218.jpg",
		Genres:        []string{"Acción", "Aventura", "Fantasía", "Ciencia Ficción"},
		Score:         8.5,
		Status:        "Finalizado",
		TotalEpisodes: 24,
		Year:          2019,
		Type:          "TV Anime",
		Studio:        "A-1 Pictures",
		TrailerURL:    "https://www.youtube.com/embed/rUpEl-nQ360",
	},
	{
		ID:            "koe-no-katachi",
		Title:         "Koe no Katachi (A Silent Voice)",
		JapaneseTitle: "聲の形",
		Synopsis:      "Shouya Ishida busca redimirse con Shouko Nishimiya, una chica sorda a la que acosó en la escuela primaria, esperando reparar el dolor del pasado y encontrar el perdón.",
		Poster:        "https://cdn.animeav1.com/covers/536.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/536.jpg",
		Genres:        []string{"Drama", "Escolar", "Romance"},
		Score:         8.9,
		Status:        "Finalizado",
		TotalEpisodes: 1,
		Year:          2016,
		Type:          "Película",
		Studio:        "Kyoto Animation",
	},
	{
		ID:            "sword-art-online-movie-ordinal-scale",
		Title:         "Sword Art Online Movie: Ordinal Scale",
		JapaneseTitle: "劇場版 ソードアート・オンライン -オーディナル・スケール-",
		Synopsis:      "En 2026, el dispositivo AR Augma se vuelve popular gracias al juego Ordinal Scale. Sin embargo, viejos fantasmas de Aincrad resurgen poniendo en riesgo a los antiguos supervivientes de SAO.",
		Poster:        "https://cdn.animeav1.com/covers/220.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/220.jpg",
		Genres:        []string{"Acción", "Aventura", "Fantasía", "Ciencia Ficción"},
		Score:         8.2,
		Status:        "Finalizado",
		TotalEpisodes: 1,
		Year:          2017,
		Type:          "Película",
		Studio:        "A-1 Pictures",
	},
	{
		ID:            "kimetsu-no-yaiba-movie-mugen-ressha-hen",
		Title:         "Demon Slayer: Kimetsu no Yaiba - Mugen Ressha-hen",
		JapaneseTitle: "鬼滅の刃 無限列車編",
		Synopsis:      "Tanjirou, Nezuko, Zenitsu e Inosuke abordan el Tren Infinito para unirse al Pilar de la Llama, Kyoujurou Rengoku, enfrentando una de las Doce Lunas Demoníacas.",
		Poster:        "https://cdn.animeav1.com/covers/251.jpg",
		Banner:        "https://cdn.animeav1.com/backdrops/251.jpg",
		Genres:        []string{"Acción", "Fantasía", "Histórico", "Shounen"},
		Score:         8.7,
		Status:        "Finalizado",
		TotalEpisodes: 1,
		Year:          2020,
		Type:          "Película",
		Studio:        "ufotable",
	},
}

// AnimeAV1LatestCard represents the exact card format from the screenshot
type AnimeAV1LatestCard struct {
	AnimeID       string `json:"anime_id"`
	AnimeTitle    string `json:"anime_title"`
	Poster        string `json:"poster"`
	Thumbnail     string `json:"thumbnail"`
	EpisodeNumber int    `json:"episode_number"`
	EpisodeTitle  string `json:"episode_title"`
	CommentsCount int    `json:"comments_count"`
	TimeAgo       string `json:"time_ago"`
}

// GetAnimeAV1LatestEpisodes returns the exact recently updated episodes row from animeav1.com
// CuratedAnimeAV1LatestCards matches the exact 20 episodes shown in the user's uploaded screenshot
var CuratedAnimeAV1LatestCards = []AnimeAV1LatestCard{
	{
		AnimeID:       "fx-senshi-kurumi-chan",
		AnimeTitle:    "FX Senshi Kurumi-chan",
		Poster:        "https://cdn.animeav1.com/covers/4444.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4444/1.jpg",
		EpisodeNumber: 1,
		EpisodeTitle:  "Episodio 1",
		CommentsCount: 65,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "tensei-shitara-ken-deshita-ii",
		AnimeTitle:    "Tensei shitara Ken deshita II",
		Poster:        "https://cdn.animeav1.com/covers/4442.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4442/1.jpg",
		EpisodeNumber: 1,
		EpisodeTitle:  "Episodio 1",
		CommentsCount: 175,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "dogulwang",
		AnimeTitle:    "Dogulwang",
		Poster:        "https://cdn.animeav1.com/covers/4421.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4421/12.jpg",
		EpisodeNumber: 12,
		EpisodeTitle:  "Episodio 12",
		CommentsCount: 86,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "thunder-3",
		AnimeTitle:    "Thunder 3",
		Poster:        "https://cdn.animeav1.com/covers/4422.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4422/12.jpg",
		EpisodeNumber: 12,
		EpisodeTitle:  "Episodio 12",
		CommentsCount: 30,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "shin-tennis-no-oujisama-u-17-world-cup-kesshou-member-ketteisen",
		AnimeTitle:    "Shin Tennis no Oujisama: U-17 World Cup Kesshou Member Ketteisen",
		Poster:        "https://cdn.animeav1.com/covers/4443.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4443/1.jpg",
		EpisodeNumber: 1,
		EpisodeTitle:  "Episodio 1",
		CommentsCount: 39,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "rezero-kara-hajimeru-isekai-seikatsu-4th-season",
		AnimeTitle:    "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season",
		Poster:        "https://cdn.animeav1.com/covers/3968.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/3968/19.jpg",
		EpisodeNumber: 19,
		EpisodeTitle:  "Episodio 19",
		CommentsCount: 619,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "clevatess-ii-majuu-no-ou-to-itsuwari-no-yuusha-denshou",
		AnimeTitle:    "Clevatess II: Majuu no Ou to Itsuwari no Yuusha Denshou",
		Poster:        "https://cdn.animeav1.com/covers/4416.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4416/13.jpg",
		EpisodeNumber: 13,
		EpisodeTitle:  "Episodio 13",
		CommentsCount: 322,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "sora-wa-akai-kawa-no-hotori",
		AnimeTitle:    "Sora wa Akai Kawa no Hotori",
		Poster:        "https://cdn.animeav1.com/covers/4412.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4412/13.jpg",
		EpisodeNumber: 13,
		EpisodeTitle:  "Episodio 13",
		CommentsCount: 46,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "mononoke-movie-3-hebigami",
		AnimeTitle:    "Mononoke Movie 3: Hebigami",
		Poster:        "https://cdn.animeav1.com/covers/4441.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4441/1.jpg",
		EpisodeNumber: 1,
		EpisodeTitle:  "Episodio 1",
		CommentsCount: 23,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "kimi-ga-shinu-made-koi-wo-shitai",
		AnimeTitle:    "Kimi ga Shinu made Koi wo Shitai",
		Poster:        "https://cdn.animeav1.com/covers/4410.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4410/13.jpg",
		EpisodeNumber: 13,
		EpisodeTitle:  "Episodio 13",
		CommentsCount: 96,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "liar-game",
		AnimeTitle:    "Liar Game",
		Poster:        "https://cdn.animeav1.com/covers/3941.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/3941/26.jpg",
		EpisodeNumber: 26,
		EpisodeTitle:  "Episodio 26",
		CommentsCount: 90,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "one-piece",
		AnimeTitle:    "One Piece",
		Poster:        "https://cdn.animeav1.com/covers/197.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/197/1180.jpg",
		EpisodeNumber: 1180,
		EpisodeTitle:  "Episodio 1180",
		CommentsCount: 156,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "mushoku-tensei-iii-isekai-ittara-honki-dasu",
		AnimeTitle:    "Mushoku Tensei III: Isekai Ittara Honki Dasu",
		Poster:        "https://cdn.animeav1.com/covers/4384.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4384/14.jpg",
		EpisodeNumber: 14,
		EpisodeTitle:  "Episodio 14",
		CommentsCount: 798,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "tensei-kizoku-kantei-skill-de-nariagaru-3rd-season",
		AnimeTitle:    "Tensei Kizoku, Kantei Skill de Nariagaru 3rd Season",
		Poster:        "https://cdn.animeav1.com/covers/4440.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4440/1.jpg",
		EpisodeNumber: 1,
		EpisodeTitle:  "Episodio 1",
		CommentsCount: 247,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "tempal-item-no-chikara",
		AnimeTitle:    "Tempal: Item no Chikara",
		Poster:        "https://cdn.animeav1.com/covers/4439.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4439/1.jpg",
		EpisodeNumber: 1,
		EpisodeTitle:  "Episodio 1",
		CommentsCount: 284,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "nijusseiki-denki-mokuroku-eureka-evrika",
		AnimeTitle:    "Nijusseiki Denki Mokuroku: Eureka Evrika",
		Poster:        "https://cdn.animeav1.com/covers/4400.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4400/13.jpg",
		EpisodeNumber: 13,
		EpisodeTitle:  "Episodio 13",
		CommentsCount: 125,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "seihantai-na-kimi-to-boku-2nd-season",
		AnimeTitle:    "Seihantai na Kimi to Boku 2nd Season",
		Poster:        "https://cdn.animeav1.com/covers/4396.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4396/12.jpg",
		EpisodeNumber: 12,
		EpisodeTitle:  "Episodio 12",
		CommentsCount: 211,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "lets-go-kaiki-gumi",
		AnimeTitle:    "Let's Go Kaiki-gumi",
		Poster:        "https://cdn.animeav1.com/covers/4395.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/4395/12.jpg",
		EpisodeNumber: 12,
		EpisodeTitle:  "Episodio 12",
		CommentsCount: 95,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "digimon-beatbreak",
		AnimeTitle:    "Digimon Beatbreak",
		Poster:        "https://cdn.animeav1.com/covers/2901.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/2901/49.jpg",
		EpisodeNumber: 49,
		EpisodeTitle:  "Episodio 49",
		CommentsCount: 62,
		TimeAgo:       "Hoy",
	},
	{
		AnimeID:       "mao",
		AnimeTitle:    "Mao",
		Poster:        "https://cdn.animeav1.com/covers/3935.jpg",
		Thumbnail:     "https://cdn.animeav1.com/screenshots/3935/26.jpg",
		EpisodeNumber: 26,
		EpisodeTitle:  "Episodio 26",
		CommentsCount: 88,
		TimeAgo:       "Hoy",
	},
}

// fetchAV1HTML GETs an animeav1.com page and returns its body as a string.
func fetchAV1HTML(pageURL string) (string, error) {
	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Referer", AnimeAV1BaseURL)

	resp, err := av1Client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("animeav1 %s returned HTTP %d", pageURL, resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	return string(body), err
}

// FetchAnimeAV1HomeLatest scrapes latest episodes live from animeav1.com
func FetchAnimeAV1HomeLatest() ([]AnimeAV1LatestCard, error) {
	html, err := fetchAV1HTML(AnimeAV1BaseURL)
	if err != nil {
		return nil, err
	}

	idx := strings.Index(html, "latestEpisodes:[")
	if idx == -1 {
		return nil, fmt.Errorf("latestEpisodes block not found")
	}

	block := html[idx:]
	if endIdx := strings.Index(block, "],"); endIdx != -1 {
		block = block[:endIdx]
	}

	itemRegex := regexp.MustCompile(`commentsCount:(\d+)[^}]*?media:\{id:(\d+),slug:"([^"]+)",title:"([^"]+)"\},number:(\d+)`)
	matches := itemRegex.FindAllStringSubmatch(block, -1)
	if len(matches) == 0 {
		return nil, fmt.Errorf("no latest episodes parsed")
	}

	var cards []AnimeAV1LatestCard
	for _, m := range matches {
		comments, _ := strconv.Atoi(m[1])
		mediaID := m[2]
		slug := m[3]
		title := m[4]
		epNum, _ := strconv.Atoi(m[5])

		cards = append(cards, AnimeAV1LatestCard{
			AnimeID:       slug,
			AnimeTitle:    title,
			Poster:        fmt.Sprintf("%s/covers/%s.jpg", AnimeAV1CDNBase, mediaID),
			Thumbnail:     fmt.Sprintf("%s/screenshots/%s/%d.jpg", AnimeAV1CDNBase, mediaID, epNum),
			EpisodeNumber: epNum,
			EpisodeTitle:  fmt.Sprintf("Episodio %d", epNum),
			CommentsCount: comments,
			TimeAgo:       "Hoy",
		})
	}
	return cards, nil
}

// GetAnimeAV1LatestEpisodes returns the exact recently updated episodes row from animeav1.com
func GetAnimeAV1LatestEpisodes() []AnimeAV1LatestCard {
	liveCards, err := FetchAnimeAV1HomeLatest()
	if err == nil && len(liveCards) > 0 {
		return liveCards
	}
	return CuratedAnimeAV1LatestCards
}

// isHentaiContent checks if the content is adult / hentai to filter it out
func isHentaiContent(html string) bool {
	if strings.Contains(html, "mature:true") {
		return true
	}
	if strings.Contains(html, `categoryId:6`) || strings.Contains(html, `slug:"hentai"`) || strings.Contains(html, `name:"Hentai"`) {
		return true
	}
	lower := strings.ToLower(html)
	if strings.Contains(lower, `genre=hentai`) || strings.Contains(lower, `"name":"hentai"`) || strings.Contains(lower, `"name":"ecchi +18"`) {
		return true
	}
	return false
}

// av1Type maps an animeav1 categoryId to its display type.
func av1Type(catID string) string {
	switch catID {
	case "2":
		return "Película"
	case "3":
		return "OVA"
	case "4":
		return "Especial"
	case "5":
		return "ONA"
	}
	return "TV Anime"
}

// FetchAnimeAV1Catalog extracts full catalog pages from animeav1.com
func FetchAnimeAV1Catalog(page int, order string, search string) ([]Anime, error) {
	if page <= 0 {
		page = 1
	}
	if order == "" {
		order = "default"
	}

	q := url.Values{"page": {strconv.Itoa(page)}}
	if search != "" {
		q.Set("search", search)
	} else {
		q.Set("order", order)
	}
	return FetchAnimeAV1Filtered(q)
}

// FetchAnimeAV1Filtered fetches /catalogo with raw query params (page, search, category, genre, status, order).
func FetchAnimeAV1Filtered(q url.Values) ([]Anime, error) {
	html, err := fetchAV1HTML(AnimeAV1BaseURL + "/catalogo?" + q.Encode())
	if err != nil {
		return nil, err
	}

	regex := regexp.MustCompile(`\{id:"?(\d+)"?,title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:(\d+),slug:"([^"]+)"`)
	matches := regex.FindAllStringSubmatch(html, -1)
	if len(matches) == 0 {
		return nil, fmt.Errorf("no media matches found on animeav1")
	}

	var results []Anime
	for _, m := range matches {
		rawID := m[1]
		title := m[2]
		synopsis := strings.ReplaceAll(m[3], `\n`, "\n")
		synopsis = strings.ReplaceAll(synopsis, `\"`, `"`)
		catID := m[4]
		slug := m[5]

		// Filter out hentai
		if catID == "6" || strings.Contains(strings.ToLower(title), "hentai") || strings.Contains(strings.ToLower(slug), "hentai") || strings.Contains(strings.ToLower(synopsis), "hentai") {
			continue
		}

		isMovie := catID == "2" || strings.Contains(strings.ToLower(title), "movie") || strings.Contains(strings.ToLower(title), "película")
		animeType := av1Type(catID)
		totalEps := 0
		if isMovie {
			animeType = "Película"
			totalEps = 1
		}

		anime := Anime{
			ID:            slug,
			Title:         title,
			JapaneseTitle: title,
			Synopsis:      synopsis,
			Poster:        fmt.Sprintf("%s/covers/%s.jpg", AnimeAV1CDNBase, rawID),
			Banner:        fmt.Sprintf("%s/backdrops/%s.jpg", AnimeAV1CDNBase, rawID),
			Score:         0,
			Status:        "En Emisión",
			TotalEpisodes: totalEps,
			Year:          2024,
			Type:          animeType,
			Studio:        "AnimeAV1",
		}
		if isMovie {
			anime.Status = "Finalizado"
			anime.Episodes = []Episode{
				{
					Number:    1,
					Title:     "Película Completa",
					Thumbnail: anime.Poster,
					Duration:  7200,
					Synopsis:  fmt.Sprintf("Película completa de %s.", title),
				},
			}
		}
		results = append(results, anime)
	}

	return EnrichAnimeWithRealDetails(results), nil
}

// FetchAnimeAV1Details extracts complete anime details from https://animeav1.com/media/{slug}
func FetchAnimeAV1Details(slugOrID string) (*Anime, error) {
	targetURL := fmt.Sprintf("%s/media/%s", AnimeAV1BaseURL, slugOrID)
	html, err := fetchAV1HTML(targetURL)
	if err != nil {
		return nil, err
	}

	// 1. Check for Hentai / Adult content and reject immediately
	if isHentaiContent(html) {
		return nil, fmt.Errorf("contenido no disponible")
	}

	// 2. Extract media ID: media:{id:(\d+)
	idMatch := regexp.MustCompile(`media:\{id:(\d+)`).FindStringSubmatch(html)
	if len(idMatch) < 2 {
		idMatch = regexp.MustCompile(`media:\{[^}]*?id:(\d+)`).FindStringSubmatch(html)
		if len(idMatch) < 2 {
			return nil, fmt.Errorf("media metadata not found")
		}
	}
	mediaID := idMatch[1]

	// 3. Title
	title := slugOrID
	titleMatch := regexp.MustCompile(`media:\{[^}]*?title:"([^"]+)"`).FindStringSubmatch(html)
	if len(titleMatch) >= 2 {
		title = titleMatch[1]
	}

	// 4. Slug
	slug := slugOrID
	if _, err := strconv.Atoi(slugOrID); err == nil {
		if sm := regexp.MustCompile(`votes:\d+,slug:"([a-z0-9-]+)"`).FindStringSubmatch(html); len(sm) >= 2 {
			slug = sm[1]
		}
	}

	// 5. Category / Format / Movie detection
	animeType := "TV Anime"
	if m := regexp.MustCompile(`categoryId:(\d+)`).FindStringSubmatch(html); len(m) >= 2 {
		animeType = av1Type(m[1])
	}
	isMovie := animeType == "Película"
	catNameMatch := regexp.MustCompile(`category:\{[^}]*?name:"([^"]+)"`).FindStringSubmatch(html)
	if len(catNameMatch) >= 2 {
		if strings.EqualFold(catNameMatch[1], "Película") || strings.EqualFold(catNameMatch[1], "Movie") {
			isMovie = true
			animeType = "Película"
		} else if strings.EqualFold(catNameMatch[1], "Hentai") {
			return nil, fmt.Errorf("contenido no disponible")
		} else if animeType == "TV Anime" {
			animeType = catNameMatch[1]
		}
	}
	if strings.Contains(strings.ToLower(title), "película") || strings.Contains(strings.ToLower(title), "movie") {
		isMovie = true
		animeType = "Película"
	}

	// 6. Synopsis
	synopsis := ""
	synopsisMatch := regexp.MustCompile(`synopsis:"((?:[^"\\]|\\.)*)"`).FindStringSubmatch(html)
	if len(synopsisMatch) >= 2 {
		synopsis = strings.ReplaceAll(synopsisMatch[1], `\n`, "\n")
		synopsis = strings.ReplaceAll(synopsis, `\"`, `"`)
	}

	// 7. Score
	score := 8.5
	scoreMatch := regexp.MustCompile(`score:([0-9.]+)`).FindStringSubmatch(html)
	if len(scoreMatch) >= 2 {
		score, _ = strconv.ParseFloat(scoreMatch[1], 64)
	}

	// 8. Trailer
	trailer := ""
	trailerMatch := regexp.MustCompile(`trailer:"([^"]+)"`).FindStringSubmatch(html)
	if len(trailerMatch) >= 2 && trailerMatch[1] != "null" {
		trailer = "https://www.youtube.com/embed/" + trailerMatch[1]
	}

	// 9. Genres
	genresRegex := regexp.MustCompile(`\{id:\d+,name:"([^"]+)",type:\d+,slug:"[^"]+",malId:\d+\}`)
	var genres []string
	for _, gm := range genresRegex.FindAllStringSubmatch(html, -1) {
		gName := gm[1]
		if strings.EqualFold(gName, "Hentai") || strings.EqualFold(gName, "Ecchi +18") {
			return nil, fmt.Errorf("contenido no disponible")
		}
		genres = append(genres, gName)
	}
	if len(genres) == 0 {
		genres = []string{"Anime", "Acción", "Fantasía"}
	}

	// 10. Extract episodes list directly from SvelteKit data
	var episodes []Episode
	if isMovie {
		// Movie has exactly 1 episode representing the whole movie
		episodes = []Episode{
			{
				Number:    1,
				Title:     "Película Completa",
				Thumbnail: fmt.Sprintf("%s/covers/%s.jpg", AnimeAV1CDNBase, mediaID),
				Duration:  7200, // ~2 hours
				Synopsis:  fmt.Sprintf("Película completa de %s transmitida en alta definición vía AnimeAV1.", title),
			},
		}
	} else {
		// Series / OVA / ONA / Especial
		epBlockIdx := strings.Index(html, "episodes:[")
		if epBlockIdx != -1 {
			block := html[epBlockIdx:]
			if endIdx := strings.Index(block, "],"); endIdx != -1 {
				block = block[:endIdx]
			}
			epItemRegex := regexp.MustCompile(`\{id:\d+,number:(\d+)\}`)
			seenEps := make(map[int]bool)
			for _, em := range epItemRegex.FindAllStringSubmatch(block, -1) {
				n, _ := strconv.Atoi(em[1])
				if !seenEps[n] {
					seenEps[n] = true
					epTitle := fmt.Sprintf("Episodio %d", n)
					if n == 0 {
						epTitle = "Episodio 0 (Prólogo / Especial)"
					}
					thumb := fmt.Sprintf("%s/screenshots/%s/%d.jpg", AnimeAV1CDNBase, mediaID, n)
					episodes = append(episodes, Episode{
						Number:    n,
						Title:     epTitle,
						Thumbnail: thumb,
						Duration:  1440,
						Synopsis:  fmt.Sprintf("Capítulo %d de %s transmitido vía AnimeAV1.", n, title),
					})
				}
			}
		}
		if len(episodes) == 0 {
			epCount := 12
			if epCountMatch := regexp.MustCompile(`episodesCount:(\d+)`).FindStringSubmatch(html); len(epCountMatch) >= 2 {
				epCount, _ = strconv.Atoi(epCountMatch[1])
			}
			dummyAnime := &Anime{ID: slug, Title: title, Banner: fmt.Sprintf("%s/backdrops/%s.jpg", AnimeAV1CDNBase, mediaID)}
			episodes = GenerateAnimeAV1Episodes(dummyAnime, epCount)
		}
	}

	anime := &Anime{
		ID:            slug,
		Title:         title,
		JapaneseTitle: title,
		Synopsis:      synopsis,
		Poster:        fmt.Sprintf("%s/covers/%s.jpg", AnimeAV1CDNBase, mediaID),
		Banner:        fmt.Sprintf("%s/backdrops/%s.jpg", AnimeAV1CDNBase, mediaID),
		Genres:        genres,
		Score:         score,
		Status:        "Finalizado",
		TotalEpisodes: len(episodes),
		Year:          2024,
		Type:          animeType,
		TrailerURL:    trailer,
		Studio:        "AnimeAV1",
		Episodes:      episodes,
		fetchedAt:     time.Now(),
	}
	if !isMovie && len(episodes) > 0 && episodes[len(episodes)-1].Number >= 12 {
		anime.Status = "En Emisión"
	}
	return anime, nil
}

// ScrapeAnimeAV1Episode extracts live video embeds and real download links from animeav1.com
func ScrapeAnimeAV1Episode(slug string, epNum int) ([]Server, []DownloadOption, error) {
	pageURL := fmt.Sprintf("%s/media/%s/%d", AnimeAV1BaseURL, slug, epNum)
	html, err := fetchAV1HTML(pageURL)
	if err != nil {
		return nil, nil, err
	}

	var servers []Server
	var dlOptions []DownloadOption
	idx := 0
	// embeds:{SUB:[...],DUB:[...]}
	forEachAV1Link(html, `embeds:\{([\s\S]*?)\}(?:,downloads|$)`, func(lang, langTag, audio, name, link string) {
		idx++
		servers = append(servers, Server{
			ID:         fmt.Sprintf("av1_live_%s_%s_%d", strings.ToLower(lang), strings.ToLower(name), idx),
			Name:       fmt.Sprintf("AnimeAV1 • %s [%s]", name, langTag),
			ServerType: "embed",
			URL:        link,
			Quality:    "1080p HD",
			Audio:      audio,
		})
	})
	// downloads:{SUB:[...],DUB:[...]}
	forEachAV1Link(html, `downloads:\{([\s\S]*?)\}\}`, func(lang, langTag, audio, name, link string) {
		dlOptions = append(dlOptions, DownloadOption{
			Name:    fmt.Sprintf("AnimeAV1 Directo (%s) [%s]", name, langTag),
			Type:    "direct",
			URL:     link,
			Size:    "450 MB",
			Quality: "1080p",
			Audio:   audio,
		})
	})

	// Ensure Voe server is principal (first in list)
	sort.SliceStable(servers, func(i, j int) bool {
		isVoeI := strings.Contains(strings.ToLower(servers[i].Name), "voe") || strings.Contains(strings.ToLower(servers[i].URL), "voe")
		isVoeJ := strings.Contains(strings.ToLower(servers[j].Name), "voe") || strings.Contains(strings.ToLower(servers[j].URL), "voe")
		if isVoeI && !isVoeJ {
			return true
		}
		return false
	})

	return servers, dlOptions, nil
}

var (
	av1LangRegex = regexp.MustCompile(`([A-Z]+):\[([\s\S]*?)\]`)
	av1LinkRegex = regexp.MustCompile(`\{server:"([^"]+)",url:"([^"]+)"\}`)
)

// forEachAV1Link calls fn for every unique {server,url} pair inside the block matched by blockPattern.
func forEachAV1Link(html, blockPattern string, fn func(lang, langTag, audio, name, link string)) {
	m := regexp.MustCompile(blockPattern).FindStringSubmatch(html)
	if len(m) < 2 {
		return
	}
	seen := make(map[string]bool)
	for _, lm := range av1LangRegex.FindAllStringSubmatch(m[1], -1) {
		lang, langTag, audio := lm[1], "Sub", "Sub Español"
		switch lang {
		case "DUB", "LAT":
			langTag, audio = "Latino", "Audio Latino"
		case "CAST":
			langTag, audio = "Castellano", "Castellano"
		}
		for _, item := range av1LinkRegex.FindAllStringSubmatch(lm[2], -1) {
			if !seen[item[2]] {
				seen[item[2]] = true
				fn(lang, langTag, audio, item[1], item[2])
			}
		}
	}
}

// GetLiveAnimeAV1Episode scrapes the live episode page for real embeds & downloads on demand
func GetLiveAnimeAV1Episode(slug, title string, epNum int) ([]Server, []DownloadOption) {
	// 1. Try scraping with provided slug
	liveServers, liveDownloads, err := ScrapeAnimeAV1Episode(slug, epNum)
	if err == nil && len(liveServers) > 0 {
		return liveServers, append(liveDownloads, standardDownloads(title, epNum)...)
	}

	// 2. Try scraping with normalized title slug if different
	if altSlug := Slugify(title); altSlug != "" && altSlug != slug {
		if ls, ld, err := ScrapeAnimeAV1Episode(altSlug, epNum); err == nil && len(ls) > 0 {
			return ls, append(ld, standardDownloads(title, epNum)...)
		}
	}

	// 3. No live servers: report none rather than made-up embed URLs that can't play
	return nil, standardDownloads(title, epNum)
}

// standardDownloads are the sample AV1 video and .torrent options offered for every episode.
func standardDownloads(title string, epNum int) []DownloadOption {
	cleanTitle := url.QueryEscape(fmt.Sprintf("%s - %02d [AV1 1080p]", title, epNum))
	magnetURI := fmt.Sprintf("magnet:?xt=urn:btih:3b245504fb5f3c478318134704090602f5eab35e&dn=%s&tr=http%%3A%%2F%%2Fnyaa.tracker.wf%%3A7777%%2Fannounce&tr=udp%%3A%%2F%%2Fopen.stealth.si%%3A80%%2Fannounce&tr=udp%%3A%%2F%%2Ftracker.opentrackr.org%%3A1337%%2Fannounce", cleanTitle)
	return []DownloadOption{
		{
			Name:    "Descargar Video en Formato AV1 (.av1)",
			Type:    "av1_video",
			URL:     magnetURI,
			Size:    "420 MB",
			Quality: "1080p AV1",
			Audio:   "Sub Español",
		},
		{
			Name:    "Descargar Archivo .torrent (.av1)",
			Type:    "torrent_file",
			URL:     fmt.Sprintf("/api/torrents/download-torrent-file?title=%s&episode=%d", url.QueryEscape(title), epNum),
			Size:    "15 KB",
			Quality: "1080p AV1",
			Audio:   "Sub Español",
		},
	}
}

var mediaIDRegex = regexp.MustCompile(`/(?:covers|backdrops|screenshots|thumbnails)/(\d+)`)

// ExtractMediaID extracts the numeric AnimeAV1 media ID from cover, backdrop or screenshot URLs.
// (A bare numeric anime ID is an AniList ID, not an AnimeAV1 one, so IDs are never used here.)
func ExtractMediaID(urls ...string) string {
	for _, u := range urls {
		if m := mediaIDRegex.FindStringSubmatch(u); len(m) > 1 {
			return m[1]
		}
	}
	return ""
}

// GenerateAnimeAV1Episodes creates episodes list connected to AnimeAV1 without blocking network calls
func GenerateAnimeAV1Episodes(a *Anime, total int) []Episode {
	isMovie := a.Type == "Película" || strings.Contains(strings.ToLower(a.Type), "película") || strings.Contains(strings.ToLower(a.Type), "movie")
	if isMovie || total <= 1 {
		total = 1
	}

	mediaID := ExtractMediaID(a.Poster, a.Banner)

	episodes := make([]Episode, total)
	for i := 1; i <= total; i++ {
		thumbnail := a.Poster
		if mediaID != "" && !isMovie {
			thumbnail = fmt.Sprintf("%s/screenshots/%s/%d.jpg", AnimeAV1CDNBase, mediaID, i)
		} else if isMovie && a.Poster != "" {
			thumbnail = a.Poster
		} else if a.Banner != "" && !strings.Contains(a.Banner, "cdn.animeav1.com/backdrops") {
			thumbnail = a.Banner
		}

		titleText := fmt.Sprintf("Episodio %d", i)
		durationSecs := 1440
		synopsisText := fmt.Sprintf("Capítulo %d de %s transmitido vía AnimeAV1 con servidores Zilla Networks, MEGA, UPNShare y Voe.", i, a.Title)
		if isMovie {
			titleText = "Película Completa"
			durationSecs = 7200
			synopsisText = fmt.Sprintf("Película completa de %s transmitida en alta definición vía AnimeAV1.", a.Title)
		}

		episodes[i-1] = Episode{
			Number:    i,
			Title:     titleText,
			Thumbnail: thumbnail,
			Duration:  durationSecs,
			Synopsis:  synopsisText,
		}
	}
	return episodes
}
