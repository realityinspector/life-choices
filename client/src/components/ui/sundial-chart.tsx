import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useUser } from "@/context/user-context";
import { calculatePercentageLived, formatSundialTime, calculateLifetimeHours } from "@/lib/calculations";
import { Activity } from "@shared/schema";

interface SundialChartProps {
  className?: string;
}

// Helper function to get color for activity based on color name
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
    
    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Calculate percentage of life lived
    const percentageLived = calculatePercentageLived(userData);
    
    // Setup constants and colors
    const width = 600;
    const height = 350;
    const margin = { top: 40, right: 50, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Colors
    const lightBlue = "#e0f2fe";
    const darkBlue = "#3B82F6";
    const progressColor = "#4F46E5";
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    
    // Create chart group
    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Create X scale - Life timeline from Birth to End
    const xScale = d3.scaleLinear()
      .domain([0, 100])  // Percentage of life
      .range([0, chartWidth]);
    
    // Background grid
    chart.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#f9fafb")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1);
    
    // Draw grid lines
    for (let i = 0; i <= 10; i++) {
      const x = xScale(i * 10);
      
      chart.append("line")
        .attr("x1", x)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", chartHeight)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", i % 5 === 0 ? 1 : 0.5)
        .attr("stroke-dasharray", i % 5 === 0 ? "none" : "3,3");
    }
    
    // Add birth, mid-life and end labels
    chart.append("text")
      .attr("x", 0)
      .attr("y", chartHeight + 20)
      .attr("text-anchor", "start")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("Birth");
    
    chart.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("Mid-Life");
    
    chart.append("text")
      .attr("x", chartWidth)
      .attr("y", chartHeight + 20)
      .attr("text-anchor", "end")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("End");
    
    // Calculate total hours across all activities for scaling
    const totalActivityHours = getTotalActivityHours(activities, userData);
    const totalLifeHours = userData.lifeExpectancy * 365.25 * (24 - userData.sleepHours);
    
    // Sort activities by lifetime hours (largest first)
    const sortedActivities = [...activities].sort(
      (a, b) => calculateLifetimeHours(userData, b) - calculateLifetimeHours(userData, a)
    );
    
    // Activity bands - horizontal orientation
    const activityHeight = Math.min(20, chartHeight / (sortedActivities.length || 1));
    const activityPadding = 5;
    const activitySection = chartHeight * 0.6; // Use 60% of chart height for activities
    const startY = (chartHeight - activitySection) / 2;
    
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
      const proportionOfLife = activityHours / totalLifeHours;
      
      // Y position for this activity
      const y = startY + i * (activityHeight + activityPadding);
      
      // Activity band
      const band = chart.append("rect")
        .datum(activity)
        .attr("x", 0)
        .attr("y", y)
        .attr("width", chartWidth)
        .attr("height", activityHeight)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", "#f3f4f6")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1);
      
      // Filled portion of activity based on proportion
      chart.append("rect")
        .datum({ activity, y })
        .attr("x", 0)
        .attr("y", y)
        .attr("width", chartWidth * proportionOfLife)
        .attr("height", activityHeight)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", getColorFromName(activity.color))
        .attr("opacity", 0.8)
        .style("cursor", "pointer")
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
      
      // Activity name on the band
      chart.append("text")
        .attr("x", 5)
        .attr("y", y + activityHeight / 2)
        .attr("fill", "#111827")
        .attr("font-size", "10px")
        .attr("dominant-baseline", "middle")
        .text(activity.name);
      
      // Add to legend
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
    });
    
    // Life progress indicator (top of chart)
    // Background track
    chart.append("rect")
      .attr("x", 0)
      .attr("y", -20)
      .attr("width", chartWidth)
      .attr("height", 10)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", lightBlue)
      .attr("opacity", 0.3);
    
    // Progress fill
    chart.append("rect")
      .attr("x", 0)
      .attr("y", -20)
      .attr("width", xScale(percentageLived))
      .attr("height", 10)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", darkBlue)
      .attr("opacity", 0.6);
    
    // Current position marker
    const currentX = xScale(percentageLived);
    
    // Vertical line at current position
    chart.append("line")
      .attr("x1", currentX)
      .attr("y1", -25)
      .attr("x2", currentX)
      .attr("y2", chartHeight)
      .attr("stroke", progressColor)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,3");
    
    // Current position marker (circle)
    chart.append("circle")
      .attr("cx", currentX)
      .attr("cy", -15)
      .attr("r", 6)
      .attr("fill", progressColor);
    
    // Add percentage text
    chart.append("text")
      .attr("x", currentX)
      .attr("y", -35)
      .attr("text-anchor", "middle")
      .attr("fill", "#1F2937")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(`${Math.round(percentageLived)}%`);
    
    // Digital time display at the bottom
    chart.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 45)
      .attr("text-anchor", "middle")
      .attr("fill", "#1F2937")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(formatSundialTime(userData));
    
    chart.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 65)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .attr("font-size", "12px")
      .text("Your Life Time");
    
  }, [userData, activities]);
  
  return (
    <div className={`relative w-full h-full min-h-[350px] ${className}`}>
      <svg ref={svgRef} className="w-full h-full" viewBox="0 0 600 350" preserveAspectRatio="xMidYMid meet" />
      
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
          <p>Lifetime hours: {calculateLifetimeHours(userData, tooltipData.activity).toLocaleString()} hours</p>
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