
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { adjacencyList } from '../data/countriesData';
import { toast } from 'sonner';

// Extended interface to include d3 simulation properties
interface CountryNode extends d3.SimulationNodeDatum {
  id: string;
  neighbors: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface CountryLink {
  source: string | CountryNode;
  target: string | CountryNode;
}

interface CountryGraphProps {
  // No props needed after removing forceStrength
}

const CountryGraph = forwardRef<{ resetView: () => void }, CountryGraphProps>(
  (props, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<d3.Simulation<CountryNode, undefined> | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // Fixed force strength value
    const FORCE_STRENGTH = 120;

    // Expose resetView function to parent component
    useImperativeHandle(ref, () => ({
      resetView: () => {
        if (svgRef.current && zoomRef.current) {
          d3.select(svgRef.current)
            .transition()
            .duration(750)
            .call(
              zoomRef.current.transform,
              d3.zoomIdentity,
              d3.zoomTransform(svgRef.current).invert([
                containerRef.current?.clientWidth! / 2,
                containerRef.current?.clientHeight! / 2,
              ])
            );
        }
      }
    }));

    useEffect(() => {
      if (!svgRef.current || !containerRef.current) return;

      // Clear previous visualization if any
      d3.select(svgRef.current).selectAll("*").remove();

      // Show loading toast
      const loadingToast = toast.loading("Building country network...");

      // Check for dark mode
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      // Define color schemes based on theme
      const nodeColors = isDarkMode 
        ? ["#60A5FA", "#3B82F6", "#2563EB"] // Blue shades for dark mode
        : ["#67B7D1", "#3E5C76", "#0A2463"]; // Original colors for light mode
      
      const textColor = isDarkMode ? "#E5E7EB" : "#333"; // Text color based on theme
      const linkColor = isDarkMode ? "#4B5563" : "#999"; // Link color based on theme
      const activeColor = isDarkMode ? "#F87171" : "#FF6B6B"; // Highlight color

      // Prepare data
      const countries = new Set<string>();
      const links: CountryLink[] = [];

      // Extract unique countries and links
      adjacencyList.forEach(entry => {
        const [source, target] = entry;
        countries.add(source);
        countries.add(target);
        links.push({ source, target });
      });

      const nodes: CountryNode[] = Array.from(countries).map(id => ({
        id,
        neighbors: adjacencyList
          .filter(entry => entry[0] === id || entry[1] === id)
          .map(entry => entry[0] === id ? entry[1] : entry[0])
      }));

      // Sort nodes by number of connections (for coloring)
      nodes.sort((a, b) => b.neighbors.length - a.neighbors.length);

      // Create the visualization
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight || window.innerHeight * 0.8;

      const svg = d3.select(svgRef.current)
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      // Create group for zoom/pan
      const g = svg.append("g");

      // Create simulation with fixed force strength
      const simulation = d3.forceSimulation<CountryNode>(nodes)
        .force("charge", d3.forceManyBody().strength(-FORCE_STRENGTH))
        .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
        .force("link", d3.forceLink<CountryNode, CountryLink>(links)
          .id(d => d.id)
          .distance(80))
        .force("collision", d3.forceCollide().radius(40))
        .alphaDecay(0.01);

      simulationRef.current = simulation;

      // Create links
      const link = g.append("g")
        .attr("stroke", linkColor)
        .attr("stroke-opacity", 0.4)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", 0.8);

      // Create nodes
      const node = g.append("g")
        .selectAll(".node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .call(drag(simulation));

      // Create circles for nodes
      node.append("circle")
        .attr("r", d => 4 + Math.min(d.neighbors.length / 2, 5))
        .attr("fill", d => {
          const colorScale = d3.scaleLinear<string>()
            .domain([0, 20, 40])
            .range(nodeColors)
            .interpolate(d3.interpolateHcl);
          
          return colorScale(Math.min(d.neighbors.length, 40));
        })
        .attr("stroke", isDarkMode ? "#374151" : "#fff") // Border color based on theme
        .attr("stroke-width", 1.5);

      // Add country labels - now always visible
      const labels = node.append("text")
        .attr("dx", d => 8 + Math.min(d.neighbors.length / 2, 5))
        .attr("dy", 4)
        .text(d => d.id)
        .attr("font-size", d => {
          const size = 10 + Math.min(d.neighbors.length / 10, 2);
          return `${size}px`;
        })
        .style("fill", textColor)
        .style("pointer-events", "none")
        .style("opacity", 1); // Always visible

      // Node hover interaction
      node
        .on("mouseover", function(event, d) {
          d3.select(this).select("circle")
            .transition()
            .duration(200)
            .attr("r", 8 + Math.min(d.neighbors.length / 2, 5))
            .attr("fill", activeColor);

          // Highlight connections
          link
            .transition()
            .duration(200)
            .attr("stroke-opacity", l => {
              return (l.source === d || l.target === d) ? 0.8 : 0.1;
            })
            .attr("stroke", l => {
              return (l.source === d || l.target === d) ? activeColor : linkColor;
            })
            .attr("stroke-width", l => {
              return (l.source === d || l.target === d) ? 2 : 0.8;
            });
        })
        .on("mouseout", function(event, d) {
          d3.select(this).select("circle")
            .transition()
            .duration(200)
            .attr("r", 4 + Math.min(d.neighbors.length / 2, 5))
            .attr("fill", d => {
              const colorScale = d3.scaleLinear<string>()
                .domain([0, 20, 40])
                .range(nodeColors)
                .interpolate(d3.interpolateHcl);
              
              return colorScale(Math.min(d.neighbors.length, 40));
            });

          // Reset link styles
          link
            .transition()
            .duration(200)
            .attr("stroke-opacity", 0.4)
            .attr("stroke", linkColor)
            .attr("stroke-width", 0.8);
        })
        .on("click", (event, d) => {
          // On click, show country info
          toast.info(`${d.id} has borders with ${d.neighbors.length} countries`, {
            description: d.neighbors.slice(0, 5).join(", ") + 
                        (d.neighbors.length > 5 ? ` and ${d.neighbors.length - 5} more...` : "")
          });
          
          // Prevent triggering other events
          event.stopPropagation();
        });

      // Set up the simulation tick
      simulation.on("tick", () => {
        link
          .attr("x1", d => (d.source as CountryNode).x || 0)
          .attr("y1", d => (d.source as CountryNode).y || 0)
          .attr("x2", d => (d.target as CountryNode).x || 0)
          .attr("y2", d => (d.target as CountryNode).y || 0);

        node.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
      });

      // Set up zoom handling
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      zoomRef.current = zoom;
      svg.call(zoom);

      // Handle window resize
      const handleResize = () => {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight || window.innerHeight * 0.8;
          
          svg
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`);
          
          simulation
            .force("center", d3.forceCenter(width / 2, height / 2))
            .alpha(0.3)
            .restart();
        }
      };

      window.addEventListener("resize", handleResize);

      // Disable right-click menu
      svg.on("contextmenu", (event) => {
        event.preventDefault();
      });

      // Close loading toast after simulation stabilizes
      setTimeout(() => {
        toast.dismiss(loadingToast);
        toast.success(`Loaded ${countries.size} countries with ${links.length} borders`);
      }, 1500);

      // Add theme change listener
      const handleThemeChange = () => {
        if (containerRef.current) {
          // Redraw graph when theme changes
          handleResize();
        }
      };

      // Listen for theme changes
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', handleThemeChange);

      return () => {
        simulation.stop();
        window.removeEventListener("resize", handleResize);
        window.matchMedia('(prefers-color-scheme: dark)')
          .removeEventListener('change', handleThemeChange);
        toast.dismiss(loadingToast);
      };
    }, []); // Rerun when theme changes

    // Drag function for the nodes
    const drag = (simulation: d3.Simulation<CountryNode, undefined>) => {
      function dragstarted(event: any, d: CountryNode) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event: any, d: CountryNode) {
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event: any, d: CountryNode) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      
      return d3.drag<SVGGElement, CountryNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    return (
      <div 
        ref={containerRef} 
        className="w-full h-full overflow-hidden touch-none"
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
        />
      </div>
    );
  }
);

CountryGraph.displayName = 'CountryGraph';
export default CountryGraph;
