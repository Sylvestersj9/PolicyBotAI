import OpenAI from "openai";
import { Policy } from "@shared/schema";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Search through policies using OpenAI's AI to find the most relevant information
 * @param query The user's search query
 * @param policies Array of policies to search through
 * @returns Search result with answer, policy reference, and confidence score
 */
export async function searchPoliciesWithAI(query: string, policies: Policy[]): Promise<{
  answer: string;
  policyId?: number;
  policyTitle?: string;
  confidence: number;
}> {
  try {
    // Create a context of all policies for the AI to search through
    const policiesContext = policies.map(policy => 
      `POLICY ID: ${policy.id}
TITLE: ${policy.title}
REFERENCE: ${policy.policyRef}
CATEGORY: ${policy.categoryId}
CONTENT:
${policy.content}
---`
    ).join("\n\n");

    // If there are no policies, return appropriate message
    if (policies.length === 0) {
      return {
        answer: "No policies available to search. Please add policies to the system first.",
        confidence: 0
      };
    }

    // Prompt for the AI to search through policies
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant for a company's policies and procedures database.
Your task is to find the most relevant information from the company policies to answer user questions.
When responding:
1. Look through all the policies provided and find the most relevant information for the query.
2. Provide a clear, specific answer based only on information in the policies.
3. Include the policy ID and title of the most relevant policy.
4. If the query cannot be answered with the available policies, say so clearly.
5. Provide a confidence score from 0.0 to 1.0 about how well the answer matches the query.
6. Format your response as valid JSON with the following structure:
{
  "answer": "The detailed answer to the query based on policy content",
  "policyId": 123,
  "policyTitle": "Title of the most relevant policy",
  "confidence": 0.95
}
If no policy is found that answers the query, set policyId and policyTitle to null.`
        },
        {
          role: "user",
          content: `Search query: "${query}"

Available policies:
${policiesContext}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000,
    });

    // Parse the response safely
    const messageContent = response.choices[0]?.message?.content ?? "{}";
    console.log("OpenAI response content:", messageContent);
    
    try {
      const result = JSON.parse(messageContent);
      
      return {
        answer: result.answer || "No specific answer found in the policies.",
        policyId: result.policyId || undefined,
        policyTitle: result.policyTitle || undefined,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0
      };
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      return {
        answer: "Error parsing AI response. Raw response: " + messageContent.substring(0, 200),
        confidence: 0
      };
    }
  } catch (error) {
    console.error("OpenAI search error:", error);
    
    // Return a graceful error response
    return {
      answer: "An error occurred while searching policies. Please try again later.",
      confidence: 0
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a policy analysis expert. Analyze the following policy document and provide:
1. A concise summary (max 100 words)
2. 3-5 key points from the policy
Respond in JSON format with "summary" and "keyPoints" fields.`
        },
        {
          role: "user",
          content: policyContent
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 800,
    });

    // Parse the response safely
    const messageContent = response.choices[0]?.message?.content ?? "{}";
    console.log("OpenAI policy analysis response content:", messageContent);
    
    try {
      const result = JSON.parse(messageContent);
      
      return {
        summary: result.summary || "No summary available.",
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : []
      };
    } catch (parseError) {
      console.error("Failed to parse OpenAI policy analysis response:", parseError);
      return {
        summary: "Error parsing AI response for policy analysis.",
        keyPoints: []
      };
    }
  } catch (error) {
    console.error("OpenAI policy analysis error:", error);
    
    // Return a graceful error response
    return {
      summary: "An error occurred while analyzing the policy.",
      keyPoints: []
    };
  }
}