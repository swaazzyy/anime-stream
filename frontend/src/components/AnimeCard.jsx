import { Play, Star, Bookmark, Check } from 'lucide-react';

export default function AnimeCard({ 
  anime, 
  onSelect, 
  onWatchFirst, 
  onToggleWatchlist, 
  isInWatchlist = false,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';

  return (
    <div 
      className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 cursor-pointer ${
        isDark 
          ? 'bg-[#14151a] border-[#23252b] hover:border-[#f47521]/60 hover:shadow-black/60' 
          : 'bg-white border-gray-200 hover:border-[#f47521]/60 shadow-sm hover:shadow-gray-300'
      }`}
      onClick={() => onSelect(anime)}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
        <img
          src={anime.poster || anime.banner}
          alt={anime.title}
          loading="lazy"
          onError={(e) => {
            if (anime?.banner && e.currentTarget.src !== anime.banner) {
              e.currentTarget.src = anime.banner;
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges: Score & Status */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          {anime.score > 0 && (
            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[#f47521] font-bold text-xs border border-white/10">
              <Star className="w-3 h-3 fill-[#f47521]" />
              {anime.score.toFixed(1)}
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            title={isInWatchlist ? "En tu lista" : "Añadir a mi lista"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(anime);
            }}
            className={`p-1.5 rounded-full backdrop-blur-sm transition-all ${
              isInWatchlist 
                ? 'bg-[#f47521] text-black shadow-md' 
                : 'bg-black/60 text-white hover:bg-[#f47521] hover:text-black opacity-0 group-hover:opacity-100'
            }`}
          >
            {isInWatchlist ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Quick Play Button in Center on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            title={anime.type?.toLowerCase().includes('película') || anime.type?.toLowerCase().includes('movie') || anime.total_episodes === 1 ? "Reproducir película" : "Reproducir primer capítulo"}
            onClick={(e) => {
              e.stopPropagation();
              if (onWatchFirst) onWatchFirst(anime);
              else onSelect(anime);
            }}
            className="w-12 h-12 rounded-full bg-[#f47521] text-black flex items-center justify-center shadow-lg shadow-[#f47521]/40 transform group-hover:scale-110 active:scale-95 transition-all"
          >
            <Play className="w-6 h-6 fill-black ml-0.5" />
          </button>
        </div>

        {/* Bottom tags: Episode count & Type */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-gray-300 font-semibold z-10">
          <span className={`px-1.5 py-0.5 rounded backdrop-blur-sm border ${
            anime.type?.toLowerCase().includes('película') || anime.type?.toLowerCase().includes('movie') || anime.total_episodes === 1
              ? 'bg-purple-900/80 border-purple-500/40 text-purple-200 font-extrabold'
              : 'bg-black/70 border-white/5'
          }`}>
            {anime.type?.toLowerCase().includes('película') || anime.type?.toLowerCase().includes('movie') || anime.total_episodes === 1
              ? 'PELÍCULA'
              : (anime.total_episodes ? `${anime.total_episodes} Caps` : 'Serie TV')}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/5 text-[#f47521]">
            {anime.type || 'TV'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 flex flex-col flex-grow justify-between">
        <div>
          <h3 className={`font-bold text-sm line-clamp-1 group-hover:text-[#f47521] transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {anime.title}
          </h3>
          <p className={`text-xs line-clamp-1 mt-0.5 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {anime.genres?.slice(0, 2).join(' • ') || 'Anime'}
          </p>
        </div>
      </div>
    </div>
  );
}
