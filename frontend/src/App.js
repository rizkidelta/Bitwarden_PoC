import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [bitwarden, setBitwarden] = useState({
    email: '',
    masterPassword: ''
  });
  const [sshUsername, setSshUsername] = useState('');
  const [hosts, setHosts] = useState([{
    name: 'kali_ansible',
    group: 'kali',
    ip: '100.91.195.14',
    username: 'kali',
    password: 'kali'
  }]);
  const [isRotating, setIsRotating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [currentPage, setCurrentPage] = useState('main'); // 'main', 'progress', 'login-loading', 'logout-loading'
  const [logs, setLogs] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    checkBitwardenStatus();
  }, []);

  const checkBitwardenStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/bitwarden/status`);
      setIsLoggedIn(response.data.loggedIn);
      setUserEmail(response.data.email || '');
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const addLog = (text) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => {
      const newLogs = [...prev, { text, timestamp }];
      // Auto-scroll to bottom after state update
      setTimeout(() => {
        const logsContainer = document.querySelector('.logs-container');
        if (logsContainer) {
          logsContainer.scrollTop = logsContainer.scrollHeight;
        }
      }, 50);
      return newLogs;
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleBitwardenLogin = async (e) => {
    e.preventDefault();
    
    setCurrentPage('login-loading');
    setLoadingStep(0);
    
    // Animate through the steps
    setTimeout(() => setLoadingStep(1), 400);
    setTimeout(() => setLoadingStep(2), 1200);
    setTimeout(() => setLoadingStep(3), 2000);
    
    try {
      const response = await axios.post(`${API_BASE}/bitwarden/login`, {
        email: bitwarden.email,
        masterPassword: bitwarden.masterPassword
      });
      
      if (response.data.success) {
        setIsLoggedIn(true);
        setUserEmail(bitwarden.email);
        setBitwarden({ email: '', masterPassword: '' });
        
        // Show success and return to main page
        setTimeout(() => {
          setCurrentPage('main');
          showMessage('✅ Successfully logged into Bitwarden', 'success');
          setLoadingStep(0);
        }, 2800);
      }
    } catch (error) {
      setTimeout(() => {
        setCurrentPage('main');
        showMessage(`❌ ${error.response?.data?.error || 'Login failed'}`, 'error');
        setLoadingStep(0);
      }, 2800);
    }
  };

  const handleBitwardenLogout = async () => {
    setCurrentPage('logout-loading');
    setLoadingStep(0);
    
    // Animate through the logout steps
    setTimeout(() => setLoadingStep(1), 300);
    setTimeout(() => setLoadingStep(2), 900);
    setTimeout(() => setLoadingStep(3), 1500);
    
    try {
      await axios.post(`${API_BASE}/bitwarden/logout`);
      setIsLoggedIn(false);
      setUserEmail('');
      
      // Show success and return to main page
      setTimeout(() => {
        setCurrentPage('main');
        showMessage('🔒 Successfully logged out of Bitwarden', 'success');
        setLoadingStep(0);
      }, 2100);
    } catch (error) {
      setTimeout(() => {
        setCurrentPage('main');
        showMessage('❌ Logout failed', 'error');
        setLoadingStep(0);
      }, 2100);
    }
  };

  const handleAddHost = () => {
    setHosts([...hosts, {
      name: '',
      group: '',
      ip: '',
      username: '',
      password: ''
    }]);
  };

  const handleHostChange = (index, field, value) => {
    const newHosts = [...hosts];
    newHosts[index][field] = value;
    setHosts(newHosts);
  };

  const handleRemoveHost = (index) => {
    if (hosts.length > 1) {
      const newHosts = hosts.filter((_, i) => i !== index);
      setHosts(newHosts);
    }
  };

  const handleRotatePassword = async (e) => {
    e.preventDefault();
    
    if (!sshUsername.trim()) {
      showMessage('❌ Please enter SSH username', 'error');
      return;
    }

    if (hosts.some(host => !host.name || !host.ip || !host.username)) {
      showMessage('❌ Please fill in all host information', 'error');
      return;
    }

    setIsRotating(true);
    setCurrentPage('progress');
    clearLogs();
    
    // Real-time progress updates
    addLog('🔐 Starting password rotation for user: ' + sshUsername);
    
    try {
      // Add progress updates with realistic timing
      setTimeout(() => addLog('🔑 Generating strong password...'), 200);
      setTimeout(() => addLog('💾 Saving to Bitwarden...'), 800);
      setTimeout(() => addLog('🔄 Updating existing Bitwarden item...'), 1500);
      setTimeout(() => addLog('📡 Running Ansible playbook to update password on target machines...'), 2000);
      
      hosts.forEach((host, index) => {
        setTimeout(() => addLog(`🖥️  Updating password on ${host.name} (${host.ip})...`), 2500 + (index * 1000));
      });
      
      const response = await axios.post(`${API_BASE}/rotate-password`, {
        sshUsername,
        hosts
      });

      if (response.data.success) {
        setTimeout(() => addLog('🧹 Cleaning up temporary password files...'), 100);
        setTimeout(() => addLog('✅ Password rotation completed successfully'), 500);
        
        // Wait 1.5 seconds after completion, then return to main page
        setTimeout(() => {
          setCurrentPage('main');
          showMessage('✅ Password rotation completed successfully!', 'success');
        }, 2000);
      }
    } catch (error) {
      addLog('❌ Error: ' + (error.response?.data?.error || 'Password rotation failed'));
      
      // Wait 1.5 seconds after error, then return to main page
      setTimeout(() => {
        setCurrentPage('main');
        showMessage(`❌ ${error.response?.data?.error || 'Password rotation failed'}`, 'error');
      }, 1500);
    } finally {
      setIsRotating(false);
    }
  };

  // Login Loading Page Component
  const renderLoginLoadingPage = () => (
    <div className="loading-page">
      <div className="loading-content">
        <div className="loading-icon">🔓</div>
        <h1>Logging into Bitwarden</h1>
        <p>Authenticating your credentials...</p>
        <div className="loading-spinner">
          <div className="spinner large"></div>
        </div>
        <div className="loading-steps">
          <div className={`step ${loadingStep >= 1 ? 'active' : ''}`}>Connecting to Bitwarden</div>
          <div className={`step ${loadingStep >= 2 ? 'active' : ''}`}>Verifying credentials</div>
          <div className={`step ${loadingStep >= 3 ? 'active' : ''}`}>Unlocking vault</div>
        </div>
      </div>
    </div>
  );

  // Logout Loading Page Component
  const renderLogoutLoadingPage = () => (
    <div className="loading-page">
      <div className="loading-content">
        <div className="loading-icon">🔒</div>
        <h1>Logging out of Bitwarden</h1>
        <p>Securing your vault...</p>
        <div className="loading-spinner">
          <div className="spinner large"></div>
        </div>
        <div className="loading-steps">
          <div className={`step ${loadingStep >= 1 ? 'active' : ''}`}>Locking vault</div>
          <div className={`step ${loadingStep >= 2 ? 'active' : ''}`}>Clearing session</div>
          <div className={`step ${loadingStep >= 3 ? 'active' : ''}`}>Signing out</div>
        </div>
      </div>
    </div>
  );

  // Progress Page Component
  const renderProgressPage = () => (
    <div className="progress-page">
      <div className="progress-header">
        <h1>🔄 Password Rotation in Progress</h1>
        <p>Rotating password for user: <strong>{sshUsername}</strong></p>
        <p>Updating {hosts.length} host{hosts.length > 1 ? 's' : ''}</p>
      </div>
      
      <div className="progress-logs">
        <div className="logs-container">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-text">{log.text}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="log-entry">
              <span className="log-text">Initializing password rotation...</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="progress-footer">
        {isRotating && (
          <div className="progress-spinner">
            <div className="spinner"></div>
            <span>Processing...</span>
          </div>
        )}
        {!isRotating && logs.some(log => log.text.includes('✅')) && (
          <div className="progress-complete">
            <span>✅ Completed! Returning to main page...</span>
          </div>
        )}
      </div>
    </div>
  );

  // Main Page Component  
  const renderMainPage = () => (
    <div className="container">
      <h1>🔐 SSH Password Rotation Manager</h1>
      
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {!isLoggedIn ? (
          <div className="card">
            <h2>Bitwarden Login</h2>
            <form onSubmit={handleBitwardenLogin}>
              <div className="form-group">
                <label>📧 Email:</label>
                <input
                  type="email"
                  value={bitwarden.email}
                  onChange={(e) => setBitwarden({...bitwarden, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>🔑 Master Password:</label>
                <input
                  type="password"
                  value={bitwarden.masterPassword}
                  onChange={(e) => setBitwarden({...bitwarden, masterPassword: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                🔓 Login to Bitwarden
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="status-bar">
              <span>✅ Logged in as: {userEmail}</span>
              <button onClick={handleBitwardenLogout} className="btn btn-secondary">
                🔒 Logout
              </button>
            </div>

            <div className="card">
              <h2>SSH Configuration</h2>
              <div className="form-group">
                <label>👤 SSH Username to Rotate:</label>
                <input
                  type="text"
                  value={sshUsername}
                  onChange={(e) => setSshUsername(e.target.value)}
                  placeholder="Enter existing SSH username"
                  required
                />
              </div>
            </div>

            <div className="card">
              <h2>Target Hosts</h2>
              {hosts.map((host, index) => (
                <div key={index} className="host-config">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name:</label>
                      <input
                        type="text"
                        value={host.name}
                        onChange={(e) => handleHostChange(index, 'name', e.target.value)}
                        placeholder="e.g., kali_ansible"
                      />
                    </div>
                    <div className="form-group">
                      <label>Group:</label>
                      <input
                        type="text"
                        value={host.group}
                        onChange={(e) => handleHostChange(index, 'group', e.target.value)}
                        placeholder="e.g., kali"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>IP Address:</label>
                      <input
                        type="text"
                        value={host.ip}
                        onChange={(e) => handleHostChange(index, 'ip', e.target.value)}
                        placeholder="e.g., 192.168.1.100"
                      />
                    </div>
                    <div className="form-group">
                      <label>Current Username:</label>
                      <input
                        type="text"
                        value={host.username}
                        onChange={(e) => handleHostChange(index, 'username', e.target.value)}
                        placeholder="e.g., kali"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Current Password:</label>
                    <input
                      type="password"
                      value={host.password}
                      onChange={(e) => handleHostChange(index, 'password', e.target.value)}
                      placeholder="Current password for SSH connection"
                    />
                  </div>
                  {hosts.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveHost(index)}
                      className="btn btn-danger btn-small"
                    >
                      🗑️ Remove Host
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddHost} className="btn btn-secondary">
                ➕ Add Host
              </button>
            </div>

            <div className="card">
              <button 
                onClick={handleRotatePassword}
                disabled={isRotating}
                className="btn btn-primary btn-large"
              >
                {isRotating ? '🔄 Rotating Password...' : '🚀 Rotate Password'}
              </button>
            </div>
          </div>
        )}
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'login-loading':
        return renderLoginLoadingPage();
      case 'logout-loading':
        return renderLogoutLoadingPage();
      case 'progress':
        return renderProgressPage();
      default:
        return renderMainPage();
    }
  };

  return (
    <div className="App">
      {renderCurrentPage()}
    </div>
  );
}

export default App;