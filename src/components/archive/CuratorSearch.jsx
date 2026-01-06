import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { FiSearch, FiUser, FiX, FiClock, FiCompass, FiHash, FiFileText } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const CuratorSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ profiles: [], clips: [] });
  const [recentSearches, setRecentSearches] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('ether_recent_curators');
    if (saved) setRecentSearches(JSON.parse(saved));

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (query.length < 2) {
        setResults({ profiles: [], clips: [] });
        return;
      }

      const searchLower = `%${query.toLowerCase()}%`;

      // 1. Search Profiles
      const profileQuery = supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', searchLower)
        .limit(3);

      // 2. Search Clips by Tags (array contains) or Content (ilike)
      const clipQuery = supabase
        .from('clips')
        .select('id, content, tags, type')
        .or(`tags.cs.{${query.toLowerCase()}},content.ilike.${searchLower}`)
        .limit(5);

      const [profRes, clipRes] = await Promise.all([profileQuery, clipQuery]);

      setResults({
        profiles: profRes.data || [],
        clips: clipRes.data || []
      });
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const addToRecent = (item) => {
    const updated = [item, ...recentSearches.filter(p => p.id !== item.id)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('ether_recent_curators', JSON.stringify(updated));
    setQuery('');
    setIsFocused(false);
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative flex items-center group">
        <FiSearch className={`absolute left-4 transition-colors ${isFocused ? 'text-magazine-accent' : 'text-gray-400'}`} size={14} />
        <input
          type="text"
          placeholder="SEARCH ANTHOLOGY OR CURATORS..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="w-full bg-gray-100/40 dark:bg-white/5 border border-transparent focus:border-magazine-accent/20 py-2.5 pl-12 pr-4 rounded-full text-[10px] tracking-[0.2em] uppercase focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
      </div>

      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-900 shadow-2xl z-[110] overflow-hidden rounded-2xl max-h-[450px] overflow-y-auto"
          >
            {query.length >= 2 ? (
              <div className="py-2">
                {/* PROFILES SECTION */}
                {results.profiles.length > 0 && (
                  <div className="mb-2">
                    <p className="px-4 py-2 text-[8px] text-gray-400 tracking-[0.3em] font-black uppercase border-b border-gray-50 dark:border-white/5">Curators</p>
                    {results.profiles.map(profile => (
                      <Link 
                        key={profile.id} 
                        to={`/profile/${profile.id}`} 
                        onClick={() => addToRecent(profile)} 
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <UserAvatar url={profile.avatar_url} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{profile.username}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* CLIPS/POSTS SECTION WITH FILTER PARAMS */}
                {results.clips.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[8px] text-gray-400 tracking-[0.3em] font-black uppercase border-b border-gray-50 dark:border-white/5">Folio Entries</p>
                    {results.clips.map(clip => (
                      <Link 
                        key={clip.id} 
                        /* Pass the first tag and the search query as URL params */
                        to={`/archive?tag=${clip.tags?.[0] || ''}&search=${query}`} 
                        onClick={() => setIsFocused(false)} 
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-lg text-gray-400">
                          {clip.type === 'image' ? <FiCompass size={14} /> : <FiFileText size={14} />}
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="text-[10px] font-medium lowercase tracking-tight line-clamp-1 text-gray-800 dark:text-gray-200">
                            {clip.content}
                          </span>
                          <div className="flex gap-2 mt-1">
                            {clip.tags?.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[7px] text-magazine-accent uppercase tracking-widest flex items-center shrink-0">
                                <FiHash size={6} className="mr-0.5" />{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {results.profiles.length === 0 && results.clips.length === 0 && (
                  <p className="p-8 text-[10px] italic text-gray-400 text-center uppercase tracking-widest">No matching frequencies found.</p>
                )}
              </div>
            ) : (
              /* RECENT SEARCHES */
              <div className="py-2">
                <div className="flex justify-between items-center px-4 py-2">
                  <p className="text-[8px] text-gray-400 tracking-[0.3em] font-black uppercase">Recent Explorations</p>
                  {recentSearches.length > 0 && (
                    <button 
                      onClick={(e) => { 
                        e.preventDefault();
                        setRecentSearches([]); 
                        localStorage.removeItem('ether_recent_curators'); 
                      }} 
                      className="text-[8px] text-magazine-accent hover:underline tracking-widest uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {recentSearches.length > 0 ? (
                  recentSearches.map(item => (
                    <Link 
                      key={item.id} 
                      to={item.username ? `/profile/${item.id}` : `/archive?search=${item.content?.substring(0,10)}`} 
                      onClick={() => setIsFocused(false)} 
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <FiClock className="text-gray-300" size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">
                        {item.username || item.content?.substring(0, 20) || "Folio Entry"}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <FiCompass className="text-gray-200 dark:text-gray-800 animate-pulse" size={24} />
                    <p className="text-[9px] text-gray-400 tracking-[0.4em] uppercase leading-relaxed">Seek within the <br/>digital anthology</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UserAvatar = ({ url }) => (
  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-900 shrink-0">
    {url ? (
      <img src={url} className="w-full h-full object-cover grayscale" alt="curator" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-gray-300">
        <FiUser size={14}/>
      </div>
    )}
  </div>
);

export default CuratorSearch;