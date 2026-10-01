import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  ChevronLeft, 
  RotateCcw,
  RotateCw,
  SkipForward,
  FastForward,
  Download, 
  Bookmark,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import AnimeAV1Logo from './AnimeAV1Logo';

export default function VideoPlayerModal({ 
  anime, 
  initialEpisode = 1, 
  initialProgress = 0,
  onClose, 
  onDownloadCap,
  onProgressSaved,
  onToggleWatchlist,
  isInWatchlist = false,
  streamUrl,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const [episodeNum, setEpisodeNum] = useState(initialEpisode);
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(!streamUrl);
  const [selectedServer, setSelectedServer] = useState(
    streamUrl ? { id: 'local', name: 'Archivo local', quality: 'Descargado', url: streamUrl, server_type: 'direct_mp4' } : null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialProgress);
  const [duration, setDuration] = useState(1425); // default ~23:45 like Crunchyroll
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hideControlsTimeout = useRef(null);
  const lastSyncTime = useRef(0);

  const [animeDetails, setAnimeDetails] = useState(anime);

  useEffect(() => {
    if (!anime?.id) return;
    let isMounted = true;
    if (!anime.episodes || anime.episodes.length === 0 || !anime.type) {
      api.getAnime(anime.id)
        .then((data) => {
          if (!isMounted || !data?.anime) return;
          setAnimeDetails(prev => ({ ...prev, ...data.anime }));
        })
        .catch(err => console.log("Player background anime details load:", err));
    }
    return () => { isMounted = false; };
  }, [anime?.id]);

  const currentAnime = animeDetails || anime;
  const isMovie = currentAnime.type?.toLowerCase().includes('película') || currentAnime.type?.toLowerCase().includes('movie') || currentAnime.total_episodes === 1;
  const totalEpisodes = currentAnime.total_episodes || (isMovie ? 1 : 1120);
  const hasNextEpisode = !isMovie && episodeNum < totalEpisodes;

  // Load episode details & servers
  useEffect(() => {
    if (streamUrl) return;
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);

    api.getEpisode(anime.id, episodeNum)
      .then((data) => {
        if (!isMounted) return;
        setEpisodeData(data);
        if (data.servers && data.servers.length > 0) {
          const validServers = data.servers.filter(s => {
            const n = s.name?.toLowerCase() || '';
            return !n.includes('nativo') && !n.includes('zilla') && !n.includes('streamtape') && !n.includes('mega cloud');
          });
          const serversList = validServers.length > 0 ? validServers : data.servers;
          setEpisodeData({ ...data, servers: serversList });
          setSelectedServer(serversList[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch episode:", err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [anime.id, episodeNum, streamUrl]);

  // Video element setup and progress sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video || selectedServer?.server_type === 'embed') return;

    if (initialProgress > 0 && currentTime === initialProgress) {
      video.currentTime = initialProgress;
    }

    const saveProgress = (progress, completed) => {
      if (streamUrl) return;
      return api.saveWatchProgress({
        anime_id: anime.id,
        anime_title: anime.title,
        anime_poster: anime.poster,
        episode_number: episodeNum,
        episode_title: episodeData?.title || `Episodio ${episodeNum}`,
        progress_seconds: Math.floor(progress),
        duration_seconds: Math.floor(video.duration || 1425),
        completed,
      }).catch(err => console.error("Error saving progress:", err));
    };

    const handleTimeUpdate = () => {
      const cur = video.currentTime;
      setCurrentTime(cur);
      if (video.duration) setDuration(video.duration);

      const now = Math.floor(cur);
      if (Math.abs(now - lastSyncTime.current) >= 5) {
        lastSyncTime.current = now;
        saveProgress(cur, video.duration ? cur >= video.duration * 0.92 : false)
          ?.then(() => onProgressSaved?.());
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      saveProgress(video.duration || 1425, true);
      if (hasNextEpisode) {
        setEpisodeNum(prev => prev + 1);
        setCurrentTime(0);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [anime, episodeNum, episodeData, initialProgress, streamUrl, selectedServer, hasNextEpisode]);

  // Fullscreen sync
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (selectedServer?.server_type === 'embed') return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-10);
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(e => console.log("Play interrupted:", e));
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const seekRelative = (sec) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 1425, video.currentTime + sec));
  };

  const handleSeekChange = (e) => {
    const video = videoRef.current;
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (video) video.currentTime = newTime;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const isEmbed = selectedServer?.server_type === 'embed';

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto animate-fade-in ${
      isDark ? 'bg-[#000000] text-gray-100' : 'bg-gray-950 text-gray-100'
    }`}>
      {/* Top Floating Mini Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 focus:outline-none hover:opacity-80 transition-opacity cursor-pointer"
              title="Volver a GoAnime"
            >
              <span className="font-extrabold text-[#f47521] text-sm">GoAnime</span>
            </button>
            <span className="text-gray-500">•</span>
            <span className="font-bold text-xs sm:text-sm text-gray-200 truncate max-w-xs sm:max-w-md">
              {currentAnime.title} — {isMovie ? 'Película Completa' : (episodeNum === 0 ? 'Episodio 0' : `Ep ${episodeNum}`)}
            </span>
          </div>
        </div>

        {/* Server Switcher Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs">
            <AnimeAV1Logo className="w-4 h-3.5 flex-shrink-0" />
            <select
              value={selectedServer?.id || ''}
              onChange={(e) => {
                const srv = episodeData?.servers?.find(s => s.id === e.target.value);
                if (srv) setSelectedServer(srv);
              }}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {episodeData?.servers?.map((srv) => (
                <option key={srv.id} value={srv.id} className="bg-[#14151a] text-white">
                  {srv.name} ({srv.quality})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
            title="Cerrar reproductor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Watch Container */}
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-0 sm:py-4">
        
        {/* Cinematic Video Player Container (Crunchyroll 16:9 Style) */}
        <div 
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          className="relative w-full aspect-video bg-black overflow-hidden sm:rounded-2xl border border-white/5 shadow-2xl"
        >
          {/* Top-Left Rating Pill (Crunchyroll Style as in Image 2) */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15 shadow-md">
              16+ Violencia, Lenguaje ofensivo, Tabaquismo
            </span>
          </div>

          {/* Player Display: Embed vs Direct Stream */}
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black">
              <div className="w-10 h-10 border-3 border-[#f47521] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-300">Conectando servidor de GoAnime...</p>
            </div>
          ) : isEmbed ? (
            /* IFRAME EMBED: Full clean interactivity without any overlaid play buttons! */
            <iframe
              key={selectedServer.url}
              src={selectedServer.url}
              title={selectedServer.name}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            /* DIRECT VIDEO: Custom Clean Crunchyroll Controls */
            <div 
              className="relative w-full h-full flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <video
                ref={videoRef}
                src={selectedServer?.url}
                className="w-full h-full object-contain"
                playsInline
                preload="metadata"
              />

              {/* Crunchyroll Bottom Controls Overlay for Direct Video */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-0 left-0 right-0 z-30 pt-8 pb-3 px-4 sm:px-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Full-width Sleek Orange Scrubber Bar (Crunchyroll Style) */}
                <div className="relative w-full flex items-center group/seek mb-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 1425}
                    step={0.5}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#f47521] hover:h-1.5 transition-all"
                  />
                </div>

                {/* Control Icons Row underneath Scrubber (Exact match to Image 2) */}
                <div className="flex items-center justify-between">
                  {/* Left Controls */}
                  <div className="flex items-center gap-4">
                    {/* Skip Back 10s */}
                    <button
                      type="button"
                      onClick={() => seekRelative(-10)}
                      className="text-white hover:text-[#f47521] transition-colors p-1"
                      title="Retroceder 10s"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* Play / Pause - Simple clean white icon, NO giant overlapping circle! */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="text-white hover:text-[#f47521] transition-colors p-1"
                      title={isPlaying ? "Pausar" : "Reproducir"}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      )}
                    </button>

                    {/* Skip Forward 10s */}
                    <button
                      type="button"
                      onClick={() => seekRelative(10)}
                      className="text-white hover:text-[#f47521] transition-colors p-1"
                      title="Avanzar 10s"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>

                    {/* Volume with hover slider */}
                    <div className="flex items-center gap-2 group/vol">
                      <button 
                        type="button" 
                        onClick={toggleMute} 
                        className="text-white hover:text-[#f47521] transition-colors p-1"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 sm:w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-[#f47521]"
                      />
                    </div>

                    {/* Current / Duration Time (like 14:22 / 23:45 in Image 2) */}
                    <span className="text-xs font-mono font-medium text-gray-300">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    {/* Saltar Intro button */}
                    <button
                      type="button"
                      onClick={() => seekRelative(85)}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-[#f47521] hover:text-black text-gray-200 text-xs font-bold transition-all border border-white/10"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Saltar Intro</span>
                    </button>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-3">
                    {/* Next Episode Button */}
                    {hasNextEpisode && (
                      <button
                        type="button"
                        onClick={() => { setEpisodeNum(prev => prev + 1); setCurrentTime(0); }}
                        className="text-white hover:text-[#f47521] transition-colors p-1"
                        title="Siguiente episodio"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                    )}

                    {/* Playback speed selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="text-xs font-bold text-white hover:text-[#f47521] px-1.5 py-1 rounded"
                      >
                        {playbackSpeed}x
                      </button>

                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-[#181920] border border-white/10 rounded-xl shadow-2xl py-1 w-24 z-50">
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              onClick={() => changeSpeed(spd)}
                              className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-white/10 ${
                                playbackSpeed === spd ? 'text-[#f47521] font-bold' : 'text-gray-300'
                              }`}
                            >
                              <span>{spd}x</span>
                              {playbackSpeed === spd && <Check className="w-3 h-3 text-[#f47521]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="text-white hover:text-[#f47521] transition-colors p-1"
                      title="Pantalla completa"
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Crunchyroll-Style Info Section Below Player (Exact Match to Image 2) */}
        <div className="mt-6 px-4 sm:px-0 flex flex-col lg:flex-row lg:items-start justify-between gap-8 pb-12">
          
          {/* Left Column: Series, Episode Title, Badges, Actions */}
          <div className="flex-1 min-w-0">
            {/* Orange Uppercase Series Name (like "BLACK TORCH" in Image 2) */}
            <p className="text-[#f47521] text-xs font-black uppercase tracking-widest mb-1.5">
              {currentAnime.title}
            </p>

            {/* Episode Title (like "E1 - El futuro está en nuestras manos" in Image 2) */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mb-2">
              {isMovie ? (episodeData?.title || 'Película Completa') : (episodeNum === 0 ? 'E0 – Episodio 0 (Prólogo / Especial)' : `E${episodeNum} – ${episodeData?.title || `Episodio ${episodeNum}`}`)}
            </h1>

            {/* Badges and Release info */}
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-bold text-[10px]">
                16+
              </span>
              <span>•</span>
              <span className="font-semibold text-gray-300">Sub | Dob</span>
              <span>•</span>
              <span>Lanzado recientemente</span>
            </div>

            {/* Action Buttons: Watchlist & Download Cap */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => onToggleWatchlist?.(currentAnime)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                  isInWatchlist
                    ? 'bg-[#f47521] text-black border-[#f47521]'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isInWatchlist ? 'fill-black' : ''}`} />
                <span>{isInWatchlist ? 'En Mi Lista' : 'Añadir a Mi Lista'}</span>
              </button>

              <button
                onClick={() => onDownloadCap?.(currentAnime, episodeNum, episodeData?.downloads)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-[#f47521] hover:text-black text-white text-xs font-bold transition-all border border-white/10"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Cap</span>
              </button>
            </div>

            {/* Synopsis */}
            <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
              {episodeData?.synopsis || currentAnime.synopsis}
            </p>
          </div>

          {/* Right Column: "SIGUIENTE EPISODIO" Card (Exact Match to Image 2) */}
          {hasNextEpisode && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5">
                SIGUIENTE EPISODIO
              </h4>

              <div
                onClick={() => {
                  setEpisodeNum(prev => prev + 1);
                  setCurrentTime(0);
                }}
                className="group flex gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer hover:border-[#f47521]/60"
              >
                {/* Thumbnail Preview */}
                <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
                  <img
                    src={currentAnime.poster || currentAnime.banner}
                    alt={`Episodio ${episodeNum + 1}`}
                    onError={(e) => {
                      if (currentAnime.poster && e.currentTarget.src !== currentAnime.poster) {
                        e.currentTarget.src = currentAnime.poster;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-[#f47521] flex items-center justify-center text-black shadow-md">
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                    23m
                  </span>
                </div>

                {/* Next Ep Info */}
                <div className="flex flex-col justify-center min-w-0">
                  <p className="text-xs font-bold text-white group-hover:text-[#f47521] transition-colors truncate">
                    E{episodeNum + 1} – Capítulo {episodeNum + 1}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Dob | Sub
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
