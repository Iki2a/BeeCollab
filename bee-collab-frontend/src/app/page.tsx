'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

const getApiBase = () => {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env && env.trim()) return env.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  return `http://${window.location.hostname}:3000`;
};

export default function Home() {
  const router = useRouter();
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [pingData, setPingData] = useState<string | null>(null);
  const [meetingCode, setMeetingCode] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasActiveMeeting, setHasActiveMeeting] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    const apiBase = getApiBase();
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetch(`${apiBase}/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async res => {
          if (res.ok) return res.json();
          if (res.status === 401) {
            handleLogout();
            return [];
          }
          const errorText = await res.text();
          console.error(`Failed to fetch meetings: ${res.status} ${errorText}`);
          return [];
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setHasActiveMeeting(true);
            setActiveMeetingId(data[0]?.id || null);
          }
        })
        .catch(err => {
          console.error('Error fetching meetings:', err);
        });
    }

    const checkBackend = async () => {
      try {
        const res = await fetch(`${apiBase}/`, { mode: 'cors' });
        if (res.ok) {
          setServerStatus('online');
          try {
            const data = await res.text();
            setPingData(data);
          } catch (e) {
            setPingData("Connected, but no text response.");
          }
        } else {
          setServerStatus('offline');
        }
      } catch (err) {
        setServerStatus('offline');
      }
    };

    checkBackend();

    // Update time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setHasActiveMeeting(false);
    setActiveMeetingId(null);
    router.refresh();
  };

  const handleJoin = async () => {
    if (meetingCode.trim()) {
      setLoading(true);
      setLoadingMessage('Menyiapkan ruang pertemuan...');
      
      const apiBase = getApiBase();
      const token = localStorage.getItem('token');
      try {
        // Resolve code or check if exists first to show loading state
        const res = await fetch(`${apiBase}/meetings/code/${meetingCode.trim()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          router.push(`/meeting/${data.id}`);
        } else {
          // If not found by code, maybe it's already an ID
          router.push(`/meeting/${meetingCode.trim()}`);
        }
      } catch (e) {
        // Fallback to direct push if check fails
        router.push(`/meeting/${meetingCode.trim()}`);
      }
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    title: 'Daily Meeting',
    duration: 60,
    maxParticipants: 10
  });
  const [newMeetingError, setNewMeetingError] = useState('');

  const handleCreateNewMeeting = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const maxParticipants = Number(newMeetingForm.maxParticipants);
    if (Number.isNaN(maxParticipants) || maxParticipants < 2 || maxParticipants > 10) {
      setNewMeetingError('Jumlah peserta harus antara 2 sampai 10.');
      return;
    }
    
    setLoading(true);
    setLoadingMessage('Menciptakan ruang pertemuan baru...');
    setNewMeetingError('');
    
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newMeetingForm.title,
          duration: Number(newMeetingForm.duration),
          maxParticipants
        })
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/meeting/${data.id}`);
      } else {
        setLoading(false);
        setNewMeetingError('Gagal membuat meeting. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setNewMeetingError('Terjadi kesalahan saat membuat meeting.');
    }
  };

  return (
    <div className={styles.lightThemeContainer}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 10.5V7C17 6.44772 16.5523 6 16 6H4C3.44772 6 3 6.44772 3 7V17C3 17.5523 3.44772 18 4 18H16C16.5523 18 17 17.5523 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="#00832d" />
            <path d="M17 10.5V7C17 6.44772 16.5523 6 16 6H4C3.44772 6 3 6.44772 3 7V17C3 17.5523 3.44772 18 4 18H16C16.5523 18 17 17.5523 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="url(#paint0_linear)" />
            <defs>
              <linearGradient id="paint0_linear" x1="12" y1="6" x2="12" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00E676" />
                <stop offset="1" stopColor="#00C853" />
              </linearGradient>
            </defs>
          </svg>
          BeeCollab
        </div>

        <div className={styles.headerRight}>
          <span className={styles.dateTime}>{currentTime}</span>
          {isLoggedIn ? (
            <button 
              className={styles.logoutBtn} 
              onClick={handleLogout}
              style={{ background: 'none', border: '1px solid #dadce0', color: '#d93025', fontWeight: 500, fontSize: '14px', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}
            >
              Logout
            </button>
          ) : (
            <button 
              className={styles.loginBtn} 
              onClick={() => router.push('/login')}
              style={{ background: 'none', border: 'none', color: '#1a73e8', fontWeight: 500, fontSize: '16px', cursor: 'pointer' }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.leftColumn}>
          <h1 className={styles.title}>Premium video meetings.<br />Now free for everyone.</h1>
          <p className={styles.subtitle}>
            We re-engineered the service we built for secure business meetings, BeeCollab, to make it free and available for all.
          </p>

          {isCreating ? (
            <div style={{ background: '#ffffff', border: '1px solid #dadce0', padding: '1.5rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#202124' }}>Buat Meeting Baru</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#3c4043', marginBottom: '0.5rem' }}>Nama Meeting</label>
                  <input type="text" value={newMeetingForm.title} onChange={e => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '1rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#3c4043', marginBottom: '0.5rem' }}>Durasi (menit)</label>
                    <input type="number" value={newMeetingForm.duration} onChange={e => setNewMeetingForm({ ...newMeetingForm, duration: parseInt(e.target.value) })} min="1" style={{ width: '100%', padding: '0.75rem', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '1rem' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#3c4043', marginBottom: '0.5rem' }}>Maks. Peserta</label>
                    <input type="number" value={newMeetingForm.maxParticipants} onChange={e => setNewMeetingForm({ ...newMeetingForm, maxParticipants: parseInt(e.target.value) })} min="2" max="10" style={{ width: '100%', padding: '0.75rem', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '1rem' }} />
                  </div>
                </div>
                {newMeetingError && (
                  <div style={{ color: '#d93025', background: '#fce8e6', border: '1px solid #fad2cf', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                    {newMeetingError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #dadce0', background: 'transparent', cursor: 'pointer', fontWeight: 500, color: '#3c4043' }}>Batal</button>
                  <button onClick={handleCreateNewMeeting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#1a73e8', color: 'white', cursor: 'pointer', fontWeight: 500 }}>Buat</button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.actionArea}>
              <button
                className={styles.newMeetingBtn}
                onClick={() => {
                  if (hasActiveMeeting && activeMeetingId) {
                    router.push(`/meeting/${activeMeetingId}`);
                    return;
                  }
                  setNewMeetingError('');
                  setIsCreating(true);
                }}
                title={hasActiveMeeting ? "Lanjutkan meeting aktif" : "Buat meeting baru"}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                </svg>
                {hasActiveMeeting ? 'Active Meeting' : 'New meeting'}
              </button>

              <div className={styles.inputGroup}>
                <span className={styles.keyboardIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Enter a code or link"
                  className={styles.codeInput}
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>

              <button
                className={styles.joinBtn}
                disabled={!meetingCode.trim()}
                onClick={handleJoin}
              >
                Join
              </button>
            </div>
          )}

          <div className={styles.divider}></div>
          <div className={styles.learnMore}>
            <a href="#" className={styles.learnMoreLink}>Learn more</a> about BeeCollab
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.carousel}>
            <Image
              src="/meet_illustration.png"
              alt="People connecting on a video call"
              width={360}
              height={240}
              className={styles.illustration}
            />
            <h2 className={styles.carouselTitle}>Get a link you can share</h2>
            <p className={styles.carouselText}>
              Click <strong>New meeting</strong> to get a link you can send to people you want to meet with
            </p>
          </div>
        </div>
      </main>

      <div className={styles.statusIndicator}>
        <div className={`${styles.statusDot} ${styles[serverStatus]}`}></div>
        <span>{serverStatus === 'checking' ? 'Connecting to server...' : serverStatus === 'online' ? 'System Online' : 'System Offline'}</span>
      </div>

      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          `}</style>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1a73e8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem'
          }}></div>
          <h2 style={{ color: '#202124', margin: '0 0 0.5rem 0', fontWeight: 500 }}>{loadingMessage}</h2>
          <p style={{ color: '#5f6368', margin: 0, fontSize: '0.875rem', animation: 'pulse 2s infinite' }}>Mohon tunggu sebentar...</p>
        </div>
      )}
    </div>
  );
}
