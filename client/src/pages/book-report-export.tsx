import { useBook } from "@/context/book-context";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Download, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

type PDFConfig = {
  orientation: "portrait" | "landscape";
  format: "letter" | "phone";
  backgroundColor: string;
  fontName: string;
  fontSize: number;
  imageMode: "blackAndWhite" | "color";
  logoCorner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  imageSize: "small" | "medium" | "large";
  logoSize: "small" | "medium" | "large";
  logoAsWatermark: boolean;
  textColor: string;
  // Ingredient display options
  showIngredients: boolean;
  ingredientFontSize: number;
  ingredientPlacement: "belowTitle" | "belowImage" | "bottomOfPage";
  ingredientPillStyle: "rounded" | "square" | "outlined";
  ingredientTextColor: string;
  ingredientBgColor: string;
  // Instructions display options
  showInstructions: boolean;
  instructionsFontSize: number;
  instructionsPlacement: "afterIngredients" | "belowImage" | "bottomOfPage";
  // Advanced styling options
  primaryColor: string;
  secondaryColor: string; 
  accentColor: string;
  surfaceColor: string;
  adaptiveTextSizing: boolean;
  showPageNumbers: boolean;
  contentDensity: "compact" | "normal" | "spacious";
  instructionMaxLines: number | null;
  headerBarSize: "small" | "medium" | "large";
  imageFrameStyle: "shadow" | "border" | "none";
  listStyle: "numbers" | "bullets" | "none";
};

const FONT_OPTIONS = ["helvetica", "courier", "times", "symbol", "zapfdingbats", "arial"];

export default function BookReportExportPage() {
  const [, navigate] = useLocation();
  const { userData } = useUser();
  const { currentBook, bookActivities } = useBook();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: activitiesWithImages = [] } = useQuery({
    queryKey: ['/api/activities/shop/with-images'],
    queryFn: async ({ signal }) => {
      const res = await apiRequest('/api/activities/shop/with-images', { signal });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Process the received data to ensure recipes have proper ingredient arrays
      return data.map((activity: any) => {
        if (activity.recipes && activity.recipes.length > 0) {
          activity.recipes = activity.recipes.map((recipe: any) => {
            // Make sure ingredients is an array
            if (typeof recipe.ingredients === 'string') {
              try {
                const parsed = JSON.parse(recipe.ingredients);
                recipe.ingredients = Array.isArray(parsed) ? parsed : [recipe.ingredients];
              } catch (e) {
                recipe.ingredients = [recipe.ingredients];
              }
            } else if (!Array.isArray(recipe.ingredients)) {
              recipe.ingredients = recipe.ingredients ? [recipe.ingredients] : [];
            }
            return recipe;
          });
        }
        return activity;
      });
    },
    enabled: !!currentBook
  });

  const [config, setConfig] = useState<PDFConfig>({
    orientation: "portrait",
    format: "letter",
    backgroundColor: "#000000",
    fontName: "helvetica",
    fontSize: 12,
    imageMode: "color",
    logoCorner: "topRight",
    imageSize: "medium",
    logoSize: "medium",
    logoAsWatermark: false,
    textColor: "#FFFFFF",
    // Ingredient display options
    showIngredients: true,
    ingredientFontSize: 10,
    ingredientPlacement: "belowImage",
    ingredientPillStyle: "rounded",
    ingredientTextColor: "#000000",
    ingredientBgColor: "#FFFFFF",
    // Instructions display options
    showInstructions: true,
    instructionsFontSize: 10,
    instructionsPlacement: "afterIngredients",
    // Advanced styling options
    primaryColor: "#000000",
    secondaryColor: "#FFFFFF",
    accentColor: "#000000",
    surfaceColor: "#FFFFFF",
    adaptiveTextSizing: true,
    showPageNumbers: true,
    contentDensity: "normal",
    instructionMaxLines: null,
    headerBarSize: "medium",
    imageFrameStyle: "shadow",
    listStyle: "numbers"
  });

  const dimensions = {
    letter: { width: 215.9, height: 279.4 },
    phone: { width: 96, height: 160 }
  };

  const bookActivityIds = currentBook ? bookActivities.get(currentBook.id) || new Set() : new Set();
  const bookActivitiesList = activitiesWithImages.filter(activity => bookActivityIds.has(activity.id));

  const generatePDF = async () => {
    if (!previewRef.current || !currentBook || bookActivitiesList.length === 0) return;

    setIsGenerating(true);
    try {
      console.log('Starting PDF generation...');
      let { width, height } = dimensions[config.format];
      // Swap width and height for landscape orientation
      if (config.orientation === "landscape") {
        [width, height] = [height, width];
      }
      console.log('Creating jsPDF instance with dimensions:', { width, height, orientation: config.orientation });
      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: "mm",
        format: [width, height],
        compress: true,
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });
      console.log('jsPDF instance created successfully');

      // Load AOT logo
      console.log('Loading AOT logo...');
      const aotLogo = new Image();
      aotLogo.crossOrigin = "anonymous";
      aotLogo.src = '/src/images/aot-logo.png';
      await new Promise((resolve, reject) => {
        aotLogo.onload = resolve;
        aotLogo.onerror = (e) => {
          console.error('Error loading AOT logo:', e);
          reject(new Error('Failed to load AOT logo'));
        };
        setTimeout(() => reject(new Error('Timeout loading AOT logo')), 5000);
      }).catch(err => {
        console.warn('AOT logo loading issue:', err.message);
      });
      console.log('AOT logo loaded or timed out');

      // Modern color palette
      const colors = {
        primary: config.primaryColor === "#000000" 
          ? { r: 33, g: 150, b: 243 }  // Default blue if black was selected
          : { r: parseInt(config.primaryColor.slice(1,3), 16), 
              g: parseInt(config.primaryColor.slice(3,5), 16), 
              b: parseInt(config.primaryColor.slice(5,7), 16) },
        
        secondary: config.secondaryColor === "#FFFFFF" 
          ? { r: 255, g: 193, b: 7 }  // Default amber if white was selected
          : { r: parseInt(config.secondaryColor.slice(1,3), 16), 
              g: parseInt(config.secondaryColor.slice(3,5), 16), 
              b: parseInt(config.secondaryColor.slice(5,7), 16) },
        
        background: config.backgroundColor === "#000000" 
          ? { r: 15, g: 15, b: 15 }  // Near black for better contrast
          : { r: parseInt(config.backgroundColor.slice(1,3), 16), 
              g: parseInt(config.backgroundColor.slice(3,5), 16), 
              b: parseInt(config.backgroundColor.slice(5,7), 16) },
        
        surface: config.surfaceColor === "#FFFFFF"
          ? { r: 30, g: 30, b: 30 }  // Dark surface if white was selected (for contrast)
          : { r: parseInt(config.surfaceColor.slice(1,3), 16), 
              g: parseInt(config.surfaceColor.slice(3,5), 16), 
              b: parseInt(config.surfaceColor.slice(5,7), 16) },
        
        onSurface: config.textColor === "#FFFFFF" 
          ? { r: 255, g: 255, b: 255 }  // White text on dark
          : { r: parseInt(config.textColor.slice(1,3), 16), 
              g: parseInt(config.textColor.slice(3,5), 16), 
              b: parseInt(config.textColor.slice(5,7), 16) },
        
        accent: config.accentColor === "#000000"
          ? { r: 100, g: 255, b: 218 }  // Default teal accent
          : { r: parseInt(config.accentColor.slice(1,3), 16), 
              g: parseInt(config.accentColor.slice(3,5), 16), 
              b: parseInt(config.accentColor.slice(5,7), 16) }
      };

      // Process each activity
      console.log(`Processing ${bookActivitiesList.length} activities...`);
      for (let i = 0; i < bookActivitiesList.length; i++) {
        const activity = bookActivitiesList[i];

        if (i > 0) {
          pdf.addPage();
        }

        // Define format variables first to avoid initialization errors
        const pageWidth = pdf.internal.pageSize.width;
        const pageHeight = pdf.internal.pageSize.height;
        const isPhone = config.format === "phone";
        const margin = isPhone ? 10 : 25;
        const contentWidth = pageWidth - (2 * margin);

        // Page background - white like web version
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Add thin decorative header bar for branding
        pdf.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
        pdf.rect(0, 0, pageWidth, isPhone ? 8 : 12, 'F');
        
        // Setup card-like container like web layout
        const cardY = margin + (isPhone ? 8 : 12);
        const cardHeight = pageHeight - cardY - margin;
        
        // Card background - white with subtle shadow
        pdf.setFillColor(248, 248, 248);
        pdf.roundedRect(margin, cardY, contentWidth, cardHeight, 5, 5, 'F');
        
        // Add a subtle border to card
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, cardY, contentWidth, cardHeight, 5, 5, 'S');
        
        // Content starting position
        let currentY = cardY + (isPhone ? 15 : 25);
        
        // Add logo in top right corner of card
        const logoSize = isPhone ? 20 : 35;
        const logoHeight = (234/227) * logoSize;
        const logoX = pageWidth - margin - logoSize - 15;
        const logoY = cardY + 15;
        
        try {
          // Add logo
          pdf.addImage(aotLogo, 'PNG', logoX, logoY, logoSize, logoHeight);
        } catch (error) {
          console.warn('Failed to add logo:', error);
        }
        
        // Modern typography for title - dark text like web
        pdf.setFont(config.fontName, 'bold');
        pdf.setFontSize(isPhone ? 16 : 20);
        pdf.setTextColor(50, 50, 50);
        
        // Title text
        const titleLines = pdf.splitTextToSize(activity.name, contentWidth * 0.7);
        titleLines.forEach((line: string, index: number) => {
          pdf.text(line, margin + 15, currentY + (index * (isPhone ? 7 : 10)));
        });
        currentY += titleLines.length * (isPhone ? 7 : 10) + 10;
        
        // Category with subtle chip design like web
        if (activity.category) {
          pdf.setFontSize(isPhone ? 10 : 12);
          pdf.setFont(config.fontName, 'normal');
          const categoryText = activity.category;
          
          // Add "Category:" label like web
          pdf.setTextColor(100, 100, 100);
          pdf.text("Category:", margin + 15, currentY);
          
          // Category value
          pdf.setTextColor(50, 50, 50);
          pdf.text(categoryText, margin + 80, currentY);
          currentY += isPhone ? 15 : 20;
        }
        
        // Add a separator line 
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 15, currentY, margin + contentWidth - 15, currentY);
        currentY += isPhone ? 15 : 20;
        
        // Add instructions section ONCE before image (like web layout)
        if (activity.recipes && activity.recipes.length > 0 && activity.recipes[0]?.instructions) {
          // Add "Instructions:" label like web
          pdf.setFont(config.fontName, 'medium');
          pdf.setFontSize(isPhone ? 12 : 14);
          pdf.setTextColor(50, 50, 50);
          pdf.text("Instructions:", margin + 15, currentY);
          currentY += isPhone ? 10 : 15;
          
          // Instructions content in gray container like web
          pdf.setFillColor(245, 245, 245);
          
          // Get cleaned instructions text
          const cleanInstructions = activity.recipes[0].instructions.replace(/^\*+\s*/, '').trim();
          
          // Split text to fit
          pdf.setFont(config.fontName, 'normal');
          pdf.setFontSize(isPhone ? 10 : 12);
          const textWidth = contentWidth - 40;
          const lines = pdf.splitTextToSize(cleanInstructions, textWidth);
          
          // Calculate how many lines fit
          const lineHeight = (isPhone ? 10 : 12) * 1.2;
          const maxLines = config.instructionMaxLines || Math.min(8, lines.length);
          const displayLines = lines.length > maxLines ? lines.slice(0, maxLines - 1) : lines;
          
          // Gray container for instructions like web
          const instrHeight = Math.max(30, displayLines.length * lineHeight + 20);
          pdf.roundedRect(margin + 15, currentY, contentWidth - 30, instrHeight, 3, 3, 'F');
          
          // Add text
          pdf.setTextColor(80, 80, 80);
          displayLines.forEach((line, index) => {
            pdf.text(line, margin + 25, currentY + 15 + (index * lineHeight));
          });
          
          // Add ellipsis if content was truncated
          if (lines.length > maxLines) {
            pdf.text("...", margin + 25, currentY + 15 + ((maxLines - 1) * lineHeight));
          }
          
          currentY += instrHeight + (isPhone ? 15 : 20);
        }
        
        // Add image if available
        if (activity.images && activity.images.length > 0) {
          try {
            const img = await loadImage(activity.images[0].path);
            
            // Calculate image dimensions
            const imgMaxWidth = contentWidth - 30;
            const imgMaxHeight = 150;
            
            let imgWidth = imgMaxWidth;
            let imgHeight = (img.height * imgWidth) / img.width;
            
            // Adjust if too tall
            if (imgHeight > imgMaxHeight) {
              imgHeight = imgMaxHeight;
              imgWidth = (img.width * imgHeight) / img.height;
            }
            
            const imgX = margin + (contentWidth - imgWidth) / 2;
            const imgY = currentY;
            
            // Add the image
            pdf.addImage(img, 'JPEG', imgX, imgY, imgWidth, imgHeight);
            
            currentY = imgY + imgHeight + (isPhone ? 15 : 20);
          } catch (error) {
            console.error('Failed to add image:', error);
            currentY += 10;
          }
        }
        
        // Activity Steps section following web layout
        if (config.showIngredients && activity.recipes && activity.recipes.length > 0 && activity.recipes[0]?.ingredients) {
          // Add "Activity Steps:" label like web
          pdf.setFont(config.fontName, 'medium');
          pdf.setFontSize(isPhone ? 12 : 14);
          pdf.setTextColor(50, 50, 50);
          pdf.text("Activity Steps:", margin + 15, currentY);
          currentY += isPhone ? 10 : 15;
          
          // Format ingredients as simple list like web layout
          const ingredients = activity.recipes[0].ingredients;
          let ingredientsArray: string[] = [];
          
          // Parse ingredients
          if (typeof ingredients === 'string') {
            try {
              const parsed = JSON.parse(ingredients);
              ingredientsArray = Array.isArray(parsed) ? parsed : [ingredients];
            } catch (e) {
              ingredientsArray = [ingredients];
            }
          } else if (Array.isArray(ingredients)) {
            ingredientsArray = ingredients;
          }
          
          // Prepare a container for steps if needed
          if (ingredientsArray.length > 0) {
            // Display ingredients as simple text list like web
            pdf.setFont(config.fontName, 'normal');
            pdf.setFontSize(isPhone ? 10 : 12);
            pdf.setTextColor(80, 80, 80);
            
            ingredientsArray.forEach((ingredient, index) => {
              if (!ingredient) return;
              const cleanedIngredient = ingredient.replace(/^\*+\s*/, '').trim();
              
              // Create circle number for step (same as in the web view)
              pdf.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
              const circleRadius = isPhone ? 6 : 8;
              pdf.circle(margin + 20, currentY - 3, circleRadius, 'F');
              
              // Add step number in circle
              pdf.setTextColor(255, 255, 255);
              pdf.setFontSize(isPhone ? 8 : 10);
              pdf.text(`${index + 1}`, margin + 20, currentY, { align: 'center' });
              
              // Draw step text
              pdf.setTextColor(80, 80, 80);
              pdf.setFontSize(isPhone ? 10 : 12);
              const stepTextX = margin + 35;
              const availableWidth = contentWidth - 40;
              const lines = pdf.splitTextToSize(cleanedIngredient, availableWidth);
              
              // Draw each line of step text
              lines.forEach((line, lineIndex) => {
                pdf.text(line, stepTextX, currentY + (lineIndex * (isPhone ? 6 : 8)));
              });
              
              // Calculate space needed for this step
              const stepHeight = Math.max(circleRadius * 2, lines.length * (isPhone ? 6 : 8));
              currentY += stepHeight + (isPhone ? 10 : 12);
            });
          }
        }
        
        // Add a separator line at the bottom
        currentY += isPhone ? 5 : 10;
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 15, currentY, margin + contentWidth - 15, currentY);
        
        // Add page number if enabled
        if (config.showPageNumbers) {
          pdf.setFontSize(isPhone ? 8 : 10);
          pdf.setTextColor(150, 150, 150);
          
          // Create page number with border like web view
          const pageNumText = `${i + 1} / ${bookActivitiesList.length}`;
          const textWidth = pdf.getStringUnitWidth(pageNumText) * pdf.getFontSize() / pdf.internal.scaleFactor;
          const numX = (pageWidth - textWidth) / 2;
          const numY = pageHeight - 20;
          
          pdf.text(pageNumText, numX, numY);
        }
      }

      const filename = `${currentBook.name.replace(/\s+/g, '-').toLowerCase()}-report.pdf`;
      console.log('Saving PDF to file:', filename);
      try {
        pdf.save(filename);
        console.log('PDF saved successfully');
      } catch (saveError) {
        console.error('Error saving PDF:', saveError);
        throw saveError;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Show more detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    console.log(`Attempting to load image: ${src}`);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      // Apply a proper URL to the image path if it's a relative path
      const fullSrc = src.startsWith('http') ? src : 
                     src.startsWith('/') ? `${window.location.origin}${src}` : 
                     `${window.location.origin}/${src}`;
      
      console.log(`Using full image path: ${fullSrc}`);
      
      img.onload = () => {
        console.log(`Successfully loaded image: ${fullSrc}`);
        resolve(img);
      };
      
      img.onerror = (e) => {
        console.error(`Failed to load image: ${fullSrc}`, e);
        // Create a fallback image rather than failing
        const fallbackImg = new Image();
        fallbackImg.width = 300;
        fallbackImg.height = 200;
        // Set properties that jspdf can use
        fallbackImg.src = '';
        console.log('Using fallback image placeholder');
        resolve(fallbackImg);
      };
      
      // Set the source last after all event handlers are set up
      img.src = fullSrc;
      
      // Add timeout to avoid hanging
      setTimeout(() => {
        if (!img.complete) {
          console.warn(`Timeout loading image: ${fullSrc}`);
          const fallbackImg = new Image();
          fallbackImg.width = 300;
          fallbackImg.height = 200;
          fallbackImg.src = '';
          resolve(fallbackImg);
        }
      }, 5000);
    });
  };

  if (!userData || !currentBook) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Please select a book first</h1>
        <Button onClick={() => navigate("/book")}>Go to Books</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6">
      <div className="max-w-4xl mx-auto w-full">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/book-report")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Report
        </Button>

        <h1 className="text-2xl font-bold mb-6">Export PDF Configuration</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">PDF Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <RadioGroup 
                  value={config.format}
                  onValueChange={(value: "letter" | "phone") => setConfig({...config, format: value})}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="letter" id="format-letter" />
                    <label htmlFor="format-letter">Letter</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="format-phone" />
                    <label htmlFor="format-phone">Phone</label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Orientation</label>
                <RadioGroup 
                  value={config.orientation}
                  onValueChange={(value: "portrait" | "landscape") => setConfig({...config, orientation: value})}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="portrait" id="orientation-portrait" />
                    <label htmlFor="orientation-portrait">Portrait</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="landscape" id="orientation-landscape" />
                    <label htmlFor="orientation-landscape">Landscape</label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Background Color</label>
                <Input 
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Font</label>
                <Select 
                  value={config.fontName}
                  onValueChange={(value) => setConfig({...config, fontName: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(font => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Font Size</label>
                <Input 
                  type="number"
                  value={config.fontSize}
                  onChange={(e) => setConfig({...config, fontSize: Number(e.target.value)})}
                  min={8}
                  max={24}
                />
              </div>

              <div>
                  <label className="block text-sm font-medium mb-1">Image Size</label>
                  <RadioGroup 
                    value={config.imageSize}
                    onValueChange={(value: "small" | "medium" | "large") => setConfig({...config, imageSize: value})}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="size-small" />
                      <label htmlFor="size-small">Small (20%)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="size-medium" />
                      <label htmlFor="size-medium">Medium (60%)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="size-large" />
                      <label htmlFor="size-large">Large (80%)</label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Image Color Mode</label>
                  <RadioGroup 
                    value={config.imageMode}
                    onValueChange={(value: "blackAndWhite" | "color") => setConfig({...config, imageMode: value})}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="blackAndWhite" id="mode-bw" />
                      <label htmlFor="mode-bw">Black & White</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="color" id="mode-color" />
                      <label htmlFor="mode-color">Full Color</label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Logo Corner</label>
                  <Select
                  value={config.logoCorner}
                  onValueChange={(value: "topLeft" | "topRight" | "bottomLeft" | "bottomRight") => setConfig({ ...config, logoCorner: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select corner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topLeft">Top Left</SelectItem>
                    <SelectItem value="topRight">Top Right</SelectItem>
                    <SelectItem value="bottomLeft">Bottom Left</SelectItem>
                    <SelectItem value="bottomRight">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                  <label className="block text-sm font-medium mb-1">Logo Size</label>
                  <RadioGroup 
                    value={config.logoSize}
                    onValueChange={(value: "small" | "medium" | "large") => setConfig({...config, logoSize: value})}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="logo-size-small" />
                      <label htmlFor="logo-size-small">Small</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="logo-size-medium" />
                      <label htmlFor="logo-size-medium">Medium</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="logo-size-large" />
                      <label htmlFor="logo-size-large">Large</label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Logo as Watermark</label>
                  <RadioGroup 
                    value={config.logoAsWatermark.toString()}
                    onValueChange={(value: string) => setConfig({...config, logoAsWatermark: value === 'true'})}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="watermark-false" />
                      <label htmlFor="watermark-false">No</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="watermark-true" />
                      <label htmlFor="watermark-true">Yes</label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Text Color</label>
                  <Input 
                    type="color"
                    value={config.textColor}
                    onChange={(e) => setConfig({...config, textColor: e.target.value})}
                  />
                </div>

                {/* Ingredient Display Options Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-md font-semibold mb-3">Ingredient Display Options</h3>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Show Ingredients</label>
                    <RadioGroup 
                      value={config.showIngredients.toString()}
                      onValueChange={(value: string) => setConfig({...config, showIngredients: value === 'true'})}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="show-ingredients-true" />
                        <label htmlFor="show-ingredients-true">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="show-ingredients-false" />
                        <label htmlFor="show-ingredients-false">No</label>
                      </div>
                    </RadioGroup>
                  </div>

                  {config.showIngredients && (
                    <>
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Ingredient Font Size</label>
                        <Input 
                          type="number"
                          value={config.ingredientFontSize}
                          onChange={(e) => setConfig({...config, ingredientFontSize: Number(e.target.value)})}
                          min={6}
                          max={18}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Ingredient Placement</label>
                        <Select 
                          value={config.ingredientPlacement}
                          onValueChange={(value: "belowTitle" | "belowImage" | "bottomOfPage") => 
                            setConfig({...config, ingredientPlacement: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select placement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="belowTitle">Below Title</SelectItem>
                            <SelectItem value="belowImage">Below Image</SelectItem>
                            <SelectItem value="bottomOfPage">Bottom of Page</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Ingredient Pill Style</label>
                        <Select 
                          value={config.ingredientPillStyle}
                          onValueChange={(value: "rounded" | "square" | "outlined") => 
                            setConfig({...config, ingredientPillStyle: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rounded">Rounded</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="outlined">Outlined</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Ingredient Text Color</label>
                        <Input 
                          type="color"
                          value={config.ingredientTextColor}
                          onChange={(e) => setConfig({...config, ingredientTextColor: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Ingredient Background Color</label>
                        <Input 
                          type="color"
                          value={config.ingredientBgColor}
                          onChange={(e) => setConfig({...config, ingredientBgColor: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Instructions Display Options Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-md font-semibold mb-3">Instructions Display Options</h3>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Show Instructions</label>
                    <RadioGroup 
                      value={config.showInstructions.toString()}
                      onValueChange={(value: string) => setConfig({...config, showInstructions: value === 'true'})}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="show-instructions-true" />
                        <label htmlFor="show-instructions-true">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="show-instructions-false" />
                        <label htmlFor="show-instructions-false">No</label>
                      </div>
                    </RadioGroup>
                  </div>

                  {config.showInstructions && (
                    <>
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Instructions Font Size</label>
                        <Input 
                          type="number"
                          value={config.instructionsFontSize}
                          onChange={(e) => setConfig({...config, instructionsFontSize: Number(e.target.value)})}
                          min={6}
                          max={18}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Instructions Placement</label>
                        <Select 
                          value={config.instructionsPlacement}
                          onValueChange={(value: "afterIngredients" | "belowImage" | "bottomOfPage") => 
                            setConfig({...config, instructionsPlacement: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select placement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="afterIngredients">After Ingredients</SelectItem>
                            <SelectItem value="belowImage">Below Image</SelectItem>
                            <SelectItem value="bottomOfPage">Bottom of Page</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                {/* Advanced Styling Options Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-md font-semibold mb-3">Advanced Styling</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Primary Color</label>
                      <Input 
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Accent Color</label>
                      <Input 
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => setConfig({...config, accentColor: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Surface Color</label>
                      <Input 
                        type="color"
                        value={config.surfaceColor}
                        onChange={(e) => setConfig({...config, surfaceColor: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Content Density</label>
                    <Select 
                      value={config.contentDensity}
                      onValueChange={(value: "compact" | "normal" | "spacious") => 
                        setConfig({...config, contentDensity: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select density" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Image Frame Style</label>
                    <Select 
                      value={config.imageFrameStyle}
                      onValueChange={(value: "shadow" | "border" | "none") => 
                        setConfig({...config, imageFrameStyle: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shadow">Shadow</SelectItem>
                        <SelectItem value="border">Border</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">List Style</label>
                    <Select 
                      value={config.listStyle}
                      onValueChange={(value: "numbers" | "bullets" | "none") => 
                        setConfig({...config, listStyle: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numbers">Numbers</SelectItem>
                        <SelectItem value="bullets">Bullets</SelectItem>
                        <SelectItem value="none">No Markers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium">Adaptive Text Sizing</span>
                    <Checkbox
                      checked={config.adaptiveTextSizing}
                      onCheckedChange={(checked) => 
                        setConfig({...config, adaptiveTextSizing: checked === true})}
                      id="adaptive-text"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-medium">Show Page Numbers</span>
                    <Checkbox
                      checked={config.showPageNumbers}
                      onCheckedChange={(checked) => 
                        setConfig({...config, showPageNumbers: checked === true})}
                      id="show-page-numbers"
                    />
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Max Instruction Lines</label>
                    <Input 
                      type="number"
                      value={config.instructionMaxLines?.toString() || ""}
                      onChange={(e) => setConfig({
                        ...config, 
                        instructionMaxLines: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="Auto"
                      min={1}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for automatic fitting</p>
                  </div>
                </div>
            </div>

            <Button
              onClick={generatePDF}
              disabled={isGenerating || bookActivitiesList.length === 0}
              className="w-full mt-6"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </Button>
          </Card>

          <div ref={previewRef}>
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            <div className="space-y-4">
              {bookActivitiesList.map(activity => (
                <Card key={activity.id} className="p-4">
                  <h3 className="font-medium">{activity.name}</h3>
                  <p className="text-sm text-gray-600">Category: {activity.category}</p>
                  
                  {/* Show ingredients if enabled and placement is belowTitle */}
                  {config.showIngredients && 
                   config.ingredientPlacement === "belowTitle" && 
                   activity.recipes && 
                   activity.recipes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Activity Steps:</p>
                      <div className="space-y-1 mt-1">
                        {activity.recipes[0]?.ingredients.map((ingredient, idx) => (
                          <div 
                            key={idx}
                            className={`text-xs p-1 ${
                              config.ingredientPillStyle === "outlined" 
                                ? "border border-solid" 
                                : config.ingredientPillStyle === "rounded"
                                  ? "rounded-md"
                                  : ""
                            }`}
                            style={{
                              backgroundColor: config.ingredientPillStyle !== "outlined" ? config.ingredientBgColor : "transparent",
                              color: config.ingredientTextColor,
                              borderColor: config.ingredientPillStyle === "outlined" ? config.ingredientBgColor : "transparent"
                            }}
                          >
                            {typeof ingredient === 'string' ? ingredient : JSON.stringify(ingredient)}
                          </div>
                        ))}
                      </div>
                      
                      {/* Show instructions after ingredients if enabled */}
                      {config.showInstructions && 
                       config.instructionsPlacement === "afterIngredients" && 
                       activity.recipes && 
                       activity.recipes.length > 0 && 
                       activity.recipes[0]?.instructions && (
                        <div className="mt-3">
                          <p className="text-sm font-medium">Instructions:</p>
                          <div className="text-xs p-2 mt-1 bg-gray-100 rounded-md">
                            {activity.recipes[0].instructions}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* SINGLE INSTRUCTIONS SECTION - Show only once */}
                  {activity.recipes && 
                   activity.recipes.length > 0 && 
                   activity.recipes[0]?.instructions && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium">Instructions:</p>
                      <div className="text-xs p-2 mt-1 bg-gray-100 rounded-md">
                        {activity.recipes[0].instructions}
                      </div>
                    </div>
                  )}
                  
                  {activity.images && activity.images[0] && (
                    <div className="mt-2">
                      <img 
                        src={activity.images[0].path} 
                        alt={activity.name}
                        className="mt-2 rounded-md"
                        crossOrigin="anonymous"
                      />
                      
                      {/* Show ingredients if enabled and placement is belowImage */}
                      {config.showIngredients && 
                       config.ingredientPlacement === "belowImage" && 
                       activity.recipes && 
                       activity.recipes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Activity Steps:</p>
                          <div className="space-y-1 mt-1">
                            {activity.recipes[0]?.ingredients.map((ingredient, idx) => (
                              <div 
                                key={idx}
                                className={`text-xs p-1 ${
                                  config.ingredientPillStyle === "outlined" 
                                    ? "border border-solid" 
                                    : config.ingredientPillStyle === "rounded"
                                      ? "rounded-md"
                                      : ""
                                }`}
                                style={{
                                  backgroundColor: config.ingredientPillStyle !== "outlined" ? config.ingredientBgColor : "transparent",
                                  color: config.ingredientTextColor,
                                  borderColor: config.ingredientPillStyle === "outlined" ? config.ingredientBgColor : "transparent"
                                }}
                              >
                                {typeof ingredient === 'string' ? ingredient : JSON.stringify(ingredient)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* SINGLE INSTRUCTIONS SECTION - Show only once */}
                  {activity.recipes && 
                   activity.recipes.length > 0 && 
                   activity.recipes[0]?.instructions && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium">Instructions:</p>
                      <div className="text-xs p-2 mt-1 bg-gray-100 rounded-md">
                        {activity.recipes[0].instructions}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}