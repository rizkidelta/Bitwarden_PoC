# SSH Password Rotation Manager

A modern web application for automated SSH password rotation using Bitwarden and Ansible. Features a clean Apple-inspired design with animated loading screens and streamlined workflow.

## Features

- 🔐 **Bitwarden Integration**: Secure password generation and storage
- 🌐 **Modern Web Interface**: Clean, Apple-inspired UI with smooth animations
- 🖥️ **Multi-Host Support**: Rotate passwords across multiple target machines
- 🚀 **Automated Process**: One-click password rotation with Ansible
- 🔄 **Real-time Progress**: Live progress tracking with detailed logs
- 🎨 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔒 **Security Focused**: Follows security best practices

## Prerequisites

- Node.js (v16 or higher)
- npm
- Bitwarden CLI (`bw`)
- Ansible
- SSH access to target machines

## Quick Start

1. **Start the application:**
   ```bash
   ./start.sh
   ```

2. **Access the web interface:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

3. **Use the application:**
   - Login with your Bitwarden credentials
   - Configure your target hosts
   - Enter the SSH username to rotate
   - Click "Rotate Password"

4. **Stop the application:**
   - Press `Ctrl+C` in the terminal

## How It Works

This application replicates the exact same logic as the original shell scripts with a modern web interface:

1. **Authentication**: Login to Bitwarden with animated loading screens
2. **Password Generation**: Generate a 20-character strong password
3. **Bitwarden Storage**: Save/update the password in your Bitwarden vault
4. **Ansible Execution**: Apply the new password to target machines via SSH
5. **Real-time Updates**: Watch progress with live logs and status updates
6. **Cleanup**: Remove temporary files automatically

## User Interface

- **Login Screen**: Secure Bitwarden authentication with loading animations
- **Main Dashboard**: Configure hosts and SSH settings with Apple-inspired design
- **Progress Tracking**: Real-time logs showing each step of the rotation process
- **Responsive Layout**: Optimized for both desktop and mobile devices

## Security Notes

- Bitwarden sessions remain active for multiple rotations (no automatic locking)
- Temporary files are cleaned up automatically after each operation
- All communications use secure protocols
- Passwords are never logged or displayed in console output
- Modern web security practices implemented throughout

## Troubleshooting

- Ensure Bitwarden CLI is installed and accessible
- Verify Ansible is properly configured
- Check SSH connectivity to target machines
- Review console logs for detailed error messages