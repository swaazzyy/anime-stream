import { useState, useEffect } from 'react';
import { Bookmark, Trash2, Play } from 'lucide-react';
import { api } from '../services/api';

export default function MyListView({ onSelectAnime, onWatchEpisode, theme = 'dark' }) {
  const isDark = theme === 'dark';
  const [activeFilter, setActiveFilter] = useState('all');
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [wlData, favData] = await Promise.all([
        api.getWatchlist(),
        api.getFavorites(),
      ]);
      setWatchlist(wlData || []);
      setFavorites(favData || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading list:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemove = async (item) => {
    try {
      if (item.status === 'favorite') {
        await api.toggleFavorite(item.anime_id, item.anime_title, item.anime_poster);
      } else {
        await api.removeFromWatchlist(item.anime_id);
      }
      loadData();
    } catch (err) {
      console.error("Error removing:", err);
    }
  };

  const getFilteredItems = () => {
    if (activeFilter === 'favorites') {
      return favorites.map(f => ({
        anime_id: f.anime_id,
        anime_title: f.anime_title,
        anime_poster: f.anime_poster,
        status: 'favorite',
      }));
    }

    if (activeFilter === 'all') {
      return watchlist;
    }

    return watchlist.filter(item => item.status === activeFilter);
  };

  const filteredItems = getFilteredItems();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'plan_to_watch':
        return <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 text-[10px] font-bold">Por Ver (Futuro)</span>;
      case 'watching':
        return <span className="px-2 py-0.5 rounded bg-[#f47521]/20 text-[#f47521] text-[10px] font-bold">Viendo</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded bg-green-900/60 text-green-300 text-[10px] font-bold">Completado</span>;
      case 'favorite':
        return <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-300 text-[10px] font-bold">Favorito</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in transition-colors ${
      isDark ? 'text-white' : 'text-gray-900'
    }`}>
      {/* Header */}
      <div className={`pb-6 border-b ${isDark ? 'border-[#23252b]' : 'border-gray-200'}`}>
        <h1 className={`text-2xl sm:text-3xl font-black flex items-center gap-3 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          <Bookmark className="w-7 h-7 text-[#f47521]" />
          <span>Mi Lista / Para el Futuro</span>
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Organiza lo que quieres ver más adelante y sigue tus series favoritas en GoAnime
        </p>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto hide-scrollbar">
          {[
            { id: 'all', label: `Todos (${watchlist.length})` },
            { id: 'plan_to_watch', label: 'Para el Futuro / Por Ver' },
            { id: 'watching', label: 'Siguiendo (Viendo)' },
            { id: 'completed', label: 'Completados' },
            { id: 'favorites', label: `Favoritos (${favorites.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-[#f47521] text-black shadow-md'
                  : isDark
                    ? 'bg-[#14151a] hover:bg-[#1e2029] text-gray-300 border border-[#23252b]'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-xs'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of list items */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#f47521] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando tu lista de GoAnime...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={`text-center py-20 rounded-2xl border p-8 mt-6 ${
          isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tu lista está vacía
          </h3>
          <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Explora el catálogo de GoAnime y haz clic en el icono de marcador para guardar animes para el futuro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          {filteredItems.map((item) => (
            <div
              key={item.anime_id}
              className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                isDark 
                  ? 'bg-[#14151a] border-[#23252b] hover:border-[#f47521]/60 hover:shadow-black/50' 
                  : 'bg-white border-gray-200 hover:border-[#f47521]/60 shadow-sm hover:shadow-gray-300'
              }`}
            >
              {/* Poster */}
              <div
                className="relative aspect-[3/4] w-full overflow-hidden bg-black cursor-pointer"
                onClick={() => onSelectAnime({ id: item.anime_id, title: item.anime_title, poster: item.anime_poster })}
              >
                <img
                  src={item.anime_poster}
                  alt={item.anime_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Status Badge */}
                <div className="absolute top-2 left-2 z-10">
                  {getStatusBadge(item.status)}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  title="Eliminar de mi lista"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onWatchEpisode({ id: item.anime_id, title: item.anime_title, poster: item.anime_poster }, 1);
                    }}
                    className="w-12 h-12 rounded-full bg-[#f47521] flex items-center justify-center text-black shadow-lg transform group-hover:scale-110 transition-transform"
                  >
                    <Play className="w-6 h-6 fill-black ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="p-3">
                <h4
                  onClick={() => onSelectAnime({ id: item.anime_id, title: item.anime_title, poster: item.anime_poster })}
                  className={`font-bold text-xs sm:text-sm line-clamp-1 cursor-pointer hover:text-[#f47521] transition-colors ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {item.anime_title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
