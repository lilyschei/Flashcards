import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Flashcard, Category } from "@shared/schema";
import { formatDistanceToNow } from 'date-fns';

interface StudyCardProps {
  flashcards: Flashcard[];
  quizType: "simple" | "grammar-context" | "spaced";
  categories: Category[];
}

export default function StudyCard({ flashcards, quizType, categories }: StudyCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sentence, setSentence] = useState("");
  const [validation, setValidation] = useState<{
    isCorrect?: boolean;
    feedback?: string;
    suggestion?: string;
  } | null>(null);

  const currentCard = flashcards[currentIndex];

  const getProgress = (card: Flashcard) => {
    if (!card.timesReviewed) return 0;
    return (card.correctReviews || 0) / card.timesReviewed * 100;
  };

  const getReviewInfo = (card: Flashcard) => {
    if (!card.lastReviewedAt) return "Not reviewed yet";
    const lastReviewed = new Date(card.lastReviewedAt);
    const nextReview = card.nextReviewAt ? new Date(card.nextReviewAt) : null;

    return (
      <div className="text-sm text-muted-foreground">
        <div>Last reviewed: {formatDistanceToNow(lastReviewed)} ago</div>
        {nextReview && (
          <div>
            Next review: {new Date() > nextReview ? "Now" : formatDistanceToNow(nextReview)}
          </div>
        )}
      </div>
    );
  };

  // In grammar-context mode, we need to separate grammar and vocabulary cards
  const grammarCards = quizType === "grammar-context"
    ? flashcards.filter(f => {
      const category = categories.find(c => c.id === f.categoryId);
      return category?.name.toLowerCase() === "grammar";
    })
    : [];

  const vocabCards = quizType === "grammar-context"
    ? flashcards.filter(f => {
      const category = categories.find(c => c.id === f.categoryId);
      return category?.name.toLowerCase() !== "grammar";
    })
    : [];

  const currentGrammarCard = grammarCards[Math.floor(currentIndex / vocabCards.length)];
  const currentVocabCard = vocabCards[currentIndex % vocabCards.length];

  const progressMutation = useMutation({
    mutationFn: async ({ id, correct }: { id: number; correct: boolean }) => {
      await apiRequest("POST", `/api/flashcards/${id}/progress`, { correct });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (sentence: string) => {
      const res = await apiRequest("POST", "/api/validate-sentence", {
        sentence,
        grammarPattern: currentGrammarCard.front,
        vocabulary: currentVocabCard.front,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setValidation(data);
    },
  });

  const handleNext = (correct: boolean) => {
    if (quizType === "grammar-context") {
      // Update progress for both cards
      progressMutation.mutate({ id: currentGrammarCard.id, correct });
      progressMutation.mutate({ id: currentVocabCard.id, correct });
    } else {
      progressMutation.mutate({ id: currentCard.id, correct });
    }
    setIsFlipped(false);
    setSentence("");
    setValidation(null);
    setCurrentIndex((prev) => (prev + 1) % (quizType === "grammar-context" ? vocabCards.length : flashcards.length));
  };

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || "Unknown";
  };

  if (quizType === "grammar-context" && (!currentGrammarCard || !currentVocabCard)) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Please make sure you have both grammar patterns and vocabulary cards
        </p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <AnimatePresence mode="wait">
        <div className={`grid ${quizType === "grammar-context" ? "grid-cols-2 gap-4" : ""}`}>
          {quizType === "grammar-context" ? (
            <>
              {/* Grammar Pattern Card */}
              <Card className="aspect-[3/2] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                <CardContent className="h-full flex flex-col items-center justify-center p-6">
                  <div className="w-full mb-4 flex justify-center">
                    <Badge variant="secondary">Grammar Pattern</Badge>
                  </div>
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ backfaceVisibility: "hidden" }}
                    className="text-2xl font-medium text-center"
                  >
                    {isFlipped ? (
                      <div style={{ transform: "rotateY(180deg)" }}>
                        {currentGrammarCard.back}
                      </div>
                    ) : (
                      currentGrammarCard.front
                    )}
                  </motion.div>
                </CardContent>
              </Card>

              {/* Vocabulary Card */}
              <Card className="aspect-[3/2] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                <CardContent className="h-full flex flex-col items-center justify-center p-6">
                  <div className="w-full mb-4 flex justify-center gap-2">
                    <Badge>{getCategoryName(currentVocabCard.categoryId)}</Badge>
                    {currentVocabCard.contextTags?.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ backfaceVisibility: "hidden" }}
                    className="text-2xl font-medium text-center"
                  >
                    {isFlipped ? (
                      <div style={{ transform: "rotateY(180deg)" }}>
                        {currentVocabCard.back}
                      </div>
                    ) : (
                      currentVocabCard.front
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </>
          ) : (
            // Simple Review Mode or Spaced Repetition Mode - Single Card
            <Card className="aspect-[3/2] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
              <CardContent className="h-full flex flex-col items-center justify-center p-6">
                <div className="w-full mb-4">
                  <div className="flex justify-center gap-2">
                    <Badge>{getCategoryName(currentCard.categoryId)}</Badge>
                    {currentCard.contextTags?.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  {quizType === "spaced" && (
                    <div className="mt-2 text-center">
                      {getReviewInfo(currentCard)}
                    </div>
                  )}
                </div>
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ backfaceVisibility: "hidden" }}
                  className="text-2xl font-medium text-center"
                >
                  {isFlipped ? (
                    <div style={{ transform: "rotateY(180deg)" }}>
                      {currentCard.back}
                    </div>
                  ) : (
                    currentCard.front
                  )}
                </motion.div>
              </CardContent>
            </Card>
          )}
        </div>
      </AnimatePresence>

      {quizType === "grammar-context" && (
        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type your sentence using the grammar pattern and vocabulary..."
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
            <Button
              onClick={() => validateMutation.mutate(sentence)}
              disabled={validateMutation.isPending || !sentence}
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Check"
              )}
            </Button>
          </div>

          {validation && (
            <Alert variant={validation.isCorrect ? "default" : "destructive"}>
              <AlertDescription>
                <div className="space-y-2">
                  <p>{validation.feedback}</p>
                  {validation.suggestion && (
                    <p className="font-medium">Suggestion: {validation.suggestion}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="flex justify-center gap-4 mt-6">
        <Button
          variant="outline"
          onClick={() => handleNext(false)}
          disabled={!isFlipped}
        >
          Incorrect
        </Button>
        <Button onClick={() => handleNext(true)} disabled={!isFlipped}>
          Correct
        </Button>
      </div>

      <div className="text-center mt-4 text-sm text-muted-foreground">
        Card {currentIndex + 1} of {quizType === "grammar-context" ? vocabCards.length : flashcards.length}
      </div>
    </div>
  );
}