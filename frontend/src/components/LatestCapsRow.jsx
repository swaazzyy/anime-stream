import { Play, Download } from 'lucide-react';

export default function LatestCapsRow({ caps = [], onWatchEpisode, onDownloadCap, theme = 'dark' }) {
  if (!caps || caps.length === 0) return null;
  const isDark = theme === 'dark';

  return (
    <section className={`py-6 border-b transition-colors ${
      isDark ? 'border-[#23252b]' : 'border-gray-200'
    }`}>
      {/* Header: "Últimos episodios" on the left, cyan "HOY" badge on the right (matches screenshot) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Últimos episodios
        </h2>

        {/* Cyan "HOY" Badge */}
        <span className="px-3.5 py-1 rounded bg-[#00c7ff] text-white font-black text-xs tracking-wider uppercase shadow-sm">
          HOY
        </span>
      </div>

      {/* 4-Columns Grid (Exact Match to Screenshot) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4.5">
        {caps.map((cap) => {
          const anime = { 
            id: cap.anime_id, 
            title: cap.anime_title, 
            poster: cap.poster,
            banner: cap.thumbnail || cap.poster
          };

          return (
            <div
              key={`${cap.anime_id}-${cap.episode_number}`}
              onClick={() => onWatchEpisode(anime, cap.episode_number)}
              className="group relative aspect-video w-full rounded-xl overflow-hidden bg-black cursor-pointer shadow-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 select-none border border-white/5"
            >
              {/* 16:9 Thumbnail Image */}
              <img
                src={cap.thumbnail || cap.poster}
                alt={cap.anime_title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                loading="lazy"
                onError={(e) => {
                  // Fallback to poster if screenshot is unavailable
                  if (cap.poster && e.target.src !== cap.poster) {
                    e.target.src = cap.poster;
                  }
                }}
              />

              {/* Dark Gradient Overlay for optimal readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />

              {/* Top-Right: Circular Play Watermark Icon (Exact match to screenshot) */}
              <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full border border-white/40 bg-black/35 backdrop-blur-xs flex items-center justify-center text-white/90 group-hover:scale-110 group-hover:bg-[#f47521] group-hover:border-[#f47521] group-hover:text-black transition-all shadow-md">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </div>

              {/* Top-Left: Direct Download Button (appears on hover or tap) */}
              <button
                type="button"
                title={`Descargar ${cap.anime_title} Ep ${cap.episode_number}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadCap(anime, cap.episode_number);
                }}
                className="absolute top-2.5 left-2.5 p-2 rounded-lg bg-black/60 hover:bg-[#f47521] hover:text-black text-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md border border-white/20 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Bottom Content: Orange Pill + Title (Exact match to screenshot) */}
              <div className="absolute bottom-2.5 left-3 right-3 pointer-events-none">
                {/* Orange Badge: "Episodio X" */}
                <div className="inline-block px-2.5 py-0.5 rounded bg-[#f47521] text-white font-black text-[11px] tracking-wide shadow-md">
                  Episodio {cap.episode_number}
                </div>

                {/* Anime Title: "{Anime} Episodio {X}" */}
                <h3 
                  title={`${cap.anime_title} Episodio ${cap.episode_number}`}
                  className="text-white font-extrabold text-xs sm:text-sm tracking-tight truncate drop-shadow-md mt-1"
                >
                  {cap.anime_title} {cap.anime_title.toLowerCase().includes('episodio') ? '' : `Episodio ${cap.episode_number}`}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
