import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, DownloadCloud, UploadCloud, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function AdminBackupPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const { toast } = useToast();
  
  // Query for backup history, if any is available
  const { data: backupHistory = [], isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: ['/api/admin-backup/backup-history'],
    queryFn: async () => {
      try {
        const result = await apiRequest('/api/admin-backup/backup-history') as any;
        return Array.isArray(result?.history) ? result.history : [];
      } catch (error) {
        console.error('Error fetching backup history:', error);
        return [];
      }
    }
  });
  
  // Handle file selection for restore
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setRestoreError(null);
      setRestoreSuccess(false);
    }
  };
  
  // Create and download a backup
  const handleBackup = async () => {
    try {
      setBackupInProgress(true);
      
      // Use window.open to trigger a file download
      window.open('/api/admin-backup/backup', '_blank');
      
      // Show success toast after short delay
      setTimeout(() => {
        toast({
          title: "Backup Created",
          description: "Your backup file is being downloaded.",
          variant: "default",
        });
        setBackupInProgress(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Backup Failed",
        description: "There was an error creating the backup.",
        variant: "destructive",
      });
      setBackupInProgress(false);
    }
  };
  
  // Upload and restore from a backup file
  const handleRestore = async () => {
    if (!selectedFile) {
      setRestoreError('Please select a backup file first');
      return;
    }
    
    try {
      setRestoreInProgress(true);
      setRestoreError(null);
      setRestoreSuccess(false);
      
      const formData = new FormData();
      formData.append('backupFile', selectedFile);
      
      const response = await fetch('/api/admin-backup/restore', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore backup');
      }
      
      setRestoreSuccess(true);
      toast({
        title: "Restore Successful",
        description: "Your backup has been restored successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      setRestoreError(error instanceof Error ? error.message : 'Failed to restore backup');
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : 'There was an error restoring the backup.',
        variant: "destructive", 
      });
    } finally {
      setRestoreInProgress(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Database Backup & Restore</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Dashboard
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="restore">Restore</TabsTrigger>
        </TabsList>
        
        {/* Backup Tab */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Create Database Backup</CardTitle>
              <CardDescription>
                Create a full backup of the database and all uploaded images. The backup will be downloaded as a .tar.gz file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Creating a backup will download a file containing all database records and uploaded images. 
                  Keep this file secure as it contains user data.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleBackup} 
                disabled={backupInProgress}
                className="w-full"
              >
                {backupInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Create & Download Backup
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {isLoadingHistory ? (
            <div className="flex justify-center items-center mt-6 p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : backupHistory && backupHistory.length > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>
                  Previously created backups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {backupHistory.map((backup: any, index: number) => (
                    <li key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{backup.filename}</p>
                        <p className="text-sm text-gray-500">{new Date(backup.createdAt).toLocaleString()}</p>
                      </div>
                      <Button variant="outline" onClick={() => window.open(`/api/admin-backup/download/${backup.id}`, '_blank')}>
                        <DownloadCloud className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500">
                  Backups are not stored on the server. When you create a backup, it is immediately downloaded to your device.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Restore Tab */}
        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <CardTitle>Restore from Backup</CardTitle>
              <CardDescription>
                Restore the database and uploaded images from a previous backup file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Restoring from a backup will replace ALL existing data. This action cannot be undone.
                </AlertDescription>
              </Alert>
              
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Input
                    id="backup-file"
                    type="file"
                    accept=".tar.gz"
                    onChange={handleFileChange}
                    disabled={restoreInProgress}
                  />
                  <p className="text-sm text-gray-500">
                    Select the .tar.gz backup file you want to restore from
                  </p>
                </div>
              </div>
              
              {restoreError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{restoreError}</AlertDescription>
                </Alert>
              )}
              
              {restoreSuccess && (
                <Alert className="mt-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Backup has been successfully restored!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleRestore} 
                disabled={!selectedFile || restoreInProgress}
                variant="destructive"
                className="w-full"
              >
                {restoreInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Restore from Backup
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}