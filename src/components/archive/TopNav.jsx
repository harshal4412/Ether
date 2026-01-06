import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiMoon, FiSun, FiUser, 
  FiSettings, FiGrid, 
  FiMessageSquare, FiCompass 
} from 'react-icons/fi';
import CuratorSearch from './CuratorSearch';

const TopNav = ({ darkMode, setDarkMode, user, onAuthAction }) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor scroll to trigger the blurred glass effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Discover', icon: <FiCompass />, path: '/' },
    { name: 'Archive', icon: <FiGrid />, path: '/archive' },
    { name: 'Dispatches', icon: <FiMessageSquare />, path: '/chat', badge: true },
  ];

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

          {/* User Discovery Search Bar */}
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
              
              {/* Notification Badge */}
              {link.badge && (
                <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-magazine-accent rounded-full animate-pulse" />
              )}
            </Link>
          ))}
        </div>

        {/* Right Actions: Identity & Tools */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
          
          <div className="flex items-center">
            {/* Theme Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>

            {/* Settings Link */}
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
          
          {/* Identity & Profile */}
          <button 
            onClick={onAuthAction}
            className="flex items-center gap-3 pl-2 group"
          >
            <div className="relative">
              <div className="w-10 h-10 border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center overflow-hidden group-hover:border-magazine-accent transition-colors shadow-sm">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="User" />
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
                {user ? (user.user_metadata?.username || 'Curator') : 'Identify'}
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