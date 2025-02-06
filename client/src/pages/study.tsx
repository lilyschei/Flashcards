import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoryFilter from "@/components/category-filter";
import StudyCard from "@/components/study-card";
import { format, formatDistanceToNow } from "date-fns";

type QuizType = "simple" | "grammar-context" | "spaced";

export default function Study() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [quizType, setQuizType] = useState<QuizType>("spaced");

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const grammarCategory = categories?.find(c => c.name.toLowerCase() === "grammar");

  const { data: flashcards } = useQuery({
    queryKey: ["/api/flashcards", selectedCategory, quizType],
    queryFn: async () => {
      let url = quizType === "spaced" ? "/api/flashcards/due" : "/api/flashcards";

      if (quizType === "grammar-context" && grammarCategory) {
        url = selectedCategory 
          ? `/api/flashcards?categoryId=${selectedCategory},${grammarCategory.id}`
          : `/api/flashcards?categoryId=${grammarCategory.id}`;
      } else if (selectedCategory && quizType !== "spaced") {
        url = `/api/flashcards?categoryId=${selectedCategory}`;
      }

      const res = await fetch(url);
      return res.json();
    },
  });

  if (!categories || !flashcards) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Study Flashcards</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Study Mode</label>
            <Select
              value={quizType}
              onValueChange={(value: QuizType) => setQuizType(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select study mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spaced">Spaced Repetition</SelectItem>
                <SelectItem value="simple">Simple Review</SelectItem>
                <SelectItem value="grammar-context">Grammar in Context</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {quizType !== "spaced" && (
            <CategoryFilter
              categories={
                quizType === "grammar-context"
                  ? categories.filter(c => c.name.toLowerCase() !== "grammar")
                  : categories
              }
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}
        </div>
      </div>

      <div className="flex justify-center">
        {flashcards.length > 0 ? (
          <StudyCard 
            flashcards={flashcards} 
            quizType={quizType}
            categories={categories}
          />
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {quizType === "spaced" 
                ? "No cards due for review! Check back later."
                : "No flashcards found for this category"}
            </p>
            <Button asChild variant="outline">
              <a href="/create">Create Some Cards</a>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}