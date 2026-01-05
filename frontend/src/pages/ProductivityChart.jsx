import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function ProductivityChart({ papers }) {
  // --- DATA TRANSFORMATION ---
  const chartData = useMemo(() => {
    if (!papers || papers.length === 0) return [];

    // 1. Group by Year
    const stats = {};
    papers.forEach((p) => {
      // Clean year data
      const year = parseInt(p.year);
      const citations = parseInt(p.citations) || 0;

      if (!year || year <= 1980) return;

      if (!stats[year]) {
        stats[year] = { year, papers: 0, citations: 0 };
      }
      
      stats[year].papers += 1;
      stats[year].citations += citations;
    });

    // 2. Convert to Array and Sort Chronologically
    return Object.values(stats).sort((a, b) => a.year - b.year);
  }, [papers]);

  if (chartData.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A", margin: 0 }}>Productivity vs. Impact</h4>
        <p style={{ fontSize: "11px", color: "#64748B", margin: 0 }}>Output Volume (Bars) vs. Citations (Line)</p>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
        >
          <CartesianGrid stroke="#F1F5F9" vertical={false} />
          
          {/* X Axis */}
          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 10, fill: "#64748B" }} 
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
          />

          {/* Left Y-Axis: Papers (Bars) */}
          <YAxis 
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 10, fill: "#64748B" }} 
            axisLine={false}
            tickLine={false}
            label={{ value: 'Papers', angle: -90, position: 'insideLeft', fontSize: 10, fill: "#94A3B8" }}
          />

          {/* Right Y-Axis: Citations (Line) */}
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#64748B" }} 
            axisLine={false}
            tickLine={false}
            label={{ value: 'Citations', angle: 90, position: 'insideRight', fontSize: 10, fill: "#94A3B8" }}
          />

          <Tooltip 
            contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
            itemStyle={{ fontSize: "12px", fontWeight: "600" }}
            labelStyle={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}
          />
          
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}/>

          {/* The Visuals */}
          <Bar 
            yAxisId="left" 
            dataKey="papers" 
            name="Papers Published" 
            fill="#CBD5E1" 
            barSize={20}
            radius={[4, 4, 0, 0]}
          />
          
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="citations" 
            name="Citation Impact" 
            stroke="#0F172A" 
            strokeWidth={3} 
            dot={{ r: 2, fill: "#0F172A" }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
