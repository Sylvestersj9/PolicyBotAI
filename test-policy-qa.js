import axios from 'axios';
import 'dotenv/config';

const API_URL = 'http://localhost:5000';
const username = 'admin';
const password = 'password123';

// The policy content to test with
const policyContent = `
# Remote Work Policy

## Purpose
This policy outlines the guidelines for employees who work remotely, either on a full-time or part-time basis.

## Eligibility
Employees may be eligible for remote work if their job duties can be performed remotely and they have demonstrated the ability to work independently.

## Expectations
1. Remote employees must maintain the same productivity levels as office-based employees.
2. Remote employees must be available during core business hours (9:00 AM - 5:00 PM local time).
3. Remote employees must attend all required virtual meetings.
4. Remote employees must have a reliable internet connection with minimum 25 Mbps download and 5 Mbps upload speeds.

## Equipment
The company will provide the following equipment to remote employees:
- Laptop computer
- Monitor
- Keyboard and mouse
- Headset for virtual meetings

Remote employees are responsible for maintaining a suitable workspace with an ergonomic setup.

## Security
Remote employees must:
1. Use the company VPN when accessing company resources
2. Ensure their home network is secured with WPA2 or WPA3 encryption
3. Lock their computer when not in use
4. Store company documents in approved cloud storage, not on local drives
5. Report any security incidents immediately to IT

## Communication
Remote employees must:
1. Be responsive to emails and messages during business hours
2. Use approved communication tools (Slack, Microsoft Teams, etc.)
3. Update their status when away from their desk
4. Attend daily team check-ins

## In-Office Requirements
Remote employees may be required to come to the office for:
1. Team-building activities
2. Quarterly planning sessions
3. Annual company meetings
4. Training that cannot be conducted virtually

## Expenses
Remote employees may be reimbursed for:
1. Internet costs (up to $50 per month)
2. Cell phone usage for business purposes
3. Office supplies with prior approval

## Termination
Remote work arrangements may be terminated if:
1. Job responsibilities change
2. Performance issues arise
3. Business needs require in-office presence
`;

// Sample questions to test
const questions = [
  "What are the core business hours for remote employees?",
  "What equipment does the company provide to remote employees?",
  "What security measures must remote employees follow?",
  "When might remote employees need to come to the office?",
  "What expenses can be reimbursed for remote workers?"
];

// Function to log in and get API key
async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_URL}/api/extension/login`, { 
      username, 
      password 
    });
    
    if (response.data && response.data.success && response.data.apiKey) {
      console.log('Login successful! API key obtained.');
      return response.data.apiKey;
    } else {
      console.error('Login failed:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error logging in:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return null;
  }
}

// Function to ask a question about the policy
async function askPolicyQuestion(apiKey, question) {
  try {
    console.log(`\nAsking: "${question}"`);
    
    // First try with the extension API endpoint
    try {
      const response = await axios.post(
        `${API_URL}/api/extension/ask-policy`,
        { 
          question, 
          policyContent 
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          } 
        }
      );
      
      if (response.data && response.data.success) {
        console.log('-------------------------------------------');
        console.log(`Q: ${question}`);
        console.log(`A: ${response.data.answer}`);
        console.log(`Confidence: ${response.data.confidence.toFixed(2)}`);
        console.log('-------------------------------------------');
        return true;
      }
    } catch (extensionError) {
      console.log("Extension API failed, trying direct API...");
      
      // If extension API fails, try the direct API endpoint
      const directResponse = await axios.post(
        `${API_URL}/api/ask-direct`,
        { 
          question, 
          text: policyContent 
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          } 
        }
      );
      
      if (directResponse.data && directResponse.data.success) {
        console.log('-------------------------------------------');
        console.log(`Q: ${question}`);
        console.log(`A: ${directResponse.data.answer}`);
        console.log(`Confidence: ${directResponse.data.confidence.toFixed(2)}`);
        console.log('-------------------------------------------');
        return true;
      } else {
        console.error('Question failed with direct API:', directResponse.data);
        return false;
      }
    }
  } catch (error) {
    console.error('Error asking question:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return false;
  }
}

// Main function to run the test
async function main() {
  // Login to get API key
  const apiKey = await login();
  if (!apiKey) {
    console.error('Could not obtain API key. Aborting test.');
    return;
  }
  
  console.log('Starting policy Q&A test with sample remote work policy...');
  
  // Ask each question in the list
  for (const question of questions) {
    await askPolicyQuestion(apiKey, question);
  }
  
  console.log('\nTest completed!');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error in main:', err);
});