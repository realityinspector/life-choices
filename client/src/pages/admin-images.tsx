import React, { useState, useEffect, useRef } from 'react';
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
         Save, Edit, Filter, AlertCircle, Check, X } from 'lucide-react';
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
  const [showOnlyNonMatches, setShowOnlyNonMatches] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingImageId, setEditingImageId] = useState<number | null>(null);
  const [autoSaveAfterMatch, setAutoSaveAfterMatch] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch activities for dropdown selection
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest('/api/activities', { signal });
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
      refetchImages();
    }
  });
  
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
      const currentBatchMatchedFiles: AssociationRequest[] = [];
      
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
        title: 'Non-Matched Files',
        description: `Now showing only the ${nonMatchedIndices.length} files that need manual matching.`,
        duration: 5000,
      });
    }
    
    setIsMatching(false);
  };
  
  const handleActivityChange = (fileIndex: number, activityId: number) => {
    const matchedActivity = activities.find(a => a.id === activityId);
    
    setFiles(prev => prev.map((f, idx) => 
      idx === fileIndex ? { 
        ...f, 
        activityId,
        suggestedActivity: matchedActivity,
        status: 'matched' 
      } : f
    ));
  };
  
  const saveAssociations = async () => {
    const validAssociations = files
      .filter(f => f.status === 'matched' && f.activityId)
      .map(f => ({
        activityId: f.activityId!,
        filename: f.filename!,
        originalFilename: f.file.name,
        path: f.path!,
        mimeType: f.file.type
      }));
    
    if (validAssociations.length === 0) {
      toast({
        title: 'No associations to save',
        description: 'Please match files with activities first.'
      });
      return;
    }
    
    // Set a reasonable batch size for database operations
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(validAssociations.length / BATCH_SIZE);
    
    try {
      // Show processing toast
      toast({
        title: 'Processing',
        description: `Saving ${validAssociations.length} image associations...`
      });
      
      let savedCount = 0;
      
      // Process in batches
      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, validAssociations.length);
        const batch = validAssociations.slice(start, end);
        
        // Save this batch
        const result = await batchAssociateMutation.mutateAsync(batch);
        savedCount += result.results?.length || 0;
        
        // Small delay between batches
        if (i < totalBatches - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      // Show success message
      toast({
        title: 'Save Complete',
        description: `Successfully saved ${savedCount} image associations.`,
        duration: 5000,
      });
      
      // Clear processed files
      setFiles([]);
      
      // Update to the "manage" tab to see the results
      setActiveTab('manage');
      
    } catch (error) {
      console.error('Error saving associations:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save some associations. You can try again with smaller batches.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteImage = async (id: number) => {
    if (confirm('Are you sure you want to delete this image association?')) {
      await deleteImageMutation.mutateAsync(id);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Activity Image Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload & Match</TabsTrigger>
          <TabsTrigger value="manage">Manage Images</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
              <CardDescription>
                Upload image files and match them with activities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={isUploading || isMatching}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUploadFiles} 
                    disabled={files.length === 0 || isUploading || isMatching}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto-save"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={autoSaveAfterMatch}
                      onChange={(e) => setAutoSaveAfterMatch(e.target.checked)}
                    />
                    <label htmlFor="auto-save" className="flex items-center gap-1">
                      <Save className="h-4 w-4" />
                      Auto-save successful matches
                    </label>
                  </div>
                  
                  {files.some(f => f.status === 'failed') && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="show-non-matches"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={showOnlyNonMatches}
                        onChange={(e) => setShowOnlyNonMatches(e.target.checked)}
                      />
                      <label htmlFor="show-non-matches" className="flex items-center gap-1">
                        <Filter className="h-4 w-4" />
                        Show only non-matches
                      </label>
                    </div>
                  )}
                </div>
              </div>
              
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-center">{uploadProgress}% uploaded</p>
                </div>
              )}
              
              {files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">Files ({files.length})</h3>
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={matchFilesWithActivities}
                        disabled={files.some(f => f.status !== 'uploaded') || isMatching || isUploading}
                      >
                        {isMatching ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Matching...
                          </>
                        ) : (
                          'Match with Activities'
                        )}
                      </Button>
                      <Button 
                        onClick={saveAssociations}
                        disabled={files.every(f => f.status !== 'matched') || isMatching || isUploading}
                      >
                        Save Associations
                      </Button>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Suggested Match</TableHead>
                        <TableHead>Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="p-2">
                          <div className="flex items-center space-x-2 mb-2">
                            <Input
                              type="text"
                              placeholder="Search activities..."
                              className="flex-1"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              ref={searchInputRef}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSearchActive(!!searchQuery);
                                if (searchInputRef.current) searchInputRef.current.focus();
                              }}
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Search
                            </Button>
                            {searchActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSearchQuery('');
                                  setSearchActive(false);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {files
                        .filter(fileState => {
                          // Apply filters based on user settings
                          if (showOnlyNonMatches && fileState.status !== 'failed') {
                            return false;
                          }
                          return true;
                        })
                        .map((fileState, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{fileState.file.name}</TableCell>
                          <TableCell>
                            {fileState.loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : fileState.status === 'idle' ? (
                              'Ready to upload'
                            ) : fileState.status === 'uploaded' ? (
                              <span className="flex items-center">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                Uploaded
                              </span>
                            ) : fileState.status === 'matching' ? (
                              'Matching...'
                            ) : fileState.status === 'matched' ? (
                              <span className="flex items-center">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                Matched
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <XCircle className="h-4 w-4 text-red-500 mr-2" />
                                No match found
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {fileState.suggestedMatch === 'No match' ? (
                              <span className="text-red-500">No match found</span>
                            ) : fileState.suggestedMatch || '-'}
                          </TableCell>
                          <TableCell>
                            {fileState.status === 'uploaded' || fileState.status === 'matched' || fileState.status === 'failed' ? (
                              searchActive ? (
                                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-1">
                                  {activities
                                    .filter(activity => 
                                      activity.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map(activity => (
                                      <div 
                                        key={activity.id}
                                        className={`p-1 cursor-pointer hover:bg-gray-100 rounded ${
                                          fileState.activityId === activity.id ? 'bg-blue-100' : ''
                                        }`}
                                        onClick={() => handleActivityChange(index, activity.id)}
                                      >
                                        {activity.name}
                                      </div>
                                    ))
                                  }
                                  {activities.filter(activity => 
                                    activity.name.toLowerCase().includes(searchQuery.toLowerCase())
                                  ).length === 0 && (
                                    <div className="p-1 text-muted-foreground">No matching activities</div>
                                  )}
                                </div>
                              ) : (
                                <select
                                  className="w-full border border-gray-300 rounded-md p-1"
                                  value={fileState.activityId || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                      handleActivityChange(index, val);
                                    }
                                  }}
                                  disabled={isMatching}
                                >
                                  <option value="">Select an activity</option>
                                  {activities.length === 0 ? (
                                    <option disabled>Loading activities...</option>
                                  ) : (
                                    activities.map(activity => (
                                      <option key={activity.id} value={activity.id}>
                                        {activity.name}
                                      </option>
                                    ))
                                  )}
                                </select>
                              )
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {files.filter(f => !showOnlyNonMatches || f.status === 'failed').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            {showOnlyNonMatches ? 
                              'No non-matched files to display.' : 
                              'No files to display. Upload some files first.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Manage Activity Images</CardTitle>
              <CardDescription>
                View, edit, and manage all image associations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityImages.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No activity images found. Upload and associate images first.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        placeholder="Search filenames or activities..."
                        className="w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSearchQuery('')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Toggle bulk edit mode
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Bulk Edit
                      </Button>
                    </div>
                  </div>
                
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Original Filename</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityImages
                        .filter(image => {
                          if (!searchQuery) return true;
                          
                          const activity = activities.find(a => a.id === image.activityId);
                          const lowerQuery = searchQuery.toLowerCase();
                          
                          return (
                            image.originalFilename.toLowerCase().includes(lowerQuery) ||
                            (activity && activity.name.toLowerCase().includes(lowerQuery))
                          );
                        })
                        .map(image => {
                          const activity = activities.find(a => a.id === image.activityId);
                          return (
                            <TableRow key={image.id}>
                              <TableCell>
                                <div className="w-16 h-16 relative">
                                  <FileImage className="absolute inset-0 w-full h-full text-gray-300" />
                                  <img 
                                    src={`/uploads/${image.filename}`} 
                                    alt={image.originalFilename}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {image.originalFilename}
                              </TableCell>
                              <TableCell>
                                {editingImageId === image.id ? (
                                  <select
                                    className="w-full border border-gray-300 rounded-md p-1"
                                    value={image.activityId || ''}
                                    onChange={async (e) => {
                                      const activityId = parseInt(e.target.value);
                                      if (isNaN(activityId)) return;
                                      
                                      // Update association
                                      try {
                                        await associateImageMutation.mutateAsync({
                                          activityId,
                                          filename: image.filename,
                                          originalFilename: image.originalFilename,
                                          path: image.path,
                                          mimeType: image.mimeType
                                        });
                                        setEditingImageId(null);
                                      } catch (error) {
                                        console.error('Error updating image:', error);
                                        toast({
                                          title: 'Update Error',
                                          description: 'Failed to update image association.',
                                          variant: 'destructive',
                                        });
                                      }
                                    }}
                                  >
                                    <option value="">Select an activity</option>
                                    {activities.length === 0 ? (
                                      <option disabled>Loading activities...</option>
                                    ) : (
                                      activities.map(activity => (
                                        <option key={activity.id} value={activity.id}>
                                          {activity.name}
                                        </option>
                                      ))
                                    )}
                                  </select>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <span>{activity ? activity.name : 'Unknown activity'}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingImageId(image.id)}
                                      className="ml-2"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteImage(image.id)}
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                      {activityImages.filter(image => {
                        if (!searchQuery) return true;
                        
                        const activity = activities.find(a => a.id === image.activityId);
                        const lowerQuery = searchQuery.toLowerCase();
                        
                        return (
                          image.originalFilename.toLowerCase().includes(lowerQuery) ||
                          (activity && activity.name.toLowerCase().includes(lowerQuery))
                        );
                      }).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No matching images found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Bulk Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Edit Image Associations</DialogTitle>
                <DialogDescription>
                  Search for activities and update multiple image associations at once.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="search-activity">Search for an activity</label>
                  <Input
                    id="search-activity"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type to search activities..."
                  />
                </div>
                
                <div className="h-64 overflow-y-auto border rounded-md p-2">
                  {activities
                    .filter(activity => 
                      !searchQuery || activity.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(activity => (
                      <div
                        key={activity.id}
                        className="p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                        onClick={() => setSelectedActivity(activity)}
                      >
                        <div className="flex items-center">
                          {selectedActivity?.id === activity.id ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <div className="w-4 h-4 mr-2" />
                          )}
                          <span>{activity.name}</span>
                        </div>
                      </div>
                    ))
                  }
                  
                  {activities.filter(activity => 
                    !searchQuery || activity.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="p-2 text-muted-foreground">
                      No matching activities found
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedActivity) {
                      toast({
                        title: 'No Activity Selected',
                        description: 'Please select an activity first.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    // Apply the selected activity to all visible/filtered images
                    const imagesToUpdate = activityImages.filter(image => {
                      if (!searchQuery) return true;
                      
                      const activity = activities.find(a => a.id === image.activityId);
                      const lowerQuery = searchQuery.toLowerCase();
                      
                      return (
                        image.originalFilename.toLowerCase().includes(lowerQuery) ||
                        (activity && activity.name.toLowerCase().includes(lowerQuery))
                      );
                    });
                    
                    if (imagesToUpdate.length === 0) {
                      toast({
                        title: 'No Images to Update',
                        description: 'No images match your current filter.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    setIsSaving(true);
                    let successCount = 0;
                    
                    // Update each image one by one
                    for (const image of imagesToUpdate) {
                      try {
                        await associateImageMutation.mutateAsync({
                          activityId: selectedActivity.id,
                          filename: image.filename,
                          originalFilename: image.originalFilename,
                          path: image.path,
                          mimeType: image.mimeType
                        });
                        successCount++;
                      } catch (error) {
                        console.error('Error updating image:', error);
                      }
                    }
                    
                    // Refresh data
                    await refetchImages();
                    
                    setIsSaving(false);
                    setIsEditDialogOpen(false);
                    setSelectedActivity(null);
                    
                    toast({
                      title: 'Bulk Update Complete',
                      description: `Successfully updated ${successCount} of ${imagesToUpdate.length} images.`,
                    });
                  }}
                  disabled={!selectedActivity || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update All'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}