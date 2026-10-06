import { useState, useEffect } from 'react';
import { X, Download, HardDrive, ArrowRight, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function DownloadCapModal({ 
  anime, 
  episodeNumber = 1, 
  downloadOptions = [], 
  onClose, 
  onDownloadStarted, 
  onOpenDownloadsTab,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const [downloading, setDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [liveOptions, setLiveOptions] = useState(downloadOptions);
  const [loadingLive, setLoadingLive] = useState(false);

  const animeTitle = anime?.title || 'Anime';
  const torrentFileURL = `/api/torrents/download-torrent-file?title=${encodeURIComponent(animeTitle)}&episode=${episodeNumber}`;
  const magnetURI = `magnet:?xt=urn:btih:3b245504fb5f3c478318134704090602f5eab35e&dn=${encodeURIComponent(animeTitle + ' - Ep ' + episodeNumber + ' [AV1 1080p]')}&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`;

  // Fetch live episode options if not provided
  useEffect(() => {
    if (!downloadOptions || downloadOptions.length === 0) {
      if (anime?.id) {
        setLoadingLive(true);
        api.getEpisode(anime.id, episodeNumber)
          .then((ep) => {
            if (ep?.downloads && ep.downloads.length > 0) {
              setLiveOptions(ep.downloads);
            }
          })
          .catch((err) => console.log("Live episode options load:", err))
          .finally(() => setLoadingLive(false));
      }
    } else {
      setLiveOptions(downloadOptions);
    }
  }, [anime?.id, episodeNumber, downloadOptions]);

  // Clean, prioritized options list with AV1 video format as principal
  const baseOptions = [
    {
      name: 'Descargar Video en Formato AV1 (.av1)',
      type: 'av1_video',
      quality: '1080p AV1',
      size: '420 MB',
      isPrimary: true,
      desc: 'Descarga con seguimiento en vivo de progreso, velocidad y reproducción offline.',
    },
    {
      name: 'Descargar Archivo .torrent (.av1)',
      type: 'torrent_file',
      quality: '1080p AV1',
      size: '15 KB',
      url: torrentFileURL,
      desc: 'Archivo metainfo .torrent para clientes externos.',
    },
  ];

  // Merge AnimeAV1 live mirrors (Mega, 1Fichier, TransferIt, MP4Upload)
  const mirrorOptions = (liveOptions || []).filter(
    (o) => !['direct_mp4', 'magnet', 'torrent_file', 'av1_video'].includes(o.type)
  );

  const displayOptions = [...baseOptions, ...mirrorOptions];

  const handleStartDownload = async (opt) => {
    setDownloading(true);
    setSuccessMsg('');

    try {
      if (opt.type === 'av1_video' || opt.type === 'magnet') {
        // Send task to Go backend download engine
        await api.addDownload({
          type: 'magnet',
          magnet_uri: magnetURI,
          anime_title: animeTitle,
          episode_number: episodeNumber,
        });

        setSuccessMsg(`✓ Descarga de ${animeTitle} - Cap ${episodeNumber} en formato .av1 iniciada.`);
        onDownloadStarted?.();

        // Automatically guide user to the Downloads page to observe the progress
        if (onOpenDownloadsTab) {
          setTimeout(() => {
            onClose();
            onOpenDownloadsTab();
          }, 900);
        }
      } else if (opt.type === 'torrent_file') {
        // Download .torrent file
        const res = await fetch(opt.url);
        if (!res.ok) throw new Error("Error al obtener archivo .torrent");
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${animeTitle}_Ep${episodeNumber}.torrent`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        setSuccessMsg('✓ Archivo .torrent guardado con éxito.');
      } else {
        // External mirrors (MEGA, 1Fichier, etc.)
        window.open(opt.url, '_blank', 'noopener,noreferrer');
        setSuccessMsg(`✓ Abriendo servidor externo (${opt.name || 'AnimeAV1'})...`);
      }
    } catch (err) {
      console.error("Download error:", err);
      if (opt.type === 'torrent_file') {
        window.location.href = opt.url;
      } else {
        alert("Error al procesar la descarga: " + err.message);
      }
    } finally {
      setDownloading(false);
    }
  };

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
              {loadingLive && <Loader2 className="w-4 h-4 animate-spin text-[#f47521]" />}
            </h3>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {animeTitle}
            </p>
          </div>
        </div>

        {/* Success Alert Banner with link to Gestor */}
        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              {successMsg}
            </span>
            {onOpenDownloadsTab && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDownloadsTab();
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-green-500 text-black font-extrabold text-[11px] hover:bg-green-400 transition-colors w-fit flex-shrink-0"
              >
                <span>Ver Progreso</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Options List */}
        <div className="space-y-3 my-4">
          {displayOptions.map((opt, idx) => {
            const isPrimary = opt.isPrimary;
            const isTorrent = opt.type === 'torrent_file';

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isPrimary
                    ? isDark 
                      ? 'bg-gradient-to-r from-purple-950/40 to-[#1a1c24] border-purple-500/40 shadow-md' 
                      : 'bg-purple-50 border-purple-300 shadow-sm'
                    : isDark 
                      ? 'bg-[#1a1c24] border-[#2b2e3b] hover:border-[#f47521]/50' 
                      : 'bg-gray-50 border-gray-200 hover:border-[#f47521]/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-bold text-xs sm:text-sm truncate ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {opt.name}
                    </h4>
                    {isPrimary ? (
                      <span className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase bg-purple-500 text-black flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-2.5 h-2.5" /> FORMATO .AV1
                      </span>
                    ) : (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                        isTorrent ? 'bg-blue-900/60 text-blue-300' : 'bg-orange-950 text-[#f47521]'
                      }`}>
                        {isTorrent ? '.TORRENT' : 'SERVIDOR'}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {opt.quality || '1080p HD'} • {opt.size || '420 MB'} • Sub Español
                  </p>
                  {opt.desc && (
                    <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {opt.desc}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => handleStartDownload(opt)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-extrabold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                    isPrimary 
                      ? 'bg-[#f47521] hover:bg-[#ff8c3b] text-black shadow-[#f47521]/30' 
                      : isDark
                        ? 'bg-[#282a36] hover:bg-[#353846] text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-[#23252b] text-gray-500' : 'border-gray-200 text-gray-500'
        }`}>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            Descarga local en formato .av1 de alta compresión y calidad
          </span>
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
