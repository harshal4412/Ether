import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { extractMoodColor } from "./components/archive/MoodReader";
import { supabase } from './lib/supabaseClient';

// Pages
import Home from './pages/Home';
import Profile from './pages/Profile';
import Archive from './pages/Archive';
import Chat from './pages/Chat';
import Settings from './pages/Settings'; 

// Icons
import { FcGoogle } from 'react-icons/fc';
import { FiX, FiMail, FiLoader } from 'react-icons/fi';

// Components
import ClipForm from './components/archive/ClipForm';
import ClipGrid from './components/archive/ClipGrid';
import SearchBar from './components/archive/SearchBar';
import CategoryManager from './components/archive/CategoryManager';
import ExportImport from './components/archive/ExportImport';
import EditorialExport from './components/archive/EditorialExport';
import TopNav from './components/archive/TopNav';
import TagCloud from './components/archive/TagCloud';
import BulkActionBar from './components/archive/BulkActionBar';
import EmptyState from './components/archive/EmptyState'; 
import ScrollToTop from './components/ScrollToTop';

// Aesthetic Engine Configuration with Poetic Context
const THEMES = {
  Architecture: {
    accent: "#575757",
    font: "'Inter', sans-serif",
    spacing: "0.02em",
    weight: "300",
    bgTint: "rgba(240, 240, 240, 0.5)",
    contrast: "1.05",
    grain: "0.08",
    description: "The silent dialogue between form and void."
  },
  "Noir Cinema": {
    accent: "#ffffff",
    font: "'Courier New', monospace",
    spacing: "-0.01em",
    weight: "400",
    bgTint: "rgba(0, 0, 0, 0.95)",
    contrast: "1.4",
    grain: "0.15",
    description: "Shadows that speak louder than words."
  },
  Cyberpunk: {
    accent: "#00ff41",
    font: "'Orbitron', sans-serif",
    spacing: "0.1em",
    weight: "900",
    bgTint: "rgba(10, 0, 20, 0.9)", 
    contrast: "1.2",
    grain: "0.03",
    description: "High tech, low life. The digital ghost in the machine."
  },
  General: {
    accent: "#b1976b",
    font: "'Playfair Display', serif",
    spacing: "0.2em",
    weight: "900",
    bgTint: "transparent",
    contrast: "1.0",
    grain: "0.03",
    description: "A sanctuary for unclassified thoughts and raw inspirations."
  }
};

const AppContent = ({ 
  clips, setClips, searchQuery, setSearchQuery, filterType, setFilterType, 
  activeTag, setActiveTag, categories, setCategories, selectedCategory, 
  setSelectedCategory, darkMode, setDarkMode, paperIntensity, setPaperIntensity,
  accentColor, setAccentColor, selectedIds, setSelectedIds, user, setUser,
  loading, setLoading, showAuthModal, setShowAuthModal, authEmail, setAuthEmail,
  isSendingMagicLink, setIsSendingMagicLink, fetchClips, addClip, handleGoogleLogin,
  handleMagicLink, handleAuth, deleteClip, clearVault, bulkAddTag, resetFilters 
}) => {
  const location = useLocation();
  const { scrollY } = useScroll();
  const mastheadScale = useTransform(scrollY, [0, 200], [1, 0.8]);
  const mastheadOpacity = useTransform(scrollY, [0, 200], [1, 0]);

  // ATMOSPHERE ENGINE
  useEffect(() => {
    const theme = THEMES[selectedCategory] || THEMES.General;
    const root = document.documentElement;

    root.style.setProperty('--magazine-accent', theme.accent);
    root.style.setProperty('--magazine-font', theme.font);
    root.style.setProperty('--magazine-tracking', theme.spacing);
    root.style.setProperty('--magazine-weight', theme.weight);
    root.style.setProperty('--magazine-bg-tint', theme.bgTint);
    root.style.setProperty('--magazine-contrast', theme.contrast);
    root.style.setProperty('--paper-opacity', theme.grain);

    root.classList.add('theme-transitioning');
    const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 1000);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tagParam = params.get('tag');
    const searchParam = params.get('search');

    if (tagParam) setActiveTag(tagParam);
    if (searchParam) setSearchQuery(searchParam);
  }, [location, setActiveTag, setSearchQuery]);

  const processedClips = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();

    return clips
      .filter(clip => {
        if (searchLower !== '') {
          return (
            clip.content?.toLowerCase().includes(searchLower) ||
            (clip.tags && clip.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
            (clip.category && clip.category.toLowerCase().includes(searchLower))
          );
        }
        const matchesCategory = clip.category === selectedCategory;
        const matchesType = filterType === 'all' || clip.type === filterType;
        const matchesTag = !activeTag || (clip.tags && clip.tags.includes(activeTag));
        return matchesCategory && matchesType && matchesTag;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [clips, searchQuery, filterType, selectedCategory, activeTag]);

  // Prevent redirect while Supabase is checking for a session
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#fdfdfc] dark:bg-[#0a0a0a]">
        <FiLoader className="animate-spin text-magazine-accent" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative selection:bg-magazine-accent bg-[#fdfdfc] dark:bg-[#0a0a0a] transition-colors duration-500">
      <div className="paper-overlay" style={{ opacity: paperIntensity }} />
      <Toaster toastOptions={{ className: 'font-serif italic text-sm shadow-premium bg-white dark:bg-black text-black dark:text-white rounded-none border border-gray-100 dark:border-gray-800' }} />

      <TopNav 
        darkMode={darkMode} setDarkMode={setDarkMode} 
        user={user} onAuthAction={handleAuth}
      />

      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen bg-white/90 dark:bg-black/95 backdrop-blur-xl"
            style={{ position: 'fixed', top: 0, left: 0 }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-900 p-10 shadow-2xl relative mx-6"
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                <FiX size={20} />
              </button>
              
              <div className="text-center mb-10">
                <h2 className="font-serif text-3xl uppercase tracking-widest mb-2">Vault Access</h2>
                <p className="text-[9px] uppercase tracking-widest text-gray-400">Identify to synchronize anthology</p>
              </div>

              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-4 py-4 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-all mb-8 shadow-sm">
                <FcGoogle size={20} /><span className="text-[10px] uppercase tracking-widest font-black">Continue with Google</span>
              </button>

              <div className="relative mb-8 text-center">
                <span className="bg-white dark:bg-[#0d0d0d] px-4 text-[8px] uppercase tracking-[0.3em] text-gray-300 relative z-10">or Correspondence</span>
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-100 dark:bg-gray-900 z-0" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-6">
                <div className="relative group">
                  <FiMail className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-magazine-accent transition-colors" />
                  <input type="email" placeholder="EMAIL ADDRESS" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required className="w-full bg-transparent border-b border-gray-100 dark:border-gray-900 py-3 pl-8 text-xs tracking-widest text-center focus:outline-none focus:border-magazine-accent" />
                </div>
                <button type="submit" disabled={isSendingMagicLink} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] uppercase tracking-widest font-black hover:opacity-80 transition-all flex items-center justify-center gap-2">
                  {isSendingMagicLink ? <FiLoader className="animate-spin" /> : "Request Magic Link"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BulkActionBar selectedCount={selectedIds.length} onApplyTag={bulkAddTag} onClearSelection={() => setSelectedIds([])} />

      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/profile" element={user ? <Profile currentUser={user} /> : <Navigate to="/" replace />} />
        <Route path="/profile/:username" element={<Profile currentUser={user} />} />
        <Route path="/chat" element={user ? <Chat user={user} /> : <Navigate to="/" replace />} />
        <Route path="/settings" element={<Settings user={user} paperIntensity={paperIntensity} setPaperIntensity={setPaperIntensity} onClearVault={clearVault} />} />

        <Route path="/archive" element={
          <>
            <motion.header style={{ scale: mastheadScale, opacity: mastheadOpacity }} className="pt-52 pb-16 px-8 text-center">
              <motion.div initial={{ letterSpacing: "0.5em", opacity: 0 }} animate={{ letterSpacing: "0.2em", opacity: 1 }} transition={{ duration: 1.5 }}>
                <h1 className="text-[12vw] md:text-[8vw] font-serif font-black uppercase leading-none magazine-gradient bg-clip-text text-transparent">Ether</h1>
              </motion.div>
              <p className="mt-4 font-serif italic text-gray-500 tracking-widest text-sm uppercase">A Private Digital Anthology &mdash; Vol. 01</p>
            </motion.header>

            <AnimatePresence mode="wait">
              <motion.main 
                key={selectedCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.8, ease: "anticipate" }}
                className="max-w-[1800px] mx-auto px-6 md:px-12 pb-32"
              >
                <div className="mb-16 pt-10 border-l border-magazine-accent/30 pl-8">
                  <motion.div
                    key={selectedCategory + "title"}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <h2 className="text-4xl md:text-6xl font-serif mb-4 lowercase tracking-tight">
                      {selectedCategory}
                    </h2>
                  </motion.div>
                  
                  <motion.p
                    key={selectedCategory + "desc"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="italic font-serif text-lg md:text-xl tracking-wide max-w-2xl"
                  >
                    {THEMES[selectedCategory]?.description || "The evolution of an idea."}
                  </motion.p>
                </div>

                <div className="sticky top-0 z-40 py-4 bg-[#fdfdfc]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-900 mb-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-8">
                    <div className="w-full sm:w-[300px] md:w-[450px]">
                      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </div>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-transparent font-serif italic text-sm focus:outline-none cursor-pointer py-2 border-none">
                      <option value="all">All Mediums</option>
                      <option value="text">Prose & Snippets</option>
                      <option value="image">Visuals</option>
                      <option value="url">References</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-6 border-t border-gray-100 dark:border-gray-900 pt-4 lg:pt-0 lg:border-none">
                    <EditorialExport clips={processedClips} category={selectedCategory} />
                    <ExportImport clips={clips} setClips={setClips} />
                  </div>
                </div>

                <div className="mb-12 overflow-x-auto no-scrollbar">
                  <CategoryManager categories={categories} setCategories={setCategories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
                </div>

                <TagCloud clips={clips} activeTag={activeTag} onTagSelect={setActiveTag} />

                <div className="mb-24">
                  <ClipForm onAddClip={addClip} user={user} onAuthAction={handleAuth} />
                </div>

                {processedClips.length > 0 ? (
                  <ClipGrid 
                    clips={processedClips} 
                    selectedIds={selectedIds}
                    onToggleSelection={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                    onDeleteClip={deleteClip} 
                    onUpdateClip={async (id, updates) => {
                      const { error } = await supabase.from('clips').update(updates).eq('id', id);
                      if (!error) setClips(clips.map(c => c.id === id ? {...c, ...updates} : c));
                    }} 
                  />
                ) : (
                  <EmptyState searchQuery={searchQuery} resetFilters={resetFilters} />
                )}
              </motion.main>
            </AnimatePresence>
          </>
        } />
      </Routes>

      <footer className="py-24 border-t border-gray-100 dark:border-gray-900 text-center">
        <span className="font-serif italic text-gray-400 text-sm tracking-widest uppercase block mb-2">Curated by you &bull; Secured by Ether</span>
        <span className="font-serif text-[10px] tracking-[0.3em] text-magazine-accent uppercase font-bold">Made with love, by Harshal !</span>
      </footer>
    </div>
  );
};

function App() {
  const [clips, setClips] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTag, setActiveTag] = useState(null); 
  const [categories, setCategories] = useState(['General']);
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [darkMode, setDarkMode] = useState(false);
  const [paperIntensity, setPaperIntensity] = useState(0.03); 
  const [accentColor, setAccentColor] = useState('#b1976b'); 
  const [selectedIds, setSelectedIds] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--magazine-accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const storedCats = JSON.parse(localStorage.getItem('ether_cats')) || ['General'];
    const storedDark = JSON.parse(localStorage.getItem('ether_dark')) || false;
    const storedIntensity = JSON.parse(localStorage.getItem('ether_paper')) || 0.03;
    const storedAccent = localStorage.getItem('ether_accent') || '#b1976b';
    setCategories(storedCats);
    setDarkMode(storedDark);
    setPaperIntensity(storedIntensity);
    setAccentColor(storedAccent);
  }, []);

  useEffect(() => {
    // Initial Session Check with Safety Net
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session) {
          await fetchClips();
        }
      } catch (error) {
        console.error("Authentication init failed:", error);
      } finally {
        // Stop loading regardless of success or failure
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        await fetchClips();
      } else {
        setClips([]);
      }
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('ether_cats', JSON.stringify(categories));
    localStorage.setItem('ether_dark', JSON.stringify(darkMode));
    localStorage.setItem('ether_paper', JSON.stringify(paperIntensity));
    localStorage.setItem('ether_accent', accentColor);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [categories, darkMode, paperIntensity, accentColor]);

  const fetchClips = async () => {
    const { data, error } = await supabase
      .from('clips')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) toast.error("Cloud Sync Failed");
    else setClips(data || []);
  };

  const addClip = async (newClip) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (newClip.type === 'image') {
      try {
        const color = await extractMoodColor(newClip.content);
        setAccentColor(color);
        toast('Atmosphere Adjusted', { icon: '🎨' });
      } catch (e) { console.error(e); }
    }
    const { data, error } = await supabase
      .from('clips')
      .insert([{ 
        ...newClip, 
        user_id: user.id,
        category: selectedCategory,
        timestamp: new Date().toISOString()
      }])
      .select();
    if (error) toast.error("Archive Failed");
    else {
      setClips([data[0], ...clips]);
      toast.success('Archived to Cloud');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) toast.error(error.message);
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setIsSendingMagicLink(true);
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail });
    setIsSendingMagicLink(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Access link sent to email");
      setShowAuthModal(false);
    }
  };

  const handleAuth = async () => {
    if (user) {
      const { error } = await supabase.auth.signOut();
      if (!error) toast.error('Session Terminated');
    } else setShowAuthModal(true);
  };

  const deleteClip = async (id) => {
    const { error } = await supabase.from('clips').delete().eq('id', id);
    if (error) toast.error("Delete Failed");
    else {
      setClips(clips.filter(c => c.id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      toast.error('Entry Removed');
    }
  };

  const clearVault = async () => {
    if(window.confirm("Permanently wipe your cloud anthology?")) {
      const { error } = await supabase.from('clips').delete().eq('user_id', user.id);
      if (!error) {
        setClips([]);
        setAccentColor('#b1976b');
        setSelectedIds([]);
        toast.error('Vault Cleared');
      }
    }
  };

  const bulkAddTag = async (tag) => {
    const cleanedTag = tag.toLowerCase().trim();
    if (!cleanedTag) return;
    const updatedClips = clips.map(clip => {
      if (selectedIds.includes(clip.id)) {
        const newTags = clip.tags.includes(cleanedTag) ? clip.tags : [...clip.tags, cleanedTag];
        return { ...clip, tags: newTags };
      }
      return clip;
    });
    for (const id of selectedIds) {
        const target = updatedClips.find(c => c.id === id);
        await supabase.from('clips').update({ tags: target.tags }).eq('id', id);
    }
    setClips(updatedClips);
    setSelectedIds([]);
    toast.success(`Applied to ${selectedIds.length} folios`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setActiveTag(null);
  };

  return (
    <Router>
      <ScrollToTop />
      <AppContent 
        clips={clips} setClips={setClips} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        filterType={filterType} setFilterType={setFilterType} activeTag={activeTag} setActiveTag={setActiveTag}
        categories={categories} setCategories={setCategories} selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory} darkMode={darkMode} setDarkMode={setDarkMode}
        paperIntensity={paperIntensity} setPaperIntensity={setPaperIntensity} accentColor={accentColor}
        setAccentColor={setAccentColor} selectedIds={selectedIds} setSelectedIds={setSelectedIds}
        user={user} setUser={setUser} loading={loading} setLoading={setLoading} 
        showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} authEmail={authEmail}
        setAuthEmail={setAuthEmail} isSendingMagicLink={isSendingMagicLink}
        setIsSendingMagicLink={setIsSendingMagicLink} fetchClips={fetchClips} addClip={addClip}
        handleGoogleLogin={handleGoogleLogin} handleMagicLink={handleMagicLink} handleAuth={handleAuth}
        deleteClip={deleteClip} clearVault={clearVault} bulkAddTag={bulkAddTag} resetFilters={resetFilters}
      />
    </Router>
  );
}

export default App;