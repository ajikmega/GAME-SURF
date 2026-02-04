
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LANES, LANE_WIDTH, JUMP_FORCE, GRAVITY, COLORS } from '../../constants';
import { GameState } from '../../types';

interface PlayerProps {
  onStateChange: (state: any) => void;
  gameState: GameState;
}

const Player = forwardRef<THREE.Group, PlayerProps>(({ onStateChange, gameState }, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  
  // Refs for limbs
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);

  // Use refs for animation states to avoid closure issues in event listeners
  const jumpingRef = useRef(false);
  const slidingRef = useRef(false);
  const laneRef = useRef(0);

  const [lane, setLane] = useState(0);
  const [y, setY] = useState(0);
  const [vY, setVY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [targetX, setTargetX] = useState(0);

  useImperativeHandle(ref, () => groupRef.current!);

  const jump = useCallback(() => {
    if (!jumpingRef.current && !slidingRef.current) {
      setVY(JUMP_FORCE);
      setIsJumping(true);
      jumpingRef.current = true;
    }
  }, []);

  const slide = useCallback(() => {
    if (!slidingRef.current) {
      setIsSliding(true);
      slidingRef.current = true;
      setTimeout(() => {
        setIsSliding(false);
        slidingRef.current = false;
      }, 800);
    }
  }, []);

  const moveLane = useCallback((dir: number) => {
    setLane((prev) => {
      const next = Math.max(-1, Math.min(1, prev + dir));
      laneRef.current = next;
      setTargetX(next * LANE_WIDTH);
      return next;
    });
  }, []);

  // Sync refs with state for UI updates
  useEffect(() => {
    jumpingRef.current = isJumping;
    slidingRef.current = isSliding;
    laneRef.current = lane;
  }, [isJumping, isSliding, lane]);

  useEffect(() => {
    const handleAction = (e: any) => {
      const action = e.detail;
      if (action === 'left') moveLane(-1);
      if (action === 'right') moveLane(1);
      if (action === 'jump') jump();
      if (action === 'slide') slide();
    };

    window.addEventListener('player-action', handleAction);
    
    // Keyboard support
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveLane(-1);
      if (e.key === 'ArrowRight') moveLane(1);
      if (e.key === 'ArrowUp' || e.key === ' ') jump();
      if (e.key === 'ArrowDown') slide();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('player-action', handleAction);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [jump, slide, moveLane]);

  // Swipe support
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const diffX = e.changedTouches[0].clientX - startX;
      const diffY = e.changedTouches[0].clientY - startY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) moveLane(diffX > 0 ? 1 : -1);
      } else {
        if (Math.abs(diffY) > 30) {
          if (diffY < 0) jump();
          else slide();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [jump, slide, moveLane]);

  useFrame((state) => {
    if (gameState !== GameState.PLAYING) return;

    // Smooth lane transition
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.2);
    }

    // Physics
    let nextY = y + vY;
    let nextVY = vY - GRAVITY;

    if (nextY <= 0) {
      nextY = 0;
      nextVY = 0;
      if (jumpingRef.current) {
        setIsJumping(false);
        jumpingRef.current = false;
      }
    }

    setY(nextY);
    setVY(nextVY);

    if (groupRef.current) {
      groupRef.current.position.y = nextY;
    }

    // Procedural Animations
    const time = state.clock.elapsedTime * 12;
    
    if (bodyRef.current) {
      if (isSliding) {
        bodyRef.current.scale.y = THREE.MathUtils.lerp(bodyRef.current.scale.y, 0.5, 0.2);
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0.5, 0.2);
      } else {
        bodyRef.current.scale.y = THREE.MathUtils.lerp(bodyRef.current.scale.y, 1, 0.2);
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 1.2, 0.2);
      }
      
      if (!isJumping && !isSliding) {
        bodyRef.current.position.y = 1.2 + Math.sin(time * 1.5) * 0.1;
        bodyRef.current.rotation.z = Math.sin(time * 0.75) * 0.05;
      }
    }

    // Animation frames for limbs
    if (!isJumping && !isSliding) {
      const legAngle = Math.sin(time) * 0.6;
      const armAngle = Math.sin(time) * 0.8;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -legAngle;
      if (rightLegRef.current) rightLegRef.current.rotation.x = legAngle;
      if (leftArmRef.current) leftArmRef.current.rotation.x = armAngle;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -armAngle;
    } else if (isJumping) {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -0.4;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 1.2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 1.2;
    } else if (isSliding) {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -1.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -1.5;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0.5;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0.5;
    }

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(time * 0.3) * 0.1;
    }

    onStateChange({ lane, y: nextY, isJumping, isSliding });
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef} position={[0, 1.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 1.2, 0.5]} />
          <meshStandardMaterial color={COLORS.PLAYER} />
        </mesh>
        <group ref={headRef} position={[0, 0.9, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#ffdbac" />
          </mesh>
          <mesh position={[0, 0.2, 0.05]}>
             <boxGeometry args={[0.55, 0.2, 0.6]} />
             <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0.05, 0.26]}>
             <boxGeometry args={[0.3, 0.1, 0.05]} />
             <meshBasicMaterial color="white" />
          </mesh>
        </group>
        <mesh ref={leftArmRef} position={[-0.55, 0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <mesh ref={rightArmRef} position={[0.55, 0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <mesh ref={leftLegRef} position={[-0.2, -0.9, 0]} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <meshStandardMaterial color="#1d4ed8" />
        </mesh>
        <mesh ref={rightLegRef} position={[0.2, -0.9, 0]} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <meshStandardMaterial color="#1d4ed8" />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>
    </group>
  );
});

export default Player;
