import { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Lock, 
  Globe, 
  Server, 
  Copy, 
  Check, 
  Terminal,
  ExternalLink,
  Zap
} from 'lucide-react';
import { api } from '../services/api';

export default function GluetunModal({ onClose, theme = 'dark' }) {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [vpnData, setVpnData] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getVpnStatus();
      setVpnData(data);
    } catch (err) {
      console.error("Error fetching VPN status:", err);
      setVpnData({ connected: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const composeSnippet = `services:
  gluetun:
    image: qmcgaw/gluetun:v3
    container_name: gluetun
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    ports:
      - 8080:8080 # GoAnime Web UI (la API 8000 queda privada)
    environment:
      - VPN_SERVICE_PROVIDER=mullvad # protonvpn, nordvpn, surfshark, custom, etc.
      - VPN_TYPE=wireguard
      - WIREGUARD_PRIVATE_KEY=tu_clave_privada
      - WIREGUARD_ADDRESSES=10.64.0.1/32
      - SERVER_COUNTRIES=Switzerland
      - HTTP_CONTROL_SERVER_AUTH_DEFAULT_ROLE={"auth":"apikey","apikey":"cambia_esta_clave"}
    restart: unless-stopped

  anime-stream:
    build: . # Dockerfile del repositorio (junto a los binarios anime-stream-linux-*)
    container_name: anime-stream
    network_mode: "service:gluetun" # Todo el tráfico forzado por VPN
    depends_on:
      gluetun:
        condition: service_healthy
    environment:
      - GLUETUN_API_KEY=cambia_esta_clave # la misma clave de arriba
    volumes:
      - ./downloads:/app/downloads
      - ./data:/app/data
    restart: unless-stopped`;

  const copySnippet = () => {
    navigator.clipboard.writeText(composeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isProtected = vpnData?.connected;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh] ${
        isDark ? 'bg-[#14151a] border-[#23252b] text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#23252b] bg-[#101116]' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
              isProtected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              {isProtected ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Protección Gluetun VPN
                </h2>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isProtected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {isProtected ? 'Conectado' : 'Sin VPN'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Túnel VPN seguro y Kill Switch para BitTorrent y Streaming
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-[#1e2029]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Status Hero Card */}
          <div className={`p-4 rounded-xl border relative overflow-hidden ${
            isProtected 
              ? 'bg-gradient-to-r from-emerald-950/40 via-[#14151a] to-emerald-950/20 border-emerald-500/30' 
              : 'bg-gradient-to-r from-amber-950/40 via-[#14151a] to-amber-950/20 border-amber-500/30'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Estado del Túnel
                </p>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span>{isProtected ? 'Tráfico 100% Cifrado y Protegido' : 'Gluetun no está conectado'}</span>
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {isProtected 
                    ? 'Todo el tráfico BitTorrent y conexiones HTTP pasan a través del túnel VPN de Gluetun con Killswitch activo.'
                    : 'Las descargas se ejecutan con tu IP pública directa. Para ocultar tu IP con Mullvad, ProtonVPN u otro, inicia el contenedor de Gluetun.'}
                </p>
                {vpnData?.error && <p className="text-xs font-semibold text-amber-300 break-words">{vpnData.error}</p>}
              </div>

              <button
                type="button"
                onClick={fetchStatus}
                disabled={loading}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
                  isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900'
                }`}
                title="Actualizar estado"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#f47521]' : ''}`} />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/10 text-xs">
              <div>
                <span className="text-gray-400 text-[11px] block">IP Pública</span>
                <span className="font-mono font-bold text-white truncate block">
                  {vpnData?.public_ip || '---'}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">País / Región</span>
                <span className="font-bold text-white truncate block flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#f47521]" />
                  <span>{vpnData?.country || 'Local'} {vpnData?.city ? `(${vpnData.city})` : ''}</span>
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Protocolo</span>
                <span className="font-bold text-white truncate block flex items-center gap-1">
                  <Lock className="w-3 h-3 text-purple-400" />
                  <span>{vpnData?.service || 'Ninguno'}</span>
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[11px] block">Proveedor</span>
                <span className="font-bold text-white truncate block flex items-center gap-1">
                  <Server className="w-3 h-3 text-emerald-400" />
                  <span>{vpnData?.provider || 'Sin VPN'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Setup Guide */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#f47521]" />
                <span>Despliegue con Docker Compose (Gluetun + GoAnime)</span>
              </h4>
              <button
                type="button"
                onClick={copySnippet}
                className="text-xs font-bold text-[#f47521] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar compose'}</span>
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0d0e12] p-3 text-[11px] font-mono text-gray-300">
              <pre className="overflow-x-auto leading-relaxed selection:bg-[#f47521] selection:text-black">
                {composeSnippet}
              </pre>
            </div>
          </div>

          {/* Key Advantages */}
          <div className="space-y-2 text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Ventajas de la Integración con Gluetun
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#181920] border-[#252834]' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 font-bold mb-1 text-emerald-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Kill Switch Automático</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Si el túnel VPN cae por cualquier motivo, Gluetun bloquea todo el tráfico al instante evitando cualquier fuga de tu IP real.
                </p>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#181920] border-[#252834]' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 font-bold mb-1 text-[#f47521]">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Compatibilidad Multi-VPN</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Soporta Mullvad, ProtonVPN, NordVPN, Surfshark, PIA, Windscribe, Cyberghost, AirVPN y cualquier archivo WireGuard/OpenVPN personalizado.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-[#23252b] bg-[#101116] text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'
        }`}>
          <a
            href="https://github.com/qdm12/gluetun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#f47521] transition-colors"
          >
            <span>Documentación oficial de Gluetun</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
