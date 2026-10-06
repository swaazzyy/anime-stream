import { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../services/api';

// Download links are the episode's file-host mirrors listed by AnimeAV1 (Mega, 1Fichier, MP4Upload...).
export default function DownloadCapModal({
  anime,
  episodeNumber = 1,
  downloadOptions = [],
  onClose,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const [options, setOptions] = useState(downloadOptions);
  const [loading, setLoading] = useState(false);

  const animeTitle = anime?.title || 'Anime';

  // Fetch the episode's live mirrors unless the caller already has them
  useEffect(() => {
    if (downloadOptions.length > 0 || !anime?.id) {
      setOptions(downloadOptions);
      return;
    }
    let active = true;
    setLoading(true);
    api.getEpisode(anime.id, episodeNumber)
      .then((ep) => { if (active) setOptions(ep?.downloads || []); })
      .catch((err) => console.log("Live episode options load:", err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [anime?.id, episodeNumber, downloadOptions]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
        isDark ? 'bg-[#14151a] border-[#23252b] text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-[#1e2029]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-[#f47521]/15 text-[#f47521]">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>Descargar Episodio {episodeNumber}</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[#f47521]" />}
            </h3>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {animeTitle}
            </p>
          </div>
        </div>

        {/* Mirror Links */}
        <div className="space-y-3 my-4">
          {!loading && options.length === 0 && (
            <p className={`text-sm text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              AnimeAV1 no ofrece enlaces de descarga para este episodio.
            </p>
          )}
          {options.map((opt) => (
            <div
              key={opt.url}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isDark
                  ? 'bg-[#1a1c24] border-[#2b2e3b] hover:border-[#f47521]/50'
                  : 'bg-gray-50 border-gray-200 hover:border-[#f47521]/50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold text-xs sm:text-sm truncate ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {opt.name}
                </h4>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {opt.audio}
                </p>
              </div>

              <a
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-extrabold text-xs transition-all shadow-md active:scale-95 bg-[#f47521] hover:bg-[#ff8c3b] text-black"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir</span>
              </a>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-[#23252b] text-gray-500' : 'border-gray-200 text-gray-500'
        }`}>
          <span>Cada enlace abre el servidor externo en una pestaña nueva.</span>
          <button
            onClick={onClose}
            className={`font-semibold hover:underline ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
