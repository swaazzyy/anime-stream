import { Play, X, Clock } from 'lucide-react';

export default function ContinueWatchingRow({ history = [], onResume, onRemove, theme = 'dark' }) {
  if (!history || history.length === 0) return null;
  const isDark = theme === 'dark';

  const formatRemainingTime = (progress, duration) => {
    if (!duration || duration <= 0) duration = 1440; // 24 min default
    const remainingSec = Math.max(0, duration - progress);
    const min = Math.ceil(remainingSec / 60);
    return `${min} min restantes`;
  };

  return (
    <div className={`py-6 border-b transition-colors ${
      isDark ? 'border-[#23252b]' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#f47521]" />
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Siguiendo Viendo
          </h2>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isDark ? 'bg-[#23252b] text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>
            {history.length}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 hide-scrollbar">
        {history.map((item) => {
          const duration = item.duration_seconds > 0 ? item.duration_seconds : 1440;
          const percentage = Math.min(100, Math.max(5, (item.progress_seconds / duration) * 100));

          return (
            <div
              key={`${item.anime_id}-${item.episode_number}`}
              className={`group relative flex-shrink-0 w-64 sm:w-72 rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
                isDark 
                  ? 'bg-[#14151a] border-[#23252b] hover:border-[#f47521]/60 hover:shadow-black/50' 
                  : 'bg-white border-gray-200 hover:border-[#f47521]/60 shadow-sm hover:shadow-gray-300'
              }`}
              onClick={() => onResume(item)}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <img
                  src={item.anime_poster || item.thumbnail || item.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600'}
                  alt={item.anime_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Dark gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="w-12 h-12 rounded-full bg-[#f47521] flex items-center justify-center text-black shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-black ml-0.5" />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  title="Quitar de seguir viendo"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.anime_id || item.id, item.episode_number);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Progress Bar (Crunchyroll Signature Orange) */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700/80">
                  <div
                    className="h-full bg-[#f47521] transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-3">
                <h3 className={`font-bold text-sm sm:text-base line-clamp-1 group-hover:text-[#f47521] transition-colors ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {item.anime_title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                  <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {item.episode_number === 0 ? 'Episodio 0 (Prólogo)' : `Episodio ${item.episode_number}`}
                  </span>
                  <span>{formatRemainingTime(item.progress_seconds, item.duration_seconds)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
