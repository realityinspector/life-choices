import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useUser } from "@/context/user-context";
import { calculatePercentageLived, formatSundialTime } from "@/lib/calculations";

interface SundialChartProps {
  className?: string;
}

const SundialChart = ({ className = "" }: SundialChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { userData } = useUser();
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const radius = Math.min(width, height) / 2 - 10;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw the main sundial circle
    svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#E5E7EB")
      .attr("stroke-width", 4);
    
    // Draw hour markers
    for (let hour = 0; hour < 12; hour++) {
      const angle = (hour * 30) * (Math.PI / 180);
      const x1 = centerX + (radius - 10) * Math.sin(angle);
      const y1 = centerY - (radius - 10) * Math.cos(angle);
      const x2 = centerX + radius * Math.sin(angle);
      const y2 = centerY - radius * Math.cos(angle);
      
      svg.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "#D1D5DB")
        .attr("stroke-width", 2);
    }
    
    // Birth and Life Expectancy labels
    svg.append("text")
      .attr("x", centerX)
      .attr("y", centerY - radius - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#3B82F6")
      .attr("class", "text-xs font-bold bg-primary-500 text-white px-2 py-1 rounded")
      .text("Birth");
    
    svg.append("text")
      .attr("x", centerX)
      .attr("y", centerY + radius + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .attr("class", "text-xs font-bold bg-gray-500 text-white px-2 py-1 rounded")
      .text("Life Expectancy");
    
    // Current life position (hand)
    const percentLived = calculatePercentageLived(userData);
    const angle = (percentLived / 100) * 180 * (Math.PI / 180);
    
    // Hand shaft
    svg.append("line")
      .attr("x1", centerX)
      .attr("y1", centerY)
      .attr("x2", centerX + radius * Math.sin(angle))
      .attr("y2", centerY - radius * Math.cos(angle))
      .attr("stroke", "#2563EB")
      .attr("stroke-width", 2);
    
    // Hand knob
    svg.append("circle")
      .attr("cx", centerX + radius * Math.sin(angle))
      .attr("cy", centerY - radius * Math.cos(angle))
      .attr("r", 6)
      .attr("fill", "#2563EB");
    
    // Center display
    svg.append("text")
      .attr("x", centerX)
      .attr("y", centerY - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#1F2937")
      .attr("class", "text-4xl font-bold")
      .text(formatSundialTime(userData));
    
    svg.append("text")
      .attr("x", centerX)
      .attr("y", centerY + 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#6B7280")
      .attr("class", "text-sm")
      .text("Your life time");
      
  }, [userData]);
  
  return (
    <div className={`relative w-full aspect-square max-w-lg mx-auto ${className}`}>
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" />
    </div>
  );
};

export default SundialChart;
