import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
// Import the Hugging Face implementation instead of OpenAI
import { searchPoliciesWithAI } from "./huggingface";
import multer from "multer";
import { 
  insertPolicySchema, 
  insertCategorySchema, 
  insertSearchQuerySchema,
  insertActivitySchema,
  insertAiTrainingSchema,
  insertUserSchema
} from "@shared/schema";
import { z } from "zod";
import { setupUploadRoutes } from "./upload";
import { setupDirectUploadRoutes } from "./direct-upload";
import path from "path";
import fs from "fs";

// Extend Express.Request interface to include the user and file properties
declare global {
  namespace Express {
    interface User extends Omit<import('@shared/schema').User, 'password'> {}
    
    interface Request {
      user?: User;
    }
  }
}

// We're now using our dedicated upload module instead of configuring multer here

// Configure multer for single file uploads (like profile pictures)
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// Function for handling single file uploads
const uploadSingleFile = (fieldName: string) => {
  return multer({ 
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      // Only allow image files
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG, and GIF files are allowed'));
      }
    }
  }).single(fieldName);
};

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
      if (req.user) {
        await storage.createActivity({
          userId: req.user.id,
          action: "created",
          resourceType: "category",
          resourceId: category.id,
          details: `Created category "${category.name}"`,
        });
      }
      
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

  // Setup document upload routes
  setupUploadRoutes(app);
  
  // Setup direct upload routes for the API
  setupDirectUploadRoutes(app);
  
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
  
  // Answer question about a specific policy
  app.post("/api/policies/:id/answer", requireAuth, async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      
      const { question } = req.body;
      if (!question || typeof question !== 'string' || question.trim() === '') {
        return res.status(400).json({ message: "Question is required" });
      }
      
      const policy = await storage.getPolicy(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      
      if (!policy.content || policy.content.trim() === '') {
        return res.status(400).json({ message: "Policy has no content to analyze" });
      }
      
      // Import the answerPolicyQuestion function from document-processor
      const { answerPolicyQuestion } = await import('./document-processor');
      
      // Use the AI to answer the question based on policy content
      console.log(`Answering question about policy #${id}: "${question}"`);
      const { answer, confidence } = await answerPolicyQuestion(question, policy.content);
      
      // Record the search query
      await storage.createSearchQuery({
        query: question,
        userId: req.user.id,
        result: JSON.stringify({ answer, confidence, policyId: id }),
      });
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "question",
        resourceType: "policy",
        resourceId: id,
        details: `Asked question about policy "${policy.title}": "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`,
      });
      
      res.json({
        answer,
        confidence,
        policyId: id,
        policyTitle: policy.title
      });
    } catch (error) {
      console.error("Error answering policy question:", error);
      res.status(500).json({ message: "Failed to answer question about policy" });
    }
  });

  // AI Search endpoint
  app.post("/api/search", requireAuth, async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { query } = req.body;
      
      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ message: "Query is required" });
      }
      
      // Get all policies for searching
      const policies = await storage.getPolicies();
      
      // Perform AI search with Hugging Face only (as requested)
      console.log("Attempting search with Hugging Face models");
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
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
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
      const { comparePasswords } = await import('./auth');
      
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
  
  // Extension health check endpoint
  app.get("/api/extension/health", (req, res) => {
    console.log("Extension health check request received");
    res.status(200).json({ 
      status: "ok", 
      message: "PolicyBot API is running",
      timestamp: new Date().toISOString()
    });
  });
  
  // Test endpoint for answering policy questions with direct content (protected by API key)
  app.post("/api/extension/ask-policy", validateApiKey, async (req, res) => {
    try {
      console.log("Extension direct policy question request received");
      
      // Ensure user is authenticated via API key validation
      if (!req.user) {
        console.log("No user found in request - API key validation failed");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { question, policyContent } = req.body;
      
      if (!question || typeof question !== 'string' || question.trim() === '') {
        return res.status(400).json({ message: "Question is required" });
      }
      
      if (!policyContent || typeof policyContent !== 'string' || policyContent.trim() === '') {
        return res.status(400).json({ message: "Policy content is required" });
      }
      
      // Import the answerPolicyQuestion function
      const { answerPolicyQuestion } = await import('./document-processor');
      
      console.log(`Processing policy question: "${question}"`);
      
      // Use the AI to answer the question
      const { answer, confidence } = await answerPolicyQuestion(question, policyContent);
      
      // Record the search query
      await storage.createSearchQuery({
        query: question,
        userId: req.user.id,
        result: JSON.stringify({ answer, confidence }),
      });
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "extension_direct_question",
        resourceType: "policy",
        details: `Asked direct question about policy content: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`,
      });
      
      console.log("Sending answer to extension");
      res.json({
        answer,
        confidence,
        success: true
      });
    } catch (error) {
      console.error("Error answering direct policy question:", error);
      res.status(500).json({ 
        message: "Failed to answer policy question",
        answer: "An error occurred while processing your question. Please try again later.",
        confidence: 0,
        success: false
      });
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
      
      // Perform AI search with Hugging Face only (as requested)
      console.log("Performing AI search...");
      console.log("Attempting search with Hugging Face models");
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

  // User Profile Management Endpoints

  // Get current user profile
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // User data from req.user already has password removed due to Express.User interface definition
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user profile information
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate update data (excluding password which has its own endpoint)
      const updateSchema = insertUserSchema
        .omit({ password: true })
        .partial();

      const updateData = updateSchema.parse(req.body);
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(req.user.id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "updated",
        resourceType: "user",
        resourceId: req.user.id,
        details: "Updated profile information"
      });
      
      // Return user data without the password
      const { password, ...userData } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error("Error updating user profile:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  // Change user password
  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Get the user with password
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Import the password comparison function from auth.ts
      const { comparePasswords, hashPassword } = await import("./auth");
      
      // Verify the current password
      const isValid = await comparePasswords(currentPassword, user.password);
      
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      await storage.updateUserPassword(req.user.id, hashedPassword);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "updated",
        resourceType: "user",
        resourceId: req.user.id,
        details: "Changed account password"
      });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
  
  // Upload profile picture using multer middleware directly
  app.post("/api/user/profile-picture", requireAuth, (req, res) => {
    // Use our uploadSingleFile function defined above
    const upload = multer({ 
      storage: uploadStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, cb) => {
        // Only allow image files
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPG, PNG, and GIF files are allowed'));
        }
      }
    }).single('profilePicture');

    upload(req, res, async (err) => {
      if (err) {
        console.error("Error uploading file:", err);
        return res.status(400).json({ message: err.message });
      }

      try {
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Get the file path
        const filePath = req.file.path;
        
        // Normalize path for database storage
        const normalizedPath = filePath.replace(/^.*[\\\/]uploads[\\\/]/, '/uploads/');
        
        // Update the user's profile picture
        const updatedUser = await storage.updateUserProfilePicture(req.user.id, normalizedPath);
        
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Log activity
        await storage.createActivity({
          userId: req.user.id,
          action: "updated",
          resourceType: "user",
          resourceId: req.user.id,
          details: "Updated profile picture"
        });
        
        // Return the updated profile picture path
        res.json({ 
          message: "Profile picture updated successfully",
          profilePicture: updatedUser.profilePicture 
        });
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ message: "Failed to upload profile picture" });
      }
    });
  });
  
  // Delete profile picture
  app.delete("/api/user/profile-picture", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get the current user
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user has a profile picture
      if (!user.profilePicture) {
        return res.status(400).json({ message: "No profile picture to delete" });
      }
      
      // Get the absolute path of the profile picture file
      const filePath = path.join(process.cwd(), 'public', user.profilePicture.replace(/^\/uploads\//, 'uploads/'));
      
      // Try to delete the file from the filesystem if it exists
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Successfully deleted profile picture file: ${filePath}`);
        } else {
          console.log(`Profile picture file not found: ${filePath}`);
        }
      } catch (fsError) {
        // Log but don't stop the process if file deletion fails
        console.error("Error deleting profile picture file:", fsError);
      }
      
      // Update the user record to remove the profile picture reference
      const updatedUser = await storage.updateUserProfilePicture(req.user.id, null);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user record" });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "deleted",
        resourceType: "user",
        resourceId: req.user.id,
        details: "Removed profile picture"
      });
      
      res.json({ 
        message: "Profile picture removed successfully" 
      });
    } catch (error) {
      console.error("Error removing profile picture:", error);
      res.status(500).json({ message: "Failed to remove profile picture" });
    }
  });

  // AI Training endpoints
  
  // Get all AI trainings
  app.get("/api/ai-trainings", requireAuth, async (req, res) => {
    try {
      const trainings = await storage.getAiTrainings();
      res.json(trainings);
    } catch (error) {
      console.error("Error fetching AI trainings:", error);
      res.status(500).json({ message: "Failed to fetch AI trainings" });
    }
  });
  
  // Get a specific AI training
  app.get("/api/ai-trainings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid training ID" });
      }
      
      const training = await storage.getAiTraining(id);
      if (!training) {
        return res.status(404).json({ message: "Training not found" });
      }
      
      res.json(training);
    } catch (error) {
      console.error("Error fetching AI training:", error);
      res.status(500).json({ message: "Failed to fetch AI training" });
    }
  });
  
  // Create a new AI training
  app.post("/api/ai-trainings", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Validate request body
      const trainingData = insertAiTrainingSchema.parse(req.body);
      
      // Create training record
      const newTraining = await storage.createAiTraining({
        ...trainingData,
        createdBy: req.user.id
      });
      
      // Record activity
      await storage.createActivity({
        userId: req.user.id,
        action: "create",
        resourceType: "ai_training",
        resourceId: newTraining.id,
        details: `Initiated AI training for model: ${newTraining.model}`
      });
      
      // Here you would typically start a background process to perform the actual training
      // For demonstration, we'll update the status directly after a short timeout
      setTimeout(async () => {
        try {
          // In a real application, this would be a complex AI training process
          // For demonstration, we'll just update the status to completed with mock metrics
          await storage.updateAiTrainingStatus(
            newTraining.id, 
            "completed", 
            new Date(), 
            { accuracy: 0.95, loss: 0.05 }
          );
          
          console.log(`Training ${newTraining.id} completed successfully`);
        } catch (err) {
          console.error(`Error completing training ${newTraining.id}:`, err);
          await storage.updateAiTrainingStatus(
            newTraining.id,
            "failed",
            new Date(),
            null,
            err instanceof Error ? err.message : String(err)
          );
        }
      }, 5000); // 5 second delay for demonstration
      
      res.status(201).json(newTraining);
    } catch (error) {
      console.error("Error creating AI training:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid training data", details: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create AI training" });
    }
  });
  
  // Update AI training status
  app.patch("/api/ai-trainings/:id/status", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid training ID" });
      }
      
      const { status, completedAt, metrics, errorMessage } = req.body;
      if (!status || !["pending", "completed", "failed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const training = await storage.getAiTraining(id);
      if (!training) {
        return res.status(404).json({ message: "Training not found" });
      }
      
      const updatedTraining = await storage.updateAiTrainingStatus(
        id,
        status,
        completedAt ? new Date(completedAt) : undefined,
        metrics,
        errorMessage
      );
      
      // Record activity
      await storage.createActivity({
        userId: req.user.id,
        action: "update",
        resourceType: "ai_training",
        resourceId: id,
        details: `Updated AI training status to: ${status}`
      });
      
      res.json(updatedTraining);
    } catch (error) {
      console.error("Error updating AI training status:", error);
      res.status(500).json({ message: "Failed to update AI training status" });
    }
  });
  
  // Get latest successful training for a model
  app.get("/api/ai-trainings/model/:model/latest", requireAuth, async (req, res) => {
    try {
      const { model } = req.params;
      if (!model) {
        return res.status(400).json({ message: "Model name is required" });
      }
      
      const training = await storage.getLatestSuccessfulTraining(model);
      if (!training) {
        return res.status(404).json({ message: "No successful training found for this model" });
      }
      
      res.json(training);
    } catch (error) {
      console.error("Error fetching latest AI training:", error);
      res.status(500).json({ message: "Failed to fetch latest AI training" });
    }
  });

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const httpServer = createServer(app);
  return httpServer;
}
