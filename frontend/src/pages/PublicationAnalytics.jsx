import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const COLORS_PIE = ['#3EA2DB', '#044168', '#0F172A']; 
const COLOR_JOURNAL = '#044168';   
const COLOR_CONF = '#3EA2DB';      

export default function PublicationAnalytics({ papers }) {
  
  const { venueTypeData, journalData, confData, totals } = useMemo(() => {
    const typeCounts = { 'Conference': 0, 'Journal': 0, 'N/A': 0 };
    const journalBuckets = { "Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0, "N/A": 0 };
    const confBuckets = { "A*": 0, "A": 0, "B": 0, "C": 0, "N/A": 0 };

    papers.forEach(p => {
      const t = (p.venue_type || "").toLowerCase();
      const r = (p.rank || "N/A").toUpperCase();
      const cleanRank = r === "OTHER" || r === "UNKNOWN" ? "N/A" : r;

      if (t.includes('journal')) {
          typeCounts['Journal']++;
          if (journalBuckets.hasOwnProperty(cleanRank)) journalBuckets[cleanRank]++;
          else journalBuckets['N/A']++;
      } else if (t.includes('conference') || t.includes('proceeding')) {
          typeCounts['Conference']++;
          if (confBuckets.hasOwnProperty(cleanRank)) confBuckets[cleanRank]++;
          else confBuckets['N/A']++;
      } else {
          typeCounts['N/A']++;
      }
    });

    const pieData = [
      { name: 'Conference', value: typeCounts['Conference'] },
      { name: 'Journal', value: typeCounts['Journal'] },
      { name: 'N/A', value: typeCounts['N/A'] }
    ].filter(d => d.value > 0);

    const jData = ["Q1", "Q2", "Q3", "Q4", "N/A"].map(key => ({ name: key, count: journalBuckets[key] }));
    const cData = ["A*", "A", "B", "C", "N/A"].map(key => ({ name: key, count: confBuckets[key] }));

    return { venueTypeData: pieData, journalData: jData, confData: cData, totals: typeCounts };
  }, [papers]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const displayName = name === 'Other' ? 'N/A' : name;

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" style={{ pointerEvents: 'none' }}>
        {`${displayName} (${value})`}
      </text>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "25px", marginBottom: "32px", alignItems: "stretch" }}>
      
      {/* 1. PIE CHART: Venue Breakdown */}
      <div style={{ backgroundColor: "white", padding: "15px", borderRadius: "10px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "15px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", textTransform: "uppercase", margin: 0 }}>Venue Breakdown</h4>
            <p style={{ fontSize: "11px", color: "#64748B", margin: "3px 0 0 0" }}>
                Total Papers: <span style={{ fontWeight: "500", color: "#0F172A", fontStyle: "italic" }}>{papers.length}</span>
            </p>
        </div>
        <div style={{ flex: 1, minHeight: "215px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={venueTypeData} cx="50%" cy="50%" outerRadius="100%" dataKey="value" label={renderCustomizedLabel} labelLine={false}>
                {venueTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} stroke="none" />
                ))}
              </Pie>
              <ReTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. BAR CHART: Journal Impact */}
      <div style={{ backgroundColor: "white", padding: "15px", borderRadius: "10px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "15px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", textTransform: "uppercase", margin: 0 }}>Journal Quartiles</h4>
            <p style={{ fontSize: "11px", color: "#64748B", margin: "3px 0 0 0", lineHeight: "1.4" }}>
                <span style={{ color: COLOR_JOURNAL, fontWeight: "700" }}>Q1</span>: Top 25% • <span style={{ color: COLOR_JOURNAL, fontWeight: "700" }}>Q2</span>: 25-50% • <span style={{ color: COLOR_JOURNAL, fontWeight: "700" }}>Q3</span>: 50-75% • <span style={{ color: "#94A3B8", fontWeight: "700" }}>N/A</span>: Unranked
            </p>
        </div>
        <div style={{ flex: 1, minHeight: "215px" }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={journalData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <ReTooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill={COLOR_JOURNAL} radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* 3. CONFERENCE CHART: Conference Rank */}
      <div style={{ backgroundColor: "white", padding: "15px", borderRadius: "10px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: "15px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", textTransform: "uppercase", margin: 0 }}>Conference Ranks</h4>
            <p style={{ fontSize: "11px", color: "#64748B", margin: "3px 0 0 0", lineHeight: "1.4" }}>
                <span style={{ color: COLOR_CONF, fontWeight: "700" }}>A*</span>: Flagship • <span style={{ color: COLOR_CONF, fontWeight: "700" }}>A</span>: Elite • <span style={{ color: COLOR_CONF, fontWeight: "700" }}>B</span>: High • <span style={{ color: "#94A3B8", fontWeight: "700" }}>N/A</span>: Unranked
            </p>
        </div>
        <div style={{ flex: 1, minHeight: "215px" }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <ReTooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill={COLOR_CONF} radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
