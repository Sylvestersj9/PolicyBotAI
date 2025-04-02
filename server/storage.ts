import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  policies, type Policy, type InsertPolicy,
  searchQueries, type SearchQuery, type InsertSearchQuery,
  activities, type Activity, type InsertActivity,
  aiTraining, type AiTraining, type InsertAiTraining,
  documents, type Document, type InsertDocument
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc, sql } from "drizzle-orm";
import pg from "pg";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

// Define the storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserApiKey(userId: number, apiKey: string): Promise<User | undefined>;
  updateUserProfile(userId: number, updates: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined>;
  updateUserPassword(userId: number, newPassword: string): Promise<User | undefined>;
  updateUserProfilePicture(userId: number, profilePicture: string | null): Promise<User | undefined>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Policy operations
  getPolicies(): Promise<Policy[]>;
  getPoliciesByCategory(categoryId: number): Promise<Policy[]>;
  getPolicy(id: number): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: number, policy: Partial<InsertPolicy>): Promise<Policy | undefined>;
  deletePolicy(id: number): Promise<boolean>;
  
  // Search operations
  getSearchQueries(userId: number): Promise<SearchQuery[]>;
  createSearchQuery(query: InsertSearchQuery): Promise<SearchQuery>;
  
  // Activity operations
  getActivities(): Promise<Activity[]>;
  getActivityByUser(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // AI Training operations
  getAiTrainings(): Promise<AiTraining[]>;
  getAiTraining(id: number): Promise<AiTraining | undefined>;
  createAiTraining(training: InsertAiTraining): Promise<AiTraining>;
  updateAiTrainingStatus(id: number, status: string, completedAt?: Date, metrics?: any, errorMessage?: string, progress?: number): Promise<AiTraining | undefined>;
  updateAiTrainingIsActive(id: number, isActive: boolean): Promise<AiTraining | undefined>;
  getLatestSuccessfulTraining(model: string): Promise<AiTraining | undefined>;
  
  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByUser(userId: number): Promise<Document[]>;
  getDocumentsByPolicy(policyId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any; // Using any as a workaround for SessionStore type issue
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private policies: Map<number, Policy>;
  private searchQueries: Map<number, SearchQuery>;
  private activities: Map<number, Activity>;
  private aiTrainings: Map<number, AiTraining>;
  private documents: Map<number, Document>;
  
  userCurrentId: number;
  categoryCurrentId: number;
  policyCurrentId: number;
  searchQueryCurrentId: number;
  activityCurrentId: number;
  aiTrainingCurrentId: number;
  documentCurrentId: number;
  sessionStore: any; // Using any as a workaround for SessionStore type issue

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.policies = new Map();
    this.searchQueries = new Map();
    this.activities = new Map();
    this.aiTrainings = new Map();
    this.documents = new Map();
    
    this.userCurrentId = 1;
    this.categoryCurrentId = 1;
    this.policyCurrentId = 1;
    this.searchQueryCurrentId = 1;
    this.activityCurrentId = 1;
    this.aiTrainingCurrentId = 1;
    this.documentCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Initialize with default categories
    this.initializeDefaultCategories();
    
    // Create a default admin user for testing
    this.createDefaultTestUser();
  }
  
  private async createDefaultTestUser() {
    try {
      // We'll create a regular user through the normal registration API
      const testUser1: InsertUser = {
        username: "admin",
        // This is the plain password - we'll register through the API to handle hashing
        password: "password123", 
        name: "Admin User",
        email: "admin@example.com",
        company: "Test Company",
        role: "admin"
      };
      
      // Check if user doesn't already exist
      const existingUser = await this.getUserByUsername(testUser1.username);
      if (!existingUser) {
        // Import the hashPassword function from auth.ts
        // In a normal production environment, we'd use the auth service directly
        // but for this prototype with in-memory DB, we'll handle it here
        const { scrypt, randomBytes } = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(scrypt);
        
        // Hash the password using the same algorithm from auth.ts
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(testUser1.password, salt, 64)) as Buffer;
        const hashedPassword = `${buf.toString("hex")}.${salt}`;
        
        // Create user with hashed password
        const actualUser: InsertUser = {
          ...testUser1,
          password: hashedPassword
        };
        
        await this.createUser(actualUser);
        console.log('Created default test user: admin/password123');
      }
    } catch (error) {
      console.error("Error creating default test user:", error);
    }
  }

  private initializeDefaultCategories() {
    const defaultCategories = [
      { name: "Emergency", color: "#EF4444" },
      { name: "Safeguarding", color: "#F59E0B" },
      { name: "Compliance", color: "#3B82F6" },
      { name: "HR", color: "#10B981" },
      { name: "General", color: "#6B7280" }
    ];
    
    defaultCategories.forEach(category => {
      this.createCategory(category);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.apiKey === apiKey,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const createdAt = new Date();
    
    // Make sure the role property is provided, or use the default
    const role = insertUser.role || "admin";
    
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt,
      apiKey: null, // Initialize with null API key
      role, // Ensure role is always defined
      profilePicture: insertUser.profilePicture || null // Initialize profile picture
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserApiKey(userId: number, apiKey: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      apiKey
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserProfile(userId: number, updates: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...updates
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserPassword(userId: number, newPassword: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      password: newPassword
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserProfilePicture(userId: number, profilePicture: string | null): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      profilePicture
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    );
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryCurrentId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  // Policy operations
  async getPolicies(): Promise<Policy[]> {
    return Array.from(this.policies.values());
  }
  
  async getPoliciesByCategory(categoryId: number): Promise<Policy[]> {
    return Array.from(this.policies.values()).filter(
      (policy) => policy.categoryId === categoryId,
    );
  }
  
  async getPolicy(id: number): Promise<Policy | undefined> {
    return this.policies.get(id);
  }
  
  async createPolicy(insertPolicy: InsertPolicy): Promise<Policy> {
    const id = this.policyCurrentId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Ensure description is non-undefined (null is acceptable)
    const description = insertPolicy.description === undefined ? null : insertPolicy.description;
    
    const policy: Policy = { 
      ...insertPolicy, 
      id, 
      createdAt, 
      updatedAt,
      description 
    };
    
    this.policies.set(id, policy);
    return policy;
  }
  
  async updatePolicy(id: number, updates: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const policy = this.policies.get(id);
    if (!policy) return undefined;
    
    const updatedPolicy: Policy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.policies.set(id, updatedPolicy);
    return updatedPolicy;
  }
  
  async deletePolicy(id: number): Promise<boolean> {
    return this.policies.delete(id);
  }

  // Search operations
  async getSearchQueries(userId: number): Promise<SearchQuery[]> {
    return Array.from(this.searchQueries.values())
      .filter((query) => query.userId === userId)
      .sort((a, b) => {
        // Handle potential null timestamps
        const aTime = a.timestamp?.getTime() ?? 0;
        const bTime = b.timestamp?.getTime() ?? 0;
        return bTime - aTime;
      });
  }
  
  async createSearchQuery(insertQuery: InsertSearchQuery): Promise<SearchQuery> {
    const id = this.searchQueryCurrentId++;
    const timestamp = new Date();
    const query: SearchQuery = { ...insertQuery, id, timestamp };
    this.searchQueries.set(id, query);
    return query;
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => {
        // Handle potential null timestamps
        const aTime = a.timestamp?.getTime() ?? 0;
        const bTime = b.timestamp?.getTime() ?? 0;
        return bTime - aTime;
      });
  }
  
  async getActivityByUser(userId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter((activity) => activity.userId === userId)
      .sort((a, b) => {
        // Handle potential null timestamps
        const aTime = a.timestamp?.getTime() ?? 0;
        const bTime = b.timestamp?.getTime() ?? 0;
        return bTime - aTime;
      });
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const timestamp = new Date();
    
    // Ensure optional fields are non-undefined (null is acceptable)
    const details = insertActivity.details === undefined ? null : insertActivity.details;
    const resourceId = insertActivity.resourceId === undefined ? null : insertActivity.resourceId;
    
    const activity: Activity = { 
      ...insertActivity, 
      id, 
      timestamp,
      details,
      resourceId
    };
    
    this.activities.set(id, activity);
    return activity;
  }
  
  // AI Training operations
  async getAiTrainings(): Promise<AiTraining[]> {
    return Array.from(this.aiTrainings.values())
      .sort((a, b) => {
        // Handle potential null timestamps
        const aTime = a.startedAt?.getTime() ?? 0;
        const bTime = b.startedAt?.getTime() ?? 0;
        return bTime - aTime; // Most recent first
      });
  }
  
  async getAiTraining(id: number): Promise<AiTraining | undefined> {
    return this.aiTrainings.get(id);
  }
  
  async createAiTraining(insertTraining: InsertAiTraining): Promise<AiTraining> {
    const id = this.aiTrainingCurrentId++;
    const startedAt = new Date();
    
    // Create AiTraining record with proper policies array handling
    const training: AiTraining = {
      id,
      name: insertTraining.name,
      model: insertTraining.model,
      version: insertTraining.version,
      description: insertTraining.description ?? null,
      createdBy: insertTraining.createdBy,
      status: "pending",
      startedAt,
      completedAt: null,
      metrics: null,
      errorMessage: null,
      progress: 0,
      isActive: false,
      policies: insertTraining.policies || null,
      documentTypes: insertTraining.documentTypes || null,
      trainingParams: insertTraining.trainingParams
    };
    
    this.aiTrainings.set(id, training);
    return training;
  }
  
  async updateAiTrainingStatus(
    id: number, 
    status: string, 
    completedAt?: Date, 
    metrics?: any, 
    errorMessage?: string,
    progress?: number
  ): Promise<AiTraining | undefined> {
    const training = this.aiTrainings.get(id);
    if (!training) return undefined;
    
    // Update with the new status information
    const updatedTraining: AiTraining = {
      ...training,
      status,
      completedAt: completedAt || (status === "completed" ? new Date() : training.completedAt),
      metrics: metrics || training.metrics,
      errorMessage: errorMessage || training.errorMessage,
      progress: progress !== undefined ? progress : training.progress
    };
    
    this.aiTrainings.set(id, updatedTraining);
    return updatedTraining;
  }
  
  async updateAiTrainingIsActive(id: number, isActive: boolean): Promise<AiTraining | undefined> {
    const training = this.aiTrainings.get(id);
    if (!training) return undefined;
    
    // Update active status
    const updatedTraining: AiTraining = {
      ...training,
      isActive
    };
    
    this.aiTrainings.set(id, updatedTraining);
    return updatedTraining;
  }
  
  async getLatestSuccessfulTraining(model: string): Promise<AiTraining | undefined> {
    // Filter for completed trainings of the specified model and sort by date
    const completedTrainings = Array.from(this.aiTrainings.values())
      .filter(t => t.status === "completed" && t.model === model)
      .sort((a, b) => {
        const aTime = a.completedAt?.getTime() ?? 0;
        const bTime = b.completedAt?.getTime() ?? 0;
        return bTime - aTime; // Most recent first
      });
    
    // Return the most recent one
    return completedTrainings.length > 0 ? completedTrainings[0] : undefined;
  }
  
  // Document operations
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values())
      .sort((a, b) => {
        // Most recent first
        const aTime = a.createdAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      });
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter((document) => document.uploadedBy === userId)
      .sort((a, b) => {
        // Most recent first
        const aTime = a.createdAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      });
  }
  
  async getDocumentsByPolicy(policyId: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter((document) => document.policyId === policyId)
      .sort((a, b) => {
        // Most recent first
        const aTime = a.createdAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      });
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentCurrentId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Ensure optional fields are non-undefined (null is acceptable)
    const summary = insertDocument.summary === undefined ? null : insertDocument.summary;
    const extractedText = insertDocument.extractedText === undefined ? null : insertDocument.extractedText;
    const keyPoints = insertDocument.keyPoints === undefined ? null : insertDocument.keyPoints;
    const policyId = insertDocument.policyId === undefined ? null : insertDocument.policyId;
    
    const document: Document = {
      id,
      title: insertDocument.title,
      fileName: insertDocument.fileName,
      filePath: insertDocument.filePath,
      fileType: insertDocument.fileType,
      fileSize: insertDocument.fileSize,
      uploadedBy: insertDocument.uploadedBy,
      status: insertDocument.status || "pending",
      createdAt,
      updatedAt,
      extractedText,
      summary,
      keyPoints,
      policyId,
      processingError: null
    };
    
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument: Document = {
      ...document,
      ...updates
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
}

// PostgreSQL storage implementation
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private pool: pg.Pool;
  sessionStore: any;
  private connectionRetries = 0;
  private readonly maxConnectionRetries = 5;
  private readonly connectionRetryDelay = 3000; // 3 seconds

  constructor() {
    // Enhanced PostgreSQL connection pool for Replit deployment
    this.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 10000, // How long to wait for a connection
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });
    
    // Setup event listeners for the pool
    this.pool.on('error', async (err) => {
      console.error('Unexpected error on PostgreSQL client', err);
      if (typeof this.attemptReconnect === 'function') {
        await this.attemptReconnect();
      } else {
        console.error('Failed to reconnect: attemptReconnect is not a function');
        // Fallback reconnect logic
        setTimeout(async () => {
          try {
            const client = await this.pool.connect();
            console.log('Successfully reconnected to PostgreSQL (fallback)');
            client.release();
          } catch (reconnectError) {
            console.error('Failed to reconnect to PostgreSQL (fallback)', reconnectError);
          }
        }, 3000);
      }
    });
    
    this.db = drizzle(this.pool);
    
    this.sessionStore = new PostgresSessionStore({
      pool: this.pool,
      createTableIfMissing: true,
      tableName: 'sessions'
    });
    
    // Initialize default data
    this.setupDefaultData();
  }

  private async setupDefaultData() {
    try {
      // Check if we need to create default categories
      const existingCategories = await this.getCategories();
      if (existingCategories.length === 0) {
        console.log("Creating default categories...");
        await this.initializeDefaultCategories();
      }
      
      // Create default admin user if needed
      const adminUser = await this.getUserByUsername("admin");
      if (!adminUser) {
        console.log("Creating default admin user...");
        await this.createDefaultTestUser();
      }
    } catch (error) {
      console.error("Error setting up default data:", error);
    }
  }
  
  private async createDefaultTestUser() {
    try {
      // We'll create a regular user through the normal registration API
      const testUser1: InsertUser = {
        username: "admin",
        // This is the plain password - we'll register through the API to handle hashing
        password: "password123", 
        name: "Admin User",
        email: "admin@example.com",
        company: "Test Company",
        role: "admin"
      };
      
      // Check if user doesn't already exist
      const existingUser = await this.getUserByUsername(testUser1.username);
      if (!existingUser) {
        // Import the hashPassword function from auth.ts
        // In a normal production environment, we'd use the auth service directly
        // but for this prototype with in-memory DB, we'll handle it here
        const { scrypt, randomBytes } = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(scrypt);
        
        // Hash the password using the same algorithm from auth.ts
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(testUser1.password, salt, 64)) as Buffer;
        const hashedPassword = `${buf.toString("hex")}.${salt}`;
        
        // Create user with hashed password
        const actualUser: InsertUser = {
          ...testUser1,
          password: hashedPassword
        };
        
        await this.createUser(actualUser);
        console.log('Created default test user: admin/password123');
      }
    } catch (error) {
      console.error("Error creating default test user:", error);
    }
  }

  private async initializeDefaultCategories() {
    const defaultCategories = [
      { name: "Emergency", color: "#EF4444" },
      { name: "Safeguarding", color: "#F59E0B" },
      { name: "Compliance", color: "#3B82F6" },
      { name: "HR", color: "#10B981" },
      { name: "General", color: "#6B7280" }
    ];
    
    for (const category of defaultCategories) {
      await this.createCategory(category);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    if (!apiKey) return undefined;
    const result = await this.db.select().from(users).where(eq(users.apiKey, apiKey));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values({
      ...insertUser,
      apiKey: null,
      profilePicture: insertUser.profilePicture || null
    }).returning();
    
    return result[0];
  }
  
  async updateUserApiKey(userId: number, apiKey: string): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ apiKey })
      .where(eq(users.id, userId))
      .returning();
      
    return result[0];
  }
  
  async updateUserProfile(userId: number, updates: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
      
    return result[0];
  }
  
  async updateUserPassword(userId: number, newPassword: string): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ password: newPassword })
      .where(eq(users.id, userId))
      .returning();
      
    return result[0];
  }
  
  async updateUserProfilePicture(userId: number, profilePicture: string | null): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ profilePicture })
      .where(eq(users.id, userId))
      .returning();
      
    return result[0];
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await this.db.select().from(categories);
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const result = await this.db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }
  
  async getCategoryByName(name: string): Promise<Category | undefined> {
    const result = await this.db.select().from(categories)
      .where(sql`LOWER(${categories.name}) = LOWER(${name})`);
    return result[0];
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const result = await this.db.insert(categories).values(insertCategory).returning();
    return result[0];
  }

  // Policy operations
  async getPolicies(): Promise<Policy[]> {
    return await this.db.select().from(policies);
  }
  
  async getPoliciesByCategory(categoryId: number): Promise<Policy[]> {
    return await this.db.select().from(policies).where(eq(policies.categoryId, categoryId));
  }
  
  async getPolicy(id: number): Promise<Policy | undefined> {
    const result = await this.db.select().from(policies).where(eq(policies.id, id));
    return result[0];
  }
  
  async createPolicy(insertPolicy: InsertPolicy): Promise<Policy> {
    try {
      console.log("Creating policy with data:", JSON.stringify(insertPolicy));
      
      // Ensure description is not undefined (null is acceptable)
      const description = insertPolicy.description === undefined ? null : insertPolicy.description;
      
      // Sanitize the content to avoid encoding issues
      let content = insertPolicy.content;
      if (content) {
        // Replace any invalid UTF-8 characters with a standard replacement character
        content = Buffer.from(content, 'utf-8').toString('utf-8');
        // Additional cleaning of potential problematic characters
        content = content.replace(/\u0000/g, ''); // Remove null bytes
      }
      
      const result = await this.db.insert(policies).values({
        ...insertPolicy,
        content,
        description,
        // Ensure we have timestamps (should normally be handled by defaultNow(), but let's be safe)
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      if (!result || result.length === 0) {
        throw new Error("No result returned from database after policy insertion");
      }
      
      console.log("Policy created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Database error creating policy:", error);
      throw new Error("Failed to create policy in database: " + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  async updatePolicy(id: number, updates: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const result = await this.db.update(policies)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(policies.id, id))
      .returning();
      
    return result[0];
  }
  
  async deletePolicy(id: number): Promise<boolean> {
    const result = await this.db.delete(policies).where(eq(policies.id, id)).returning();
    return result.length > 0;
  }

  // Search operations
  async getSearchQueries(userId: number): Promise<SearchQuery[]> {
    return await this.db.select().from(searchQueries)
      .where(eq(searchQueries.userId, userId))
      .orderBy(desc(searchQueries.timestamp));
  }
  
  async createSearchQuery(insertQuery: InsertSearchQuery): Promise<SearchQuery> {
    const result = await this.db.insert(searchQueries).values(insertQuery).returning();
    return result[0];
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    return await this.db.select().from(activities)
      .orderBy(desc(activities.timestamp));
  }
  
  async getActivityByUser(userId: number): Promise<Activity[]> {
    return await this.db.select().from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.timestamp));
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const result = await this.db.insert(activities).values({
      ...insertActivity,
      details: insertActivity.details ?? null,
      resourceId: insertActivity.resourceId ?? null,
    }).returning();
    
    return result[0];
  }
  
  // AI Training operations
  async getAiTrainings(): Promise<AiTraining[]> {
    return await this.db.select().from(aiTraining)
      .orderBy(desc(aiTraining.startedAt));
  }
  
  async getAiTraining(id: number): Promise<AiTraining | undefined> {
    const result = await this.db.select().from(aiTraining).where(eq(aiTraining.id, id));
    return result[0];
  }
  
  async createAiTraining(insertTraining: InsertAiTraining): Promise<AiTraining> {
    const result = await this.db.insert(aiTraining).values({
      name: insertTraining.name,
      model: insertTraining.model,
      version: insertTraining.version,
      description: insertTraining.description ?? null,
      createdBy: insertTraining.createdBy,
      status: "pending",
      startedAt: new Date(),
      completedAt: null,
      metrics: null,
      errorMessage: null,
      progress: 0,
      isActive: false,
      policies: insertTraining.policies || null,
      documentTypes: insertTraining.documentTypes || null,
      trainingParams: insertTraining.trainingParams
    }).returning();
    
    return result[0];
  }
  
  async updateAiTrainingStatus(
    id: number, 
    status: string, 
    completedAt?: Date, 
    metrics?: any, 
    errorMessage?: string,
    progress?: number
  ): Promise<AiTraining | undefined> {
    const training = await this.getAiTraining(id);
    if (!training) return undefined;
    
    const result = await this.db.update(aiTraining)
      .set({
        status,
        completedAt: completedAt || (status === "completed" ? new Date() : training.completedAt),
        metrics: metrics || training.metrics,
        errorMessage: errorMessage || training.errorMessage,
        progress: progress !== undefined ? progress : training.progress
      })
      .where(eq(aiTraining.id, id))
      .returning();
      
    return result[0];
  }
  
  async updateAiTrainingIsActive(id: number, isActive: boolean): Promise<AiTraining | undefined> {
    const training = await this.getAiTraining(id);
    if (!training) return undefined;
    
    const result = await this.db.update(aiTraining)
      .set({ isActive })
      .where(eq(aiTraining.id, id))
      .returning();
      
    return result[0];
  }
  
  async getLatestSuccessfulTraining(model: string): Promise<AiTraining | undefined> {
    const result = await this.db.select().from(aiTraining)
      .where(and(
        eq(aiTraining.status, "completed"),
        eq(aiTraining.model, model)
      ))
      .orderBy(desc(aiTraining.completedAt))
      .limit(1);
    
    return result[0];
  }
  
  // Document operations
  async getDocuments(): Promise<Document[]> {
    return await this.db.select().from(documents)
      .orderBy(desc(documents.createdAt));
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    const result = await this.db.select().from(documents).where(eq(documents.id, id));
    return result[0];
  }
  
  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return await this.db.select().from(documents)
      .where(eq(documents.uploadedBy, userId))
      .orderBy(desc(documents.createdAt));
  }
  
  async getDocumentsByPolicy(policyId: number): Promise<Document[]> {
    return await this.db.select().from(documents)
      .where(eq(documents.policyId, policyId))
      .orderBy(desc(documents.createdAt));
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const result = await this.db.insert(documents).values({
      title: insertDocument.title,
      fileName: insertDocument.fileName,
      filePath: insertDocument.filePath,
      fileType: insertDocument.fileType,
      fileSize: insertDocument.fileSize,
      uploadedBy: insertDocument.uploadedBy,
      extractedText: insertDocument.extractedText ?? null,
      summary: insertDocument.summary ?? null,
      keyPoints: insertDocument.keyPoints ?? null,
      policyId: insertDocument.policyId ?? null,
      status: insertDocument.status ?? "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      processingError: null
    }).returning();
    
    return result[0];
  }
  
  async updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document | undefined> {
    const result = await this.db.update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
      
    return result[0];
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    const result = await this.db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }
  
  // Method to check database connection
  async checkConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT 1 as connection_test');
      client.release();
      
      // Reset connection retries on successful connection
      if (this.connectionRetries > 0) {
        console.log('Database connection re-established');
        this.connectionRetries = 0;
      }
      
      return result.rows[0].connection_test === 1;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }
  
  // Method to attempt reconnecting to the database
  private async attemptReconnect(): Promise<void> {
    if (this.connectionRetries >= this.maxConnectionRetries) {
      console.error(`Failed to reconnect to database after ${this.maxConnectionRetries} attempts`);
      return;
    }
    
    this.connectionRetries++;
    console.log(`Attempting to reconnect to database (attempt ${this.connectionRetries}/${this.maxConnectionRetries})...`);
    
    // Wait before attempting to reconnect
    await new Promise(resolve => setTimeout(resolve, this.connectionRetryDelay));
    
    try {
      // Test connection
      const connectionOk = await this.checkConnection();
      
      if (connectionOk) {
        console.log('Successfully reconnected to database');
        this.connectionRetries = 0;
      } else if (this.connectionRetries < this.maxConnectionRetries) {
        // Try again if still not connected
        await this.attemptReconnect();
      }
    } catch (error) {
      console.error('Error during database reconnection attempt:', error);
      
      if (this.connectionRetries < this.maxConnectionRetries) {
        // Try again
        await this.attemptReconnect();
      }
    }
  }
}

// Switch from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
