import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { FiHeart, FiShare2, FiExternalLink, FiUser, FiArrowRight, FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Home = ({ user }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchGlobalFeed();
  }, []);

  const fetchGlobalFeed = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clips')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            is_private
          )
        `)
        .eq('is_public', true)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setFeed(data || []);
    } catch (error) {
      console.error("Error fetching feed:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSearch = async (query) => {
    setUserSearch(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(5);

    if (!error) setSearchResults(data || []);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#fdfdfc] dark:bg-[#0a0a0a]">
      <div className="w-12 h-12 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfdfc] dark:bg-[#0a0a0a] transition-colors duration-500">
      <div className="pt-32 pb-20 px-4 md:px-10 max-w-[1800px] mx-auto">
        
        {/* Editorial Header */}
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="font-serif text-5xl md:text-9xl uppercase tracking-tighter mb-6 leading-none">
              The Front Page
            </h1>
            <div className="flex justify-center items-center gap-6 text-[10px] uppercase tracking-[0.5em] text-gray-400 font-bold">
              <span>Edition 01</span>
              <span className="h-[1px] w-16 bg-gray-200 dark:bg-gray-800" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </motion.div>
        </header>

        {/* Curator Search Bar */}
        <div className="max-w-md mx-auto mb-24 relative px-6 group">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-0 text-gray-300 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="FIND CURATORS..." 
              value={userSearch}
              onChange={(e) => handleUserSearch(e.target.value)}
              className="w-full bg-transparent border-b border-gray-100 dark:border-gray-900 py-4 pl-8 text-[10px] tracking-[0.5em] text-center focus:outline-none focus:border-black dark:focus:border-white transition-all uppercase"
            />
          </div>
          
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-full left-0 w-full bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-900 z-50 shadow-2xl"
              >
                {searchResults.map(result => (
                  <Link 
                    key={result.id} 
                    to={`/profile/${result.id}`}
                    onClick={() => setUserSearch('')}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-gray-900 last:border-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-700">
                      {result.avatar_url ? (
                        <img src={result.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <FiUser className="m-2 text-gray-400" />
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">
                      {result.username || 'ANONYMOUS'}
                    </span>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The Grid Feed */}
        {feed.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
            {feed.map((clip) => (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="break-inside-avoid bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-900 group transition-all duration-500 hover:shadow-2xl"
              >
                {/* Visual Content */}
                {clip.type === 'image' && (
                  <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img 
                      src={clip.content} 
                      alt="Editorial" 
                      className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                    />
                  </div>
                )}

                {clip.type === 'video' && (
                  <video src={clip.content} className="w-full h-auto" controls={false} autoPlay muted loop />
                )}

                {/* Textual Content */}
                {(clip.type === 'text' || clip.type === 'url') && (
                  <div className="p-10">
                    <p className="font-serif text-2xl italic leading-relaxed tracking-tight">
                      "{clip.content}"
                    </p>
                    {clip.type === 'url' && (
                      <a href={clip.content} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center gap-2 text-[9px] tracking-[0.3em] text-magazine-accent font-black hover:opacity-60 transition-opacity">
                        <FiExternalLink /> SOURCE REFERENCE
                      </a>
                    )}
                  </div>
                )}

                {/* Footer / Meta */}
                <div className="p-6 border-t border-gray-50 dark:border-gray-900 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                  <Link to={`/profile/${clip.user_id}`} className="flex items-center gap-3 group/user">
                    <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                      {clip.profiles?.avatar_url ? (
                        <img src={clip.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <FiUser size={14} className="text-gray-400" />
                      )}
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.2em] font-black group-hover/user:text-magazine-accent transition-colors">
                      {clip.profiles?.username || 'ANONYMOUS'}
                    </span>
                  </Link>

                  <div className="flex gap-4 text-gray-400">
                    <button className="hover:text-black dark:hover:text-white transition-colors">
                      <FiHeart size={16} />
                    </button>
                    <button className="hover:text-black dark:hover:text-white transition-colors">
                      <FiShare2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-40 text-center flex flex-col items-center justify-center border-y border-gray-100 dark:border-gray-900"
          >
            <h2 className="font-serif italic text-3xl text-gray-300 dark:text-gray-700 mb-8">
              Your mood, your archive.
            </h2>
            <Link 
              to="/archive" 
              className="group flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] font-black"
            >
              Begin your own anthology <FiArrowRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Home;