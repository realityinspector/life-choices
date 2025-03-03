import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { UserData } from "@shared/schema";

interface FreeSundialChartProps {
  userData: UserData;
  className?: string;
}

const FreeSundialChart = ({ userData, className = "" }: FreeSundialChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Calculate dimensions
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight || 500;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate percentage of life lived
    const percentageLived = (userData.age / userData.lifeExpectancy) * 100;
    const angleInDegrees = (percentageLived / 100) * 360;
    const angleInRadians = (angleInDegrees * Math.PI) / 180;

    // Create the clock face
    const clockFace = svg
      .append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`);

    // Add outer circle (life expectancy)
    clockFace
      .append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 8);

    // Add progress arc (life lived)
    const arcGenerator = d3
      .arc()
      .innerRadius(radius - 8)
      .outerRadius(radius)
      .startAngle(0)
      .endAngle(angleInRadians);

    clockFace
      .append("path")
      .attr("d", arcGenerator as any)
      .attr("fill", "#3b82f6");

    // Add hour ticks
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const tickLength = i % 6 === 0 ? 15 : 10;
      const tickWidth = i % 6 === 0 ? 2 : 1;
      
      clockFace
        .append("line")
        .attr("x1", (radius - tickLength) * Math.sin(angle))
        .attr("y1", -(radius - tickLength) * Math.cos(angle))
        .attr("x2", radius * Math.sin(angle))
        .attr("y2", -radius * Math.cos(angle))
        .attr("stroke", "#6b7280")
        .attr("stroke-width", tickWidth);
      
      if (i % 6 === 0) {
        clockFace
          .append("text")
          .attr("x", (radius - 28) * Math.sin(angle))
          .attr("y", -(radius - 28) * Math.cos(angle))
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "#374151")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .text(i === 0 ? "12" : (i / 2).toString());
      }
    }

    // Add annotations
    const birthPoint = { x: 0, y: -radius };
    const currentPoint = {
      x: radius * Math.sin(angleInRadians),
      y: -radius * Math.cos(angleInRadians),
    };

    // Add birth annotation
    clockFace
      .append("circle")
      .attr("cx", birthPoint.x)
      .attr("cy", birthPoint.y)
      .attr("r", 5)
      .attr("fill", "#10b981");

    clockFace
      .append("text")
      .attr("x", birthPoint.x)
      .attr("y", birthPoint.y - 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#10b981")
      .attr("font-size", "12px")
      .text("Birth");

    // Add current age annotation
    clockFace
      .append("circle")
      .attr("cx", currentPoint.x)
      .attr("cy", currentPoint.y)
      .attr("r", 5)
      .attr("fill", "#3b82f6");

    clockFace
      .append("text")
      .attr("x", currentPoint.x + (currentPoint.x > 0 ? 10 : -10))
      .attr("y", currentPoint.y)
      .attr("text-anchor", currentPoint.x > 0 ? "start" : "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#3b82f6")
      .attr("font-size", "12px")
      .text(`Age: ${userData.age}`);

    // Add center label (percentage)
    clockFace
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#1f2937")
      .attr("font-size", "24px")
      .attr("font-weight", "bold")
      .text(`${Math.round(percentageLived)}%`);

    clockFace
      .append("text")
      .attr("x", 0)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#6b7280")
      .attr("font-size", "14px")
      .text("of life");
      
  }, [userData]);

  return (
    <div className={`w-full h-full min-h-[400px] ${className}`}>
      <svg 
        ref={svgRef} 
        className="w-full h-full" 
        viewBox="0 0 600 500" 
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};

export default FreeSundialChart;