import { useState } from 'react';
import {
  Search,
  Bookmark,
  Clock,
  User as UserIcon,
  LogOut,
  SlidersHorizontal,
  X,
  Sun,
  Moon,
  Flame
} from 'lucide-react';

// Values are animeav1.com /catalogo query params, passed through by the backend search.
const FILTERS = [
  { key: 'category', label: 'Tipo', options: [['tv-anime', 'TV Anime'], ['pelicula', 'Película'], ['ova', 'OVA'], ['especial', 'Especial'], ['ona', 'ONA']] },
  { key: 'genre', label: 'Género', options: [
    ['accion', 'Acción'], ['aventura', 'Aventura'], ['ciencia-ficcion', 'Ciencia Ficción'], ['comedia', 'Comedia'], ['deportes', 'Deportes'],
    ['drama', 'Drama'], ['fantasia', 'Fantasía'], ['misterio', 'Misterio'], ['recuentos-de-la-vida', 'Recuentos de la Vida'], ['romance', 'Romance'],
    ['seinen', 'Seinen'], ['shoujo', 'Shoujo'], ['shounen', 'Shounen'], ['sobrenatural', 'Sobrenatural'], ['suspenso', 'Suspenso'],
    ['terror', 'Terror'], ['artes-marciales', 'Artes Marciales'], ['escolares', 'Escolares'], ['historico', 'Histórico'], ['isekai', 'Isekai'],
    ['mecha', 'Mecha'], ['musica', 'Música'], ['psicologico', 'Psicológico'], ['superpoderes', 'Superpoderes'], ['vampiros', 'Vampiros'],
  ] },
  { key: 'status', label: 'Estado', options: [['emision', 'En Emisión'], ['finalizado', 'Finalizado'], ['proximamente', 'Próximamente']] },
  { key: 'order', label: 'Orden', options: [['popular', 'Populares'], ['score', 'Mejor calificados'], ['latest_added', 'Recién añadidos'], ['latest_released', 'Últimos estrenos'], ['title', 'A-Z']] },
];

export default function Navbar({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
  onSearch,
  user,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  continueWatchingCount = 0,
  theme = 'dark',
  onToggleTheme,
  onGoHome,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const activeCount = Object.keys(activeFilters).length;
  const isDark = theme === 'dark';

  const tabs = [
    { id: 'home', label: 'Inicio', short: 'Inicio' },
    { id: 'continue', label: 'Siguiendo Viendo', short: 'Viendo', Icon: Clock, count: continueWatchingCount },
    { id: 'watchlist', label: 'Mi Lista', short: 'Lista', Icon: Bookmark },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowFilters(false);
    if (activeCount > 0) {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      Object.entries(activeFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      window.open(`/browse?${params.toString()}`, '_blank');
      return;
    }
    onSearch(searchQuery, {});
  };

  const clearFilters = () => {
    setFilters({});
    setShowFilters(false);
    onSearch(searchQuery, {});
  };

  return (
    <header className={`sticky top-0 z-40 w-full backdrop-blur-md border-b transition-colors duration-200 ${
      isDark ? 'bg-[#0b0c0e]/95 border-[#23252b] text-white' : 'bg-white/95 border-gray-200 text-gray-900 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Brand and Links */}
        <div className="flex items-center gap-6 lg:gap-8">
          {/* GoAnime Brand */}
          <button
            type="button"
            onClick={onGoHome || (() => setCurrentTab('home'))}
            className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer"
            title="Ir al Inicio de GoAnime"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f47521] to-[#ff9e58] flex items-center justify-center shadow-md shadow-[#f47521]/30 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-black fill-black" />
            </div>
            <div className="flex items-center">
              <span className="font-black text-2xl tracking-tight">
                Go<span className="text-[#f47521]">Anime</span>
              </span>
            </div>
          </button>

          {/* Crunchyroll-style main category tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(({ id, label, Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'home' && onGoHome) {
                    onGoHome();
                  } else {
                    setCurrentTab(id);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  currentTab === id
                    ? isDark 
                      ? 'text-white bg-[#1e2029] border border-[#f47521]/40' 
                      : 'text-[#f47521] bg-orange-50 border border-orange-200 shadow-xs'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-[#14151a]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-[#f47521]" />}
                <span>{label}</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#f47521] text-black">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Area: Search, Theme Toggle, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Search bar with Filtros button */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className={`flex items-center rounded-full border transition-all duration-200 px-3 py-1.5 w-44 sm:w-60 md:w-72 shadow-inner ${
              isDark 
                ? 'bg-[#14151a] border-[#23252b] focus-within:border-[#f47521]/60' 
                : 'bg-gray-100 border-gray-200 focus-within:border-[#f47521]/60'
            }`}>
              <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar en GoAnime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent text-xs sm:text-sm focus:outline-none placeholder-gray-400 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                  showFilters
                    ? 'bg-[#f47521] text-black'
                    : isDark 
                      ? 'bg-[#23252b] hover:bg-[#2e313b] text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title="Filtros"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="hidden sm:inline">Filtros</span>
                {activeCount > 0 && <span className="text-[10px] bg-black/80 text-[#f47521] rounded-full px-1.5">{activeCount}</span>}
              </button>
            </div>

            {showFilters && (
              <div className={`absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border p-4 shadow-2xl space-y-3 ${
                isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200'
              }`}>
                {FILTERS.map(({ key, label, options }) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-xs font-bold">
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{label}</span>
                    <select
                      value={filters[key] || ''}
                      onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                      className={`w-40 rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:border-[#f47521] ${
                        isDark ? 'bg-[#0b0c0e] border-[#23252b] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Todos</option>
                      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </select>
                  </label>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={clearFilters} className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                    isDark ? 'bg-[#23252b] hover:bg-[#2e313b] text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}>
                    Limpiar
                  </button>
                  <button type="submit" className="flex-1 py-2 rounded-lg text-xs font-extrabold bg-[#f47521] hover:bg-[#ff8c3b] text-black">
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2 rounded-full border transition-all duration-200 ${
              isDark 
                ? 'bg-[#14151a] border-[#23252b] text-yellow-400 hover:bg-[#1e2029] hover:border-yellow-400/40' 
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            }`}
            title={isDark ? "Cambiar a Modo Claro (Light)" : "Cambiar a Modo Oscuro (Dark)"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-purple-600" />}
          </button>

          {/* User Auth Profile */}
          {user ? (
            <div className={`flex items-center gap-2 pl-2 border-l ${isDark ? 'border-[#23252b]' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={onOpenProfile}
                title="Personalizar perfil (foto, nombre, contraseña)"
                className={`flex items-center gap-2 py-1 px-1.5 rounded-xl transition-all hover:bg-white/10 cursor-pointer ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#f47521] shadow-md flex-shrink-0 bg-[#1e2029] flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f47521] to-purple-600 flex items-center justify-center font-bold text-black text-xs">
                      {user.username ? user.username.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <span className={`hidden sm:inline text-xs font-bold truncate max-w-[100px] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {user.username}
                </span>
              </button>

              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:text-red-400 hover:bg-[#1e2029]' : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f47521] hover:bg-[#ff8c3b] text-black font-extrabold text-xs transition-colors shadow-md shadow-[#f47521]/20"
            >
              <UserIcon className="w-3.5 h-3.5 text-black" />
              <span>Acceder</span>
            </button>
          )}

        </div>

      </div>

      {/* Mobile nav subbar */}
      <div className={`md:hidden flex items-center justify-around border-t py-2 px-2 transition-colors ${
        isDark ? 'border-[#23252b] bg-[#14151a]' : 'border-gray-200 bg-white'
      }`}>
        {tabs.map(({ id, short, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === 'home' && onGoHome) {
                onGoHome();
              } else {
                setCurrentTab(id);
              }
            }}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${
              currentTab === id 
                ? 'text-[#f47521] font-bold' 
                : isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <span>{short}</span>
            {count > 0 && <span className="text-[10px] bg-[#f47521] text-black rounded-full px-1">{count}</span>}
          </button>
        ))}
      </div>
    </header>
  );
}
