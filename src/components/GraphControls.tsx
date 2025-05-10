
import React from 'react';
import { Button } from "@/components/ui/button";

interface GraphControlsProps {
  onReset: () => void;
}

const GraphControls: React.FC<GraphControlsProps> = ({ onReset }) => {
  return (
    <div className="flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-md z-10">
      <Button onClick={onReset} variant="outline">
        Reset View
      </Button>
    </div>
  );
};

export default GraphControls;
