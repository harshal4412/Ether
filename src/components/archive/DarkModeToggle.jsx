import { motion } from 'framer-motion';

function DarkModeToggle({ darkMode, setDarkMode }) {
  return (
    <motion.button
      onClick={() => setDarkMode(!darkMode)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-premium transition hover:shadow-lg"
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.span
        initial={{ rotate: 0 }}
        animate={{ rotate: darkMode ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {darkMode ? '☀️' : '🌙'}
      </motion.span>
    </motion.button>
  );
}

export default DarkModeToggle;