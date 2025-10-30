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
      <WorkforceScheduler />
    </div>
  );
}

export default App;
