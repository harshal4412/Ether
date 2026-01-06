import { motion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';

function SearchBar({ searchQuery, setSearchQuery }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative w-full group"
    >
      {/* Search Icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-magazine-accent transition-colors duration-300">
        <FiSearch size={16} />
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="SEARCH THE ANTHOLOGY..."
        className="w-full bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-gray-900 py-4 pl-12 pr-12 text-[10px] tracking-[0.3em] uppercase font-medium focus:outline-none focus:border-magazine-accent focus:ring-1 focus:ring-magazine-accent/20 transition-all duration-500 backdrop-blur-sm shadow-sm hover:shadow-md"
        aria-label="Search clips"
      />

      {/* Clear Search Button */}
      {searchQuery && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setSearchQuery('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <FiX size={18} />
        </motion.button>
      )}

      {/* Decorative Border Line */}
      <div className="absolute bottom-0 left-0 h-[1px] bg-magazine-accent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-700 origin-left w-full" />
    </motion.div>
  );
}

export default SearchBar;