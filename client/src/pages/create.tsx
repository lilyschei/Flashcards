import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFlashcardSchema, insertCategorySchema } from "@shared/schema";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import type { Category } from "@shared/schema";

export default function Create() {
  const { toast } = useToast();
  const flashcardForm = useForm({
    resolver: zodResolver(insertFlashcardSchema),
    defaultValues: {
      front: "",
      back: "",
      categoryId: undefined,
      contextTags: [],
    },
  });

  const categoryForm = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createFlashcardMutation = useMutation({
    mutationFn: async (values: any) => {
      await apiRequest("POST", "/api/flashcards", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      toast({
        title: "Success",
        description: "Flashcard created successfully",
      });
      flashcardForm.reset();
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (values: any) => {
      await apiRequest("POST", "/api/categories", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      categoryForm.reset();
    },
  });

  if (!categories) return null;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Create Category</h1>
        <p className="text-muted-foreground">Add new category for organizing flashcards</p>
      </div>

      <Form {...categoryForm}>
        <form
          onSubmit={categoryForm.handleSubmit((values) => createCategoryMutation.mutate(values))}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium">Category Name</label>
            <Input {...categoryForm.register("name")} />
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input {...categoryForm.register("description")} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createCategoryMutation.isPending}
          >
            Create Category
          </Button>
        </form>
      </Form>

      <Separator />

      <div>
        <h1 className="text-3xl font-bold mb-2">Create Flashcard</h1>
        <p className="text-muted-foreground">Add new flashcards to your grammar collection</p>
      </div>

      <Form {...flashcardForm}>
        <form
          onSubmit={flashcardForm.handleSubmit((values) => createFlashcardMutation.mutate(values))}
          className="space-y-6"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Front of Card</label>
              <Input {...flashcardForm.register("front")} />
            </div>

            <div>
              <label className="text-sm font-medium">Back of Card</label>
              <Input {...flashcardForm.register("back")} />
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                onValueChange={(value) =>
                  flashcardForm.setValue("categoryId", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Context Tags (comma-separated)</label>
              <Input
                onChange={(e) =>
                  flashcardForm.setValue(
                    "contextTags",
                    e.target.value.split(",").map((t) => t.trim())
                  )
                }
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createFlashcardMutation.isPending}
          >
            Create Flashcard
          </Button>
        </form>
      </Form>
    </div>
  );
}