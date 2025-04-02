import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import { extractTextFromFile, processDocumentUpload, getDocumentAnswer } from './document-processor';
import { analyzePolicyContent } from './huggingface';
import { InsertDocument } from '@shared/schema';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      // Create a unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF, DOCX, and TXT files
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
    }
  }
});

export function setupUploadRoutes(app: express.Express) {
  // Document upload endpoint
  app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const userId = req.user!.id;
      const uploadedFile = req.file;
      const fileType = path.extname(uploadedFile.originalname).slice(1); // Remove the dot
      const { title, policyId } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      // Create initial document record with pending status
      const document: InsertDocument = {
        title,
        fileName: uploadedFile.originalname,
        filePath: uploadedFile.path,
        fileType,
        fileSize: uploadedFile.size,
        uploadedBy: userId,
        policyId: policyId ? parseInt(policyId) : undefined,
        status: 'pending'
      };
      
      // Save to database
      const savedDocument = await storage.createDocument(document);
      
      // Process the document in the background
      processDocumentAsync(savedDocument.id, uploadedFile.path, fileType)
        .catch(err => console.error(`Error processing document ${savedDocument.id}: ${err.message}`));
      
      // Return immediately with the pending document
      res.status(201).json(savedDocument);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error uploading document:', errorMessage);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });
  
  // Get document by ID
  app.get('/api/documents/:id', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if the user has access to this document
      if (document.uploadedBy !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(document);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error retrieving document:', errorMessage);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  });
  
  // Get all documents for user
  app.get('/api/documents', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const userId = req.user!.id;
      const documents = await storage.getDocumentsByUser(userId);
      
      res.json(documents);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error retrieving documents:', errorMessage);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  });
  
  // Answer question about a document
  app.post('/api/documents/:id/answer', async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const documentId = parseInt(req.params.id);
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }
      
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if the user has access to this document
      if (document.uploadedBy !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check if document has been processed
      if (document.status !== 'processed') {
        return res.status(400).json({ error: 'Document is still being processed' });
      }
      
      // Use document-processor to answer the question
      const { answer, confidence } = await answerDocumentQuestion(documentId, question);
      
      // Create a search query record
      await storage.createSearchQuery({
        query: question,
        userId: req.user!.id,
        result: answer
      });
      
      // Create activity record
      await storage.createActivity({
        userId: req.user!.id,
        action: 'question',
        resourceType: 'document',
        resourceId: documentId,
        details: `Asked: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`
      });
      
      res.json({ answer, confidence });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error answering question:', errorMessage);
      res.status(500).json({ error: 'Failed to answer question' });
    }
  });
}

/**
 * Process an uploaded document asynchronously
 * @param documentId ID of the document to process
 * @param filePath Path to the document file
 * @param fileType Type of the document file
 */
async function processDocumentAsync(documentId: number, filePath: string, fileType: string): Promise<void> {
  try {
    // Update document status to processing
    await storage.updateDocument(documentId, { status: 'processing' });
    
    // Extract text from document
    const extractedText = await extractTextFromFile(filePath, fileType);
    
    // Generate summary and key points using AI
    const { summary, keyPoints } = await analyzePolicyContent(extractedText);
    
    // Update document with extracted text, summary, key points, and status
    await storage.updateDocument(documentId, {
      extractedText,
      summary,
      keyPoints,
      status: 'processed'
    });
    
    console.log(`Successfully processed document ${documentId}`);
    
    // Get the document to retrieve the user who uploaded it
    const document = await storage.getDocument(documentId);
    if (document) {
      // Create activity record
      await storage.createActivity({
        userId: document.uploadedBy,
        action: 'process',
        resourceType: 'document',
        resourceId: documentId,
        details: `Document "${document.title}" processed successfully`
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing document ${documentId}:`, errorMessage);
    
    // Update document with error status
    await storage.updateDocument(documentId, {
      status: 'error'
    });
    
    // Log the error rather than trying to save it in the document
    console.error(`Processing error for document ${documentId}: ${errorMessage}`);
    
    // Get the document to retrieve the user who uploaded it
    const document = await storage.getDocument(documentId);
    if (document) {
      // Create activity record for the error
      await storage.createActivity({
        userId: document.uploadedBy,
        action: 'error',
        resourceType: 'document',
        resourceId: documentId,
        details: `Error processing document: ${errorMessage}`
      });
    }
  }
}

/**
 * Answer a question about a document
 * @param documentId ID of the document
 * @param question Question to answer
 * @returns Answer to the question with confidence level
 */
async function answerDocumentQuestion(documentId: number, question: string): Promise<{
  answer: string;
  confidence: number;
}> {
  // Import module here to avoid circular dependency
  const { answerPolicyQuestion } = await import('./document-processor');
  
  // Get document
  const document = await storage.getDocument(documentId);
  if (!document || !document.extractedText) {
    return {
      answer: "Sorry, the document text is not available.",
      confidence: 0
    };
  }
  
  // Use the document-processor to answer the question
  return await answerPolicyQuestion(question, document.extractedText);
}