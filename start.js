#!/usr/bin/env node

// Simple startup script to help with deployment
console.log('🚀 Starting Loan Conditions Rules Engine...');
console.log('Environment variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);

// Kill any existing processes on the port (helpful for restarts)
if (process.env.PORT) {
  console.log(`📋 Attempting to start on port ${process.env.PORT}`);
}

// Import and start the main application
require('./dist/index.js');