
import React, { useRef } from 'react';
import CountryGraph from './CountryGraph';
import { toast } from 'sonner';

const GraphWrapper: React.FC = () => {
  const graphRef = useRef<{ resetView: () => void }>(null);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      <div className="p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-center">Interactive Country Borders Graph</h1>
        <p className="text-center text-gray-500 text-sm">
          Explore countries and their shared borders - Drag to move, scroll to zoom
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <CountryGraph ref={graphRef} />
      </div>
    </div>
  );
};

export default GraphWrapper;
