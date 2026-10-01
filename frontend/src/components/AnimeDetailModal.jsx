import { useState, useEffect } from 'react';
import {
  X,
  Play,
  Star,
  Bookmark,
  Heart,
  Download,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

const LIST_STATUSES = [
  { id: 'plan_to_watch', label: 'Para el Futuro (Por ver)', short: 'Para el Futuro' },
  { id: 'watching', label: 'Siguiendo (Viendo)', short: 'Viendo' },
  { id: 'completed', label: 'Completado', short: 'Completado' },
];

export default function AnimeDetailModal({
  anime,
  onClose,
  onWatchEpisode,
  onDownloadCap,
  onWatchlistUpdated,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const [details, setDetails] = useState(anime);
  const [watchlistStatus, setWatchlistStatus] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTab, setSelectedTab] = useState('episodes');

  useEffect(() => {
    if (!anime?.id) return;
    let isMounted = true;

    api.getAnime(anime.id)
      .then((data) => {
        if (!isMounted) return;
        setDetails(data.anime || anime);
        setWatchlistStatus(data.watchlist_status || '');
        setIsFavorite(!!data.is_favorite);
      })
      .catch((err) => console.error("Failed to load anime details", err));

    return () => { isMounted = false; };
  }, [anime]);

  if (!anime) return null;

  const handleStatusChange = async (newStatus) => {
    try {
      if (newStatus === 'remove') {
        await api.removeFromWatchlist(details.id);
        setWatchlistStatus('');
      } else {
        await api.setWatchlistItem({
          anime_id: details.id,
          anime_title: details.title,
          anime_poster: details.poster,
          status: newStatus,
          score: Math.round(details.score || 0),
        });
        setWatchlistStatus(newStatus);
      }
      if (onWatchlistUpdated) onWatchlistUpdated();
    } catch (err) {
      console.error("Failed to update watchlist", err);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await api.toggleFavorite(details.id, details.title, details.poster);
      setIsFavorite(res.is_favorite);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };

  const episodes = details.episodes || [];
  const isMovie = details.type?.toLowerCase().includes('película') || details.type?.toLowerCase().includes('movie') || details.total_episodes === 1;
  const firstEpNum = episodes.length > 0 ? episodes[0].number : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className={`relative w-full max-w-4xl rounded-2xl overflow-hidden border shadow-2xl my-auto max-h-[92vh] flex flex-col transition-colors ${
          isDark ? 'bg-[#14151a] border-[#23252b] text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Backdrop Banner Header */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden flex-shrink-0 bg-black">
          <img
            src={details.banner || details.poster}
            alt={details.title}
            className="w-full h-full object-cover filter brightness-75 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Banner bottom details overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end gap-6">
            <img
              src={details.poster}
              alt={details.title}
              className="hidden sm:block w-32 md:w-36 aspect-[3/4] object-cover rounded-xl border-2 border-white/20 shadow-2xl flex-shrink-0"
            />

            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#f47521] text-black font-extrabold text-xs">
                  <Star className="w-3.5 h-3.5 fill-black" />
                  {details.score ? details.score.toFixed(1) : '8.8'}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-xs text-white">
                  {details.status || (isMovie ? 'Finalizado' : 'En Emisión')}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-xs text-gray-300">
                  {details.year || '2024'}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-xs text-gray-300">
                  {details.type || (isMovie ? 'Película' : 'TV Anime')}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {details.title}
              </h2>
              {details.japanese_title && (
                <p className="text-sm text-gray-400 font-medium italic mt-0.5">
                  {details.japanese_title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions & Status Bar */}
        <div className={`px-6 py-3.5 border-b flex items-center justify-between flex-wrap gap-4 ${
          isDark ? 'border-[#23252b] bg-[#101115]' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onWatchEpisode(details, firstEpNum)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-sm transition-transform active:scale-95 shadow-md shadow-[#f47521]/20"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>{isMovie ? 'Ver Película' : (firstEpNum === 0 ? 'Ver Episodio 0' : `Ver Episodio ${firstEpNum}`)}</span>
            </button>

            {/* Watchlist status dropdown */}
            <div className="relative group">
              <button
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                  watchlistStatus
                    ? 'bg-orange-500/10 border-[#f47521] text-[#f47521]'
                    : isDark
                      ? 'bg-[#181920] border-[#2b2e3b] text-gray-300 hover:text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 shadow-xs'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>
                  {LIST_STATUSES.find((s) => s.id === watchlistStatus)?.short || '+ Mi Lista'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-400" />
              </button>

              <div className={`absolute left-0 mt-1 w-48 rounded-xl shadow-xl py-1 hidden group-hover:block z-40 border ${
                isDark ? 'bg-[#181920] border-[#2b2e3b] text-white' : 'bg-white border-gray-200 text-gray-900'
              }`}>
                {LIST_STATUSES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleStatusChange(id)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between ${
                      isDark ? 'hover:bg-[#23252b]' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span>{label}</span>
                    {watchlistStatus === id && <Check className="w-3.5 h-3.5 text-[#f47521]" />}
                  </button>
                ))}
                {watchlistStatus && (
                  <button
                    onClick={() => handleStatusChange('remove')}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-red-500/20 text-red-500 border-t border-gray-200 dark:border-[#23252b]"
                  >
                    Quitar de Mi Lista
                  </button>
                )}
              </div>
            </div>

            {/* Favorite button */}
            <button
              onClick={handleToggleFavorite}
              title="Añadir a favoritos"
              className={`p-2.5 rounded-lg border transition-colors ${
                isFavorite
                  ? 'bg-red-500/20 border-red-500 text-red-500'
                  : isDark 
                    ? 'bg-[#181920] border-[#2b2e3b] text-gray-400 hover:text-red-400' 
                    : 'bg-white border-gray-300 text-gray-500 hover:text-red-500 shadow-xs'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
            </button>
          </div>

          {/* Quick download cap 1 button */}
          <button
            onClick={() => onDownloadCap(details, 1)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
              isDark 
                ? 'bg-[#181920] border-[#2b2e3b] text-gray-300 hover:text-white hover:border-[#f47521]' 
                : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:border-[#f47521] shadow-xs'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#f47521]" />
            <span>Descargar Ep 1</span>
          </button>
        </div>

        {/* Tabs: Episodes vs Details */}
        <div className={`px-6 border-b flex items-center gap-6 ${
          isDark ? 'border-[#23252b]' : 'border-gray-200'
        }`}>
          <button
            onClick={() => setSelectedTab('episodes')}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              selectedTab === 'episodes'
                ? 'border-[#f47521] text-[#f47521]'
                : isDark ? 'border-transparent text-gray-400 hover:text-white' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {isMovie ? 'Película' : `Episodios (${episodes.length > 0 ? episodes.length : details.total_episodes || '12'})`}
          </button>
          <button
            onClick={() => setSelectedTab('details')}
            className={`py-3 text-sm font-bold border-b-2 transition-colors ${
              selectedTab === 'details'
                ? 'border-[#f47521] text-[#f47521]'
                : isDark ? 'border-transparent text-gray-400 hover:text-white' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Información & Sinopsis
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          {selectedTab === 'episodes' ? (
            <div className="space-y-3">
              {(isMovie
                ? (episodes.length > 0
                    ? episodes.slice(0, 1)
                    : [{
                        number: 1,
                        title: 'Película Completa',
                        thumbnail: details.banner || details.poster,
                        synopsis: details.synopsis || `Película completa en alta definición.`,
                      }]
                  )
                : (episodes.length > 0
                    ? episodes
                    : Array.from({ length: Math.min(details.total_episodes || 12, 24) }, (_, i) => ({
                        number: i + 1,
                        title: `Episodio ${i + 1}`,
                        thumbnail: details.poster,
                        synopsis: `Capítulo ${i + 1} de ${details.title}.`,
                      }))
                  )
              ).map((ep) => (
                <div
                  key={ep.number}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isDark 
                      ? 'bg-[#181920] border-[#2b2e3b] hover:border-[#f47521]/60' 
                      : 'bg-gray-50 border-gray-200 hover:border-[#f47521]/60 shadow-xs'
                  }`}
                >
                  <div
                    onClick={() => onWatchEpisode(details, ep.number)}
                    className="flex items-center gap-3 min-w-0 flex-grow cursor-pointer group"
                  >
                    <div className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
                      <img
                        src={ep.thumbnail || details.banner || details.poster}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 fill-white text-white" />
                      </div>
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[10px] font-bold text-gray-300">
                        {isMovie ? '110m' : '24m'}
                      </span>
                    </div>

                    <div className="min-w-0 flex-grow">
                      <h4 className={`font-bold text-xs sm:text-sm group-hover:text-[#f47521] transition-colors truncate ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {isMovie ? 'Película Completa' : ep.title}
                      </h4>
                      <p className={`text-xs line-clamp-1 mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {ep.synopsis || (isMovie ? 'Película completa en audio original con subtítulos en español' : `Capítulo ${ep.number} en audio japonés con subtítulos en español`)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    title={isMovie ? 'Descargar Película' : `Descargar Episodio ${ep.number}`}
                    onClick={() => onDownloadCap(details, ep.number, ep.downloads)}
                    className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                      isDark ? 'bg-[#23252b] hover:bg-[#f47521] text-gray-300 hover:text-black' : 'bg-gray-200 hover:bg-[#f47521] text-gray-700 hover:text-black'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Sinopsis
                </h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {details.synopsis || "No hay sinopsis disponible."}
                </p>
              </div>

              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Géneros
                </h3>
                <div className="flex flex-wrap gap-2">
                  {details.genres?.map((g) => (
                    <span
                      key={g}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isDark ? 'bg-[#181920] border border-[#2b2e3b] text-gray-300' : 'bg-gray-100 border border-gray-300 text-gray-700'
                      }`}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
