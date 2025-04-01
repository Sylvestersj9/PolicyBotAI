import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename to avoid collisions
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Configure multer limits and file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB in bytes
  },
  fileFilter: function (req, file, cb) {
    // Accept all file types for now - can add restrictions if needed
    cb(null, true);
  }
});

// Error handler for multer
export const handleMulterErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Multer error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File too large',
        error: 'The uploaded file exceeds the maximum size limit of 50MB.'
      });
    }
    
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  }
  
  // For non-multer errors, pass to the next error handler
  next(err);
};

// Single file upload middleware
export const uploadSingleFile = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`Starting file upload for field: ${fieldName}`);
    
    try {
      // Check if upload directory exists and create it if it doesn't
      if (!fs.existsSync(uploadDir)) {
        console.log(`Creating upload directory: ${uploadDir}`);
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Check if directory is writable
      try {
        const testPath = path.join(uploadDir, '.test-write-access');
        fs.writeFileSync(testPath, 'test');
        fs.unlinkSync(testPath);
        console.log('Upload directory has write access');
      } catch (error) {
        console.error('Upload directory is not writable:', error);
        return res.status(500).json({ 
          message: 'Server configuration error: upload directory is not writable',
          error: 'UPLOAD_DIR_NOT_WRITABLE'
        });
      }
      
      const uploadMiddleware = upload.single(fieldName);
      
      uploadMiddleware(req, res, (err) => {
        if (err) {
          console.error('Upload middleware error:', err);
          return handleMulterErrors(err, req, res, next);
        }
        
        if (!req.file) {
          console.log('No file was uploaded');
          return res.status(400).json({ message: 'No file was uploaded' });
        }
        
        console.log(`File uploaded successfully: ${req.file.filename}`);
        next();
      });
    } catch (error: any) {
      console.error('Unexpected error in upload middleware:', error);
      return res.status(500).json({ 
        message: 'An unexpected error occurred during file upload',
        error: error.message || 'UNKNOWN_ERROR'
      });
    }
  };
};

// Function to process the uploaded file and return file information
export const processUploadedFile = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file was uploaded' });
  }
  
  // Return the file information to the client
  return res.status(201).json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path.replace(/\\/g, '/'), // Replace backslashes with forward slashes for consistency
  });
};