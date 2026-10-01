import { useState } from 'react';
import { X, Lock, User, Mail, Flame, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ onClose, onAuthSuccess, theme = 'dark' }) {
  const isDark = theme === 'dark';
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await api.login(username.trim(), password);
      } else {
        res = await api.register(username.trim(), email.trim() || `${username.trim()}@stream.local`, password);
      }
      setLoading(false);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Error en la autenticación');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className={`relative w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl transition-colors ${
          isDark ? 'bg-[#14151a] border-[#23252b] text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-[#1e2029]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#f47521] to-[#ff9e58] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#f47521]/20">
            <Flame className="w-6 h-6 text-black fill-black" />
          </div>
          <h2 className="text-2xl font-black">
            {isLogin ? 'Bienvenido a GoAnime' : 'Crea tu Cuenta'}
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {isLogin 
              ? 'Guarda tu historial, lista para el futuro y descargas' 
              : 'Regístrate para sincronizar tu progreso y favoritos'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className={`flex p-1 rounded-xl mb-6 border ${
          isDark ? 'bg-[#1e2029] border-[#282a36]' : 'bg-gray-100 border-gray-200'
        }`}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`w-1/2 py-2 rounded-lg text-xs font-bold transition-all ${
              isLogin ? 'bg-[#f47521] text-black shadow-md' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`w-1/2 py-2 rounded-lg text-xs font-bold transition-all ${
              !isLogin ? 'bg-[#f47521] text-black shadow-md' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/40 flex items-center gap-2 text-xs text-red-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Usuario</label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                type="text"
                required
                placeholder="Tu nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-[#f47521] ${
                  isDark ? 'bg-[#1e2029] border-[#2b2e3b] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Correo electrónico (opcional)</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3" />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-[#f47521] ${
                    isDark ? 'bg-[#1e2029] border-[#2b2e3b] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-[#f47521] ${
                  isDark ? 'bg-[#1e2029] border-[#2b2e3b] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f47521]/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isLogin ? 'Entrar a GoAnime' : 'Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
