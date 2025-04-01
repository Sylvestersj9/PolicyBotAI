import { HfInference } from '@huggingface/inference';

// Initialize the Hugging Face client with API key
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Using the Mistral model as default
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

// Simple test prompt
const prompt = `<s>[INST] You are PolicyBot, an AI assistant specializing in finding information in company policies.

I have a simple question: What is the vacation policy?

Format your response ONLY as a JSON object with these fields:
- answer: A quoted excerpt with relevant information
- confidence: A number between 0.0 and 1.0 indicating your confidence level

JSON EXAMPLE RESPONSE:
{"answer": "I don't have specific information about the vacation policy. Please provide policy documents to analyze.", "confidence": 0.9}
[/INST]`;

// Test the Hugging Face API
async function testHuggingFace() {
  try {
    console.log("Testing Hugging Face API with model:", DEFAULT_MODEL);
    console.log("API Key:", process.env.HUGGINGFACE_API_KEY ? "Key exists (not showing for security)" : "No API key found");
    
    const response = await hf.textGeneration({
      model: DEFAULT_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.2,
        return_full_text: false,
      }
    });
    
    console.log("Response from Hugging Face API:");
    console.log(JSON.stringify(response, null, 2));
    
    // Try to extract JSON from the response
    try {
      const jsonMatch = response.generated_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log("\nExtracted JSON:");
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log("\nNo JSON found in response");
      }
    } catch (jsonError) {
      console.log("\nError parsing JSON:", jsonError.message);
    }
    
  } catch (error) {
    console.error("Error calling Hugging Face API:", error);
  }
}

// Run the test
testHuggingFace();