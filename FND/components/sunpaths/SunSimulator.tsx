// components/SunSimulator.tsx
"use client";
import { GridHelper } from 'three';
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls , Edges} from '@react-three/drei';
import * as THREE from 'three';
import { getSunPosition } from './SunCalculator';

interface Props {
  latitude: number;
  longitude: number;
  date: Date;
  minutes: number; // 0 to 1435
}

const SunSimulatorScene: React.FC<Props> = ({ latitude, longitude, date, minutes }) => {
  // Build the current date with time
  const currentTime = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, minutes, 0, 0);
    return d;
  }, [date, minutes]);
// Inside SunSimulatorScene


  const sunData = useMemo(() => {
    const { altitude, azimuth } = getSunPosition(latitude, longitude, currentTime);
    const r = 20;

    const radAlt = (altitude * Math.PI) / 180;
    const radAz = (azimuth * Math.PI) / 180;

    const x = r * Math.cos(radAlt) * Math.sin(radAz);
    const y = r * Math.sin(radAlt);
    const z = r * Math.cos(radAlt) * Math.cos(radAz);

    return { x, y, z };
  }, [latitude, longitude, currentTime]);


const sunPathPoints = useMemo(() => {
  const pathPoints: THREE.Vector3[] = [];

  const baseDate = new Date(date);
  for (let i = 0; i <= 288; i++) {
    const current = new Date(baseDate);
    const minutes = i * 5;
    current.setHours(0, minutes, 0, 0);

    const { altitude, azimuth } = getSunPosition(latitude, longitude, current);

    // ⛔ Ignore sun below the horizon
    if (altitude <= 0) continue;

    const r = 20;
    const radAlt = (altitude * Math.PI) / 180;
    const radAz = (azimuth * Math.PI) / 180;

    const x = r * Math.cos(radAlt) * Math.sin(radAz);
    const y = r * Math.sin(radAlt);
    const z = r * Math.cos(radAlt) * Math.cos(radAz);

    pathPoints.push(new THREE.Vector3(x, y, z));
  }

  return pathPoints;
  
}, [latitude, longitude, date]);
console.log("Sun Path Points:", sunPathPoints.length);
  return (
    <>
      {/* Ground */}
      <gridHelper
  args={[50, 10, '#fff', '#000']} // [size, divisions, color1, color2]
  position={[0, 0.01, 0]} // slightly above ground to avoid z-fighting
receiveShadow/>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#fff" />
      </mesh>

      {/* Cube */}
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 10, 5]} />
        <meshStandardMaterial color="#fff" />
        <Edges color="black" /> 
      </mesh>

  {/* Sun sphere at current time */}
<mesh position={[sunData.x, sunData.y, sunData.z]} castShadow>
  <sphereGeometry args={[0.5, 32, 32]} />
  <meshStandardMaterial emissive="yellow" emissiveIntensity={1} />
</mesh>

{/* Sun path trajectory */}

      {/* Sunlight */}
      <directionalLight
        castShadow
        position={[sunData.x, sunData.y, sunData.z]}
        intensity={1.5}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={100}
      />
<line>
  <bufferGeometry attach="geometry" setFromPoints={sunPathPoints} />
  <lineBasicMaterial attach="material" color="#000" linewidth={2} />
</line>
      <ambientLight intensity={0.1} />
      <OrbitControls />
    </>
  );
};

const SunSimulator: React.FC<Props> = (props) => {
  return (
  <Canvas
  shadows
  camera={{ position: [0, 15, 30], fov: 60 }}
  style={{ height: 600, background: '#b3d1ff' }} // pastel blue
>
      <SunSimulatorScene {...props} />
    </Canvas>
  );
};

export default SunSimulator;
