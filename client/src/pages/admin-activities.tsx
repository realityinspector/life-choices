import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Link } from "wouter";
import { ArrowLeft, Pencil, Trash } from "lucide-react";

export default function AdminActivities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  // Fetch all activities and images
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/admin/activities'],
    queryFn: async () => {
      const res = await apiRequest('/api/admin/activities');
      return res.json();
    }
  });

  const { data: activityImages = [] } = useQuery<ActivityImage[]>({
    queryKey: ['/api/admin/activity-images'],
    queryFn: async () => {
      const res = await apiRequest('/api/admin/activity-images');
      return res.json();
    }
  });

  const [selectedActivities, setSelectedActivities] = useState<number[]>([]);
  
  // Create a Set of activity IDs that have images
  const activitiesWithImages = new Set(activityImages.map(img => img.activityId));

  // Handle checkbox selection
  const toggleSelection = (id: number) => {
    setSelectedActivities(prev => 
      prev.includes(id) 
        ? prev.filter(actId => actId !== id)
        : [...prev, id]
    );
  };

  // Handle bulk selection
  const toggleAllSelection = () => {
    if (selectedActivities.length === activities.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(activities.map(a => a.id));
    }
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => 
        apiRequest(`/api/activities/${id}`, { method: 'DELETE' })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activities'] });
      toast({
        title: 'Success',
        description: `Selected activities deleted successfully`,
      });
      setSelectedActivities([]);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete activities',
        variant: 'destructive',
      });
    }
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Activity Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage and edit activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/activities/new">Create Activity</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input 
                    type="checkbox"
                    checked={selectedActivities.length === activities.length}
                    onChange={toggleAllSelection}
                    className="h-4 w-4"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Has Image</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <input 
                      type="checkbox"
                      checked={selectedActivities.includes(activity.id)}
                      onChange={() => toggleSelection(activity.id)}
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell>{activity.name}</TableCell>
                  <TableCell>{activity.category}</TableCell>
                  <TableCell>{activity.frequency} {activity.frequencyUnit}</TableCell>
                  <TableCell>{activity.duration} {activity.durationUnit}</TableCell>
                  <TableCell>{activity.lifeImpact}</TableCell>
                   <TableCell>{activitiesWithImages.has(activity.id) ? 'True' : 'False'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        asChild
                      >
                        <Link href={`/admin/activities/${activity.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => deleteMutation.mutate(activity.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}