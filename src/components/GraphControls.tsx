
import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface GraphControlsProps {
  onReset: () => void;
  onChangeStrength: (value: number) => void;
  strength: number;
}

const GraphControls: React.FC<GraphControlsProps> = ({ 
  onReset, 
  onChangeStrength, 
  strength 
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-md z-10">
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Force Strength:</span>
          <Slider 
            value={[strength]} 
            onValueChange={(value) => onChangeStrength(value[0])} 
            min={10} 
            max={300} 
            step={10}
            className="w-full md:max-w-[200px]"
          />
          <span className="text-xs">{strength}</span>
        </div>
      </div>
      <Button onClick={onReset} variant="outline" className="w-full md:w-auto">
        Reset View
      </Button>
    </div>
  );
};

export default GraphControls;
