import { motion, AnimatePresence } from 'framer-motion';

// Removed internal useState since visibility is now controlled by App.jsx
function SettingsPanel({ isOpen, onClose, paperIntensity, setPaperIntensity, onClearVault, clipCount }) {
  
  return (
    <>
      {/* The trigger button was removed from here because it now lives 
        inside the TopNav component for a cleaner, single-line UI.
      */}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop with sophisticated blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose} // Use the onClose prop
              className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-[210]"
            />

            {/* Side Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-[#0a0a0a] z-[220] shadow-2xl p-12 border-l border-gray-100 dark:border-gray-900 flex flex-col"
            >
              <div className="flex justify-between items-center mb-20">
                <h2 className="font-serif italic text-3xl">System</h2>
                {/* Close button calls the onClose prop */}
                <button 
                  onClick={onClose} 
                  className="text-3xl font-light hover:rotate-90 transition-transform p-2"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 space-y-16">
                {/* Physicality Control */}
                <section>
                  <label className="block text-[10px] uppercase tracking-[0.3em] font-black mb-6 text-gray-400">
                    Tactile: Paper Grain
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="0.1" 
                    step="0.01" 
                    value={paperIntensity}
                    onChange={(e) => setPaperIntensity(parseFloat(e.target.value))}
                    className="w-full accent-black dark:accent-white bg-gray-100 dark:bg-gray-800 h-[2px] appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-2 text-[8px] uppercase tracking-widest text-gray-300">
                    <span>Digital</span>
                    <span>Organic</span>
                  </div>
                </section>

                {/* Vault Stats */}
                <section className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-400">Inventory</p>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-900 pb-2">
                    <span className="font-serif italic">Total Curations</span>
                    <span className="font-bold">{clipCount}</span>
                  </div>
                </section>
              </div>

              {/* Danger Zone */}
              <div className="mt-auto">
                <button 
                  onClick={onClearVault}
                  className="w-full py-4 border border-red-100 dark:border-red-900/30 text-red-400 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-red-500 hover:text-white transition-all"
                >
                  Terminate Archive
                </button>
                <p className="mt-4 text-center text-[9px] text-gray-300 tracking-widest uppercase">
                  Ether Protocol // Secure Cloud Sync
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default SettingsPanel;