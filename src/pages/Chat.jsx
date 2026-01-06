import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FiSend, FiUser, FiCircle, FiHash, FiMessageSquare } from 'react-icons/fi';
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
  const scrollRef = useRef(null);

  // 1. Fetch Contacts (People you follow)
  useEffect(() => {
    if (user) fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('follows')
      .select('profiles:following_id(id, username, avatar_url)')
      .eq('follower_id', user.id);
    
    if (data) {
      const contacts = data.map(d => d.profiles).filter(Boolean);
      setChannels(contacts);
      
      // Auto-select if targetUserId is in URL
      if (targetUserId) {
        const target = contacts.find(c => c.id === targetUserId);
        if (target) setActiveChannel(target);
      }
    }
    setLoading(false);
  };

  // 2. Load Messages & Subscribe to Real-time
  useEffect(() => {
    if (!activeChannel || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChannel.id}),and(sender_id.eq.${activeChannel.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
      if (error) console.error("Fetch error:", error);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_${activeChannel.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === activeChannel.id && msg.receiver_id === user.id) ||
          (msg.sender_id === user.id && msg.receiver_id === activeChannel.id)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChannel, user]);

  // 3. Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    const messageObj = {
      sender_id: user.id,
      receiver_id: activeChannel.id,
      text: newMessage.trim(),
    };

    const { error } = await supabase.from('messages').insert([messageObj]);
    
    if (error) {
      toast.error("Dispatch Failed");
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className="pt-20 h-screen flex bg-[#fdfdfc] dark:bg-[#050505] transition-colors duration-500 overflow-hidden">
      
      {/* SIDEBAR: CORRESPONDENTS */}
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
                onClick={() => setActiveChannel(contact)}
                className={`w-full p-4 md:p-6 flex items-center gap-4 transition-all relative group ${
                  activeChannel?.id === contact.id 
                  ? 'bg-gray-50 dark:bg-white/5' 
                  : 'hover:bg-gray-50/50 dark:hover:bg-white/2'
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
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400">
                        <FiUser />
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden md:block text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate w-40">{contact.username || 'Anonymous'}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest italic">Curator</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 leading-relaxed">No correspondents found. Follow curators to start a dispatch.</p>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative bg-white dark:bg-black">
        <AnimatePresence mode="wait">
          {activeChannel ? (
            <motion.div 
              key={activeChannel.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between bg-white/30 dark:bg-black/30 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] uppercase tracking-[0.5em] font-black text-magazine-accent">To: {activeChannel.username}</span>
                </div>
                <span className="hidden sm:block text-[8px] uppercase tracking-widest text-gray-400">Encrypted Correspondence</span>
              </div>

              {/* Messages Grid */}
              <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 no-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-20 grayscale">
                    <p className="font-serif italic text-sm">Silence is the canvas of conversation...</p>
                  </div>
                )}
                {messages.map((m, i) => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <motion.div 
                      key={m.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[80%] md:max-w-md">
                        <p className={`text-[8px] uppercase tracking-widest mb-2 text-gray-400 ${isMe ? 'text-right' : 'text-left'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className={`p-4 text-sm font-serif leading-relaxed shadow-sm ${
                          isMe 
                          ? 'bg-black text-white dark:bg-white dark:text-black rounded-l-2xl rounded-tr-2xl' 
                          : 'bg-gray-100 dark:bg-gray-900 rounded-r-2xl rounded-tl-2xl'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={sendMessage} className="p-6 md:p-8 border-t border-gray-100 dark:border-gray-900 bg-[#fdfdfc] dark:bg-[#050505]">
                <div className="flex items-center gap-4 max-w-4xl mx-auto">
                  <input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Compose dispatch..."
                    className="flex-1 bg-transparent outline-none font-serif text-base md:text-lg italic placeholder:text-gray-300"
                  />
                  <button 
                    type="submit" 
                    className="w-12 h-12 md:w-14 md:h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg"
                  >
                    <FiSend size={18} />
                  </button>
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
                <p className="text-[9px] uppercase tracking-[0.4em] text-gray-400 max-w-[200px] mx-auto leading-loose">Select a curator from the sidebar to begin</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Chat;