'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [pingData, setPingData] = useState<string | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Trying to hit the backend API (assuming it runs on port 3000)
        // Usually NestJS endpoints might be /api or /
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
  }, []);

  return (
    <main className="container">
      <nav className="navbar">
        <div className="logo">
          <span className="gradient-text">Bee</span>Collab
        </div>
        <div className="nav-links">
          <button className="btn-outline" onClick={() => router.push('/login')}>Login</button>
          <button className="btn-primary" onClick={() => router.push('/register')}>Sign Up</button>
        </div>
      </nav>

      <div className="hero">
        <h1 className="title">
          Connect & Collaborate <br />
          <span className="gradient-text">Without Limits</span>
        </h1>
        <p className="subtitle">
          Experience seamless real-time meetings, lightning-fast chat, and intuitive project workspaces all in one place.
        </p>

        <div className="action-buttons">
          <button className="btn-primary glow" onClick={() => router.push('/meeting')}>Start a Meeting</button>
          <button className="btn-secondary" onClick={() => router.push('/workspace')}>Join Workspace</button>
        </div>
      </div>

      <div className="dashboard-preview">
        <div className="glass-panel status-panel">
          <h2>Backend Connection Status</h2>
          <div className={`status-indicator ${serverStatus}`}>
            <div className="pulse"></div>
            <span>{serverStatus === 'checking' ? 'Checking connection...' : serverStatus === 'online' ? 'System Online' : 'System Offline (Is NestJS running?)'}</span>
          </div>
          {pingData && <p className="ping-response">Response: {pingData}</p>}
          
          <div className="feature-grid">
            <div className="feature-card">
              <div className="icon">💬</div>
              <h3>Real-time Chat</h3>
              <p>Powered by WebSockets</p>
            </div>
            <div className="feature-card">
              <div className="icon">🎥</div>
              <h3>Video Meetings</h3>
              <p>WebRTC Signaling Active</p>
            </div>
            <div className="feature-card">
              <div className="icon">🔐</div>
              <h3>Secure Auth</h3>
              <p>JWT Protected Routes</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
