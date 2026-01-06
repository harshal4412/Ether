import { motion } from 'framer-motion';
import { FiWind, FiRefreshCw } from 'react-icons/fi';

const EmptyState = ({ searchQuery, resetFilters }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full py-40 flex flex-col items-center justify-center text-center border border-dashed border-gray-100 dark:border-gray-900 bg-gray-50/30 dark:bg-white/2"
    >
      <div className="relative mb-8">
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            x: [0, 5, -5, 0] 
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <FiWind className="text-gray-200 dark:text-gray-800" size={60} strokeWidth={1} />
        </motion.div>
      </div>

      <h3 className="font-serif text-3xl italic text-gray-800 dark:text-gray-200 mb-4">
        The Archive is Silent
      </h3>
      
      <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 max-w-xs leading-loose mb-10">
        No entries match "{searchQuery || 'your filters'}". <br />
        Perhaps it remains unwritten or exists in another volume.
      </p>

      <button
        onClick={resetFilters}
        className="group flex items-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-[9px] uppercase tracking-[0.3em] font-black hover:opacity-80 transition-all shadow-xl"
      >
        <FiRefreshCw className="group-hover:rotate-180 transition-transform duration-700" size={14} />
        Restore Anthology
      </button>
    </motion.div>
  );
};

export default EmptyState;