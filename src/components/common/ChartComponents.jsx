import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

export function Sparkline({ data = [30, 45, 38, 62, 55, 78, 85], isPositive = true, color = '#10B981' }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 32;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="w-24 h-8 shrink-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
}

export function InteractiveRevenueChart({ timeframe = 'week', onTimeframeChange }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const weekData = [
    { label: 'Mon', revenue: 42500, orders: 12, prev: 38000 },
    { label: 'Tue', revenue: 58200, orders: 18, prev: 44000 },
    { label: 'Wed', revenue: 51000, orders: 16, prev: 49500 },
    { label: 'Thu', revenue: 74300, orders: 24, prev: 59000 },
    { label: 'Fri', revenue: 89000, orders: 29, prev: 72000 },
    { label: 'Sat', revenue: 112400, orders: 38, prev: 88000 },
    { label: 'Sun', revenue: 96500, orders: 31, prev: 81000 },
  ];

  const monthData = [
    { label: 'Week 1', revenue: 260000, orders: 84, prev: 220000 },
    { label: 'Week 2', revenue: 310000, orders: 98, prev: 275000 },
    { label: 'Week 3', revenue: 385000, orders: 122, prev: 310000 },
    { label: 'Week 4', revenue: 420000, orders: 140, prev: 360000 },
  ];

  const activeData = timeframe === 'month' ? monthData : weekData;
  const maxRevenue = Math.max(...activeData.map(d => Math.max(d.revenue, d.prev))) * 1.15;
  const chartHeight = 220;
  const chartWidth = 600;

  // Compute SVG Points
  const getCoordinates = (val, index) => {
    const x = (index / (activeData.length - 1)) * (chartWidth - 60) + 30;
    const y = chartHeight - (val / maxRevenue) * (chartHeight - 40) - 20;
    return { x, y };
  };

  const currentPoints = activeData.map((d, i) => {
    const { x, y } = getCoordinates(d.revenue, i);
    return `${x},${y}`;
  }).join(' ');

  const prevPoints = activeData.map((d, i) => {
    const { x, y } = getCoordinates(d.prev, i);
    return `${x},${y}`;
  }).join(' ');

  const currentArea = `30,${chartHeight - 15} ${currentPoints} ${chartWidth - 30},${chartHeight - 15}`;

  return (
    <div className="w-full relative">
      {/* SVG Canvas */}
      <div className="relative w-full h-64">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="revenueForestGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F3821" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0F3821" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="goldStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0F3821" />
              <stop offset="50%" stopColor="#1A4D2E" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - ratio * (chartHeight - 40) - 20;
            return (
              <g key={i}>
                <line
                  x1="30"
                  y1={y}
                  x2={chartWidth - 30}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text x="25" y={y + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">
                  {formatCurrency(Math.round((ratio * maxRevenue) / 1000) * 1000).replace('৳', '')}k
                </text>
              </g>
            );
          })}

          {/* Previous Period Area/Line (Dashed Gray) */}
          <polyline
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="5 5"
            points={prevPoints}
            opacity="0.6"
          />

          {/* Current Period Area */}
          <polygon points={currentArea} fill="url(#revenueForestGradient)" />

          {/* Current Period Main Curve */}
          <polyline
            fill="none"
            stroke="url(#goldStrokeGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={currentPoints}
          />

          {/* Data Points with Interaction */}
          {activeData.map((item, idx) => {
            const { x, y } = getCoordinates(item.revenue, idx);
            const isHovered = hoverIndex === idx;

            return (
              <g key={idx} className="cursor-pointer">
                {/* Vertical guide line on hover */}
                {isHovered && (
                  <line
                    x1={x}
                    y1="10"
                    x2={x}
                    y2={chartHeight - 15}
                    stroke="#0F3821"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.4"
                  />
                )}
                
                {/* Outer Glow */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 8 : 4.5}
                  fill={isHovered ? '#D4AF37' : '#0F3821'}
                  className="transition-all duration-200"
                />
                <circle cx={x} cy={y} r={isHovered ? 4 : 2} fill="#FFFFFF" />

                {/* Transparent hit area */}
                <rect
                  x={x - 20}
                  y="0"
                  width="40"
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                />

                {/* X-Axis Label */}
                <text
                  x={x}
                  y={chartHeight + 12}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered ? 'fill-brand-900 font-bold' : 'fill-slate-500'
                  }`}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && (
          <div
            className="absolute z-20 bg-brand-950 text-white p-3 rounded-xl shadow-xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 border border-gold-500/30 transition-all duration-150"
            style={{
              left: `${(hoverIndex / (activeData.length - 1)) * 90 + 5}%`,
              top: '35%'
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-gold-400 mb-1">
              <span>{activeData[hoverIndex].label}</span>
              <span className="text-slate-400 font-normal">Sales Summary</span>
            </div>
            <div className="space-y-1">
              <p className="flex justify-between gap-4">
                <span className="text-slate-300">Revenue:</span>
                <span className="font-bold text-white">{formatCurrency(activeData[hoverIndex].revenue)}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-slate-300">Orders:</span>
                <span className="font-semibold text-emerald-400">{activeData[hoverIndex].orders} orders</span>
              </p>
              <p className="flex justify-between gap-4 text-[10px] text-slate-400 pt-1 border-t border-white/10">
                <span>Prev Period:</span>
                <span>{formatCurrency(activeData[hoverIndex].prev)}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand-900 ring-2 ring-gold-400/40"></span>
            <span className="font-medium text-slate-700">Current Period (৳523,900)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 rounded-sm bg-slate-400"></span>
            <span className="text-slate-500">Previous Period</span>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          +18.4% vs Previous
        </span>
      </div>
    </div>
  );
}

export function CategoryDonutChart({ categories = [] }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const defaultCategories = [
    { name: 'Bed Sheets & Linen', amount: 168400, percentage: 32, color: '#0F3821' },
    { name: "Women's Fashion & Silk", amount: 142000, percentage: 27, color: '#D4AF37' },
    { name: 'Organic Food & Agro', amount: 126300, percentage: 24, color: '#2D8050' },
    { name: 'Home Decor & Crafts', amount: 89400, percentage: 17, color: '#64748B' }
  ];

  const data = categories.length ? categories : defaultCategories;
  const total = data.reduce((acc, cur) => acc + cur.amount, 0);

  // Calculate SVG stroke dashes for donut ring
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
      {/* Donut SVG */}
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          {data.map((cat, idx) => {
            const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += cat.percentage / 100;
            const isHovered = hoveredSlice === idx;

            return (
              <circle
                key={idx}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={cat.color}
                strokeWidth={isHovered ? "26" : "20"}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            {hoveredSlice !== null ? data[hoveredSlice].name.split(' ')[0] : 'Total Sales'}
          </span>
          <span className="text-base font-extrabold text-brand-950">
            {hoveredSlice !== null ? formatCurrency(data[hoveredSlice].amount) : formatCurrency(total)}
          </span>
          <span className="text-[10px] font-semibold text-emerald-600">
            {hoveredSlice !== null ? `${data[hoveredSlice].percentage}% Share` : '100% Volume'}
          </span>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="flex-1 w-full space-y-2.5">
        {data.map((cat, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoveredSlice(idx)}
            onMouseLeave={() => setHoveredSlice(null)}
            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
              hoveredSlice === idx ? 'bg-brand-50/80 shadow-sm border border-brand-100' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
              <span className="text-xs font-semibold text-slate-700">{cat.name}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900">{formatCurrency(cat.amount)}</span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-medium">({cat.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
