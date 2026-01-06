import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

function TagCloud({ clips, activeTag, onTagSelect }) {
  // Logic to count frequency and create an editorial hierarchy
  const tagData = useMemo(() => {
    const counts = {};
    clips.forEach(clip => {
      clip.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    // Convert to array and sort alphabetically for a clean "Index" look
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [clips]);

  if (tagData.length === 0) return null;

  return (
    <div className="mt-12 mb-20 px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-[1px] flex-1 bg-gray-100 dark:bg-gray-900" />
        <h3 className="font-serif italic text-sm text-gray-400 tracking-[0.2em] uppercase">
          Vocabulary Index
        </h3>
        <div className="h-[1px] flex-1 bg-gray-100 dark:bg-gray-900" />
      </div>

      <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 max-w-5xl mx-auto">
        <AnimatePresence>
          {tagData.map(([tag, count]) => {
            const isSelected = activeTag === tag;
            
            // Editorial Weight Logic: More frequent tags look "heavier"
            const fontWeight = count > 5 ? 'font-black' : count > 2 ? 'font-bold' : 'font-light';
            const fontSize = count > 5 ? 'text-lg' : 'text-xs';

            return (
              <motion.button
                key={tag}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.1, color: "var(--magazine-accent)" }}
                onClick={() => onTagSelect(isSelected ? null : tag)}
                className={`group relative transition-all duration-500 uppercase tracking-[0.3em] flex items-center gap-2
                  ${fontWeight} ${fontSize}
                  ${isSelected ? 'text-magazine-accent' : 'text-gray-400 dark:text-gray-600'}
                `}
              >
                {/* Visual indicator for selection */}
                {isSelected && (
                  <motion.span 
                    layoutId="tagDot"
                    className="w-1.5 h-1.5 bg-magazine-accent rounded-full"
                  />
                )}
                
                <span>{tag}</span>
                
                {/* Count badge - minimal and discreet */}
                <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity font-sans align-top">
                  [{count}]
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Clear Filter Button */}
      {activeTag && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-8"
        >
          <button 
            onClick={() => onTagSelect(null)}
            className="text-[10px] uppercase tracking-widest text-magazine-accent border-b border-magazine-accent pb-1 hover:opacity-70 transition-opacity"
          >
            Reset Vocabulary Filter
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default TagCloud;