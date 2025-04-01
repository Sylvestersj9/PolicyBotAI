import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as crypto from 'crypto';

const writeFilePromise = util.promisify(fs.writeFile);
const mkdirPromise = util.promisify(fs.mkdir);

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await mkdirPromise(uploadDir, { recursive: true });
    return uploadDir;
  } catch (error) {
    console.error('Error creating upload directory:', error);
    throw error;
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
    if (typeof fileData === 'string' && fileData.indexOf('base64,') !== -1) {
      // If it's a data URL, extract the base64 part
      const base64Data = fileData.split('base64,')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else if (typeof fileData === 'string') {
      // If it's just a base64 string
      buffer = Buffer.from(fileData, 'base64');
    } else {
      // If it's just text
      buffer = Buffer.from(String(fileData));
    }
    
    // Write the file
    await writeFilePromise(filePath, buffer);
    
    console.log(`File written successfully: ${safeFileName}`);
    
    // Return success response
    return res.status(201).json({
      success: true,
      fileName: safeFileName,
      originalName: fileName,
      size: buffer.length,
      url: `/uploads/${safeFileName}`
    });
  } catch (error) {
    console.error('Error in direct upload:', error);
    return res.status(500).json({ 
      message: 'Failed to upload file',
      error: error.message 
    });
  }
}