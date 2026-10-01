import { useState, useEffect } from 'react';
import { Play, Bookmark, ChevronLeft, ChevronRight, Info } from 'lucide-react';

export default function HeroBanner({ slides = [], onWatchEpisode, onOpenDetails, onToggleWatchlist }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [slides]);

  if (!slides || slides.length === 0) return null;
  const current = slides[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full h-[450px] sm:h-[520px] lg:h-[580px] overflow-hidden bg-black select-none border-b border-[#23252b]">
      {/* Background Backdrop Image with Gradients */}
      <div className="absolute inset-0">
        <img
          src={current.banner || current.poster}
          alt={current.title}
          onError={(e) => {
            if (current?.poster && e.currentTarget.src !== current.poster) {
              e.currentTarget.src = current.poster;
            }
          }}
          className="w-full h-full object-cover object-center filter brightness-[0.65] transition-all duration-700"
        />
        {/* Soft edge gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-[#0b0c0e]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c0e] via-[#0b0c0e]/70 to-transparent w-full md:w-3/4" />
      </div>

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-10 sm:pb-14 z-10">
        
        {/* Metadata & Genre Pills as shown in reference */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-gray-400">
            {current.type || 'TV Anime'} • {current.year || '1999'}
          </span>
          {current.genres?.map((genre) => (
            <span
              key={genre}
              className="px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 text-gray-300 font-medium text-[11px] backdrop-blur-sm"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-3 max-w-3xl drop-shadow-md">
          {current.title}
        </h1>

        {/* Spanish Synopsis from AnimeAV1 */}
        <p className="text-gray-300 text-xs sm:text-sm md:text-base max-w-3xl line-clamp-3 sm:line-clamp-4 mb-6 leading-relaxed font-normal">
          {current.synopsis}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* White "Ver Anime" button exactly as in reference */}
          <button
            onClick={() => onWatchEpisode(current, 1)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white hover:bg-gray-100 text-black font-extrabold text-sm transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Ver Anime</span>
          </button>

          <button
            onClick={() => onOpenDetails(current)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1e2029]/80 hover:bg-[#2b2e3b] text-white font-bold text-xs sm:text-sm border border-white/10 backdrop-blur-md transition-all hover:scale-105"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Detalles</span>
          </button>

          <button
            onClick={() => onToggleWatchlist(current)}
            className="p-2.5 rounded-lg bg-black/60 hover:bg-[#1e2029] text-gray-200 border border-white/10 backdrop-blur-md transition-colors"
            title="Guardar en mi lista"
          >
            <Bookmark className="w-4 h-4 hover:text-cyan-400" />
          </button>
        </div>

      </div>

      {/* Navigation Arrows on the right side as in reference */}
      <div className="hidden sm:flex absolute right-8 bottom-12 items-center gap-2 z-20">
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 backdrop-blur-sm transition-all hover:scale-110"
          title="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 backdrop-blur-sm transition-all hover:scale-110"
          title="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
