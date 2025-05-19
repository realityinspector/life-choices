import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportResult {
  activityName: string;
  status: 'success' | 'failed';
  error?: string;
  activity?: any;
}

export default function AdminCSVImportPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);

  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);

      const res = await apiRequest('/api/admin-llm/import-csv', {
        method: 'POST',
        body: formData,
      });

      return res.json();
    },
    onSuccess: (data) => {
      setResults(data.results);
      toast({
        title: 'Import Complete',
        description: `Successfully processed ${data.results.filter(r => r.status === 'success').length}/${data.results.length} activities.`,
      });
      setProgress(100);
    },
    onError: (error) => {
      console.error('Error importing CSV:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import activities from CSV file.',
        variant: 'destructive',
      });
      setProgress(0);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setProgress(0);
      setResults([]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import.',
        variant: 'destructive',
      });
      return;
    }

    setProgress(10); // Start progress
    importMutation.mutate(file);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Import Activities from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file with activity_name and activity_description columns to create new activities with AI-generated images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="csv">CSV File</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            {progress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {results.length > 0 && (
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded ${
                        result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="font-medium">{result.activityName}</div>
                      <div className="text-sm">
                        {result.status === 'success' ? (
                          <span className="text-green-600">Successfully created</span>
                        ) : (
                          <span className="text-red-600">{result.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleImport}
            disabled={!file || importMutation.isPending}
            className="w-full"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import Activities
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 