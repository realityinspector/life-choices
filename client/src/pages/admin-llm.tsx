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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatingImagesCount, setGeneratingImagesCount] = useState(5);
  
  // Effect to cleanup any dangling queries when component unmounts
  useEffect(() => {
    return () => {
      // Cancel any in-progress queries to prevent "signal aborted" errors
      queryClient.cancelQueries({ queryKey: ['/api/activities'] });
      queryClient.cancelQueries({ queryKey: ['/api/admin-llm/images'] });
      
      console.log('AdminLLM component unmounted - cleaned up pending queries');
    };
  }, [queryClient]);
  const [isUploading, setIsUploading] = useState(false);
  const [showBatchSettings, setShowBatchSettings] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  const [duplicatesInfo, setDuplicatesInfo] = useState<{
    newActivity: string;
    duplicates: Activity[];
    index?: number;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing activities to verify we don't create duplicates
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    queryFn: async ({ signal }) => {
      try {
        // Check if signal is already aborted before making the request
        if (signal?.aborted) {
          return [];
        }
        
        const res = await apiRequest('/api/activities', { signal });
        return res.json();
      } catch (error) {
        // Check if error is due to aborted signal
        if (error instanceof Error && error.name === 'AbortError') {
          return [];
        }
        console.error('Error fetching activities:', error);
        return [];
      }
    },
    // Add retry: false to prevent additional requests when a request fails
    retry: false,
    // Use staleTime to prevent unnecessary refetches
    staleTime: 30000 // 30 seconds
  });

  // Fetch existing activity images
  const { data: activityImages = [], refetch: refetchImages } = useQuery<ActivityImage[]>({
    queryKey: ['/api/admin-llm/images'],
    queryFn: async ({ signal }) => {
      try {
        // Check if signal is already aborted before making the request
        if (signal?.aborted) {
          return [];
        }
        
        const res = await apiRequest('/api/admin-llm/images', { signal });
        return res.json();
      } catch (error) {
        // Check if error is due to aborted signal
        if (error instanceof Error && error.name === 'AbortError') {
          return [];
        }
        console.error('Error fetching activity images:', error);
        return [];
      }
    },
    // Add retry: false to prevent additional requests when a request fails
    retry: false,
    // Use staleTime to prevent unnecessary refetches
    staleTime: 30000 // 30 seconds
  });

  // Upload files mutation
  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      // Chunk files into smaller batches to prevent timeouts and memory issues
      const CHUNK_SIZE = 50; // Upload 50 files at a time
      let allUploadedFiles: any[] = [];
      const totalFiles = filesToUpload.length;
      let processedFiles = 0;
      
      console.log(`Starting upload of ${totalFiles} files in chunks of ${CHUNK_SIZE}`);
      
      // Process files in chunks
      for (let i = 0; i < filesToUpload.length; i += CHUNK_SIZE) {
        const chunk = filesToUpload.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(filesToUpload.length / CHUNK_SIZE);
        
        console.log(`Uploading chunk ${chunkIndex} of ${totalChunks} (${chunk.length} files)`);
        
        const formData = new FormData();
        chunk.forEach(file => {
          formData.append('images', file);
        });
        
        try {
          // Using XMLHttpRequest for better progress tracking
          const response = await new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open('POST', '/api/admin-llm/upload', true);
            
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                // Calculate overall progress including previous chunks
                const chunkProgress = Math.round((e.loaded / e.total) * 100);
                const overallProgress = Math.min(
                  Math.round(((processedFiles + (chunk.length * chunkProgress / 100)) / totalFiles) * 100),
                  99 // Cap at 99% until everything is done
                );
                setUploadProgress(overallProgress);
              }
            };
            
            xhr.onload = function() {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response);
                } catch (e) {
                  reject(new Error('Invalid JSON response from server'));
                }
              } else {
                let errorMsg = `HTTP error: ${xhr.status}`;
                try {
                  const errorResponse = JSON.parse(xhr.responseText);
                  errorMsg = errorResponse.error || errorMsg;
                } catch (e) {
                  // Ignore parsing errors for error responses
                }
                reject(new Error(errorMsg));
              }
            };
            
            xhr.onerror = function() {
              reject(new Error('Network error during upload'));
            };
            
            xhr.send(formData);
          });
          
          // Track uploaded files from this chunk
          if (response.files && Array.isArray(response.files)) {
            allUploadedFiles = [...allUploadedFiles, ...response.files];
          }
          
          // Update processed count for progress calculation
          processedFiles += chunk.length;
          
          // Update progress based on completed chunks
          const overallProgress = Math.round((processedFiles / totalFiles) * 100);
          setUploadProgress(overallProgress);
          
          // Show progress toast for multi-chunk uploads
          if (totalChunks > 1) {
            toast({
              title: `Chunk ${chunkIndex} of ${totalChunks} Complete`,
              description: `Uploaded ${processedFiles}/${totalFiles} files (${overallProgress}%)`,
            });
          }
          
        } catch (error) {
          console.error(`Error uploading chunk ${chunkIndex}:`, error);
          throw error; // Re-throw to trigger onError handler
        }
      }
      
      return { files: allUploadedFiles };
    },
    onSuccess: (data: any) => {
      // Update files with upload info
      setFiles(prev => 
        prev.map(fileState => {
          const uploadedFile = data.files && Array.isArray(data.files) ? 
            data.files.find(
              (f: any) => f.originalFilename === fileState.file.name
            ) : null;
          
          if (uploadedFile && fileState.status === 'uploading') {
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
      
      const filesCount = data.files && Array.isArray(data.files) ? data.files.length : 0;
      
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${filesCount} files.`,
      });
      
      setIsUploading(false);
      setUploadProgress(100);
    },
    onError: (error) => {
      console.error('Error uploading files:', error);
      
      // Reset all uploading files back to idle
      setFiles(prev => 
        prev.map(f => 
          f.status === 'uploading' ? { ...f, status: 'idle', errorMessage: 'Upload failed' } : f
        )
      );
      
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
      
      setIsUploading(false);
      setUploadProgress(0);
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
      // Use cancellation-safe invalidation with refetchType: 'none' 
      // to prevent unnecessary refetches while processing batches
      queryClient.invalidateQueries({ 
        queryKey: ['/api/activities'],
        refetchType: 'none' 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin-llm/images'],
        refetchType: 'none' 
      });
    },
    // Use these retry settings to improve stability during batch operations
    retry: false,
    retryDelay: 1000
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
      // Use cancellation-safe invalidation with refetchType: 'none'
      // to prevent unnecessary refetches while processing batches
      queryClient.invalidateQueries({ 
        queryKey: ['/api/activities'],
        refetchType: 'none' 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin-llm/images'],
        refetchType: 'none' 
      });
    },
    // Use these retry settings to improve stability during batch operations
    retry: false,
    retryDelay: 1000
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
    
    // Set uploading status for all files being uploaded
    setFiles(prev => 
      prev.map(f => 
        f.status === 'idle' ? { ...f, status: 'uploading' } : f
      )
    );
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // The progress tracking is now handled in the XMLHttpRequest
      await uploadMutation.mutateAsync(filesToUpload);
      // Progress 100% will be set in the mutation's onSuccess handler
    } catch (error) {
      console.error("Upload error:", error);
      
      // Reset all uploading files back to idle state
      setFiles(prev => 
        prev.map(f => 
          f.status === 'uploading' ? { ...f, status: 'idle', errorMessage: 'Upload failed' } : f
        )
      );
      
      setUploadProgress(0);
      setIsUploading(false);
      
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown upload error',
        variant: 'destructive'
      });
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
    
    // Now we know file.activity exists and is not undefined
    const activity = {...file.activity} as ActivityInsert;
    
    try {
      // Check for potential duplicates before saving
      const potentialDuplicates = checkForDuplicates(activity.name);
      
      if (potentialDuplicates.length > 0) {
        // Show the duplicate dialog with the potential duplicates
        setDuplicatesInfo({
          newActivity: activity.name,
          duplicates: potentialDuplicates,
          index: index,
          onConfirm: async () => {
            // User confirmed to save despite duplicates
            setShowDuplicatesDialog(false);
            
            try {
              const imageData = {
                filename: file.filename!,
                originalFilename: file.originalFilename,
                path: file.path!,
                mimeType: file.mimeType!
              };
              
              await createActivityMutation.mutateAsync({
                activity: activity,
                imageData
              });
              
              // Remove the file from the list
              setFiles(prev => prev.filter((_, i) => i !== index));
              
              toast({
                title: 'Activity Saved',
                description: `Successfully saved activity "${activity.name}" with image.`,
              });
            } catch (error) {
              console.error(`Error saving activity at index ${index}:`, error);
              
              toast({
                title: 'Save Error',
                description: 'Failed to save activity with image.',
                variant: 'destructive',
              });
            }
          },
          onCancel: () => {
            // User cancelled the save operation
            setShowDuplicatesDialog(false);
            
            toast({
              title: 'Save Cancelled',
              description: 'Activity was not saved to avoid creating a duplicate.',
            });
          }
        });
        
        setShowDuplicatesDialog(true);
        return;
      }
      
      // No duplicates, proceed with save
      const imageData = {
        filename: file.filename,
        originalFilename: file.originalFilename,
        path: file.path,
        mimeType: file.mimeType
      };
      
      await createActivityMutation.mutateAsync({
        activity: activity,
        imageData
      });
      
      // Remove the file from the list
      setFiles(prev => prev.filter((_, i) => i !== index));
      
      toast({
        title: 'Activity Saved',
        description: `Successfully saved activity "${activity.name}" with image.`,
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
  const saveAll = async (skipDuplicates?: boolean) => {
    const skipDups = skipDuplicates === true;
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
      const savedSuccessfully: string[] = [];
      const savedErrors: string[] = [];
      const duplicatesSkipped: string[] = [];
      
      for (let i = 0; i < successfulFiles.length; i++) {
        const file = successfulFiles[i];
        try {
          if (file.activity) {
            // Create a copy of the activity to ensure TypeScript recognizes it as the correct type
            const activity = {...file.activity} as ActivityInsert;
            
            // Check for potential duplicates before saving (only if not skipping duplicates)
            if (!skipDups) {
              const potentialDuplicates = checkForDuplicates(activity.name);
              
              if (potentialDuplicates.length > 0) {
                console.log(`Potential duplicate found for "${activity.name}":`, potentialDuplicates);
                duplicatesSkipped.push(file.originalFilename);
                continue;
              }
            }
            
            const imageData = {
              filename: file.filename!,
              originalFilename: file.originalFilename,
              path: file.path!,
              mimeType: file.mimeType!
            };
            
            await createActivityMutation.mutateAsync({
              activity: activity,
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
        let description = '';
        
        if (savedSuccessfully.length > 0) {
          description += `${savedSuccessfully.length} activities saved successfully. `;
        }
        
        if (filesToProcess.length > 0) {
          description += `${filesToProcess.length} files were processed. `;
        }
        
        if (duplicatesSkipped.length > 0) {
          description += `${duplicatesSkipped.length} potential duplicates skipped. `;
        }
        
        if (savedErrors.length > 0) {
          description += `${savedErrors.length} failed to save.`;
        }
        
        toast({
          title: 'Save All Complete',
          description
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
    
    // If there are a lot of files to process, warn the user
    if (filesToProcess.length > 100) {
      toast({
        title: 'Processing Large Batch',
        description: `You're about to process ${filesToProcess.length} files. This may take some time.`,
      });
    }
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Chunk the files into more manageable batches for API calls
    const API_BATCH_SIZE = 20; // Smaller than the server batchSize for better parallelism
    const totalFiles = filesToProcess.length;
    let processedCount = 0;
    
    try {
      // Update status to processing for all files
      setFiles(prev => 
        prev.map(f => 
          f.status === 'uploaded' ? { ...f, status: 'processing' } : f
        )
      );
      
      // Process in multiple API batches for better handling of large numbers
      for (let i = 0; i < totalFiles; i += API_BATCH_SIZE) {
        const chunk = filesToProcess.slice(i, i + API_BATCH_SIZE);
        const chunkImages = chunk.map(f => ({
          filename: f.filename,
          originalFilename: f.originalFilename,
          path: f.path,
          mimeType: f.mimeType
        }));
        
        // Show which batch is being processed
        const batchIndex = Math.floor(i / API_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalFiles / API_BATCH_SIZE);
        
        if (totalBatches > 1) {
          toast({
            title: `Processing Batch ${batchIndex} of ${totalBatches}`,
            description: `Processing ${chunkImages.length} files...`,
          });
        }
        
        // Send this batch to the API
        const result = await batchProcessMutation.mutateAsync({
          images: chunkImages,
          batchSize
        });
        
        // Update files based on results
        if (result && result.results) {
          // Get current processed count before this batch
          processedCount += chunk.length;
          
          // Update progress
          const currentProgress = Math.round((processedCount / totalFiles) * 100);
          setProcessingProgress(Math.min(currentProgress, 99)); // Cap at 99% until everything is done
          
          // Update files with results for this batch
          handleBatchResults(result, chunk as FileUploadState[]);
        }
      }
      
      toast({
        title: 'Batch Processing Complete',
        description: `Successfully processed ${totalFiles} files.`,
      });
      
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
  // Handle batch processing results more safely
  const handleBatchResults = (result: any, currentChunk?: FileUploadState[]) => {
    if (!result || !result.results || !Array.isArray(result.results)) {
      console.warn("Received invalid batch results:", result);
      return;
    }
    
    // Process result in a more controlled way to avoid state update issues
    try {
      // Use a timeout to allow any pending state updates to complete
      setTimeout(() => {
        // Update file states based on batch results
        setFiles(prev => {
          const updatedFiles = [...prev];
          let updateCount = 0;
          
          result.results.forEach((res: ActivityResponse) => {
            if (!res || !res.originalFilename) {
              return; // Skip invalid results
            }
            
            // First try to find a match in the current chunk (if provided) for better performance
            let fileIndex = -1;
            
            if (currentChunk) {
              // Find the index in the currentChunk first for efficiency
              const chunkIndex = currentChunk.findIndex(f => 
                f.originalFilename === res.originalFilename
              );
              
              if (chunkIndex !== -1) {
                // Get the corresponding index in the overall files array
                fileIndex = updatedFiles.findIndex(f => 
                  f.originalFilename === currentChunk[chunkIndex].originalFilename
                );
              }
            }
            
            // If not found in chunk (or no chunk provided), do a full search
            if (fileIndex === -1) {
              fileIndex = updatedFiles.findIndex(f => 
                f.originalFilename === res.originalFilename
              );
            }
            
            if (fileIndex !== -1) {
              updateCount++;
              
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
          
          console.log(`Updated ${updateCount} files with batch results`);
          return updatedFiles;
        });
        
        // Only show the completion toast when not processing multiple chunks
        if (!currentChunk) {
          const successCount = result.results.filter((r: any) => r.status === 'success').length;
          toast({
            title: 'Batch Processing Complete',
            description: `Processed ${result.results.length} images. ${successCount} successful.`,
          });
        }
      }, 0);
    } catch (error) {
      console.error("Error handling batch results:", error);
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
  
  // Check if an activity might be a duplicate based on name similarity
  const checkForDuplicates = (name: string): Activity[] => {
    // Filter existing activities to find potential duplicates
    // We use lowercase comparison for more accurate matching
    const nameLower = name.toLowerCase().trim();
    return activities.filter(activity => {
      const activityNameLower = activity.name.toLowerCase().trim();
      
      // Exact match
      if (activityNameLower === nameLower) return true;
      
      // Check for high similarity (e.g., one is contained in the other)
      if (activityNameLower.includes(nameLower) || nameLower.includes(activityNameLower)) return true;
      
      // Check for high similarity using Levenshtein distance (only for short names)
      // This helps catch typos and minor variations
      if (nameLower.length < 20 && activityNameLower.length < 20) {
        // Simple similarity check - if names are very close
        const nameWords = nameLower.split(' ');
        const activityNameWords = activityNameLower.split(' ');
        const commonWords = nameWords.filter(word => activityNameWords.includes(word));
        if (commonWords.length > 0 && commonWords.length >= Math.min(nameWords.length, activityNameWords.length) * 0.7) {
          return true;
        }
      }
      
      return false;
    });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Activity Generation with AI</h1>
      
      {/* Duplicate detection dialog */}
      <Dialog open={showDuplicatesDialog} onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Potential Duplicate Activity</DialogTitle>
            <DialogDescription>
              We found existing activities that are similar to the one you're trying to save.
            </DialogDescription>
          </DialogHeader>
          
          {duplicatesInfo && (
            <div className="py-4 space-y-4">
              <div>
                <h3 className="font-medium">New Activity:</h3>
                <p className="text-sm p-2 bg-gray-100 rounded">{duplicatesInfo.newActivity}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Similar Existing Activities:</h3>
                <ul className="mt-2 space-y-2">
                  {duplicatesInfo.duplicates.map((activity, idx) => (
                    <li key={idx} className="text-sm p-2 bg-gray-100 rounded">
                      {activity.name} <span className="text-xs text-gray-500">({activity.category})</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Alert className="bg-yellow-50">
                <Info className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Creating duplicate activities may lead to redundant entries in your activity list.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => duplicatesInfo?.onCancel()}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => duplicatesInfo?.onConfirm()}
            >
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                          onClick={() => saveAll()} 
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
                          onClick={() => {
                            const skipDuplicatesOption = true;
                            saveAll(skipDuplicatesOption);
                          }} 
                          disabled={isProcessing || files.length === 0 || !files.some(f => f.status === 'success')}
                          variant="default"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing All
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save All - Skip Duplicates
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
                                  onClick={() => saveAll()}
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
                            backgroundImage: `url(/uploads/${image.path.split('/').pop()})` 
                          }}
                          onClick={() => setSelectedImage(`/uploads/${image.path.split('/').pop()}`)}
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