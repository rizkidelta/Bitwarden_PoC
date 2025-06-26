const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Global variables to store Bitwarden session
let BW_SESSION = null;
let BW_EMAIL = null;

// Helper function to execute shell commands
const executeCommand = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error.message, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

// Helper function to create hosts.ini file
const createHostsFile = (hosts) => {
  let content = '';
  hosts.forEach(host => {
    content += `[${host.group}]\n`;
    content += `${host.name} ansible_host=${host.ip} ansible_user=${host.username} ansible_ssh_pass=${host.password} ansible_become=true ansible_become_method=sudo ansible_become_password=${host.password}\n\n`;
  });
  
  fs.writeFileSync(path.join(__dirname, '..', 'hosts.ini'), content);
};

// API Routes

// Bitwarden Login
app.post('/api/bitwarden/login', async (req, res) => {
  try {
    const { email, masterPassword } = req.body;
    
    console.log('🔓 Logging in and unlocking Bitwarden...');
    
    // Always logout first to avoid conflicts
    await executeCommand('bw logout --quiet').catch(() => {});
    
    // Login and unlock in one step using --raw
    const result = await executeCommand(`bw login "${email}" "${masterPassword}" --raw`);
    
    if (!result.stdout.trim()) {
      return res.status(401).json({ error: 'Login failed. Check email or password.' });
    }
    
    BW_SESSION = result.stdout.trim();
    BW_EMAIL = email;
    
    res.json({ success: true, message: 'Successfully logged into Bitwarden' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Check email or password.' });
  }
});

// Check Bitwarden Session Status
app.get('/api/bitwarden/status', (req, res) => {
  res.json({ 
    loggedIn: !!BW_SESSION,
    email: BW_EMAIL 
  });
});

// Bitwarden Logout
app.post('/api/bitwarden/logout', async (req, res) => {
  try {
    if (BW_SESSION) {
      await executeCommand(`bw lock --session "${BW_SESSION}"`).catch(() => {});
    }
    await executeCommand('bw logout --quiet').catch(() => {});
    
    BW_SESSION = null;
    BW_EMAIL = null;
    
    res.json({ success: true, message: 'Successfully logged out of Bitwarden' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});


// Rotate Password
app.post('/api/rotate-password', async (req, res) => {
  try {
    const { sshUsername, hosts } = req.body;
    
    if (!BW_SESSION) {
      return res.status(401).json({ error: 'Not logged into Bitwarden' });
    }
    
    console.log('🔐 Starting password rotation for user:', sshUsername);
    
    
    // Step 1: Generate strong password (exactly like original script)
    console.log('Generating strong password...');
    const passwordResult = await executeCommand(`bw generate --length 20 --special --uppercase --number --session "${BW_SESSION}"`);
    const newPassword = passwordResult.stdout.trim();
    
    if (!newPassword) {
      return res.status(500).json({ error: 'Failed to generate password' });
    }
    
    console.log('💾 Saving to Bitwarden...');
    
    // Step 2: Save to Bitwarden (exactly like original script)
    const itemName = sshUsername;
    
    // Try to find existing item by name
    const searchResult = await executeCommand(`bw list items --search "${itemName}" --session "${BW_SESSION}"`);
    const items = JSON.parse(searchResult.stdout);
    const existingItemId = items.length > 0 ? items[0].id : null;
    
    if (existingItemId) {
      console.log('🔄 Updating existing Bitwarden item...');
      
      // Sync vault to ensure we have the latest version
      console.log('🔄 Syncing vault to get latest version...');
      await executeCommand(`bw sync --session "${BW_SESSION}"`);
      
      // Get existing item, update it, and save
      const getResult = await executeCommand(`bw get item "${existingItemId}" --session "${BW_SESSION}"`);
      const item = JSON.parse(getResult.stdout);
      
      item.login.username = sshUsername;
      item.login.password = newPassword;
      
      const encodedItem = Buffer.from(JSON.stringify(item)).toString('base64');
      await executeCommand(`echo '${encodedItem}' | bw edit item "${existingItemId}" --session "${BW_SESSION}"`);
    } else {
      console.log('➕ Creating new Bitwarden item...');
      // Create new item
      const templateResult = await executeCommand(`bw get template item --session "${BW_SESSION}"`);
      const template = JSON.parse(templateResult.stdout);
      
      template.type = 1; // Login type
      template.name = sshUsername;
      template.login = {
        username: sshUsername,
        password: newPassword
      };
      
      const encodedTemplate = Buffer.from(JSON.stringify(template)).toString('base64');
      await executeCommand(`echo '${encodedTemplate}' | bw create item --session "${BW_SESSION}"`);
    }
    
    // Step 3: Save for Ansible (exactly like original script)
    const tempDir = path.join(__dirname, '..', '.bw_temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(tempDir, 'username.txt'), sshUsername);
    fs.writeFileSync(path.join(tempDir, 'password.txt'), newPassword);
    fs.chmodSync(path.join(tempDir, 'password.txt'), 0o600);
    
    // Step 4: Create hosts.ini file
    createHostsFile(hosts);
    
    // Step 5: Run Ansible playbook (exactly like original script)
    console.log('📡 Running Ansible playbook to update password on target machine...');
    
    const ansibleResult = await executeCommand(
      'ansible-playbook -i hosts.ini rotate_password.yml',
      { cwd: path.join(__dirname, '..') }
    );
    
    // Step 6: Cleanup (exactly like original script)
    console.log('🧹 Cleaning up temporary password files...');
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ Password rotation completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Password rotation completed successfully',
      ansibleOutput: ansibleResult.stdout
    });
    
  } catch (error) {
    console.error('Password rotation error:', error);
    
    // Cleanup on error
    const tempDir = path.join(__dirname, '..', '.bw_temp');
    if (fs.existsSync(tempDir)) {
      console.log('⚠️ Ansible playbook failed. Temporary files retained in .bw_temp for inspection.');
    }
    
    res.status(500).json({ 
      error: 'Password rotation failed', 
      details: error.stderr || error.error || error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Password Rotation Backend running on port ${PORT}`);
});