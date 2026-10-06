import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import ContinueWatchingRow from './components/ContinueWatchingRow';
import AnimeRow from './components/AnimeRow';
import LatestCapsRow from './components/LatestCapsRow';
import AnimeCard from './components/AnimeCard';
import AnimeDetailPage from './pages/AnimeDetailPage';
import WatchPage from './pages/WatchPage';
import DownloadCapModal from './components/DownloadCapModal';
import DownloadsView from './components/DownloadsView';
import MyListView from './components/MyListView';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import { api } from './services/api';
import { Flame, Search, Clock, Play, X } from 'lucide-react';

const HOME_ROWS = [
  { key: 'trending', title: 'Tendencias de la Temporada', subtitle: 'Los animes más vistos y seguidos actualmente' },
  { key: 'top_rated', title: 'Mejor Calificados por la Comunidad', subtitle: 'Obras maestras aclamadas por la crítica' },
  { key: 'popular', title: 'Populares en GoAnime', subtitle: 'Acción, fantasía y aventura con múltiples servidores' },
];

function parseCurrentRoute() {
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  const parts = trimmed ? trimmed.split('/') : [];

  if (parts[0] === 'browse' || parts[0] === 'buscar' || parts[0] === 'catalogo' || searchParams.has('genre') || searchParams.has('category') || searchParams.has('status') || searchParams.has('order')) {
    const filters = {};
    ['category', 'genre', 'status', 'order'].forEach(k => {
      const val = searchParams.get(k);
      if (val) filters[k] = val;
    });
    const q = searchParams.get('q') || searchParams.get('search') || '';
    return { page: 'browse', query: q, filters };
  }

  if (parts.length === 0 || parts[0] === 'home') {
    return { page: 'home', tab: 'home' };
  }
  if (parts[0] === 'continue' || parts[0] === 'watchlist' || parts[0] === 'downloads') {
    return { page: 'home', tab: parts[0] };
  }
  if ((parts[0] === 'media' || parts[0] === 'anime') && parts[1]) {
    const slug = parts[1];
    if (parts[2]) {
      const ep = parseInt(parts[2], 10);
      return { page: 'watch', slug, episodeNum: isNaN(ep) ? 1 : ep };
    }
    return { page: 'anime', slug };
  }
  return { page: 'home', tab: 'home' };
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('goanime_theme') || 'dark';
  });

  const [route, setRoute] = useState(parseCurrentRoute);
  const [resumeProgress, setResumeProgress] = useState(0);

  const [catalog, setCatalog] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [watchlistMap, setWatchlistMap] = useState({});
  const [user, setUser] = useState(api.getCurrentUser());
  const [activeDownloadsCount, setActiveDownloadsCount] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Modals for actions
  const [downloadModalData, setDownloadModalData] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Sync theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme !== 'light');
    localStorage.setItem('goanime_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Browser navigation history support (Back / Forward)
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
      setSearchResults(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (url, options = {}) => {
    if (options.progress !== undefined) {
      setResumeProgress(options.progress);
    } else {
      setResumeProgress(0);
    }
    window.history.pushState({}, '', url);
    setRoute(parseCurrentRoute());
    setSearchResults(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadAllData = () => {
    loadCatalog();
    loadContinueWatching();
    loadWatchlist();
    loadTorrentsCount();
  };

  const loadCatalog = async () => {
    try {
      const data = await api.getCatalog();
      if (data) setCatalog(data);
    } catch (err) {
      console.error("Failed to fetch catalog:", err);
    }
  };

  const loadContinueWatching = async () => {
    try {
      const history = await api.getContinueWatching();
      setContinueWatching(history || []);
    } catch (err) {
      console.error("Failed to fetch continue watching:", err);
    }
  };

  const loadWatchlist = async () => {
    try {
      const list = await api.getWatchlist();
      const map = {};
      list?.forEach(item => { map[item.anime_id] = item.status; });
      setWatchlistMap(map);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
    }
  };

  const loadTorrentsCount = async () => {
    try {
      const tasks = await api.getTorrents();
      const active = tasks?.filter(t => t.status === 'downloading').length || 0;
      setActiveDownloadsCount(active);
    } catch (err) {
      console.error("Failed to fetch torrents count:", err);
    }
  };

  useEffect(() => {
    loadAllData();
    // An expired (or re-keyed) token makes the server treat us as a guest; drop the stale local session to match.
    if (api.getCurrentUser()) {
      api.me().then((res) => {
        if (!res.authenticated) {
          api.logout();
          setUser(null);
        }
      }).catch(() => {});
    }
  }, []);

  // Handle browse tab from URL query params (when opened in a new tab)
  useEffect(() => {
    if (route.page === 'browse') {
      const q = route.query || '';
      const f = route.filters || {};
      setSearchQuery(q);
      handleSearch(q, f);
    }
  }, [route.page, route.query, JSON.stringify(route.filters || {})]);

  // Search handler
  const handleSearch = async (query, filters = {}) => {
    if (!query?.trim() && Object.keys(filters).length === 0) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    setSearchResults([]); // shows the results panel (with spinner) while fetching
    if (route.page !== 'home' && route.page !== 'browse') {
      window.history.pushState({}, '', '/');
      setRoute({ page: 'home', tab: 'home' });
    }
    try {
      const results = await api.searchAnime(query?.trim() || '', filters);
      setSearchResults(results || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Home Click (Logo or Home tab)
  const handleGoHome = () => {
    setSearchResults(null);
    setSearchQuery('');
    setDownloadModalData(null);
    setIsAuthOpen(false);
    navigate('/');
    loadAllData();
  };

  // Tab navigation from navbar
  const handleTabChange = (tabId) => {
    if (tabId === 'home') {
      navigate('/');
    } else {
      navigate(`/${tabId}`);
    }
  };

  // Navigate to Anime Detail Page
  const handleSelectAnime = (anime) => {
    const id = anime.id || anime.slug || anime.anime_id;
    navigate(`/media/${id}`);
  };

  // Navigate to Watch Page
  const handleWatchEpisode = (anime, episodeNum = 1, initialProgress = 0) => {
    const id = anime.id || anime.slug || anime.anime_id;
    navigate(`/media/${id}/${episodeNum}`, { progress: initialProgress });
  };

  // Resume from Continue Watching
  // (Legacy anime IDs are normalized by the backend when history is saved and at startup.)
  const handleResumeContinueWatching = (item) => {
    navigate(`/media/${item.anime_id || item.id}/${item.episode_number ?? 1}`, { progress: item.progress_seconds || 0 });
  };

  // Remove from Continue Watching
  const handleRemoveHistory = async (animeId, episodeNum) => {
    try {
      await api.deleteWatchHistory(animeId, episodeNum);
      loadContinueWatching();
    } catch (err) {
      console.error("Failed to remove history:", err);
    }
  };

  // Toggle watchlist
  const handleToggleWatchlist = async (anime) => {
    const isSaved = !!watchlistMap[anime.id];
    try {
      if (isSaved) {
        await api.removeFromWatchlist(anime.id);
        const copy = { ...watchlistMap };
        delete copy[anime.id];
        setWatchlistMap(copy);
      } else {
        await api.setWatchlistItem({
          anime_id: anime.id,
          anime_title: anime.title,
          anime_poster: anime.poster,
          status: 'plan_to_watch',
          score: Math.round(anime.score || 0),
        });
        setWatchlistMap({ ...watchlistMap, [anime.id]: 'plan_to_watch' });
      }
    } catch (err) {
      console.error("Failed to toggle watchlist:", err);
    }
  };

  // Play local downloaded cap from Go torrent engine
  const handlePlayLocalCap = (task) => {
    navigate(`/media/${task.id || 'torrent'}/${task.episode_number || 1}`);
  };

  const openDownloadModal = (anime, episodeNumber, opt) => {
    const downloadOptions = Array.isArray(opt) ? opt : (opt ? [opt] : []);
    setDownloadModalData({ anime, episodeNumber, downloadOptions });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col selection:bg-[#f47521] selection:text-black transition-colors duration-200 ${
      isDark ? 'bg-[#0b0c0e] text-gray-100' : 'bg-[#f4f5f7] text-gray-900'
    }`}>
      {/* Top Navbar with GoAnime branding & Dark/Light toggle */}
      <Navbar
        currentTab={route.page === 'home' ? route.tab : ''}
        setCurrentTab={handleTabChange}
        onGoHome={handleGoHome}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={() => {
          api.logout();
          setUser(null);
          loadAllData();
        }}
        continueWatchingCount={continueWatching.length}
        activeDownloadsCount={activeDownloadsCount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Body */}
      <main className="flex-grow">
        {/* 1. Search Results Display (if active) */}
        {searchResults !== null ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            <div className={`flex items-center justify-between pb-6 border-b ${
              isDark ? 'border-[#23252b]' : 'border-gray-200'
            }`}>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  <Search className="w-6 h-6 text-[#f47521]" />
                  <span>{searchQuery.trim() ? `Resultados para "${searchQuery}"` : 'Resultados filtrados'}</span>
                </h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Encontrados {searchResults.length} animes en el catálogo
                </p>
              </div>

              <button
                onClick={() => { setSearchResults(null); setSearchQuery(''); navigate('/'); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  isDark 
                    ? 'bg-[#1e2029] hover:bg-[#282a36] text-gray-300 hover:text-white' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-200 shadow-xs'
                }`}
              >
                Volver al Inicio
              </button>
            </div>

            {isSearching ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-4 border-[#f47521] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Buscando en la base de datos de GoAnime...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className={`text-center py-16 rounded-2xl border p-8 mt-6 ${
                isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <p className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>No se encontraron animes con ese nombre.</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Intenta con otro término o consulta nuestras sugerencias populares.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                {searchResults.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onSelect={handleSelectAnime}
                    onWatchFirst={(a) => handleWatchEpisode(a, 1)}
                    onToggleWatchlist={handleToggleWatchlist}
                    isInWatchlist={!!watchlistMap[anime.id]}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        ) : route.page === 'anime' ? (
          /* 2. DEDICATED ANIME DETAIL PAGE */
          <AnimeDetailPage
            slug={route.slug}
            theme={theme}
            onNavigate={navigate}
            onDownloadCap={openDownloadModal}
            onWatchlistUpdated={loadWatchlist}
          />
        ) : route.page === 'watch' ? (
          /* 3. DEDICATED EPISODE WATCH PAGE */
          <WatchPage
            slug={route.slug}
            episodeNum={route.episodeNum}
            initialProgress={resumeProgress}
            theme={theme}
            onNavigate={navigate}
            onDownloadCap={openDownloadModal}
            onProgressSaved={loadContinueWatching}
            watchlistMap={watchlistMap}
            onToggleWatchlist={handleToggleWatchlist}
          />
        ) : (
          /* 4. HOME & TAB PAGES */
          <>
            {route.tab === 'home' && (
              <div>
                {/* Crunchyroll Hero Banner Carousel */}
                <HeroBanner
                  slides={catalog?.hero_slides}
                  onWatchEpisode={handleWatchEpisode}
                  onOpenDetails={handleSelectAnime}
                  onToggleWatchlist={handleToggleWatchlist}
                  theme={theme}
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-2">
                  {/* Still Viewing / Continue Watching Row */}
                  <ContinueWatchingRow
                    history={continueWatching}
                    onResume={handleResumeContinueWatching}
                    onRemove={handleRemoveHistory}
                    theme={theme}
                  />

                  {/* Latest Episodes with Download Cap Button */}
                  <LatestCapsRow
                    caps={catalog?.latest_caps}
                    onWatchEpisode={handleWatchEpisode}
                    onDownloadCap={openDownloadModal}
                    theme={theme}
                  />

                  {HOME_ROWS.map((row) => (
                    <AnimeRow
                      key={row.key}
                      title={row.title}
                      subtitle={row.subtitle}
                      animes={catalog?.[row.key]}
                      onSelectAnime={handleSelectAnime}
                      onWatchFirst={(a) => handleWatchEpisode(a, 1)}
                      onToggleWatchlist={handleToggleWatchlist}
                      watchlistMap={watchlistMap}
                      theme={theme}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab: STILL VIEWING (SIGUIENDO VIENDO DEDICATED) */}
            {route.tab === 'continue' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                <div className={`pb-6 border-b ${isDark ? 'border-[#23252b]' : 'border-gray-200'}`}>
                  <h1 className={`text-2xl sm:text-3xl font-black flex items-center gap-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    <Clock className="w-7 h-7 text-[#f47521]" />
                    <span>Siguiendo Viendo (Continuar Reproducción)</span>
                  </h1>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tu historial de reproducción sincronizado en tiempo real
                  </p>
                </div>

                {continueWatching.length === 0 ? (
                  <div className={`text-center py-16 rounded-2xl border p-8 mt-6 ${
                    isDark ? 'bg-[#14151a] border-[#23252b]' : 'bg-white border-gray-200 shadow-sm'
                  }`}>
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className={`text-lg font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>No tienes episodios en curso</h3>
                    <p className={`text-sm mt-1 max-w-md mx-auto ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                      Cuando comiences a ver cualquier anime, tu progreso se guardará automáticamente para que puedas continuar donde lo dejaste.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                    {continueWatching.map((item) => (
                      <div
                        key={`${item.anime_id}-${item.episode_number}`}
                        className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-[#14151a] border-[#23252b] hover:border-[#f47521]/60 shadow-lg' 
                            : 'bg-white border-gray-200 hover:border-[#f47521]/60 shadow-sm'
                        }`}
                        onClick={() => handleResumeContinueWatching(item)}
                      >
                        <div className="relative aspect-video w-full bg-black overflow-hidden">
                          <img
                            src={item.anime_poster || item.thumbnail}
                            alt={item.anime_title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                          {/* Hover Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <div className="w-11 h-11 rounded-full bg-[#f47521] flex items-center justify-center text-black shadow-lg transform group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-black ml-0.5" />
                            </div>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            title="Quitar de seguir viendo"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveHistory(item.anime_id, item.episode_number);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                            <div
                              className="h-full bg-[#f47521]"
                              style={{ width: `${Math.min(100, Math.max(5, (item.progress_seconds / (item.duration_seconds || 1440)) * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className={`font-bold text-sm truncate group-hover:text-[#f47521] transition-colors ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {item.anime_title}
                          </h4>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.episode_number === 0 ? 'Episodio 0 (Prólogo)' : `Episodio ${item.episode_number}`} • Continuar
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: MY LIST / FOR THE FUTURE */}
            {route.tab === 'watchlist' && (
              <MyListView
                onSelectAnime={handleSelectAnime}
                onWatchEpisode={handleWatchEpisode}
                theme={theme}
              />
            )}

            {/* Tab: TORRENT & DOWNLOADS */}
            {route.tab === 'downloads' && (
              <DownloadsView 
                onPlayLocalCap={handlePlayLocalCap} 
                theme={theme}
              />
            )}

          </>
        )}
      </main>

      {/* Action Modals */}
      {/* 1. Download Cap Modal */}
      {downloadModalData && (
        <DownloadCapModal
          anime={downloadModalData.anime}
          episodeNumber={downloadModalData.episodeNumber}
          downloadOptions={downloadModalData.downloadOptions}
          onClose={() => setDownloadModalData(null)}
          onDownloadStarted={loadTorrentsCount}
          onOpenDownloadsTab={() => navigate('/downloads')}
          theme={theme}
        />
      )}

      {/* 2. Auth Modal */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={(u) => {
            setUser(u);
            loadAllData();
          }}
          theme={theme}
        />
      )}

      {/* 3. User Profile / Personalization Modal */}
      {isProfileOpen && user && (
        <UserProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onUserUpdated={(u) => {
            setUser(u);
            loadAllData();
          }}
          theme={theme}
          stats={{
            watchlistCount: Object.keys(watchlistMap || {}).length,
            continueCount: continueWatching.length,
          }}
        />
      )}



      {/* Footer */}
      <footer className={`border-t py-8 text-center text-xs transition-colors ${
        isDark ? 'border-[#23252b] bg-[#0c0d10] text-gray-500' : 'border-gray-200 bg-white text-gray-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#f47521]" />
            <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>GoAnime</span>
            <span>— Tu portal favorito para ver anime online</span>
          </div>

          <div className={`flex items-center gap-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <span>Servidores AnimeAV1 Voe, UPNShare, MP4Upload</span>
            <span>•</span>
            <span>Reproducción en Alta Definición</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
