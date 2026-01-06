import { useState } from 'react';
import ClipForm from '../components/archive/ClipForm';
import ClipGrid from '../components/archive/ClipGrid';
import { motion } from 'framer-motion';

const Archive = ({ user, clips, onAddClip, onDeleteClip, onUpdateClip, onAuthAction }) => {
  const [filter, setFilter] = useState('all');

  // Filter clips based on type if needed
  const filteredClips = filter === 'all' 
    ? clips 
    : clips.filter(c => c.type === filter);

  return (
    <div className="pt-32 pb-20 px-6 max-w-[1400px] mx-auto">
      <header className="mb-12">
        <h1 className="font-serif text-5xl uppercase tracking-tighter mb-2">Personal Archive</h1>
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400">Secure Cloud Synchronization Active</p>
      </header>

      {/* The Input Section */}
      <ClipForm user={user} onAddClip={onAddClip} onAuthAction={onAuthAction} />

      {/* Filter Bar */}
      <div className="flex gap-8 mb-12 border-b border-gray-100 dark:border-gray-900 pb-4 overflow-x-auto no-scrollbar">
        {['all', 'text', 'image', 'video', 'url'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-[10px] uppercase tracking-[0.3em] font-black transition-all ${
              filter === t ? 'text-magazine-accent' : 'text-gray-300 hover:text-black dark:hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* The Grid */}
      <ClipGrid 
        clips={filteredClips} 
        onDelete={onDeleteClip} 
        onUpdate={onUpdateClip} 
      />
    </div>
  );
};

export default Archive;