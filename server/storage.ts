import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  policies, type Policy, type InsertPolicy,
  searchQueries, type SearchQuery, type InsertSearchQuery,
  activities, type Activity, type InsertActivity
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

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
  
  userCurrentId: number;
  categoryCurrentId: number;
  policyCurrentId: number;
  searchQueryCurrentId: number;
  activityCurrentId: number;
  sessionStore: any; // Using any as a workaround for SessionStore type issue

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.policies = new Map();
    this.searchQueries = new Map();
    this.activities = new Map();
    
    this.userCurrentId = 1;
    this.categoryCurrentId = 1;
    this.policyCurrentId = 1;
    this.searchQueryCurrentId = 1;
    this.activityCurrentId = 1;
    
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
      role // Ensure role is always defined
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
}

export const storage = new MemStorage();
