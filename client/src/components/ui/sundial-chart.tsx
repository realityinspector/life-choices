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
    const radius = Math.min(width, height) / 2 - 20;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create a group for the entire sundial
    const sundial = svg.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`);
    
    // Draw the main sundial circle
    sundial.append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#E5E7EB")
      .attr("stroke-width", 4);
    
    // Draw hour markers
    for (let hour = 0; hour < 24; hour++) {
      const angle = (hour * 15) * (Math.PI / 180);
      const x1 = (radius - 10) * Math.sin(angle);
      const y1 = -(radius - 10) * Math.cos(angle);
      const x2 = radius * Math.sin(angle);
      const y2 = -radius * Math.cos(angle);
      
      sundial.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "#D1D5DB")
        .attr("stroke-width", hour % 6 === 0 ? 2 : 1);
      
      // Add hour labels for main hours (12, 6, 18)
      if (hour % 6 === 0) {
        const labelX = (radius + 15) * Math.sin(angle);
        const labelY = -(radius + 15) * Math.cos(angle);
        
        sundial.append("text")
          .attr("x", labelX)
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "#4B5563")
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .text(hour === 0 ? "Birth" : hour === 12 ? "Mid-Life" : "Life Expectancy");
      }
    }
    
    // Sort activities by lifetime hours (largest first) to ensure smaller rings are on top
    const sortedActivities = [...activities].sort(
      (a, b) => calculateLifetimeHours(userData, b) - calculateLifetimeHours(userData, a)
    );
    
    // Calculate total hours across all activities for scaling
    const totalActivityHours = getTotalActivityHours(activities, userData);
    const totalLifeHours = userData.lifeExpectancy * 365.25 * (24 - userData.sleepHours);
    
    // Create activity rings as concentric circles
    let currentRadius = radius * 0.85; // Start rings at 85% of the main radius
    const minRingRadius = radius * 0.25; // Minimum ring size (25% of main radius)
    const ringSpacing = 5; // Space between rings
    
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
      // Scale the ring width based on the activity's proportion of total activities
      const ringWidth = Math.max(
        5, // Minimum 5px width
        Math.min(
          30, // Maximum 30px width
          (activityHours / totalLifeHours) * (radius * 0.6) // Scaled by proportion of life
        )
      );
      
      // Create an arc generator for this activity ring
      const arcGenerator = d3.arc()
        .innerRadius(currentRadius - ringWidth)
        .outerRadius(currentRadius)
        .startAngle(0)
        .endAngle(Math.PI); // Semi-circle (180 degrees)
      
      // Add the activity ring
      const ring = sundial.append("path")
        .datum({ activity, innerRadius: currentRadius - ringWidth, outerRadius: currentRadius })
        .attr("d", arcGenerator as any)
        .attr("fill", getColorFromName(activity.color))
        .attr("opacity", 0.8)
        .attr("stroke", "#FFF")
        .attr("stroke-width", 1)
        .style("cursor", "pointer");
      
      // Add mouseover events for tooltip
      ring
        .on("mouseover", function(event) {
          d3.select(this).attr("opacity", 1);
          setTooltipData({
            activity,
            x: event.pageX,
            y: event.pageY
          });
        })
        .on("mouseout", function() {
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
      
      // Update the current radius for the next ring
      currentRadius = currentRadius - ringWidth - ringSpacing;
      
      // Stop if we've reached the minimum ring size
      if (currentRadius < minRingRadius) {
        currentRadius = minRingRadius;
      }
    });
    
    // Current life position (hand)
    const percentLived = calculatePercentageLived(userData);
    const angle = (percentLived / 100) * Math.PI; // Convert to radians (0 to π)
    
    // Hand shaft
    sundial.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", radius * Math.sin(angle))
      .attr("y2", -radius * Math.cos(angle))
      .attr("stroke", "#2563EB")
      .attr("stroke-width", 2);
    
    // Hand knob
    sundial.append("circle")
      .attr("cx", radius * Math.sin(angle))
      .attr("cy", -radius * Math.cos(angle))
      .attr("r", 6)
      .attr("fill", "#2563EB");
    
    // Center display
    sundial.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "#1F2937")
      .attr("font-size", "24px")
      .attr("font-weight", "bold")
      .text(formatSundialTime(userData));
    
    sundial.append("text")
      .attr("x", 0)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .attr("font-size", "12px")
      .text("Your life time");
      
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
