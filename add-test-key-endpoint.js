import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.join(process.cwd(), 'server/routes.ts');
const routesContent = fs.readFileSync(routesPath, 'utf8');

// Find the test endpoint 
const testEndpoint = 'app.get("/api/test"';
const testEndpointIndex = routesContent.indexOf(testEndpoint);

if (testEndpointIndex === -1) {
  console.error('Could not find test endpoint');
  process.exit(1);
}

// Find the end of the test endpoint block (the closing bracket of the function)
let braceCount = 0;
let endIndex = -1;
for (let i = testEndpointIndex; i < routesContent.length; i++) {
  const char = routesContent[i];
  if (char === '{') braceCount++;
  if (char === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }
}

if (endIndex === -1) {
  console.error('Could not find end of test endpoint');
  process.exit(1);
}

// Get the next 10 characters to make sure we're at the right spot
const nextChars = routesContent.substring(endIndex + 1, endIndex + 11);
console.log('Next chars after endpoint:', nextChars);

// Add a bit more to find the end of the line with closing parenthesis and semicolon
const closingPatternIndex = routesContent.indexOf('});', endIndex);
if (closingPatternIndex === -1) {
  console.error('Could not find closing pattern of test endpoint');
  process.exit(1);
}

// End index is actually after the closing pattern
endIndex = closingPatternIndex + 3;

// Test API key endpoint content
const testKeyEndpoint = `

  // Special no-auth test key endpoint for extension testing
  app.get("/api/noauth/test-key", (req, res) => {
    const testApiKey = 'policybot-test-key-123456';
    res.json({ 
      message: "This is a test API key for PolicyBot extension testing",
      apiKey: testApiKey,
      note: "This key provides limited access for testing only. Use only in development.",
      instructions: [
        "1. Enter this API key in your extension settings",
        "2. Test basic search functionality without needing an account",
        "3. For full access, register and get your personal API key"
      ]
    });
  });`;

// Insert test key endpoint after test endpoint
const updatedContent = 
  routesContent.substring(0, endIndex) + 
  testKeyEndpoint + 
  routesContent.substring(endIndex);

// Write back to the file
fs.writeFileSync(routesPath, updatedContent, 'utf8');
console.log('Successfully added test API key endpoint after test endpoint');
