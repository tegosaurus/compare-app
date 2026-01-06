import { useEffect, useState, useRef } from "react"; 
import { useLocation } from "react-router-dom";
import { 
  Star, 
  TrendingUp, 
  BarChart3, 
  ScatterChart as ScatterIcon, 
  Tag, 
  ScrollText, 
  Table, 
  Users, 
  Trophy,
  ArrowRightLeft
} from "lucide-react";

// --- THEME CONFIG ---
const THEME = {
  primary: "#2563EB",   // Blue
  primaryBg: "#EFF6FF",
  secondary: "#059669", // Emerald
  secondaryBg: "#ECFDF5",
  shared: "#7C3AED",    // Violet
  sharedBg: "#F5F3FF",
  text: "#0F172A",
  subtext: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  tooltipBg: "rgba(15, 23, 42, 0.95)",
};

export default function AnalyzeCompare() {
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState([null, null]);
  const location = useLocation();

  // Load history logic
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("compare_history") || "[]");
    setHistory(saved);

    if (location.state?.preSelectId) {
      const target = saved.find((h) => h.id === location.state.preSelectId);
      if (target) {
        setCompare([target, null]);
      } else {
        setCompare([saved[0] || null, saved[1] || null]);
      }
    } else {
      setCompare([saved[0] || null, saved[1] || null]);
    }
  }, [location.state]);

  const handleSelect = (index, id) => {
    const selected = history.find((h) => h.id === id) || null;
    const next = [...compare];
    next[index] = selected;
    setCompare(next);
  };

  const hasBothAuthors = compare[0] && compare[1];

  return (
    <div style={styles.pageContainer}>
      
      {/* --- HEADER --- */}
      <div style={styles.header}>
        <div>
            <h2 style={styles.pageTitle}>Compare Researchers</h2>
            <p style={styles.pageSubtitle}>Analyze publication impact, venue quality, and research timeline side-by-side.</p>
        </div>
        <div style={styles.headerIcon}>
            <Users size={24} color={THEME.primary} />
        </div>
      </div>

      {/* --- SELECTION BAR --- */}
      <div style={styles.controlBar}>
        <div style={styles.selectWrapper}>
            <div style={{...styles.colorTab, background: THEME.primary}}></div>
            <select value={compare[0]?.id || ""} onChange={(e) => handleSelect(0, e.target.value)} style={styles.selectInput}>
              <option value="">Select Author 1...</option>
              {history.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
        </div>
        <div style={styles.vsBadge}><ArrowRightLeft size={16} /></div>
        <div style={styles.selectWrapper}>
            <div style={{...styles.colorTab, background: THEME.secondary}}></div>
            <select value={compare[1]?.id || ""} onChange={(e) => handleSelect(1, e.target.value)} style={styles.selectInput}>
              <option value="">Select Author 2...</option>
              {history.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
        </div>
      </div>

      {/* --- HERO CARDS --- */}
      <div style={styles.heroGrid}>
        {[0, 1].map((i) => {
          const author = compare[i];
          const color = i === 0 ? THEME.primary : THEME.secondary;
          const bg = i === 0 ? THEME.primaryBg : THEME.secondaryBg;
          
          if (!author) return <div key={i} style={styles.emptyHero}>Select an author above to begin</div>;
          const stats = author.fullReport?.metrics;

          return (
            <div key={i} style={styles.heroCard}>
              <div style={styles.heroHeader}>
                <div style={styles.avatarPlaceholder(color)}>{author.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                    <h3 style={styles.heroName}>{author.name}</h3>
                    <div style={styles.heroAffiliation}>{author.affiliations || "Affiliation N/A"}</div>
                </div>
                <div style={styles.bigScoreBox(bg, color)}>
                    <span style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase'}}>H-Index</span>
                    <span style={{fontSize: 32, fontWeight: 800, lineHeight: 1}}>{author.h_index}</span>
                </div>
              </div>
              <div style={styles.statRow}>
                <StatBox label="Citations" value={author.total_c.toLocaleString()} icon={<Star size={14}/>} />
                <StatBox label="i10-Index" value={stats?.i10_index ?? "-"} icon={<TrendingUp size={14}/>} />
                <StatBox label="Papers" value={stats?.total_p ?? "-"} icon={<ScrollText size={14}/>} />
              </div>
            </div>
          );
        })}
      </div>

      {hasBothAuthors && (
        <>
            {/* ROW 1 */}
            <div style={styles.chartGrid2}>
                <Card title="Publication Quality" subtitle="Comparison by venue ranking" icon={<Trophy size={18} color={THEME.primary}/>}>
                    <RankChart author1={compare[0]} author2={compare[1]} />
                </Card>
                <Card title="Venue Distribution" subtitle="Journals vs Conferences" icon={<BarChart3 size={18} color={THEME.primary}/>}>
                    <VenueTornadoChart author1={compare[0]} author2={compare[1]} />
                </Card>
            </div>

            {/* ROW 2 */}
            <div style={styles.sectionSpacer}>
                <Card title="Timeline & Impact" subtitle="Output and citations over time" icon={<ScatterIcon size={18} color={THEME.primary}/>}>
                    <BubbleChart author1={compare[0]} author2={compare[1]} />
                </Card>
            </div>

             {/* ROW 3 */}
             <div style={styles.chartGrid2}>
                <Card title="Top Venues" subtitle="Most frequent targets" icon={<Table size={18} color={THEME.primary}/>}>
                    <TopVenuesTable author1={compare[0]} author2={compare[1]} />
                </Card>
                <Card title="Research Interests" subtitle="Keyword frequency analysis" icon={<Tag size={18} color={THEME.primary}/>}>
                    <KeywordCloud author1={compare[0]} author2={compare[1]} />
                </Card>
            </div>
        </>
      )}
    </div>
  );
}

// =========================================
// === CHART COMPONENTS WITH TOOLTIPS ===
// =========================================

function KeywordCloud({ author1, author2 }) {
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const k1 = author1?.fullReport?.metrics?.keywords || [];
    const k2 = author2?.fullReport?.metrics?.keywords || [];
    const norm = (str) => str.toLowerCase().trim();
    const allKeywords = {};

    const processList = (list, isA1) => {
        list.forEach((k) => {
            const key = norm(k.text);
            const count = k.count || 1;
            if (!allKeywords[key]) {
                allKeywords[key] = { text: k.text, a1: isA1, a2: !isA1, totalCount: count };
            } else {
                if (isA1) allKeywords[key].a1 = true;
                else allKeywords[key].a2 = true;
                allKeywords[key].totalCount += count;
            }
        });
    };

    processList(k1.slice(0, 15), true);
    processList(k2.slice(0, 15), false);

    const cloudData = Object.values(allKeywords).sort((a,b) => b.totalCount - a.totalCount);

    if (cloudData.length === 0) return <div style={styles.noData}>No keyword data available.</div>;

    const counts = cloudData.map(k => k.totalCount);
    const minC = Math.min(...counts); const maxC = Math.max(...counts);
    const range = maxC - minC || 1;

    const handleEnter = (e, k) => {
        if (!containerRef.current) return;
        const rect = e.target.getBoundingClientRect();
        const cRect = containerRef.current.getBoundingClientRect();
        
        let ownerLabel = "Shared Interest";
        if (k.a1 && !k.a2) ownerLabel = `${author1.name} only`;
        if (!k.a1 && k.a2) ownerLabel = `${author2.name} only`;

        setTooltip({
            x: rect.left - cRect.left + rect.width / 2,
            y: rect.top - cRect.top,
            title: k.text,
            lines: [
                `Count: ${k.totalCount}`,
                `Owner: ${ownerLabel}`
            ]
        });
    };
    
    return (
        <div style={{...styles.chartContainer, justifyContent: 'center', alignContent: 'center'}} ref={containerRef}>
            <Legend a1={author1.name} a2={author2.name} showShared />
            <div style={styles.cloudWrap}>
                {cloudData.map((k, i) => {
                    let bg = THEME.bg; let color = THEME.subtext; let border = "transparent";
                    if (k.a1 && k.a2) { bg = THEME.sharedBg; color = THEME.shared; border = THEME.shared; }
                    else if (k.a1) { bg = THEME.primaryBg; color = THEME.primary; border = THEME.primary; }
                    else if (k.a2) { bg = THEME.secondaryBg; color = THEME.secondary; border = THEME.secondary; }

                    const size = 11 + ((k.totalCount - minC) / range) * 16; 
                    
                    return (
                        <span key={i} 
                            onMouseEnter={(e) => handleEnter(e, k)}
                            onMouseLeave={() => setTooltip(null)}
                            style={{ 
                                fontSize: `${Math.round(size)}px`, 
                                backgroundColor: bg, color: color, 
                                border: `1px solid ${border}`,
                                padding: "4px 10px", borderRadius: "20px", 
                                fontWeight: 600, textTransform: "capitalize",
                                display: 'inline-block', cursor: 'default'
                            }}>
                            {k.text}
                        </span>
                    )
                })}
            </div>
            <TooltipBox tooltip={tooltip} />
        </div>
    );
}

function VenueTornadoChart({ author1, author2 }) {
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const process = (author) => {
        const counts = { "Journal": 0, "Conference": 0, "Book": 0, "Other": 0 };
        if (!author?.fullReport?.papers) return counts;
        author.fullReport.papers.forEach(p => {
            const t = (p.venue_type || "").toLowerCase();
            if (t.includes("journal")) counts["Journal"]++;
            else if (t.includes("conference") || t.includes("proceeding")) counts["Conference"]++;
            else if (t.includes("book") || t.includes("chapter")) counts["Book"]++;
            else counts["Other"]++;
        });
        return counts;
    };
    const d1 = process(author1); const d2 = process(author2);
    const categories = ["Journal", "Conference", "Book", "Other"];
    const maxVal = Math.max( ...categories.map(c => Math.max(d1[c], d2[c])) ) || 1;

    const handleHover = (e, cat, val, authorName) => {
        if (!containerRef.current) return;
        const rect = e.target.getBoundingClientRect();
        const cRect = containerRef.current.getBoundingClientRect();
        setTooltip({
            x: rect.left - cRect.left + rect.width / 2,
            y: rect.top - cRect.top,
            title: cat,
            lines: [`${authorName}`, `Papers: ${val}`]
        });
    };

    return (
        <div style={styles.chartContainer} ref={containerRef}>
            <Legend a1={author1.name} a2={author2.name} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                {categories.map(cat => {
                    const v1 = d1[cat]; const v2 = d2[cat];
                    const w1 = (v1 / maxVal) * 100; 
                    const w2 = (v2 / maxVal) * 100;
                    if (v1 === 0 && v2 === 0) return null;

                    return (
                        <div key={cat} style={{ display: "flex", alignItems: "center" }}>
                            {/* Left Side (Author 1) */}
                            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                                {v1 > 0 && <span style={styles.barLabel}>{v1}</span>}
                                <div 
                                    onMouseEnter={(e) => handleHover(e, cat, v1, author1.name)}
                                    onMouseLeave={() => setTooltip(null)}
                                    style={{ width: `${w1}%`, height: 20, background: THEME.primary, borderRadius: "4px 0 0 4px", transition: "width 0.5s", cursor: "pointer" }}
                                ></div>
                            </div>
                            {/* Label */}
                            <div style={styles.tornadoLabel}>{cat}</div>
                            {/* Right Side (Author 2) */}
                            <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
                                <div 
                                    onMouseEnter={(e) => handleHover(e, cat, v2, author2.name)}
                                    onMouseLeave={() => setTooltip(null)}
                                    style={{ width: `${w2}%`, height: 20, background: THEME.secondary, borderRadius: "0 4px 4px 0", transition: "width 0.5s", cursor: "pointer" }}
                                ></div>
                                {v2 > 0 && <span style={styles.barLabel}>{v2}</span>}
                            </div>
                        </div>
                    )
                })}
            </div>
            <TooltipBox tooltip={tooltip} />
        </div>
    );
}

function RankChart({ author1, author2 }) {
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const processData = (author) => {
        if (!author?.fullReport?.papers) return {};
        const counts = {};
        author.fullReport.papers.forEach(p => {
            let r = p.rank || "Unranked";
            if (r.includes("Q1")) r = "Q1"; else if (r.includes("Q2")) r = "Q2"; else if (r.includes("A*")) r = "A*"; 
            else if (r === "A") r = "A"; else if (r === "B") r = "B"; 
            else if (r.includes("National") || r.includes("Unranked")) return; 
            counts[r] = (counts[r] || 0) + 1;
        });
        return counts;
    };
    const d1 = processData(author1); const d2 = processData(author2);
    const RANKS = ["A*", "A", "Q1", "Q2", "B"];
    const maxVal = Math.max( ...RANKS.map(l => Math.max(d1[l] || 0, d2[l] || 0)) ) || 1;

    const handleHover = (e, rank, val, authorName, total) => {
        if (!containerRef.current) return;
        const rect = e.target.getBoundingClientRect();
        const cRect = containerRef.current.getBoundingClientRect();
        // Calc percentage
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        
        setTooltip({
            x: rect.left - cRect.left + rect.width / 2,
            y: rect.top - cRect.top,
            title: `Rank: ${rank}`,
            lines: [
                `${authorName}`, 
                `${val} Papers`
            ]
        });
    };

    const total1 = Object.values(d1).reduce((a,b)=>a+b,0);
    const total2 = Object.values(d2).reduce((a,b)=>a+b,0);

    return (
        <div style={styles.chartContainer} ref={containerRef}>
            <Legend a1={author1.name} a2={author2.name} />
            <div style={{ display: "flex", height: 180, alignItems: "flex-end", gap: 16, marginTop: 20 }}>
                {RANKS.map((label) => {
                    const v1 = d1[label] || 0; const v2 = d2[label] || 0;
                    const h1 = (v1 / maxVal) * 100; const h2 = (v2 / maxVal) * 100;
                    
                    return (
                        <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%", width: '100%', justifyContent: 'center' }}>
                                {/* Bar 1 */}
                                <div 
                                    onMouseEnter={(e) => handleHover(e, label, v1, author1.name, total1)}
                                    onMouseLeave={() => setTooltip(null)}
                                    style={{ width: 14, height: `${h1}%`, background: THEME.primary, borderRadius: "2px 2px 0 0", minHeight: v1?2:0, cursor: 'pointer' }}
                                ></div>
                                {/* Bar 2 */}
                                <div 
                                    onMouseEnter={(e) => handleHover(e, label, v2, author2.name, total2)}
                                    onMouseLeave={() => setTooltip(null)}
                                    style={{ width: 14, height: `${h2}%`, background: THEME.secondary, borderRadius: "2px 2px 0 0", minHeight: v2?2:0, cursor: 'pointer' }}
                                ></div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.subtext, marginTop: 8 }}>{label}</div>
                        </div>
                    );
                })}
            </div>
            <TooltipBox tooltip={tooltip} />
        </div>
    );
}

function BubbleChart({ author1, author2 }) {
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const aggregateData = (author) => {
        if (!author?.fullReport?.papers) return [];
        const yearMap = {};
        author.fullReport.papers.forEach(p => {
            const year = parseInt(p.year);
            const cits = parseInt(p.citations) || 0;
            if (!year || isNaN(year) || year > new Date().getFullYear() + 1) return;
            if (!yearMap[year]) { yearMap[year] = { year, count: 0, citations: 0 }; }
            yearMap[year].count += 1; yearMap[year].citations += cits;
        });
        return Object.values(yearMap).sort((a,b) => a.year - b.year);
    };

    const d1 = aggregateData(author1).map(d => ({ ...d, authorIdx: 0 }));
    const d2 = aggregateData(author2).map(d => ({ ...d, authorIdx: 1 }));
    const combinedData = [...d1, ...d2];
    
    if (combinedData.length === 0) return <div style={styles.noData}>No timeline data available.</div>;

    const years = combinedData.map(d => d.year);
    const minYear = Math.min(...years); const maxYear = Math.max(...years);
    const yearSpan = maxYear - minYear || 1; 
    const maxPapers = Math.max(...combinedData.map(d => d.count)) || 1;
    const maxCits = Math.max(...combinedData.map(d => d.citations)) || 1;

    const height = 280; const width = 800; 
    const pad = { t: 20, r: 20, b: 30, l: 40 };
    const chartW = width - pad.l - pad.r; const chartH = height - pad.t - pad.b;
    const getX = (year) => ((year - minYear) / yearSpan) * chartW;
    const getY = (count) => chartH - ((count / maxPapers) * chartH);
    const getR = (cits) => 4 + (cits / maxCits) * 20;

    const xLabels = []; const step = yearSpan > 15 ? 5 : Math.ceil(yearSpan / 8); 
    for(let y = minYear; y <= maxYear; y+=step) { xLabels.push(y); }

    const handleMouseEnter = (e, data) => {
        if(!containerRef.current) return;
        const rect = e.target.getBoundingClientRect();
        const cRect = containerRef.current.getBoundingClientRect();
        const name = data.authorIdx === 0 ? author1.name : author2.name;
        
        setTooltip({ 
            x: rect.left - cRect.left + rect.width / 2, 
            y: rect.top - cRect.top, 
            title: `${data.year} (${name})`,
            lines: [
                `Papers: ${data.count}`,
                `Citations: ${data.citations}`
            ]
        });
    };

    return (
        <div style={{...styles.chartContainer, height: 'auto', minHeight: 300}} ref={containerRef}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
                <div style={styles.tinyLabel}>Size = Citations</div>
                <Legend a1={author1.name} a2={author2.name} />
            </div>
            <div style={{ position: 'relative', width: '100%', paddingBottom: '35%' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow: 'visible' }}>
                    <g transform={`translate(${pad.l}, ${pad.t})`}>
                        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                             const y = chartH * pct;
                             return <line key={pct} x1={0} y1={y} x2={chartW} y2={y} stroke={THEME.border} strokeDasharray="4 4" />
                        })}
                        {xLabels.map(year => <text key={year} x={getX(year)} y={chartH + 20} textAnchor="middle" style={styles.axisLabel}>{year}</text>)}
                        
                        {combinedData.sort((a,b)=>b.citations - a.citations).map((d, i) => {
                            const cx = getX(d.year); const cy = getY(d.count); 
                            const color = d.authorIdx === 0 ? THEME.primary : THEME.secondary;
                            const isOverlap = d.authorIdx === 1 && d1.some(dp => dp.year === d.year && Math.abs(dp.count - d.count) < 2);
                            return (
                                <circle key={i} cx={cx + (isOverlap ? 5 : 0)} cy={cy} r={getR(d.citations)} 
                                    fill={color} fillOpacity={0.6} stroke={color} strokeWidth={1}
                                    onMouseEnter={(e) => handleMouseEnter(e, d)}
                                    onMouseLeave={() => setTooltip(null)}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                />
                            )
                        })}
                    </g>
                </svg>
            </div>
            <TooltipBox tooltip={tooltip} />
        </div>
    )
}

function TopVenuesTable({ author1, author2 }) {
    const getTop = (author) => {
        const counts = {};
        if (!author?.fullReport?.papers) return [];
        author.fullReport.papers.forEach(p => {
            const v = p.venue ? p.venue.replace(/\s+\d+.*$/, '').trim() : "Unknown";
            if (v === "Unknown" || v.length < 3) return;
            counts[v] = (counts[v] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    };

    const list1 = getTop(author1);
    const list2 = getTop(author2);
    const maxRows = Math.max(list1.length, list2.length);

    if (maxRows === 0) return <div style={styles.noData}>No venue data found.</div>;

    return (
        <div style={styles.chartContainer}>
             <table style={styles.table}>
                <thead>
                    <tr>
                        <th colSpan={2} style={{...styles.th, color: THEME.primary}}>{author1.name}</th>
                        <th style={{...styles.th, width: 10}}></th>
                        <th colSpan={2} style={{...styles.th, color: THEME.secondary}}>{author2.name}</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: maxRows }).map((_, i) => {
                        const i1 = list1[i]; const i2 = list2[i];
                        return (
                            <tr key={i}>
                                <td style={styles.tdName} title={i1?.name}>{i1?.name || ""}</td>
                                <td style={styles.tdCount}>{i1 && <span style={styles.badge(THEME.primaryBg, THEME.primary)}>{i1.count}</span>}</td>
                                <td style={styles.tdDivider}></td>
                                <td style={styles.tdName} title={i2?.name}>{i2?.name || ""}</td>
                                <td style={styles.tdCount}>{i2 && <span style={styles.badge(THEME.secondaryBg, THEME.secondary)}>{i2.count}</span>}</td>
                            </tr>
                        );
                    })}
                </tbody>
             </table>
        </div>
    );
}

// =========================================
// === SHARED HELPERS & COMPONENTS ===
// =========================================

function Card({ children, title, subtitle, icon }) {
    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <div style={styles.iconBox}>{icon}</div>
                <div>
                    <h3 style={styles.cardTitle}>{title}</h3>
                    <p style={styles.cardSubtitle}>{subtitle}</p>
                </div>
            </div>
            <div style={styles.cardBody}>
                {children}
            </div>
        </div>
    )
}

function StatBox({ label, value, icon }) {
    return (
        <div style={styles.statBox}>
            <div style={styles.statLabel}>{icon} {label}</div>
            <div style={styles.statValue}>{value}</div>
        </div>
    )
}

const Legend = ({ a1, a2, showShared }) => (
    <div style={{display:'flex', gap: 15, fontSize: 12, fontWeight: 600, color: THEME.subtext, justifyContent: 'flex-end'}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:'50%',background:THEME.primary}}/> {a1}</div>
        <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:'50%',background:THEME.secondary}}/> {a2}</div>
        {showShared && <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:'50%',background:THEME.shared}}/> Both</div>}
    </div>
)

const TooltipBox = ({ tooltip }) => {
    if (!tooltip) return null;
    return (
        <div style={{...styles.tooltip, left: tooltip.x, top: tooltip.y}}>
            {tooltip.title && <div style={{fontWeight: 700, marginBottom: 4}}>{tooltip.title}</div>}
            {tooltip.lines && tooltip.lines.map((line, i) => (
                <div key={i} style={{fontSize: 12, opacity: 0.9}}>{line}</div>
            ))}
            {/* Tiny arrow */}
            <div style={styles.tooltipArrow}></div>
        </div>
    );
}

// =========================================
// === STYLES ===
// =========================================

const styles = {
  pageContainer: { maxWidth: 1200, margin: "0 auto", padding: "40px 24px 100px", fontFamily: "'Inter', sans-serif", backgroundColor: THEME.bg, minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: 800, color: THEME.text, margin: 0 },
  pageSubtitle: { color: THEME.subtext, marginTop: 4, fontSize: 15 },
  headerIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  
  controlBar: { display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "16px", borderRadius: 16, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: 32, gap: 16 },
  selectWrapper: { position: 'relative', flex: 1 },
  colorTab: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, borderRadius: "4px 0 0 4px", zIndex: 1 },
  selectInput: { width: "100%", padding: "14px 14px 14px 20px", borderRadius: 8, border: `1px solid ${THEME.border}`, outline: "none", fontWeight: 600, color: THEME.text, fontSize: 15, cursor: "pointer", backgroundColor: "#fff" },
  vsBadge: { width: 40, height: 40, borderRadius: "50%", backgroundColor: "#F1F5F9", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0, border: "2px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },

  heroGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 },
  heroCard: { backgroundColor: "white", borderRadius: 20, padding: 24, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", border: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', gap: 24 },
  emptyHero: { height: 200, border: "2px dashed #CBD5E1", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontWeight: 600 },
  heroHeader: { display: "flex", gap: 16, alignItems: "flex-start" },
  avatarPlaceholder: (color) => ({ width: 56, height: 56, borderRadius: 16, backgroundColor: color, color: "white", fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }),
  heroName: { fontSize: 18, fontWeight: 800, color: THEME.text, margin: "0 0 4px" },
  heroAffiliation: { fontSize: 13, color: THEME.subtext, lineHeight: 1.4 },
  bigScoreBox: (bg, color) => ({ backgroundColor: bg, color: color, padding: "8px 16px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }),
  statRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  statBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
  statLabel: { fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", display: "flex", gap: 6, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: 700, color: THEME.text },

  sectionSpacer: { marginBottom: 24 },
  chartGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 },
  card: { backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden", display: 'flex', flexDirection: 'column' },
  cardHeader: { padding: "20px 24px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 16, backgroundColor: "#fff" },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: 700, color: THEME.text, margin: 0 },
  cardSubtitle: { fontSize: 13, color: THEME.subtext, margin: "2px 0 0 0" },
  cardBody: { padding: 24, flex: 1 },
  
  chartContainer: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative' },
  noData: { padding: 40, textAlign: "center", color: "#94A3B8", fontStyle: "italic", fontSize: 13 },
  
  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" },
  th: { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", paddingBottom: 10, borderBottom: `2px solid ${THEME.border}` },
  tdName: { fontSize: 13, fontWeight: 600, color: THEME.text, padding: "8px 0", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tdCount: { textAlign: "right" },
  tdDivider: { borderLeft: "1px dashed #E2E8F0" },
  badge: (bg, color) => ({ backgroundColor: bg, color: color, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }),
  
  barLabel: { fontSize: 11, fontWeight: 600, color: "#64748B" },
  tornadoLabel: { width: 80, textAlign: "center", fontSize: 12, fontWeight: 700, color: THEME.text },

  axisLabel: { fontSize: 10, fill: "#94A3B8", fontWeight: 600 },
  tinyLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#CBD5E1' },
  
  // SHARED TOOLTIP STYLES
  tooltip: {
    position: 'absolute', 
    backgroundColor: THEME.tooltipBg, 
    color: 'white',
    padding: '8px 12px', 
    borderRadius: 8, 
    fontSize: 12, 
    pointerEvents: 'none',
    transform: 'translate(-50%, -120%)', 
    zIndex: 50, 
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0, 
    height: 0, 
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    borderTop: `5px solid ${THEME.tooltipBg}`
  },
  cloudWrap: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }
};