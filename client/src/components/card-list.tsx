import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import type { Category, Flashcard } from "@shared/schema";

interface CardListProps {
  flashcards: Flashcard[];
  categories: Category[];
  selectedCategory: number | null;
  onSelectCategory?: (id: number | null) => void;
}

export default function CardList({
  flashcards,
  categories,
  selectedCategory,
  onSelectCategory,
}: CardListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter cards based on search term and category
  const filteredCards = flashcards.filter((card) => {
    const matchesSearch =
      searchTerm === "" ||
      card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.contextTags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === null || card.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get category name by id
  const getCategoryName = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  // Calculate progress percentage
  const getProgress = (card: Flashcard) => {
    if (card.timesReviewed === 0) return 0;
    return (card.correctReviews / card.timesReviewed) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <AnimatePresence>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <div className="text-lg font-semibold line-clamp-2">
                        {card.front}
                      </div>
                      <Badge
                        variant={getProgress(card) >= 70 ? "default" : "secondary"}
                        className="ml-2 shrink-0"
                      >
                        {getProgress(card).toFixed(0)}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Answer
                        </div>
                        <div className="text-sm">{card.back}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Category
                        </div>
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            onSelectCategory?.(
                              selectedCategory === card.categoryId
                                ? null
                                : card.categoryId
                            )
                          }
                        >
                          {getCategoryName(card.categoryId)}
                        </Badge>
                      </div>

                      {card.contextTags && card.contextTags.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Context
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {card.contextTags.map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>

      {filteredCards.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No flashcards found matching your criteria
        </div>
      )}
    </div>
  );
}
