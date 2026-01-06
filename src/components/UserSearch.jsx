import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { FiSearch, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const UserSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`) // Case-insensitive search
        .limit(5);

      if (!error) setResults(data);
      setIsSearching(false);
    };

    const timer = setTimeout(searchUsers, 300); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-xs">
      <div className="relative flex items-center">
        <FiSearch className="absolute left-3 text-gray-400" size={14} />
        <input
          type="text"
          placeholder="Search Architects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent border border-gray-100 dark:border-gray-900 py-2 pl-10 pr-4 text-[10px] tracking-widest uppercase focus:outline-none focus:border-magazine-accent transition-all"
        />
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-900 shadow-2xl z-[60]"
          >
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  navigate(`/profile/${user.id}`);
                  setQuery('');
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-gray-900 last:border-none"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-6 h-6 rounded-full" />
                ) : (
                  <FiUser className="text-gray-400" />
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
                  {user.username}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserSearch;