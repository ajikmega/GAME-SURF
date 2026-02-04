
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Environment, Stars, PerspectiveCamera } from '@react-three/drei';
import { GameState, GameScore } from './types';
import World from './components/Game/World';
import HUD from './components/UI/HUD';
import Menu from './components/UI/Menu';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState<GameScore>({
    distance: 0,
    coins: 0,
    highScore: parseInt(localStorage.getItem('highScore') || '0', 10)
  });
  const [gameKey, setGameKey] = useState(0);

  const handleStart = () => {
    setGameState(GameState.PLAYING);
    setScore(prev => ({ ...prev, distance: 0, coins: 0 }));
    setGameKey(k => k + 1);
  };

  const handleGameOver = useCallback((finalDistance: number, finalCoins: number) => {
    setGameState(GameState.GAMEOVER);
    setScore(prev => {
      const newDistance = Math.floor(finalDistance);
      const newHighScore = Math.max(prev.highScore, newDistance);
      localStorage.setItem('highScore', newHighScore.toString());
      return {
        ...prev,
        distance: newDistance,
        coins: finalCoins,
        highScore: newHighScore
      };
    });
  }, []);

  const updateScore = useCallback((distance: number, coins: number) => {
    setScore(prev => ({
      ...prev,
      distance: Math.floor(distance),
      coins
    }));
  }, []);

  const triggerAction = (action: string, e: React.PointerEvent) => {
    // Penting: mencegah behavior default agar input tidak terganggu
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('player-action', { detail: action }));
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden select-none touch-none">
      <Canvas 
        shadows 
        dpr={[1, 1.2]} 
        gl={{ antialias: false, powerPreference: "high-performance" }}
        style={{ width: '100%', height: '100%' }}
      >
        <PerspectiveCamera makeDefault position={[0, 6, 12]} fov={50} />
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[-10, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[512, 512]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
        {gameState !== GameState.START && (
          <World 
            key={gameKey}
            gameState={gameState} 
            onGameOver={handleGameOver} 
            onUpdateScore={updateScore}
          />
        )}
        
        <Environment preset="city" />
      </Canvas>

      {gameState === GameState.PLAYING && (
        <>
          <HUD score={score} />
          
          <div className="absolute inset-x-0 bottom-10 px-6 flex justify-between items-end pointer-events-none z-10">
            <div className="flex gap-4 pointer-events-auto">
              <button 
                onPointerDown={(e) => triggerAction('left', e)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 active:bg-white/30 transition-all text-white text-3xl font-bold shadow-xl"
              >
                ←
              </button>
              <button 
                onPointerDown={(e) => triggerAction('right', e)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 active:bg-white/30 transition-all text-white text-3xl font-bold shadow-xl"
              >
                →
              </button>
            </div>

            <div className="flex flex-col gap-4 pointer-events-auto">
              <button 
                onPointerDown={(e) => triggerAction('jump', e)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500/40 backdrop-blur-md border border-blue-400/30 flex items-center justify-center active:scale-90 active:bg-blue-500/60 transition-all text-white text-xl font-game shadow-xl"
              >
                UP
              </button>
              <button 
                onPointerDown={(e) => triggerAction('slide', e)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/40 backdrop-blur-md border border-red-400/30 flex items-center justify-center active:scale-90 active:bg-red-500/60 transition-all text-white text-xs font-game shadow-xl"
              >
                DOWN
              </button>
            </div>
          </div>
        </>
      )}
      
      {gameState !== GameState.PLAYING && (
        <Menu 
          gameState={gameState} 
          score={score} 
          onStart={handleStart} 
        />
      )}
    </div>
  );
};

export default App;