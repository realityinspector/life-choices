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
    const radius = Math.min(width, height) / 2 - 30;
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate percentage of life lived
    const percentageLived = (userData.age / userData.lifeExpectancy) * 100;
    
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
      .attr("id", "plate-gradient-free")
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
      .startAngle(Math.PI)
      .endAngle(2 * Math.PI);
    
    sundial.append("path")
      .attr("d", plateArc as any)
      .attr("fill", "url(#plate-gradient-free)")
      .attr("stroke", baseColor)
      .attr("stroke-width", 2);
    
    // Draw hour lines (like a real sundial)
    const hourMarks = 12;
    const hourAngle = Math.PI / hourMarks;
    
    for (let hour = 0; hour <= hourMarks; hour++) {
      // Adjust angle to start from left (Math.PI) and progress to right (2*Math.PI)
      const angle = Math.PI + hour * hourAngle;
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
      .attr("id", "gnomon-gradient-free")
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
    
    // Gnomon - pointing left (to birth side) to match orientation
    sundial.append("path")
      .attr("d", `M0,0 L${-gnomonHeight},0 L0,${-gnomonBase} Z`)
      .attr("fill", "url(#gnomon-gradient-free)")
      .attr("stroke", "#4B5563")
      .attr("stroke-width", 1);
      
    // Add the info banner arc
    const bannerArc = d3.arc()
      .innerRadius(radius * 0.75)
      .outerRadius(radius * 0.9)
      .startAngle(Math.PI)
      .endAngle(2 * Math.PI);
    
    sundial.append("path")
      .attr("d", bannerArc as any)
      .attr("fill", "#3b82f6")
      .attr("opacity", 0.2)
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 1);
    
    sundial.append("text")
      .attr("x", 0)
      .attr("y", -radius * 0.825)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#1e40af")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text("Sign up for more features");
    
    // Calculate shadow angle based on percentage of life lived
    // Angle for the shadow from left (birth, Math.PI) to right (end, 2*Math.PI)
    const shadowAngle = Math.PI + (percentageLived / 100) * Math.PI;
    
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
      .text(`${Math.round(percentageLived)}%`);
    
    // Digital time display at the bottom
    sundial.append("foreignObject")
      .attr("x", -radius/2)
      .attr("y", radius * 0.6)
      .attr("width", radius)
      .attr("height", 60)
      .html(`
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #1F2937;">Age: ${userData.age}</div>
          <div style="font-size: 12px; color: #6B7280;">of ${userData.lifeExpectancy} years</div>
        </div>
      `);
    
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