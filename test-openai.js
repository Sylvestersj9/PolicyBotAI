import OpenAI from 'openai';

async function testOpenAI() {
  try {
    console.log("Testing OpenAI API...");
    
    // Initialize the OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log("API Key:", process.env.OPENAI_API_KEY ? "Present (first 4 chars: " + process.env.OPENAI_API_KEY.substring(0, 4) + "...)" : "Not present");
    
    console.log("Making API request...");
    // Try a simple test call
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, this is a test." }
      ],
      max_tokens: 50
    });
    
    console.log("Response received:", JSON.stringify(response, null, 2));
    console.log("Test completed successfully!");
    
  } catch (error) {
    console.error("Error testing OpenAI:", error);
  }
}

testOpenAI();