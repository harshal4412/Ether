import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from "../../lib/supabaseClient";
import { 
  FiMoon, FiSun, FiUser, 
  FiSettings, FiGrid, 
  FiMessageSquare, FiCompass,
  FiBell, FiUserPlus, FiPlusSquare, FiMessageCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import CuratorSearch from './CuratorSearch';

const TopNav = ({ darkMode, setDarkMode, user, onAuthAction }) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  // --- Notification States ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const notifyRef = useRef(null);

  // Monitor scroll to trigger the blurred glass effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Notification Logic ---
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id(username, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    fetchNotifications();

    // Listen for clicks outside the notification dropdown
    const handleClickOutside = (e) => {
      if (notifyRef.current && !notifyRef.current.contains(e.target)) {
        setIsNotifyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Real-time subscription for new notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `receiver_id=eq.${user.id}` 
      }, () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const markAsRead = async () => {
    setIsNotifyOpen(!isNotifyOpen);
    if (!isNotifyOpen && unreadCount > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('receiver_id', user.id);
      setUnreadCount(0);
    }
  };

  const navLinks = [
    { name: 'Discover', icon: <FiCompass />, path: '/' },
    { name: 'Archive', icon: <FiGrid />, path: '/archive' },
    { name: 'Dispatches', icon: <FiMessageSquare />, path: '/chat', badge: true },
  ];

  const getDisplayName = () => {
    if (!user) return 'Identify';
    return (
      user.user_metadata?.display_name || 
      user.user_metadata?.full_name || 
      user.user_metadata?.username || 
      'Curator'
    );
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 md:px-12 ${
        isScrolled 
          ? 'py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900 shadow-sm' 
          : 'py-8 bg-transparent'
      }`}
    >
      <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-8 flex-1">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center transition-transform group-hover:rotate-90 duration-500 shadow-lg">
              <span className="text-white dark:text-black font-serif font-black text-xl">E</span>
            </div>
            <span className="font-serif italic tracking-[0.3em] uppercase text-[10px] hidden xl:block">
              Ether Archive
            </span>
          </Link>

          <div className="hidden lg:block w-full max-w-xs">
            <CuratorSearch />
          </div>
        </div>

        {/* Center Navigation: Pill Menu */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center bg-gray-100/50 dark:bg-white/5 p-1 rounded-full backdrop-blur-md border border-gray-200/20 shadow-inner">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative flex items-center gap-2 px-6 py-2 rounded-full text-[10px] uppercase tracking-widest font-black transition-all ${
                location.pathname === link.path 
                  ? 'bg-white dark:bg-black text-magazine-accent shadow-sm' 
                  : 'text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {link.icon}
              <span className="hidden xl:block">{link.name}</span>
              {link.badge && (
                <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-magazine-accent rounded-full animate-pulse" />
              )}
            </Link>
          ))}
        </div>

        {/* Right Actions: Identity & Tools */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
          
          <div className="flex items-center" ref={notifyRef}>
            {/* Notification Bell */}
            {user && (
              <div className="relative">
                <button 
                  onClick={markAsRead}
                  className={`p-3 transition-colors relative ${isNotifyOpen ? 'text-magazine-accent' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}
                >
                  <FiBell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-magazine-accent rounded-full border-2 border-white dark:border-black" />
                  )}
                </button>

                <AnimatePresence>
                  {isNotifyOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-4 w-80 bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-900 shadow-2xl rounded-2xl overflow-hidden z-[110]"
                    >
                      <div className="px-4 py-3 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                        <span className="text-[9px] uppercase tracking-[0.3em] font-black">Archive Activity</span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length > 0 ? notifications.map(n => (
                          <Link 
                            key={n.id} 
                            to={n.type === 'follow' ? `/profile/${n.actor?.username}` : '/archive'}
                            onClick={() => setIsNotifyOpen(false)}
                            className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-white/5"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0">
                              {n.actor?.avatar_url ? <img src={n.actor.avatar_url} className="w-full h-full object-cover grayscale" /> : <FiUser size={14} className="m-auto mt-2" />}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[10px] leading-tight">
                                <span className="font-black uppercase tracking-widest">{n.actor?.username}</span>
                                <span className="text-gray-500 lowercase font-serif italic ml-1">
                                  {n.type === 'follow' && 'entered your circle'}
                                  {n.type === 'post' && 'published a new folio'}
                                  {n.type === 'comment' && 'annotated your work'}
                                </span>
                              </p>
                              <span className="text-[7px] text-gray-400 uppercase tracking-tighter">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="ml-auto text-magazine-accent opacity-50">
                              {n.type === 'follow' && <FiUserPlus size={12}/>}
                              {n.type === 'post' && <FiPlusSquare size={12}/>}
                              {n.type === 'comment' && <FiMessageCircle size={12}/>}
                            </div>
                          </Link>
                        )) : (
                          <div className="p-8 text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-serif italic">The archive is silent.</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>

            <Link 
              to="/settings"
              className={`p-3 transition-colors ${
                location.pathname === '/settings' 
                  ? 'text-magazine-accent' 
                  : 'text-gray-400 hover:text-black dark:hover:text-white'
              }`}
              title="Configuration"
            >
              <FiSettings size={18} />
            </Link>
          </div>

          <div className="h-8 w-[1px] bg-gray-100 dark:bg-gray-800 mx-1 hidden sm:block" />
          
          <button 
            onClick={onAuthAction}
            className="flex items-center gap-3 pl-2 group"
          >
            <div className="relative">
              <div className="w-10 h-10 border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center overflow-hidden group-hover:border-magazine-accent transition-colors shadow-sm">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="User Avatar" />
                ) : (
                  <FiUser className="text-gray-400" size={18} />
                )}
              </div>
              {user && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-black rounded-full" />
              )}
            </div>
            
            <div className="hidden lg:flex flex-col items-start text-left">
              <span className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">
                {getDisplayName()}
              </span>
              <span className="text-[8px] text-gray-400 uppercase tracking-tighter">
                {user ? 'Cloud Sync Active' : 'Offline Mode'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;