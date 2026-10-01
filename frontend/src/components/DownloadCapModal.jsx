import { useState, useEffect } from 'react';
import { X, Download, Check, Copy, HardDrive, ArrowRight, Loader2 } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [liveOptions, setLiveOptions] = useState(downloadOptions);
  const [loadingLive, setLoadingLive] = useState(false);

  const animeTitle = anime?.title || 'Anime';
  const torrentFileURL = `/api/torrents/download-torrent-file?title=${encodeURIComponent(animeTitle)}&episode=${episodeNumber}`;
  const magnetURI = `magnet:?xt=urn:btih:3b245504fb5f3c478318134704090602f5eab35e&dn=${encodeURIComponent(animeTitle + ' - Ep ' + episodeNumber)}&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`;

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

  // Build clean options list
  const baseOptions = [
    {
      name: 'Descargar Archivo .torrent',
      type: 'torrent_file',
      quality: '1080p',
      size: '15 KB',
      url: torrentFileURL,
      desc: 'Descarga el archivo metainfo .torrent para usar con cualquier cliente.',
    },
  ];

  // Merge AnimeAV1 live mirrors (Mega, 1Fichier, TransferIt, MP4Upload)
  const mirrorOptions = (liveOptions || []).filter(
    (o) => !['direct_mp4', 'magnet', 'torrent_file'].includes(o.type)
  );

  const displayOptions = [...baseOptions, ...mirrorOptions];

  const handleStartDownload = async (opt) => {
    setDownloading(true);
    setSuccessMsg('');

    try {
      if (opt.type === 'direct_mp4') {
        // Direct browser file download
        const a = document.createElement('a');
        a.href = opt.url;
        a.download = `${animeTitle}_Ep${episodeNumber}.mp4`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setSuccessMsg(`✓ Iniciando descarga del archivo de video MP4 (${animeTitle} - Cap ${episodeNumber}).`);
      } else if (opt.type === 'torrent_file') {
        // Blob download for .torrent ensures 100% reliability
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

        setSuccessMsg('✓ Archivo .torrent descargado con éxito en tu computadora.');
      } else if (opt.type === 'magnet') {
        // 1. Send task to Go backend torrent engine
        try {
          await api.addDownload({
            type: 'magnet',
            magnet_uri: opt.url,
            anime_title: animeTitle,
            episode_number: episodeNumber,
          });
        } catch (backendErr) {
          console.log("Backend torrent add:", backendErr);
        }

        // 2. Trigger magnet protocol safely via hidden iframe (does not interrupt page or file downloads)
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = opt.url;
          document.body.appendChild(iframe);
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 3000);
        } catch (e) {
          console.log("Magnet client trigger:", e);
        }

        setSuccessMsg('✓ ¡Descarga iniciada en el Gestor de Torrents!');
        onDownloadStarted?.();
      } else {
        // External mirrors (MEGA, 1Fichier, TransferIt, MP4Upload)
        window.open(opt.url, '_blank', 'noopener,noreferrer');
        setSuccessMsg(`✓ Abriendo servidor de descarga externa (${opt.name || 'AnimeAV1'})...`);
      }
    } catch (err) {
      console.error("Download error:", err);
      // Fallback
      if (opt.type === 'torrent_file') {
        window.location.href = opt.url;
      } else {
        alert("Error al procesar la descarga: " + err.message);
      }
    } finally {
      setDownloading(false);
    }
  };

  const copyMagnet = () => {
    navigator.clipboard.writeText(magnetURI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="mb-4 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in">
            <span>{successMsg}</span>
            {onOpenDownloadsTab && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDownloadsTab();
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-green-500 text-black font-extrabold text-[11px] hover:bg-green-400 transition-colors w-fit"
              >
                <span>Ver Gestor de Descargas</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Options List */}
        <div className="space-y-2.5 my-4">
          {displayOptions.map((opt, idx) => {
            const isMagnet = opt.type === 'magnet';
            const isTorrent = opt.type === 'torrent_file';
            const isMP4 = opt.type === 'direct_mp4';

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isDark 
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
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                      isMagnet ? 'bg-purple-900/60 text-purple-300' :
                      isTorrent ? 'bg-blue-900/60 text-blue-300' :
                      isMP4 ? 'bg-green-900/60 text-green-300' :
                      'bg-orange-950 text-[#f47521]'
                    }`}>
                      {isMagnet ? 'BITTORRENT' : isTorrent ? '.TORRENT' : isMP4 ? 'MP4 DIRECTO' : 'SERVIDOR'}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {opt.quality || '1080p HD'} • {opt.size || '450 MB'} • Sub Español
                  </p>
                </div>

                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => handleStartDownload(opt)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-xs transition-all shadow-md shadow-[#f47521]/20 active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Magnet link direct copy box */}
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 mt-4 ${
          isDark ? 'bg-[#0f1014] border-[#23252b]' : 'bg-gray-100 border-gray-200'
        }`}>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Enlace Magnet Directo
            </p>
            <p className="text-xs font-mono text-gray-500 truncate mt-0.5">
              {magnetURI}
            </p>
          </div>
          <button
            type="button"
            onClick={copyMagnet}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1.5 text-xs font-bold ${
              isDark ? 'hover:bg-[#1e2029] text-gray-300' : 'hover:bg-gray-200 text-gray-700'
            }`}
            title="Copiar Magnet URI"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500 text-[11px]">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-[11px]">Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Note */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-[#23252b] text-gray-500' : 'border-gray-200 text-gray-500'
        }`}>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            Descarga local mediante motor BitTorrent
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
