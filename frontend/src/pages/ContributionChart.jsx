import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { 
  Search, Bookmark, Star, X, Check, 
  TrendingUp, Award, Zap, FileText, Hash, HelpCircle, Loader2,
  Clock, LayoutDashboard, List,
  ChevronLeft, RefreshCw, ChevronDown, ChevronUp, ChevronsDown, RotateCcw,
  ListFilter, History, Users, Lightbulb 
} from 'lucide-react';

/* --- HELP TOOLTIP (Header) --- */
function ChartTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
         onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <HelpCircle size={13} color="#b3b3b3ff" style={{ cursor: "help" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: "8px", width: "220px", padding: "10px", backgroundColor: "#0F172A",
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

/* --- DATA HOVER TOOLTIP --- */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        padding: '10px', 
        border: '1px solid #E2E8F0', 
        borderRadius: '8px', 
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ marginBottom: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>{label}</p>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#64748B' }}>{total} Papers</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {payload.slice().reverse().map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: entry.color }} />
              <span style={{ fontSize: '11px', color: '#64748B', flex: 1 }}>{entry.name}</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0F172A' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ROLE_COLORS = {
  'Solo Author': '#f5bb0bff',
  'First Author': '#30aa83ff',
  'Last Author': '#044168',
  'Co-Author': '#CBD5E1'
};

const ROLES = ['Solo Author', 'First Author', 'Last Author', 'Co-Author'];
const VELOCITY_THRESHOLD = 15;

export default function ContributionChart({ papers }) {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [disabledSeries, setDisabledSeries] = useState([]);

  const { chartData, hasLargeHistory, insight } = useMemo(() => {
    if (!papers || papers.length === 0) return { chartData: [], hasLargeHistory: false, insight: null };

    const yearMap = {};
    papers.forEach(p => {
      const year = parseInt(p.year);
      if (!year) return;
      if (!yearMap[year]) {
        yearMap[year] = { year, 'Co-Author': 0, 'Last Author': 0, 'First Author': 0, 'Solo Author': 0, total: 0 };
      }
      let role = p.role || 'Co-Author';
      if (role.includes('First')) role = 'First Author';
      else if (role.includes('Solo')) role = 'Solo Author';
      else if (role.includes('Last')) role = 'Last Author';
      else role = 'Co-Author';

      yearMap[year][role] += 1;
      yearMap[year].total += 1;
    });

    const allYearsSorted = Object.values(yearMap).sort((a, b) => a.year - b.year);
    
    let peakYear = [...allYearsSorted].sort((a, b) => b.total - a.total)[0];
    let insightData = null;

    if (peakYear && peakYear.total >= VELOCITY_THRESHOLD) {
      const isLeadDominant = (peakYear['First Author'] + peakYear['Solo Author']) / peakYear.total > 0.5;
      if (isLeadDominant) {
        insightData = { type: 'warning', text: 'Extreme Individual Velocity', sub: 'High first-author volume detected.' };
      } else {
        insightData = { type: 'info', text: 'High Group Throughput', sub: 'Dominated by non-primary authorship, consistent with senior PI or lab leadership.'};
      }
    }

    const largeHistory = allYearsSorted.length > 15;
    const finalData = (!showFullHistory && largeHistory) ? allYearsSorted.slice(-10) : allYearsSorted;

    return { chartData: finalData, hasLargeHistory: largeHistory, insight: insightData };
  }, [papers, showFullHistory]);

  const toggleSeries = (role) => {
    setDisabledSeries(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  if (chartData.length === 0) return null;

  return (
    <div style={{ height: 320, display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A", margin: 0 }}>Authorship Role Distribution</h4>
            <ChartTooltip text="The dashed line marks 15 papers/year. Peaks above this threshold reveal if output is driven by primary contribution (Solo/First Author) or senior oversight (Last Author)." />
          </div>
          <p style={{ fontSize: "11.5px", color: "#64748B", marginTop: "2.5px", fontStyle: "italic" }}>Yearly publication output categorized by contribution role.</p>
        </div>

        {hasLargeHistory && (
          <button 
            onClick={() => setShowFullHistory(!showFullHistory)}
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "6px", border: "1px solid #E2E8F0", backgroundColor: "white", fontSize: "10px", fontWeight: "700", color: "#475569", cursor: "pointer" }}
          >
            {showFullHistory ? <ListFilter size={12} /> : <History size={12} />}
            {showFullHistory ? "RECENT" : "FULL CAREER"}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, marginTop: -10 }}>
        {ROLES.map(role => (
          <div key={role} onClick={() => toggleSeries(role)}
               style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: disabledSeries.includes(role) ? 0.3 : 1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: ROLE_COLORS[role] }} />
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>{role}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: -25, right: 5, top: 10 }}>
            <CartesianGrid stroke="#F1F5F9" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 500 }} minTickGap={30} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
            
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
            
            {/* REFERENCE LINE */}
            <ReferenceLine 
              y={VELOCITY_THRESHOLD} 
              stroke="#c82626ff" 
              strokeDasharray="4 3" 
              label={(props) => {
                const { viewBox } = props;
                const xPos = viewBox.width - 105; 
                const yPos = viewBox.y - 4; 
                return (
                  <g>
                    <text 
                      x={xPos + 102} 
                      y={yPos + 1} 
                      fill="#c82626ff" 
                      fontSize="8" 
                      fontWeight="600" 
                      textAnchor="middle" 
                      style={{ pointerEvents: 'none', letterSpacing: '0.02em' }}
                    >
                      High Volume Limit
                    </text>
                  </g>
                );
              }} 
            />
            
            {/* STACKING */}
            <Bar key="Solo Author" dataKey="Solo Author" name="Solo Author" stackId="a" fill={ROLE_COLORS['Solo Author']} hide={disabledSeries.includes('Solo Author')} maxBarSize={45} />
            <Bar key="First Author" dataKey="First Author" name="First Author" stackId="a" fill={ROLE_COLORS['First Author']} hide={disabledSeries.includes('First Author')} maxBarSize={45} />
            <Bar key="Last Author" dataKey="Last Author" name="Last Author" stackId="a" fill={ROLE_COLORS['Last Author']} hide={disabledSeries.includes('Last Author')} maxBarSize={45} />
            <Bar 
              key="Co-Author" 
              dataKey="Co-Author" 
              name="Co-Author" 
              stackId="a" 
              fill={ROLE_COLORS['Co-Author']} 
              hide={disabledSeries.includes('Co-Author')} 
              radius={[2, 2, 0, 0]} 
              maxBarSize={45} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {insight && (
        <div style={{ 
          marginTop: "2px", display: "flex", alignItems: "center", gap: "8px", 
          color: insight.type === 'warning' ? "#B91C1C" : "#0369A1", 
          backgroundColor: insight.type === 'warning' ? "#FEF2F2" : "#F0F9FF",
          padding: "6px 10px", borderRadius: "6px", border: `1px solid ${insight.type === 'warning' ? '#FEE2E2' : '#E0F2FE'}`
        }}>
          <Lightbulb size={15} /> 
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase" }}>{insight.text}</span>
            <span style={{ fontSize: "10px", fontWeight: "500" }}>{insight.sub}</span>
          </div>
        </div>
      )}
    </div>
  );
}
