import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Loader2, Check, X, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImageGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: number;
  activityName: string;
  currentImageUrl: string | null;
  description?: string;
  category?: string;
  instructions?: string;
  ingredients?: string[];
  onImageGenerated: (newImageUrl: string) => void;
}

export function ImageGeneratorModal({
  open,
  onOpenChange,
  activityId,
  activityName,
  currentImageUrl,
  onImageGenerated
}: ImageGeneratorModalProps) {
  const [prompt, setPrompt] = useState(`${activityName}`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter an image prompt",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/admin/generate-activity-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          customPrompt: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`);
      }

      const data = await response.json();
      setGeneratedImageUrl(data.fullUrl);
      
      toast({
        title: "Success",
        description: "Image generated successfully"
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = () => {
    if (generatedImageUrl) {
      onImageGenerated(generatedImageUrl);
      toast({
        title: "Success",
        description: "New image applied to activity"
      });
      handleClose();
    }
  };

  const handleRetry = () => {
    setGeneratedImageUrl(null);
  };

  const handleClose = () => {
    setGeneratedImageUrl(null);
    setPrompt(`${activityName}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Image for "{activityName}"</DialogTitle>
          <DialogDescription>
            Enter a prompt to generate a new image for this activity
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            {currentImageUrl && (
              <div>
                <Label>Current Image</Label>
                <div className="h-[200px] w-full mt-2 bg-muted rounded-md overflow-hidden">
                  <img 
                    src={currentImageUrl} 
                    alt="Current" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            {!generatedImageUrl ? (
              <div>
                <Label htmlFor="prompt">Image Prompt</Label>
                <Input
                  id="prompt"
                  placeholder="Enter a detailed image prompt..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Be specific about style, setting, lighting, and mood for best results.
                </p>
              </div>
            ) : (
              <div>
                <Label>Generated Image</Label>
                <div className="h-[200px] w-full mt-2 bg-muted rounded-md overflow-hidden">
                  <img 
                    src={generatedImageUrl} 
                    alt="Generated" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {!generatedImageUrl ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button variant="outline" onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={handleApprove}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 