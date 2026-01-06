import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FiSend, FiUser, FiHash, FiMessageSquare, FiPlus, FiEdit2, FiTrash2, FiImage, FiMusic, FiVideo, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Chat = ({ user }) => {
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // New State for Unread Badges
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const [editingMessage, setEditingMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Fetch Contacts + Handle External Target from URL
  useEffect(() => {
    if (user) {
      fetchContacts();
      fetchInitialUnreadCounts();
    }
  }, [user, targetUserId]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // 1. Get all unique receiver_ids and sender_ids from the messages table involving the current user
      const { data: sentMsg } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', user.id);

      const { data: receivedMsg } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id);

      // 2. Combine and get unique IDs
      const contactIds = [
        ...new Set([
          ...(sentMsg?.map(m => m.receiver_id) || []),
          ...(receivedMsg?.map(m => m.sender_id) || [])
        ])
      ];

      // 3. Fetch profiles for all these IDs
      let { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', contactIds);

      if (error) throw error;

      let contacts = profiles || [];

      // 4. Handle External Target from URL (so it shows up even if no messages yet)
      if (targetUserId) {
        const isAlreadyInContacts = contacts.some(c => c.id === targetUserId);
        if (!isAlreadyInContacts) {
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', targetUserId)
            .single();

          if (targetProfile) {
            contacts = [targetProfile, ...contacts];
            setActiveChannel(targetProfile);
          }
        } else {
          const target = contacts.find(c => c.id === targetUserId);
          if (target) setActiveChannel(target);
        }
      }

      setChannels(contacts);
    } catch (err) {
      console.error("Error fetching contacts:", err);
      toast.error("Failed to load correspondence");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch all unread counts for the sidebar on load
  const fetchInitialUnreadCounts = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (data) {
      const counts = {};
      data.forEach(msg => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  };

  // NEW: Function to mark messages as read
  const markAsRead = async (channelId) => {
    if (!user || !channelId) return;
    
    // 1. Update Local State immediately so the badge vanishes
    setUnreadCounts(prev => {
      const updated = { ...prev };
      updated[channelId] = 0; 
      return updated;
    });

    // 2. Update Database
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', channelId)    // Messages FROM them
      .eq('receiver_id', user.id)    // TO me
      .eq('is_read', false);
  };

  // 2. Load Messages & Subscribe to Real-time
  useEffect(() => {
    if (!user) return;

    // Listen to ALL incoming messages to update unread counts globally
    const globalChannel = supabase
      .channel('global_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, payload => {
        const msg = payload.new;
        
        // If it's for me and not from the currently open chat, increment badge
        if (msg.receiver_id === user.id && (!activeChannel || msg.sender_id !== activeChannel.id)) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
          }));
        }

        // Handle the active chat logic
        if (activeChannel) {
          if ((msg.sender_id === activeChannel.id && msg.receiver_id === user.id) ||
              (msg.sender_id === user.id && msg.receiver_id === activeChannel.id)) {
            setMessages(prev => [...prev, msg]);
            // If we are looking at this chat, immediately mark as read
            if (msg.sender_id === activeChannel.id) markAsRead(activeChannel.id);
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      }, payload => {
        // Update message state (handles read receipts, edits, and unsends)
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        
        // If a message was updated to "read" while we are looking at it, ensure local badge is cleared
        if (payload.new.is_read && payload.new.receiver_id === user.id) {
           setUnreadCounts(prev => {
             const newCounts = { ...prev };
             newCounts[payload.new.sender_id] = 0;
             return newCounts;
           });
        }
      })
      .subscribe();

    const fetchMessages = async () => {
      if (!activeChannel) return;
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChannel.id}),and(sender_id.eq.${activeChannel.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        markAsRead(activeChannel.id);
      }
    };

    fetchMessages();

    return () => { supabase.removeChannel(globalChannel); };
  }, [activeChannel, user]);

  // 3. Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages]);

  // --- MEDIA UPLOAD ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChannel) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      let type = 'text';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'music';

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      const messageObj = {
        sender_id: user.id,
        receiver_id: activeChannel.id,
        text: file.name,
        type: type,
        file_url: publicUrl,
        is_read: false
      };

      const { error: insertError } = await supabase.from('messages').insert([messageObj]);
      if (insertError) throw insertError;

      toast.success("Media dispatched");
    } catch (error) {
      console.error("Upload/Insert error:", error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- UPGRADED SEND MESSAGE ---
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    if (editingMessage) {
      const { error } = await supabase
        .from('messages')
        .update({ text: newMessage.trim(), is_edited: true })
        .eq('id', editingMessage.id);
      
      if (error) {
        toast.error("Update failed");
      }
      setEditingMessage(null);
    } else {
      const messageObj = {
        sender_id: user.id,
        receiver_id: activeChannel.id,
        text: newMessage.trim(),
        type: 'text',          
        file_url: null,        
        is_read: false
      };
      const { error } = await supabase.from('messages').insert([messageObj]);
      if (error) {
        console.error("Dispatch Error:", error);
        toast.error("Dispatch Failed");
      }
    }
    setNewMessage('');
  };

  // --- UNSEND ---
  const unsendMessage = async (msgId) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, text: "This message was unsent", file_url: null })
      .eq('id', msgId);

    if (error) toast.error("Unsend failed");
    else toast("Message unsent", { icon: '🚫' });
  };

  return (
    <div className="pt-20 h-screen flex bg-[#fdfdfc] dark:bg-[#050505] transition-colors duration-500 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-20 md:w-80 border-r border-gray-100 dark:border-gray-900 flex flex-col bg-white/50 dark:bg-black/50 backdrop-blur-md">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-900">
          <h2 className="font-serif text-xl uppercase tracking-tighter hidden md:block">Dispatches</h2>
          <FiHash className="md:hidden mx-auto text-gray-400" size={20} />
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-[10px] uppercase tracking-widest text-gray-400">Loading...</div>
          ) : channels.length > 0 ? (
            channels.map(contact => (
              <button 
                key={contact.id}
                onClick={() => { 
                  setActiveChannel(contact); 
                  setEditingMessage(null); 
                  markAsRead(contact.id); // Trigger cleanup on selection
                }}
                className={`w-full p-4 md:p-6 flex items-center gap-4 transition-all relative group ${
                  activeChannel?.id === contact.id ? 'bg-gray-50 dark:bg-white/5' : 'hover:bg-gray-50/50 dark:hover:bg-white/2'
                }`}
              >
                {activeChannel?.id === contact.id && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-full bg-magazine-accent" />
                )}
                <div className="relative flex-shrink-0 mx-auto md:mx-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-100 dark:border-gray-800 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                    {contact.avatar_url ? (
                      <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400"><FiUser /></div>
                    )}
                  </div>
                  {/* UNREAD BADGE */}
                  {unreadCounts[contact.id] > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-magazine-accent text-white text-[8px] flex items-center justify-center rounded-full font-black animate-bounce">
                      {unreadCounts[contact.id]}
                    </span>
                  )}
                </div>
                <div className="hidden md:block text-left flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate w-32">{contact.username || 'Anonymous'}</p>
                    {unreadCounts[contact.id] > 0 && (
                       <span className="text-[7px] bg-magazine-accent/10 text-magazine-accent px-1.5 py-0.5 rounded font-bold tracking-tighter">NEW</span>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest italic">Curator</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 leading-relaxed">No correspondents found.</p>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-black">
        <AnimatePresence mode="wait">
          {activeChannel ? (
            <motion.div key={activeChannel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between bg-white/30 dark:bg-black/30 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] uppercase tracking-[0.5em] font-black text-magazine-accent">To: {activeChannel.username}</span>
                </div>
                <span className="hidden sm:block text-[8px] uppercase tracking-widest text-gray-400">Encrypted Correspondence</span>
              </div>

              <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 no-scrollbar">
                {messages.map((m, i) => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <motion.div 
                      key={m.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className="max-w-[80%] md:max-w-md relative">
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className="flex items-center gap-1">
                            <p className={`text-[8px] uppercase tracking-widest text-gray-400`}>
                              {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </p>
                            {isMe && !m.is_deleted && (
                              <div className="flex ml-1">
                                <div className={`flex -space-x-1 ${m.is_read ? 'text-black dark:text-white' : 'text-gray-300'}`}>
                                  <FiCheck size={10} strokeWidth={4} />
                                  <FiCheck size={10} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </div>
                          {m.is_edited && !m.is_deleted && <span className="text-[7px] uppercase text-magazine-accent">Edited</span>}
                        </div>

                        <div className={`p-4 text-sm font-serif leading-relaxed shadow-sm transition-all ${
                          m.is_deleted ? 'opacity-40 italic border border-dashed border-gray-300' :
                          isMe ? 'bg-black text-white dark:bg-white dark:text-black rounded-l-2xl rounded-tr-2xl' : 
                          'bg-gray-100 dark:bg-gray-900 rounded-r-2xl rounded-tl-2xl'
                        }`}>
                          {!m.is_deleted && m.file_url && (
                            <div className="mb-3 overflow-hidden rounded-lg">
                              {m.type === 'image' && <img src={m.file_url} className="w-full object-cover max-h-64" alt="attachment" />}
                              {m.type === 'video' && <video src={m.file_url} controls className="w-full max-h-64" />}
                              {m.type === 'music' && <audio src={m.file_url} controls className="w-full scale-90" />}
                            </div>
                          )}
                          {m.text}
                        </div>

                        {isMe && !m.is_deleted && (
                          <div className="absolute top-0 -left-12 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 p-1">
                            <button onClick={() => { setEditingMessage(m); setNewMessage(m.text); }} className="p-1 hover:text-magazine-accent"><FiEdit2 size={14}/></button>
                            <button onClick={() => unsendMessage(m.id)} className="p-1 hover:text-red-500"><FiTrash2 size={14}/></button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              <form onSubmit={sendMessage} className="p-6 md:p-8 border-t border-gray-100 dark:border-gray-900 bg-[#fdfdfc] dark:bg-[#050505] shrink-0">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  {editingMessage && (
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-white/5 px-4 py-1 rounded-t-lg">
                      <span className="text-[8px] uppercase tracking-widest text-magazine-accent">Editing Dispatch</span>
                      <button onClick={() => {setEditingMessage(null); setNewMessage('');}} className="text-[8px] uppercase">Cancel</button>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*,audio/*" />
                    <button type="button" onClick={() => fileInputRef.current.click()} className={`text-gray-400 hover:text-black dark:hover:text-white transition-colors ${uploading ? 'animate-pulse' : ''}`}>
                      <FiPlus size={22} />
                    </button>
                    <input 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={uploading ? "Uploading..." : "Compose dispatch..."}
                      className="flex-1 bg-transparent outline-none font-serif text-base md:text-lg italic placeholder:text-gray-300"
                      disabled={uploading}
                    />
                    <button type="submit" disabled={uploading} className="w-12 h-12 md:w-14 md:h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg">
                      <FiSend size={18} />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-10">
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-16 h-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiMessageSquare className="text-gray-300" size={24} />
                </div>
                <h3 className="font-serif text-xl italic mb-2">Private Correspondence</h3>
                <p className="text-[9px] uppercase tracking-[0.4em] text-gray-400 max-w-[200px] mx-auto leading-loose">Select a curator to begin</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Chat;