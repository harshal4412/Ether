/**
 * MoodReader Utility
 * Extracts a balanced dominant color from a Base64 image.
 * Designed for Ether's editorial adaptive UI.
 */
export const extractMoodColor = (base64Str) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    
    img.onerror = () => {
      // Return a fallback accent if the image fails
      resolve('#b1976b'); 
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // Use a smaller scale for faster processing
      const scale = 0.1; 
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        let r = 0, g = 0, b = 0;
        let count = 0;

        // Step through pixels (sampling every 4th pixel for performance)
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);

        // Optional: Boost saturation for the "Editorial" look
        // This ensures the color isn't too muddy/gray
        const color = adjustColorVibrancy(avgR, avgG, avgB);
        
        resolve(`rgb(${color.r}, ${color.g}, ${color.b})`);
      } catch (e) {
        resolve('#b1976b'); // Fallback
      }
    };
  });
};

/**
 * Ensures the extracted color is vibrant enough for a magazine accent.
 */
const adjustColorVibrancy = (r, g, b) => {
  // Simple luminance check
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // If too dark, bring it up; if too bright, pull it down
  // This keeps the UI readable in both dark and light modes
  let factor = 1.0;
  if (luminance < 0.2) factor = 1.5;
  if (luminance > 0.8) factor = 0.8;

  return {
    r: Math.min(255, Math.round(r * factor)),
    g: Math.min(255, Math.round(g * factor)),
    b: Math.min(255, Math.round(b * factor))
  };
};