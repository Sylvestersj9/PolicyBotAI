const fetch = require('node-fetch');
const tf = require('@tensorflow/tfjs');

console.log('Libraries are successfully loaded!');

// Simple TensorFlow.js operation
const tensor = tf.tensor([1, 2, 3, 4]);
tensor.print();  // Should print: [1, 2, 3, 4]

// Simple fetch API request (example using Hugging Face)
const queryHuggingFace = async (text) => {
  const response = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased-distilled-squad', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer YOUR_HUGGINGFACE_API_KEY`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        question: 'What is the purpose of this document?',
        context: text,
      },
    }),
  });
  const data = await response.json();
  console.log(data);
};

// Test the Hugging Face API with some text
const documentText = "Your policy document content goes here...";
queryHuggingFace(documentText);

