import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ClipCard from './ClipCard';

function ClipGrid({ clips, onDeleteClip, onUpdateClip, selectedIds = [], onToggleSelection }) {
  const [hoveredTags, setHoveredTags] = useState([]);

  return (
    <div className="relative">
      {/* Background Decorative Grid - subtle magazine aesthetic */}
      <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-r border-gray-100/50 dark:border-gray-900/50 h-full w-full" />
        ))}
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8 p-4 max-w-[1600px] mx-auto relative z-10">
        <AnimatePresence mode="popLayout">
          {clips.map((clip) => {
            // Check if this card shares a tag with the card being hovered
            const isRelated = clip.tags.some(tag => hoveredTags.includes(tag));
            const isSelected = selectedIds.includes(clip.id);
            
            return (
              <motion.div
                key={clip.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: hoveredTags.length > 0 && !isRelated ? 0.3 : 1,
                  scale: 1,
                  filter: hoveredTags.length > 0 && !isRelated ? 'blur(2px)' : 'blur(0px)'
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                onMouseEnter={() => setHoveredTags(clip.tags)}
                onMouseLeave={() => setHoveredTags([])}
                className={`break-inside-avoid transition-all duration-500 relative group ${isSelected ? 'z-20' : 'z-10'}`}
              >
                {/* SELECTION OVERLAY TRIGGER */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection(clip.id);
                  }}
                  className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 cursor-pointer z-30 transition-all duration-300 flex items-center justify-center
                    ${isSelected 
                      ? 'bg-magazine-accent border-magazine-accent scale-110 shadow-lg' 
                      : 'bg-white/50 dark:bg-black/50 border-gray-300 dark:border-gray-700 opacity-0 group-hover:opacity-100 hover:border-magazine-accent'
                    }`}
                >
                  {isSelected && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </div>

                <ClipCard 
                  clip={clip} 
                  related={clips}
                  isHighlighted={isRelated && hoveredTags.length > 0}
                  isSelected={isSelected} // Passed to card for internal styling changes
                  onDelete={() => onDeleteClip(clip.id)}
                  onUpdate={onUpdateClip}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Semantic Indicator */}
      <AnimatePresence>
        {hoveredTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] tracking-[0.4em] uppercase font-bold z-50 shadow-2xl"
          >
            Analyzing Connections: {hoveredTags.join(' + ')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ClipGrid;