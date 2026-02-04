
import React from 'react';
import { GameScore } from '../../types';

interface HUDProps {
  score: GameScore;
}

const HUD: React.FC<HUDProps> = ({ score }) => {
  return (
    <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none select-none">
      <div className="flex flex-col">
        <span className="text-white/50 text-xs font-game tracking-widest uppercase">Distance</span>
        <span className="text-white text-3xl font-game drop-shadow-lg">{score.distance}m</span>
      </div>
      
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-yellow-400 text-3xl font-game drop-shadow-lg">{score.coins}</span>
        </div>
        <span className="text-white/50 text-xs font-game tracking-widest mt-1 uppercase">Best: {score.highScore}m</span>
      </div>
    </div>
  );
};

export default HUD;
