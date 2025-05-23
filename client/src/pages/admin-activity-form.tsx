import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, ActivityInsert } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Upload, ExternalLink, Edit, Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Thumbnail component for the toast
const ImageThumbnail = ({ src, label }: { src: string | null, label: string }) => {
  if (!src) return null;
  
  return (
    <div className="flex flex-col items-center mr-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="w-20 h-20 border rounded overflow-hidden relative">
        <img 
          src={src} 
          alt={label} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPlVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
          }}
        />
      </div>
    </div>
  );
};

export default function AdminActivityForm() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activityId = location.split('/').pop();
  const isEditing = activityId !== 'new';

  // Validate activityId
  const isValidActivityId = isEditing && activityId && !isNaN(Number(activityId));

  const [formData, setFormData] = useState<Partial<ActivityInsert>>({
    name: '',
    category: '',
    frequency: 1,
    frequencyUnit: 'week',
    duration: 30,
    durationUnit: 'minute',
    lifeImpact: 5,
    exportToCalendar: false,
    emoji: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  
  // Recipe ingredients dialog state
  const [isIngredientsDialogOpen, setIsIngredientsDialogOpen] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSavingIngredients, setIsSavingIngredients] = useState(false);

  // Instructions state
  const [instructions, setInstructions] = useState('');

  // Fetch activity if editing
  const { data: activityData, isError: activityError, isLoading: isActivityLoading } = useQuery<{activity: Activity, images: any[]}>({
    queryKey: ['/api/admin/activities', activityId],
    queryFn: async () => {
      const res = await apiRequest(`/api/admin/activities/${activityId}`);
      if (!res.ok) {
        // Check if response is HTML instead of JSON (common error case)
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Received HTML instead of JSON. You may need to log in again or the server may be experiencing issues.');
        }
        throw new Error(`Failed to fetch activity: ${res.status} ${res.statusText}`);
      }
      
      try {
        const data = await res.json();
        return data;
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        throw new Error('Invalid response format from server. Please try again later.');
      }
    },
    enabled: isEditing && isValidActivityId,
    retry: 1 // Only retry once to avoid excessive requests on error
  });

  // Query to fetch activity recipes
  const { data: recipes = [], isError: recipeError } = useQuery({
    queryKey: ['/api/admin/activities', activityId, 'recipes'],
    queryFn: async () => {
      const res = await apiRequest(`/api/activity-recipes/by-activity/${activityId}`);
      if (!res.ok) {
        // Check if response is HTML instead of JSON (common error case)
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.error('Received HTML instead of JSON when fetching recipes');
          return []; // Return empty array instead of breaking
        }
        console.error(`Failed to fetch recipes: ${res.status} ${res.statusText}`);
        return [];
      }
      
      try {
        return await res.json();
      } catch (error) {
        console.error('Error parsing recipe JSON response:', error);
        return []; // Return empty array as fallback
      }
    },
    enabled: isEditing && isValidActivityId,
    retry: 1, // Only retry once
    onSuccess: (data) => {
      if (data.length > 0) {
        // Set ingredients from the first recipe
        const ingredientsData = data[0].ingredients;
        if (typeof ingredientsData === 'string') {
          try {
            // Try to parse as JSON string
            setIngredients(JSON.parse(ingredientsData));
          } catch (e) {
            // If parsing fails, treat as a comma-separated list or single item
            setIngredients(ingredientsData.split(',').map(i => i.trim()));
          }
        } else if (Array.isArray(ingredientsData)) {
          setIngredients(ingredientsData);
        }
        
        // Set instructions from the first recipe
        if (data[0].instructions) {
          setInstructions(data[0].instructions);
        }
      }
    }
  });

  const activity = activityData?.activity;
  const images = activityData?.images || [];

  useEffect(() => {
    if (activity) {
      setFormData(activity);
    }
    
    // Set the current image URL if there are images
    if (images && images.length > 0) {
      const currentImage = images[0]; // Using the first image
      const imageUrl = currentImage.fullUrl || currentImage.path;
      setCurrentImageUrl(imageUrl);
      console.log("Current activity image URL:", imageUrl);
    } else {
      setCurrentImageUrl(null);
      console.log("No current image for this activity");
    }
  }, [activity, images]);

  // Verify image is accessible
  const verifyImageExists = async (imagePath: string) => {
    try {
      console.log(`Verifying image exists at: ${imagePath}`);
      const response = await fetch(imagePath);
      const isOk = response.ok;
      console.log(`Image verification result: ${isOk ? 'Success' : 'Failed'} (Status: ${response.status})`);
      return isOk;
    } catch (error) {
      console.error("Error verifying image:", error);
      return false;
    }
  };

  // Save mutation - only saves activity data, image upload is handled separately
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      try {
        // Save the activity to get its ID if creating a new one
        const url = isEditing 
          ? `/api/admin/activities/${activityId}` 
          : '/api/admin/activities';
          
        const res = await apiRequest(url, {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!res.ok) {
          throw new Error('Failed to save activity');
        }
        
        const savedActivity = await res.json();
        return { activity: savedActivity };
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activities'] });
      toast({
        title: 'Success',
        description: `Activity ${isEditing ? 'updated' : 'created'} successfully`,
      });
      navigate('/admin/activities');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} activity`,
        variant: 'destructive',
      });
    }
  });

  // Mutation to save ingredients
  const saveIngredientsMutation = useMutation({
    mutationFn: async (ingredients: string[]) => {
      setIsSavingIngredients(true);
      try {
        if (recipes && recipes.length > 0) {
          // Update existing recipe
          const recipeId = recipes[0].id;
          const res = await apiRequest(`/api/activity-recipes/${recipeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredients,
              instructions
            })
          });
          
          if (!res.ok) {
            throw new Error('Failed to update recipe ingredients');
          }
          
          return await res.json();
        } else {
          // Create a new recipe with these ingredients
          const recipeName = `${activity?.name || 'Activity'} Plan`;
          const res = await apiRequest('/api/activity-recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: recipeName,
              ingredients,
              instructions,
              activityId: parseInt(activityId)
            })
          });
          
          if (!res.ok) {
            throw new Error('Failed to create recipe ingredients');
          }
          
          return await res.json();
        }
      } finally {
        setIsSavingIngredients(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activities', activityId, 'recipes'] });
      toast({
        title: 'Success',
        description: 'Ingredients saved successfully',
      });
      setIsIngredientsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save ingredients',
        variant: 'destructive',
      });
    }
  });

  // Handle adding a new ingredient
  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      if (editingIndex !== null) {
        // Update existing ingredient
        const updatedIngredients = [...ingredients];
        updatedIngredients[editingIndex] = newIngredient.trim();
        setIngredients(updatedIngredients);
        setEditingIndex(null);
      } else {
        // Add new ingredient
        setIngredients([...ingredients, newIngredient.trim()]);
      }
      setNewIngredient("");
    }
  };

  // Handle removing an ingredient
  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients.splice(index, 1);
    setIngredients(updatedIngredients);
  };

  // Handle editing an ingredient
  const handleEditIngredient = (index: number) => {
    setNewIngredient(ingredients[index]);
    setEditingIndex(index);
  };

  // Save ingredients
  const handleSaveIngredients = () => {
    saveIngredientsMutation.mutate(ingredients);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Activity' : 'Create Activity'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Modify existing activity' : 'Create a new activity'}
          </p>
        </div>
        <div className="flex space-x-2">
          {isEditing && (
            <Button 
              variant="outline" 
              onClick={() => setIsIngredientsDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Ingredients
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/admin/activities">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {/* Error handling */}
      {activityError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex">
            <div className="py-1">
              <svg className="h-6 w-6 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Error Loading Activity</p>
              <p className="text-sm">There was a problem loading the activity data. You may need to log in again or try refreshing the page.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => navigate('/admin/activities')}
              >
                Return to Activities List
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invalid activity ID error */}
      {isEditing && !isValidActivityId && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex">
            <div className="py-1">
              <svg className="h-6 w-6 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Invalid Activity ID</p>
              <p className="text-sm">The activity ID "{activityId}" is not valid. Please select a valid activity to edit.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => navigate('/admin/activities')}
              >
                Return to Activities List
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isActivityLoading && isEditing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading activity data...</span>
          </div>
        </div>
      )}

      {/* Ingredients Editing Dialog */}
      <Dialog open={isIngredientsDialogOpen} onOpenChange={setIsIngredientsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Activity Ingredients</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Add a new ingredient or step"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIngredient();
                  }
                }}
              />
              <Button type="button" size="sm" onClick={handleAddIngredient}>
                {editingIndex !== null ? (
                  <>Update</>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {ingredients.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No ingredients added yet. Add some above.
                </div>
              ) : (
                ingredients.map((ingredient, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm">{ingredient}</span>
                    <div className="flex space-x-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => handleEditIngredient(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleRemoveIngredient(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="space-y-2 mt-4">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Enter detailed instructions here..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsIngredientsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveIngredients}
              disabled={isSavingIngredients}
            >
              {isSavingIngredients ? 'Saving...' : 'Save Ingredients'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Activity' : 'New Activity'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            {currentImageUrl && (
              <div>
                <Label>Current Image</Label>
                <div className="mt-2 w-32 h-32 border rounded overflow-hidden">
                  <img 
                    src={currentImageUrl} 
                    alt="Current activity image" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPlVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Show current ingredients if they exist */}
            {isEditing && ingredients.length > 0 && (
              <div>
                <Label>Current Ingredients</Label>
                <div className="mt-2 space-y-1">
                  {ingredients.slice(0, 3).map((ingredient, index) => (
                    <div key={index} className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                      {ingredient.length > 42 ? `${ingredient.substring(0, 42)}...` : ingredient}
                    </div>
                  ))}
                  {ingredients.length > 3 && (
                    <div className="px-2 py-1 bg-gray-100 rounded-md text-sm text-muted-foreground">
                      +{ingredients.length - 3} more ingredients...
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsIngredientsDialogOpen(true)}
                    className="mt-2"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Ingredients
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select 
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {["Health & Fitness", "Learning & Development", "Family & Relationships", 
                    "Career & Finance", "Recreation & Leisure", "Creativity & Expression",
                    "Service & Contribution", "Spirituality & Mindfulness"].map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequency</Label>
                <Input 
                  type="number"
                  value={formData.frequency}
                  onChange={e => setFormData(prev => ({ ...prev, frequency: parseInt(e.target.value) }))}
                  disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
                />
              </div>
              <div>
                <Label>Frequency Unit</Label>
                <Select 
                  value={formData.frequencyUnit}
                  onValueChange={value => setFormData(prev => ({ ...prev, frequencyUnit: value as any }))}
                  disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["day", "week", "month", "year"].map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Input 
                  type="number"
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
                />
              </div>
              <div>
                <Label>Duration Unit</Label>
                <Select 
                  value={formData.durationUnit}
                  onValueChange={value => setFormData(prev => ({ ...prev, durationUnit: value as any }))}
                  disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["minute", "hour"].map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Life Impact (1-10)</Label>
              <Input 
                type="number"
                min="1"
                max="10"
                value={formData.lifeImpact}
                onChange={e => setFormData(prev => ({ ...prev, lifeImpact: parseInt(e.target.value) }))}
                disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
              />
            </div>

            <div>
              <Label>Emoji</Label>
              <Input 
                value={formData.emoji || ''}
                onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                disabled={isActivityLoading || activityError || (isEditing && !isValidActivityId)}
              />
            </div>

            <div>
              <Label>Activity Image</Label>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-grow"
                  />
                  {selectedFile && (
                    <Button 
                      type="button" 
                      onClick={async () => {
                        if (!activityId || activityId === 'new') {
                          toast({
                            title: "Error",
                            description: "Please save the activity first before uploading an image",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setIsUploading(true);
                        try {
                          // Create form data for the image upload
                          const imageFormData = new FormData();
                          imageFormData.append('image', selectedFile);
                          imageFormData.append('activityId', activityId.toString());
                          
                          console.log(`Uploading image for activity ID: ${activityId}`);
                          console.log(`Previous image URL: ${currentImageUrl || 'None'}`);
                          
                          // Upload the image
                          const imageRes = await apiRequest('/api/activity-images', {
                            method: 'POST',
                            body: imageFormData
                          });
                          
                          if (!imageRes.ok) {
                            throw new Error('Failed to upload image');
                          }
                          
                          const uploadedImage = await imageRes.json();
                          console.log("Image upload response:", uploadedImage);
                          
                          // Get the new image URL
                          const newImageUrl = uploadedImage.fullUrl || uploadedImage.path;
                          console.log(`New image URL: ${newImageUrl}`);
                          
                          // Verify the image is accessible
                          const imageExists = await verifyImageExists(newImageUrl);
                          
                          if (!imageExists) {
                            console.error(`Image verification failed: Image at ${newImageUrl} is not accessible`);
                            toast({
                              title: "Image Upload Warning",
                              description: "Image was uploaded but may not be accessible. Please check the console for details.",
                              variant: "destructive",
                            });
                          } else {
                            console.log(`Image verification success: Image at ${newImageUrl} is accessible`);
                            
                            // Update the current image URL state to display the new image immediately
                            setCurrentImageUrl(newImageUrl);
                            
                            toast({
                              title: "Image Uploaded Successfully",
                              description: (
                                <div className="flex flex-col space-y-3">
                                  <div className="flex">
                                    <ImageThumbnail src={currentImageUrl} label="Before" />
                                    <ImageThumbnail src={newImageUrl} label="After" />
                                  </div>
                                  <div>
                                    <div className="text-sm">File: {uploadedImage.originalFilename}</div>
                                    <div className="text-sm">Path: {uploadedImage.path}</div>
                                    <div className="text-sm text-green-600 font-medium">Activity now uses this image</div>
                                    <a 
                                      href={newImageUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline flex items-center mt-1"
                                    >
                                      View Image <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                  </div>
                                </div>
                              ),
                            });
                            
                            // Refresh the activity data to get updated images
                            queryClient.invalidateQueries({ queryKey: ['/api/admin/activities', activityId] });
                          }
                        } catch (error) {
                          console.error("Error uploading image:", error);
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "Failed to upload image",
                            variant: "destructive",
                          });
                        } finally {
                          setIsUploading(false);
                          setSelectedFile(null);
                        }
                      }}
                      disabled={isUploading || !selectedFile}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Now'}
                    </Button>
                  )}
                </div>
                {selectedFile && (
                  <div className="text-sm text-green-500 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    New image selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => navigate('/admin/activities')}>
            Cancel
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={isUploading || isActivityLoading || (isEditing && activityError)}
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : isActivityLoading ? (
              <>
                <span className="mr-2">⏳</span>
                Loading...
              </>
            ) : (
              isEditing ? 'Update Activity' : 'Create Activity'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
