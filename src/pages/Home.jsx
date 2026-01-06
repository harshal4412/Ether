import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { FiHeart, FiShare2, FiExternalLink, FiUser } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Home = ({ user }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalFeed();
  }, []);

  const fetchGlobalFeed = async () => {
    try {
      setLoading(true);
      // We fetch clips that are public, joining with the creator's profile
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

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="pt-32 pb-20 px-4 md:px-10">
      {/* Editorial Header */}
      <header className="mb-16 text-center">
        <h1 className="font-serif text-5xl md:text-8xl uppercase tracking-tighter mb-4">
          The Front Page
        </h1>
        <div className="flex justify-center items-center gap-4 text-[10px] uppercase tracking-[0.4em] text-gray-400">
          <span>Edition 01</span>
          <span className="h-[1px] w-12 bg-gray-200 dark:bg-gray-800" />
          <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </header>

      {/* The Grid Feed */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {feed.map((clip) => (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="break-inside-avoid bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-900 group"
          >
            {/* Visual Content */}
            {clip.type === 'image' && (
              <div className="relative overflow-hidden">
                <img 
                  src={clip.content} 
                  alt="Editorial" 
                  className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
            )}

            {clip.type === 'video' && (
              <video src={clip.content} className="w-full h-auto" controls={false} autoPlay muted loop />
            )}

            {/* Textual Content */}
            {(clip.type === 'text' || clip.type === 'url') && (
              <div className="p-8">
                <p className="font-serif text-xl italic leading-relaxed">
                  "{clip.content}"
                </p>
                {clip.type === 'url' && (
                  <a href={clip.content} target="_blank" className="mt-4 flex items-center gap-2 text-[10px] tracking-widest text-magazine-accent">
                    <FiExternalLink /> SOURCE REFERENCE
                  </a>
                )}
              </div>
            )}

            {/* Footer / Meta */}
            <div className="p-6 border-t border-gray-50 dark:border-gray-900 flex justify-between items-center">
              <Link to={`/profile/${clip.user_id}`} className="flex items-center gap-3 group/user">
                <div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                  {clip.profiles?.avatar_url ? (
                    <img src={clip.profiles.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <FiUser size={12} />
                  )}
                </div>
                <span className="text-[9px] uppercase tracking-widest font-black group-hover/user:text-magazine-accent transition-colors">
                  {clip.profiles?.username || 'ANONYMOUS'}
                </span>
              </Link>

              <div className="flex gap-4 text-gray-400">
                <button className="hover:text-black dark:hover:text-white transition-colors">
                  <FiHeart size={14} />
                </button>
                <button className="hover:text-black dark:hover:text-white transition-colors">
                  <FiShare2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Home;