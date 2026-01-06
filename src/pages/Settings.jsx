import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { FiCamera, FiLock, FiUnlock, FiTrash2, FiSave, FiArrowLeft, FiLogOut, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Settings = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    avatar_url: '',
    is_private: false
  });

  useEffect(() => {
    if (!user) {
      const timeout = setTimeout(() => navigate('/'), 1000);
      return () => clearTimeout(timeout);
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) setProfile(data);
    if (error) console.error("Error fetching dossier:", error);
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        username: profile.username,
        bio: profile.bio,
        is_private: profile.is_private, // This is the crucial toggle update
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      toast.error("Protocol failed: Update rejected.");
    } else {
      toast.success("Identity Reconfigured");
      // We stay on the page to allow further edits, 
      // but the UI reflects the new state
    }
    setLoading(false);
  };

  // Logic to handle the Privacy Toggle specifically
  const togglePrivacy = () => {
    setProfile(prev => ({ ...prev, is_private: !prev.is_private }));
    // We don't save immediately to allow the user to batch changes with the "Save" button
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Placeholder for Supabase Storage logic:
    // 1. Upload file to 'avatars' bucket
    // 2. Get Public URL
    // 3. Update profile.avatar_url
    toast.loading("Uploading visual sigil...");
    
    // Simulating upload for now:
    setTimeout(() => {
        toast.dismiss();
        toast.success("Visual updated locally. Save to commit.");
        // In a real scenario, you'd set the actual URL here
    }, 1500);
  };

  const deleteAccount = async () => {
    const confirm = window.confirm("EXTERMINATION PROTOCOL: This will permanently erase your curated archives. Proceed?");
    if (confirm) {
      setLoading(true);
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (!error) {
        await supabase.auth.signOut();
        navigate('/');
        toast.success("Identity Erased");
      }
      setLoading(false);
    }
  };

  return (
    <div className="pt-40 pb-20 px-6 max-w-3xl mx-auto min-h-screen">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center mb-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors group">
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-[10px] uppercase tracking-[0.4em] font-black">Return</span>
        </button>
        <button onClick={() => supabase.auth.signOut()} className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2">
          <FiLogOut />
          <span className="text-[10px] uppercase tracking-widest font-black">Disconnect</span>
        </button>
      </motion.div>

      <h1 className="font-serif text-6xl uppercase tracking-tighter mb-16">Configuration</h1>

      <form onSubmit={handleUpdate} className="space-y-16">
        {/* Visual Identity Section */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.5em] text-magazine-accent mb-8 font-black">Visual Identity</h3>
          <div className="flex items-center gap-10">
            <div className="relative group w-32 h-32">
              <div className="w-full h-full rounded-full border-2 border-gray-100 dark:border-gray-900 overflow-hidden bg-gray-50 dark:bg-white/5 shadow-2xl">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><FiCamera size={30} /></div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full text-white backdrop-blur-sm">
                <span className="text-[8px] uppercase font-black tracking-widest text-center px-2">Upload</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            <p className="text-sm font-serif italic text-gray-500 leading-relaxed max-w-xs">
              Your avatar is your calling card. High-contrast, monochromatic images recommended.
            </p>
          </div>
        </section>

        {/* Info Section */}
        <section className="space-y-10">
          <h3 className="text-[10px] uppercase tracking-[0.5em] text-gray-400 font-black">Curator Manifesto</h3>
          <div className="space-y-2 border-b border-gray-100 dark:border-gray-900 pb-2">
            <label className="text-[9px] uppercase tracking-widest text-gray-400">Alias</label>
            <input 
              type="text" 
              value={profile.username}
              onChange={e => setProfile({...profile, username: e.target.value})}
              className="w-full bg-transparent py-2 font-serif text-3xl focus:outline-none"
            />
          </div>
          <div className="space-y-2 border-b border-gray-100 dark:border-gray-900 pb-2">
            <label className="text-[9px] uppercase tracking-widest text-gray-400">Philosophy</label>
            <textarea 
              rows={2}
              value={profile.bio}
              onChange={e => setProfile({...profile, bio: e.target.value})}
              className="w-full bg-transparent py-2 font-serif italic text-xl focus:outline-none resize-none"
            />
          </div>
        </section>

        {/* Privacy Toggle Section */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.5em] text-gray-400 mb-8 font-black">Archive Visibility</h3>
          <div 
            onClick={togglePrivacy}
            className="flex items-center justify-between w-full p-8 border border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-all rounded-xl"
          >
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${profile.is_private ? 'bg-magazine-accent/10 text-magazine-accent' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                {profile.is_private ? <FiLock size={20} /> : <FiUnlock size={20} />}
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-1">
                  {profile.is_private ? 'Private Anthology' : 'Public Anthology'}
                </p>
                <p className="text-[10px] text-gray-400 font-serif italic">
                  {profile.is_private ? 'Visibility restricted to your circle.' : 'Open to the global stream.'}
                </p>
              </div>
            </div>
            {/* Custom Toggle Switch */}
            <div className={`w-14 h-7 rounded-full relative transition-colors duration-500 ${profile.is_private ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'}`}>
               <div className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-300 ${profile.is_private ? 'translate-x-8 bg-white dark:bg-black' : 'translate-x-1 bg-white'}`} />
            </div>
          </div>
        </section>

        <div className="pt-10 space-y-4">
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-6 bg-black dark:bg-white text-white dark:text-black text-[10px] uppercase tracking-[0.6em] font-black hover:tracking-[0.8em] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <FiRefreshCw className="animate-spin" /> : <><FiSave size={16} /> Save Changes</>}
          </button>
          
          <button type="button" onClick={deleteAccount} className="w-full py-4 text-red-500 text-[9px] uppercase tracking-[0.4em] font-black opacity-50 hover:opacity-100 transition-opacity">
            Permanent Deactivation
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;