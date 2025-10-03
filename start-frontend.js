#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Change to frontend directory
const frontendDir = path.join(__dirname, 'FrontEnd');
process.chdir(frontendDir);

console.log(`Starting Vite from: ${process.cwd()}`);

// Start Vite dev server
const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
  shell: true
});

vite.on('error', (error) => {
  console.error('Failed to start frontend server:', error);
});

vite.on('close', (code) => {
  console.log(`Frontend server exited with code ${code}`);
});