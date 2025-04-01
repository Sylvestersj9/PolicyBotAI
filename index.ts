import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Get Hugging Face API key from environment variables
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Function to query Hugging Face API for the answer
const queryHuggingFace = async (question: string, context: string) => {
  const response = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased-distilled-squad', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        question,
        context,
      },
    }),
  });

  // Parse the JSON response from Hugging Face API
  const data = await response.json();
  return data;
};

// Express setup to handle requests
import express from 'express';
const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// Endpoint to handle the question asking process
app.post('/ask', async (req, res) => {
  const { question, document } = req.body; // Document is the policy content

  // Check if the question and document are provided
  if (!question || !document) {
    return res.status(400).json({ error: 'Both question and document are required' });
  }

  try {
    // Get answer from Hugging Face based on the question and document
    const answer = await queryHuggingFace(question, document);

    // Send the answer back as a response
    res.json({ answer: answer[0]?.answer });
  } catch (error) {
    console.error('Error querying Hugging Face:', error);
    res.status(500).json({ error: 'Error querying Hugging Face API' });
  }
});

// Start the server on port 5000
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
