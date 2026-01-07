import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ListFilter, History, HelpCircle } from 'lucide-react';

/* --- SHARED HELP TOOLTIP --- */
function ChartTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
         onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <HelpCircle size={13} color="#b3b3b3ff" style={{ cursor: "help" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: "8px", width: "230px", padding: "10px", backgroundColor: "#0F172A",
          color: "white", fontSize: "11px", borderRadius: "6px", zIndex: 1000, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
          lineHeight: "1.4", fontWeight: "400", textAlign: "center"
        }}>
          {text}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", border: "5px solid transparent", borderTopColor: "#0F172A" }} />
        </div>
      )}
    </div>
  );
}

/* --- MATCHING CUSTOM TOOLTIP --- */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#FFFFFF', padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>{label}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '2px', backgroundColor: entry.color }} />
              <span style={{ fontSize: '11px', color: '#64748B', flex: 1 }}>{entry.name}:</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0F172A' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function ProductivityChart({ papers }) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  const { chartData, hasLargeHistory } = useMemo(() => {
    if (!papers || papers.length === 0) return { chartData: [], hasLargeHistory: false };
    const stats = {};
    papers.forEach((p) => {
      const year = parseInt(p.year);
      const citations = parseInt(p.citations) || 0;
      if (!year || year <= 1980) return;
      if (!stats[year]) stats[year] = { year, papers: 0, citations: 0 };
      stats[year].papers += 1;
      stats[year].citations += citations;
    });
    const allYearsSorted = Object.values(stats).sort((a, b) => a.year - b.year);
    const largeHistory = allYearsSorted.length > 15;
    const finalData = (!showFullHistory && largeHistory) ? allYearsSorted.slice(-10) : allYearsSorted;
    return { chartData: finalData, hasLargeHistory: largeHistory };
  }, [papers, showFullHistory]);

  if (chartData.length === 0) return null;

  return (
    <div style={{ height: 320, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A", margin: 0 }}>Productivity vs. Impact</h4>
            {/* Added Help Icon with Cohort Analysis Explanation */}
            <ChartTooltip text="The line tracks total cumulative citations earned by papers published in each specific year. Note: Recent years naturally show lower impact as papers require time to accumulate citations." />
          </div>
          {/* Updated Subtitle for technical clarity */}
          <p style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2.5px", fontStyle: "italic" }}>Cumulative citations earned per publication cohort.</p>
        </div>
        {hasLargeHistory && (
          <button onClick={() => setShowFullHistory(!showFullHistory)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", backgroundColor: "white", fontSize: "10px", fontWeight: "700", color: "#475569", cursor: "pointer" }}>
            {showFullHistory ? <ListFilter size={12} /> : <History size={12} />}
            {showFullHistory ? "RECENT" : "FULL CAREER"}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 15, marginBottom: 12, marginTop: -10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#CBD5E1' }} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Papers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 2, backgroundColor: '#0F172A' }} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Citations</span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: -25, right: 5, top: 10 }}>
            <CartesianGrid stroke="#F1F5F9" vertical={false} strokeDasharray="3 3" />
            <XAxis 
              dataKey="year" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 500 }} 
              interval={!showFullHistory ? 0 : "preserveStartEnd"}
              minTickGap={showFullHistory ? 30 : 0}
            />
            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
            <Bar yAxisId="left" dataKey="papers" fill="#CBD5E1" barSize={20} radius={[2, 2, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="citations" stroke="#0F172A" strokeWidth={2.5} dot={{ r: 3, fill: "#0F172A", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
