import express from 'express';
import path from 'path';
import { storage } from './storage';
import { InsertDocument } from '@shared/schema';
import { extractTextFromFile, summarizePolicy, answerPolicyQuestion } from './document-processor';

export function setupDirectUploadRoutes(app: express.Express) {
  // Direct text upload endpoint for API usage
  // This allows clients to directly send text content without uploading a file
  app.post('/api/documents/direct', async (req, res) => {
    try {
      // Check API key auth
      const apiKey = req.headers['x-api-key'] as string;
      if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
      }
      
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      const { title, content, policyId } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Content is required and must be a non-empty string' });
      }
      
      // Use current timestamp as part of the "virtual" file path
      const timestamp = Date.now();
      const virtualPath = `direct-${timestamp}.txt`;
      
      // Create initial document record
      const document: InsertDocument = {
        title,
        fileName: `${title}.txt`,
        filePath: virtualPath,
        fileType: 'txt',
        fileSize: Buffer.from(content).length,
        uploadedBy: user.id,
        policyId: policyId ? parseInt(policyId) : undefined,
        status: 'pending',
        extractedText: content  // Store the content directly as extractedText
      };
      
      // Save to database
      const savedDocument = await storage.createDocument(document);
      
      // Process the document content in the background
      processDirectContentAsync(savedDocument.id, content)
        .catch(err => console.error(`Error processing direct content document ${savedDocument.id}: ${err.message}`));
      
      // Return immediately with the pending document
      res.status(201).json(savedDocument);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error creating direct document:', errorMessage);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });
  
  // API endpoint to answer questions from direct text
  app.post('/api/ask-direct', async (req, res) => {
    try {
      // Check API key auth
      const apiKey = req.headers['x-api-key'] as string;
      if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
      }
      
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      const { question, content } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }
      
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Content is required and must be a non-empty string' });
      }
      
      // Use the document-processor to directly answer the question without storing
      const { answer, confidence } = await answerPolicyQuestion(question, content);
      
      // Store the question and answer for analytics
      await storage.createSearchQuery({
        query: question,
        userId: user.id,
        result: answer
      });
      
      // Create activity record
      await storage.createActivity({
        userId: user.id,
        action: 'direct-question',
        resourceType: 'api',
        details: `Direct API question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`
      });
      
      res.json({ answer, confidence });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error answering direct question:', errorMessage);
      res.status(500).json({ error: 'Failed to answer question' });
    }
  });
}

/**
 * Process direct content document asynchronously 
 * @param documentId ID of the document to process
 * @param content Text content to analyze
 */
async function processDirectContentAsync(documentId: number, content: string): Promise<void> {
  try {
    // Update document status to processing
    await storage.updateDocument(documentId, { status: 'processing' });
    
    // Generate summary and key points using AI
    const { summary, keyPoints } = await summarizePolicy(content);
    
    // Update document with summary, key points, and status
    await storage.updateDocument(documentId, {
      summary,
      keyPoints,
      status: 'processed'
    });
    
    console.log(`Successfully processed direct content document ${documentId}`);
    
    // Get the document to retrieve the user who uploaded it
    const document = await storage.getDocument(documentId);
    if (document) {
      // Create activity record
      await storage.createActivity({
        userId: document.uploadedBy,
        action: 'process',
        resourceType: 'document',
        resourceId: documentId,
        details: `Document "${document.title}" processed successfully via API`
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing direct content document ${documentId}:`, errorMessage);
    
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
        details: `Error processing direct content document: ${errorMessage}`
      });
    }
  }
}