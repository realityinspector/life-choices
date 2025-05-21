import { useBook } from "@/context/book-context";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup } from "@/components/ui/radio-group";
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
  imageMode: "blackAndWhite";
  logoCorner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
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
    imageMode: "blackAndWhite",
    logoCorner: "topRight"
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
        format: [width, height]
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

        // Add logo
        const logoWidth = 40;
        const logoHeight = (234/227) * logoWidth; // Maintain aspect ratio
        const logoPosition = {
          topLeft: { x: 10, y: 10 },
          topRight: { x: pdf.internal.pageSize.width - 50, y: 10 },
          bottomLeft: { x: 10, y: pdf.internal.pageSize.height - logoHeight - 10 },
          bottomRight: { x: pdf.internal.pageSize.width - 50, y: pdf.internal.pageSize.height - logoHeight - 10 }
        }[config.logoCorner];
        pdf.addImage(aotLogo, 'PNG', logoPosition.x, logoPosition.y, logoWidth, logoHeight);

        // Set font
        pdf.setFont(config.fontName);
        pdf.setFontSize(config.fontSize);
        pdf.setTextColor(255, 255, 255);

        // Add activity details
        pdf.text(activity.name, 20, 20);
        pdf.setFontSize(config.fontSize - 2);
        pdf.text(`Category: ${activity.category}`, 20, 30);

        // Add image if exists
        if (activity.images && activity.images.length > 0) {
          try {
            const img = await loadImage(activity.images[0].path);
            const imgWidth = 170;
            const imgHeight = (img.height * imgWidth) / img.width;

            // Image container background
            pdf.setFillColor(40, 40, 40);
            pdf.roundedRect(15, 35, imgWidth + 10, imgHeight + 10, 5, 5, 'F');

            if (config.imageMode === "blackAndWhite") {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              for (let p = 0; p < imgData.data.length; p += 4) {
                const avg = (imgData.data[p] + imgData.data[p + 1] + imgData.data[p + 2]) / 3;
                imgData.data[p] = imgData.data[p + 1] = imgData.data[p + 2] = avg;
              }
              ctx.putImageData(imgData, 0, 0);
              pdf.addImage(canvas.toDataURL(), 'JPEG', 20, 40, imgWidth, imgHeight);
            } else {
              pdf.addImage(img, 'JPEG', 20, 40, imgWidth, imgHeight);
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
      img.onerror = reject;
      img.src = src;
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
                <Select 
                  value={config.format}
                  onValueChange={(value: "letter" | "phone") => setConfig({...config, format: value})}
                >
                  <option value="letter">Letter</option>
                  <option value="phone">Phone</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Orientation</label>
                <RadioGroup 
                  value={config.orientation}
                  onValueChange={(value: "portrait" | "landscape") => setConfig({...config, orientation: value})}
                >
                  <div className="flex gap-4">
                    <label>
                      <input type="radio" value="portrait" /> Portrait
                    </label>
                    <label>
                      <input type="radio" value="landscape" /> Landscape
                    </label>
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