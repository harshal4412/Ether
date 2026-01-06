import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { FiCamera, FiVideo, FiType, FiLink, FiX, FiRefreshCw, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { suggestTags, getContextualTags } from '../../utils/tagEngine';

function ClipForm({ onAddClip, user, onAuthAction }) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [type, setType] = useState('text');
  const [isPublic, setIsPublic] = useState(false); // NEW: Public/Private toggle
  const [suggested, setSuggested] = useState([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('user'); 
  
  const fileInputRef = useRef(null);
  const webcamRef = useRef(null);

  // AI-lite tag suggestions logic (Preserved)
  useEffect(() => {
    if (type === 'text' && content.length > 15) {
      const aiTags = [...new Set([...suggestTags(content), ...getContextualTags(content)])];
      const currentTags = tags.split(',').map(t => t.trim().toLowerCase());
      setSuggested(aiTags.filter(t => !currentTags.includes(t)));
    } else {
      setSuggested([]);
    }
  }, [content, type, tags]);

  // Handle File Uploads
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Keep it under 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setContent(reader.result);
        toast.success(`${file.type.split('/')[0]} loaded`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Camera Capture
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setContent(imageSrc);
      setType('image');
      setIsCameraOpen(false);
      toast.success('Moment Captured');
    }
  }, [webcamRef]);

  const handleAddSuggested = (tag) => {
    const currentTags = tags.trim();
    const newTags = currentTags ? `${currentTags}, ${tag}` : tag;
    setTags(newTags);
    setSuggested(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Auth Check: If no user, trigger the auth modal via the prop passed from App.jsx
    if (!user) {
      onAuthAction(); 
      toast.error("Authentication required to archive entries.");
      return;
    }

    if (!content.trim()) return;

    onAddClip({
      content,
      type,
      is_public: isPublic, // Pass the public status to database
      tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    });

    // Reset
    setContent('');
    setTags('');
    setIsPublic(false);
    setSuggested([]);
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="max-w-4xl mx-auto mb-12 p-8 bg-white dark:bg-[#0a0a0a] shadow-premium border-b-2 border-black dark:border-white relative overflow-hidden"
    >
      {/* AUTH OVERLAY: Only shows if user is not logged in */}
      {!user && (
        <div className="absolute inset-0 z-50 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }}
            className="bg-white dark:bg-black border border-black dark:border-white p-8 shadow-2xl max-w-sm"
          >
            <FiLock className="mx-auto mb-4 text-magazine-accent" size={24} />
            <h3 className="font-serif text-xl uppercase tracking-widest mb-2">Vault Locked</h3>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-6 leading-relaxed">
              You must identify yourself to synchronize your anthology with the cloud.
            </p>
            <button 
              onClick={onAuthAction}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black text-[10px] uppercase tracking-[0.3em] font-black hover:opacity-80 transition-all"
            >
              Request Access
            </button>
          </motion.div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-6 ${!user ? 'blur-sm pointer-events-none' : ''}`}>
        {/* Type Selector Navigation */}
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-900 pb-4">
          <span className="font-serif italic text-lg text-gray-400">New Entry</span>
          <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] font-bold">
            {[
              { id: 'text', icon: <FiType /> },
              { id: 'image', icon: <FiCamera /> },
              { id: 'video', icon: <FiVideo /> },
              { id: 'url', icon: <FiLink /> }
            ].map((t) => (
              <button 
                key={t.id} type="button" 
                onClick={() => { setType(t.id); setContent(''); setSuggested([]); }}
                className={`flex items-center gap-2 transition-all ${type === t.id ? "text-black dark:text-white border-b-2 border-black dark:border-white" : "text-gray-300 hover:text-gray-500"}`}
              >
                {t.icon} <span className="hidden sm:inline">{t.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Input Section */}
        <div className="min-h-[120px] flex items-center">
          {type === 'image' || type === 'video' ? (
            <div className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-900 py-8 px-4 transition-colors hover:border-magazine-accent group relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept={type === 'image' ? "image/*" : "video/*"} 
                className="hidden" 
              />
              
              {content ? (
                <div className="relative group">
                  {type === 'image' ? (
                    <img src={content} alt="Preview" className="max-h-64 object-contain shadow-lg" />
                  ) : (
                    <video src={content} className="max-h-64 shadow-lg" controls />
                  )}
                  <button 
                    onClick={() => setContent('')}
                    className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button type="button" onClick={() => fileInputRef.current.click()} className="font-serif italic text-xl text-gray-400 group-hover:text-magazine-accent">
                    Upload from Gallery
                  </button>
                  {type === 'image' && (
                    <>
                      <span className="hidden sm:block text-gray-200">|</span>
                      <button 
                        type="button" 
                        onClick={() => setIsCameraOpen(true)}
                        className="font-serif italic text-xl text-gray-400 hover:text-magazine-accent flex items-center gap-2"
                      >
                         Open Live Lens
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'url' ? "Paste reference link..." : "Capture thought..."}
              className="w-full text-2xl font-serif outline-none bg-transparent resize-none placeholder:text-gray-100 dark:placeholder:text-gray-900 text-black dark:text-white"
              rows="2"
            />
          )}
        </div>

        {/* Visibility Toggle & AI Suggestions */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <AnimatePresence>
              {suggested.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-wrap gap-2 items-center"
                >
                  <span className="text-[8px] uppercase tracking-widest text-magazine-accent font-bold">Suggested:</span>
                  {suggested.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddSuggested(tag)}
                      className="text-[10px] italic border border-gray-100 dark:border-gray-800 px-2 py-1 hover:border-magazine-accent hover:text-magazine-accent transition-all text-gray-500"
                    >
                      +{tag}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* NEW: Premium Public Toggle */}
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`flex items-center gap-3 px-4 py-2 border transition-all duration-500 ${
                isPublic 
                ? 'border-magazine-accent text-magazine-accent bg-magazine-accent/5' 
                : 'border-gray-100 dark:border-gray-900 text-gray-400'
              }`}
            >
              {isPublic ? <FiEye size={14} /> : <FiEyeOff size={14} />}
              <span className="text-[9px] uppercase tracking-[0.3em] font-black">
                {isPublic ? 'Public Exhibition' : 'Private Archive'}
              </span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="TAGS (COMMA SEPARATED)"
              className="flex-1 bg-gray-50 dark:bg-[#0f0f0f] p-4 text-[10px] tracking-widest outline-none border-none focus:ring-1 focus:ring-black dark:focus:ring-white text-black dark:text-white"
            />
            <button type="submit" className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 uppercase text-[10px] tracking-[0.3em] font-black hover:invert transition-all">
              Archive Entry
            </button>
          </div>
        </div>
      </form>

      {/* CAMERA MODAL OVERLAY (Preserved) */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl aspect-square sm:aspect-video bg-gray-900 overflow-hidden shadow-2xl border border-white/10">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: cameraMode }}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 right-6 flex gap-4">
                <button 
                  onClick={() => setCameraMode(prev => prev === 'user' ? 'environment' : 'user')}
                  className="text-white bg-black/40 backdrop-blur-md p-3 rounded-full hover:bg-white hover:text-black transition-all"
                >
                  <FiRefreshCw size={20} />
                </button>
                <button 
                  onClick={() => setIsCameraOpen(false)}
                  className="text-white bg-black/40 backdrop-blur-md p-3 rounded-full hover:bg-white hover:text-black transition-all"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button onClick={capturePhoto} className="group relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-white transition-transform group-active:scale-90" />
                  <div className="absolute w-12 h-12 bg-white rounded-full scale-90 group-hover:scale-100 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ClipForm;