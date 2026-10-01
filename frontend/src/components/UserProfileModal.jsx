import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  User, 
  Camera, 
  Lock, 
  Check, 
  Upload, 
  Link as LinkIcon, 
  Trash2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Loader2,
  Bookmark,
  Clock,
  Heart
} from 'lucide-react';
import { api } from '../services/api';

const PRESET_AVATARS = [
  { id: 'luffy', name: 'Luffy', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80' },
  { id: 'gojo', name: 'Gojo Satoru', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80' },
  { id: 'tanjiro', name: 'Tanjiro', url: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=200&auto=format&fit=crop&q=80' },
  { id: 'frieren', name: 'Frieren', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80' },
  { id: 'eren', name: 'Eren', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80' },
  { id: 'zoro', name: 'Zoro', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200&auto=format&fit=crop&q=80' },
  { id: 'jinwoo', name: 'Sung Jin-woo', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80' },
  { id: 'anya', name: 'Anya Forger', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=200&auto=format&fit=crop&q=80' },
];

export default function UserProfileModal({ 
  user, 
  onClose, 
  onUserUpdated, 
  theme = 'dark',
  stats = {}
}) {
  const isDark = theme === 'dark';
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'

  // Profile Form State
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status & Feedback
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // App doesn't track favorites, so count them here
  const [favoritesCount, setFavoritesCount] = useState(0);
  useEffect(() => {
    api.getFavorites().then((f) => setFavoritesCount(f?.length || 0)).catch(() => {});
  }, []);

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Compress & convert file to data URL
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    // Downscale to fit 256px and re-encode as JPEG (backend caps avatars at 512 KB)
    createImageBitmap(file).then((img) => {
      const scale = Math.min(1, 256 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      clearMessages();
    }).catch(() => setErrorMessage('No se pudo leer la imagen.'));
  };

  const handleApplyUrl = () => {
    if (avatarInputUrl.trim()) {
      setAvatar(avatarInputUrl.trim());
      setShowUrlInput(false);
      setAvatarInputUrl('');
      clearMessages();
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!username.trim()) {
      setErrorMessage('El nombre de usuario no puede estar vacío.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        username: username.trim(),
        avatar: avatar,
      });

      if (res.user) {
        onUserUpdated?.(res.user);
        setSuccessMessage('¡Perfil actualizado con éxito!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error al actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!currentPassword) {
      setErrorMessage('Ingresa tu contraseña actual.');
      return;
    }
    if (newPassword.length < 4) {
      setErrorMessage('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Las nuevas contraseñas no coinciden.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('¡Contraseña cambiada exitosamente!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

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
            <div className="w-9 h-9 rounded-xl bg-[#f47521]/15 text-[#f47521] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Personalizar Perfil</h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Ajustes de cuenta, foto de perfil y seguridad
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

        {/* Tab Navigation */}
        <div className={`flex border-b px-6 ${
          isDark ? 'border-[#23252b] bg-[#14151a]' : 'border-gray-200 bg-white'
        }`}>
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); clearMessages(); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#f47521] text-[#f47521]'
                : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Perfil & Avatar</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('password'); clearMessages(); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'border-[#f47521] text-[#f47521]'
                : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Cambiar Contraseña</span>
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Avatar Section */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Foto de Perfil
                </label>

                <div className="flex items-center gap-5 flex-wrap">
                  {/* Avatar Preview */}
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#f47521] shadow-lg shadow-[#f47521]/20 bg-[#1e2029] flex items-center justify-center">
                      {avatar ? (
                        <img 
                          src={avatar} 
                          alt="Avatar de usuario" 
                          className="w-full h-full object-cover"
                          onError={() => setAvatar('')}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#f47521] to-purple-600 flex items-center justify-center font-black text-2xl text-black">
                          {username ? username.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span>Cambiar</span>
                    </button>
                  </div>

                  {/* Actions for Avatar */}
                  <div className="flex-1 space-y-2 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-xs transition-colors shadow-sm cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir desde tu PC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                          isDark 
                            ? 'bg-[#1a1c24] border-[#2b2e3b] text-gray-300 hover:text-white hover:bg-[#23252b]' 
                            : 'bg-gray-100 border-gray-200 text-gray-700 hover:text-black hover:bg-gray-200'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Enlace URL</span>
                      </button>

                      {avatar && (
                        <button
                          type="button"
                          onClick={() => { setAvatar(''); clearMessages(); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs transition-colors cursor-pointer"
                          title="Quitar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar</span>
                        </button>
                      )}
                    </div>

                    <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Formatos soportados: JPG, PNG, WebP o GIF (máx. 5MB)
                    </p>
                  </div>
                </div>

                {/* Optional Custom Image URL input */}
                {showUrlInput && (
                  <div className="mt-3 flex gap-2 animate-fade-in">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/mi-avatar.jpg"
                      value={avatarInputUrl}
                      onChange={(e) => setAvatarInputUrl(e.target.value)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs focus:outline-none focus:border-[#f47521] ${
                        isDark ? 'bg-[#0f1014] border-[#23252b] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-4 py-2 rounded-xl bg-[#f47521] text-black font-extrabold text-xs hover:bg-[#ff8c3b] transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                )}

                {/* Preset Avatars Gallery */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#f47521]" />
                    <span>O elige un avatar de anime:</span>
                  </p>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_AVATARS.map((item) => {
                      const isSelected = avatar === item.url;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { setAvatar(item.url); clearMessages(); }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer group ${
                            isSelected 
                              ? 'border-[#f47521] ring-2 ring-[#f47521]/50 scale-105' 
                              : isDark ? 'border-[#23252b] hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'
                          }`}
                          title={item.name}
                        >
                          <img 
                            src={item.url} 
                            alt={item.name} 
                            className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#f47521]/40 flex items-center justify-center">
                              <Check className="w-4 h-4 text-black font-black" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#f47521] transition-colors ${
                      isDark ? 'bg-[#0f1014] border-[#23252b] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    placeholder="Tu nombre de usuario"
                  />
                  <User className="absolute right-3.5 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Este nombre será visible en tu perfil, comentarios y lista de animes.
                </p>
              </div>

              {/* Email (Read Only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || 'usuario@anime.com'}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold opacity-60 cursor-not-allowed ${
                    isDark ? 'bg-[#0a0b0d] border-[#23252b] text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'
                  }`}
                />
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f47521]/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSavePassword} className="space-y-4">
              
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#f47521] pr-10 ${
                      isDark ? 'bg-[#0f1014] border-[#23252b] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#f47521] pr-10 ${
                      isDark ? 'bg-[#0f1014] border-[#23252b] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    placeholder="Al menos 4 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#f47521] ${
                    isDark ? 'bg-[#0f1014] border-[#23252b] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  placeholder="Repite la nueva contraseña"
                />
              </div>

              {/* Save Password Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-sm transition-all shadow-lg shadow-[#f47521]/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Cambiar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* User Activity Stats Badge */}
          <div className={`p-4 rounded-xl border flex items-center justify-around gap-4 ${
            isDark ? 'bg-[#0d0e12] border-[#23252b]' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-center">
              <span className="text-lg font-black text-[#f47521]">
                {stats.watchlistCount ?? 0}
              </span>
              <p className={`text-[11px] font-semibold flex items-center gap-1 justify-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <Bookmark className="w-3 h-3 text-[#f47521]" />
                <span>En Mi Lista</span>
              </p>
            </div>

            <div className="h-8 w-px bg-gray-700/30" />

            <div className="text-center">
              <span className="text-lg font-black text-purple-400">
                {stats.continueCount ?? 0}
              </span>
              <p className={`text-[11px] font-semibold flex items-center gap-1 justify-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <Clock className="w-3 h-3 text-purple-400" />
                <span>Siguiendo Viendo</span>
              </p>
            </div>

            <div className="h-8 w-px bg-gray-700/30" />

            <div className="text-center">
              <span className="text-lg font-black text-red-400">
                {favoritesCount}
              </span>
              <p className={`text-[11px] font-semibold flex items-center gap-1 justify-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <Heart className="w-3 h-3 text-red-400" />
                <span>Favoritos</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
