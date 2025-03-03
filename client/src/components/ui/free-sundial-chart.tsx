import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { UserData } from '@shared/schema';
import { calculatePercentageLived } from '@/lib/calculations';

interface FreeSundialChartProps {
  userData: UserData;
  className?: string;
}

const FreeSundialChart = ({ userData, className = "" }: FreeSundialChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Calculate percentage of life lived
    const percentageLived = calculatePercentageLived(userData);
    
    // Setup constants and colors
    const width = 600;
    const height = 300;  // Reduced for wider look
    const margin = { top: 40, right: 30, bottom: 40, left: 30 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Colors
    const lightBlue = "#e0f2fe";
    const darkBlue = "#3b82f6";
    const progressColor = "#4F46E5";
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    
    // Create chart group
    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Draw background
    chart.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("fill", "#f9fafb")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1);
    
    // Create X scale - Life timeline from Birth to End
    const xScale = d3.scaleLinear()
      .domain([0, 100])  // Percentage of life
      .range([0, chartWidth]);
    
    // Add birth and end labels
    chart.append("text")
      .attr("x", 0)
      .attr("y", chartHeight + 25)
      .attr("text-anchor", "start")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("Birth");
    
    chart.append("text")
      .attr("x", chartWidth)
      .attr("y", chartHeight + 25)
      .attr("text-anchor", "end")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("End");
    
    // Add mid-life label
    chart.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 25)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("Mid-Life");
    
    // Draw time markers (ticks)
    for (let i = 0; i <= 10; i++) {
      const x = xScale(i * 10);
      
      chart.append("line")
        .attr("x1", x)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", i % 5 === 0 ? 10 : 5)  // Longer lines for major ticks
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", i % 5 === 0 ? 2 : 1);
      
      chart.append("line")
        .attr("x1", x)
        .attr("y1", chartHeight)
        .attr("x2", x)
        .attr("y2", chartHeight - (i % 5 === 0 ? 10 : 5))
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", i % 5 === 0 ? 2 : 1);
      
      // Add percentage labels for major ticks
      if (i % 5 === 0) {
        chart.append("text")
          .attr("x", x)
          .attr("y", chartHeight / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "#6b7280")
          .attr("font-size", "10px")
          .text(`${i * 10}%`);
      }
    }
    
    // Draw life progress background
    chart.append("rect")
      .attr("x", 0)
      .attr("y", chartHeight / 4)
      .attr("width", chartWidth)
      .attr("height", chartHeight / 2)
      .attr("fill", lightBlue)
      .attr("opacity", 0.3)
      .attr("rx", 5)
      .attr("ry", 5);
    
    // Draw life progress
    chart.append("rect")
      .attr("x", 0)
      .attr("y", chartHeight / 4)
      .attr("width", xScale(percentageLived))
      .attr("height", chartHeight / 2)
      .attr("fill", darkBlue)
      .attr("opacity", 0.2)
      .attr("rx", 5)
      .attr("ry", 5);
    
    // Add current position marker
    const currentX = xScale(percentageLived);
    
    // Vertical line at current position
    chart.append("line")
      .attr("x1", currentX)
      .attr("y1", 0)
      .attr("x2", currentX)
      .attr("y2", chartHeight)
      .attr("stroke", progressColor)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,2");
    
    // Current position point
    chart.append("circle")
      .attr("cx", currentX)
      .attr("cy", chartHeight / 2)
      .attr("r", 8)
      .attr("fill", progressColor);
    
    // Add percentage text
    chart.append("text")
      .attr("x", currentX)
      .attr("y", chartHeight / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text(`${Math.round(percentageLived)}%`);
    
    // Add info banner at the top
    chart.append("rect")
      .attr("x", chartWidth * 0.3)
      .attr("y", -30)
      .attr("width", chartWidth * 0.4)
      .attr("height", 25)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", darkBlue)
      .attr("opacity", 0.1);
    
    chart.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -17)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#1e40af")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("Sign up for more features");
    
    // Add age display
    chart.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 60)
      .attr("text-anchor", "middle")
      .attr("fill", "#1F2937")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(`Age: ${userData.age} of ${userData.lifeExpectancy} years`);
    
  }, [userData]);

  return (
    <div className={`w-full h-full min-h-[350px] ${className}`}>
      <svg 
        ref={svgRef} 
        className="w-full h-full" 
        viewBox="0 0 600 300" 
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};

export default FreeSundialChart;