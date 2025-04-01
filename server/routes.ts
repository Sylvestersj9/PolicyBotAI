import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
// Import the Hugging Face implementation instead of OpenAI
import { searchPoliciesWithAI } from "./huggingface";
import { 
  insertPolicySchema, 
  insertCategorySchema, 
  insertSearchQuerySchema,
  insertActivitySchema
} from "@shared/schema";
import { z } from "zod";
import { uploadSingleFile, processUploadedFile } from "./upload";
import { uploadBase64File } from "./direct-upload";
import path from "path";

// Extend Express.Request interface to include the user and file properties
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        [key: string]: any;
      };
    }
  }
}

// We're now using our dedicated upload module instead of configuring multer here

// Auth middleware to check if the user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Serve files from the uploads directory
  app.use("/uploads", requireAuth, express.static(path.join(process.cwd(), "uploads")));
  
  // API Key validation middleware for extension requests
  const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ message: "API key is required" });
    }
    
    try {
      const user = await storage.getUserByApiKey(apiKey);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid API key" });
      }
      
      // Set the user in the request for later use
      req.user = user;
      next();
    } catch (error) {
      console.error("Error validating API key:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Get all categories
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  // Create a new category
  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const validData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "created",
        resourceType: "category",
        resourceId: category.id,
        details: `Created category "${category.name}"`,
      });
      
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Get all policies
  app.get("/api/policies", requireAuth, async (req, res) => {
    try {
      const policies = await storage.getPolicies();
      res.json(policies);
    } catch (error) {
      res.status(500).json({ message: "Failed to get policies" });
    }
  });

  // Get a specific policy
  app.get("/api/policies/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      
      const policy = await storage.getPolicy(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "viewed",
        resourceType: "policy",
        resourceId: policy.id,
        details: `Viewed policy "${policy.title}"`,
      });
      
      res.json(policy);
    } catch (error) {
      res.status(500).json({ message: "Failed to get policy" });
    }
  });

  // Handle file upload for policies using our dedicated middleware
  app.post("/api/upload-policy-file", requireAuth, uploadSingleFile('file'), async (req, res) => {
    try {
      // The uploadSingleFile middleware has already saved the file to disk
      // and validated its size. Now we need to extract the content.
      const filePath = req.file?.path;
      
      if (!filePath) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Process the uploaded file
      return processUploadedFile(req, res);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to process uploaded file" });
    }
  });
  
  // Alternative upload endpoint with disk storage for larger files
  app.post("/api/upload-file-disk", requireAuth, uploadSingleFile('file'), (req, res) => {
    try {
      processUploadedFile(req, res);
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ 
        message: "Failed to process uploaded file",
        error: error.message || "Unknown error"
      });
    }
  });
  
  // Direct upload endpoint using base64 encoding instead of multipart/form-data
  app.post("/api/direct-upload", requireAuth, (req, res) => {
    uploadBase64File(req, res);
  });
  
  // Serve files from the public/uploads directory without auth for testing
  app.use("/public/uploads", express.static(path.join(process.cwd(), "public", "uploads")));
  
  // Also serve files from /uploads path for better compatibility
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Create a new policy
  app.post("/api/policies", requireAuth, async (req, res) => {
    try {
      const validData = insertPolicySchema.parse({
        ...req.body,
        createdBy: req.user.id,
        policyRef: `POL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      });
      
      const policy = await storage.createPolicy(validData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "created",
        resourceType: "policy",
        resourceId: policy.id,
        details: `Created policy "${policy.title}"`,
      });
      
      res.status(201).json(policy);
    } catch (error) {
      console.error("Policy creation error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      // Provide more specific error message
      let errorMessage = "Failed to create policy";
      if (error instanceof Error) {
        errorMessage += ": " + error.message;
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  // Update a policy
  app.put("/api/policies/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      
      const policy = await storage.getPolicy(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      
      // Validate the update data
      const updatedData = insertPolicySchema.partial().parse(req.body);
      
      // Update the policy
      const updatedPolicy = await storage.updatePolicy(id, updatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "updated",
        resourceType: "policy",
        resourceId: policy.id,
        details: `Updated policy "${policy.title}"`,
      });
      
      res.json(updatedPolicy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update policy" });
    }
  });

  // Delete a policy
  app.delete("/api/policies/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      
      const policy = await storage.getPolicy(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      
      const success = await storage.deletePolicy(id);
      
      if (success) {
        // Log activity
        await storage.createActivity({
          userId: req.user.id,
          action: "deleted",
          resourceType: "policy",
          resourceId: id,
          details: `Deleted policy "${policy.title}"`,
        });
        
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete policy" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete policy" });
    }
  });

  // AI Search endpoint
  app.post("/api/search", requireAuth, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ message: "Query is required" });
      }
      
      // Get all policies for searching
      const policies = await storage.getPolicies();
      
      // Perform AI search
      const searchResult = await searchPoliciesWithAI(query, policies);
      
      // Special handling for OpenAI API errors - we still store them but log them differently
      if (searchResult.error) {
        console.log(`AI search returned error: ${searchResult.error}`);
        
        // Record the search query with the error result
        const savedQuery = await storage.createSearchQuery({
          query,
          userId: req.user.id,
          result: JSON.stringify(searchResult),
        });
        
        // Log activity including the error
        await storage.createActivity({
          userId: req.user.id,
          action: "search_error",
          resourceType: "policy",
          details: `Search for "${query}" failed with error: ${searchResult.error}`,
        });
        
        // Return a 200 status with the error data that the client can properly display
        return res.json({
          id: savedQuery.id,
          query: savedQuery.query,
          result: searchResult,
          timestamp: savedQuery.timestamp
        });
      }
      
      // Record the search query for successful search
      const savedQuery = await storage.createSearchQuery({
        query,
        userId: req.user.id,
        result: JSON.stringify(searchResult),
      });
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "searched",
        resourceType: "policy",
        details: `Searched for "${query}"`,
      });
      
      res.json({
        id: savedQuery.id,
        query: savedQuery.query,
        result: searchResult,
        timestamp: savedQuery.timestamp
      });
    } catch (error) {
      console.error("Search error:", error);
      // Return a more structured error response that matches our error format
      res.status(500).json({ 
        message: "Failed to perform search",
        result: {
          answer: "An unexpected error occurred while searching policies. Please try again later.",
          confidence: 0,
          error: "server_error"
        }
      });
    }
  });

  // Get recent searches for current user
  app.get("/api/searches", requireAuth, async (req, res) => {
    try {
      const searches = await storage.getSearchQueries(req.user.id);
      
      // Parse the stored JSON result for each search with error handling
      const formattedSearches = searches.map(search => {
        let result;
        try {
          result = JSON.parse(search.result);
        } catch (parseError) {
          console.error(`Error parsing search result for ID ${search.id}:`, parseError);
          result = {
            answer: "Error retrieving search result data",
            confidence: 0
          };
        }
        
        return {
          id: search.id,
          query: search.query,
          result,
          timestamp: search.timestamp
        };
      });
      
      // Sort searches with most recent first
      formattedSearches.sort((a, b) => {
        // Ensure timestamp exists before converting to Date
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      res.json(formattedSearches);
    } catch (error) {
      console.error("Error fetching searches:", error);
      res.status(500).json({ message: "Failed to get search history" });
    }
  });

  // Get recent activities
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const activities = await storage.getActivities();
      
      // Get all users to enrich the activity data
      const userMap = new Map();
      for (const activity of activities) {
        if (!userMap.has(activity.userId)) {
          const user = await storage.getUser(activity.userId);
          if (user) {
            userMap.set(activity.userId, {
              id: user.id,
              name: user.name,
              username: user.username
            });
          }
        }
      }
      
      // Enrich activities with user information
      const enrichedActivities = activities.map(activity => ({
        ...activity,
        user: userMap.get(activity.userId) || { id: activity.userId, name: "Unknown", username: "unknown" }
      }));
      
      res.json(enrichedActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get activities" });
    }
  });

  // Generate API key for extension
  app.post("/api/extension/generate-key", requireAuth, async (req, res) => {
    try {
      console.log("Extension API key generation request received");
      
      // Ensure user is authenticated
      if (!req.user) {
        console.log("No user found in request - authentication failed");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log(`Generating API key for user: ${req.user.id} (${req.user.username})`);
      
      // Generate a random API key
      const apiKey = Array(30)
        .fill(0)
        .map(() => Math.random().toString(36).charAt(2))
        .join('');
      
      // In a real application, you would save this key to the user's profile
      // For now we'll store it in memory associated with the user
      const userData = await storage.getUser(req.user.id);
      if (userData) {
        await storage.updateUserApiKey(req.user.id, apiKey);
        
        // Log activity
        await storage.createActivity({
          userId: req.user.id,
          action: "generated_api_key",
          resourceType: "user",
          resourceId: req.user.id,
          details: "Generated API key for browser extension",
        });
        
        console.log(`API key generated successfully for user: ${req.user.id}`);
        res.json({ apiKey, success: true });
      } else {
        console.log(`User not found with ID: ${req.user.id}`);
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("API key generation error:", error);
      res.status(500).json({ message: "Failed to generate API key", error: String(error) });
    }
  });
  
  // validateApiKey is already defined above

  // Extension login endpoint
  app.post("/api/extension/login", async (req, res) => {
    try {
      console.log("Extension login request received");
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Import password checking function from auth.ts
      const { comparePasswords } = require('./auth');
      
      // Verify password
      const isPasswordValid = await comparePasswords(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Generate API key if none exists
      let apiKey = user.apiKey;
      
      if (!apiKey) {
        console.log(`No API key found - generating new key for user: ${user.id}`);
        apiKey = Array(30)
          .fill(0)
          .map(() => Math.random().toString(36).charAt(2))
          .join('');
        
        // Update user with new API key
        await storage.updateUserApiKey(user.id, apiKey);
      }
      
      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "extension_login",
        resourceType: "user",
        resourceId: user.id,
        details: "Logged in via browser extension",
      });
      
      // Return user data with API key (excluding password)
      const { password: _, ...userData } = user;
      
      res.json({
        success: true,
        user: userData,
        apiKey
      });
    } catch (error) {
      console.error("Extension login error:", error);
      res.status(500).json({ message: "Failed to process login", error: String(error) });
    }
  });
  
  // API endpoint for browser extension
  app.post("/api/extension/search", validateApiKey, async (req, res) => {
    try {
      console.log("Extension search request received");
      
      // Ensure user is authenticated via API key validation
      if (!req.user) {
        console.log("No user found in request - API key validation failed");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log(`Processing search from user: ${req.user.id} (${req.user.username})`);
      
      const { query } = req.body;
      console.log(`Search query: "${query}"`);
      
      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ message: "Query is required" });
      }
      
      // Get all policies for searching
      const policies = await storage.getPolicies();
      console.log(`Found ${policies.length} policies to search through`);
      
      // Perform AI search
      console.log("Performing AI search...");
      const searchResult = await searchPoliciesWithAI(query, policies);
      console.log("AI search completed");
      
      // Special handling for OpenAI API errors
      if (searchResult.error) {
        console.log(`AI search returned error: ${searchResult.error}`);
        
        // Record the search query with error result
        await storage.createSearchQuery({
          query,
          userId: req.user.id,
          result: JSON.stringify(searchResult),
        });
        
        // Log activity with error
        await storage.createActivity({
          userId: req.user.id,
          action: "extension_search_error",
          resourceType: "policy",
          details: `Extension search for "${query}" failed with error: ${searchResult.error}`,
        });
        
        console.log("Sending error result to extension");
        return res.json({
          ...searchResult,
          success: false,
          errorType: searchResult.error
        });
      }
      
      // Record the search query
      await storage.createSearchQuery({
        query,
        userId: req.user.id,
        result: JSON.stringify(searchResult),
      });
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "extension_search",
        resourceType: "policy",
        details: `Extension searched for "${query}"`,
      });
      
      console.log("Sending search result to extension");
      res.json({
        ...searchResult,
        success: true
      });
    } catch (error) {
      console.error("Extension search error:", error);
      res.status(500).json({ 
        message: "Failed to perform search",
        answer: "An error occurred while searching policies. Please try again later.",
        confidence: 0,
        error: "server_error",
        success: false
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
