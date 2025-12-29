#!/bin/bash
# START-POS-LINUX.sh
# Start the POS application in development mode on Linux

echo ""
echo "================================================================"
echo "          Starting AYN BEIRUT POS (Development Mode)"
echo "================================================================"
echo ""

cd pos-v1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies first..."
    npm install
    echo ""
fi

# Start Electron
npm start
