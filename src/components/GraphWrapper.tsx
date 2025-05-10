
import React, { useRef, useState } from 'react';
import CountryGraph from './CountryGraph';
import GraphControls from './GraphControls';
import { toast } from 'sonner';

const GraphWrapper: React.FC = () => {
  const [forceStrength, setForceStrength] = useState<number>(120);
  const graphRef = useRef<{ resetView: () => void }>(null);

  const handleReset = () => {
    if (graphRef.current?.resetView) {
      graphRef.current.resetView();
      toast.info("Graph view has been reset");
    }
  };

  const handleStrengthChange = (value: number) => {
    setForceStrength(value);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      <div className="p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-center">Interactive Country Borders Graph</h1>
        <p className="text-center text-gray-500 text-sm">
          Explore countries and their shared borders - Drag to move, scroll to zoom
        </p>
      </div>
      
      <div className="fixed bottom-4 left-4 right-4 z-10">
        <GraphControls 
          onReset={handleReset} 
          onChangeStrength={handleStrengthChange}
          strength={forceStrength}
        />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <CountryGraph ref={graphRef} forceStrength={forceStrength} />
      </div>
    </div>
  );
};

export default GraphWrapper;
