import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Info } from 'lucide-react';

const COLORS = ['#0F172A', '#3B82F6', '#94A3B8', '#F59E0B', '#10B981'];

export default function PublicationAnalytics({ papers }) {
  const { venueTypeData, rankDistributionData } = useMemo(() => {
    const typeCounts = { Journal: 0, Conference: 0, Other: 0 };
    const rankCounts = { "A*": 0, "A": 0, "B": 0, "C": 0, "Q1": 0, "Q2": 0, "Other": 0 };

    papers.forEach(p => {
      // Type Logic
      const t = (p.venue_type || "").toLowerCase();
      if (t.includes('journal')) typeCounts.Journal++;
      else if (t.includes('conference') || t.includes('proceeding')) typeCounts.Conference++;
      else typeCounts.Other++;

      // Rank Logic
      const r = p.rank || "Other";
      if (rankCounts.hasOwnProperty(r)) rankCounts[r]++;
      else rankCounts.Other++;
    });

    return {
      venueTypeData: Object.entries(typeCounts)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value })),
      rankDistributionData: Object.entries(rankCounts)
        .filter(([_, value]) => value > 0)
        .map(([name, count]) => ({ name, count }))
    };
  }, [papers]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 280px", gap: "20px", marginBottom: "32px" }}>
      
      {/* Pie Chart: Venue Types */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "12px" }}>Venue Distribution</h4>
        <div style={{ height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={venueTypeData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {venueTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <ReTooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart: Rank Distribution */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "12px" }}>Quality Tiers</h4>
        <div style={{ height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankDistributionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} />
              <ReTooltip cursor={{ fill: '#F8FAFC' }} />
              <Bar dataKey="count" fill="#0F172A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side Info Panel */}
      <div style={{ backgroundColor: "#0F172A", padding: "20px", borderRadius: "12px", color: "white", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Info size={16} color="#3B82F6" />
          <h4 style={{ fontSize: "13px", fontWeight: "700" }}>Metrics Guide</h4>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#3B82F6", display: "block", marginBottom: "4px" }}>Quartiles (Q1-Q2)</span>
            <p style={{ fontSize: "11px", color: "#94A3B8", lineHeight: "1.5" }}>Journal tiers based on Impact Factor. Q1 indicates top 25% of the subject category.</p>
          </div>
          <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255,255,255,0.1)" }}></div>
          <div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#10B981", display: "block", marginBottom: "4px" }}>CORE Ranks (A*, A)</span>
            <p style={{ fontSize: "11px", color: "#94A3B8", lineHeight: "1.5" }}>Leading international conference rankings. A* denotes flagship venues.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
