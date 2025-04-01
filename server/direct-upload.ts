import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as crypto from 'crypto';

const writeFilePromise = util.promisify(fs.writeFile);
const mkdirPromise = util.promisify(fs.mkdir);

// Ensure uploads directory exists and is writable
const ensureUploadDir = async () => {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating upload directory: ${uploadDir}`);
      await mkdirPromise(uploadDir, { recursive: true });
    }
    
    // Test write permissions by creating and deleting a test file
    const testPath = path.join(uploadDir, '.test-write-access');
    await writeFilePromise(testPath, 'test');
    fs.unlinkSync(testPath);
    console.log('Upload directory has write access');
    
    return uploadDir;
  } catch (error: any) {
    console.error('Error with upload directory:', error);
    throw new Error(`Upload directory issue: ${error.message || 'unknown error'}`);
  }
};

// Use a different approach without multipart/form-data - accept base64 encoded data
export async function uploadBase64File(req: Request, res: Response) {
  try {
    console.log('Direct upload handler called');
    
    // Check if the request has required fields
    if (!req.body || !req.body.fileName || !req.body.fileData) {
      console.error('Missing required fields for direct upload');
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['fileName', 'fileData'] 
      });
    }
    
    // Get the file name and data
    const { fileName, fileData } = req.body;
    
    // Generate a unique file name
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(fileName);
    const safeFileName = 'upload-' + uniqueSuffix + ext;
    
    // Ensure upload directory exists
    const uploadDir = await ensureUploadDir();
    const filePath = path.join(uploadDir, safeFileName);
    
    console.log(`Writing file to ${filePath}`);
    
    // Determine if the data is base64 encoded
    let buffer: Buffer;
    try {
      if (typeof fileData === 'string' && fileData.indexOf('base64,') !== -1) {
        // If it's a data URL, extract the base64 part
        const base64Data = fileData.split('base64,')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else if (typeof fileData === 'string') {
        // If it's just a base64 string
        try {
          // Try base64 first
          buffer = Buffer.from(fileData, 'base64');
        } catch (e) {
          // Fallback to plain text if base64 decode fails
          console.log('Base64 decode failed, treating as plain text');
          buffer = Buffer.from(fileData, 'utf-8');
        }
      } else {
        // If it's just text
        buffer = Buffer.from(String(fileData), 'utf-8');
      }
      
      // Additional sanitization to handle encoding issues
      // Convert to string and back to buffer to normalize encoding
      const safeContent = buffer.toString('utf-8').replace(/\u0000/g, '');
      buffer = Buffer.from(safeContent, 'utf-8');
    } catch (error: any) {
      console.error('Error decoding file data:', error);
      throw new Error(`Failed to decode file data: ${error.message || 'Unknown error'}`);
    }
    
    // Write the file
    await writeFilePromise(filePath, buffer);
    
    console.log(`File written successfully: ${safeFileName}`);
    
    // Return success response with consistent URL format
    return res.status(201).json({
      success: true,
      filename: safeFileName,
      originalname: fileName,
      mimetype: buffer.toString('base64').indexOf('data:image/') === 0 ? 'image/jpeg' : 'application/octet-stream',
      size: buffer.length,
      path: filePath.replace(/\\/g, '/'),
      url: `/uploads/${safeFileName}`
    });
  } catch (error: any) {
    console.error('Error in direct upload:', error);
    return res.status(500).json({ 
      message: 'Failed to upload file',
      error: error.message || 'Unknown error'
    });
  }
}