import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesPath = path.join(process.cwd(), 'server/routes.ts');
const routesContent = fs.readFileSync(routesPath, 'utf8');

// Find the health endpoint 
const healthEndpoint = 'app.get("/api/extension/health"';
const healthEndpointIndex = routesContent.indexOf(healthEndpoint);

if (healthEndpointIndex === -1) {
  console.error('Could not find health endpoint');
  process.exit(1);
}

// Find the end of the health endpoint block (the closing bracket of the function)
let braceCount = 0;
let endIndex = -1;
for (let i = healthEndpointIndex; i < routesContent.length; i++) {
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
  console.error('Could not find end of health endpoint');
  process.exit(1);
}

// Get the next 10 characters to make sure we're at the right spot
const nextChars = routesContent.substring(endIndex + 1, endIndex + 11);
console.log('Next chars after endpoint:', nextChars);

// Add a bit more to find the end of the line with closing parenthesis and semicolon
const closingPatternIndex = routesContent.indexOf('});', endIndex);
if (closingPatternIndex === -1) {
  console.error('Could not find closing pattern of health endpoint');
  process.exit(1);
}

// End index is actually after the closing pattern
endIndex = closingPatternIndex + 3;

// Diagnostics endpoint content
const diagnosticsEndpoint = `

  // Enhanced diagnostic endpoint for extension testing
  app.get("/api/extension/diagnostics", async (req, res) => {
    try {
      console.log("Extension diagnostics request received");
      
      // Check database connection
      let dbStatus = "unknown";
      let dbError = null;
      let policiesCount = 0;
      try {
        // Try a simple database operation to verify connection
        await storage.getCategories();
        dbStatus = "connected";
        
        // Count policies
        try {
          const policies = await storage.getPolicies();
          policiesCount = policies.length;
        } catch (policyError) {
          console.error("Failed to fetch policies:", policyError);
        }
      } catch (error) {
        console.error("Database connection check failed:", error);
        dbStatus = "disconnected";
        dbError = error instanceof Error ? error.message : String(error);
      }
      
      // Check Hugging Face API connection
      let hfStatus = "unknown";
      let hfDetails = null;
      try {
        if (!process.env.HUGGINGFACE_API_KEY) {
          hfStatus = "not configured";
          hfDetails = "HUGGINGFACE_API_KEY not set";
        } else {
          try {
            const { getHfClient } = await import('./huggingface');
            const hfClient = await getHfClient();
            hfStatus = "available";
          } catch (hfError) {
            hfStatus = "error";
            hfDetails = hfError instanceof Error ? hfError.message : String(hfError);
          }
        }
      } catch (error) {
        console.error("Hugging Face connection check failed:", error);
        hfStatus = "error";
        hfDetails = error instanceof Error ? error.message : String(error);
      }
      
      // Check extension API endpoints
      const testApiKey = 'policybot-test-key-123456';
      
      // Send detailed diagnostic status
      res.status(200).json({
        status: "ok",
        message: "PolicyBot API Diagnostics",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: dbStatus,
          error: dbError,
          type: process.env.DATABASE_URL ? "postgresql" : "in-memory",
          policies: policiesCount
        },
        ai: {
          huggingface: hfStatus,
          details: hfDetails
        },
        extension: {
          apis: {
            health: "/api/extension/health",
            search: "/api/extension/search",
            login: "/api/extension/login",
            testKey: "/api/noauth/test-key"
          },
          testKey: testApiKey
        },
        server: {
          nodejs: process.version,
          memory: process.memoryUsage().heapUsed / 1024 / 1024 + " MB",
          uptime: Math.floor(process.uptime()) + " seconds"
        },
        deployment: {
          nodeEnv: process.env.NODE_ENV || "development",
          isReplit: !!process.env.REPL_SLUG,
          replId: process.env.REPL_ID || null,
          replSlug: process.env.REPL_SLUG || null
        },
        troubleshooting: {
          checkConnection: "Make sure you can reach this endpoint from your extension",
          commonIssues: [
            "API URL must use HTTPS for Chrome extensions",
            "CORS headers are required for cross-origin requests",
            "API key must be included in headers as X-API-Key"
          ]
        }
      });
    } catch (error) {
      console.error("Diagnostics endpoint error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to generate diagnostic information",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });`;

// Insert diagnostics endpoint after health endpoint
const updatedContent = 
  routesContent.substring(0, endIndex) + 
  diagnosticsEndpoint + 
  routesContent.substring(endIndex);

// Write back to the file
fs.writeFileSync(routesPath, updatedContent, 'utf8');
console.log('Successfully added diagnostics endpoint after health endpoint');
