import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Star, 
  Bookmark, 
  Heart, 
  Download, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  ArrowLeft, 
  Film, 
  Tv, 
  Layers
} from 'lucide-react';
import { api } from '../services/api';

const LIST_STATUSES = [
  { id: 'plan_to_watch', label: 'Para el Futuro (Por ver)', short: 'Para el Futuro' },
  { id: 'watching', label: 'Siguiendo (Viendo)', short: 'Viendo' },
  { id: 'completed', label: 'Completado', short: 'Completado' },
];

export default function AnimeDetailPage({
  slug,
  theme = 'dark',
  onNavigate,
  onDownloadCap,
  onWatchlistUpdated,
}) {
  const isDark = theme === 'dark';
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchlistStatus, setWatchlistStatus] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTab, setSelectedTab] = useState('episodes');
  const [showListMenu, setShowListMenu] = useState(false);
  const listMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target)) {
        setShowListMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    api.getAnime(slug)
      .then((data) => {
        if (!isMounted) return;
        setAnime(data.anime);
        setWatchlistStatus(data.watchlist_status || '');
        setIsFavorite(!!data.is_favorite);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load anime:", err);
        if (!isMounted) return;
        setError("No se pudo cargar la información de este anime.");
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [slug]);

  const handleStatusChange = async (newStatus) => {
    if (!anime) return;
    try {
      if (newStatus === 'remove') {
        await api.removeFromWatchlist(anime.id);
        setWatchlistStatus('');
      } else {
        await api.setWatchlistItem({
          anime_id: anime.id,
          anime_title: anime.title,
          anime_poster: anime.poster,
          status: newStatus,
          score: Math.round(anime.score || 0),
        });
        setWatchlistStatus(newStatus);
      }
      onWatchlistUpdated?.();
    } catch (err) {
      console.error("Failed to update watchlist", err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!anime) return;
    try {
      const res = await api.toggleFavorite(anime.id, anime.title, anime.poster);
      setIsFavorite(res.is_favorite);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-[70vh] flex flex-col items-center justify-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <div className="w-12 h-12 border-4 border-[#f47521] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-400">Cargando detalles de {slug}...</p>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black mb-2">Anime no encontrado</h2>
        <p className="text-sm text-gray-400 mb-6">{error || "El contenido solicitado no existe o no está disponible."}</p>
        <button
          onClick={() => onNavigate('/')}
          className="px-6 py-2.5 rounded-xl bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-sm transition-all"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  // By type only: a series that has aired a single episode so far is not a movie.
  const isMovie = anime.type?.toLowerCase().includes('película') || anime.type?.toLowerCase().includes('movie');
  const episodes = anime.episodes || [];
  const firstEpNum = episodes.length > 0 ? episodes[0].number : 1;

  const episodeList = isMovie
    ? (episodes.length > 0 ? episodes.slice(0, 1) : [{
        number: 1,
        title: 'Película Completa',
        thumbnail: anime.banner || anime.poster,
        synopsis: anime.synopsis || 'Película completa en alta definición.',
      }])
    : (episodes.length > 0 ? episodes : Array.from({ length: Math.max(1, anime.total_episodes || 1) }, (_, i) => ({
        number: i + 1,
        title: `Episodio ${i + 1}`,
        thumbnail: anime.poster,
        synopsis: `Capítulo ${i + 1} de ${anime.title}.`,
      })));

  return (
    <div className={`min-h-screen pb-16 animate-fade-in ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
      
      {/* Breadcrumb Bar */}
      <div className={`border-b text-xs py-3 px-4 sm:px-8 transition-colors ${
        isDark ? 'border-[#23252b] bg-[#0e0f13] text-gray-400' : 'border-gray-200 bg-white text-gray-600'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <button
            onClick={() => onNavigate('/')}
            className="hover:text-[#f47521] flex items-center gap-1 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-[#f47521] font-bold">Anime</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="font-semibold truncate max-w-xs sm:max-w-md">{anime.title}</span>
        </div>
      </div>

      {/* Cinematic Backdrop Hero Banner */}
      <div className="relative w-full min-h-[380px] sm:min-h-[440px] md:min-h-[480px] bg-black select-none border-b border-[#23252b] flex items-end">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={anime.banner || anime.poster}
            alt={anime.title}
            onError={(e) => {
              if (anime?.poster && e.currentTarget.src !== anime.poster) {
                e.currentTarget.src = anime.poster;
              }
            }}
            className="w-full h-full object-cover object-center filter brightness-[0.38] transition-all duration-700"
          />
          {/* Soft edge gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-[#0b0c0e]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c0e] via-[#0b0c0e]/85 to-transparent w-full md:w-3/4" />
        </div>

        {/* Content Inside Banner */}
        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 z-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            
            {/* Poster thumbnail */}
            <div className="w-32 sm:w-40 md:w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 flex-shrink-0 bg-black">
              <img
                src={anime.poster}
                alt={anime.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Anime Info */}
            <div className="flex-grow min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {anime.score > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f47521] text-black font-black text-xs shadow-md">
                    <Star className="w-3.5 h-3.5 fill-black" />
                    {anime.score.toFixed(1)}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isMovie ? 'bg-purple-900/80 border border-purple-500/40 text-purple-200' : 'bg-black/60 border border-white/10 text-white'
                }`}>
                  {anime.type || (isMovie ? 'Película' : 'TV Anime')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-300">
                  {anime.status || 'Finalizado'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-300">
                  {isMovie ? '1 Episodio' : (anime.total_episodes === 1 ? '1 Episodio' : `${anime.total_episodes || episodeList.length} Episodios`)}
                </span>
                {anime.year && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-300">
                    {anime.year}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md leading-tight mb-1">
                {anime.title}
              </h1>
              {anime.japanese_title && (
                <p className="text-sm sm:text-base text-gray-400 font-medium italic mb-2">
                  {anime.japanese_title}
                </p>
              )}

              {/* Little Description (Synopsis) */}
              {anime.synopsis && (
                <p className="text-xs sm:text-sm text-gray-300 line-clamp-3 md:line-clamp-4 max-w-3xl leading-relaxed mb-4 drop-shadow-sm font-medium">
                  {anime.synopsis}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap mt-2">
                <button
                  onClick={() => onNavigate(`/media/${anime.id}/${firstEpNum}`)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f47521] hover:bg-[#ff8c3b] text-black font-black text-sm transition-all shadow-lg shadow-[#f47521]/30 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                  <span>{isMovie ? 'Ver Película Completa' : (firstEpNum === 0 ? 'Ver Episodio 0' : `Ver Episodio ${firstEpNum}`)}</span>
                </button>

                {/* Watchlist dropdown */}
                <div className="relative group" ref={listMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowListMenu((prev) => !prev)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border backdrop-blur-md transition-all cursor-pointer ${
                      watchlistStatus
                        ? 'bg-orange-500/20 border-[#f47521] text-[#f47521]'
                        : 'bg-black/60 hover:bg-black/80 text-white border-white/15'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${watchlistStatus ? 'fill-[#f47521]' : ''}`} />
                    <span>
                      {LIST_STATUSES.find((s) => s.id === watchlistStatus)?.short || '+ Mi Lista'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
                  </button>

                  <div className={`absolute left-0 top-full mt-2 w-56 rounded-xl shadow-2xl py-1.5 z-50 border transition-all ${
                    showListMenu ? 'block' : 'hidden group-hover:block'
                  } ${
                    isDark ? 'bg-[#181920] border-[#2b2e3b] text-white shadow-black/80' : 'bg-white border-gray-200 text-gray-900 shadow-xl'
                  }`}>
                    {LIST_STATUSES.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => {
                          handleStatusChange(id);
                          setShowListMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                          isDark ? 'hover:bg-[#23252b]' : 'hover:bg-gray-100'
                        }`}
                      >
                        <span>{label}</span>
                        {watchlistStatus === id && <Check className="w-3.5 h-3.5 text-[#f47521]" />}
                      </button>
                    ))}
                    {watchlistStatus && (
                      <button
                        onClick={() => {
                          handleStatusChange('remove');
                          setShowListMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 border-t border-gray-700/40"
                      >
                        Quitar de Mi Lista
                      </button>
                    )}
                  </div>
                </div>

                {/* Favorite toggle */}
                <button
                  onClick={handleToggleFavorite}
                  title="Añadir a favoritos"
                  className={`p-3 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                    isFavorite
                      ? 'bg-red-500/20 border-red-500 text-red-500 shadow-md'
                      : 'bg-black/60 hover:bg-black/80 text-gray-300 hover:text-red-400 border-white/15'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Main Body: Tabs & Episodes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Navigation Tabs */}
        <div className={`flex items-center gap-8 border-b pb-4 mb-6 ${
          isDark ? 'border-[#23252b]' : 'border-gray-200'
        }`}>
          <button
            onClick={() => setSelectedTab('episodes')}
            className={`font-black text-base sm:text-lg flex items-center gap-2 pb-2 -mb-4 transition-colors border-b-2 cursor-pointer ${
              selectedTab === 'episodes'
                ? 'border-[#f47521] text-[#f47521]'
                : isDark ? 'border-transparent text-gray-400 hover:text-white' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isMovie ? 'Película' : `Episodios (${episodeList.length})`}</span>
          </button>

          <button
            onClick={() => setSelectedTab('details')}
            className={`font-black text-base sm:text-lg flex items-center gap-2 pb-2 -mb-4 transition-colors border-b-2 cursor-pointer ${
              selectedTab === 'details'
                ? 'border-[#f47521] text-[#f47521]'
                : isDark ? 'border-transparent text-gray-400 hover:text-white' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Sinopsis & Ficha Técnica</span>
          </button>
        </div>

        {/* Tab 1: Episodes Grid */}
        {selectedTab === 'episodes' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {episodeList.map((ep) => (
                <div
                  key={ep.number}
                  className={`group relative rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                    isDark
                      ? 'bg-[#14151a] border-[#23252b] hover:border-[#f47521]/60 hover:shadow-black/50'
                      : 'bg-white border-gray-200 hover:border-[#f47521]/60 shadow-sm'
                  }`}
                  onClick={() => onNavigate(`/media/${anime.id}/${ep.number}`)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    <img
                      src={ep.thumbnail || anime.poster || anime.banner}
                      alt={ep.title}
                      loading="lazy"
                      onError={(e) => {
                        if (anime?.poster && e.currentTarget.src !== anime.poster) {
                          e.currentTarget.src = anime.poster;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="w-11 h-11 rounded-full bg-[#f47521] flex items-center justify-center text-black shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                      {isMovie ? '110m' : '24m'}
                    </span>

                    {/* Episode Number badge */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-extrabold text-[#f47521] border border-white/10">
                      {isMovie ? 'Película' : (ep.number === 0 ? 'E0' : `E${ep.number}`)}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="p-3.5 flex flex-col justify-between flex-grow">
                    <div>
                      <h4 className={`font-bold text-sm line-clamp-1 group-hover:text-[#f47521] transition-colors ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {isMovie ? 'Película Completa' : ep.title}
                      </h4>
                      <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {ep.synopsis || `Capítulo ${ep.number} disponible en GoAnime con servidores AnimeAV1.`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/20 text-xs text-gray-400">
                      <span>Sub | Dob</span>
                      <button
                        type="button"
                        title="Descargar capítulo"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadCap?.(anime, ep.number); // the modal fetches the episode's live mirrors
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-[#23252b] hover:text-[#f47521]' : 'hover:bg-gray-100 hover:text-[#f47521]'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Synopsis & Details */}
        {selectedTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className="text-lg font-black mb-3">Sinopsis</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {anime.synopsis || "No hay sinopsis disponible."}
                </p>
              </div>

              {anime.trailer_url && (
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <h3 className="text-lg font-black mb-3">Tráiler Oficial</h3>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                    <iframe
                      src={anime.trailer_url}
                      title="Tráiler Oficial"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h3 className="text-base font-black border-b pb-3 border-gray-700/30">Ficha Técnica</h3>
                
                <div>
                  <span className="text-xs text-gray-400 block font-semibold">Géneros</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {anime.genres?.map((g) => (
                      <span
                        key={g}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isDark ? 'bg-[#23252b] text-gray-200' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block font-semibold">Formato</span>
                  <span className="text-sm font-bold">{anime.type || 'TV Anime'}</span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block font-semibold">Estado</span>
                  <span className="text-sm font-bold">{anime.status || 'Finalizado'}</span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block font-semibold">Estudio</span>
                  <span className="text-sm font-bold">{anime.studio || 'AnimeAV1 Studio'}</span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block font-semibold">Año de Estreno</span>
                  <span className="text-sm font-bold">{anime.year || '2024'}</span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block font-semibold">Episodios Totales</span>
                  <span className="text-sm font-bold">{isMovie ? '1 (Película)' : (anime.total_episodes || 12)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
