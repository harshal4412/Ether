import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function ExportImport({ clips, setClips }) {
  const fileInputRef = useRef(null);

  // Export Logic: Converts clips array to a JSON file and triggers download
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(clips, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `ether-vault-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Vault exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  // Import Logic: Reads the JSON file and updates the App state
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedClips = JSON.parse(e.target.result);
        if (Array.isArray(importedClips)) {
          setClips(importedClips);
          toast.success(`${importedClips.length} clips imported!`);
        } else {
          throw new Error("Invalid format");
        }
      } catch (error) {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    event.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />

      <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow-premium border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Export Button */}
        <motion.button
          whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExport}
          className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 transition-colors"
        >
          Export
        </motion.button>

        {/* Import Button */}
        <motion.button
          whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current.click()}
          className="px-4 py-3 text-xs font-bold uppercase tracking-widest magazine-gradient bg-clip-text text-transparent transition-colors"
        >
          Import
        </motion.button>
      </div>
    </div>
  );
}

export default ExportImport;