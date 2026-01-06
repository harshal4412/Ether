import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { 
  FiLock, FiUserPlus, FiUserCheck, 
  FiSettings, FiMessageSquare, FiUser 
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Profile = ({ currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  // Logic: If no userId in URL, we are looking at our own profile
  const targetId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === targetId;

  const [profile, setProfile] = useState(null);
  const [clips, setClips] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (targetId) {
      fetchProfileAndContent();
      if (!isOwnProfile && currentUser) checkFollowStatus();
    } else {
      setLoading(false);
    }
  }, [targetId, currentUser, isOwnProfile]);

  const checkFollowStatus = async () => {
    const { data } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetId)
      .single();
    setIsFollowing(!!data);
  };

  const fetchProfileAndContent = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile Details
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Determine Access (Own profile OR public OR following)
      const { data: followData } = currentUser && !isOwnProfile ? await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId)
        .single() : { data: null };

      const hasAccess = isOwnProfile || !profileData?.is_private || !!followData;

      // 3. Fetch Clips if access is granted
      if (hasAccess) {
        const { data: clipsData } = await supabase
          .from('clips')
          .select('*')
          .eq('user_id', targetId)
          .order('timestamp', { ascending: false });
        
        setClips(clipsData || []);
      }
    } catch (err) {
      console.error("Error fetching dossier:", err);
      toast.error("Profile not found");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return toast.error("Identity required to follow.");
    
    if (isFollowing) {
      const { error } = await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId);
      
      if (!error) {
        setIsFollowing(false);
        toast.error("Removed from Circle");
        fetchProfileAndContent(); // Refresh content (to hide private clips)
      }
    } else {
      const { error } = await supabase.from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetId });
      
      if (!error) {
        setIsFollowing(true);
        toast.success("Added to Circle");
        fetchProfileAndContent(); // Refresh content (to show private clips)
      }
    }
  };

  const startDispatch = () => {
    if (!currentUser) return toast.error("Identity required to message.");
    navigate(`/chat?userId=${targetId}`);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#fdfdfc] dark:bg-[#0a0a0a]">
      <div className="w-12 h-12 border-t-2 border-magazine-accent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="pt-40 pb-32 px-6 max-w-[1400px] mx-auto min-h-screen">
      {/* Editorial Profile Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-24 gap-12">
        <div className="max-w-3xl">
          <div className="flex items-center gap-6 mb-8">
             <div className="w-24 h-24 rounded-full border border-gray-100 dark:border-gray-900 overflow-hidden shadow-2xl">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt="Curator Avatar" />
                ) : (
                    <div className="w-full h-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300">
                        <FiUser size={40} />
                    </div>
                )}
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] uppercase tracking-[0.5em] text-magazine-accent font-black mb-1">Authenticated Curator</span>
               <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400">ID: {targetId?.slice(0,8)}...</span>
             </div>
          </div>
          
          <h1 className="font-serif text-7xl md:text-9xl uppercase tracking-tighter mb-8 leading-[0.8]">
            {profile?.username || 'Anonymous'}
          </h1>
          <p className="font-serif italic text-2xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
            {profile?.bio || 'This curator has not yet published a manifesto.'}
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4">
          {!isOwnProfile ? (
            <>
              <button 
                onClick={handleFollow}
                className={`px-10 py-5 text-[10px] uppercase tracking-[0.3em] font-black transition-all flex items-center gap-3 ${
                  isFollowing 
                    ? 'border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-black dark:hover:text-white' 
                    : 'bg-black dark:bg-white text-white dark:text-black shadow-2xl hover:bg-magazine-accent'
                }`}
              >
                {isFollowing ? <><FiUserCheck /> In Circle</> : <><FiUserPlus /> Follow Curator</>}
              </button>

              <button 
                onClick={startDispatch}
                className="px-8 py-5 border border-gray-200 dark:border-gray-800 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center gap-3"
              >
                <FiMessageSquare size={16} />
                <span className="text-[10px] uppercase tracking-[0.3em] font-black hidden sm:block">Dispatch</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => navigate('/settings')}
              className="px-10 py-5 border border-gray-200 dark:border-gray-800 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
            >
              <FiSettings />
              <span className="text-[10px] uppercase tracking-[0.3em] font-black">Refine Dossier</span>
            </button>
          )}
        </div>
      </div>

      <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-900 mb-16" />

      {/* Content Section: Gallery vs Privacy Wall */}
      {(!isOwnProfile && profile?.is_private && !isFollowing) ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="py-40 border border-dashed border-gray-200 dark:border-gray-800 text-center flex flex-col items-center bg-gray-50/30 dark:bg-white/[0.02]"
        >
          <div className="w-20 h-20 bg-white dark:bg-black rounded-full flex items-center justify-center mb-10 shadow-premium">
            <FiLock className="text-magazine-accent" size={32} />
          </div>
          <h2 className="font-serif text-4xl italic mb-4">Anthology Encrypted</h2>
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 max-w-xs leading-loose">
            Access to this private collection requires an established connection in the curator's circle.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {clips.length > 0 ? clips.map((clip, index) => (
            <motion.div 
              key={clip.id} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group relative"
            >
              <div className="aspect-[3/4] bg-gray-50 dark:bg-[#050505] border border-gray-100 dark:border-gray-900 overflow-hidden relative transition-all duration-700 group-hover:shadow-3xl">
                {clip.type === 'image' ? (
                  <img 
                    src={clip.content} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[1.5s] ease-out" 
                    alt="Gallery item"
                  />
                ) : (
                  <div className="p-12 h-full flex items-center justify-center text-center font-serif italic text-xl leading-relaxed text-gray-700 dark:text-gray-300">
                    "{clip.content}"
                  </div>
                )}
                
                {/* Visual Overlay on Hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
              </div>
              <div className="mt-6 flex justify-between items-baseline border-t border-gray-50 dark:border-gray-900 pt-4">
                <span className="text-[9px] uppercase tracking-[0.4em] text-magazine-accent font-bold">{clip.type}</span>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">{new Date(clip.timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-60 text-center">
                <span className="font-serif italic text-3xl text-gray-200 dark:text-gray-800">The curator's vault is currently silent.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;