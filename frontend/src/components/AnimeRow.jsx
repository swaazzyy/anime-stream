import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from './AnimeCard';

export default function AnimeRow({ 
  title, 
  subtitle, 
  animes = [], 
  onSelectAnime, 
  onWatchFirst, 
  onToggleWatchlist, 
  watchlistMap = {},
  theme = 'dark'
}) {
  const scrollRef = useRef(null);
  const isDark = theme === 'dark';

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount = clientWidth * 0.75;
    scrollRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!animes || animes.length === 0) return null;

  return (
    <div className={`py-6 border-b relative group/row transition-colors ${
      isDark ? 'border-[#23252b]/60' : 'border-gray-200'
    }`}>
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className={`text-xs sm:text-sm mt-0.5 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Scroll arrows */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark 
                ? 'bg-[#14151a] hover:bg-[#1e2029] border-[#23252b] text-gray-400 hover:text-white' 
                : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900 shadow-xs'
            }`}
            title="Desplazar a la izquierda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark 
                ? 'bg-[#14151a] hover:bg-[#1e2029] border-[#23252b] text-gray-400 hover:text-white' 
                : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900 shadow-xs'
            }`}
            title="Desplazar a la derecha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Anime cards row */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 hide-scrollbar scroll-smooth"
      >
        {animes.map((anime) => (
          <div key={anime.id} className="flex-shrink-0 w-36 sm:w-44 md:w-48">
            <AnimeCard
              anime={anime}
              onSelect={onSelectAnime}
              onWatchFirst={onWatchFirst}
              onToggleWatchlist={onToggleWatchlist}
              isInWatchlist={!!watchlistMap[anime.id]}
              theme={theme}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
