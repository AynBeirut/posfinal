#!/bin/bash
# BUILD-LINUX.sh
# Build Ubuntu 24 compatible installer

echo ""
echo "================================================================"
echo "          Building Linux Installer (Ubuntu 24)"
echo "================================================================"
echo ""
echo "This will create .deb and .AppImage installers"
echo "This may take 5-10 minutes..."
echo ""

cd pos-v1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies first..."
    npm install
fi

# Build for Linux
npm run build:linux

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================================"
    echo "          SUCCESS! Installers Created"
    echo "================================================================"
    echo ""
    echo "Find your installers in:"
    echo "  pos-v1/dist/Ayn Beirut POS-1.0.0.AppImage   (Universal)"
    echo "  pos-v1/dist/ayn-beirut-pos_1.0.0_amd64.deb  (Ubuntu/Debian)"
    echo ""
    echo "Install on Ubuntu 24:"
    echo "  sudo dpkg -i pos-v1/dist/ayn-beirut-pos_1.0.0_amd64.deb"
    echo ""
    echo "Or run AppImage directly:"
    echo "  chmod +x pos-v1/dist/Ayn\ Beirut\ POS-1.0.0.AppImage"
    echo "  ./pos-v1/dist/Ayn\ Beirut\ POS-1.0.0.AppImage"
    echo ""
else
    echo ""
    echo "================================================================"
    echo "                    ERROR"
    echo "================================================================"
    echo ""
    echo "Build failed! Make sure you have electron-builder installed:"
    echo "  npm install"
    echo ""
fi
