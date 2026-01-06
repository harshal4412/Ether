const STOP_WORDS = new Set(['the', 'and', 'this', 'that', 'with', 'from', 'your', 'have', 'was', 'for']);

export const suggestTags = (text) => {
  if (!text || text.length < 5) return [];

  const words = text.toLowerCase()
    .replace(/[^\w\s]/gi, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));

  // Count frequency
  const counts = {};
  words.forEach(word => counts[word] = (counts[word] || 0) + 1);

  // Return top 3 most unique/frequent words
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);
};

// Contextual Clusters for smart suggestions
export const getContextualTags = (text) => {
  const clusters = {
    minimalism: ['clean', 'simple', 'white', 'space', 'less'],
    philosophy: ['stoic', 'mind', 'existence', 'truth', 'logic'],
    aesthetic: ['vogue', 'editorial', 'style', 'mood', 'visual'],
    technology: ['code', 'digital', 'protocol', 'ether', 'system']
  };

  const suggestions = [];
  const lowerText = text.toLowerCase();

  Object.entries(clusters).forEach(([tag, keywords]) => {
    if (keywords.some(kw => lowerText.includes(kw))) {
      suggestions.push(tag);
    }
  });

  return suggestions;
};