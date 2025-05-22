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
import { Link, useLocation } from "wouter";
import { ArrowLeft, Upload, ExternalLink } from "lucide-react";

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

  // Fetch activity if editing
  const { data: activityData } = useQuery<{activity: Activity, images: any[]}>({
    queryKey: ['/api/admin/activities', activityId],
    queryFn: async () => {
      const res = await apiRequest(`/api/admin/activities/${activityId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch activity');
      }
      return res.json();
    },
    enabled: isEditing
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
        <Button variant="outline" asChild>
          <Link href="/admin/activities">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

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
            
            <div>
              <Label>Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select 
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
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
                />
              </div>
              <div>
                <Label>Frequency Unit</Label>
                <Select 
                  value={formData.frequencyUnit}
                  onValueChange={value => setFormData(prev => ({ ...prev, frequencyUnit: value as any }))}
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
                />
              </div>
              <div>
                <Label>Duration Unit</Label>
                <Select 
                  value={formData.durationUnit}
                  onValueChange={value => setFormData(prev => ({ ...prev, durationUnit: value as any }))}
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
              />
            </div>

            <div>
              <Label>Emoji</Label>
              <Input 
                value={formData.emoji || ''}
                onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
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
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
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
