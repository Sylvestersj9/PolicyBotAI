import { pgTable, text, serial, integer, timestamp, boolean, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Training model
export const aiTraining = pgTable("ai_training", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed
  model: text("model").notNull(), // which model to train (e.g., "huggingface", "openai")
  version: text("version").notNull(), // version identifier for the training
  name: text("name").notNull(), // Descriptive name for the training job
  description: text("description"), // Optional description of what this training is for
  trainingParams: jsonb("training_params"), // Training parameters (e.g., epochs, batch size)
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  metrics: jsonb("metrics"), // Training metrics (e.g., accuracy, loss)
  createdBy: integer("created_by").notNull(), // User who initiated the training
  policies: text("policies").array(), // Array of policy IDs used for training
  documentTypes: text("document_types").array(), // Types of documents used for training
  progress: integer("progress").default(0), // Progress percentage (0-100)
  errorMessage: text("error_message"), // Error message if training failed
  isActive: boolean("is_active").default(false), // Is this the active model version
});

export const insertAiTrainingSchema = createInsertSchema(aiTraining).pick({
  model: true,
  version: true,
  name: true,
  description: true,
  trainingParams: true,
  createdBy: true,
  policies: true,
  documentTypes: true,
});

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  company: text("company").notNull(),
  role: text("role").notNull().default("admin"),
  apiKey: text("api_key"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  company: true,
  role: true,
  profilePicture: true,
});

// Category model
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  color: true,
});

// Policy model
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  categoryId: integer("category_id").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  policyRef: text("policy_ref").notNull(),
});

export const insertPolicySchema = createInsertSchema(policies).pick({
  title: true,
  description: true,
  content: true,
  categoryId: true,
  createdBy: true,
  policyRef: true,
});

// Search Query model
export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  userId: integer("user_id").notNull(),
  result: text("result").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertSearchQuerySchema = createInsertSchema(searchQueries).pick({
  query: true,
  userId: true,
  result: true,
});

// Activity model
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: integer("resource_id"),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  action: true,
  resourceType: true,
  resourceId: true,
  details: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policies.$inferSelect;

export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertAiTraining = z.infer<typeof insertAiTrainingSchema>;
export type AiTraining = typeof aiTraining.$inferSelect;

// Document model
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(), // pdf, docx, etc.
  fileSize: integer("file_size").notNull(),
  extractedText: text("extracted_text"),
  summary: text("summary"),
  keyPoints: text("key_points").array(),
  uploadedBy: integer("uploaded_by").notNull(),
  policyId: integer("policy_id"), // Optional link to a policy
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: text("status").notNull().default("pending"), // pending, processed, error
  processingError: text("processing_error"),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  fileName: true,
  filePath: true,
  fileType: true,
  fileSize: true,
  extractedText: true,
  summary: true,
  keyPoints: true,
  uploadedBy: true,
  policyId: true,
  status: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
