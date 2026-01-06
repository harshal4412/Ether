import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FiSend, FiUser, FiHash, FiMessageSquare, FiPlus, FiEdit2, FiTrash2, FiImage, FiMusic, FiVideo, FiCheck, FiX, FiCheckSquare, FiSquare } from 'react-icons/fi';
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
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // NEW: Selection and Management State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const longPressTimer = useRef(null);

  const [editingMessage, setEditingMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({}); 

  const activeChannelRef = useRef(null);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
    // Reset selection when changing channels
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, [activeChannel]);

  useEffect(() => {
    if (user) {
      fetchContacts();
      fetchInitialUnreadCounts();
    }
  }, [user, targetUserId]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data: sentMsg } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id);
      const { data: receivedMsg } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id);

      const contactIds = [...new Set([...(sentMsg?.map(m => m.receiver_id) || []), ...(receivedMsg?.map(m => m.sender_id) || [])])];
      let { data: profiles, error } = await supabase.from('profiles').select('id, username, avatar_url').in('id', contactIds);
      if (error) throw error;

      let contacts = profiles || [];
      if (targetUserId) {
        const isAlreadyInContacts = contacts.some(c => c.id === targetUserId);
        if (!isAlreadyInContacts) {
          const { data: targetProfile } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', targetUserId).single();
          if (targetProfile) { contacts = [targetProfile, ...contacts]; setActiveChannel(targetProfile); }
        } else {
          const target = contacts.find(c => c.id === targetUserId);
          if (target) setActiveChannel(target);
        }
      }
      setChannels(contacts);
    } catch (err) { console.error(err); toast.error("Failed to load correspondence"); } finally { setLoading(false); }
  };

  const fetchInitialUnreadCounts = async () => {
    const { data } = await supabase.from('messages').select('sender_id, id, text, is_read').eq('receiver_id', user.id).eq('is_read', false);
    if (data) {
      const counts = {};
      data.forEach(msg => { counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1; });
      setUnreadCounts(counts);
    }
  };

  // --- DELETE LOGIC ---
  const handleHideMessages = async (ids) => {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    try {
      const { error } = await supabase.rpc('hide_messages_for_user', {
        message_ids: idsArray,
        user_uuid: user.id
      });
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => !idsArray.includes(m.id)));
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      toast.success("Messages removed from your view");
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const clearWholeChat = async () => {
    if (!window.confirm("Delete entire chat history for you?")) return;
    const allIds = messages.map(m => m.id);
    await handleHideMessages(allIds);
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // --- LONG PRESS GESTURE ---
  const startLongPress = (id) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelect(id);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // 2. Load Messages & Subscribe to Real-time
  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase
      .channel('global_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
        const msg = payload.new;
        const currentActive = activeChannelRef.current;
        
        if (msg.receiver_id === user.id) {
          if (!currentActive || msg.sender_id !== currentActive.id) {
            setUnreadCounts(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
          } else {
            await supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
            setUnreadCounts(prev => { const updated = { ...prev }; delete updated[currentActive.id]; return updated; });
          }
        }

        if (currentActive) {
          if ((msg.sender_id === currentActive.id && msg.receiver_id === user.id) || (msg.sender_id === user.id && msg.receiver_id === currentActive.id)) {
            const displayMsg = msg.receiver_id === user.id && msg.sender_id === currentActive.id ? { ...msg, is_read: true } : msg;
            setMessages(prev => [...prev, displayMsg]);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        if (payload.new.is_read && payload.new.receiver_id === user.id) {
           setUnreadCounts(prev => { const newCounts = { ...prev }; delete newCounts[payload.new.sender_id]; return newCounts; });
        }
      })
      .subscribe();

    const fetchMessages = async () => {
      if (!activeChannel) return;
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChannel.id}),and(sender_id.eq.${activeChannel.id},receiver_id.eq.${user.id})`)
        .not('hidden_from_users', 'cs', `{${user.id}}`) // FILTER OUT HIDDEN
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();
    return () => { supabase.removeChannel(globalChannel); };
  }, [activeChannel, user]);

  // (Intersection Observer Effect remains identical to your previous version)
  useEffect(() => {
    if (!user || !activeChannel) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;
            const message = messages.find(m => m.id === messageId);
            if (message && message.receiver_id === user.id && !message.is_read) {
              const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', messageId);
              if (!error) {
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_read: true } : m));
                setUnreadCounts(prev => {
                  const newCounts = { ...prev };
                  if (newCounts[message.sender_id]) {
                    newCounts[message.sender_id] -= 1;
                    if (newCounts[message.sender_id] <= 0) delete newCounts[message.sender_id];
                  }
                  return newCounts;
                });
              }
            }
          }
        });
      }, { root: null, threshold: 0.5 });
    Object.values(messageRefs.current).forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [messages, activeChannel, user]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

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
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
      const messageObj = { sender_id: user.id, receiver_id: activeChannel.id, text: file.name, type: type, file_url: publicUrl, is_read: false };
      const { error: insertError } = await supabase.from('messages').insert([messageObj]);
      if (insertError) throw insertError;
      toast.success("Media dispatched");
    } catch (error) { toast.error("Upload failed"); } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;
    if (editingMessage) {
      const { error } = await supabase.from('messages').update({ text: newMessage.trim(), is_edited: true }).eq('id', editingMessage.id);
      if (error) toast.error("Update failed");
      setEditingMessage(null);
    } else {
      const messageObj = { sender_id: user.id, receiver_id: activeChannel.id, text: newMessage.trim(), type: 'text', file_url: null, is_read: false };
      const { error } = await supabase.from('messages').insert([messageObj]);
      if (error) toast.error("Dispatch Failed");
    }
    setNewMessage('');
  };

  const unsendMessage = async (msgId) => {
    const { error } = await supabase.from('messages').update({ is_deleted: true, text: "This message was unsent", file_url: null }).eq('id', msgId);
    if (error) toast.error("Unsend failed"); else toast("Message unsent", { icon: '🚫' });
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
          {loading ? ( <div className="p-8 text-center text-[10px] uppercase tracking-widest text-gray-400">Loading...</div> ) : channels.length > 0 ? (
            channels.map(contact => (
              <button key={contact.id} onClick={() => setActiveChannel(contact)} className={`w-full p-4 md:p-6 flex items-center gap-4 transition-all relative group ${activeChannel?.id === contact.id ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
                {activeChannel?.id === contact.id && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-full bg-magazine-accent" />}
                <div className="relative flex-shrink-0 mx-auto md:mx-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-100 dark:border-gray-800 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                    {contact.avatar_url ? <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400"><FiUser /></div>}
                  </div>
                  {unreadCounts[contact.id] > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-magazine-accent text-white text-[8px] flex items-center justify-center rounded-full font-black">{unreadCounts[contact.id]}</span>}
                </div>
                <div className="hidden md:block text-left flex-1">
                  <div className="flex justify-between items-center"><p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate w-32">{contact.username || 'Anonymous'}</p></div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest italic">Curator</p>
                </div>
              </button>
            ))
          ) : ( <div className="p-8 text-center text-gray-400 text-[9px] uppercase">No correspondents found.</div> )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-black">
        <AnimatePresence mode="wait">
          {activeChannel ? (
            <motion.div key={activeChannel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* UPDATED HEADER WITH SELECTION TOOLS */}
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between bg-white/30 dark:bg-black/30 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                  {isSelectionMode ? (
                    <button onClick={() => setIsSelectionMode(false)} className="p-2 -ml-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                      <FiX size={20} />
                    </button>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.5em] font-black text-magazine-accent">To: {activeChannel.username}</span>
                  )}
                  {isSelectionMode && <span className="text-[10px] uppercase font-black tracking-widest">{selectedIds.size} Selected</span>}
                </div>
                
                <div className="flex items-center gap-3">
                  {isSelectionMode ? (
                    <>
                      <button 
                        onClick={() => setSelectedIds(selectedIds.size === messages.length ? new Set() : new Set(messages.map(m => m.id)))}
                        className="text-[8px] uppercase tracking-widest px-2 py-1 border border-gray-200 dark:border-gray-800 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                      >
                        {selectedIds.size === messages.length ? "Deselect All" : "Select All"}
                      </button>
                      <button onClick={() => handleHideMessages(Array.from(selectedIds))} className="text-red-500 p-2 hover:scale-110 transition-transform">
                        <FiTrash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setIsSelectionMode(true)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                        <FiCheckSquare size={18} />
                      </button>
                      <button onClick={clearWholeChat} className="text-gray-400 hover:text-red-500 transition-colors">
                        <FiTrash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 no-scrollbar">
                {messages.map((m, i) => {
                  const isMe = m.sender_id === user.id;
                  const isSelected = selectedIds.has(m.id);
                  return (
                    <motion.div 
                      key={m.id || i}
                      onMouseDown={() => startLongPress(m.id)}
                      onMouseUp={endLongPress}
                      onMouseLeave={endLongPress}
                      onTouchStart={() => startLongPress(m.id)}
                      onTouchEnd={endLongPress}
                      className={`flex items-center gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}
                    >
                      {isSelectionMode && (
                        <button onClick={() => toggleSelect(m.id)} className={`shrink-0 transition-colors ${isSelected ? 'text-magazine-accent' : 'text-gray-200 dark:text-gray-800'}`}>
                          {isSelected ? <FiCheckSquare size={20} /> : <FiSquare size={20} />}
                        </button>
                      )}

                      <div 
                        ref={(el) => { if (el && m.id) messageRefs.current[m.id] = el; }} 
                        data-message-id={m.id}
                        className="max-w-[80%] md:max-w-md relative"
                        onClick={() => isSelectionMode && toggleSelect(m.id)}
                      >
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <p className="text-[8px] uppercase tracking-widest text-gray-400">
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </p>
                          {isMe && !m.is_deleted && <div className={`flex -space-x-1 ${m.is_read ? 'text-black dark:text-white' : 'text-gray-300'}`}><FiCheck size={10} strokeWidth={4} /><FiCheck size={10} strokeWidth={4} /></div>}
                        </div>

                        <div className={`p-4 text-sm font-serif leading-relaxed shadow-sm transition-all ${
                          m.is_deleted ? 'opacity-40 italic border border-dashed border-gray-300' :
                          isSelected ? 'ring-2 ring-magazine-accent ring-inset' :
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

                        {isMe && !m.is_deleted && !isSelectionMode && (
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
                    <button type="button" onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                      <FiPlus size={22} />
                    </button>
                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={uploading ? "Uploading..." : "Compose dispatch..."} className="flex-1 bg-transparent outline-none font-serif text-base md:text-lg italic placeholder:text-gray-300" disabled={uploading} />
                    <button type="submit" disabled={uploading} className="w-12 h-12 md:w-14 md:h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg"><FiSend size={18} /></button>
                  </div>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-10">
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-16 h-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center mx-auto mb-6"><FiMessageSquare className="text-gray-300" size={24} /></div>
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