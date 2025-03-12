import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Activity, ActivityImage } from '@shared/schema';
import { Loader2, CheckCircle2, XCircle, Unlink, FileImage, Upload, Search, 
         Save, Edit, Filter, AlertCircle, Check, X, ChevronsUpDown, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Reusable Activity Search Component
interface ActivitySearchProps {
  activities: Activity[];
  selectedActivity: Activity | null;
  onSelect: (activity: Activity | null) => void;
  placeholder?: string;
  showCategories?: boolean;
}

function ActivitySearch({ 
  activities, 
  selectedActivity, 
  onSelect, 
  placeholder = "Search for activities...", 
  showCategories = true 
}: ActivitySearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  // Initialize a local value state to handle internal component state properly
  const [value, setValue] = useState<string>("");
  
  // Update local value whenever selectedActivity changes
  useEffect(() => {
    if (selectedActivity) {
      setValue(selectedActivity.name);
    } else {
      setValue("");
    }
  }, [selectedActivity]);
  
  // Function to handle selection and ensure UI updates
  const handleSelect = (activity: Activity) => {
    setValue(activity.name); // Update local state immediately
    onSelect(activity);      // Notify parent component
    setOpen(false);          // Close dropdown
  };
  
  // Group activities by category if needed
  const groupedActivities = showCategories ? 
    Object.entries(
      activities.reduce((acc: Record<string, Activity[]>, activity) => {
        if (!acc[activity.category]) {
          acc[activity.category] = [];
        }
        acc[activity.category].push(activity);
        return acc;
      }, {})
    ).sort(([a], [b]) => a.localeCompare(b)) : 
    [["All Activities", activities]] as [string, Activity[]][];
  
  // Filter based on whether it's a shop or database activity
  const getActivitySource = (activity: Activity): string => {
    return activity.id >= 1000 ? 'Shop Item' : 'Database';
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          {selectedActivity ? (
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedActivity.name}</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {getActivitySource(selectedActivity)}
              </Badge>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={placeholder} 
            value={search} 
            onValueChange={setSearch} 
          />
          <CommandList>
            <CommandEmpty>No activities found.</CommandEmpty>
            <ScrollArea className="h-[300px]">
              {groupedActivities.map(([category, items]) => {
                // Filter items based on search
                const filteredItems = items.filter((activity: Activity) =>
                  activity.name.toLowerCase().includes(search.toLowerCase()) ||
                  activity.category.toLowerCase().includes(search.toLowerCase())
                );
                
                if (filteredItems.length === 0) return null;
                
                return (
                  <CommandGroup key={category} heading={category}>
                    {filteredItems.map((activity: Activity) => (
                      <CommandItem
                        key={activity.id}
                        value={`${activity.id}-${activity.name}`}
                        onSelect={() => handleSelect(activity)}
                        className="flex justify-between"
                      >
                        <div className="flex items-center">
                          <span>{activity.emoji || "🔍"}</span>
                          <span className="ml-2">{activity.name}</span>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {getActivitySource(activity)}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </ScrollArea>
            <div className="p-1 border-t">
              {selectedActivity && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => {
                    setValue(""); // Clear value in local state
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  Clear selection
                </Button>
              )}
              
              <div className="p-2 mt-1 border-t">
                <div className="text-sm font-medium mb-1">Create new activity:</div>
                <div className="flex items-center gap-2">
                  <Input
                    id="new-activity-input"
                    type="text"
                    placeholder="Enter activity name"
                    className="flex-1 h-8"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('new-activity-input') as HTMLInputElement;
                      const activityName = input?.value?.trim();
                      
                      if (!activityName) {
                        // Show toast using context
                        const toast = document.createEvent('CustomEvent');
                        document.dispatchEvent(toast);
                        return;
                      }
                      
                      // Dispatch a custom event to create a new activity
                      // Get the current file index from the parent component's context
                      const fileIndexElem = document.getElementById('current-file-index');
                      const fileIndex = fileIndexElem ? parseInt(fileIndexElem.getAttribute('data-index') || '-1') : undefined;
                      
                      const event = new CustomEvent('createNewActivity', { 
                        detail: { activityName, fileIndex } 
                      });
                      document.dispatchEvent(event);
                      setOpen(false);
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface FileUploadState {
  file: File;
  suggestedActivity?: Activity;
  suggestedMatch?: string;
  loading: boolean;
  activityId?: number | null;
  status: 'idle' | 'matching' | 'matched' | 'failed' | 'uploaded';
  filename?: string;
  path?: string;
  mimeType?: string;
}

interface AssociationRequest {
  activityId: number;
  filename: string;
  originalFilename: string;
  path: string;
  mimeType: string;
}

export default function AdminImagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMatching, setIsMatching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [searchQuery, setSearchQuery] = useState('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [showOnlyNonMatches, setShowOnlyNonMatches] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingImageId, setEditingImageId] = useState<number | null>(null);
  const [autoSaveAfterMatch, setAutoSaveAfterMatch] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch activities for dropdown selection (including both database activities and shop catalog)
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/admin/activities'],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest('/api/admin/activities', { signal });
        return res.json();
      } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
      }
    }
  });
  
  // Fetch existing activity images
  const { data: activityImages = [], refetch: refetchImages } = useQuery<ActivityImage[]>({
    queryKey: ['/api/admin/activity-images'],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest('/api/admin/activity-images', { signal });
        return res.json();
      } catch (error) {
        console.error('Error fetching activity images:', error);
        return [];
      }
    }
  });
  
  // Upload files mutation
  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('images', file);
      });
      
      const res = await apiRequest('/api/admin/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type, let browser set it with boundary
      });
      
      return res.json();
    },
    onSuccess: (data) => {
      // Update files with upload info
      setFiles(prev => 
        prev.map(fileState => {
          const uploadedFile = data.files.find(
            (f: any) => f.originalFilename === fileState.file.name
          );
          
          if (uploadedFile) {
            return {
              ...fileState,
              status: 'uploaded',
              filename: uploadedFile.filename,
              path: uploadedFile.path,
              mimeType: uploadedFile.mimeType
            };
          }
          return fileState;
        })
      );
      
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${data.files.length} files.`,
      });
      
      setIsUploading(false);
      // Start matching process after upload
      matchFilesWithActivities();
    },
    onError: (error) => {
      console.error('Error uploading files:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  });
  
  // Suggest match mutation
  const suggestMatchMutation = useMutation({
    mutationFn: async (filename: string) => {
      try {
        const res = await apiRequest('/api/admin/suggest-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename }),
        });
        
        const data = await res.json();
        console.log('Matching result for', filename, data);
        return data;
      } catch (error) {
        console.error('Error in suggest match:', error);
        throw error;
      }
    }
  });
  
  // Associate image mutation
  const associateImageMutation = useMutation({
    mutationFn: async (data: AssociationRequest) => {
      const res = await apiRequest('/api/admin/associate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Image Updated',
        description: 'Successfully updated image association.',
      });
      refetchImages();
    },
    onError: (error) => {
      console.error('Error associating image:', error);
      toast({
        title: 'Association Error',
        description: 'Failed to update image association.',
        variant: 'destructive',
      });
    }
  });
  
  // Create a new activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (activityName: string) => {
      // Create a basic activity with just a name
      const res = await apiRequest('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activityName,
          category: 'Other',
          frequency: 1,
          frequencyUnit: 'week',
          duration: 30,
          durationUnit: 'minute',
          lifeImpact: 0,
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          priority: 0,
          emoji: null,
          exportToCalendar: false,
          nextDue: new Date().toISOString(),
        }),
      });
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Activity Created',
        description: 'Successfully created a new activity.',
      });
      // Refresh the activities list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activities'] });
      return data;
    },
    onError: (error) => {
      console.error('Error creating activity:', error);
      toast({
        title: 'Creation Error',
        description: 'Failed to create a new activity.',
        variant: 'destructive',
      });
    }
  });
  
  // Setup event listener for creating new activities
  useEffect(() => {
    const handleCreateActivity = async (e: any) => {
      const { activityName, fileIndex } = e.detail;
      if (!activityName) return;
      
      try {
        // Create the new activity
        const newActivity = await createActivityMutation.mutateAsync(activityName);
        
        // Use the new activity
        if (newActivity?.id) {
          // If we're editing an existing image, associate it
          if (editingImageId !== null) {
            const image = activityImages.find(img => img.id === editingImageId);
            if (image) {
              await associateImageMutation.mutateAsync({
                activityId: newActivity.id,
                filename: image.filename,
                originalFilename: image.originalFilename,
                path: image.path,
                mimeType: image.mimeType
              });
              setEditingImageId(null);
              setIsEditDialogOpen(false);
            }
          } 
          // If we're adding an association to a newly uploaded file
          else if (fileIndex !== undefined) {
            // Update the file in the state with the new activity
            setFiles(prev => prev.map((f, idx) => 
              idx === fileIndex ? { 
                ...f, 
                activityId: newActivity.id,
                suggestedActivity: newActivity,
                status: 'matched'
              } : f
            ));
          }
          
          toast({
            title: 'Activity Created',
            description: `New activity "${activityName}" created and ready to use.`,
          });
        }
      } catch (error) {
        console.error('Error creating activity from event:', error);
        toast({
          title: 'Creation Error',
          description: 'Failed to create a new activity.',
          variant: 'destructive',
        });
      }
    };
    
    // Listen for the custom event
    document.addEventListener('createNewActivity', handleCreateActivity);
    
    // Clean up
    return () => {
      document.removeEventListener('createNewActivity', handleCreateActivity);
    };
  }, [editingImageId, createActivityMutation, associateImageMutation, toast, activityImages]);
  
  // Batch associate mutation
  const batchAssociateMutation = useMutation({
    mutationFn: async (associations: AssociationRequest[]) => {
      const res = await apiRequest('/api/admin/batch-associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associations }),
      });
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Association Complete',
        description: `Successfully associated ${data.results.length} images with activities.`,
      });
      refetchImages();
    },
    onError: (error) => {
      console.error('Error associating images:', error);
      toast({
        title: 'Association Error',
        description: 'Failed to associate images with activities.',
        variant: 'destructive',
      });
    }
  });
  
  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/admin/activity-image/${id}`, {
        method: 'DELETE',
      });
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Image Deleted',
        description: 'Image successfully deleted.',
      });
      refetchImages();
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast({
        title: 'Deletion Error',
        description: 'Failed to delete image.',
        variant: 'destructive',
      });
    }
  });
  
  // Import activities from CSV mutation
  const importActivitiesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/admin/import-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${data.count} activities from CSV.`,
      });
      // Refresh activities list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
    onError: (error) => {
      console.error('Error importing activities:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import activities from CSV file.',
        variant: 'destructive',
      });
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        loading: false,
        status: 'idle' as const
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const handleUploadFiles = async () => {
    if (files.length === 0 || files.every(f => f.status === 'uploaded')) {
      toast({
        title: 'No files to upload',
        description: 'Please select files to upload first.'
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Get files that aren't already uploaded
    const filesToUpload = files
      .filter(f => f.status === 'idle')
      .map(f => f.file);
    
    if (filesToUpload.length === 0) {
      toast({
        title: 'No new files',
        description: 'All files have already been uploaded.'
      });
      setIsUploading(false);
      return;
    }
    
    // Determine batch size - process in chunks of 40 files to avoid overwhelming the server
    const BATCH_SIZE = 40;
    const totalBatches = Math.ceil(filesToUpload.length / BATCH_SIZE);
    
    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 2;
        });
      }, 300);
      
      // Process files in batches
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, filesToUpload.length);
        const currentBatch = filesToUpload.slice(start, end);
        
        // Update progress to reflect batch progress
        setUploadProgress(Math.floor((batchIndex / totalBatches) * 90));
        
        // Wait for batch to upload before continuing
        await uploadMutation.mutateAsync(currentBatch);
        
        // Small delay between batches to avoid overwhelming the server
        if (batchIndex < totalBatches - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${filesToUpload.length} files.`,
      });
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload some files. You may need to try again with fewer files at once.',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };
  
  const matchFilesWithActivities = async () => {
    if (files.length === 0 || files.some(f => f.status !== 'uploaded')) {
      toast({
        title: 'Upload Required',
        description: 'Please upload all files before matching.'
      });
      return;
    }
    
    setIsMatching(true);
    
    // Get files that need matching
    const filesToMatch = files.filter(f => f.status === 'uploaded');
    const totalFiles = filesToMatch.length;
    
    // Set batch size for concurrent processing (not too many to avoid rate limits)
    const CONCURRENT_BATCH_SIZE = 5;
    
    // Keep track of matches and non-matches
    let matchedFiles: AssociationRequest[] = [];
    let nonMatchedIndices: number[] = [];
    
    // Create a function to process a single file
    const processFile = async (fileIndex: number) => {
      const fileState = files[fileIndex];
      
      if (fileState.status !== 'uploaded') return;
      
      // Update status for this file
      setFiles(prev => prev.map((f, idx) => 
        idx === fileIndex ? { ...f, status: 'matching', loading: true } : f
      ));
      
      try {
        // Use original filename for better matching
        const result = await suggestMatchMutation.mutateAsync(fileState.file.name);
        
        // Find matching activity
        const matchedActivity = activities.find(a => a.id === result.activityId);
        
        if (result.activityId && matchedActivity && autoSaveAfterMatch) {
          // Prepare for auto-save if there's a match
          matchedFiles.push({
            activityId: result.activityId,
            filename: fileState.filename!,
            originalFilename: fileState.file.name,
            path: fileState.path!,
            mimeType: fileState.file.type
          });
        }
        
        if (!result.activityId || !matchedActivity) {
          // Keep track of non-matched file indices to show in UI
          nonMatchedIndices.push(fileIndex);
        }
        
        // Update file state with match result
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { 
            ...f, 
            status: result.activityId ? 'matched' : 'failed',
            suggestedMatch: result.suggestedMatch,
            activityId: result.activityId,
            suggestedActivity: matchedActivity,
            loading: false 
          } : f
        ));
      } catch (error) {
        console.error(`Error matching file ${fileState.file.name}:`, error);
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: 'failed', loading: false } : f
        ));
        
        // Add to non-matched list when there's an error
        nonMatchedIndices.push(fileIndex);
      }
    };
    
    // Process files in smaller batches
    for (let batchIndex = 0; batchIndex < Math.ceil(totalFiles / CONCURRENT_BATCH_SIZE); batchIndex++) {
      const batchPromises: Promise<void>[] = [];
      
      // Calculate which files to process in this batch
      const uploadedFiles = files.filter(f => f.status === 'uploaded');
      const startIdx = batchIndex * CONCURRENT_BATCH_SIZE;
      const endIdx = Math.min(startIdx + CONCURRENT_BATCH_SIZE, uploadedFiles.length);
      
      // Create batch of promises
      for (let i = startIdx; i < endIdx; i++) {
        // Find the index of this uploaded file in the original files array
        const fileIndex = files.findIndex((f, idx) => 
          f === uploadedFiles[i]
        );
        
        if (fileIndex !== -1) {
          batchPromises.push(processFile(fileIndex));
        }
      }
      
      // Process this batch concurrently
      await Promise.all(batchPromises);
      
      // If auto-save is enabled and we have matches, save them now
      if (autoSaveAfterMatch && matchedFiles.length > 0) {
        try {
          const result = await batchAssociateMutation.mutateAsync(matchedFiles);
          toast({
            title: 'Batch Saved',
            description: `Saved ${result.results?.length || 0} matched images.`,
          });
          
          // Clear the matched files after saving
          matchedFiles = [];
        } catch (error) {
          console.error('Error auto-saving matched files:', error);
          toast({
            title: 'Auto-Save Error',
            description: 'Failed to save some matched files automatically. Will try again with next batch.',
            variant: 'destructive',
          });
        }
      }
      
      // Add a small delay between batches
      if (batchIndex < Math.ceil(totalFiles / CONCURRENT_BATCH_SIZE) - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // Show results summary
    const matchedCount = files.filter(f => f.status === 'matched').length;
    const failedCount = files.filter(f => f.status === 'failed').length;
    
    toast({
      title: 'Matching Complete',
      description: `Successfully matched ${matchedCount} files. ${failedCount} files had no automatic matches.`,
      duration: 5000,
    });
    
    // If we have auto-save enabled and non-matched files, set to show only those
    if (autoSaveAfterMatch && nonMatchedIndices.length > 0) {
      setShowOnlyNonMatches(true);
      toast({
        title: 'Manual Association Needed',
        description: `${nonMatchedIndices.length} files need manual activity association.`,
        duration: 5000,
      });
    }
    
    setIsMatching(false);
  };

  const handleActivityChange = (fileIndex: number, activity: Activity | null) => {
    setFiles(prev => prev.map((f, idx) => 
      idx === fileIndex ? { 
        ...f, 
        activityId: activity?.id || null,
        suggestedActivity: activity || undefined 
      } : f
    ));
  };
  
  const handleSaveAssociations = async () => {
    // Get all files that have an activity assigned but haven't been saved yet
    // Include both 'uploaded' and 'matched' files as long as they have an activityId
    const fileAssociations = files
      .filter(f => (f.status === 'uploaded' || f.status === 'matched') && f.activityId)
      .map(f => ({
        activityId: f.activityId as number,
        filename: f.filename as string,
        originalFilename: f.file.name,
        path: f.path as string,
        mimeType: f.file.type
      }));
    
    if (fileAssociations.length === 0) {
      toast({
        title: 'No Associations',
        description: 'No new activity associations to save.'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      await batchAssociateMutation.mutateAsync(fileAssociations);
      
      // Clear any files that were just saved
      setFiles(prev => prev.filter(f => !((f.status === 'uploaded' || f.status === 'matched') && f.activityId)));
      
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving associations:', error);
      setIsSaving(false);
    }
  };
  
  const handleImageEdit = (image: ActivityImage) => {
    setEditingImageId(image.id);
    // Find current activity
    const currentActivity = activities.find(a => a.id === image.activityId) || null;
    setSelectedActivity(currentActivity);
    setIsEditDialogOpen(true);
  };
  
  const handleSaveImageEdit = async () => {
    if (!editingImageId || !selectedActivity) {
      toast({
        title: 'Selection Required',
        description: 'Please select an activity for this image.',
        variant: 'destructive',
      });
      return;
    }
    
    const image = activityImages.find(img => img.id === editingImageId);
    if (!image) return;
    
    try {
      await associateImageMutation.mutateAsync({
        activityId: selectedActivity.id,
        filename: image.filename,
        originalFilename: image.originalFilename,
        path: image.path,
        mimeType: image.mimeType
      });
      
      setIsEditDialogOpen(false);
      setEditingImageId(null);
      setSelectedActivity(null);
    } catch (error) {
      console.error('Error updating image:', error);
    }
  };
  
  const handleDeleteImage = (id: number) => {
    deleteImageMutation.mutate(id);
  };
  
  const handleImportActivities = () => {
    importActivitiesMutation.mutate();
  };
  
  const toggleSearchFocus = (active: boolean) => {
    setSearchActive(active);
    if (active && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  const filteredImages = activityImages.filter(image => {
    // Text search
    const matchesSearch = searchQuery.trim() === '' || 
      image.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Activity filter
    const matchesActivity = !activitySearchQuery || 
      activities.find(a => a.id === image.activityId)?.name.toLowerCase().includes(activitySearchQuery.toLowerCase());
    
    return matchesSearch && matchesActivity;
  });
  
  const filteredFiles = files.filter(file => {
    if (showOnlyNonMatches) {
      return file.status === 'failed' || (file.status === 'uploaded' && !file.activityId);
    }
    return true;
  });
  
  // Group images by activity
  const imagesByActivity = filteredImages.reduce((acc: Record<string, ActivityImage[]>, image) => {
    const activity = activities.find(a => a.id === image.activityId);
    const key = activity ? activity.name : 'Unassigned';
    
    if (!acc[key]) {
      acc[key] = [];
    }
    
    acc[key].push(image);
    return acc;
  }, {});
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin: Image Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Match</TabsTrigger>
          <TabsTrigger value="manage">Manage Images</TabsTrigger>
          <TabsTrigger value="actions">Admin Actions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Activity Images</CardTitle>
              <CardDescription>
                Select image files to upload and automatically match with activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                <Label htmlFor="fileUpload">Select Files (JPEG, PNG, GIF)</Label>
                <Input 
                  id="fileUpload" 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileChange} 
                  disabled={isUploading || isMatching}
                />
                
                <div className="flex items-center gap-2 my-2">
                  <input
                    type="checkbox"
                    id="autoSaveOption"
                    checked={autoSaveAfterMatch}
                    onChange={(e) => setAutoSaveAfterMatch(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="autoSaveOption" className="cursor-pointer">
                    Automatically save matched images (recommended)
                  </Label>
                </div>
                
                {isUploading && (
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleUploadFiles}
                    disabled={isUploading || files.length === 0 || files.every(f => f.status === 'uploaded')}
                    className="flex gap-2 items-center"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Files
                  </Button>
                  
                  <Button
                    onClick={matchFilesWithActivities}
                    disabled={isMatching || isUploading || files.length === 0 || files.some(f => f.status !== 'uploaded')}
                    variant="secondary"
                    className="flex gap-2 items-center"
                  >
                    {isMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Match with Activities
                  </Button>
                  
                  <Button
                    onClick={handleSaveAssociations}
                    disabled={isSaving || files.filter(f => (f.status === 'uploaded' || f.status === 'matched') && f.activityId).length === 0}
                    variant="default"
                    className="flex gap-2 items-center"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Associations
                  </Button>
                  
                  <Button
                    onClick={() => setShowOnlyNonMatches(!showOnlyNonMatches)}
                    variant="outline"
                    className="flex gap-2 items-center"
                  >
                    <Filter className="h-4 w-4" />
                    {showOnlyNonMatches ? "Show All Files" : "Show Only Non-Matches"}
                  </Button>
                </div>
                
                {filteredFiles.length > 0 && (
                  <div className="max-h-96 overflow-y-auto border rounded-md">
                    <Table>
                      <TableCaption>Uploaded Files</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead>Suggested Match</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFiles.map((file, index) => (
                          <TableRow key={index} className={file.status === 'failed' ? 'bg-red-50' : ''}>
                            <TableCell className="font-medium truncate max-w-[200px]" data-fileindex={index}>
                              {file.file.name}
                            </TableCell>
                            <TableCell>
                              {file.suggestedMatch ? file.suggestedMatch : '-'}
                            </TableCell>
                            <TableCell>
                              {file.loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : file.status === 'idle' ? (
                                <span className="text-gray-500">Not uploaded</span>
                              ) : file.status === 'uploaded' ? (
                                <span className="text-blue-500">Uploaded</span>
                              ) : file.status === 'matching' ? (
                                <span className="text-yellow-500">Matching...</span>
                              ) : file.status === 'matched' ? (
                                <span className="text-green-500 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" /> 
                                  Matched
                                </span>
                              ) : (
                                <span className="text-red-500 flex items-center gap-1">
                                  <XCircle className="h-4 w-4" /> 
                                  No Match
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {file.status === 'uploaded' || file.status === 'matched' || file.status === 'failed' ? (
                                <div className="flex items-center space-x-2">
                                  <ActivitySearch
                                    activities={activities}
                                    selectedActivity={file.suggestedActivity || null}
                                    onSelect={(activity) => handleActivityChange(index, activity)}
                                  />
                                  {(file.status === 'failed' || !file.suggestedActivity) && (
                                    <Button 
                                      size="sm" 
                                      className="whitespace-nowrap"
                                      onClick={() => {
                                        // Extract a potential activity name from the filename
                                        const nameParts = file.file.name.split('.')[0].split(/(?=[A-Z])|\s+|(?=[a-z][A-Z])/);
                                        const suggestedName = nameParts.length > 1 
                                          ? nameParts.slice(1).join(' ') 
                                          : file.file.name.split('.')[0];
                                        
                                        // Create the input dialog
                                        const activityName = window.prompt(
                                          "Enter name for new activity:", 
                                          suggestedName
                                        );
                                        
                                        if (activityName?.trim()) {
                                          // Dispatch event to create new activity
                                          const event = new CustomEvent('createNewActivity', { 
                                            detail: { activityName: activityName.trim(), fileIndex: index } 
                                          });
                                          document.dispatchEvent(event);
                                        }
                                      }}
                                    >
                                      Create New Activity
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {files.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    No files selected. Please choose files to upload.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Activity Images</span>
                <div className="flex items-center space-x-2">
                  <div className={`relative transition-all duration-300 ${searchActive ? 'w-64' : 'w-9'}`}>
                    <Input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Search by filename..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 pr-2 transition-all duration-300 ${searchActive ? 'opacity-100' : 'opacity-0'}`}
                      onBlur={() => searchQuery === '' && toggleSearchFocus(false)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute left-0 top-0 h-9 w-9"
                      onClick={() => toggleSearchFocus(!searchActive)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                View and edit existing image associations with activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredImages.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No images found. Upload some images first.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(imagesByActivity).map(([activityName, images]) => (
                    <div key={activityName} className="space-y-2">
                      <h3 className="text-lg font-semibold">{activityName} ({images.length})</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {images.map((image) => {
                          const activity = activities.find(a => a.id === image.activityId);
                          return (
                            <div key={image.id} className="relative group border rounded-md overflow-hidden">
                              <div className="aspect-square overflow-hidden bg-gray-100">
                                <img 
                                  src={image.path} 
                                  alt={image.originalFilename} 
                                  className="w-full h-full object-cover object-center"
                                />
                              </div>
                              <div className="p-2 text-xs truncate">
                                {image.originalFilename}
                              </div>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-7 w-7 rounded-full"
                                  onClick={() => handleImageEdit(image)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 px-2 text-white hover:text-white hover:bg-red-600"
                                    onClick={() => handleDeleteImage(image.id)}
                                  >
                                    Delete
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 px-2 text-white hover:text-white hover:bg-blue-600"
                                    onClick={() => handleImageEdit(image)}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>Special administrative actions for managing activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Import Default Activities</h3>
                <p className="text-sm text-gray-500">
                  Import the default set of activities from the CSV file. This will add all standard activities to the database.
                </p>
                <Button 
                  onClick={handleImportActivities}
                  disabled={importActivitiesMutation.isPending}
                  className="flex gap-2"
                >
                  {importActivitiesMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import Activities from CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Association</DialogTitle>
            <DialogDescription>
              Change which activity this image is associated with.
            </DialogDescription>
          </DialogHeader>
          
          {editingImageId && (
            <div className="space-y-4">
              <div className="aspect-video overflow-hidden bg-gray-100 rounded-md">
                <img 
                  src={activityImages.find(img => img.id === editingImageId)?.path} 
                  alt="Activity image" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Activity</Label>
                  <ActivitySearch
                    activities={activities}
                    selectedActivity={selectedActivity}
                    onSelect={setSelectedActivity}
                    placeholder="Choose an activity for this image..."
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => {
                      // Extract a potential activity name from the image filename
                      const image = activityImages.find(img => img.id === editingImageId);
                      if (!image) return;
                      
                      const nameParts = image.originalFilename.split('.')[0].split(/(?=[A-Z])|\s+|(?=[a-z][A-Z])/);
                      const suggestedName = nameParts.length > 1 
                        ? nameParts.slice(1).join(' ') 
                        : image.originalFilename.split('.')[0];
                      
                      // Create the input dialog
                      const activityName = window.prompt(
                        "Enter name for new activity:", 
                        suggestedName
                      );
                      
                      if (activityName?.trim()) {
                        // Dispatch event to create new activity
                        const event = new CustomEvent('createNewActivity', { 
                          detail: { activityName: activityName.trim(), fileIndex: undefined } 
                        });
                        document.dispatchEvent(event);
                      }
                    }}
                  >
                    Create New Activity
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveImageEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
