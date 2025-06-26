#!/bin/bash

echo "🚀 Password Rotation Manager - Starting Application"
echo "==============================================="

# Function to cleanup background processes
cleanup() {
    echo -e "\n🛑 Shutting down services..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend stopped"
    fi
    
    # Kill any remaining node processes for this project
    pkill -f "password-rotation" 2>/dev/null
    
    echo "👋 Goodbye!"
    exit 0
}

# Setup signal handlers
trap cleanup SIGINT SIGTERM

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

cd ..

# Start backend
echo "🖥️  Starting backend server (Port 3001)..."
cd backend
npm start &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend server (Port 3000)..."
cd ../frontend
BROWSER=none npm start &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 5

echo ""
echo "✅ Both services are now running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🖥️  Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both services"
echo "==============================================="

# Keep the script running and wait for signals
wait