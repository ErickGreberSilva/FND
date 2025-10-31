// components/SunPath3D.tsx
"use client";

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { getSunPosition } from './SunCalculator';
import * as THREE from 'three';

interface Props {
  latitude: number;
  longitude: number;
  date?: Date;
}

const SunPathScene: React.FC<Props> = ({ latitude, longitude, date = new Date() }) => {
  const sunPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];

    for (let hour = 0; hour <= 24; hour++) {
      const d = new Date(date);
      d.setHours(hour);
      const { altitude, azimuth } = getSunPosition(latitude, longitude, d);

      const r = 10; // sphere radius
      const radAlt = (altitude * Math.PI) / 180;
      const radAz = (azimuth * Math.PI) / 180;

      const x = r * Math.cos(radAlt) * Math.sin(radAz);
      const y = r * Math.sin(radAlt);
      const z = r * Math.cos(radAlt) * Math.cos(radAz);

      points.push(new THREE.Vector3(x, y, z));
    }

    return points;
  }, [latitude, longitude, date]);

  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#ccc" />
      </mesh>

      {/* Sun path line */}
      <line>
        <bufferGeometry attach="geometry" setFromPoints={sunPoints} />
        <lineBasicMaterial attach="material" color="orange" linewidth={2} />
      </line>

      {/* Sun positions as small spheres */}
      {sunPoints.map((pos, idx) => (
        <mesh key={idx} position={pos.toArray()} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      ))}

      {/* Central marker (observer's position) */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.2, 32]} />
        <meshStandardMaterial color="blue" />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[20, 30, 10]}
        intensity={1.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 1, 100]} />
      </directionalLight>
    </>
  );
};

const SunPath3D: React.FC<Props> = ({ latitude, longitude, date }) => {
  return (
    <Canvas
      shadows
      style={{ height: '600px', background: '#f0f0f0' }}
      camera={{ position: [0, 10, 20], fov: 50 }}
    >
      <PerspectiveCamera makeDefault position={[15, 10, 20]} />
      <OrbitControls />
      <SunPathScene latitude={latitude} longitude={longitude} date={date} />
    </Canvas>
  );
};

export default SunPath3D;
