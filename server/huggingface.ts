import { HfInference } from '@huggingface/inference';
import { Policy } from '@shared/schema';

// Initialize the Hugging Face client with API key
// Using API key allows access to more powerful models and higher rate limits
let hf: HfInference;

try {
  // Check if API key is present before initializing
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.error("CRITICAL ERROR: Missing HUGGINGFACE_API_KEY environment variable");
    // Create a client without an API key, which will have limited functionality
    hf = new HfInference();
  } else {
    // Initialize with the API key
    hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    console.log("HuggingFace client initialized successfully with API key");
  }
} catch (error) {
  console.error("Error initializing HuggingFace client:", error);
  // Create a fallback client that will at least allow the app to start
  hf = new HfInference();
}

// Using the Mistral model as default - far more powerful than basic models
// PRIMARY: Use Mistral model (instruction-tuned, powerful for complex reasoning)
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

// FALLBACKS: Other powerful models that can produce reasonable results
// Listed in order of preference - larger/newer models first
const FALLBACK_MODELS = [
  'meta-llama/Llama-2-7b-chat-hf', 
  'google/flan-t5-xl',
  'bigscience/bloom-1b7',
  'tiiuae/falcon-7b-instruct'
];

/**
 * Search through policies using Hugging Face's AI to find the most relevant information
 * @param query The user's search query
 * @param policies Array of policies to search through
 * @returns Search result with answer, policy reference, and confidence score
 */
export async function searchPoliciesWithAI(query: string, policies: Policy[]): Promise<{
  answer: string;
  policyId?: number;
  policyTitle?: string;
  confidence: number;
  error?: string;
}> {
  // Log API key availability (without exposing the actual key)
  console.log(`HuggingFace API Key configured: ${process.env.HUGGINGFACE_API_KEY ? 'YES' : 'NO'}`);
  
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.error("CRITICAL ERROR: Missing HUGGINGFACE_API_KEY environment variable");
      return {
        answer: "Unable to process request due to missing AI configuration. Please contact support.",
        confidence: 1.0,
        error: "missing_api_key"
      };
    }
    
    if (!policies || policies.length === 0) {
      console.log("No policies found in database for search");
      return {
        answer: "No policies found in the system. Please add some policies first.",
        confidence: 1.0
      };
    }

    // Check if we have any non-empty policy content
    const validPolicies = policies.filter(p => p.content && p.content.trim() !== '');
    
    if (validPolicies.length === 0) {
      return {
        answer: "No policy content found in the system. Please add some policies with content first.",
        confidence: 1.0
      };
    }
    
    // Try keyword-based search first (always works as a fallback)
    const keywordResult = performKeywordSearch(query, validPolicies);
    
    // Only use keyword search if it's extremely high confidence (almost perfect match)
    // This increases the likelihood of using AI for most queries
    if (keywordResult.policyId && keywordResult.confidence > 0.95) {
      console.log("Using keyword search results (extremely high confidence)");
      return keywordResult;
    }
    
    // Otherwise, try the AI models
    console.log("Keyword search yielded low confidence, attempting AI search...");
    
    // Create a more structured context from all policies, limiting to manageable chunks
    // and ensuring content is properly formatted
    const context = validPolicies.map(p => {
      // Format the content to ensure it's clean UTF-8 text
      let cleanContent = p.content || '';
      
      // Basic sanitization and formatting
      cleanContent = cleanContent.trim()
        .replace(/\u0000/g, '') // Remove null bytes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .substring(0, 1500); // Limit length to avoid token issues
      
      return `POLICY #${p.id} - ${p.title}:\n${cleanContent}\n\n`;
    }).join('');

    // Enhanced prompt format for advanced language models like Mistral and Llama
    const prompt = `<s>[INST] You are PolicyBot, an AI assistant specializing in finding information in company policies.

I need your help answering a question based on these company policies:

${context}

USER QUESTION: ${query}

Your task:
1. Carefully read each policy and identify the one that best answers the question
2. Extract and quote the EXACT text from the policy that provides the answer
3. Include the policy ID number in your response
4. Assess your confidence in the answer (from 0.0 to 1.0)
5. If no policy directly addresses the question, clearly state this fact
6. IMPORTANT: You must format your entire response as a valid JSON object following the required format below

Format your response ONLY as a JSON object with these fields:
- policyId: The numeric ID of the policy that contains the answer
- answer: A quoted excerpt from the policy with the relevant information
- confidence: A number between 0.0 and 1.0 indicating your confidence level

JSON EXAMPLE RESPONSE:
{"policyId": 2, "answer": "According to Policy #2, 'employees must report incidents within 24 hours'", "confidence": 0.9}

Do not include any other text, explanations, or commentary in your response - only return a properly formatted JSON object.
[/INST]`;

    // Call the model with enhanced error handling and fallback
    let response: any = null;
    try {
      console.log(`Attempting to call Hugging Face model: ${DEFAULT_MODEL}`);
      response = await hf.textGeneration({
        model: DEFAULT_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,  // Larger token count for more detailed responses
          temperature: 0.2,     // Lower temperature for more consistent, focused answers
          return_full_text: false,
          top_p: 0.9,           // Top-p sampling for better quality outputs
          repetition_penalty: 1.2 // Prevent repetitive responses
        }
      });
      console.log("Primary model response received successfully");
    } catch (modelError) {
      console.error("Error with primary model:", modelError);
      
      // Try each fallback model in sequence until one works
      let fallbackSucceeded = false;
      
      for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackSucceeded) break;
        
        try {
          console.log(`Attempting fallback model: ${fallbackModel}`);
          response = await hf.textGeneration({
            model: fallbackModel,
            inputs: prompt,
            parameters: {
              max_new_tokens: 800,  // Larger token count for more detailed responses
              temperature: 0.2,     // Lower temperature for more consistent, focused answers
              return_full_text: false,
              top_p: 0.9,           // Top-p sampling for better quality outputs
              repetition_penalty: 1.2 // Prevent repetitive responses
            }
          });
          console.log(`Fallback model ${fallbackModel} response received successfully`);
          fallbackSucceeded = true;
        } catch (fallbackError) {
          console.error(`Error with fallback model ${fallbackModel}:`, fallbackError);
        }
      }
      
      if (!fallbackSucceeded) {
        console.error("All AI models failed, using keyword search results as fallback");
        return keywordResult;
      }
    }

    let result;
    try {
      // Make sure response exists and contains generated text before proceeding
      if (!response || !response.generated_text) {
        throw new Error("Invalid or empty response from AI model");
      }
      
      // Extract JSON from the response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (error) {
      console.error("Failed to parse JSON from AI response:", response?.generated_text || "No response text");
      // Fallback to keyword search if we can't parse the AI response
      console.log("Failed to parse AI response, using keyword search results as fallback");
      return keywordResult;
    }

    // Find the policy details if a policyId was returned
    let policyTitle = undefined;
    if (result.policyId) {
      const policy = validPolicies.find(p => p.id === result.policyId);
      if (policy) {
        policyTitle = policy.title;
      }
    }

    return {
      answer: result.answer,
      policyId: result.policyId || undefined,
      policyTitle,
      confidence: result.confidence || 0.5
    };

  } catch (error: any) {
    console.error("Error in search process:", error);
    
    // Always fall back to keyword search when AI fails
    console.log("Falling back to keyword search due to error");
    return performKeywordSearch(query, policies.filter(p => p.content && p.content.trim() !== ''));
  }
}

// Reliable keyword-based search as a fallback when AI is not available
function performKeywordSearch(query: string, policies: Policy[]): {
  answer: string;
  policyId?: number;
  policyTitle?: string;
  confidence: number;
} {
  console.log("Performing keyword-based policy search");
  
  if (!policies || policies.length === 0) {
    return {
      answer: "No policies available to search.",
      confidence: 1.0
    };
  }
  
  // Prepare the search query by normalizing and extracting keywords
  const searchTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2) // Ignore short words
    .filter(word => !['the', 'and', 'for', 'with', 'that', 'what', 'when', 'where', 'why', 'how'].includes(word)); // Remove common stop words

  if (searchTerms.length === 0) {
    return {
      answer: "Please provide a more specific search query with keywords related to the policy you're looking for.",
      confidence: 1.0
    };
  }
  
  console.log("Search terms:", searchTerms);
  
  // Score each policy based on the presence of search terms
  const policyScores = policies.map(policy => {
    const normalizedContent = (policy.content || '').toLowerCase();
    const normalizedTitle = (policy.title || '').toLowerCase();
    
    // Calculate how many of the search terms appear in the content
    let termMatches = 0;
    let exactPhraseBonus = 0;
    let titleMatches = 0;
    
    // Check for the whole query as an exact phrase
    if (normalizedContent.includes(query.toLowerCase())) {
      exactPhraseBonus = 5; // Big bonus for exact phrase match
    }
    
    // Count term matches in content
    searchTerms.forEach(term => {
      if (normalizedContent.includes(term)) {
        termMatches++;
      }
      
      // Extra points for terms in the title
      if (normalizedTitle.includes(term)) {
        titleMatches++;
      }
    });
    
    // Calculate a score based on matches
    const matchRatio = termMatches / searchTerms.length;
    const titleBonus = titleMatches * 0.5; // Bonus points for title matches
    
    // Final score formula
    const score = matchRatio + titleBonus + exactPhraseBonus;
    
    // Find the best matching paragraph if we have any matches
    let bestParagraph = "";
    let bestParagraphScore = 0;
    
    if (termMatches > 0) {
      // Split content into paragraphs and find the one with most matches
      const paragraphs = normalizedContent.split(/\n+/);
      
      paragraphs.forEach(paragraph => {
        if (paragraph.trim().length < 10) return; // Skip very short paragraphs
        
        let paragraphScore = 0;
        searchTerms.forEach(term => {
          if (paragraph.includes(term)) {
            paragraphScore++;
          }
        });
        
        // Check for exact phrase in paragraph (big bonus)
        if (paragraph.includes(query.toLowerCase())) {
          paragraphScore += 3;
        }
        
        if (paragraphScore > bestParagraphScore) {
          bestParagraphScore = paragraphScore;
          bestParagraph = paragraph;
        }
      });
    }
    
    return {
      policy,
      score,
      bestParagraph,
      matchRatio,
      titleMatches,
      termMatches,
    };
  });
  
  // Sort by score (descending)
  policyScores.sort((a, b) => b.score - a.score);
  
  // Get the best match
  const bestMatch = policyScores[0];
  
  if (bestMatch.score < 0.2) {
    return {
      answer: `No policy directly addresses '${query}'. Try a different search query.`,
      confidence: 0.3
    };
  }
  
  // Calculate confidence based on the score
  // Map the score to a confidence between 0.5 and 0.95
  const confidence = Math.min(0.95, Math.max(0.5, bestMatch.score / 5));
  
  // Find a relevant excerpt from the content
  let excerpt = bestMatch.bestParagraph;
  
  // If no good paragraph was found, but we had term matches, create a simple excerpt
  if (!excerpt && bestMatch.termMatches > 0) {
    const normalizedContent = (bestMatch.policy.content || '').toLowerCase();
    const firstTerm = searchTerms.find(term => normalizedContent.includes(term)) || '';
    
    if (firstTerm) {
      const termIndex = normalizedContent.indexOf(firstTerm);
      const startIndex = Math.max(0, termIndex - 50);
      const endIndex = Math.min(normalizedContent.length, termIndex + 100);
      excerpt = normalizedContent.substring(startIndex, endIndex) + '...';
    }
  }
  
  // Format the answer
  let answer: string;
  
  if (excerpt) {
    answer = `According to ${bestMatch.policy.title} (Policy #${bestMatch.policy.id}), "${excerpt.trim()}"`;
  } else {
    answer = `${bestMatch.policy.title} (Policy #${bestMatch.policy.id}) may be relevant to your query, but no specific section directly addresses "${query}".`;
  }
  
  return {
    answer,
    policyId: bestMatch.policy.id,
    policyTitle: bestMatch.policy.title,
    confidence
  };
}

/**
 * Analyze policy content to extract key information and summary
 * @param policyContent The content of the policy to analyze
 * @returns Analysis with summary and key points
 */
/**
 * Answer a specific question about a document using Hugging Face AI
 * @param documentContent The content of the document
 * @param question The question to answer
 * @returns Answer with confidence score
 */
export async function answerDocumentQuestion(documentContent: string, question: string): Promise<{
  answer: string;
  confidence: number;
}> {
  try {
    // Truncate document content if needed to fit in context window
    const truncatedContent = documentContent.slice(0, 4000); 
    
    // Create a prompt for the model
    const prompt = `<s>[INST] You are PolicyBot, an AI assistant specializing in answering questions about documents.

I need you to answer a question based on this document:

"""
${truncatedContent}
"""

USER QUESTION: ${question}

Your task:
1. Carefully read the document and identify the specific information that answers the question
2. Provide a direct, concise answer based ONLY on what's in the document
3. Include relevant quotes from the document where appropriate
4. If the document doesn't contain information to answer the question, clearly state that fact
5. Format your answer as a JSON object with these fields:
   - "answer": Your detailed answer to the question
   - "confidence": A number between 0.0 and 1.0 indicating your confidence level

Example Response:
{"answer": "According to the document, employee requests for time off must be submitted at least 2 weeks in advance.", "confidence": 0.9}

IMPORTANT: You must format your entire response as a valid JSON object. Do not include any other text, explanations, or commentary - only return a properly formatted JSON object.
[/INST]`;

    // Call the model with error handling
    let response: any = null;
    try {
      console.log(`Calling Hugging Face model for document Q&A: ${DEFAULT_MODEL}`);
      response = await hf.textGeneration({
        model: DEFAULT_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.2,
          return_full_text: false,
        }
      });
      console.log("Document Q&A model response received");
    } catch (modelError) {
      console.error("Error with primary model for document Q&A:", modelError);
      
      // Try fallback models
      let fallbackSucceeded = false;
      
      for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackSucceeded) break;
        
        try {
          console.log(`Attempting fallback model for document Q&A: ${fallbackModel}`);
          response = await hf.textGeneration({
            model: fallbackModel,
            inputs: prompt,
            parameters: {
              max_new_tokens: 800,
              temperature: 0.2,
              return_full_text: false,
            }
          });
          console.log(`Fallback model ${fallbackModel} document Q&A response received`);
          fallbackSucceeded = true;
        } catch (fallbackError) {
          console.error(`Error with fallback model ${fallbackModel} for document Q&A:`, fallbackError);
        }
      }
      
      if (!fallbackSucceeded) {
        // If all models fail, provide a basic response
        return {
          answer: "I apologize, but I encountered an issue processing your question. Please try again later or rephrase your question.",
          confidence: 0.1
        };
      }
    }

    try {
      // Extract JSON from response
      if (!response || !response.generated_text) {
        throw new Error("Invalid or empty response from AI model");
      }
      
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          answer: result.answer || "I couldn't find a specific answer to that question in the document.",
          confidence: result.confidence || 0.5
        };
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse document Q&A response:", parseError);
      console.log("Raw response:", response?.generated_text || "No response text");
      
      // Attempt to extract anything useful from the raw response
      const rawText = response?.generated_text || "";
      if (rawText.length > 0) {
        return {
          answer: rawText.slice(0, 500) + "...",
          confidence: 0.4
        };
      } else {
        return {
          answer: "I apologize, but I couldn't process your question effectively. Please try again with a different question.",
          confidence: 0.1
        };
      }
    }
  } catch (error) {
    console.error("Error in document question answering:", error);
    return {
      answer: "An error occurred while processing your question. Please try again later.",
      confidence: 0.0
    };
  }
}

/**
 * Answer a specific question about a policy using Hugging Face AI
 * @param policies Array of policies to search through
 * @param question The question to answer
 * @returns Answer with policy information and confidence score
 */
export async function answerPolicyQuestion(policies: Policy[], question: string): Promise<{
  answer: string;
  policyId?: number;
  policyTitle?: string;
  confidence: number;
}> {
  // This is essentially a renamed wrapper for searchPoliciesWithAI
  return searchPoliciesWithAI(question, policies);
}

export async function analyzePolicyContent(policyContent: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  try {
    // Try algorithmic analysis first as a reliable fallback
    const backupAnalysis = generateBasicAnalysis(policyContent);
    
    // Enhanced prompt format for advanced language models like Mistral and Llama
    const prompt = `<s>[INST] You are PolicyBot, an AI assistant specializing in analyzing company policies and procedures.

I need your help analyzing this policy document:

"""
${policyContent}
"""

Tasks:
1. Provide a CONCISE summary of the policy (3 sentences maximum)
2. Extract 3-5 KEY POINTS that represent the most important aspects of this policy
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

    // Call the model with enhanced error handling and fallback
    let response: any = null;
    try {
      console.log(`Attempting to call Hugging Face model for analysis: ${DEFAULT_MODEL}`);
      response = await hf.textGeneration({
        model: DEFAULT_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.2,
          return_full_text: false,
        }
      });
      console.log("Primary model analysis response received successfully");
    } catch (modelError) {
      console.error("Error with primary model for analysis:", modelError);
      
      // Try each fallback model in sequence until one works
      let fallbackSucceeded = false;
      
      for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackSucceeded) break;
        
        try {
          console.log(`Attempting fallback model for analysis: ${fallbackModel}`);
          response = await hf.textGeneration({
            model: fallbackModel,
            inputs: prompt,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.2,
              return_full_text: false,
            }
          });
          console.log(`Fallback model ${fallbackModel} analysis response received successfully`);
          fallbackSucceeded = true;
        } catch (fallbackError) {
          console.error(`Error with fallback model ${fallbackModel} for analysis:`, fallbackError);
        }
      }
      
      if (!fallbackSucceeded) {
        console.log("All AI models failed for analysis, using algorithmic analysis as fallback");
        return backupAnalysis;
      }
    }

    let result;
    try {
      // Make sure response exists and contains generated text before proceeding
      if (!response || !response.generated_text) {
        throw new Error("Invalid or empty response from AI model");
      }
      
      // Extract JSON from the response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (error) {
      console.error("Failed to parse JSON from AI response:", response?.generated_text || "No response text");
      // Fallback to algorithmic analysis
      console.log("Failed to parse AI response, using algorithmic analysis as fallback");
      return backupAnalysis;
    }

    return {
      summary: result.summary || "No summary provided",
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : ["No key points provided"]
    };
  } catch (error: any) {
    console.error("Error analyzing policy content:", error);
    
    // Always fall back to algorithmic analysis when AI fails
    console.log("Falling back to algorithmic analysis due to error");
    return generateBasicAnalysis(policyContent);
  }
}

// Basic algorithmic document analysis for fallback when AI is unavailable
function generateBasicAnalysis(policyContent: string): {
  summary: string;
  keyPoints: string[];
} {
  if (!policyContent || policyContent.trim() === '') {
    return {
      summary: "No content provided for analysis.",
      keyPoints: ["Empty document detected", "Please provide content to analyze"]
    };
  }
  
  const content = policyContent.trim();
  
  // Get first paragraph as the intro summary
  const paragraphs = content.split(/\n+/).filter(p => p.trim().length > 10);
  let summary = "";
  
  if (paragraphs.length > 0) {
    // Use first paragraph but limit length
    summary = paragraphs[0].length > 200 
      ? paragraphs[0].substring(0, 200) + "..." 
      : paragraphs[0];
  } else {
    // If no paragraphs, use first 200 chars
    summary = content.length > 200 
      ? content.substring(0, 200) + "..." 
      : content;
  }
  
  // Find key points by looking for:
  // 1. Paragraphs with important keywords
  // 2. Lists or bullet points
  // 3. Sections with numbers or headers
  
  const keywordList = [
    'must', 'required', 'prohibited', 'important', 'never', 'always',
    'policy', 'procedure', 'regulation', 'rule', 'law', 'mandatory',
    'compliance', 'consequences', 'violation', 'penalty', 'fine', 'legal',
    'deadline', 'critical', 'safety', 'security', 'privacy', 'confidential',
    'liability', 'responsible', 'requirement', 'obligated', 'obligation'
  ];
  
  // Score paragraphs based on keywords and format cues
  const scoredParagraphs = paragraphs.map(p => {
    const lowerP = p.toLowerCase();
    let score = 0;
    
    // Check for keywords
    keywordList.forEach(keyword => {
      if (lowerP.includes(keyword)) {
        score += 1;
      }
    });
    
    // Boost score for formatting cues
    if (p.includes('•') || p.includes('*') || /^\s*[\d#\-•]+\s+/.test(p)) {
      score += 3; // Likely a bullet point
    }
    
    if (/^\s*\d+[\.)]\s+/.test(p)) {
      score += 2; // Numbered item
    }
    
    if (/^[A-Z][A-Z\s]+:/.test(p)) {
      score += 2; // ALL CAPS header
    }
    
    return { text: p, score };
  });
  
  // Sort by score and take top 5
  scoredParagraphs.sort((a, b) => b.score - a.score);
  const topPoints = scoredParagraphs.slice(0, 5);
  
  // Format key points
  const keyPoints = topPoints.map(item => {
    let point = item.text;
    // Truncate if too long
    if (point.length > 120) {
      point = point.substring(0, 120) + "...";
    }
    return point;
  });
  
  // If we couldn't find good key points, create generic ones
  if (keyPoints.length === 0) {
    const contentChunks = content.split(/\s+/);
    const chunkSize = Math.max(10, Math.floor(contentChunks.length / 5));
    
    // Create points from document chunks
    for (let i = 0; i < Math.min(5, contentChunks.length / chunkSize); i++) {
      const startIdx = i * chunkSize;
      const chunk = contentChunks.slice(startIdx, startIdx + chunkSize).join(' ');
      keyPoints.push(chunk);
    }
  }
  
  // If still no key points, use a default message
  if (keyPoints.length === 0) {
    keyPoints.push("No clear key points identified in document.");
    keyPoints.push("Please review the full document for details.");
  }
  
  return {
    summary: summary.trim() || "Document analysis completed. No clear summary could be generated.",
    keyPoints: keyPoints.length > 0 ? keyPoints : ["No key points identified in the document."]
  };
}