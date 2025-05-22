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
      return res.json();
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
    textColor: "#FFFFFF"
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
      let { width, height } = dimensions[config.format];
      // Swap width and height for landscape orientation
      if (config.orientation === "landscape") {
        [width, height] = [height, width];
      }
      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: "mm",
        format: [width, height],
        compress: true,
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });

      // Load AOT logo
      const aotLogo = new Image();
      aotLogo.src = '/src/images/aot-logo.png';
      await new Promise((resolve) => {
        aotLogo.onload = resolve;
      });

      // Process each activity
      for (let i = 0; i < bookActivitiesList.length; i++) {
        const activity = bookActivitiesList[i];

        if (i > 0) {
          pdf.addPage();
        }

        // Set background color
        pdf.setFillColor(parseInt(config.backgroundColor.slice(1), 16));
        pdf.rect(0, 0, pdf.internal.pageSize.width, pdf.internal.pageSize.height, 'F');

        // Define page margins and spacing
        const margin = 20;
        const headerHeight = 60;

        let logoWidth = 40;
        if (config.logoSize === "small") {
          logoWidth = 20;
        } else if (config.logoSize === "large") {
          logoWidth = 60;
        }
        const logoHeight = (234/227) * logoWidth;

        // Calculate logo position based on corner selection
        const logoPosition = {
          topLeft: { 
            x: margin, 
            y: margin,
            textStartX: margin,
            textStartY: margin + logoHeight + 15
          },
          topRight: { 
            x: pdf.internal.pageSize.width - margin - logoWidth, 
            y: margin,
            textStartX: margin,
            textStartY: margin
          },
          bottomLeft: { 
            x: margin, 
            y: pdf.internal.pageSize.height - margin - logoHeight,
            textStartX: margin,
            textStartY: margin
          },
          bottomRight: { 
            x: pdf.internal.pageSize.width - margin - logoWidth, 
            y: pdf.internal.pageSize.height - margin - logoHeight,
            textStartX: margin,
            textStartY: margin
          }
        }[config.logoCorner];

        // Add logo
        if (config.logoAsWatermark) {
           // Add black background with rounded corners and padding
           const padding = 2;
           pdf.setFillColor(0, 0, 0);
           pdf.roundedRect(
               logoPosition.x - padding,
               logoPosition.y - padding,
               logoWidth + 2 * padding,
               logoHeight + 2 * padding,
               3,
               3,
               'F'
           );
            pdf.addImage(aotLogo, 'PNG', logoPosition.x, logoPosition.y, logoWidth, logoHeight);
            pdf.setGState({ opacity: 0.25 });
            pdf.addImage(aotLogo, 'PNG', logoPosition.x, logoPosition.y, logoWidth, logoHeight);
            pdf.setGState({ opacity: 1 });
        } else {
          // Add black background with rounded corners and padding
          const padding = 2;
          pdf.setFillColor(0, 0, 0);
          pdf.roundedRect(
              logoPosition.x - padding,
              logoPosition.y - padding,
              logoWidth + 2 * padding,
              logoHeight + 2 * padding,
              3,
              3,
              'F'
          );
          pdf.addImage(aotLogo, 'PNG', logoPosition.x, logoPosition.y, logoWidth, logoHeight);
        }

        // Set font
        pdf.setFont(config.fontName);
        pdf.setFontSize(config.fontSize);
        // Convert hex to RGB for text color
        const textColor = {
          r: parseInt(config.textColor.slice(1,3), 16),
          g: parseInt(config.textColor.slice(3,5), 16),
          b: parseInt(config.textColor.slice(5,7), 16)
        };
        pdf.setTextColor(textColor.r, textColor.g, textColor.b);

        // Add activity details with proper spacing
        pdf.setFontSize(16);
        pdf.text(activity.name, logoPosition.textStartX, logoPosition.textStartY);
        pdf.setFontSize(config.fontSize - 2);
        pdf.text(`Category: ${activity.category}`, logoPosition.textStartX, logoPosition.textStartY + 15);

        // Add image if exists - centered both horizontally and vertically
        if (activity.images && activity.images.length > 0) {
          try {
            const img = await loadImage(activity.images[0].path);
            let imgWidth = 170;

            // Calculate image dimensions based on size setting
            if (config.imageSize === "small") {
              imgWidth = pdf.internal.pageSize.width * 0.2;
            } else if (config.imageSize === "medium") {
              imgWidth = pdf.internal.pageSize.width * 0.6;
            } else if (config.imageSize === "large") {
              imgWidth = pdf.internal.pageSize.width * 0.8;
            }

            const imgHeight = (img.height * imgWidth) / img.width;

            // Calculate centered position for image
            const pageHeight = pdf.internal.pageSize.height;
            // Center image vertically in the page, accounting for header space
            const headerSpace = Math.max(logoPosition.textStartY + 30, headerHeight);
            const availableHeight = pageHeight - headerSpace - margin;
            const imgX = (pdf.internal.pageSize.width - imgWidth) / 2;
            const imgY = headerSpace + (availableHeight - imgHeight) / 2;

            // Ensure logo is rendered after image and doesn't overlap
            const logoMaxY = headerSpace - 10; // Keep logo in header area
            if (logoPosition.y + logoHeight > logoMaxY) {
              logoPosition.y = logoMaxY - logoHeight;
            }

            // Image container background - centered
            pdf.setFillColor(40, 40, 40);
            pdf.roundedRect(imgX - 5, imgY - 5, imgWidth + 10, imgHeight + 10, 5, 5, 'F');

            try {
              if (config.imageMode === "blackAndWhite") {
                // Use a simpler grayscale filter for deployed environment
                pdf.setFillColor(220, 220, 220);
                pdf.rect(imgX, imgY, imgWidth, imgHeight, 'F');
                pdf.addImage(img.src, 'JPEG', imgX, imgY, imgWidth, imgHeight, null, 'SLOW');
              } else {
                pdf.addImage(img.src, 'JPEG', imgX, imgY, imgWidth, imgHeight, null, 'SLOW');
              }
            } catch (imageError) {
              console.error('Error adding image to PDF:', imageError);
              // Fallback to placeholder if image fails
              pdf.setFillColor(200, 200, 200);
              pdf.rect(imgX, imgY, imgWidth, imgHeight, 'F');
              pdf.setTextColor(100, 100, 100);
              pdf.text('Image unavailable', imgX + imgWidth/2, imgY + imgHeight/2, { align: 'center' });
            }
          } catch (error) {
            console.error(`Failed to load image for activity ${activity.name}:`, error);
          }
        }
      }

      const filename = `${currentBook.name.replace(/\s+/g, '-').toLowerCase()}-report.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error(`Failed to load image: ${src}`, e);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
      // Add timeout to avoid hanging
      setTimeout(() => reject(new Error(`Timeout loading image: ${src}`)), 10000);
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
                  {activity.images && activity.images[0] && (
                    <img 
                      src={activity.images[0].path} 
                      alt={activity.name}
                      className="mt-2 rounded-md"
                      crossOrigin="anonymous"
                    />
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