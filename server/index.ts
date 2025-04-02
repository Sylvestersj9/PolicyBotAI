import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import cors from "cors"; // Import cors
import { sendToAI } from "./aiService"; // This is where your AI processing logic will go (replace with actual path)
import { setupVite } from "./vite";
import { registerRoutes } from "./routes";

const app = express();
// Always respect PORT from environment, fallback to standard port 5000
// This is critical for Replit deployment
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Enhanced Replit deployment configuration
app.set('trust proxy', 1);
app.enable('trust proxy');

// CORS configuration for cross-origin requests (especially for the Chrome extension)
app.use(cors({
  // Allow all origins for compatibility with Chrome extensions
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Middleware for parsing JSON and URL-encoded data with error handling
app.use(express.json({
  limit: '10mb', // Increase JSON payload limit
  verify: (req, res, buf) => {
    try { JSON.parse(buf.toString()); } catch (e) { console.error('Invalid JSON:', e); }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add simple request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Force redirect to HTTPS in production (Replit deployment)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip for localhost/development environments
  if (req.hostname === 'localhost' || req.hostname.includes('127.0.0.1')) {
    return next();
  }
  
  // Skip if already HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }
  
  // Redirect to HTTPS
  const httpsUrl = `https://${req.hostname}${req.originalUrl}`;
  console.log(`Redirecting to HTTPS: ${httpsUrl}`);
  res.redirect(301, httpsUrl);
});

// Error handling middleware (must be after all routes)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message 
  });
});

// Add a main health check endpoint with detailed diagnostics
app.get('/health', async (req, res) => {
  try {
    // Check if we can connect to the database
    let dbStatus = "unknown";
    let dbInfo = null;
    try {
      // Try to perform a simple database operation
      if (process.env.DATABASE_URL) {
        // Import pg to check connection directly if using PostgreSQL
        const { Pool } = await import('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        const result = await client.query('SELECT version() as version');
        dbInfo = result.rows[0].version;
        client.release();
        await pool.end();
        dbStatus = "connected";
      } else {
        dbStatus = "in-memory";
      }
    } catch (dbError) {
      console.error("Health check - Database connection test failed:", dbError);
      dbStatus = "error";
      dbInfo = dbError instanceof Error ? dbError.message : String(dbError);
    }

    // Send detailed health response
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      application: {
        name: "PolicyBot AI",
        version: "1.0.0"
      },
      system: {
        node: process.version,
        platform: process.platform,
        memory: {
          totalHeapMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          usedHeapMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        uptime: process.uptime()
      },
      database: {
        type: process.env.DATABASE_URL ? "postgresql" : "in-memory",
        status: dbStatus,
        info: dbInfo
      },
      apis: {
        huggingface: process.env.HUGGINGFACE_API_KEY ? "configured" : "not configured",
        openai: process.env.OPENAI_API_KEY ? "configured" : "not configured"
      }
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Give the file a unique name
  }
});

// Initialize multer with the storage configuration
const upload = multer({ storage });

// Create an upload endpoint
app.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (req.file) {
    const filePath = req.file.path; // Get the file path from the uploaded file

    // Check file type and process accordingly
    if (req.file.mimetype === "application/pdf") {
      handlePdf(filePath, res); // Process PDF file
    } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      handleDocx(filePath, res); // Process DOCX file
    } else {
      res.status(400).send({ message: 'Unsupported file type' });
    }
  } else {
    res.status(400).send({ message: 'No file uploaded' });
  }
});

// Handle PDF file
const handlePdf = (filePath: string, res: Response) => {
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(500).send('Error reading PDF file.');

    pdfParse(data).then((doc) => {
      sendToAI(doc.text, res); // Send extracted text to AI
    }).catch((error) => {
      res.status(500).send('Error parsing PDF.');
    });
  });
};

// Handle DOCX file
const handleDocx = (filePath: string, res: Response) => {
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(500).send('Error reading DOCX file.');

    mammoth.extractRawText({ buffer: data }).then((result) => {
      sendToAI(result.value, res); // Send extracted text to AI
    }).catch((error) => {
      res.status(500).send('Error parsing DOCX.');
    });
  });
};

// Create directories if they don't exist
['uploads', 'public/uploads'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create HTTP server
const httpServer = createServer(app);

// Start the server process with improved error handling
(async () => {
  try {
    console.log('Initializing server...');
    
    // Handle process errors gracefully
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      // Don't exit on uncaught exceptions in production - more stable for Replit
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
    
    // Add more signals for graceful shutdown
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
    signals.forEach(signal => {
      process.once(signal, () => {
        console.log(`${signal} signal received, shutting down gracefully`);
        // Give the server 5 seconds to close gracefully before forcing exit
        let forceExitTimeout = setTimeout(() => {
          console.log('Forcing server exit after timeout');
          process.exit(1);
        }, 5000);
        
        httpServer.close(() => {
          console.log('Server closed successfully');
          clearTimeout(forceExitTimeout);
          process.exit(0);
        });
      });
    });
    
    // Wait for database connection and API route registration
    console.log('Registering routes and connecting to database...');
    try {
      await registerRoutes(app);
      console.log('Routes registered successfully');
    } catch (routeError) {
      console.error('Failed to register routes:', routeError);
      // Continue anyway to allow the server to start even with partial functionality
    }
    
    // Setup Vite for frontend
    try {
      await setupVite(app, httpServer);
      console.log('Vite frontend setup completed');
    } catch (viteError) {
      console.error('Non-critical Vite setup error (continuing):', viteError);
      // Continue anyway to allow the API to work even if Vite has issues
    }
    
    // Start the server with better Replit support - always use 0.0.0.0 for Replit
    const host = '0.0.0.0'; // Bind to all network interfaces to ensure Replit can reach the server
    
    // Add error handler for the HTTP server
    httpServer.on('error', (err) => {
      console.error('Server startup error:', err);
      // If the port is in use, try another one
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying different port...`);
        httpServer.listen(0, host); // Let the OS assign an available port
      }
    });
    
    // Handle successful startup
    httpServer.on('listening', () => {
      const address = httpServer.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      console.log(`Server is running on ${host}:${actualPort}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Replit environment: ${process.env.REPL_SLUG ? 'Yes' : 'No'}`);
      console.log(`Health check available at: http://${host}:${actualPort}/health`);
      console.log(`API health check available at: http://${host}:${actualPort}/api/extension/health`);
    });
    
    // Create test endpoints to verify the server is running
    app.get('/api/test/server', (req, res) => {
      res.status(200).send({
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
        isReplit: !!process.env.REPL_SLUG,
        replit: {
          id: process.env.REPL_ID || null,
          slug: process.env.REPL_SLUG || null,
          owner: process.env.REPL_OWNER || null
        },
        database: {
          configured: !!process.env.DATABASE_URL
        },
        ai: {
          huggingface: !!process.env.HUGGINGFACE_API_KEY
        }
      });
    });
    
    // Start the HTTP server
    console.log(`Starting HTTP server on ${host}:${port}...`);
    httpServer.listen(port, host);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
