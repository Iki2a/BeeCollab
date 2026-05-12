'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const getApiBase = () => {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env && env.trim()) return env.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  return `http://${window.location.hostname}:3000`;
};

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const body = mode === 'login'
      ? { email, password }
      : { email, name, password };

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          router.push('/');
        } else if (mode === 'register') {
          // If register success but no token (auto-login not implemented in backend register), switch to login
          setMode('login');
          setError('Registration successful! Please login.');
        }
      } else {
        setError(data.message || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
      }
    } catch (err) {
      setError('Cannot connect to server. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8f9fa', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e1e4e8' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center', color: '#202124' }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h1>
        <p style={{ color: '#5f6368', textAlign: 'center', marginBottom: '2rem', fontSize: '0.875rem' }}>
          {mode === 'login' ? 'Gunakan akun BeeCollab Anda' : 'Daftar untuk mulai berkolaborasi'}
        </p>

        {error && <div style={{ color: '#d93025', marginBottom: '1.5rem', textAlign: 'center', background: '#fce8e6', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#3c4043', marginBottom: '0.5rem' }}>FULL NAME</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '1rem', outline: 'none' }}
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#3c4043', marginBottom: '0.5rem' }}>EMAIL ADDRESS</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '1rem', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#3c4043', marginBottom: '0.5rem' }}>PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '1rem', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.875rem',
              borderRadius: '8px',
              border: 'none',
              background: '#1a73e8',
              color: 'white',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#5f6368' }}>
          {mode === 'login' ? (
            <>
              Belum punya akun?{' '}
              <button
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', color: '#1a73e8', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Daftar sekarang
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: '#1a73e8', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Masuk di sini
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}
