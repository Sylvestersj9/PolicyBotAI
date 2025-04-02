import { HfInference } from '@huggingface/inference';
import 'dotenv/config';

console.log('Testing Hugging Face API');
console.log(`API Key available: ${process.env.HUGGINGFACE_API_KEY ? 'Yes (length: ' + process.env.HUGGINGFACE_API_KEY.length + ')' : 'No'}`);

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Using a simple text generation model for testing
const testHuggingFace = async () => {
  try {
    console.log('Making test request to Hugging Face API...');
    const response = await hf.textGeneration({
      model: 'gpt2',  // Simple model for quick testing
      inputs: 'Hello, my name is',
      parameters: {
        max_new_tokens: 20,
        return_full_text: false,
      }
    });
    
    console.log('Success! Response:');
    console.log(response.generated_text);
    return true;
  } catch (error) {
    console.error('Error testing Hugging Face API:');
    console.error(error);
    return false;
  }
};

// Try to use the Mistral model
const testMistral = async () => {
  try {
    console.log('\nTesting Mistral model...');
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: '<s>[INST] What is artificial intelligence? [/INST]',
      parameters: {
        max_new_tokens: 100,
        return_full_text: false,
      }
    });
    
    console.log('Success! Mistral model response:');
    console.log(response.generated_text);
    return true;
  } catch (error) {
    console.error('Error testing Mistral model:');
    console.error(error);
    return false;
  }
};

// Run tests
(async () => {
  const basicTestPassed = await testHuggingFace();
  console.log(`Basic API test ${basicTestPassed ? 'PASSED' : 'FAILED'}`);
  
  const mistralTestPassed = await testMistral();
  console.log(`Mistral model test ${mistralTestPassed ? 'PASSED' : 'FAILED'}`);
  
  if (!basicTestPassed && !mistralTestPassed) {
    console.log('\nBoth tests failed. Possible issues:');
    console.log('1. API key may be invalid or revoked');
    console.log('2. API usage quota may be exhausted');
    console.log('3. Network connectivity issues');
    console.log('4. Hugging Face service may be experiencing downtime');
    console.log('\nPlease check the API key and try again.');
  }
})();