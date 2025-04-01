console.log('TypeScript is working!');
import express from 'express';

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies
app.post('/ask', async (req, res) => {
  // Extract question and document text from the request body
  const { question, documentText } = req.body;

  // Check if question and document text are provided
  if (!question || !documentText) {
    return res.status(400).json({ error: 'Question and documentText are required' });
  }

  try {
    // Call Hugging Face API to get an answer based on the policy document
    const response = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased-distilled-squad', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer YOUR_HUGGINGFACE_API_KEY`, // Add your Hugging Face API Key here
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          question: question,
          context: documentText, // This is the policy document content
        },
      }),
    });

    const data = await response.json(); // Get the AI response
    res.json({ answer: data.answer });  // Send the AI's answer back to the user
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
});
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
