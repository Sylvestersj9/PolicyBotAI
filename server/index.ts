import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { registerRoutes } from './routes';
import { setupVite } from './vite';
import { setupAuth } from './auth';
import { createServer } from 'http';

console.log("Initializing server...");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const isReplit = process.env.REPL_OWNER !== undefined || process.env.REPL_ID !== undefined;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log(`Creating uploads directory at ${uploadsDir}`);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create public/uploads directory if it doesn't exist (for direct web access)
const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(publicUploadsDir)) {
  console.log(`Creating public uploads directory at ${publicUploadsDir}`);
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

// Enable CORS for all origins during development
app.use(cors({
  origin: isProduction 
    ? ['https://policybotai.replit.app', /\.replit\.app$/] 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Basic request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for document uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a safe filename
    const timestamp = Date.now();
    const extname = path.extname(file.originalname);
    const sanitizedFilename = path.basename(file.originalname, extname)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    cb(null, `${sanitizedFilename}-${timestamp}${extname}`);
  }
});

// File filter for document uploads
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  
  // Check if the file MIME type is allowed
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported: ${file.mimetype}. Only PDF, DOCX, DOC, and TXT files are allowed.`));
  }
};

// Setup multer upload configuration
export const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Server is operational',
    timestamp: new Date().toISOString()
  });
});

// Setup authentication
setupAuth(app);

console.log("Registering routes and connecting to database...");

// Create HTTP server
const server = createServer(app);

// Register API routes
registerRoutes(app);

// Setup Vite integration for the frontend
setupVite(app, server).catch(err => {
  console.error("Failed to setup Vite:", err);
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  
  // Return a structured error response
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal Server Error',
    stack: isProduction ? undefined : err.stack
  });
});

// Start the HTTP server
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Replit environment: ${isReplit ? 'Yes' : 'No'}`);
  console.log(`Health check available at: http://0.0.0.0:${PORT}/health`);
  console.log(`API health check available at: http://0.0.0.0:${PORT}/api/extension/health`);
});

// Handle graceful shutdown
const shutdownGracefully = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('Server shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if server hasn't closed
  setTimeout(() => {
    console.error('Server shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdownGracefully);
process.on('SIGTERM', shutdownGracefully);

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Don't exit the process, just log the error
});
