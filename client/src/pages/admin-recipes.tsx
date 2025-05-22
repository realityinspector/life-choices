import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminRecipes() {
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<{current: number; total: number}>({ current: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      const res = await apiRequest('/api/activities');
      return res.json();
    }
  });

  const generateRecipesMutation = useMutation({
    mutationFn: async (params: { 
      activityIds: number[],
      globalPrompt?: string,
      individualPrompts?: Record<number, string>
    }) => {
      const res = await apiRequest('/api/admin-llm/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setProgress({ current: 0, total: 0 });
      setIsProcessing(false);
      // Refresh activities data
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    }
  });

  const handleGenerateRecipes = async () => {
    if (!activities || selectedActivities.size === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedActivities.size });

    await generateRecipesMutation.mutateAsync({
      activityIds: Array.from(selectedActivities),
      globalPrompt: globalPrompt || undefined
    });
  };

  const handleSelectAll = () => {
    if (!activities) return;
    if (selectedActivities.size === activities.length) {
      setSelectedActivities(new Set());
    } else {
      setSelectedActivities(new Set(activities.map(a => a.id)));
    }
  };

  const handleSelectMissing = () => {
    if (!activities) return;
    const missingRecipes = activities
      .filter(a => !a.recipes || a.recipes.length === 0)
      .map(a => a.id);
    setSelectedActivities(new Set(missingRecipes));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4">Admin: Recipe Management</h1>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Dashboard
            </Link>
          </Button>
        </div>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Global System Prompt</h2>
        <Textarea 
          value={globalPrompt}
          onChange={(e) => setGlobalPrompt(e.target.value)}
          placeholder="Additional system prompt instructions (optional)"
          className="mb-4"
        />
      </Card>

      <div className="mb-4 flex gap-2">
        <Button onClick={handleSelectAll}>
          {selectedActivities.size === (activities?.length || 0) ? 
            'Deselect All' : 'Select All'}
        </Button>
        <Button onClick={handleSelectMissing}>
          Select Missing Recipes
        </Button>
        <Button 
          onClick={handleGenerateRecipes}
          disabled={isProcessing || selectedActivities.size === 0}
        >
          Generate Recipes
        </Button>
      </div>

      {isProcessing && (
        <Card className="p-4 mb-4">
          <h3 className="font-semibold mb-2">Processing Activities...</h3>
          <Progress value={(progress.current / progress.total) * 100} className="mb-2" />
          <p className="text-sm text-muted-foreground">
            {progress.current} of {progress.total} activities processed
          </p>
        </Card>
      )}

      {generateRecipesMutation.isError && (
        <Alert variant="destructive" className="mb-4">
          Error generating recipes. Please try again.
        </Alert>
      )}

      <div className="grid gap-4">
        {activities?.map(activity => (
          <Card key={activity.id} className="p-4">
            <div className="flex items-start gap-4">
              <Checkbox 
                checked={selectedActivities.has(activity.id)}
                onCheckedChange={(checked) => {
                  const newSelected = new Set(selectedActivities);
                  if (checked) {
                    newSelected.add(activity.id);
                  } else {
                    newSelected.delete(activity.id);
                  }
                  setSelectedActivities(newSelected);
                }}
              />
              <div className="flex-1">
                <h3 className="font-semibold">{activity.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Category: {activity.category}
                </p>
                {activity.recipes && (
                  <p className="text-sm text-muted-foreground">
                    {activity.recipes.length} existing recipes
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}