import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function CategoryManager({ categories, setCategories, selectedCategory, setSelectedCategory }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const addCategory = (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (name && !categories.includes(name)) {
      setCategories([...categories, name]);
      setNewCategoryName('');
      setIsAdding(false);
    }
  };

  const deleteCategory = (e, catToDelete) => {
    e.stopPropagation(); // Prevent selecting the category when clicking delete
    if (catToDelete === 'General') return; // Keep General as a default
    
    setCategories(categories.filter(c => c !== catToDelete));
    if (selectedCategory === catToDelete) {
      setSelectedCategory('General');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode='popLayout'>
          {categories.map((cat) => (
            <motion.button
              key={cat}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat)}
              className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all shadow-premium flex items-center gap-2 
                ${selectedCategory === cat 
                  ? 'bg-magazine-accent text-white border-transparent' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700'
                }`}
            >
              {cat}
              {cat !== 'General' && (
                <span 
                  onClick={(e) => deleteCategory(e, cat)}
                  className="hover:text-red-400 transition-colors ml-1 font-bold"
                >
                  ×
                </span>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Add New Category Form */}
      <div className="flex items-center">
        {isAdding ? (
          <motion.form 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            onSubmit={addCategory} 
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              className="p-2 text-sm border rounded-lg shadow-inner dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-magazine-accent"
              onBlur={() => !newCategoryName && setIsAdding(false)}
            />
            <button 
              type="submit" 
              className="text-xs font-bold uppercase tracking-widest magazine-gradient bg-clip-text text-transparent"
            >
              Add
            </button>
          </motion.form>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsAdding(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-premium text-gray-500 hover:text-magazine-accent transition-colors"
            aria-label="Add Category"
          >
            +
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default CategoryManager;