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

  // Better default configuration for a nice looking PDF
  const [config, setConfig] = useState<PDFConfig>({
    orientation: "portrait",
    format: "letter",
    backgroundColor: "#FFFFFF",  // White background for clean look
    fontName: "helvetica",
    fontSize: 12,
    imageMode: "color",
    logoCorner: "topRight",
    imageSize: "medium",
    logoSize: "small",
    logoAsWatermark: false,
    textColor: "#333333",  // Dark gray for better readability
    // Ingredient display options
    showIngredients: true,
    ingredientFontSize: 11,
    ingredientPlacement: "belowImage",
    ingredientPillStyle: "rounded",
    ingredientTextColor: "#333333",
    ingredientBgColor: "#F3F4F6",  // Light gray background
    // Instructions display options
    showInstructions: true,
    instructionsFontSize: 11,
    instructionsPlacement: "belowImage",
    // Advanced styling options
    primaryColor: "#2563EB",  // Nice blue
    secondaryColor: "#F59E0B",  // Amber
    accentColor: "#10B981",  // Green
    surfaceColor: "#F9FAFB",  // Very light gray
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

      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: "mm",
        format: [width, height],
        compress: true,
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });

      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      let currentY = 0; // Initialize currentY at the start

      // Load AOT logo
      const aotLogo = new Image();
      aotLogo.crossOrigin = "anonymous";
      aotLogo.src = '/src/images/aot-logo.png';
      await new Promise((resolve, reject) => {
        aotLogo.onload = resolve;
        aotLogo.onerror = (e) => {
          console.error('Error loading AOT logo:', e);
          resolve(null); // Continue without logo
        };
        setTimeout(() => resolve(null), 5000);
      });

      // Parse colors helper
      const parseColor = (hex: string) => {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16); 
        const b = parseInt(hex.slice(5,7), 16);
        return { r, g, b };
      };

      const colors = {
        background: parseColor(config.backgroundColor),
        text: parseColor(config.textColor),
        primary: parseColor(config.primaryColor),
        secondary: parseColor(config.secondaryColor),
        surface: parseColor(config.surfaceColor),
        accent: parseColor(config.accentColor),
        ingredientBg: parseColor(config.ingredientBgColor),
        ingredientText: parseColor(config.ingredientTextColor)
      };

      // Add cover page
      const coverTitle = currentBook.name || "Your Life Choices Book";
      pdf.setFont(config.fontName, 'bold');
      pdf.setFontSize(32);
      pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);

      // Center the title
      const titleWidth = pdf.getTextWidth(coverTitle);
      const titleX = (pageWidth - titleWidth) / 2;
      const titleY = pageHeight / 2;
      pdf.text(coverTitle, titleX, titleY);

      // Add date
      pdf.setFont(config.fontName, 'normal');
      pdf.setFontSize(14);
      const date = new Date().toLocaleDateString();
      const dateWidth = pdf.getTextWidth(date);
      pdf.text(date, (pageWidth - dateWidth) / 2, titleY + 20);

      // Add AOT logo to cover
      if (aotLogo && aotLogo.complete) {
        const logoWidth = 60;
        const logoHeight = (234/227) * logoWidth;
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = titleY - 100;

        // Black background for logo
        pdf.setFillColor(0, 0, 0);
        const bgPadding = 8;
        pdf.roundedRect(logoX - bgPadding, logoY - bgPadding, 
                       logoWidth + (bgPadding * 2), 
                       logoHeight + (bgPadding * 2), 3, 3, 'F');

        pdf.addImage(aotLogo, 'PNG', logoX, logoY, logoWidth, logoHeight);
      }

      // Process each activity starting on new page
      for (let i = 0; i < bookActivitiesList.length; i++) {
        const activity = bookActivitiesList[i];

        // Add new page and reset coordinate system
        pdf.addPage();

        const pageWidth = pdf.internal.pageSize.width;
        const pageHeight = pdf.internal.pageSize.height;
        const isPhone = config.format === "phone";

        // Responsive margins
        const margin = isPhone ? 10 : 20;
        let currentY = margin; // Reset Y position for new page
        const contentWidth = pageWidth - (2 * margin);
        const spacing = config.contentDensity === "compact" ? 5 : 
                       config.contentDensity === "spacious" ? 15 : 10;

        // Fill background
        pdf.setFillColor(colors.background.r, colors.background.g, colors.background.b);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Calculate logo dimensions and position first for adaptive layout
        let logoInfo = null;
        if (aotLogo && aotLogo.complete) {
          const logoSizes = { small: 20, medium: 30, large: 40 };
          const logoWidth = logoSizes[config.logoSize];
          const logoHeight = (234/227) * logoWidth;

          // Add padding for the black background
          const bgPadding = 4;
          const bgWidth = logoWidth + (bgPadding * 2);
          const bgHeight = logoHeight + (bgPadding * 2);

          let logoX = margin;
          let logoY = margin;
          let bgX = logoX - bgPadding;
          let bgY = logoY - bgPadding;

          if (config.logoCorner === "topRight") {
            logoX = pageWidth - margin - logoWidth;
            bgX = logoX - bgPadding;
          } else if (config.logoCorner === "bottomLeft") {
            logoY = pageHeight - margin - logoHeight;
            bgY = logoY - bgPadding;
          } else if (config.logoCorner === "bottomRight") {
            logoX = pageWidth - margin - logoWidth;
            logoY = pageHeight - margin - logoHeight;
            bgX = logoX - bgPadding;
            bgY = logoY - bgPadding;
          }

          logoInfo = {
            logoX, logoY, logoWidth, logoHeight,
            bgX, bgY, bgWidth, bgHeight
          };
        }

        

        // Calculate adaptive content area based on logo position
        let titleContentWidth = contentWidth;
        let titleStartY = currentY;

        if (logoInfo) {
          const isTopLogo = config.logoCorner === "topLeft" || config.logoCorner === "topRight";
          const isRightLogo = config.logoCorner === "topRight" || config.logoCorner === "bottomRight";

          if (isTopLogo) {
            // If logo is at top, ensure content starts below it or doesn't overlap
            const logoBottomY = logoInfo.bgY + logoInfo.bgHeight + spacing;
            if (isRightLogo) {
              // Logo is top-right, reduce title width and check vertical clearance
              titleContentWidth = contentWidth - logoInfo.bgWidth - spacing;
            } else {
              // Logo is top-left, move content start point if needed
              titleStartY = Math.max(currentY, logoBottomY);
            }
          } else if (isRightLogo) {
            // Logo is bottom-right, reduce content width but don't affect top positioning
            titleContentWidth = contentWidth - logoInfo.bgWidth - spacing;
          }
        }

        currentY = titleStartY;

        // Add header with title (with adaptive width)
        const titleFontSize = isPhone ? 18 : 24;
        pdf.setFont(config.fontName, 'bold');
        pdf.setFontSize(titleFontSize);
        pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);

        // Wrap title text with adaptive width
        const titleLines = pdf.splitTextToSize(activity.name, titleContentWidth);
        titleLines.forEach((line: string, index: number) => {
          pdf.text(line, margin, currentY + (index + 1) * (titleFontSize * 0.4));
        });
        currentY += titleLines.length * (titleFontSize * 0.4) + spacing;

        // Add logo in corner with black rounded background
        if (logoInfo) {
          // Draw black rounded square background
          pdf.setFillColor(0, 0, 0); // Black background
          pdf.roundedRect(logoInfo.bgX, logoInfo.bgY, logoInfo.bgWidth, logoInfo.bgHeight, 3, 3, 'F');

          if (config.logoAsWatermark) {
            pdf.saveGraphicsState();
            pdf.setGState(new pdf.GState({ opacity: 0.2 }));
          }

          pdf.addImage(aotLogo, 'PNG', logoInfo.logoX, logoInfo.logoY, logoInfo.logoWidth, logoInfo.logoHeight);

          if (config.logoAsWatermark) {
            pdf.restoreGraphicsState();
          }
        }

        // Category section
        if (activity.category) {
          pdf.setFont(config.fontName, 'normal');
          pdf.setFontSize(config.fontSize);
          pdf.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
          pdf.text(`Category: ${activity.category}`, margin, currentY);
          currentY += spacing;
        }

        // Divider line
        pdf.setDrawColor(colors.surface.r, colors.surface.g, colors.surface.b);
        pdf.setLineWidth(0.5);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += spacing;

        // Instructions section (if placement is before image)
        if (config.showInstructions && activity.recipes?.[0]?.instructions && 
            config.instructionsPlacement !== "belowImage") {
          pdf.setFont(config.fontName, 'bold');
          pdf.setFontSize(config.instructionsFontSize + 2);
          pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);
          pdf.text("Instructions:", margin, currentY);
          currentY += spacing / 2;

          // Instructions content
          pdf.setFont(config.fontName, 'normal');
          pdf.setFontSize(config.instructionsFontSize);
          const instructionText = activity.recipes[0].instructions.replace(/^\*+\s*/, '').trim();
          const instructionLines = pdf.splitTextToSize(instructionText, contentWidth);

          const maxLines = config.instructionMaxLines || instructionLines.length;
          const displayLines = instructionLines.slice(0, maxLines);

          displayLines.forEach((line: string) => {
            pdf.text(line, margin, currentY);
            currentY += config.instructionsFontSize * 0.4;
          });

          if (instructionLines.length > maxLines) {
            pdf.text("...", margin, currentY);
            currentY += config.instructionsFontSize * 0.4;
          }

          currentY += spacing;
        }

        // Add image with strict no-overlap positioning
        if (activity.images && activity.images.length > 0) {
          try {
            const img = await loadImage(activity.images[0].path);
            if (img && img.complete && img.width > 0) {
              // Start with full content area
              let availableWidth = contentWidth;
              let availableHeight = pageHeight - currentY - margin - 40;
              let contentStartX = margin;
              let imageStartY = currentY;

              // Add minimum spacing buffer before checking logo overlap
              const minVerticalSpacing = spacing * 2; // Increased from just 'spacing'

              // If logo exists, create exclusion zones with proper spacing
              if (logoInfo) {
                const logoLeft = logoInfo.bgX;
                const logoRight = logoInfo.bgX + logoInfo.bgWidth;
                const logoTop = logoInfo.bgY;
                const logoBottom = logoInfo.bgY + logoInfo.bgHeight;

                // Check if current image position would intersect with logo
                const imageLeft = margin;
                const imageRight = pageWidth - margin;
                const imageTop = currentY;

                // Calculate initial image dimensions to check for overlap
                const tempImageSizes = {
                  small: { width: contentWidth * 0.5, maxHeight: 80 },
                  medium: { width: contentWidth * 0.8, maxHeight: 120 },
                  large: { width: contentWidth, maxHeight: 160 }
                };

                const tempSizeConfig = tempImageSizes[config.imageSize];
                let tempImgWidth = tempSizeConfig.width;
                let tempImgHeight = (img.height * tempImgWidth) / img.width;

                if (tempImgHeight > tempSizeConfig.maxHeight) {
                  tempImgHeight = tempSizeConfig.maxHeight;
                  tempImgWidth = (img.width * tempImgHeight) / img.height;
                }

                const imageBottom = imageTop + tempImgHeight;
                const imageCenterX = margin + (contentWidth - tempImgWidth) / 2;
                const imageLeftEdge = imageCenterX;
                const imageRightEdge = imageCenterX + tempImgWidth;

                // Check for overlap with INCREASED spacing requirements
                const horizontalOverlap = !(imageRightEdge < logoLeft - minVerticalSpacing || imageLeftEdge > logoRight + minVerticalSpacing);
                const verticalOverlap = !(imageBottom < logoTop - minVerticalSpacing || imageTop > logoBottom + minVerticalSpacing);

                if (horizontalOverlap && verticalOverlap) {
                  // There is overlap - we need to fix this with better spacing

                  if (config.logoCorner === "topLeft") {
                    // Move image to the right of logo or below it with proper spacing
                    const spaceToRight = pageWidth - margin - logoRight - (minVerticalSpacing * 2);

                    if (spaceToRight >= tempImgWidth * 0.5) {
                      // Move to right of logo with extra spacing
                      contentStartX = logoRight + (minVerticalSpacing * 2);
                      availableWidth = pageWidth - contentStartX - margin;
                    } else {
                      // Move below logo with extra spacing
                      imageStartY = logoBottom + (minVerticalSpacing * 2);
                      availableHeight = pageHeight - imageStartY - margin - 40;
                    }
                  }
                  else if (config.logoCorner === "topRight") {
                    // Move image to the left of logo or below it with proper spacing
                    const spaceToLeft = logoLeft - margin - (minVerticalSpacing * 2);

                    if (spaceToLeft >= tempImgWidth * 0.5) {
                      // Keep left aligned but reduce width with extra spacing buffer
                      availableWidth = logoLeft - margin - (minVerticalSpacing * 2);
                    } else {
                      // Move below logo with extra spacing
                      imageStartY = logoBottom + (minVerticalSpacing * 2);
                      availableHeight = pageHeight - imageStartY - margin - 40;
                    }
                  }
                  else if (config.logoCorner === "bottomLeft") {
                    // Move image to the right of logo or ensure it stays above with spacing
                    const spaceToRight = pageWidth - margin - logoRight - (minVerticalSpacing * 2);
                    const spaceAbove = logoTop - currentY - (minVerticalSpacing * 2);

                    if (spaceToRight >= tempImgWidth * 0.5) {
                      // Move to right of logo with extra spacing
                      contentStartX = logoRight + (minVerticalSpacing * 2);
                      availableWidth = pageWidth - contentStartX - margin;
                    } else if (spaceAbove >= tempImgHeight + (minVerticalSpacing * 2)) {
                      // Keep current position but ensure height doesn't go into logo area
                      availableHeight = logoTop - currentY - (minVerticalSpacing * 2);
                    } else {
                      // Force to right with smaller size and extra spacing
                      contentStartX = logoRight + (minVerticalSpacing * 2);
                      availableWidth = pageWidth - contentStartX - margin;
                    }
                  }
                  else if (config.logoCorner === "bottomRight") {
                    // Move image to the left of logo or ensure it stays above with spacing
                    const spaceToLeft = logoLeft - margin - (minVerticalSpacing * 2);
                    const spaceAbove = logoTop - currentY - (minVerticalSpacing * 2);

                    if (spaceToLeft >= tempImgWidth * 0.5) {
                      // Reduce width to fit left of logo with extra spacing
                      availableWidth = logoLeft - margin - (minVerticalSpacing * 2);
                    } else if (spaceAbove >= tempImgHeight + (minVerticalSpacing * 2)) {
                      // Keep current position but ensure height doesn't go into logo area
                      availableHeight = logoTop - currentY - (minVerticalSpacing * 2);
                    } else {
                      // Force smaller width with extra spacing
                      availableWidth = logoLeft - margin - (minVerticalSpacing * 2);
                    }
                  }
                }

                // Additional safety check: if we're still too close to top logos, add more vertical spacing
                const isTopLogo = config.logoCorner === "topLeft" || config.logoCorner === "topRight";
                if (isTopLogo && imageStartY < logoBottom + minVerticalSpacing) {
                  imageStartY = logoBottom + minVerticalSpacing;
                  availableHeight = pageHeight - imageStartY - margin - 40;
                }
              }

              // Now calculate final image size with safe dimensions
              const imageSizes = {
                small: { width: Math.min(availableWidth * 0.5, availableWidth), maxHeight: Math.min(80, availableHeight * 0.3) },
                medium: { width: Math.min(availableWidth * 0.8, availableWidth), maxHeight: Math.min(120, availableHeight * 0.5) },
                large: { width: availableWidth, maxHeight: Math.min(160, availableHeight * 0.7) }
              };

              const sizeConfig = imageSizes[config.imageSize];
              let imgWidth = Math.max(sizeConfig.width, 50); // Minimum width
              let imgHeight = (img.height * imgWidth) / img.width;

              if (imgHeight > sizeConfig.maxHeight) {
                imgHeight = sizeConfig.maxHeight;
                imgWidth = (img.width * imgHeight) / img.height;
              }

              // Center the image within the available safe space
              const imgX = contentStartX + Math.max(0, (availableWidth - imgWidth) / 2);

              // Update currentY to the calculated safe image start position
              currentY = imageStartY;

              // Add frame/shadow if needed
              if (config.imageFrameStyle === "border") {
                pdf.setDrawColor(colors.surface.r, colors.surface.g, colors.surface.b);
                pdf.setLineWidth(1);
                pdf.rect(imgX - 2, currentY - 2, imgWidth + 4, imgHeight + 4, 'S');
              } else if (config.imageFrameStyle === "shadow") {
                pdf.setFillColor(230, 230, 230);
                pdf.rect(imgX + 2, currentY + 2, imgWidth, imgHeight, 'F');
              }

              pdf.addImage(img, 'JPEG', imgX, currentY, imgWidth, imgHeight);
              currentY += imgHeight + spacing;
            }
          } catch (error) {
            console.error('Failed to add image:', error);
          }
        }

        // Instructions section (if placement is below image)
        if (config.showInstructions && activity.recipes?.[0]?.instructions && 
            config.instructionsPlacement === "belowImage") {
          pdf.setFont(config.fontName, 'bold');
          pdf.setFontSize(config.instructionsFontSize + 2);
          pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);
          pdf.text("Instructions:", margin, currentY);
          currentY += spacing / 2;

          // Instructions content
          pdf.setFont(config.fontName, 'normal');
          pdf.setFontSize(config.instructionsFontSize);
          const instructionText = activity.recipes[0].instructions.replace(/^\*+\s*/, '').trim();
          const instructionLines = pdf.splitTextToSize(instructionText, contentWidth);

          const maxLines = config.instructionMaxLines || instructionLines.length;
          const displayLines = instructionLines.slice(0, maxLines);

          displayLines.forEach((line: string) => {
            pdf.text(line, margin, currentY);
            currentY += config.instructionsFontSize * 0.4;
          });

          if (instructionLines.length > maxLines) {
            pdf.text("...", margin, currentY);
            currentY += config.instructionsFontSize * 0.4;
          }

          currentY += spacing;
        }

        // Activity Steps (Ingredients) section
        if (config.showIngredients && activity.recipes?.[0]?.ingredients) {
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

          if (ingredientsArray.length > 0) {
            // Title for ingredients section
            pdf.setFont(config.fontName, 'bold');
            pdf.setFontSize(config.ingredientFontSize + 2);
            pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);
            pdf.text("Activity Steps:", margin, currentY);
            currentY += spacing;

            // Draw each ingredient/step
            pdf.setFont(config.fontName, 'normal');
            pdf.setFontSize(config.ingredientFontSize);

            ingredientsArray.forEach((ingredient, index) => {
              if (!ingredient || typeof ingredient !== 'string') return;

              const cleanedIngredient = ingredient.replace(/^\*+\s*/, '').trim();

              // Calculate wrapped text first
              const stepTextX = margin + 15; // Reduced from 20 to 15 for smaller circles
              const availableWidth = contentWidth - 20; // Adjusted for smaller spacing
              const lines = pdf.splitTextToSize(cleanedIngredient, availableWidth);

              // Draw background pill if not outlined style
              if (config.ingredientPillStyle !== "outlined") {
                const pillHeight = lines.length * (config.ingredientFontSize * 0.4) + 6;
                pdf.setFillColor(colors.ingredientBg.r, colors.ingredientBg.g, colors.ingredientBg.b);

                if (config.ingredientPillStyle === "rounded") {
                  pdf.roundedRect(margin, currentY - 4, contentWidth, pillHeight, 3, 3, 'F');
                } else {
                  pdf.rect(margin, currentY - 4, contentWidth, pillHeight, 'F');
                }
              }

              // Draw smaller number circles or bullets
              if (config.listStyle === "numbers") {
                pdf.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
                pdf.circle(margin + 6, currentY, 4, 'F'); // Reduced from 6 radius to 4
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(config.ingredientFontSize - 3); // Reduced font size for smaller circle
                pdf.text(`${index + 1}`, margin + 6, currentY + 1.5, { align: 'center' });
              } else if (config.listStyle === "bullets") {
                pdf.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
                pdf.circle(margin + 6, currentY, 2, 'F'); // Reduced from 3 radius to 2
              }

              // Draw text
              pdf.setTextColor(colors.ingredientText.r, colors.ingredientText.g, colors.ingredientText.b);
              pdf.setFontSize(config.ingredientFontSize);
              lines.forEach((line, lineIndex) => {
                pdf.text(line, stepTextX, currentY + (lineIndex * (config.ingredientFontSize * 0.4)));
              });

              currentY += lines.length * (config.ingredientFontSize * 0.4) + spacing / 2;
            });

            currentY += spacing;
          }
        }

        // Page number
        if (config.showPageNumbers) {
          pdf.setFont(config.fontName, 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(150, 150, 150);
          const pageText = `Page ${i + 1} of ${bookActivitiesList.length}`;
          const textWidth = pdf.getTextWidth(pageText);
          pdf.text(pageText, (pageWidth - textWidth) / 2, pageHeight - 10);
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

      const fullSrc = src.startsWith('http') ? src : 
                     src.startsWith('/') ? `${window.location.origin}${src}` : 
                     `${window.location.origin}/${src}`;

      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error(`Failed to load image: ${fullSrc}`);
        resolve(null as any);
      };

      img.src = fullSrc;

      setTimeout(() => {
        if (!img.complete) {
          resolve(null as any);
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
      <div className="max-w-6xl mx-auto w-full">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/book-report")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Report
        </Button>

        <h1 className="text-2xl font-bold mb-6">Export PDF Configuration</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <label htmlFor="format-letter">Letter (8.5" × 11")</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="format-phone" />
                    <label htmlFor="format-phone">Phone (Mobile)</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => setConfig({...config, backgroundColor: e.target.value})}
                      className="h-10 w-20"
                    />
                    <span className="text-sm text-gray-600">{config.backgroundColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="color"
                      value={config.textColor}
                      onChange={(e) => setConfig({...config, textColor: e.target.value})}
                      className="h-10w-20"
                    />
                    <span className="text-sm text-gray-600">{config.textColor}</span>
                  </div>
                </div>
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
                <label className="block text-sm font-medium mb-1">Image Settings</label>
                <div className="space-y-2 pl-4">
                  <RadioGroup 
                    value={config.imageSize}
                    onValueChange={(value: "small" | "medium" | "large") => setConfig({...config, imageSize: value})}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="img-small" />
                      <label htmlFor="img-small">Small</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="img-medium" />
                      <label htmlFor="img-medium">Medium</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="img-large" />
                      <label htmlFor="img-large">Large</label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Logo Settings</label>
                <div className="space-y-2 pl-4">
                  <Select
                    value={config.logoCorner}
                    onValueChange={(value: "topLeft" | "topRight" | "bottomLeft" | "bottomRight") => 
                      setConfig({ ...config, logoCorner: value })}
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

                  <RadioGroup 
                    value={config.logoSize}
                    onValueChange={(value: "small" | "medium" | "large") => 
                      setConfig({...config, logoSize: value})}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="logo-small" />
                      <label htmlFor="logo-small">Small</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="logo-medium" />
                      <label htmlFor="logo-medium">Medium</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="logo-large" />
                      <label htmlFor="logo-large">Large</label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-md font-semibold mb-3">Content Settings</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Show Instructions</span>
                    <Checkbox
                      checked={config.showInstructions}
                      onCheckedChange={(checked) => 
                        setConfig({...config, showInstructions: checked === true})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Show Activity Steps</span>
                    <Checkbox
                      checked={config.showIngredients}
                      onCheckedChange={(checked) => 
                        setConfig({...config, showIngredients: checked === true})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Show Page Numbers</span>
                    <Checkbox
                      checked={config.showPageNumbers}
                      onCheckedChange={(checked) => 
                        setConfig({...config, showPageNumbers: checked === true})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-md font-semibold mb-3">Style Settings</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                        className="h-10 w-20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Surface Color</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="color"
                        value={config.surfaceColor}
                        onChange={(e) => setConfig({...config, surfaceColor: e.target.value})}
                        className="h-10 w-20"
                      />
                    </div>
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
              </div>
            </div>

            <Button
              onClick={generatePDF}
              disabled={isGenerating || bookActivitiesList.length === 0}
              className="w-full mt-6"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating PDF...' : 'Generate PDF'}
            </Button>
          </Card>

          <div ref={previewRef}>
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            <div className="space-y-4 max-h-[800px] overflow-y-auto border rounded-lg p-4 bg-white">
              {bookActivitiesList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activities selected for this book</p>
              ) : (
                bookActivitiesList.map(activity => (
                  <Card key={activity.id} className="p-6" style={{ backgroundColor: config.backgroundColor }}>
                    <h3 className="font-bold text-xl mb-2" style={{ color: config.textColor }}>
                      {activity.name}
                    </h3>

                    {activity.category && (
                      <p className="text-sm mb-3" style={{ color: config.primaryColor }}>
                        Category: {activity.category}
                      </p>
                    )}

                    <hr className="my-3" style={{ borderColor: config.surfaceColor }} />

                    {/* Instructions */}
                    {config.showInstructions && activity.recipes?.[0]?.instructions && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2" style={{ color: config.textColor }}>
                          Instructions:
                        </h4>
                        <p className="text-sm" style={{ color: config.textColor, opacity: 0.9 }}>
                          {activity.recipes[0].instructions}
                        </p>
                      </div>
                    )}

                    {/* Image */}
                    {activity.images?.[0] && (
                      <div className="mb-4">
                        <img 
                          src={activity.images[0].path} 
                          alt={activity.name}
                          className={`rounded-md w-full object-cover ${
                            config.imageSize === 'small' ? 'max-h-32' : 
                            config.imageSize === 'medium' ? 'max-h-48' : 
                            'max-h-64'
                          }`}
                          style={{
                            filter: config.imageMode === 'blackAndWhite' ? 'grayscale(100%)' : 'none',
                            boxShadow: config.imageFrameStyle === 'shadow' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
                            border: config.imageFrameStyle === 'border' ? '2px solid #e5e7eb' : 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Activity Steps */}
                    {config.showIngredients && activity.recipes?.[0]?.ingredients && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2" style={{ color: config.textColor }}>
                          Activity Steps:
                        </h4>
                        <div className="space-y-2">
                          {(() => {
                            const ingredients = activity.recipes[0].ingredients;
                            let ingredientsArray: string[] = [];

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

                            return ingredientsArray.map((ingredient, idx) => (
                              <div 
                                key={idx}
                                className={`flex items-start gap-3 p-2 ${
                                  config.ingredientPillStyle === 'rounded' ? 'rounded-md' : ''
                                }`}
                                style={{
                                  backgroundColor: config.ingredientPillStyle !== 'outlined' ? config.ingredientBgColor : 'transparent',
                                  border: config.ingredientPillStyle === 'outlined' ? `1px solid ${config.ingredientBgColor}` : 'none'
                                }}
                              >
                                {config.listStyle === 'numbers' && (
                                  <span 
                                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                                    style={{ backgroundColor: config.primaryColor }}
                                  >
                                    {idx + 1}
                                  </span>
                                )}
                                {config.listStyle === 'bullets' && (
                                  <span 
                                    className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                                    style={{ backgroundColor: config.primaryColor }}
                                  />
                                )}
                                <span className="text-sm" style={{ color: config.ingredientTextColor }}>
                                  {typeof ingredient === 'string' ? ingredient.replace(/^\*+\s*/, '').trim() : ''}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}