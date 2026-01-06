import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function BulkActionBar({ selectedCount, onApplyTag, onClearSelection }) {
  const [tagInput, setTagInput] = useState('');

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl"
        >
          <div className="bg-black dark:bg-white text-white dark:text-black p-4 shadow-2xl flex flex-col md:flex-row items-center gap-6 border border-gray-800 dark:border-gray-200">
            <div className="flex items-center gap-4">
              <span className="font-serif italic text-lg">{selectedCount}</span>
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold opacity-60">Folios Selected</span>
            </div>

            <div className="h-8 w-[1px] bg-gray-700 dark:bg-gray-300 hidden md:block" />

            <div className="flex-1 flex gap-2 w-full">
              <input 
                type="text"
                placeholder="NEW BULK TAG..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="flex-1 bg-transparent border-b border-gray-700 dark:border-gray-300 text-[10px] tracking-widest outline-none py-1 focus:border-magazine-accent transition-colors"
              />
              <button 
                onClick={() => { onApplyTag(tagInput); setTagInput(''); }}
                className="text-[10px] font-black uppercase tracking-widest hover:text-magazine-accent transition-colors"
              >
                Apply
              </button>
            </div>

            <button 
              onClick={onClearSelection}
              className="text-[10px] opacity-50 hover:opacity-100 uppercase tracking-widest border-l border-gray-700 dark:border-gray-300 pl-6"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BulkActionBar;