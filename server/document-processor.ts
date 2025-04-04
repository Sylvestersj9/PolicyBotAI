import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as docx from 'docx';
import { HfInference } from '@huggingface/inference';
import { storage } from './storage';
import { Document, InsertDocument } from '@shared/schema';
import { answerDocumentQuestion, analyzePolicyContent } from './huggingface';

// Re-export for other modules to use
export { analyzePolicyContent };

// Initialize the Hugging Face client with API key
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Using the Mistral model as default
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

/**
 * Extract text from a PDF file
 * @param filePath Path to the PDF file
 * @returns Extracted text
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the file as buffer
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error extracting text from PDF: ${errorMessage}`);
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

/**
 * Extract text from a DOCX file
 * @param filePath Path to the DOCX file
 * @returns Extracted text
 */
export async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error extracting text from DOCX: ${errorMessage}`);
    throw new Error(`Failed to extract text from DOCX: ${errorMessage}`);
  }
}

/**
 * Extract text from a TXT file
 * @param filePath Path to the TXT file
 * @returns Extracted text
 */
export async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const text = fs.readFileSync(filePath, 'utf8');
    return text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error extracting text from TXT: ${errorMessage}`);
    throw new Error(`Failed to extract text from TXT: ${errorMessage}`);
  }
}

/**
 * Summarize a policy document using Hugging Face AI
 * @param text The policy document text to summarize
 * @returns Summary of the policy document
 */
export async function summarizePolicy(text: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  try {
    // Trim document if it's too large
    const maxLength = 15000; // Character limit for the prompt
    const trimmedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...[content truncated due to length]'
      : text;
    
    // Enhanced prompt format for advanced language models like Mistral and Llama
    const prompt = `<s>[INST] You are PolicyBot, an AI assistant specializing in analyzing company policies and procedures.

I need your help analyzing this policy document:

"""
${trimmedText}
"""

Tasks:
1. Provide a CONCISE summary of the policy (3 sentences maximum)
2. Extract 5-7 KEY POINTS that represent the most important aspects of this policy
3. Format your response as a JSON object with two fields:
   - "summary": A string containing your concise summary
   - "keyPoints": An array of strings, each containing one key point

Example Response Format:
{
  "summary": "This policy outlines employee data protection requirements. It specifies how personal information should be handled and stored. Violations may result in disciplinary action.",
  "keyPoints": [
    "Personal data must be encrypted when stored electronically",
    "Access to employee records is restricted to HR personnel only",
    "Data breaches must be reported within 24 hours",
    "Annual data protection training is mandatory"
  ]
}

IMPORTANT: You must format your entire response as a valid JSON object. Do not include any other text, explanations, or commentary - only return a properly formatted JSON object.
[/INST]`;

    const response = await hf.textGeneration({
      model: DEFAULT_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.2,
        return_full_text: false,
      }
    });
    
    // Extract and parse JSON from response
    const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return {
      summary: result.summary || "Unable to generate summary",
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : []
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error summarizing policy: ${errorMessage}`);
    // Provide a basic fallback
    return {
      summary: "Unable to generate AI summary due to an error. Please try again later.",
      keyPoints: ["Error processing document", "AI service unavailable or error in processing"]
    };
  }
}

/**
 * Extract text from a file based on its type
 * @param filePath Path to the file
 * @param fileType Type of the file (pdf, docx, txt)
 * @returns Extracted text
 */
export async function extractTextFromFile(filePath: string, fileType: string): Promise<string> {
  // Normalize filetype to lowercase
  const type = fileType.toLowerCase();
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    if (type === 'pdf') {
      return await extractTextFromPDF(filePath);
    } else if (type === 'docx') {
      return await extractTextFromDOCX(filePath);
    } else if (type === 'txt') {
      return await extractTextFromTXT(filePath);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error extracting text from file: ${errorMessage}`);
    throw new Error(`Failed to extract text from file: ${errorMessage}`);
  }
}

/**
 * Answer a question about a policy document using Hugging Face AI
 * @param question The question to answer
 * @param policyText The policy document text
 * @returns Answer to the question with confidence level
 */
export async function answerPolicyQuestion(question: string, policyText: string): Promise<{
  answer: string;
  confidence: number;
}> {
  try {
    // Trim document if it's too large
    const maxLength = 15000; // Character limit for the prompt
    const trimmedText = policyText.length > maxLength 
      ? policyText.substring(0, maxLength) + '...[content truncated due to length]'
      : policyText;
    
    const prompt = `<s>[INST] You are PolicyBot, an AI assistant specializing in finding information in company policies.

I need your help answering a question based on this policy document:

"""
${trimmedText}
"""

USER QUESTION: ${question}

Your task:
1. Carefully read the policy document and identify the parts that address the question
2. Extract and quote the EXACT text from the policy that provides the answer
3. Assess your confidence in the answer (from 0.0 to 1.0)
4. If the policy doesn't directly address the question, clearly state this fact
5. IMPORTANT: You must format your entire response as a valid JSON object following the required format below

Format your response ONLY as a JSON object with these fields:
- answer: A quoted excerpt from the policy with the relevant information
- confidence: A number between 0.0 and 1.0 indicating your confidence level

JSON EXAMPLE RESPONSE:
{"answer": "According to the policy, 'employees must report incidents within 24 hours'", "confidence": 0.9}

Do not include any other text, explanations, or commentary in your response - only return a properly formatted JSON object.
[/INST]`;

    const response = await hf.textGeneration({
      model: DEFAULT_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.2,
        return_full_text: false,
      }
    });
    
    // Extract and parse JSON from response
    const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return {
      answer: result.answer || "Unable to find a relevant answer in the policy.",
      confidence: result.confidence || 0.5
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error answering policy question: ${errorMessage}`);
    return {
      answer: "Sorry, I was unable to process your question due to a technical error.",
      confidence: 0
    };
  }
}

/**
 * Process an uploaded document file with AI analysis
 * @param userId The user who uploaded the document
 * @param filePath Path to the uploaded file
 * @param fileName Original name of the file
 * @param fileSize Size of the file in bytes
 * @param fileType Type of the file (MIME type)
 * @param policyId Optional policy ID to associate document with
 * @returns The processed document with AI analysis
 */
export async function processDocumentUpload(
  userId: number,
  filePath: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  policyId?: number
): Promise<Document> {
  try {
    console.log(`Processing document upload: ${fileName} (${fileType})`);
    
    // Create initial document record with pending status
    const documentData: InsertDocument = {
      title: fileName,
      fileName,
      filePath,
      fileType,
      fileSize,
      uploadedBy: userId,
      status: 'pending',
      policyId: policyId || null
    };
    
    // Create document in database
    const document = await storage.createDocument(documentData);
    
    // Process document in background
    processDocumentInBackground(document.id).catch(error => {
      console.error(`Background processing error for document ${document.id}:`, error);
    });
    
    return document;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing document upload: ${errorMessage}`);
    throw new Error(`Failed to process document upload: ${errorMessage}`);
  }
}

/**
 * Process document in background and update database with results
 * @param documentId ID of the document to process
 */
export async function processDocumentInBackground(documentId: number): Promise<void> {
  try {
    console.log(`Starting background processing for document ${documentId}`);
    
    // Get document from database
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    // Update status to processing
    await storage.updateDocument(documentId, { status: 'processing' });
    
    // Extract text from document
    const extractedText = await extractTextFromFile(document.filePath, document.fileType);
    
    // Analyze the document with AI using imported function
    const { analyzePolicyContent: analyzeContent } = await import('./huggingface');
    const analysis = await analyzeContent(extractedText);
    
    // Update document with extracted text and AI analysis
    await storage.updateDocument(documentId, {
      extractedText,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      status: 'completed'
    });
    
    console.log(`Completed processing document ${documentId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing document ${documentId}: ${errorMessage}`);
    
    // Update document with error status
    try {
      await storage.updateDocument(documentId, {
        status: 'error'
      });
    } catch (updateError) {
      console.error(`Failed to update document error status: ${updateError}`);
    }
  }
}

/**
 * Get answer to a question about a document
 * @param documentId ID of the document to query
 * @param question The question to answer
 * @returns Answer with confidence score
 */
export async function getDocumentAnswer(documentId: number, question: string): Promise<{
  answer: string;
  confidence: number;
  documentId: number;
  documentTitle: string;
}> {
  try {
    // Get document from database
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    // Check if document has extracted text
    if (!document.extractedText) {
      throw new Error(`Document ${documentId} has no extracted text`);
    }
    
    // Get answer from AI
    const result = await answerDocumentQuestion(document.extractedText, question);
    
    return {
      ...result,
      documentId: document.id,
      documentTitle: document.title
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error getting document answer: ${errorMessage}`);
    return {
      answer: `Error processing your question: ${errorMessage}`,
      confidence: 0,
      documentId,
      documentTitle: 'Unknown'
    };
  }
}