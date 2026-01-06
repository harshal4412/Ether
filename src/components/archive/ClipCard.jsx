import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FiHeart, FiMessageCircle, FiShare2, FiMoreHorizontal, FiPlay } from 'react-icons/fi';

function ClipCard({ clip, related = [], onDelete, onUpdate, isHighlighted, user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tagsInput, setTagsInput] = useState(clip.tags.join(', '));
  const [isLiked, setIsLiked] = useState(false); // Local state until DB sync

  // Semantic Logic: Find other clips that share at least one tag
  const connectedInspiration = related
    .filter(r => r.id !== clip.id && r.tags.some(tag => clip.tags.includes(tag)))
    .slice(0, 2);

  const handleTagUpdate = () => {
    const newTags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    onUpdate(clip.id, { tags: newTags });
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative bg-white dark:bg-[#0f0f0f] border transition-all duration-500 hover:shadow-premium overflow-hidden p-6
        ${isHighlighted 
          ? 'border-magazine-accent scale-[1.02] z-20 shadow-xl' 
          : 'border-gray-100 dark:border-gray-900'
        }`}
    >
      {/* Editorial Header & User Attribution */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {/* Social: User Avatar & Username */}
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
             {user?.avatar_url ? (
               <img src={user.avatar_url} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full bg-magazine-accent/20" />
             )}
          </div>
          <span className="text-[9px] uppercase tracking-[0.3em] font-black text-black dark:text-white">
            {user?.username || "Anonymous"}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-[9px] uppercase tracking-[0.4em] font-medium text-gray-400">
            {clip.type} // {new Date(clip.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          </span>
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-400 hover:text-red-600">
            <FiMoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Display */}
      <div className="mb-6">
        {clip.type === 'image' && (
          <div className="overflow-hidden bg-gray-50 dark:bg-gray-800 relative">
            <motion.img 
              src={clip.content} 
              alt="Visual Archive"
              className="w-full h-auto object-cover filter grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        )}

        {clip.type === 'video' && (
          <div className="overflow-hidden bg-black relative group/video aspect-video flex items-center justify-center">
            <video 
              src={clip.content} 
              className="w-full h-full object-cover opacity-80 group-hover/video:opacity-100 transition-opacity"
              muted
              loop
              onMouseOver={(e) => e.target.play()}
              onMouseOut={(e) => e.target.pause()}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover/video:opacity-0 transition-opacity">
              <FiPlay className="text-white/50" size={32} />
            </div>
            <div className="absolute bottom-2 right-2 text-[8px] uppercase tracking-widest text-white/50 font-black">Motion</div>
          </div>
        )}

        {clip.type === 'url' && (
          <div className="py-4">
            <a 
              href={clip.content} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-serif text-2xl italic leading-tight hover:text-magazine-accent transition-colors underline decoration-gray-200 underline-offset-8"
            >
              {new URL(clip.content).hostname}
              <span className="block text-[10px] mt-2 font-sans not-italic text-gray-400 uppercase tracking-widest">
                Visit Reference ↗
              </span>
            </a>
          </div>
        )}

        {clip.type === 'text' && (
          <blockquote className="relative">
            <span className="absolute -top-4 -left-2 text-6xl font-serif text-gray-100 dark:text-gray-800 pointer-events-none">“</span>
            <p className="font-serif text-xl leading-relaxed text-gray-800 dark:text-gray-200 relative z-10 italic">
              {clip.content}
            </p>
          </blockquote>
        )}
      </div>

      {/* Social Interaction Bar */}
      <div className="flex items-center gap-6 mb-6 pt-2">
        <button 
          onClick={() => setIsLiked(!isLiked)}
          className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
          <FiHeart size={18} fill={isLiked ? "currentColor" : "none"} />
          <span className="text-[10px] font-bold">24</span>
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
          <FiMessageCircle size={18} />
          <span className="text-[10px] font-bold">8</span>
        </button>
        <button className="ml-auto text-gray-400 hover:text-magazine-accent transition-colors">
          <FiShare2 size={16} />
        </button>
      </div>

      {/* Metadata & Semantic Connections */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <input
              autoFocus
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={handleTagUpdate}
              onKeyDown={(e) => e.key === 'Enter' && handleTagUpdate()}
              className="w-full bg-gray-50 dark:bg-gray-800 p-2 text-[10px] uppercase tracking-widest outline-none border-b border-magazine-accent"
            />
          ) : (
            clip.tags.map(tag => (
              <button
                key={tag}
                onClick={() => setIsEditing(true)}
                className="text-[9px] uppercase tracking-widest font-bold text-gray-400 hover:text-magazine-accent transition-colors"
              >
                #{tag}
              </button>
            ))
          )}
        </div>

        {connectedInspiration.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="pt-4 border-t border-gray-50 dark:border-gray-800"
          >
            <p className="text-[8px] uppercase tracking-[0.3em] text-magazine-accent font-bold mb-3">
              Semantic Connections
            </p>
            <div className="space-y-2">
              {connectedInspiration.map(ref => (
                <div key={ref.id} className="flex items-center gap-3">
                  <div className="w-1.5 h-[1px] bg-magazine-accent" />
                  <p className="text-[10px] italic text-gray-400 truncate">
                    Linked via <span className="text-gray-600 dark:text-gray-300">
                      {ref.tags.find(t => clip.tags.includes(t))}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Highlight Pulse Effect */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 border-2 border-magazine-accent z-[-1] pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ClipCard;