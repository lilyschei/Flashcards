import { type Category, type InsertCategory, type Flashcard, type InsertFlashcard } from "@shared/schema";
import { db } from "./db";
import { eq, inArray, isNull, or, lte } from "drizzle-orm";
import { categories, flashcards } from "@shared/schema";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Flashcards
  getFlashcards(): Promise<Flashcard[]>;
  getFlashcardsByCategory(categoryId: number): Promise<Flashcard[]>;
  getFlashcardsByCategories(categoryIds: number[]): Promise<Flashcard[]>;
  getDueFlashcards(): Promise<Flashcard[]>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  updateFlashcardProgress(id: number, correct: boolean): Promise<Flashcard>;
}

export class DatabaseStorage implements IStorage {
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async getFlashcards(): Promise<Flashcard[]> {
    return await db.select().from(flashcards);
  }

  async getFlashcardsByCategory(categoryId: number): Promise<Flashcard[]> {
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.categoryId, categoryId));
  }

  async getFlashcardsByCategories(categoryIds: number[]): Promise<Flashcard[]> {
    return await db
      .select()
      .from(flashcards)
      .where(inArray(flashcards.categoryId, categoryIds));
  }

  async getDueFlashcards(): Promise<Flashcard[]> {
    const now = new Date();
    return await db
      .select()
      .from(flashcards)
      .where(
        or(
          isNull(flashcards.nextReviewAt),
          lte(flashcards.nextReviewAt, now)
        )
      );
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [newFlashcard] = await db
      .insert(flashcards)
      .values({
        ...flashcard,
        timesReviewed: 0,
        correctReviews: 0,
        currentInterval: 1
      })
      .returning();
    return newFlashcard;
  }

  async updateFlashcardProgress(id: number, correct: boolean): Promise<Flashcard> {
    const [card] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    if (!card) throw new Error("Flashcard not found");

    // Calculate next review interval using a simplified SuperMemo-2 algorithm
    const now = new Date();
    let nextInterval = card.currentInterval || 1;

    if (correct) {
      // If correct, increase interval exponentially (multiply by 2)
      nextInterval *= 2;
    } else {
      // If incorrect, reset interval to 1 hour
      nextInterval = 1;
    }

    const nextReviewAt = new Date(now.getTime() + nextInterval * 60 * 60 * 1000);

    const [updatedCard] = await db
      .update(flashcards)
      .set({
        timesReviewed: (card.timesReviewed || 0) + 1,
        correctReviews: (card.correctReviews || 0) + (correct ? 1 : 0),
        lastReviewedAt: now,
        nextReviewAt,
        currentInterval: nextInterval
      })
      .where(eq(flashcards.id, id))
      .returning();

    return updatedCard;
  }
}

export const storage = new DatabaseStorage();