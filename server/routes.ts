import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertFlashcardSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Categories
  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post("/api/categories", async (req, res) => {
    const parsed = insertCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid category data" });
    }
    const category = await storage.createCategory(parsed.data);
    res.json(category);
  });

  // Flashcards
  app.get("/api/flashcards", async (req, res) => {
    const categoryId = req.query.categoryId;
    let flashcards;

    if (categoryId) {
      // Handle multiple categories (comma-separated)
      const categoryIds = String(categoryId).split(",").map(Number);
      flashcards = await storage.getFlashcardsByCategories(categoryIds);
    } else {
      flashcards = await storage.getFlashcards();
    }

    res.json(flashcards);
  });

  app.post("/api/flashcards", async (req, res) => {
    const parsed = insertFlashcardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid flashcard data" });
    }
    const flashcard = await storage.createFlashcard(parsed.data);
    res.json(flashcard);
  });

  app.post("/api/flashcards/:id/progress", async (req, res) => {
    const id = Number(req.params.id);
    const { correct } = req.body;
    if (typeof correct !== "boolean") {
      return res.status(400).json({ error: "Invalid progress data" });
    }
    const flashcard = await storage.updateFlashcardProgress(id, correct);
    res.json(flashcard);
  });

  // Add new route for due flashcards
  app.get("/api/flashcards/due", async (req, res) => {
    const dueCards = await storage.getDueFlashcards();
    res.json(dueCards);
  });

  // Sentence validation using Lingva Translate
  app.post("/api/validate-sentence", async (req, res) => {
    const { sentence } = req.body;

    try {
      // First translate to English
      const toEngRes = await fetch(`https://lingva.ml/api/v1/ja/en/${encodeURIComponent(sentence)}`);
      if (!toEngRes.ok) throw new Error('Failed to translate to English');
      const { translation: translationToEng } = await toEngRes.json();

      // Then translate back to Japanese
      const toJpRes = await fetch(`https://lingva.ml/api/v1/en/ja/${encodeURIComponent(translationToEng)}`);
      if (!toJpRes.ok) throw new Error('Failed to translate back to Japanese');
      const { translation: translationBackToJp } = await toJpRes.json();

      // Compare the translations
      const isCorrect = sentence === translationBackToJp;

      // Generate detailed feedback
      let feedback;
      if (isCorrect) {
        feedback = `Your sentence "${sentence}" is grammatically correct.\n\n` +
                  `English meaning: "${translationToEng}"\n\n` +
                  `The sentence structure and grammar are natural and well-formed.`;
      } else {
        // Find differences between original and suggested
        const differences = sentence !== translationBackToJp;
        feedback = `Your sentence "${sentence}" might need some adjustments.\n\n` +
                  `English meaning: "${translationToEng}"\n\n` +
                  `A more natural way to express this would be: "${translationBackToJp}"\n\n` +
                  `The difference suggests there might be some grammar patterns that could be improved. ` +
                  `Try comparing your sentence with the suggested version to see the differences in structure.`;
      }

      const validation = {
        isCorrect,
        feedback,
        suggestion: isCorrect ? null : translationBackToJp,
        originalTranslation: translationToEng,
        suggestedJapanese: translationBackToJp
      };

      res.json(validation);
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ 
        isCorrect: false,
        feedback: "Unable to validate sentence at this time. Please try again later.",
        suggestion: null
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}