import { pgTable, text, serial, integer, timestamp, boolean, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Training model
export const aiTraining = pgTable("ai_training", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  model: text("model").notNull(), // which model to train (e.g., "huggingface", "openai")
  version: text("version").notNull(), // version identifier for the training
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  metrics: jsonb("metrics"), // Training metrics (e.g., accuracy, loss)
  createdBy: integer("created_by").notNull(), // User who initiated the training
  policies: text("policies").array(), // Array of policy IDs used for training
  errorMessage: text("error_message"), // Error message if training failed
});

export const insertAiTrainingSchema = createInsertSchema(aiTraining).pick({
  model: true,
  version: true,
  createdBy: true,
  policies: true,
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
