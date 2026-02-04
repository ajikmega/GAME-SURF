
import React from 'react';
import { GameState, GameScore } from '../../types';

interface MenuProps {
  gameState: GameState;
  score: GameScore;
  onStart: () => void;
}

const Menu: React.FC<MenuProps> = ({ gameState, score, onStart }) => {
  const isStart = gameState === GameState.START;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-500">
      <div className="bg-white/10 p-12 rounded-3xl border border-white/20 shadow-2xl text-center max-w-sm w-full mx-4">
        <h1 className="text-5xl font-game text-white mb-2 tracking-tighter italic">
          NEON<br/><span className="text-blue-500">RUNNER</span>
        </h1>
        
        {!isStart && (
          <div className="my-8 space-y-2">
            <p className="text-red-400 font-game text-xl uppercase tracking-widest">Wasted!</p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                    <p className="text-white/40 text-[10px] font-game uppercase">Distance</p>
                    <p className="text-white text-2xl font-game">{score.distance}m</p>
                </div>
                <div>
                    <p className="text-white/40 text-[10px] font-game uppercase">Coins</p>
                    <p className="text-yellow-400 text-2xl font-game">{score.coins}</p>
                </div>
            </div>
            {score.distance >= score.highScore && score.distance > 0 && (
                <p className="text-green-400 text-xs font-game pt-2 uppercase">New Personal Best!</p>
            )}
          </div>
        )}

        {isStart && (
          <div className="my-8">
            <p className="text-white/60 text-sm font-medium">
                Dodge barriers, trains, and collect coins in this endless urban dash.
            </p>
            <p className="text-white/40 text-xs mt-4">High Score: {score.highScore}m</p>
          </div>
        )}

        <button 
          onClick={onStart}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-game py-4 px-8 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
        >
          {isStart ? 'PLAY NOW' : 'TRY AGAIN'}
        </button>
        
        <div className="mt-8 flex justify-center gap-4 text-white/30 text-[10px] font-game uppercase tracking-widest">
            <span>Desktop: Arrows</span>
            <span>•</span>
            <span>Mobile: Swipes</span>
        </div>
      </div>
    </div>
  );
};

export default Menu;
