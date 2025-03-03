import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useUser } from "@/context/user-context";
import { calculatePercentageLived, formatSundialTime, calculateLifetimeHours } from "@/lib/calculations";
import { Activity } from "@shared/schema";

interface SundialChartProps {
  className?: string;
}

// Helper function to get color for ring based on activity color
const getColorFromName = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    red: "#EF4444",
    blue: "#3B82F6",
    green: "#10B981",
    yellow: "#F59E0B",
    purple: "#8B5CF6",
    pink: "#EC4899",
    indigo: "#6366F1",
    gray: "#6B7280",
    orange: "#F97316",
    teal: "#14B8A6",
    cyan: "#06B6D4",
    lime: "#84CC16",
    emerald: "#10B981",
    rose: "#F43F5E",
    sky: "#0EA5E9",
    amber: "#F59E0B",
    violet: "#8B5CF6",
    fuchsia: "#D946EF",
  };
  
  // Default to a vibrant blue if color not found
  return colorMap[colorName] || "#3B82F6";
};

// Helper to find the total hours for all activities
const getTotalActivityHours = (activities: Activity[], userData: any): number => {
  return activities.reduce((total, activity) => total + calculateLifetimeHours(userData, activity), 0);
};

const SundialChart = ({ className = "" }: SundialChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { userData, activities } = useUser();
  const [tooltipData, setTooltipData] = useState<{ activity: Activity; x: number; y: number } | null>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const radius = Math.min(width, height) / 2 - 30;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create a group for the entire sundial
    const sundial = svg.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`);
    
    // Define some base colors for the sundial
    const baseColor = "#D1D5DB";
    const plateColor = "#F3F4F6";
    const shadowColor = "#4B5563";
    const markerColor = "#6B7280";
    const gnomonColor = "#9CA3AF";
    
    // Create gradient for the base plate
    const plateGradient = svg.append("defs")
      .append("radialGradient")
      .attr("id", "plate-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%")
      .attr("fx", "25%")
      .attr("fy", "25%");
      
    plateGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#F9FAFB");
      
    plateGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#E5E7EB");
    
    // Draw the sundial plate (half circle)
    const plateArc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
      .startAngle(0)
      .endAngle(Math.PI);
    
    sundial.append("path")
      .attr("d", plateArc as any)
      .attr("fill", "url(#plate-gradient)")
      .attr("stroke", baseColor)
      .attr("stroke-width", 2);
    
    // Draw hour lines (like a real sundial)
    const hourMarks = 12;
    const hourAngle = Math.PI / hourMarks;
    
    for (let hour = 0; hour <= hourMarks; hour++) {
      const angle = hour * hourAngle;
      const lineLength = radius * 0.9;
      const x2 = lineLength * Math.cos(angle);
      const y2 = lineLength * Math.sin(angle);
      
      sundial.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", markerColor)
        .attr("stroke-width", hour % 3 === 0 ? 2 : 1)
        .attr("opacity", 0.6);
      
      // Add hour numbers at major marks
      if (hour % 3 === 0 || hour === 0 || hour === hourMarks) {
        const textDistance = radius * 0.95;
        const tx = textDistance * Math.cos(angle);
        const ty = textDistance * Math.sin(angle);
        
        sundial.append("text")
          .attr("x", tx)
          .attr("y", ty)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "#374151")
          .attr("font-size", "10px")
          .attr("font-weight", hour % 3 === 0 ? "bold" : "normal")
          .text(hour === 0 ? "Birth" : hour === hourMarks / 2 ? "Mid-Life" : hour === hourMarks ? "End" : hour.toString());
      }
    }
    
    // Draw the gnomon (the triangular part of a sundial)
    const gnomonHeight = radius * 0.6;
    const gnomonBase = radius * 0.2;
    
    // Create gradient for the gnomon
    const gnomonGradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "gnomon-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
    
    gnomonGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#9CA3AF");
    
    gnomonGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#4B5563");
    
    // Gnomon
    sundial.append("path")
      .attr("d", `M0,0 L${gnomonHeight},0 L0,${-gnomonBase} Z`)
      .attr("fill", "url(#gnomon-gradient)")
      .attr("stroke", "#4B5563")
      .attr("stroke-width", 1);
    
    // Sort activities by lifetime hours (largest first) to ensure smaller rings are on top
    const sortedActivities = [...activities].sort(
      (a, b) => calculateLifetimeHours(userData, b) - calculateLifetimeHours(userData, a)
    );
    
    // Calculate total hours across all activities for scaling
    const totalActivityHours = getTotalActivityHours(activities, userData);
    const totalLifeHours = userData.lifeExpectancy * 365.25 * (24 - userData.sleepHours);
    
    // Create activity arcs around the semi-circle
    const arcMaxWidth = radius * 0.2; // Maximum width of each arc
    const arcPadding = 2; // Padding between arcs
    let currentOuterRadius = radius; // Start at the outer edge
    
    if (sortedActivities.length > 0) {
      // Create a legend group
      const legend = svg.append("g")
        .attr("transform", `translate(${width - 120}, 20)`);
      
      legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-weight", "bold")
        .attr("font-size", "12px")
        .text("Activities");
    }
    
    sortedActivities.forEach((activity, i) => {
      const activityHours = calculateLifetimeHours(userData, activity);
      
      // Scale the arc width based on the activity's proportion of total hours
      const arcWidth = Math.max(
        5, // Minimum 5px width
        Math.min(
          arcMaxWidth, // Maximum width
          (activityHours / totalLifeHours) * (radius * 0.5) // Scaled by proportion of life
        )
      );
      
      const innerRadius = currentOuterRadius - arcWidth;
      
      // Create an arc generator for this activity
      const arcGenerator = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(currentOuterRadius)
        .startAngle(0) // Start at the right
        .endAngle(Math.PI); // End at the left (180 degrees around)
      
      // Add the activity arc
      const arc = sundial.append("path")
        .datum({ activity, innerRadius, outerRadius: currentOuterRadius })
        .attr("d", arcGenerator as any)
        .attr("fill", getColorFromName(activity.color))
        .attr("opacity", 0.8)
        .attr("stroke", "#FFF")
        .attr("stroke-width", 1)
        .style("cursor", "pointer");
      
      // Add mouseover events for tooltip
      arc
        .on("mouseover", function(this: any, event: any) {
          d3.select(this).attr("opacity", 1);
          setTooltipData({
            activity,
            x: event.pageX,
            y: event.pageY
          });
        })
        .on("mouseout", function(this: any) {
          d3.select(this).attr("opacity", 0.8);
          setTooltipData(null);
        });
      
      // Add to legend
      if (sortedActivities.length > 0) {
        const legendItem = svg.select("g").append("g")
          .attr("transform", `translate(0, ${i * 20 + 20})`);
        
        legendItem.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", getColorFromName(activity.color));
        
        legendItem.append("text")
          .attr("x", 18)
          .attr("y", 10)
          .attr("font-size", "10px")
          .text(`${activity.name}`);
      }
      
      // Update the current outer radius for the next arc
      currentOuterRadius = innerRadius - arcPadding;
    });
    
    // Calculate shadow angle based on percentage of life lived
    const percentLived = calculatePercentageLived(userData);
    const shadowAngle = Math.PI - (percentLived / 100) * Math.PI; // Angle for the shadow (from left to right)
    
    // Draw the shadow line (shows current time/progress)
    const shadowLength = radius * 0.95;
    const shadowX = shadowLength * Math.cos(shadowAngle);
    const shadowY = shadowLength * Math.sin(shadowAngle);
    
    // Shadow path
    const shadowPath = sundial.append("path")
      .attr("d", `M0,0 L${shadowX},${shadowY}`)
      .attr("stroke", shadowColor)
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round")
      .attr("fill", "none");
    
    // Add a marker at the end of the shadow
    sundial.append("circle")
      .attr("cx", shadowX)
      .attr("cy", shadowY)
      .attr("r", 5)
      .attr("fill", shadowColor);
    
    // Add percentage and current position text near the shadow
    const textX = shadowX * 0.7;
    const textY = shadowY * 0.7 - 15; // Offset a bit above the shadow line
    
    sundial.append("text")
      .attr("x", textX)
      .attr("y", textY)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#1F2937")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(`${Math.round(percentLived)}%`);
    
    // Digital time display at the bottom
    sundial.append("foreignObject")
      .attr("x", -radius/2)
      .attr("y", radius * 0.6)
      .attr("width", radius)
      .attr("height", 60)
      .html(`
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #1F2937;">${formatSundialTime(userData)}</div>
          <div style="font-size: 12px; color: #6B7280;">Your Life Time</div>
        </div>
      `);
      
  }, [userData, activities]);
  
  return (
    <div className={`relative w-full aspect-square max-w-lg mx-auto ${className}`}>
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" />
      
      {/* Tooltip */}
      {tooltipData && (
        <div 
          className="absolute bg-white shadow-lg rounded-md p-2 z-10 text-sm"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none"
          }}
        >
          <p className="font-bold">{tooltipData.activity.name}</p>
          <p>Frequency: {tooltipData.activity.frequency} {tooltipData.activity.frequencyUnit}(s)</p>
          <p>Duration: {tooltipData.activity.duration} {tooltipData.activity.durationUnit}(s)</p>
          <p>Lifetime hours: {calculateLifetimeHours(userData, tooltipData.activity)} hours</p>
          {tooltipData.activity.lifeImpact !== 0 && (
            <p className={tooltipData.activity.lifeImpact > 0 ? "text-green-600" : "text-red-600"}>
              Life impact: {tooltipData.activity.lifeImpact > 0 ? "+" : ""}{tooltipData.activity.lifeImpact} years
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SundialChart;
