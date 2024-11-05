// server.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const fs = require('fs');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Sanitize data
app.use(mongoSanitize());

// Set security headers with custom CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', '*'], // Allow images from any source
        connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:5173'],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
  })
);

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Prevent http param pollution
app.use(hpp());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static file serving configuration
const staticFileOptions = {
  dotfiles: 'ignore',
  etag: true,
  extensions: ['htm', 'html', 'jpg', 'jpeg', 'png', 'gif'],
  maxAge: '1d',
  setHeaders: (res, path, stat) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
};

// Create necessary directories
const directories = [
  'public',
  'public/uploads',
  'public/uploads/posts',
  'public/uploads/avatars'
];

directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${fullPath}`);
  }
});

// Serve static files - ADD THESE LINES
app.use('/public', express.static(path.join(__dirname, 'public'), staticFileOptions));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), staticFileOptions));

// Debug routes for file access - ADD THESE ROUTES
app.get('/check-uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'public/uploads/avatars');
  try {
    const files = fs.readdirSync(uploadsPath);
    res.json({
      success: true,
      path: uploadsPath,
      files: files,
      exists: fs.existsSync(uploadsPath)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      path: uploadsPath
    });
  }
});

app.get('/test-image/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const imagePath = path.join(__dirname, 'public/uploads', type, filename);
  
  console.log('Requested image path:', imagePath);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Image not found',
      path: imagePath,
      exists: false
    });
  }
});

app.get('/debug/file-structure', (req, res) => {
  const basePath = path.join(__dirname, 'public');
  
  function getDirectoryStructure(dir) {
    const items = fs.readdirSync(dir);
    const structure = {};
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        structure[item] = getDirectoryStructure(fullPath);
      } else {
        structure[item] = {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      }
    });
    
    return structure;
  }
  
  try {
    const structure = getDirectoryStructure(basePath);
    res.json({
      success: true,
      structure,
      basePath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      basePath
    });
  }
});

// Handle preflight requests
app.options('*', cors(corsOptions));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/stats', require('./routes/stats'));

// Base route for API status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    cors: {
      origin: corsOptions.origin,
      methods: corsOptions.methods
    },
    staticPaths: {
      public: path.join(__dirname, 'public'),
      uploads: path.join(__dirname, 'public/uploads')
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Handle unhandled routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl
  });
});

// Global error handlers
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'https://tok-blog-cms.web.app/'}`);
  console.log(`Public path: ${path.join(__dirname, 'public')}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

module.exports = server;