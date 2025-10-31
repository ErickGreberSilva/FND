"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const SunSimulator = dynamic(() => import('../components/SunSimulator'), { ssr: false });

export default function SunProvider() {
  const [latitude, setLatitude] = useState<number>(40.7128);
  const [longitude, setLongitude] = useState<number>(-74.006);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [minutes, setMinutes] = useState<number>(720); // start at noon

  // Format time label
  const timeStr = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>☀️ Sun Movement Simulator</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Latitude:
          <input
            type="number"
            value={latitude}
            onChange={(e) => setLatitude(parseFloat(e.target.value))}
            step="0.01"
          />
        </label>
        <label style={{ marginLeft: '1rem' }}>
          Longitude:
          <input
            type="number"
            value={longitude}
            onChange={(e) => setLongitude(parseFloat(e.target.value))}
            step="0.01"
          />
        </label>
        <label style={{ marginLeft: '1rem' }}>
          Date:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label style={{ marginLeft: '1rem' }}>
          Time:
          <input
            type="range"
            min={0}
            max={1435}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value))}
            style={{ width: 300 }}
          />
          <span style={{ marginLeft: 8 }}>{timeStr}</span>
        </label>
      </div>

      <SunSimulator
        latitude={latitude}
        longitude={longitude}
        date={new Date(date)}
        minutes={minutes}
      />
    </div>
  );
}