
import React, { useRef, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LANE_WIDTH } from '../../constants';
import { GameState } from '../../types';

interface PoliceProps {
  playerLane: number;
  gameState: GameState;
}

const Police = forwardRef<THREE.Group, PoliceProps>(({ playerLane, gameState }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (gameState !== GameState.PLAYING) return;

    // Follow player lane with a slight delay for a "chase" effect
    const targetX = playerLane * LANE_WIDTH;
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.05);
      // Stay fixed at a distance behind the player (player is at Z=0)
      groupRef.current.position.z = 5; 
    }

    // Procedural Running Animation
    const time = state.clock.elapsedTime * 10;
    const legAngle = Math.sin(time) * 0.5;
    const armAngle = Math.sin(time) * 0.7;

    if (leftLegRef.current) leftLegRef.current.rotation.x = -legAngle;
    if (rightLegRef.current) rightLegRef.current.rotation.x = legAngle;
    if (leftArmRef.current) leftArmRef.current.rotation.x = armAngle;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -armAngle;

    if (bodyRef.current) {
      bodyRef.current.position.y = 1.2 + Math.sin(time * 2) * 0.05;
      bodyRef.current.rotation.z = Math.sin(time) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef} position={[0, 1.2, 0]}>
        {/* Torso - Police Blue */}
        <mesh castShadow>
          <boxGeometry args={[0.9, 1.3, 0.6]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
        
        {/* Badge */}
        <mesh position={[0.2, 0.3, 0.31]}>
          <planeGeometry args={[0.15, 0.15]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>

        {/* Head */}
        <group position={[0, 1, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.55, 0.55]} />
            <meshStandardMaterial color="#ffdbac" />
          </mesh>
          {/* Police Hat */}
          <group position={[0, 0.3, 0]}>
             <mesh castShadow>
               <boxGeometry args={[0.65, 0.2, 0.65]} />
               <meshStandardMaterial color="#1e3a8a" />
             </mesh>
             {/* Hat Brim */}
             <mesh position={[0, -0.05, 0.2]}>
               <boxGeometry args={[0.6, 0.05, 0.3]} />
               <meshStandardMaterial color="#000000" />
             </mesh>
          </group>
        </group>

        {/* Arms */}
        <mesh ref={leftArmRef} position={[-0.6, 0.3, 0]} castShadow>
          <boxGeometry args={[0.25, 0.8, 0.25]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
        <mesh ref={rightArmRef} position={[0.6, 0.3, 0]} castShadow>
          <boxGeometry args={[0.25, 0.8, 0.25]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>

        {/* Legs */}
        <mesh ref={leftLegRef} position={[-0.25, -0.9, 0]} castShadow>
          <boxGeometry args={[0.35, 0.9, 0.35]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh ref={rightLegRef} position={[0.25, -0.9, 0]} castShadow>
          <boxGeometry args={[0.35, 0.9, 0.35]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>
      
      {/* Shadow Blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>
    </group>
  );
});

export default Police;
