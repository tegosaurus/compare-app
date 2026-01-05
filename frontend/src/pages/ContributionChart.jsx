import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Label 
} from 'recharts';

export default function ContributionChart({ papers }) {
  // group by year -> count roles
  const chartData = useMemo(() => {
    if (!papers || papers.length === 0) return [];

    const yearMap = {};

    papers.forEach(p => {
      const year = p.year || "Unknown";
      if (year === "Unknown") return; // skip papers with no year

      // initialize year bucket if it doesn't exist
      if (!yearMap[year]) {
        yearMap[year] = { 
          year: year, 
          'First Author': 0, 
          'Solo Author': 0, 
          'Last Author': 0, 
          'Co-Author': 0 
        };
      }

      // map backend 'role' string to chart keys
      let role = p.role || "Co-Author"; 
      
      if (role.includes("First")) role = "First Author";
      else if (role.includes("Solo")) role = "Solo Author";
      else if (role.includes("Last")) role = "Last Author";
      else role = "Co-Author";
      
      yearMap[year][role] += 1;
    });

    // convert map to array and sort by year (ascending)
    return Object.values(yearMap).sort((a, b) => a.year - b.year);
  }, [papers]);

  if (chartData.length === 0) return null;

  return (
    <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E5E7EB", height: "400px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>Contribution Role Analysis</h3>
        <p style={{ fontSize: "13px", color: "#6B7280" }}>
          Breakdown of author position over time.
        </p>
      </div>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
            <Tooltip 
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "white", fontSize: "12px" }}
              itemStyle={{ color: "white" }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: "12px", paddingBottom: "20px" }} />
            
            {/* STACKED BARS */}
            <Bar dataKey="Solo Author" stackId="a" fill="#D97706" barSize={40} /> {/* Amber */}
            <Bar dataKey="First Author" stackId="a" fill="#2563EB" barSize={40} /> {/* Blue */}
            <Bar dataKey="Last Author" stackId="a" fill="#10B981" barSize={40} />  {/* Green */}
            <Bar dataKey="Co-Author" stackId="a" fill="#9CA3AF" barSize={40} />    {/* Gray */}

            {/* REFERENCE LINE (High Volume Limit) */}
            <ReferenceLine y={15} stroke="#EF4444" strokeDasharray="3 3">
              <Label value="High Volume Limit" position="insideTopLeft" fill="#EF4444" fontSize={11} />
            </ReferenceLine>

          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
