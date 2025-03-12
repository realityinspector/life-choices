import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Activity, ActivityImage, ActivityInsert } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Info, CheckCircle, XCircle, Loader2, UploadCloud, Trash, Database, RefreshCw, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileUploadState {
  file: File;
  originalFilename: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'processing' | 'success' | 'failed';
  activity?: ActivityInsert;
  errorMessage?: string;
  filename?: string;
  path?: string;
  mimeType?: string;
}

interface ActivityResponse {
  originalFilename: string;
  status: 'success' | 'failed';
  activity?: ActivityInsert;
  error?: string;
}

export default function AdminLLMPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showBatchSettings, setShowBatchSettings] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing activities to verify we don't create duplicates
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
    queryKey: ['/api/admin-llm/images'],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest('/api/admin-llm/images', { signal });
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
      
      const res = await apiRequest('/api/admin-llm/upload', {
        method: 'POST',
        body: formData,
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
      setUploadProgress(100);
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

  // Generate activity mutation
  const generateActivityMutation = useMutation({
    mutationFn: async (params: { filename: string, originalFilename: string }) => {
      const res = await apiRequest('/api/admin-llm/generate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      return res.json();
    }
  });

  // Create activity with image mutation
  const createActivityMutation = useMutation({
    mutationFn: async (params: { activity: ActivityInsert, imageData: any }) => {
      const res = await apiRequest('/api/admin-llm/create-activity-with-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-llm/images'] });
    }
  });

  // Batch process mutation
  const batchProcessMutation = useMutation({
    mutationFn: async (params: { images: any[], batchSize: number }) => {
      const res = await apiRequest('/api/admin-llm/batch-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-llm/images'] });
    }
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        originalFilename: file.name,
        status: 'idle' as const
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (files.length === 0 || files.every(f => f.status !== 'idle')) {
      toast({
        title: 'No files to upload',
        description: 'Please select files to upload first.',
      });
      return;
    }
    
    const filesToUpload = files
      .filter(f => f.status === 'idle')
      .map(f => f.file);
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const uploadProgressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 300);
    
    try {
      await uploadMutation.mutateAsync(filesToUpload);
      clearInterval(uploadProgressInterval);
      setUploadProgress(100);
    } catch (error) {
      clearInterval(uploadProgressInterval);
      setUploadProgress(0);
    }
  };

  // Process a single file to generate activity
  const processFile = async (index: number) => {
    const file = files[index];
    if (!file.filename || !file.originalFilename) {
      toast({
        title: 'Processing Error',
        description: 'File must be uploaded first.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Update status to processing
      setFiles(prev => 
        prev.map((f, i) => 
          i === index ? { ...f, status: 'processing' } : f
        )
      );
      
      // Generate activity data using LLM
      const result = await generateActivityMutation.mutateAsync({
        filename: file.filename,
        originalFilename: file.originalFilename
      });
      
      if (result.activity) {
        // Update file with activity data
        setFiles(prev => 
          prev.map((f, i) => 
            i === index ? { 
              ...f, 
              status: 'success',
              activity: result.activity
            } : f
          )
        );
        
        toast({
          title: 'Activity Generated',
          description: `Successfully generated activity data for "${file.originalFilename}"`,
        });
      } else {
        setFiles(prev => 
          prev.map((f, i) => 
            i === index ? { 
              ...f, 
              status: 'failed',
              errorMessage: 'Failed to generate activity data.'
            } : f
          )
        );
        
        toast({
          title: 'Generation Failed',
          description: `Unable to generate activity for "${file.originalFilename}"`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`Error processing file at index ${index}:`, error);
      
      setFiles(prev => 
        prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'failed',
            errorMessage: 'An error occurred during processing.'
          } : f
        )
      );
      
      toast({
        title: 'Processing Error',
        description: `Error processing "${file.originalFilename}"`,
        variant: 'destructive',
      });
    }
  };

  // Save a generated activity
  const saveActivity = async (index: number) => {
    const file = files[index];
    if (!file.activity || !file.filename || !file.originalFilename || !file.path || !file.mimeType) {
      toast({
        title: 'Save Error',
        description: 'Missing required activity or image data.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const imageData = {
        filename: file.filename,
        originalFilename: file.originalFilename,
        path: file.path,
        mimeType: file.mimeType
      };
      
      await createActivityMutation.mutateAsync({
        activity: file.activity,
        imageData
      });
      
      // Remove the file from the list
      setFiles(prev => prev.filter((_, i) => i !== index));
      
      toast({
        title: 'Activity Saved',
        description: `Successfully saved activity "${file.activity.name}" with image.`,
      });
    } catch (error) {
      console.error(`Error saving activity at index ${index}:`, error);
      
      toast({
        title: 'Save Error',
        description: 'Failed to save activity with image.',
        variant: 'destructive',
      });
    }
  };

  // Process and save all files
  const saveAll = async () => {
    // First handle the files that are already successfully processed
    const successfulFiles = files.filter(f => 
      f.status === 'success' && f.activity && 
      f.filename && f.originalFilename && f.path && f.mimeType
    );
    
    // Then get files that need processing
    const filesToProcess = files.filter(f => 
      (f.status === 'uploaded' || f.status === 'failed') && 
      f.filename && f.originalFilename && f.path && f.mimeType
    );
    
    if (successfulFiles.length === 0 && filesToProcess.length === 0) {
      toast({
        title: 'No Files to Process or Save',
        description: 'Please upload files first.',
      });
      return;
    }
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const totalFiles = successfulFiles.length + filesToProcess.length;
    const progressStep = 100 / totalFiles;
    let currentProgress = 0;
    
    try {
      // 1. First save all successful files
      const savedSuccessfully = [];
      const savedErrors = [];
      
      for (let i = 0; i < successfulFiles.length; i++) {
        const file = successfulFiles[i];
        try {
          if (file.activity) {
            const imageData = {
              filename: file.filename,
              originalFilename: file.originalFilename,
              path: file.path,
              mimeType: file.mimeType
            };
            
            await createActivityMutation.mutateAsync({
              activity: file.activity,
              imageData
            });
            
            savedSuccessfully.push(file.originalFilename);
          }
        } catch (error) {
          console.error(`Error saving activity for ${file.originalFilename}:`, error);
          savedErrors.push(file.originalFilename);
        }
        
        // Update progress
        currentProgress += progressStep;
        setProcessingProgress(Math.min(currentProgress, 90)); // Cap at 90% until fully complete
      }
      
      // Remove successfully saved files
      setFiles(prev => prev.filter(f => !savedSuccessfully.includes(f.originalFilename)));
      
      // 2. Process files that need processing
      if (filesToProcess.length > 0) {
        // Prepare image data for batch processing
        const images = filesToProcess.map(f => ({
          filename: f.filename,
          originalFilename: f.originalFilename,
          path: f.path,
          mimeType: f.mimeType
        }));
        
        // Update status to processing for these files
        setFiles(prev => 
          prev.map(f => 
            (f.status === 'uploaded' || f.status === 'failed') && 
            images.some(img => img.originalFilename === f.originalFilename) ? 
            { ...f, status: 'processing' } : f
          )
        );
    
        // Process in batches
        const result = await batchProcessMutation.mutateAsync({
          images,
          batchSize
        });
        
        // Update files with results
        handleBatchResults(result);
      }
      
      // Show toast with summary
      if (savedSuccessfully.length > 0 || filesToProcess.length > 0) {
        toast({
          title: 'Save All Complete',
          description: 
            `${savedSuccessfully.length} activities saved successfully. ` +
            `${filesToProcess.length} files were processed. ` +
            (savedErrors.length > 0 ? `${savedErrors.length} failed to save.` : ''),
        });
      }
    } catch (error) {
      console.error("Error in Save All operation:", error);
      toast({
        title: 'Save All Error',
        description: 'An error occurred during the Save All operation.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(100);
    }
  };

  // Process only uploaded files in batch
  const processBatch = async () => {
    const filesToProcess = files.filter(f => f.status === 'uploaded' && f.filename && f.originalFilename && f.path && f.mimeType);
    
    if (filesToProcess.length === 0) {
      toast({
        title: 'No Files to Process',
        description: 'Please upload files first.',
      });
      return;
    }
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const progressStep = 100 / filesToProcess.length;
    
    try {
      // Prepare image data for batch processing
      const images = filesToProcess.map(f => ({
        filename: f.filename,
        originalFilename: f.originalFilename,
        path: f.path,
        mimeType: f.mimeType
      }));
      
      // Update status to processing for all files
      setFiles(prev => 
        prev.map(f => 
          f.status === 'uploaded' ? { ...f, status: 'processing' } : f
        )
      );
      
      // Process in batches
      const result = await batchProcessMutation.mutateAsync({
        images,
        batchSize
      });
      
      // Update files with results
      handleBatchResults(result);
    } catch (error) {
      handleBatchError(error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(100);
    }
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle batch processing results
  const handleBatchResults = (result: any) => {
    if (result.results && Array.isArray(result.results)) {
      setFiles(prev => {
        const updatedFiles = [...prev];
        
        result.results.forEach((res: ActivityResponse) => {
          const fileIndex = updatedFiles.findIndex(f => 
            f.originalFilename === res.originalFilename && f.status === 'processing'
          );
          
          if (fileIndex !== -1) {
            if (res.status === 'success' && res.activity) {
              updatedFiles[fileIndex] = {
                ...updatedFiles[fileIndex],
                status: 'success',
                activity: res.activity
              };
            } else {
              updatedFiles[fileIndex] = {
                ...updatedFiles[fileIndex],
                status: 'failed',
                errorMessage: res.error || 'Processing failed'
              };
            }
          }
        });
        
        return updatedFiles;
      });
      
      toast({
        title: 'Batch Processing Complete',
        description: `Processed ${result.results.length} images. ${result.results.filter((r: any) => r.status === 'success').length} successful.`,
      });
    }
  };
  
  // Handle batch processing errors
  const handleBatchError = (error: any) => {
    console.error('Error in batch processing:', error);
    
    // Mark all processing files as failed
    setFiles(prev => 
      prev.map(f => 
        f.status === 'processing' ? { 
          ...f, 
          status: 'failed',
          errorMessage: 'Batch processing failed.'
        } : f
      )
    );
    
    toast({
      title: 'Batch Processing Error',
      description: 'An error occurred during batch processing.',
      variant: 'destructive',
    });
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle details view for an activity
  const toggleDetails = (originalFilename: string) => {
    setShowDetails(prev => ({
      ...prev,
      [originalFilename]: !prev[originalFilename]
    }));
  };

  // Format frequency as human readable
  const formatFrequency = (frequency: number, unit: string) => {
    if (frequency === 1) {
      return `Once per ${unit}`;
    }
    return `${frequency} times per ${unit}`;
  };

  // Format duration as human readable
  const formatDuration = (duration: number, unit: string) => {
    if (duration === 1) {
      return `1 ${unit}`;
    }
    return `${duration} ${unit}s`;
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Activity Generation with AI</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload & Generate</TabsTrigger>
          <TabsTrigger value="existing">Existing Images</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Activities from Images</CardTitle>
              <CardDescription>
                Upload image files and use AI to generate activity details based on their filenames.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleFileChange}
                    disabled={isUploading || isProcessing}
                    className="flex-1"
                  />
                  
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading || files.every(f => f.status !== 'idle')}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={clearFiles}
                    disabled={isUploading || isProcessing || files.length === 0}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                
                {isUploading && (
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Upload Progress</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                
                {isProcessing && (
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Processing Progress</span>
                      <span>{Math.round(processingProgress)}%</span>
                    </div>
                    <Progress value={processingProgress} />
                  </div>
                )}
                
                {files.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={() => setShowBatchSettings(!showBatchSettings)}
                          variant="outline"
                          size="sm"
                        >
                          <span className="mr-2">Batch Settings</span>
                          {showBatchSettings ? '▼' : '▶'}
                        </Button>
                        
                        <span className="text-sm text-muted-foreground">
                          Current batch size: {batchSize} images per request
                        </span>
                      </div>
                      
                      <div className="flex space-x-2 ml-auto">
                        <Button 
                          onClick={saveAll} 
                          disabled={isProcessing || files.length === 0 || !files.some(f => f.status === 'success')}
                          variant="secondary"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing All
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save All
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          onClick={processBatch} 
                          disabled={isProcessing || !files.some(f => f.status === 'uploaded')}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing Batch
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" />
                              Process Uploaded
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {showBatchSettings && (
                      <div className="p-4 border rounded-md bg-slate-50">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="batch-size" className="block mb-2">Batch Size (images per API call)</Label>
                            <div className="flex items-center space-x-4">
                              <Input
                                id="batch-size"
                                type="number"
                                min="1"
                                max="10"
                                value={batchSize}
                                onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                                className="w-24"
                              />
                              <div className="text-sm text-muted-foreground">
                                <p>Recommended: 1-10 images per batch</p>
                                <p>Higher values are more efficient but may be less reliable</p>
                              </div>
                            </div>
                          </div>
                          
                          <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Batch Processing</AlertTitle>
                            <AlertDescription>
                              Processing in batches sends multiple images to the AI in a single call,
                              which is more efficient but may produce less accurate results for complex filenames.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {files.length > 0 && (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filename</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead className="text-right">
                            <div className="flex justify-between items-center">
                              <span>Actions</span>
                              {files.some(f => f.status === 'success') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={saveAll}
                                  disabled={isProcessing}
                                  className="ml-auto"
                                >
                                  <Save className="mr-2 h-3 w-3" />
                                  Save All
                                </Button>
                              )}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((file, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {file.originalFilename}
                            </TableCell>
                            <TableCell>
                              {file.status === 'idle' && <Badge>Ready to upload</Badge>}
                              {file.status === 'uploading' && <Badge className="bg-blue-500">Uploading</Badge>}
                              {file.status === 'uploaded' && <Badge className="bg-yellow-500">Ready for processing</Badge>}
                              {file.status === 'processing' && (
                                <Badge className="bg-blue-500">
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Processing
                                </Badge>
                              )}
                              {file.status === 'success' && <Badge className="bg-green-600">Success</Badge>}
                              {file.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                            </TableCell>
                            <TableCell>
                              {file.status === 'success' && file.activity ? (
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span>{file.activity.name}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5" 
                                      onClick={() => toggleDetails(file.originalFilename)}
                                    >
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  {showDetails[file.originalFilename] && (
                                    <div className="mt-2 text-sm text-gray-500 space-y-1">
                                      <div><strong>Category:</strong> {file.activity.category}</div>
                                      <div><strong>Frequency:</strong> {formatFrequency(file.activity.frequency, file.activity.frequencyUnit)}</div>
                                      <div><strong>Duration:</strong> {formatDuration(file.activity.duration, file.activity.durationUnit)}</div>
                                      <div><strong>Life Impact:</strong> {file.activity.lifeImpact}</div>
                                      {file.activity.emoji && <div><strong>Emoji:</strong> {file.activity.emoji}</div>}
                                    </div>
                                  )}
                                </div>
                              ) : file.status === 'failed' ? (
                                <span className="text-red-500">{file.errorMessage || 'Error'}</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {file.status === 'uploaded' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => processFile(index)}
                                    disabled={isProcessing}
                                  >
                                    <RefreshCw className="mr-2 h-3 w-3" />
                                    Process
                                  </Button>
                                )}
                                
                                {file.status === 'success' && (
                                  <Button 
                                    size="sm" 
                                    variant="default" 
                                    onClick={() => saveActivity(index)}
                                  >
                                    <CheckCircle className="mr-2 h-3 w-3" />
                                    Save
                                  </Button>
                                )}
                                
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => removeFile(index)}
                                  disabled={isUploading && file.status === 'uploading'}
                                >
                                  <Trash className="mr-2 h-3 w-3" />
                                  Remove
                                </Button>
                              </div>
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
        
        <TabsContent value="existing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Existing Activity Images</CardTitle>
              <CardDescription>
                View and manage images associated with activities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activityImages.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div 
                          className="aspect-video bg-cover bg-center cursor-pointer"
                          style={{ 
                            backgroundImage: `url(${image.path.replace('/home/runner/workspace', '')})` 
                          }}
                          onClick={() => setSelectedImage(image.path.replace('/home/runner/workspace', ''))}
                        />
                      </CardContent>
                      <CardFooter className="p-2 flex flex-col items-start">
                        <div className="text-sm font-medium truncate w-full">
                          {image.originalFilename}
                        </div>
                        <div className="text-xs text-gray-500">
                          Activity ID: {image.activityId}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No activity images found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Image preview dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img 
                src={selectedImage} 
                alt="Activity preview" 
                className="max-h-[70vh] object-contain"
              />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedImage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}