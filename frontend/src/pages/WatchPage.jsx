import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  ChevronLeft,
  ChevronRight,
  Download,
  Bookmark,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import AnimeAV1Logo from '../components/AnimeAV1Logo';
import EpisodeBlocks from '../components/EpisodeBlocks';

export default function WatchPage({
  slug,
  episodeNum = 1,
  initialProgress = 0,
  theme = 'dark',
  onNavigate,
  onDownloadCap,
  onProgressSaved,
  watchlistMap = {},
  onToggleWatchlist,
}) {
  const isDark = theme === 'dark';
  const [anime, setAnime] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);

  // Load Anime details & Episode data concurrently
  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    setSelectedServer(null);

    Promise.all([
      api.getAnime(slug).catch(() => ({ anime: { id: slug, title: slug } })),
      api.getEpisode(slug, episodeNum)
    ])
      .then(([animeRes, epData]) => {
        if (!isMounted) return;
        setAnime(animeRes.anime || { id: slug, title: slug });

        const servers = epData.servers || [];
        const validServers = servers.filter(s => {
          const n = s.name?.toLowerCase() || '';
          return !n.includes('nativo') && !n.includes('zilla') && !n.includes('streamtape') && !n.includes('mega cloud');
        });
        const list = validServers.length > 0 ? validServers : servers; // the backend already lists Voe first

        setEpisodeData({ ...epData, servers: list });
        setSelectedServer(list[0] ?? null);
        if (list.length === 0) setError('No hay servidores disponibles para este episodio. Intenta de nuevo más tarde.');
        setLoading(false);
      })
      .catch((err) => {
        console.error("WatchPage error loading episode:", err);
        if (!isMounted) return;
        setError("No se pudo cargar este episodio. Intenta de nuevo.");
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [slug, episodeNum]);

  // By type only: a series that has aired a single episode so far is not a movie.
  const isMovie = anime?.type?.toLowerCase().includes('película') || anime?.type?.toLowerCase().includes('movie');
  const totalEpisodes = anime?.total_episodes || (isMovie ? 1 : 1120);
  const minEpNum = anime?.episodes?.[0]?.number ?? 1;
  const maxEpNum = anime?.episodes?.at(-1)?.number ?? totalEpisodes; // lists that start at Episodio 0 end at total-1
  const hasNextEpisode = !isMovie && episodeNum < maxEpNum;
  const hasPrevEpisode = !isMovie && episodeNum > minEpNum;
  const isInWatchlist = !!(anime && watchlistMap[anime.id]);
  const hasServer = !!selectedServer;

  const saveProgress = (progress, duration, completed) =>
    api.saveWatchProgress({
      anime_id: anime.id,
      anime_title: anime.title,
      anime_poster: anime.poster,
      episode_number: episodeNum,
      episode_title: episodeData?.title || `Episodio ${episodeNum}`,
      progress_seconds: Math.floor(progress),
      duration_seconds: Math.floor(duration),
      completed,
    }).then(() => onProgressSaved?.(), err => console.error("Error saving progress:", err));

  // Every server is a cross-origin embed whose playback position can't be read, so the progress
  // saved is the time this page stays visible: enough for "Siguiendo Viendo" to resume the right episode.
  useEffect(() => {
    if (!anime || !hasServer) return;
    const duration = episodeData?.duration || 1440;
    let watched = initialProgress;
    const timer = setInterval(() => {
      if (document.hidden) return;
      watched += 15;
      saveProgress(watched, duration, watched >= duration * 0.9);
    }, 15000);
    return () => clearInterval(timer);
  }, [anime, episodeData, episodeNum, initialProgress, hasServer]);

  const episodesList = anime?.episodes || Array.from({ length: Math.min(totalEpisodes, 24) }, (_, i) => ({
    number: i + 1,
    title: `Episodio ${i + 1}`,
    thumbnail: anime?.poster,
  }));

  return (
    <div className={`min-h-screen pb-16 animate-fade-in ${isDark ? 'bg-[#000000] text-gray-100' : 'bg-gray-950 text-gray-100'}`}>
      
      {/* Top Breadcrumb & Control Bar */}
      <div className="sticky top-16 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate(`/media/${slug}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al anime</span>
          </button>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold truncate max-w-xs sm:max-w-md">
            <span 
              onClick={() => onNavigate(`/media/${slug}`)} 
              className="text-[#22c55e] hover:underline cursor-pointer truncate"
            >
              {anime?.title || slug}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-200">
              {isMovie ? 'Película Completa' : (episodeNum === 0 ? 'Episodio 0' : `Episodio ${episodeNum}`)}
            </span>
          </div>
        </div>

        {/* Server Switcher Pill */}
        <div className="flex items-center gap-2">
          {episodeData?.servers && episodeData.servers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs">
              <AnimeAV1Logo className="w-4 h-3.5 flex-shrink-0" />
              <select
                value={selectedServer?.id || ''}
                onChange={(e) => {
                  const srv = episodeData.servers.find(s => s.id === e.target.value);
                  if (srv) setSelectedServer(srv);
                }}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {episodeData.servers.map((srv) => (
                  <option key={srv.id} value={srv.id} className="bg-[#14151a] text-white">
                    {srv.name} ({srv.quality})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Prev Episode */}
          {hasPrevEpisode && (
            <button
              onClick={() => onNavigate(`/media/${slug}/${episodeNum - 1}`)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Episodio anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Next Episode */}
          {hasNextEpisode && (
            <button
              onClick={() => onNavigate(`/media/${slug}/${episodeNum + 1}`)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Siguiente episodio"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Video Cinema Container */}
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-0 sm:py-4">
        
        <div
          className="relative w-full aspect-video bg-black overflow-hidden sm:rounded-2xl border border-white/10 shadow-2xl"
        >
          {/* Rating Pill Badge */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15 shadow-md">
              16+ Violencia, Lenguaje ofensivo
            </span>
          </div>

          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black">
              <div className="w-10 h-10 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-gray-300">Conectando servidor de GoAnime...</p>
            </div>
          ) : error ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black p-4 text-center">
              <p className="text-sm font-bold text-red-400">{error}</p>
              <button
                onClick={() => onNavigate(`/media/${slug}`)}
                className="px-4 py-2 rounded-lg bg-[#22c55e] text-black text-xs font-bold"
              >
                Volver a {anime?.title}
              </button>
            </div>
          ) : (
            <iframe
              key={selectedServer.url}
              src={selectedServer.url}
              title={selectedServer.name}
              className="w-full h-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </div>

        {/* Info Section Below Player */}
        <div className="mt-6 px-4 sm:px-0 flex flex-col lg:flex-row lg:items-start justify-between gap-8 pb-8 border-b border-white/10">
          <div className="flex-1 min-w-0">
            {/* Green Uppercase Series Name */}
            <p 
              onClick={() => onNavigate(`/media/${slug}`)} 
              className="text-[#22c55e] hover:underline cursor-pointer text-xs font-black uppercase tracking-widest mb-1.5 inline-block"
            >
              {anime?.title || slug}
            </p>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mb-2">
              {isMovie ? (episodeData?.title || 'Película Completa') : (episodeNum === 0 ? 'E0 – Episodio 0 (Prólogo / Especial)' : `E${episodeNum} – ${episodeData?.title || `Episodio ${episodeNum}`}`)}
            </h1>

            <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-bold text-[10px]">
                16+
              </span>
              <span>•</span>
              <span className="font-semibold text-gray-300">Sub | Dob</span>
              <span>•</span>
              <span>Lanzado recientemente</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {anime && (
                <button
                  onClick={() => onToggleWatchlist?.(anime)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    isInWatchlist
                      ? 'bg-[#22c55e] text-black border-[#22c55e]'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isInWatchlist ? 'fill-black' : ''}`} />
                  <span>{isInWatchlist ? 'En Mi Lista' : 'Añadir a Mi Lista'}</span>
                </button>
              )}

              {anime && (
                <button
                  onClick={() => onDownloadCap?.(anime, episodeNum, episodeData?.downloads)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-[#22c55e] hover:text-black text-white text-xs font-bold transition-all border border-white/10"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Cap</span>
                </button>
              )}
            </div>

            <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
              {episodeData?.synopsis || anime?.synopsis || 'Disfruta de este episodio en alta definición en GoAnime.'}
            </p>
          </div>

          {/* Siguiente Episodio Card */}
          {hasNextEpisode && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5">
                SIGUIENTE EPISODIO
              </h4>

              <div
                onClick={() => onNavigate(`/media/${slug}/${episodeNum + 1}`)}
                className="group flex gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer hover:border-[#22c55e]/60"
              >
                <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
                  <img
                    src={anime?.poster || anime?.banner}
                    alt={`Episodio ${episodeNum + 1}`}
                    onError={(e) => {
                      if (anime?.poster && e.currentTarget.src !== anime.poster) {
                        e.currentTarget.src = anime.poster;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center text-black shadow-md">
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                    23m
                  </span>
                </div>

                <div className="flex flex-col justify-center min-w-0">
                  <p className="text-xs font-bold text-white group-hover:text-[#22c55e] transition-colors truncate">
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

        {/* All Episodes Browser Row */}
        <div className="mt-8 px-4 sm:px-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#22c55e]" />
              <span>Todos los Episodios ({episodesList.length})</span>
            </h3>
            <button
              onClick={() => onNavigate(`/media/${slug}`)}
              className="text-xs font-bold text-[#22c55e] hover:underline"
            >
              Ver ficha del anime &rarr;
            </button>
          </div>

          <EpisodeBlocks key={`${slug}-${episodeNum}`} episodes={episodesList} current={episodeNum} onJump={(n) => onNavigate(`/media/${slug}/${n}`)}>
          {(shown) => (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {shown.map((ep) => {
              const isCurrent = ep.number === episodeNum;
              return (
                <div
                  key={ep.number}
                  onClick={() => {
                    if (!isCurrent) onNavigate(`/media/${slug}/${ep.number}`);
                  }}
                  className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-[#22c55e] ring-2 ring-[#22c55e]/40 bg-[#1e2029]'
                      : 'border-white/10 hover:border-[#22c55e]/60 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    <img
                      src={ep.thumbnail || anime?.poster || anime?.banner}
                      alt={ep.title}
                      loading="lazy"
                      onError={(e) => {
                        if (anime?.poster && e.currentTarget.src !== anime.poster) {
                          e.currentTarget.src = anime.poster;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40" />

                    {isCurrent ? (
                      <span className="absolute inset-0 flex items-center justify-center font-black text-xs text-[#22c55e] bg-black/60">
                        Reproduciendo
                      </span>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center text-black">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                      </div>
                    )}

                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                      {isMovie ? '110m' : '24m'}
                    </span>
                  </div>

                  <div className="p-2">
                    <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#22c55e]' : 'text-white group-hover:text-[#22c55e]'}`}>
                      {isMovie ? 'Película Completa' : (ep.number === 0 ? 'Episodio 0' : `Episodio ${ep.number}`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </EpisodeBlocks>
        </div>

      </div>
    </div>
  );
}
