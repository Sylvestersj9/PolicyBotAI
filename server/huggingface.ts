import { HfInference } from '@huggingface/inference';
import { Policy } from '@shared/schema';

// Initialize the Hugging Face client
// For free usage, we can use a public model from Hugging Face
// If you want to use your own API key (recommended for production), you can use:
// const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const hf = new HfInference();

// Default model to use for text generation
// mistralai/Mistral-7B-Instruct-v0.2 is a great open-source model
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

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

    // Create a context from all policies
    const context = policies.map(p => 
      `POLICY #${p.id} - ${p.title}:\n${p.content}\n\n`
    ).join('');

    // Format the prompt for instruction-tuned models
    const prompt = `<s>[INST] I need to answer a question about company policies.

Context information from policies:
${context}

User question: ${query}

Instructions:
1. Find the most relevant policy for the question.
2. If there's a relevant policy, provide the policy ID and a helpful answer based on that policy.
3. If no policy is relevant, say so without making up information.
4. Provide a confidence score between 0 and 1 indicating how confident you are in the answer.
5. Format your response as JSON with these fields: 
   - policyId (number or null)
   - answer (string)
   - confidence (number between 0 and 1)

Example response format:
{"policyId": 2, "answer": "According to our policy...", "confidence": 0.85}
[/INST]</s>`;

    // Call the model
    const response = await hf.textGeneration({
      model: DEFAULT_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.3, // Low temperature for more deterministic output
        return_full_text: false,
      }
    });

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
    return {
      answer: "Sorry, I encountered an error while searching the policies. Please try again later.",
      confidence: 0,
      error: error.message || "unknown_error"
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

    const response = await hf.textGeneration({
      model: DEFAULT_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.2,
        return_full_text: false,
      }
    });

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
  } catch (error) {
    console.error("Error analyzing policy content:", error);
    return {
      summary: "Error analyzing the policy content.",
      keyPoints: ["Analysis failed due to an error."]
    };
  }
}