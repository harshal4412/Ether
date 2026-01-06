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
  // We now pull 'username' from the URL instead of 'userId'
  const { username } = useParams(); 
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [clips, setClips] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedTargetId, setResolvedTargetId] = useState(null);

  // New states for follower/following counts
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Determine if we are viewing our own profile based on the URL vs Current User
  const isOwnProfile = !username || (currentUser && (username === (currentUser.user_metadata?.username || currentUser.user_metadata?.display_name)));

  useEffect(() => {
    const resolveIdentityAndFetch = async () => {
      setLoading(true);
      let targetId = null;

      try {
        if (!username) {
          // Case: /profile (Looking at self)
          if (!currentUser) {
            navigate('/');
            return;
          }
          targetId = currentUser.id;
        } else {
          // Case: /profile/:username
          const { data: profileLookup, error: lookupError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .maybeSingle();

          if (lookupError) throw lookupError;

          if (!profileLookup) {
            // Fallback: Check if the 'username' provided is actually a UUID
            const { data: idLookup } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', username)
              .maybeSingle();

            if (idLookup) {
              targetId = idLookup.id;
              setProfile(idLookup);
            } else {
              toast.error("Curator not found in archive.");
              setLoading(false);
              return;
            }
          } else {
            targetId = profileLookup.id;
            setProfile(profileLookup);
          }
        }

        setResolvedTargetId(targetId);
        
        // Fetch everything after we have a valid ID
        if (targetId) {
          await fetchProfileAndContent(targetId);
          await fetchFollowCounts(targetId);
          if (currentUser && targetId !== currentUser.id) {
            await checkFollowStatus(targetId);
          }
        }
      } catch (err) {
        console.error("Identity resolution error:", err);
        toast.error("Archive connection failed.");
      } finally {
        setLoading(false);
      }
    };

    resolveIdentityAndFetch();
  }, [username, currentUser, navigate]);

  const fetchFollowCounts = async (targetId) => {
    try {
      // Fetch followers count (where profile is being followed)
      const { count: followers, error: err1 } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetId);

      // Fetch following count (where profile is the one following)
      const { count: following, error: err2 } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetId);

      if (!err1) setFollowerCount(followers || 0);
      if (!err2) setFollowingCount(following || 0);
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  };

  const checkFollowStatus = async (targetId) => {
    const { data } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetId)
      .single();
    setIsFollowing(!!data);
  };

  const fetchProfileAndContent = async (targetId) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();
      
      if (profileError && profileError.code === 'PGRST116') {
         setProfile({ username: `Curator_${targetId.slice(0, 5)}`, is_private: false });
      } else if (profileError) {
         throw profileError;
      } else {
         setProfile(profileData);
      }

      let hasAccess = (currentUser?.id === targetId);
      
      if (!hasAccess) {
        const { data: followData } = currentUser ? await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId)
          .single() : { data: null };

        hasAccess = !profileData?.is_private || !!followData;
      }

      if (hasAccess) {
        const { data: clipsData, error: clipsError } = await supabase
          .from('clips')
          .select('*')
          .eq('user_id', targetId)
          .order('timestamp', { ascending: false });
        
        if (!clipsError) setClips(clipsData || []);
      }
    } catch (err) {
      console.error("Error fetching dossier:", err);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return toast.error("Identity required to follow.");
    const targetId = resolvedTargetId;
    
    if (isFollowing) {
      const { error } = await supabase.from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId);
      
      if (!error) {
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1)); // Optimistic update
        toast.error("Removed from Circle");
      }
    } else {
      const { error } = await supabase.from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetId });
      
      if (!error) {
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1); // Optimistic update
        toast.success("Added to Circle");
      }
    }
  };

  const startDispatch = () => {
    if (!currentUser) return toast.error("Identity required to message.");
    navigate(`/chat?userId=${resolvedTargetId}`);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#fdfdfc] dark:bg-[#0a0a0a]">
      <div className="w-12 h-12 border-t-2 border-magazine-accent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="pt-40 pb-32 px-6 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-24 gap-12">
        <div className="max-w-3xl">
          <div className="flex items-center gap-6 mb-8">
             <div className="w-24 h-24 rounded-full border border-gray-100 dark:border-gray-900 overflow-hidden shadow-2xl bg-white dark:bg-black">
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
               <div className="flex items-center gap-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-lg font-serif italic leading-none">{followingCount}</span>
                    <span className="text-[7px] uppercase tracking-widest text-gray-400 mt-1">Following</span>
                  </div>
                  <div className="w-[1px] h-4 bg-gray-100 dark:bg-gray-800" />
                  <div className="flex flex-col">
                    <span className="text-lg font-serif italic leading-none">{followerCount}</span>
                    <span className="text-[7px] uppercase tracking-widest text-gray-400 mt-1">Followers</span>
                  </div>
               </div>
             </div>
          </div>
          
          <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl uppercase tracking-tighter mb-8 leading-[0.8] break-words">
            {profile?.username || 'Anonymous'}
          </h1>
          <p className="font-serif italic text-2xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
            {profile?.bio || 'This curator has not yet published a manifesto.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {resolvedTargetId !== currentUser?.id ? (
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

      {(resolvedTargetId !== currentUser?.id && profile?.is_private && !isFollowing) ? (
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
                  <div className="p-8 h-full flex items-center justify-center text-center font-serif italic text-xl leading-relaxed text-gray-700 dark:text-gray-300 overflow-hidden">
                    <span className="line-clamp-6">"{clip.content}"</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
              </div>
              <div className="mt-6 flex justify-between items-baseline border-t border-gray-50 dark:border-gray-900 pt-4">
                <span className="text-[9px] uppercase tracking-[0.4em] text-magazine-accent font-bold">{clip.type}</span>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">
                    {clip.timestamp ? new Date(clip.timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recent'}
                </span>
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