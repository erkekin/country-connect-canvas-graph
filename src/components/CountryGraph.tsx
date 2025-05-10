
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { adjacencyList } from '../data/countriesData';
import { toast } from 'sonner';

interface CountryNode extends d3.SimulationNodeDatum {
  id: string;
  neighbors: string[];
}

interface CountryLink {
  source: string;
  target: string;
}

interface CountryGraphProps {
  forceStrength?: number;
}

const CountryGraph = forwardRef<{ resetView: () => void }, CountryGraphProps>(
  ({ forceStrength = 120 }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<d3.Simulation<CountryNode, undefined> | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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
        neighbors: links
          .filter(link => link.source === id || link.target === id)
          .map(link => link.source === id ? link.target : link.source)
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

      // Create simulation
      const simulation = d3.forceSimulation<CountryNode>(nodes)
        .force("charge", d3.forceManyBody().strength(-forceStrength))
        .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
        .force("link", d3.forceLink<CountryNode, CountryLink>(links)
          .id(d => d.id)
          .distance(80))
        .force("collision", d3.forceCollide().radius(40))
        .alphaDecay(0.01);

      simulationRef.current = simulation;

      // Create links
      const link = g.append("g")
        .attr("stroke", "#999")
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
            .range(["#67B7D1", "#3E5C76", "#0A2463"])
            .interpolate(d3.interpolateHcl);
          
          return colorScale(Math.min(d.neighbors.length, 40));
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

      // Add country labels
      const labels = node.append("text")
        .attr("dx", d => 8 + Math.min(d.neighbors.length / 2, 5))
        .attr("dy", 4)
        .text(d => d.id)
        .attr("font-size", d => {
          const size = 10 + Math.min(d.neighbors.length / 10, 2);
          return `${size}px`;
        })
        .style("fill", "#333")
        .style("pointer-events", "none")
        .style("opacity", 0);  // Initially hidden

      // Node hover interaction
      node
        .on("mouseover", function(event, d) {
          d3.select(this).select("circle")
            .transition()
            .duration(200)
            .attr("r", 8 + Math.min(d.neighbors.length / 2, 5))
            .attr("fill", "#FF6B6B");

          d3.select(this).select("text")
            .transition()
            .duration(100)
            .style("opacity", 1);

          // Highlight connections
          link
            .transition()
            .duration(200)
            .attr("stroke-opacity", l => {
              return (l.source === d || l.target === d) ? 0.8 : 0.1;
            })
            .attr("stroke", l => {
              return (l.source === d || l.target === d) ? "#FF6B6B" : "#999";
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
                .range(["#67B7D1", "#3E5C76", "#0A2463"])
                .interpolate(d3.interpolateHcl);
              
              return colorScale(Math.min(d.neighbors.length, 40));
            });

          d3.select(this).select("text")
            .transition()
            .duration(100)
            .style("opacity", 0);

          // Reset link styles
          link
            .transition()
            .duration(200)
            .attr("stroke-opacity", 0.4)
            .attr("stroke", "#999")
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
          .attr("x1", d => (d.source as unknown as CountryNode).x || 0)
          .attr("y1", d => (d.source as unknown as CountryNode).y || 0)
          .attr("x2", d => (d.target as unknown as CountryNode).x || 0)
          .attr("y2", d => (d.target as unknown as CountryNode).y || 0);

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

      return () => {
        simulation.stop();
        window.removeEventListener("resize", handleResize);
        toast.dismiss(loadingToast);
      };
    }, [forceStrength]);

    // Update force strength when it changes
    useEffect(() => {
      if (simulationRef.current) {
        simulationRef.current
          .force("charge", d3.forceManyBody().strength(-forceStrength))
          .alpha(0.3)
          .restart();
      }
    }, [forceStrength]);

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
