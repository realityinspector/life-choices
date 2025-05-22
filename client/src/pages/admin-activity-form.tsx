
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
import { ArrowLeft, Upload } from "lucide-react";

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

  useEffect(() => {
    if (activity) {
      setFormData(activity);
    }
  }, [activity]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Handle image upload first if there's a file
      let imageData;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        const imageRes = await apiRequest('/api/activity-images', {
          method: 'POST',
          body: formData
        });
        
        if (!imageRes.ok) {
          throw new Error('Failed to upload image');
        }
        imageData = await imageRes.json();
      }
      
      const url = isEditing 
        ? `/api/admin/activities/${activityId}` 
        : '/api/admin/activities';
        
      const res = await apiRequest(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imageData
        })
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activities'] });
      toast({
        title: 'Success',
        description: `Activity ${isEditing ? 'updated' : 'created'} successfully`,
      });
      navigate('/admin/activities');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} activity`,
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
              <Input
                type="file"
                accept="image/*"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => navigate('/admin/activities')}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()}>
            {isEditing ? 'Update Activity' : 'Create Activity'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
