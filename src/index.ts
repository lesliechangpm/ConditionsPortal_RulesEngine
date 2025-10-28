import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`🔍 Starting server with PORT=${PORT} (from env: ${process.env.PORT})`);

// Start the server - let Express choose the interface (more compatible)
const server = app.listen(PORT, () => {
  console.log(`
🚀 Loan Conditions Rules Engine API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${NODE_ENV}
Port: ${PORT}
API Documentation: http://localhost:${PORT}/api
Health Check: http://localhost:${PORT}/api/health

Available Endpoints:
• GET  /                           - Service info
• GET  /api                        - API documentation
• GET  /api/health                 - Health check
• POST /api/loans/evaluate         - Evaluate MISMO file
• POST /api/loans/validate         - Validate loan data
• GET  /api/conditions/stats       - Condition statistics
• GET  /api/conditions/search      - Search conditions
• GET  /api/conditions/:code       - Get condition details
• POST /api/conditions/reload      - Reload conditions

File Upload:
• Max file size: ${process.env.MAX_FILE_SIZE_MB || '50'}MB
• Supported formats: XML (MISMO)
• Upload field name: loanFile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Handle server startup errors
server.on('error', (error: any) => {
  console.error('❌ Server startup error:', error);
  console.error(`❌ Failed to start on port ${PORT}. Environment PORT: ${process.env.PORT}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📋 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n📋 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;