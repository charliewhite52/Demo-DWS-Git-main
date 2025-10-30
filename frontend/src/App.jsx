import React, { useState, useEffect } from 'react';
import WorkforceScheduler from './components/WorkforceScheduler';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  
  useEffect(() => {
    // Auto-login for now since we removed Login component
    setIsAuthenticated(true)
    setUsername('Admin')
  }, [])
  
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    setIsAuthenticated(false)
    setUsername('')
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white'
      }}>
        <div>
          <h2>Authentication Required</h2>
          <button onClick={() => setIsAuthenticated(true)}>
            Continue as Guest
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <header style={{
        padding: '1rem',
        background: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid rgba(71, 85, 105, 0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ color: '#e2e8f0', fontSize: '1.5rem' }}>
          Workforce Scheduler
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#94a3b8' }}>Welcome, {username}</span>
          <button 
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <WorkforceScheduler />
    </div>
  );
}

export default App;