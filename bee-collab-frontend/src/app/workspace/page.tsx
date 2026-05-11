'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Meeting {
  id: string;
  title: string;
  isHost: boolean;
  status: string;
}

export default function Workspace() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [joinMeetingId, setJoinMeetingId] = useState('');

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const userRes = await fetch(`http://${window.location.hostname}:3000/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        } else {
          router.push('/login');
          return;
        }

        const meetingsRes = await fetch(`http://${window.location.hostname}:3000/meetings`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (meetingsRes.ok) {
          const meetingsData = await meetingsRes.json();
          setMeetings(meetingsData);
        }
      } catch (err) {
        console.error('Error fetching workspace data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, [router]);

  const handleCreateMeeting = async () => {
    if (!newMeetingTitle) return;
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/meetings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ title: newMeetingTitle })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Redirect to the meeting room
        router.push(`/meeting?id=${data.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinMeetingId) {
      router.push(`/meeting?id=${joinMeetingId}`);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return <main className="container"><p>Loading workspace...</p></main>;
  }

  return (
    <main className="container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Welcome, {user?.name} 👋</h2>
        <div>
          <button className="btn-outline" onClick={() => router.push('/')} style={{ marginRight: '1rem' }}>Home</button>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="feature-grid">
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Create Meeting</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Start a new WebRTC meeting session instantly.</p>
          <input 
            type="text" 
            placeholder="Meeting Title (e.g. Daily Sync)"
            value={newMeetingTitle}
            onChange={(e) => setNewMeetingTitle(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: 'white', marginBottom: '1rem' }} 
          />
          <button className="btn-primary" onClick={handleCreateMeeting} style={{ width: '100%' }}>Create & Join</button>
        </div>
        
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Join Meeting</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Enter a Meeting ID to join an ongoing session.</p>
          <form onSubmit={handleJoinMeeting}>
            <input 
              type="text" 
              placeholder="Meeting ID"
              value={joinMeetingId}
              onChange={(e) => setJoinMeetingId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: 'white', marginBottom: '1rem' }} 
            />
            <button className="btn-secondary" type="submit" style={{ width: '100%' }}>Join via ID</button>
          </form>
        </div>
      </div>

      <h3 style={{ marginTop: '3rem', marginBottom: '1rem' }}>Your Recent Meetings</h3>
      {meetings.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No meetings found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {meetings.map((m) => (
            <div key={m.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{m.title}</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>ID: {m.id} | Status: {m.status}</p>
              </div>
              <button className="btn-primary" onClick={() => router.push(`/meeting?id=${m.id}`)}>Re-join</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
