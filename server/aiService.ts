// aiService.ts

import axios from 'axios';  // or any other HTTP library or custom API client you're using

export async function sendToAI(text: string, res: any) {
  try {
    // Replace this with your AI service endpoint
    const aiEndpoint = 'https://your-ai-endpoint.com/analyze'; 

    // Send the extracted text to your AI model
    const response = await axios.post(aiEndpoint, {
      data: text,
    });

    // Send the AI response back to the client
    res.send({
      success: true,
      aiResponse: response.data,  // AI's response
    });
  } catch (error) {
    console.error('Error sending to AI:', error);
    res.status(500).send({ message: 'Error processing the file with AI.' });
  }
}
