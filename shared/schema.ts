import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  categoryId: integer("category_id").notNull(),
  contextTags: text("context_tags").array(),
  timesReviewed: integer("times_reviewed").default(0),
  correctReviews: integer("correct_reviews").default(0),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewAt: timestamp("next_review_at"),
  currentInterval: integer("current_interval").default(1), // interval in hours
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).pick({
  front: true,
  back: true,
  categoryId: true,
  contextTags: true,
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;