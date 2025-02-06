import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Category, Flashcard } from "@shared/schema";

export default function Home() {
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: flashcards } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcards"],
  });

  if (!categories || !flashcards) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome to Grammar Cards</h1>
        <p className="text-muted-foreground">
          Master grammar through organized flashcards and spaced repetition.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {categories.map((category) => {
          const categoryCards = flashcards.filter(
            (f) => f.categoryId === category.id
          );
          const totalReviews = categoryCards.reduce(
            (sum, card) => sum + card.timesReviewed,
            0
          );
          const correctReviews = categoryCards.reduce(
            (sum, card) => sum + card.correctReviews,
            0
          );
          const accuracy =
            totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0;

          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">
                      Cards: {categoryCards.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Reviews: {totalReviews}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Accuracy</div>
                    <Progress value={accuracy} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
