import { HfInference } from '@huggingface/inference';
import { Policy } from '@shared/schema';

// Initialize the Hugging Face client with API key
// Using API key allows access to more powerful models and higher rate limits
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Fallback to a text-generation model if Meta-Llama-3 is not available
// or if there are authentication issues
const DEFAULT_MODEL = 'meta-llama/Meta-Llama-3-8B-Instruct';
const FALLBACK_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

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

    // Format the prompt for instruction-tuned models with improved instructions
    const prompt = `<s>[INST] You are an advanced policy search system that helps users find information in company policies.

Context information from company policies (read this carefully):
${context}

User question: ${query}

Instructions:
1. Carefully analyze the policies to find the most relevant information for the question.
2. Use EXACT information from the policies - do not make up or invent policy details.
3. If there's a relevant policy, provide the policy ID and a direct answer quoting from that policy.
4. If multiple policies are relevant, use the one with the most specific information.
5. If no policy contains relevant information, clearly state that no relevant policy was found.
6. Provide a confidence score between 0 and 1 indicating how confident you are in your answer.

Format your response as JSON with these fields:
- policyId (number or null if no relevant policy)
- answer (string containing your response with relevant quotes from the policy)
- confidence (number between 0 and 1)

Example response format:
{"policyId": 2, "answer": "According to Policy #2, 'Employees must report all incidents within 24 hours.' This directly addresses your question about incident reporting timeframes.", "confidence": 0.92}
[/INST]</s>`;

    // Call the model with error handling and fallback
    let response;
    try {
      response = await hf.textGeneration({
        model: DEFAULT_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.3, // Low temperature for more deterministic output
          return_full_text: false,
        }
      });
    } catch (modelError) {
      console.error("Error with primary model, trying fallback:", modelError);
      // Try with fallback model
      response = await hf.textGeneration({
        model: FALLBACK_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.3,
          return_full_text: false,
        }
      });
    }

    let result;
    try {
      // Extract JSON from the response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (error) {
      console.error("Failed to parse JSON from AI response:", response.generated_text);
      // Fallback to a simpler approach if JSON parsing fails
      return {
        answer: response.generated_text || "I found information that may be helpful, but couldn't format it properly.",
        confidence: 0.5
      };
    }

    // Find the policy details if a policyId was returned
    let policyTitle = undefined;
    if (result.policyId) {
      const policy = policies.find(p => p.id === result.policyId);
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
    console.error("Error querying Hugging Face AI:", error);
    
    // Determine the type of error
    let errorType = "unknown_error";
    let errorMessage = "Sorry, I encountered an error while searching the policies. Please try again later.";
    
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorType = "network_error";
      errorMessage = "Unable to connect to the AI service. Please check your internet connection and try again.";
    } else if (error.status === 429 || (error.message && error.message.includes("rate"))) {
      errorType = "rate_limit";
      errorMessage = "The AI service rate limit has been exceeded. Please try again later.";
    } else if (error.status === 401 || error.status === 403 || 
              (error.message && (error.message.includes("auth") || error.message.includes("key")))) {
      errorType = "auth_error";
      errorMessage = "There was an authentication issue with the AI service. Please contact your administrator.";
    } else if (error.message && error.message.includes("model")) {
      errorType = "model_error";
      errorMessage = "There was a problem with the selected AI model. Please contact your administrator.";
    }
    
    return {
      answer: errorMessage,
      confidence: 0,
      error: errorType
    };
  }
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
    const prompt = `<s>[INST] Analyze this policy document and provide:
1. A concise summary (maximum 3 sentences)
2. 3-5 key points from the document
Format the response as JSON with fields "summary" and "keyPoints" (array of strings).

Policy document:
${policyContent}
[/INST]</s>`;

    // Call the model with error handling and fallback
    let response;
    try {
      response = await hf.textGeneration({
        model: DEFAULT_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.2,
          return_full_text: false,
        }
      });
    } catch (modelError) {
      console.error("Error with primary model for analysis, trying fallback:", modelError);
      // Try with fallback model
      response = await hf.textGeneration({
        model: FALLBACK_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.2,
          return_full_text: false,
        }
      });
    }

    let result;
    try {
      // Extract JSON from the response
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (error) {
      console.error("Failed to parse JSON from AI response:", response.generated_text);
      // Fallback response
      return {
        summary: "Analysis failed to generate a proper summary.",
        keyPoints: ["The analysis could not extract key points from the document."]
      };
    }

    return {
      summary: result.summary || "No summary provided",
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : ["No key points provided"]
    };
  } catch (error: any) {
    console.error("Error analyzing policy content:", error);
    
    // Determine the type of error for better error messaging
    let errorMessage = "Error analyzing the policy content.";
    
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorMessage = "Unable to connect to the AI service. Please check your internet connection.";
    } else if (error.status === 429 || (error.message && error.message.includes("rate"))) {
      errorMessage = "The AI service rate limit has been exceeded. Please try again later.";
    } else if (error.status === 401 || error.status === 403 || 
              (error.message && (error.message.includes("auth") || error.message.includes("key")))) {
      errorMessage = "There was an authentication issue with the AI service.";
    } else if (error.message && error.message.includes("model")) {
      errorMessage = "There was a problem with the selected AI model.";
    }
    
    return {
      summary: errorMessage,
      keyPoints: ["Analysis failed due to an error.", "Please try again later or contact support."]
    };
  }
}