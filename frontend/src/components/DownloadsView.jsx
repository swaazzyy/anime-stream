import { useState, useEffect } from 'react';
import {
  Download,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  HardDrive,
  Plus,
  Wifi,
  FileVideo,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

export default function DownloadsView({ 
  onPlayLocalCap, 
  theme = 'dark',
  onOpenVpnModal,
  vpnStatus
}) {
  const isDark = theme === 'dark';
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [magnetInput, setMagnetInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addEpisode, setAddEpisode] = useState(1);

  const fetchTorrents = async () => {
    try {
      const data = await api.getTorrents();
      setTasks(data || []);
    } catch (err) {
      console.error("Error loading torrents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTorrents();
    const interval = setInterval(fetchTorrents, 2000);
    return () => clearInterval(interval);
  }, []);

  const act = async (call) => {
    try {
      await call();
      fetchTorrents();
    } catch (err) {
      console.error("Download action failed:", err);
    }
  };

  const handleDelete = (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta descarga?")) act(() => api.deleteTorrent(id, true));
  };

  const handleAddCustomMagnet = async (e) => {
    e.preventDefault();
    if (!magnetInput.trim()) return;

    try {
      await api.addDownload({
        type: 'magnet',
        magnet_uri: magnetInput.trim(),
        anime_title: addTitle.trim() || 'GoAnime Torrent',
        episode_number: parseInt(addEpisode) || 1,
      });
      setMagnetInput('');
      setAddTitle('');
      setShowAddModal(false);
      fetchTorrents();
    } catch (err) {
      alert("Error al añadir magnet: " + err.message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const activeDownloads = tasks.filter(t => t.status === 'downloading');
  const completedDownloads = tasks.filter(t => t.status === 'completed');

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in transition-colors ${
      isDark ? 'text-white' : 'text-gray-900'
    }`}>
      {/* Header and Controls */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b ${
        isDark ? 'border-[#23252b]' : 'border-gray-200'
      }`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black flex items-center gap-3 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            <Download className="w-7 h-7 text-[#f47521]" />
            <span>Gestor de Descargas & Torrents</span>
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Descarga y gestiona episodios completos de GoAnime para ver sin conexión
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-sm transition-all shadow-md shadow-[#f47521]/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Magnet</span>
          </button>
        </div>
      </div>

      {/* Gluetun VPN Protection Alert Banner */}
      <div 
        onClick={onOpenVpnModal}
        className={`my-4 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
          vpnStatus?.connected 
            ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400' 
            : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${vpnStatus?.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {vpnStatus?.connected ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wide">
                {vpnStatus?.connected ? 'Túnel BitTorrent Protegido por Gluetun' : 'Tráfico BitTorrent sin protección VPN'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                vpnStatus?.connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {vpnStatus?.connected ? 'Killswitch Activo' : 'IP Expuesta'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {vpnStatus?.connected 
                ? `IP pública protegida: ${vpnStatus?.public_ip || '---'} (${vpnStatus?.country || 'VPN'}, ${vpnStatus?.city || ''}) • Proveedor: ${vpnStatus?.provider || 'Gluetun'}`
                : 'Conecta un contenedor Gluetun en Docker con tu proveedor VPN para descargar con anonimato total.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenVpnModal?.(); }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            vpnStatus?.connected ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-amber-500 text-black hover:bg-amber-400'
          }`}
        >
          {vpnStatus?.connected ? 'Ver Detalles VPN' : 'Configurar Gluetun'}
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="p-3 rounded-lg bg-[#f47521]/10 text-[#f47521]">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Descargas Activas</p>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeDownloads.length}</h3>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Capítulos Listos</p>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{completedDownloads.length}</h3>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Total Descargas</p>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{tasks.length}</h3>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {loading && tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-[#f47521] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando descargas...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border p-8 ${
          isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <Download className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className={`text-lg font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>No hay descargas activas ni guardadas</h3>
          <p className={`text-sm mt-1 max-w-md mx-auto ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Puedes descargar cualquier capítulo haciendo clic en el botón "Descargar Cap" en el reproductor o desde la lista de episodios de GoAnime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isPaused = task.status === 'paused';
            const isError = task.status === 'error';

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDark ? 'bg-[#14151a] border-[#23252b] hover:border-[#353846]' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                {/* Left: Icon and Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-grow">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${
                    isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-[#f47521]/10 text-[#f47521]'
                  }`}>
                    <FileVideo className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-bold text-sm sm:text-base truncate ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {task.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        isCompleted ? 'bg-green-500/20 text-green-500' :
                        isPaused ? 'bg-yellow-500/20 text-yellow-600' :
                        isError ? 'bg-red-500/20 text-red-500' :
                        'bg-[#f47521]/20 text-[#f47521]'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className={`w-full h-2 rounded-full overflow-hidden mt-2.5 ${
                      isDark ? 'bg-[#23252b]' : 'bg-gray-200'
                    }`}>
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted ? 'bg-green-500' : 'bg-[#f47521]'
                        }`}
                        style={{ width: `${task.progress || (isCompleted ? 100 : 0)}%` }}
                      />
                    </div>

                    {/* Speed and Size info */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1.5 flex-wrap">
                      <span>{task.progress ? task.progress.toFixed(1) : 0}%</span>
                      <span>{formatBytes(task.downloaded_bytes)} / {formatBytes(task.size_bytes)}</span>
                      {!isCompleted && !isPaused && task.download_speed && (
                        <span className="text-[#f47521] font-semibold flex items-center gap-1">
                          <Wifi className="w-3 h-3" />
                          {task.download_speed}
                        </span>
                      )}
                      {task.peers > 0 && <span>Peers: {task.peers}</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Play Downloaded Episode button */}
                  {isCompleted && (
                    <button
                      onClick={() => onPlayLocalCap(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs transition-colors shadow-md shadow-green-500/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Reproducir Cap Local</span>
                    </button>
                  )}

                  {!isCompleted && !isError && (
                    <button
                      onClick={() => act(() => isPaused ? api.resumeTorrent(task.id) : api.pauseTorrent(task.id))}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'bg-[#1e2029] hover:bg-[#282a36] text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                      title={isPaused ? "Reanudar" : "Pausar"}
                    >
                      {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(task.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'bg-[#1e2029] hover:bg-red-900/60 text-gray-400 hover:text-red-400' : 'bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600'
                    }`}
                    title="Eliminar descarga"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Magnet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
            isDark ? 'bg-[#14151a] border-[#23252b] text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <h3 className="text-lg font-black mb-1">Añadir Magnet de Torrent</h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Pega cualquier enlace magnet para iniciar la descarga del capítulo.
            </p>

            <form onSubmit={handleAddCustomMagnet} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Título del Anime
                </label>
                <input
                  type="text"
                  placeholder="ej. Solo Leveling"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-[#f47521] ${
                    isDark ? 'bg-[#1e2029] border-[#2b2e3b] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Número de Episodio
                </label>
                <input
                  type="number"
                  min={1}
                  value={addEpisode}
                  onChange={(e) => setAddEpisode(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-[#f47521] ${
                    isDark ? 'bg-[#1e2029] border-[#2b2e3b] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Magnet URI
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="magnet:?xt=urn:btih:..."
                  value={magnetInput}
                  onChange={(e) => setMagnetInput(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none focus:border-[#f47521] ${
                    isDark ? 'bg-[#1e2029] border-[#2b2e3b] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold ${
                    isDark ? 'bg-[#1e2029] text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-xs shadow-md shadow-[#f47521]/20"
                >
                  Iniciar Descarga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
