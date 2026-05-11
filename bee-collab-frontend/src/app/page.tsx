'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [pingData, setPingData] = useState<string | null>(null);
  const [meetingCode, setMeetingCode] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasActiveMeeting, setHasActiveMeeting] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetch(`http://${window.location.hostname}:3000/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch meetings');
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setHasActiveMeeting(true);
            setActiveMeetingId(data[0]?.id || null);
          }
        })
        .catch(console.error);
    }

    const checkBackend = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3000/`, { mode: 'cors' });
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

  const handleJoin = () => {
    if (meetingCode.trim()) {
      router.push(`/meeting/${meetingCode.trim()}`);
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    title: 'Daily Meeting',
    duration: 60,
    maxParticipants: 10
  });

  const handleCreateNewMeeting = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newMeetingForm.title,
          duration: Number(newMeetingForm.duration),
          maxParticipants: Number(newMeetingForm.maxParticipants)
        })
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/meeting/${data.id}`);
      }
    } catch (err) {
      console.error(err);
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
          <div className={styles.headerIcons}>
            <span title="Support">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
              </svg>
            </span>
            <span title="Settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
              </svg>
            </span>
          </div>
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
                    <input type="number" value={newMeetingForm.maxParticipants} onChange={e => setNewMeetingForm({ ...newMeetingForm, maxParticipants: parseInt(e.target.value) })} min="2" max="500" style={{ width: '100%', padding: '0.75rem', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '1rem' }} />
                  </div>
                </div>
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
    </div>
  );
}
