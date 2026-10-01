package providers

import "fmt"

// GetAnimeFLVEpisodeServers returns the multi-server embed links and torrent/direct downloads
func GetAnimeFLVEpisodeServers(slug string, title string, epNum int) ([]Server, []DownloadOption) {
	embed := func(id, name, urlFmt, quality, audio string) Server {
		return Server{ID: id, Name: name, ServerType: "embed", URL: fmt.Sprintf(urlFmt, slug, epNum), Quality: quality, Audio: audio}
	}
	servers := []Server{
		embed("streamwish", "Streamwish [HD]", "https://embedwish.com/e/%s_ep%02d", "1080p", "Sub Español"),
		embed("mega", "MEGA Cloud", "https://mega.nz/embed/!animeflv!%s_ep%02d", "1080p", "Sub Español"),
		embed("streamtape", "Streamtape", "https://streamtape.com/e/%s_ep%02d", "720p", "Sub Español"),
		embed("yourupload", "YourUpload", "https://www.yourupload.com/embed/%s_ep%02d", "720p", "Sub Español"),
		embed("mp4upload", "Mp4Upload", "https://www.mp4upload.com/embed-%s-ep%02d.html", "1080p", "Castellano / Latino"),
	}
	return servers, standardDownloads(title, "AnimeFLV", epNum)
}
