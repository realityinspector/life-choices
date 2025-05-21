
import { useBook } from "@/context/book-context";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { RadioGroup } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Download, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useRef, useState } from "react";

type PDFConfig = {
  orientation: "portrait" | "landscape";
  format: "letter" | "phone";
  backgroundColor: string;
  fontName: string;
  fontSize: number;
  imageMode: "blackAndWhite";
};

const FONT_OPTIONS = ["helvetica", "courier", "times", "symbol", "zapfdingbats", "arial"];

export default function BookReportExportPage() {
  const [, navigate] = useLocation();
  const { userData } = useUser();
  const { currentBook, bookActivities } = useBook();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [config, setConfig] = useState<PDFConfig>({
    orientation: "portrait",
    format: "letter",
    backgroundColor: "#000000",
    fontName: "helvetica",
    fontSize: 12,
    imageMode: "blackAndWhite"
  });

  const dimensions = {
    letter: { width: 215.9, height: 279.4 },
    phone: { width: 96, height: 160 }
  };

  const generatePDF = async () => {
    if (!previewRef.current || !currentBook) return;

    setIsGenerating(true);
    try {
      const { width, height } = dimensions[config.format];
      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: "mm",
        format: [width, height]
      });

      // Set background
      pdf.setFillColor(parseInt(config.backgroundColor.slice(1), 16));
      pdf.rect(0, 0, pdf.internal.pageSize.width, pdf.internal.pageSize.height, "F");

      // Set font
      pdf.setFont(config.fontName);
      pdf.setFontSize(config.fontSize);
      pdf.setTextColor(255, 255, 255);

      const canvas = await html2canvas(previewRef.current);
      const imgData = canvas.toDataURL("image/jpeg");

      if (config.imageMode === "blackAndWhite") {
        // Convert to grayscale
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const avg = (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
          imgData.data[i] = avg;
          imgData.data[i + 1] = avg;
          imgData.data[i + 2] = avg;
        }
        ctx.putImageData(imgData, 0, 0);
        pdf.addImage(tempCanvas.toDataURL(), "JPEG", 10, 10, 190, 270);
      } else {
        pdf.addImage(imgData, "JPEG", 10, 10, 190, 270);
      }

      const filename = `${currentBook.name.replace(/\s+/g, '-').toLowerCase()}-report.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
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
                  {FONT_OPTIONS.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
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
            </div>

            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="w-full mt-6"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </Button>
          </Card>

          <div ref={previewRef}>
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            {/* Preview content here */}
          </div>
        </div>
      </div>
    </div>
  );
}
