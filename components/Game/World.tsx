
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameState, ObstacleData, CoinData } from '../../types';
import Player from './Player';
import Police from './Police';
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
      initialObstacles.push(generateRandomObstacle(-i * 40));
    }
    setObstacles(initialObstacles);
  }, []);

  function generateRandomObstacle(z: number): ObstacleData {
    const types: ObstacleData['type'][] = ['CAR', 'TRUCK', 'RAMP_TRUCK'];
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

    speedRef.current = Math.min(speedRef.current + SPEED_INCREMENT, MAX_SPEED);
    distanceRef.current += speedRef.current;

    if (playerRef.current) {
      const targetX = playerRef.current.position.x * 0.5;
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.1);
      state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, -playerRef.current.position.x * 0.02, 0.05);
      state.camera.lookAt(state.camera.position.x, 2, -10);
    }

    if (state.clock.elapsedTime - lastUIUpdate.current > 0.1) {
      onUpdateScore(distanceRef.current, coinsRef.current);
      lastUIUpdate.current = state.clock.elapsedTime;
    }

    setTrackOffset((prev) => (prev + speedRef.current) % SEGMENT_LENGTH);

    setObstacles(prev => {
      const filtered = prev.map(obs => ({ ...obs, z: obs.z + speedRef.current }))
                           .filter(obs => obs.z < 20);
      
      if (distanceRef.current - lastSpawnZ.current > 40) {
        lastSpawnZ.current = distanceRef.current;
        const newObs = generateRandomObstacle(-150);
        const newCoin = generateRandomCoin(-120);
        setActiveCoins(c => [...c.map(cc => ({...cc, z: cc.z + speedRef.current})).filter(cc => cc.z < 10), newCoin]);
        return [...filtered, newObs];
      }
      return filtered;
    });

    setActiveCoins(prev => 
      prev.map(c => ({ ...c, z: c.z + speedRef.current }))
          .filter(c => c.z < 10)
    );

    checkCollisions();
  });

  const checkCollisions = () => {
    const pLane = playerState.lane;
    const pY = playerState.y;

    obstacles.forEach(obs => {
      // Adjusted collision boxes for vehicle lengths
      const collisionRange = obs.type === 'TRUCK' ? 4 : 2;
      if (Math.abs(obs.z) < collisionRange && obs.lane === pLane) {
        if (obs.type === 'CAR') {
          // Can jump over a small car
          if (pY < 1.2) onGameOver(distanceRef.current, coinsRef.current);
        } else if (obs.type === 'TRUCK') {
          // Cannot jump over a semi-truck easily
          if (pY < 3.5) onGameOver(distanceRef.current, coinsRef.current);
        } else if (obs.type === 'RAMP_TRUCK') {
          // Collision only if hitting the cab from the front or missing the ramp
          // Simplified: ramp allows pass if jumping or already high
          if (pY < 0.2) onGameOver(distanceRef.current, coinsRef.current);
        }
      }
    });

    setActiveCoins(prev => {
      const remaining = prev.filter(coin => {
        const isHit = Math.abs(coin.z) < COIN_COLLISION_THRESHOLD && coin.lane === pLane && pY < 2;
        if (isHit) {
          coinsRef.current += 1;
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

      <Police 
        playerLane={playerState.lane}
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

const Wheel: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
    <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
    <meshStandardMaterial color="#111" roughness={1} />
  </mesh>
);

const ObstacleMesh: React.FC<{ data: ObstacleData }> = ({ data }) => {
  const laneX = data.lane * LANE_WIDTH;

  if (data.type === 'CAR') {
    return (
      <group position={[laneX, 0, data.z]}>
        {/* Body */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1.8, 0.6, 3]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        {/* Cabin */}
        <mesh position={[0, 0.9, -0.2]} castShadow>
          <boxGeometry args={[1.6, 0.5, 1.8]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        {/* Windows */}
        <mesh position={[0, 0.9, 0.1]}>
          <boxGeometry args={[1.62, 0.4, 1.5]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.6} />
        </mesh>
        {/* Lights */}
        <mesh position={[0.6, 0.5, 1.51]}>
          <boxGeometry args={[0.4, 0.2, 0.1]} />
          <meshBasicMaterial color="white" />
        </mesh>
        <mesh position={[-0.6, 0.5, 1.51]}>
          <boxGeometry args={[0.4, 0.2, 0.1]} />
          <meshBasicMaterial color="white" />
        </mesh>
        {/* Wheels */}
        <Wheel position={[0.9, 0.3, 1]} />
        <Wheel position={[-0.9, 0.3, 1]} />
        <Wheel position={[0.9, 0.3, -1]} />
        <Wheel position={[-0.9, 0.3, -1]} />
      </group>
    );
  }

  if (data.type === 'TRUCK') {
    return (
      <group position={[laneX, 0, data.z]}>
        {/* Trailer */}
        <mesh position={[0, 2, -1]} castShadow>
          <boxGeometry args={[2.2, 3.5, 7]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {/* Cab */}
        <mesh position={[0, 1.2, 3.5]} castShadow>
          <boxGeometry args={[2.2, 2, 2]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Windshield */}
        <mesh position={[0, 1.6, 4.51]}>
          <boxGeometry args={[2, 1, 0.1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Wheels */}
        <Wheel position={[1, 0.3, 4]} />
        <Wheel position={[-1, 0.3, 4]} />
        <Wheel position={[1, 0.3, 2]} />
        <Wheel position={[-1, 0.3, 2]} />
        <Wheel position={[1, 0.3, -2]} />
        <Wheel position={[-1, 0.3, -2]} />
        <Wheel position={[1, 0.3, -4]} />
        <Wheel position={[-1, 0.3, -4]} />
      </group>
    );
  }

  if (data.type === 'RAMP_TRUCK') {
    return (
      <group position={[laneX, 0, data.z]}>
        {/* Cab */}
        <mesh position={[0, 0.8, -1.8]} castShadow>
          <boxGeometry args={[2, 1.5, 1.5]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        {/* Ramp */}
        <mesh position={[0, 0.4, 1]} rotation={[-Math.PI * 0.12, 0, 0]} receiveShadow>
          <boxGeometry args={[2.2, 0.3, 6]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        {/* Wheels */}
        <Wheel position={[1, 0.3, -1.5]} />
        <Wheel position={[-1, 0.3, -1.5]} />
        <Wheel position={[1, 0.3, 2.5]} />
        <Wheel position={[-1, 0.3, 2.5]} />
      </group>
    );
  }

  return null;
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
