'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Hand, Users, MessageSquare, 
  Send, X, Subtitles, MonitorUp, MoreVertical, Info, Shapes, Shield, BarChart2 
} from 'lucide-react';

export default function Meeting() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('id');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [mediaEnabled, setMediaEnabled] = useState({ audio: false, video: false });
  const [activeTab, setActiveTab] = useState<'chat' | 'peserta' | 'polling' | null>('chat');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (!meetingId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const newSocket = io(`ws://${window.location.hostname}:3000/meetings`, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('meeting:join', { meetingId });
    });

    newSocket.on('meeting:state', (data) => {
      setParticipants(data.participants);
    });

    newSocket.on('participant:joined', (data) => {
      setParticipants(prev => {
        if (prev.find(p => p.socketId === data.socketId)) return prev;
        return [...prev, data];
      });
    });

    newSocket.on('participant:left', (data) => {
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
    });

    newSocket.on('chat:message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [meetingId, router]);

  const toggleMedia = async (type: 'audio' | 'video') => {
    const newVideoState = type === 'video' ? !mediaEnabled.video : mediaEnabled.video;
    const newAudioState = type === 'audio' ? !mediaEnabled.audio : mediaEnabled.audio;

    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      let stream: MediaStream | null = null;
      if (newVideoState || newAudioState) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: newVideoState,
          audio: newAudioState,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } else {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }

      setLocalStream(stream);
      setMediaEnabled({ video: newVideoState, audio: newAudioState });

      if (socket) {
        socket.emit('media:toggle', { meetingId, type, enabled: type === 'video' ? newVideoState : newAudioState });
      }
    } catch (err) {
      console.error('Error accessing media devices.', err);
      alert('Gagal mengakses kamera/mic.');
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && chatInput.trim()) {
      socket.emit('chat:message', { meetingId, message: chatInput });
      setChatInput('');
    }
  };

  if (!meetingId) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Meeting ID provided.</h2>
        <button onClick={() => router.push('/workspace')}>Back to Workspace</button>
      </main>
    );
  }

  const handleCopyId = () => {
    if (meetingId) {
      navigator.clipboard.writeText(meetingId);
      alert('Meeting ID copied to clipboard!');
    }
  };

  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const colors = {
    bgApp: '#ffffff',
    bgBottomBar: '#858a93',
    bgDarkNavy: '#212a3e',
    bgSidebar: '#e4e6ea',
    bgActiveTab: '#175073',
    red: '#ff5c5c',
    blueHighlight: '#00d2ff',
    chatReceived: '#8f95a3',
    chatSent: '#2a6a8b',
    chatInputBg: '#7e838f',
  };

  // Combine local user with remote participants (filtering out our own socket connection)
  const remoteParticipants = participants.filter(p => p.socketId !== socket?.id);
  
  const displayParticipants = [
    { isLocal: true, name: 'Anda', id: 'local' },
    ...remoteParticipants.map(p => ({ isLocal: false, name: p.user?.name || `User ${p.socketId?.substring(0,5)}`, id: p.socketId }))
  ];

  return (
    <main style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: colors.bgApp, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Main Content Area (Takes remaining space above bottom bar) */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', width: '100%', overflow: 'hidden' }}>
        
        {/* Video Grid Area */}
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: activeTab ? 'calc(100% - 380px)' : '100%', transition: 'all 0.3s ease' }}>
           <div style={{ width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignContent: 'center', justifyContent: 'center' }}>
              
              {/* Participant Cards */}
              {displayParticipants.map((p, index) => {
                const isActiveSpeaker = index === 0;
                const isSingle = displayParticipants.length === 1;

                return (
                  <div key={p.id} style={{ 
                    position: 'relative', 
                    background: colors.bgDarkNavy, 
                    borderRadius: '24px', 
                    overflow: 'hidden', 
                    flex: isSingle ? '1 1 100%' : '1 1 calc(50% - 0.5rem)',
                    maxWidth: isSingle ? 'calc((100vh - 120px) * 16 / 9)' : 'calc((100vh - 120px) * 16 / 9 / 2)',
                    maxHeight: isSingle ? '100%' : 'calc(50% - 0.5rem)',
                    aspectRatio: '16/9',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: isActiveSpeaker ? `3px solid ${colors.blueHighlight}` : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}>
                    
                    {p.isLocal ? (
                      <>
                        <video 
                          ref={localVideoRef} 
                          autoPlay 
                          muted 
                          playsInline 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: mediaEnabled.video ? 'block' : 'none', transform: 'scaleX(-1)' }} 
                        />
                        {!mediaEnabled.video && (
                           <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#31415e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid #475a7c' }}>
                              Anda
                           </div>
                        )}
                      </>
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#31415e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid #475a7c' }}>
                         {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Mute Icon top right */}
                    {(!p.isLocal || !mediaEnabled.audio) && (
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MicOff size={16} color={colors.red} />
                      </div>
                    )}

                    {/* Name Badge bottom left */}
                    <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isActiveSpeaker && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.blueHighlight }}></span>}
                      <div style={{ color: 'white', background: 'rgba(0,0,0,0.4)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem' }}>
                        {p.name}
                      </div>
                    </div>
                  </div>
                );
              })}

           </div>
        </div>

        {/* Top Header / Info */}
        <div style={{ position: 'absolute', top: 0, left: 0, padding: '1.25rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
           <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 500, color: 'white' }}>Meeting</h2>
           <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', color: 'white' }} onClick={handleCopyId} title="Copy Full Meeting ID">
              <span style={{ fontSize: '0.875rem', marginRight: '0.5rem', fontFamily: 'monospace' }}>{meetingId}</span>
              <span style={{ fontSize: '0.75rem', background: '#3c4043', padding: '2px 6px', borderRadius: '4px' }}>Copy ID</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '50px', color: 'white' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#eab308' }}></span>
              {isConnected ? 'Connected' : 'Connecting...'}
           </div>
        </div>

        {/* Sidebar */}
        {activeTab && (
           <div style={{ width: '380px', background: colors.bgSidebar, color: '#3c4043', display: 'flex', flexDirection: 'column', position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', padding: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#4a4d55' }}>Pesan dalam panggilan</h3>
                 <button onClick={() => setActiveTab(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8f95a3', padding: '0' }}>
                    <X size={24} />
                 </button>
              </div>
              
              {/* Tab Selector */}
              <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
                <div style={{ background: colors.bgDarkNavy, borderRadius: '16px', display: 'flex', padding: '0.25rem' }}>
                  <button onClick={() => setActiveTab('peserta')} style={{ flex: 1, background: activeTab === 'peserta' ? colors.bgActiveTab : 'transparent', color: 'white', border: 'none', borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <Users size={20} />
                    <span style={{ fontSize: '0.75rem' }}>Peserta</span>
                  </button>
                  <button onClick={() => setActiveTab('chat')} style={{ flex: 1, background: activeTab === 'chat' ? colors.bgActiveTab : 'transparent', color: 'white', border: 'none', borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <MessageSquare size={20} />
                    <span style={{ fontSize: '0.75rem' }}>Chat</span>
                  </button>
                  <button onClick={() => setActiveTab('polling')} style={{ flex: 1, background: activeTab === 'polling' ? colors.bgActiveTab : 'transparent', color: 'white', border: 'none', borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <BarChart2 size={20} />
                    <span style={{ fontSize: '0.75rem' }}>Polling</span>
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              {activeTab === 'chat' && (
                 <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                       {messages.map((m, i) => {
                          const isMe = m.senderId === localStorage.getItem('token'); // Simplification for demo
                          return (
                          <div key={i} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '0.75rem', alignItems: 'flex-start' }}>
                             <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.bgDarkNavy, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem' }}>
                                {m.sender?.name?.charAt(0) || 'U'}
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                                   {isMe ? (
                                      <>
                                        <span style={{ fontSize: '0.75rem', color: '#8f95a3' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <strong style={{ fontSize: '0.875rem', color: '#4a4d55' }}>Anda</strong>
                                      </>
                                   ) : (
                                      <>
                                        <strong style={{ fontSize: '0.875rem', color: '#4a4d55' }}>{m.sender?.name || `User ${m.senderId?.substring(0,5)}`}</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#8f95a3' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </>
                                   )}
                                </div>
                                <div style={{ background: isMe ? colors.chatSent : colors.chatReceived, color: 'white', padding: '0.75rem 1rem', borderRadius: '16px', borderTopRightRadius: isMe ? '4px' : '16px', borderTopLeftRadius: !isMe ? '4px' : '16px', fontSize: '0.875rem', lineHeight: '1.5' }}>
                                   {m.message}
                                </div>
                             </div>
                          </div>
                       )})}
                    </div>
                    <form onSubmit={sendChat} style={{ padding: '1.5rem' }}>
                       <div style={{ background: colors.chatInputBg, borderRadius: '50px', display: 'flex', alignItems: 'center', padding: '0.5rem 0.5rem 0.5rem 1.5rem' }}>
                         <input 
                            type="text" 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Ketik pesan..."
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.875rem' }}
                         />
                         <button type="submit" disabled={!chatInput.trim()} style={{ background: 'none', border: 'none', cursor: chatInput.trim() ? 'pointer' : 'default', color: chatInput.trim() ? '#8ab4f8' : '#a1a8b5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
                            <Send size={20} />
                         </button>
                       </div>
                       <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.65rem', color: '#8f95a3' }}>
                         Pesan hanya dapat dilihat oleh peserta dalam panggilan
                       </div>
                    </form>
                 </>
              )}

              {/* Other Tabs */}
              {activeTab === 'peserta' && (
                 <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors.bgDarkNavy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 500 }}>
                          A
                       </div>
                       <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#4a4d55' }}>Anda (Host)</span>
                    </div>
                    {remoteParticipants.length === 0 && <p style={{ color: '#8f95a3', fontSize: '0.875rem', marginTop: '1rem' }}>Menunggu orang lain bergabung...</p>}
                    {remoteParticipants.map((p, i) => {
                       const name = p.user?.name || `User ${p.socketId?.substring(0,5)}`;
                       return (
                       <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors.bgDarkNavy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 500 }}>
                             {name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#4a4d55' }}>{name}</span>
                       </div>
                    )})}
                 </div>
              )}
              {activeTab === 'polling' && <div style={{ padding: '1.5rem', color: '#8f95a3', fontSize: '0.875rem', textAlign: 'center' }}>Fitur Polling akan segera hadir...</div>}
           </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: colors.bgBottomBar, color: '#f1f3f4', flexShrink: 0, zIndex: 20 }}>
         
         <div style={{ width: '250px', fontSize: '1rem', fontWeight: 500, display: 'flex', gap: '0.75rem' }}>
            <span>Sinkronisasi Desain</span>
            <span style={{ color: '#d1d5db' }}>|</span>
            <span>{currentTime}</span>
         </div>

         <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => toggleMedia('audio')} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: mediaEnabled.audio ? colors.bgDarkNavy : colors.bgDarkNavy, color: mediaEnabled.audio ? 'white' : colors.red, transition: 'all 0.2s' }}>
               {mediaEnabled.audio ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button onClick={() => toggleMedia('video')} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: mediaEnabled.video ? colors.bgDarkNavy : colors.bgDarkNavy, color: mediaEnabled.video ? 'white' : colors.red, transition: 'all 0.2s' }}>
               {mediaEnabled.video ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bgDarkNavy, color: 'white', transition: 'all 0.2s' }}>
               <Subtitles size={20} />
            </button>
            <button style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bgDarkNavy, color: 'white', transition: 'all 0.2s' }}>
               <Hand size={20} />
            </button>
            <button style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bgDarkNavy, color: 'white', transition: 'all 0.2s' }}>
               <MonitorUp size={20} />
            </button>
            <button style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bgDarkNavy, color: 'white', transition: 'all 0.2s' }}>
               <MoreVertical size={20} />
            </button>
            <button onClick={() => router.push('/workspace')} style={{ width: '64px', height: '44px', borderRadius: '22px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.red, color: 'white', marginLeft: '0.5rem' }}>
               <PhoneOff size={20} />
            </button>
         </div>

         <div style={{ width: '250px', display: 'flex', justifyContent: 'flex-end', gap: '1rem', color: '#e4e6ea' }}>
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><Info size={20} /></button>
            <button onClick={() => setActiveTab(activeTab === 'peserta' ? null : 'peserta')} style={{ position: 'relative', background: 'none', border: 'none', color: activeTab === 'peserta' ? colors.bgActiveTab : 'inherit', cursor: 'pointer' }}>
               <Users size={20} />
               <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#8ab4f8', color: '#202124', fontSize: '0.6rem', fontWeight: 'bold', width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {displayParticipants.length}
               </span>
            </button>
            <button onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')} style={{ background: 'none', border: 'none', color: activeTab === 'chat' ? colors.bgActiveTab : 'inherit', cursor: 'pointer' }}><MessageSquare size={20} /></button>
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><Shapes size={20} /></button>
            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><Shield size={20} /></button>
         </div>

      </div>
    </main>
  );
}
