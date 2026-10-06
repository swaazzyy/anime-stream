import { useState, useEffect } from 'react';
import {
  Download,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  HardDrive,
  Wifi,
  FileVideo,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function DownloadsView({ 
  onPlayLocalCap, 
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTorrents = async () => {
    try {
      const data = await api.getTorrents();
      setTasks(data || []);
    } catch (err) {
      console.error("Error loading torrents:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTorrents();
    const interval = setInterval(fetchTorrents, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTorrents();
  };

  const act = async (call) => {
    try {
      await call();
      fetchTorrents();
    } catch (err) {
      console.error("Download action failed:", err);
    }
  };

  const handleDelete = (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta descarga?")) {
      act(() => api.deleteTorrent(id, true));
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
            <span>Gestor de Descargas</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold">
              <Sparkles className="w-3 h-3" /> Formato .AV1
            </span>
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Descarga y visualización de episodios en formato AV1 (.av1) para ver sin conexión
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
              isDark 
                ? 'bg-[#14151a] border-[#23252b] hover:border-[#353846] text-gray-300 hover:text-white' 
                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700 shadow-sm'
            }`}
            title="Actualizar lista de descargas"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#f47521] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
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
            <p className="text-xs text-gray-400 font-semibold uppercase">Listos para Ver (.av1)</p>
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
            <p className="text-xs text-gray-400 font-semibold uppercase">Total Descargas (.av1)</p>
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
            Puedes iniciar la descarga de cualquier capítulo en formato AV1 (.av1) haciendo clic en el botón "Descargar Cap" en el reproductor o en la ficha del anime.
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        .AV1
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        isCompleted ? 'bg-green-500/20 text-green-500' :
                        isPaused ? 'bg-yellow-500/20 text-yellow-500' :
                        isError ? 'bg-red-500/20 text-red-500' :
                        'bg-[#f47521]/20 text-[#f47521]'
                      }`}>
                        {isCompleted ? 'COMPLETADO' : isPaused ? 'PAUSADO' : isError ? 'ERROR' : 'DESCARGANDO'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className={`w-full h-2.5 rounded-full overflow-hidden mt-2.5 ${
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
                      <span className="font-bold text-[#f47521]">
                        {task.progress ? task.progress.toFixed(1) : (isCompleted ? '100.0' : '0.0')}%
                      </span>
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
    </div>
  );
}
