import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { LoanController } from './controllers/LoanController';

const app = express();

// Security middleware with CSP allowing inline scripts for the interface
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// CORS middleware - allow GitHub Pages and localhost
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000', 
    'http://localhost:3001',
    'https://lesliechangpm.github.io'
  ],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024), // Convert MB to bytes
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    // Accept XML files
    if (file.mimetype === 'text/xml' || 
        file.mimetype === 'application/xml' ||
        file.originalname.toLowerCase().endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Only XML files are allowed'));
    }
  }
});

// Initialize controller
const loanController = new LoanController();

// Routes
app.get('/api/health', loanController.healthCheck);

// Loan evaluation routes
app.post('/api/loans/evaluate', upload.single('loanFile'), loanController.evaluateLoan);
app.post('/api/loans/validate', loanController.validateLoanData);
app.post('/api/loans/export', loanController.exportLoanConditions);
app.get('/api/loans/export/formats', loanController.getExportFormats);

// Condition management routes
app.get('/api/conditions/stats', loanController.getConditionStats);
app.get('/api/conditions/search', loanController.searchConditions);
app.get('/api/conditions/:code', loanController.getConditionDetails);
app.post('/api/conditions/reload', loanController.reloadConditions);

// Demo files endpoint
app.get('/demo-files/:filename', loanController.getDemoFile);

// API documentation endpoint
app.get('/api', (_req, res) => {
  res.json({
    service: 'Loan Conditions Rules Engine',
    version: '1.0.0',
    description: 'Rules engine for evaluating loan conditions against MISMO loan files',
    endpoints: {
      'GET /api/health': 'Health check and service status',
      'POST /api/loans/evaluate': 'Upload MISMO XML file and get applicable conditions',
      'POST /api/loans/validate': 'Validate loan data structure',
      'POST /api/loans/export': 'Export loan conditions in various formats (JSON, CSV, Excel, HTML)',
      'GET /api/loans/export/formats': 'Get available export formats',
      'GET /api/conditions/stats': 'Get condition statistics',
      'GET /api/conditions/search?q=term': 'Search conditions by term',
      'GET /api/conditions/:code': 'Get specific condition details',
      'POST /api/conditions/reload': 'Reload conditions from CSV file'
    },
    usage: {
      fileUpload: 'Use multipart/form-data with field name "loanFile" for XML uploads',
      maxFileSize: `${process.env.MAX_FILE_SIZE_MB || '50'}MB`,
      supportedFormats: ['XML (MISMO format)']
    }
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Loan Conditions Rules Engine API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api',
    health: '/api/health'
  });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${process.env.MAX_FILE_SIZE_MB || '50'}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one file can be uploaded at a time'
      });
    }
  }
  
  if (err.message === 'Only XML files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only XML files are allowed'
    });
  }
  
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /',
      'GET /api',
      'GET /api/health',
      'POST /api/loans/evaluate',
      'POST /api/loans/validate',
      'GET /api/conditions/stats',
      'GET /api/conditions/search',
      'GET /api/conditions/:code',
      'POST /api/conditions/reload'
    ]
  });
});

export default app;