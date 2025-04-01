import { HfInference } from '@huggingface/inference';
import { Policy } from '@shared/schema';

// Initialize the Hugging Face client with API key
// Using API key allows access to more powerful models and higher rate limits
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Using even more widely accessible models that should work with free API keys
// These models are more reliably accessible to free/public API keys
const DEFAULT_MODEL = 'gpt2';
const FALLBACK_MODELS = ['distilgpt2', 'distilbert-base-uncased', 'bert-base-uncased'];

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
  try {
    if (!policies || policies.length === 0) {
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
    
    // If we found a good match with keywords, return it right away
    if (keywordResult.policyId && keywordResult.confidence > 0.7) {
      console.log("Using keyword search results (high confidence)");
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

    // Simplified prompt format for flan-t5-xl and gpt2 models
    const prompt = `You are a policy search system. Find information in these company policies:

${context}

User question: ${query}

Instructions:
1. Find the most relevant information from the policies for this question.
2. Use exact quotes from the policies - don't make things up.
3. Provide the policy ID and quote the relevant section.
4. If no policy has relevant information, clearly state that.
5. Give a confidence score from 0 to 1.

Format your response as JSON:
{"policyId": 2, "answer": "According to Policy #2, employees must report incidents within 24 hours", "confidence": 0.9}`;

    // Call the model with enhanced error handling and fallback
    let response: any = null;
    try {
      console.log(`Attempting to call Hugging Face model: ${DEFAULT_MODEL}`);
      response = await hf.textGeneration({
        model: DEFAULT_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.3, // Low temperature for more deterministic output
          return_full_text: false,
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
              max_new_tokens: 500,
              temperature: 0.3,
              return_full_text: false,
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
export async function analyzePolicyContent(policyContent: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  try {
    // Try algorithmic analysis first as a reliable fallback
    const backupAnalysis = generateBasicAnalysis(policyContent);
    
    // Simplified prompt format for flan-t5-xl and gpt2 models
    const prompt = `Analyze this policy document and provide:
1. A concise summary (maximum 3 sentences)
2. 3-5 key points from the document

Policy document:
${policyContent}

Format your response as JSON with fields "summary" and "keyPoints" (array of strings).`;

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