
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState, ObstacleData, CoinData } from '../../types';
import Player from './Player';
import TrackSegment from './TrackSegment';
import { 
  INITIAL_SPEED, 
  SPEED_INCREMENT, 
  MAX_SPEED, 
  SEGMENT_LENGTH, 
  VISIBLE_SEGMENTS, 
  LANE_WIDTH,
  LANES,
  COLLISION_THRESHOLD,
  COIN_COLLISION_THRESHOLD
} from '../../constants';

interface WorldProps {
  gameState: GameState;
  onGameOver: (distance: number, coins: number) => void;
  onUpdateScore: (distance: number, coins: number) => void;
}

const World: React.FC<WorldProps> = ({ gameState, onGameOver, onUpdateScore }) => {
  const [trackOffset, setTrackOffset] = useState(0);
  const [obstacles, setObstacles] = useState<ObstacleData[]>([]);
  const [activeCoins, setActiveCoins] = useState<CoinData[]>([]);
  const [playerState, setPlayerState] = useState({ lane: 0, y: 0, isJumping: false, isSliding: false });

  const speedRef = useRef(INITIAL_SPEED);
  const distanceRef = useRef(0);
  const coinsRef = useRef(0);
  const lastSpawnZ = useRef(0);
  const lastUIUpdate = useRef(0);
  const playerRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const initialObstacles: ObstacleData[] = [];
    for (let i = 1; i < 6; i++) {
      initialObstacles.push(generateRandomObstacle(-i * 30));
    }
    setObstacles(initialObstacles);
  }, []);

  function generateRandomObstacle(z: number): ObstacleData {
    const types: ObstacleData['type'][] = ['BARRIER', 'TRAIN', 'RAMP'];
    return {
      id: Math.random().toString(36),
      type: types[Math.floor(Math.random() * types.length)],
      lane: LANES[Math.floor(Math.random() * LANES.length)],
      z
    };
  }

  function generateRandomCoin(z: number): CoinData {
    return {
      id: Math.random().toString(36),
      lane: LANES[Math.floor(Math.random() * LANES.length)],
      z
    };
  }

  useFrame((state) => {
    if (gameState !== GameState.PLAYING) return;

    const delta = state.clock.getDelta();
    // Use fixed step for logic if possible, but here we just smooth out
    speedRef.current = Math.min(speedRef.current + SPEED_INCREMENT, MAX_SPEED);
    distanceRef.current += speedRef.current;

    // Throttle UI score updates to ~10 times per second instead of 60
    if (state.clock.elapsedTime - lastUIUpdate.current > 0.1) {
      onUpdateScore(distanceRef.current, coinsRef.current);
      lastUIUpdate.current = state.clock.elapsedTime;
    }

    setTrackOffset((prev) => (prev + speedRef.current) % SEGMENT_LENGTH);

    // Obstacle management
    setObstacles(prev => {
      const filtered = prev.map(obs => ({ ...obs, z: obs.z + speedRef.current }))
                           .filter(obs => obs.z < 20);
      
      if (distanceRef.current - lastSpawnZ.current > 30) {
        lastSpawnZ.current = distanceRef.current;
        const newObs = generateRandomObstacle(-120);
        const newCoin = generateRandomCoin(-100);
        setActiveCoins(c => [...c.map(cc => ({...cc, z: cc.z + speedRef.current})).filter(cc => cc.z < 10), newCoin]);
        return [...filtered, newObs];
      }
      return filtered;
    });

    // Move coins independently when no spawn happens
    setActiveCoins(prev => 
      prev.map(c => ({ ...c, z: c.z + speedRef.current }))
          .filter(c => c.z < 10)
    );

    checkCollisions();
  });

  const checkCollisions = () => {
    const pLane = playerState.lane;
    const pY = playerState.y;
    const pIsSliding = playerState.isSliding;

    obstacles.forEach(obs => {
      if (Math.abs(obs.z) < COLLISION_THRESHOLD && obs.lane === pLane) {
        if (obs.type === 'BARRIER' && !pIsSliding) onGameOver(distanceRef.current, coinsRef.current);
        else if (obs.type === 'TRAIN' && pY < 1.5) onGameOver(distanceRef.current, coinsRef.current);
        else if (obs.type === 'RAMP' && pY < 0.5) onGameOver(distanceRef.current, coinsRef.current);
      }
    });

    setActiveCoins(prev => {
      let hit = false;
      const remaining = prev.filter(coin => {
        const isHit = Math.abs(coin.z) < COIN_COLLISION_THRESHOLD && coin.lane === pLane && pY < 2;
        if (isHit) {
          coinsRef.current += 1;
          hit = true;
          return false;
        }
        return true;
      });
      return remaining;
    });
  };

  return (
    <group>
      <Player 
        ref={playerRef} 
        onStateChange={setPlayerState} 
        gameState={gameState} 
      />

      {Array.from({ length: VISIBLE_SEGMENTS }).map((_, i) => (
        <TrackSegment 
          key={i} 
          position={[0, 0, -i * SEGMENT_LENGTH + trackOffset]} 
        />
      ))}

      {obstacles.map(obs => (
        <ObstacleMesh key={obs.id} data={obs} />
      ))}

      {activeCoins.map(coin => (
        <CoinMesh key={coin.id} data={coin} />
      ))}
      
      <Buildings offset={trackOffset} />
    </group>
  );
};

const ObstacleMesh: React.FC<{ data: ObstacleData }> = ({ data }) => {
  const isTrain = data.type === 'TRAIN';
  return (
    <mesh position={[data.lane * LANE_WIDTH, isTrain ? 2 : 0.5, data.z]} castShadow>
      <boxGeometry args={isTrain ? [LANE_WIDTH * 0.9, 4, 8] : [LANE_WIDTH * 0.8, 1, 0.5]} />
      <meshStandardMaterial color={isTrain ? '#1e293b' : '#ef4444'} metalness={0.5} roughness={0.5} />
    </mesh>
  );
};

const CoinMesh: React.FC<{ data: CoinData }> = ({ data }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.08;
      meshRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 6) * 0.15;
    }
  });
  return (
    <mesh ref={meshRef} position={[data.lane * LANE_WIDTH, 1.2, data.z]}>
      <cylinderGeometry args={[0.4, 0.4, 0.08, 12]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
    </mesh>
  );
};

const Buildings: React.FC<{ offset: number }> = ({ offset }) => {
  // Simple static buildings with fewer meshes
  return (
    <group>
      {Array.from({ length: 6 }).map((_, i) => (
        <React.Fragment key={i}>
          <mesh position={[-18, 8, -i * 40 + offset]} receiveShadow>
             <boxGeometry args={[8, 30, 8]} />
             <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[18, 8, -i * 40 + offset]} receiveShadow>
             <boxGeometry args={[8, 30, 8]} />
             <meshStandardMaterial color="#0f172a" />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

export default World;
