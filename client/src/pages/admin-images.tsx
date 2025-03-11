import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Activity, ActivityImage } from '@shared/schema';
import { Loader2, CheckCircle2, XCircle, Unlink, FileImage, Upload } from 'lucide-react';

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
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMatching, setIsMatching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('upload');
  
  // Fetch activities for dropdown selection
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
      const res = await apiRequest('/api/admin/suggest-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      
      return res.json();
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
                      {files.map((fileState, index) => (
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
                              <select
                                className="w-full border border-gray-300 rounded-md p-1"
                                value={fileState.activityId || ''}
                                onChange={(e) => handleActivityChange(index, parseInt(e.target.value))}
                                disabled={isMatching}
                              >
                                <option value="">Select an activity</option>
                                {activities.map(activity => (
                                  <option key={activity.id} value={activity.id}>
                                    {activity.name}
                                  </option>
                                ))}
                              </select>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
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
                View and manage existing image associations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityImages.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No activity images found. Upload and associate images first.
                </p>
              ) : (
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
                    {activityImages.map(image => {
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
                            {activity ? activity.name : 'Unknown activity'}
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
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}