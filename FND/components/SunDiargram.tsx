'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import SunCalc from 'suncalc';

const SunPathStereographic: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Estado: sliders
  const [dayOfYear, setDayOfYear] = useState<number>(new Date().getMonth() * 30 + new Date().getDate());
  const [minutes, setMinutes] = useState<number>(720); // 12:00

  const latitude = -25.4284;
  const longitude = -49.2733;

  const getDateFromDayOfYear = (day: number) => {
    const year = new Date().getFullYear();
    const date = new Date(Date.UTC(year, 0, 1));
    date.setUTCDate(day);
    return date;
  };

  useEffect(() => {
    const date = getDateFromDayOfYear(dayOfYear);
    const width = 600;
    const height = width;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cx = width / 2;
    const cy = height / 2;

    const projection = d3.geoStereographic()
      .reflectY(true)
      .scale((width - 100) * 0.5)
      .clipExtent([[0, 0], [width, height]])
      .rotate([0, -90])
      .translate([cx, cy])
      .precision(0.1);

    const path = d3.geoPath(projection);
    const outline = d3.geoCircle().radius(90).center([0, 90])();
    const graticule = d3.geoGraticule().stepMinor([15, 10])();

    const formatHour = (m: number) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('font', '10px sans-serif')
      .attr('text-anchor', 'middle');

    svg.append('path')
      .attr('d', path(graticule)!)
      .attr('fill', 'none')
      .attr('stroke', '#aaa')
      .attr('stroke-opacity', 0.2);

    svg.append('path')
      .attr('d', path(outline)!)
      .attr('fill', 'none')
      .attr('stroke', '#fff');

    svg.append('g')
      .selectAll('text')
      .data(d3.range(0, 360, 10))
      .join('text')
      .attr('dy', '0.35em')
      .attr('font-size', d => d % 90 ? null : 14)
      .attr('font-weight', d => d % 90 ? null : 'bold')
      .text(d => d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : `${d}°`)
      .attr('x', d => projection([d, -4])![0])
      .attr('y', d => projection([d, -4])![1]);

    svg.append('g')
      .selectAll('text')
      .data(d3.range(10, 91, 10))
      .join('text')
      .attr('dy', '0.35em')
      .text(d => `${d}°`)
      .attr('x', d => projection([180, d])![0])
      .attr('y', d => projection([180, d])![1]);

    const getSunPosition = (date: Date): [number, number] => {
      const pos = SunCalc.getPosition(date, latitude, longitude);
      const azimuth = pos.azimuth * 180 / Math.PI;
      const altitude = pos.altitude * 180 / Math.PI;
      return [azimuth, altitude];
    };

    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCHours(23, 59, 0, 0);
    const times = d3.utcMinutes(start, end, 5);

    const pathCoords: [number, number][] = times
      .map(getSunPosition)
      .filter(([, alt]) => alt > 0);

    svg.append('path')
      .attr('d', path({ type: 'LineString', coordinates: pathCoords } as any)!)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', 2);

    const currentDate = new Date(date);
    currentDate.setUTCHours(0, minutes, 0, 0);
    const [azimuthNow, altitudeNow] = getSunPosition(currentDate);
    const projNow = projection([azimuthNow, altitudeNow]);

    if (projNow && altitudeNow > 0) {
      svg.append('circle')
        .attr('cx', projNow[0])
        .attr('cy', projNow[1])
        .attr('r', 5)
        .attr('fill', 'gold')
        .attr('stroke', 'black');
    }

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .text(`📅 ${date.toLocaleDateString('pt-BR')}  |  ⏰ ${formatHour(minutes)}`);

  }, [dayOfYear, minutes]);

  return (
    <div>
      <h2>☀️ Trajetória Solar - Curitiba</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Dia do ano: {dayOfYear}
          <input
            type="range"
            min={1}
            max={365}
            step={1}
            value={dayOfYear}
            onChange={(e) => setDayOfYear(parseInt(e.target.value))}
            style={{ width: 400, display: 'block' }}
          />
        </label>

        <label>
          Horário: {Math.floor(minutes / 60)}h {minutes % 60}min
          <input
            type="range"
            min={0}
            max={1440}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value))}
            style={{ width: 400, display: 'block' }}
          />
        </label>
      </div>

      <svg ref={svgRef} width={600} height={600} />
    </div>
  );
};

export default SunPathStereographic;
