
import React from 'react';
import * as THREE from 'three';
import { SEGMENT_LENGTH, LANE_WIDTH, LANES, COLORS } from '../../constants';

interface TrackSegmentProps {
  position: [number, number, number];
}

const TrackSegment: React.FC<TrackSegmentProps> = ({ position }) => {
  return (
    <group position={position}>
      {/* Main road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[LANE_WIDTH * 3 + 4, SEGMENT_LENGTH]} />
        <meshStandardMaterial color={COLORS.TRACK} roughness={0.9} />
      </mesh>

      {/* Lane markers */}
      {LANES.map(l => (
        <mesh key={l} rotation={[-Math.PI / 2, 0, 0]} position={[l * LANE_WIDTH, 0.01, 0]}>
          <planeGeometry args={[0.08, SEGMENT_LENGTH]} />
          <meshBasicMaterial color={COLORS.LANE_MARKER} transparent opacity={0.2} />
        </mesh>
      ))}

      {/* Side curbs instead of tall walls to reduce triangle count in view */}
      <mesh position={[-(LANE_WIDTH * 1.5 + 1.5), 0.25, 0]}>
        <boxGeometry args={[1, 0.5, SEGMENT_LENGTH]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[LANE_WIDTH * 1.5 + 1.5, 0.25, 0]}>
        <boxGeometry args={[1, 0.5, SEGMENT_LENGTH]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Static glowing poles instead of real lights */}
      {Array.from({ length: 3 }).map((_, i) => (
        <React.Fragment key={i}>
            <mesh position={[-LANE_WIDTH * 2, 1, -i * 15 + 7]}>
                <boxGeometry args={[0.2, 2, 0.2]} />
                <meshBasicMaterial color="#06b6d4" />
            </mesh>
            <mesh position={[LANE_WIDTH * 2, 1, -i * 15 + 7]}>
                <boxGeometry args={[0.2, 2, 0.2]} />
                <meshBasicMaterial color="#ec4899" />
            </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

export default TrackSegment;
