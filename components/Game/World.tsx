
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
  
  // Reference for camera smoothing
  const cameraTargetX = useRef(0);

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
    speedRef.current = Math.min(speedRef.current + SPEED_INCREMENT, MAX_SPEED);
    distanceRef.current += speedRef.current;

    // Camera follow logic: Smoothly follow player lane
    if (playerRef.current) {
      const targetX = playerRef.current.position.x * 0.5; // Scale down follow for better feel
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.1);
      
      // Slight camera tilt based on lane
      state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, -playerRef.current.position.x * 0.02, 0.05);
      
      // Camera look at point shifted slightly ahead of player
      state.camera.lookAt(state.camera.position.x, 2, -10);
    }

    // Throttle UI score updates
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
        