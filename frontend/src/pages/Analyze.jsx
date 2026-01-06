import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Star, TrendingUp, BarChart3, AlertCircle, ScatterChart as ScatterIcon, Tag, ScrollText, Table } from "lucide-react";

// --- COLORS ---
const COLOR_A1 = "#2563EB"; // Blue
const COLOR_A1_BG = "rgba(37, 99, 235, 0.1)";
const COLOR_A2 = "#10B981"; // Emerald
const COLOR_A2_BG = "rgba(16, 185, 129, 0.1)";
const COLOR_SHARED = "#8B5CF6"; // Purple for shared keywords
const COLOR_SHARED_BG = "rgba(139, 92, 246, 0.1)";

export default function AnalyzeCompare() {
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState([null, null]);
  const location = useLocation();

  // Load history
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("compare_history") || "[]");
    setHistory(saved);

    // Handle navigation from History page
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
    <div style={page}>
      <div style={{ marginBottom: 30 }}>
        <h2 style={title}>Compare Authors</h2>
        <p style={{ color: "#64748B", marginTop: -10 }}>
          Select two authors to analyze their publication impact side-by-side.
        </p>
      </div>

      {/* Selectors */}
      <div style={selectors}>
        {[0, 1].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            <label style={selectorLabel}>Author {i + 1}</label>
            <select
              value={compare[i]?.id || ""}
              onChange={(e) => handleSelect(i, e.target.value)}
              style={select}
            >
              <option value="">Select author...</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div style={compareGrid}>
        {compare.map((author, i) => {
          const fullStats = author?.fullReport?.metrics;
          return (
            <div key={i} style={heroCard}>
              {author ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h3 style={name}>{author.name}</h3>
                        <div style={affiliation}>
                        {author.affiliations || "No affiliation"}
                        </div>
                    </div>
                    {/* Color dot to identify author in charts */}
                    <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: i === 0 ? COLOR_A1 : COLOR_A2 }}></div>
                  </div>

                  <div style={metrics}>
                    <Metric label="Total Citations" value={author.total_c.toLocaleString()} />
                    <Metric label="H-Index" value={author.h_index} />
                    
                    {fullStats ? (
                      <>
                        <Metric label="i10-Index" value={fullStats.i10_index} />
                        <Metric label="Total Papers" value={fullStats.total_p} />
                      </>
                    ) : (
                      <div style={missingData}>
                        <AlertCircle size={14} /> Re-save profile to see detailed stats
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={empty}>Select an author</div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- VISUALIZATION 1: RANK (BARS) --- */}
      {hasBothAuthors && (
        <div style={chartSection}>
            <div style={chartHeader}>
                <div style={iconBadge}><BarChart3 size={20} color={COLOR_A1} /></div>
                <div>
                    <h3 style={chartTitle}>Publication Quality</h3>
                    <p style={chartSub}>Comparison by venue ranking (Q1, A*, etc).</p>
                </div>
            </div>
            <RankChart author1={compare[0]} author2={compare[1]} />
        </div>
      )}

      {/* --- VISUALIZATION 2: VENUE TYPE (TORNADO) --- */}
      {hasBothAuthors && (
         <div style={chartSection}>
            <div style={chartHeader}>
                <div style={iconBadge}><ScrollText size={20} color={COLOR_A1} /></div>
                <div>
                    <h3 style={chartTitle}>Venue Distribution</h3>
                    <p style={chartSub}>Ratio of Journals vs Conferences vs Books.</p>
                </div>
            </div>
            <VenueTornadoChart author1={compare[0]} author2={compare[1]} />
        </div>
      )}

      {/* --- VISUALIZATION 3: TOP VENUES TABLE (SPLIT) --- */}
      {hasBothAuthors && (
         <div style={chartSection}>
            <div style={chartHeader}>
                <div style={iconBadge}><Table size={20} color={COLOR_A1} /></div>
                <div>
                    <h3 style={chartTitle}>Top 5 Publication Venues</h3>
                    <p style={chartSub}>Side-by-side comparison of each author's most frequent venues.</p>
                </div>
            </div>
            <TopVenuesTable author1={compare[0]} author2={compare[1]} />
        </div>
      )}

      {/* --- VISUALIZATION 4: TIMELINE (BUBBLE) --- */}
      {hasBothAuthors && (
         <div style={chartSection}>
            <div style={chartHeader}>
                <div style={iconBadge}><ScatterIcon size={20} color={COLOR_A1} /></div>
                <div>
                    <h3 style={chartTitle}>Timeline & Impact</h3>
                    <p style={chartSub}>X: Year | Y: Output | Size: Citations</p>
                </div>
            </div>
            <BubbleChart author1={compare[0]} author2={compare[1]} />
        </div>
      )}

      {/* --- VISUALIZATION 5: KEYWORDS (SMART CLOUD) --- */}
      {hasBothAuthors && (
         <div style={chartSection}>
            <div style={chartHeader}>
                <div style={iconBadge}><Tag size={20} color={COLOR_A1} /></div>
                <div>
                    <h3 style={chartTitle}>Research Focus Cloud</h3>
                    <p style={chartSub}>Scaled by actual frequency in publications.</p>
                </div>
            </div>
            <KeywordCloud author1={compare[0]} author2={compare[1]} />
        </div>
      )}

    </div>
  );
}

// =========================================
// === SUB-COMPONENTS (Charts) ===
// =========================================

function KeywordCloud({ author1, author2 }) {
    const k1 = author1?.fullReport?.metrics?.keywords || [];
    const k2 = author2?.fullReport?.metrics?.keywords || [];
    const norm = (str) => str.toLowerCase().trim();

    const allKeywords = {};

    // Helper to process list
    // We use the 'count' property from the report data now
    const processList = (list, isA1) => {
        list.forEach((k) => {
            const text = k.text;
            const key = norm(text);
            const count = k.count || 1; // Fallback to 1 if no count exists

            if (!allKeywords[key]) {
                allKeywords[key] = { 
                    text: text, 
                    a1: isA1, 
                    a2: !isA1, 
                    totalCount: count 
                };
            } else {
                if (isA1) allKeywords[key].a1 = true;
                else allKeywords[key].a2 = true;
                allKeywords[key].totalCount += count; // Add up counts for shared keywords
            }
        });
    };

    // Process top 10 keywords from each author (increased from 8 for better cloud)
    processList(k1.slice(0, 10), true);
    processList(k2.slice(0, 10), false);

    const cloudData = Object.values(allKeywords).sort((a,b) => b.totalCount - a.totalCount);

    if (cloudData.length === 0) return <div style={noDataState}>No keyword data available.</div>;

    // --- SCALING LOGIC ---
    // Find min and max counts to scale font size
    const counts = cloudData.map(k => k.totalCount);
    const minC = Math.min(...counts);
    const maxC = Math.max(...counts);
    const range = maxC - minC || 1;
    
    // Font settings (pixels)
    const MIN_FONT = 12;
    const MAX_FONT = 32;

    return (
        <div style={chartContainer}>
            <div style={legendWrap}>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A1 }}></span> {author1.name} Only</div>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A2 }}></span> {author2.name} Only</div>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_SHARED }}></span> Shared Interest</div>
            </div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", alignItems: "center", padding: "20px 0" }}>
                {cloudData.map((k, i) => {
                    let bg = "#F1F5F9"; 
                    let color = "#64748B"; 
                    let border = "transparent";

                    if (k.a1 && k.a2) { 
                        bg = COLOR_SHARED_BG; color = COLOR_SHARED; border = COLOR_SHARED; 
                    } else if (k.a1) { 
                        bg = COLOR_A1_BG; color = COLOR_A1; border = COLOR_A1; 
                    } else if (k.a2) { 
                        bg = COLOR_A2_BG; color = COLOR_A2; border = COLOR_A2; 
                    }

                    // Calculate Font Size based on Count
                    const size = MIN_FONT + ((k.totalCount - minC) / range) * (MAX_FONT - MIN_FONT);
                    const isBig = size > 24;

                    return (
                        <span key={i} style={{ 
                            fontSize: `${Math.round(size)}px`, 
                            backgroundColor: bg, 
                            color: color, 
                            border: `1px solid ${border}`,
                            padding: isBig ? "8px 20px" : "4px 12px", // Bigger padding for bigger words
                            borderRadius: "99px", 
                            fontWeight: isBig ? 800 : 600,
                            textTransform: "capitalize",
                            lineHeight: "1",
                            animation: `fadeIn 0.5s ease forwards ${i * 0.05}s`
                        }}>
                            {k.text}
                            {/* Optional: Show count for very big items */}
                            {isBig && <span style={{fontSize: "0.6em", opacity: 0.7, marginLeft: 6}}>x{k.totalCount}</span>}
                        </span>
                    )
                })}
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}

function TopVenuesTable({ author1, author2 }) {
    const getTopVenues = (author) => {
        const counts = {};
        if (!author?.fullReport?.papers) return [];
        author.fullReport.papers.forEach(p => {
            const v = p.venue ? p.venue.replace(/\s+\d+.*$/, '').trim() : "Unknown";
            if (v === "Unknown" || v.length < 3) return;
            counts[v] = (counts[v] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    };

    const list1 = getTopVenues(author1);
    const list2 = getTopVenues(author2);
    const maxRows = Math.max(list1.length, list2.length);
    const rows = Array.from({ length: maxRows });

    if (maxRows === 0) return <div style={noDataState}>No venue data found for either author.</div>;

    return (
        <div style={chartContainer}>
             <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0", fontSize: "14px", tableLayout: "fixed" }}>
                <thead>
                    <tr>
                        <th colSpan={2} style={{ textAlign: "left", padding: "12px", borderBottom: `2px solid ${COLOR_A1}`, color: COLOR_A1 }}>{author1.name}</th>
                        <th style={{ width: "20px", borderBottom: "2px solid #E2E8F0" }}></th>
                        <th colSpan={2} style={{ textAlign: "left", padding: "12px", borderBottom: `2px solid ${COLOR_A2}`, color: COLOR_A2 }}>{author2.name}</th>
                    </tr>
                    <tr style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #E2E8F0", width: "35%" }}>Venue</th>
                        <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #E2E8F0", width: "10%" }}>Count</th>
                        <th style={{ borderBottom: "1px solid #E2E8F0" }}></th>
                        <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #E2E8F0", width: "35%" }}>Venue</th>
                        <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #E2E8F0", width: "10%" }}>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((_, i) => {
                        const item1 = list1[i]; const item2 = list2[i];
                        return (
                            <tr key={i}>
                                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F8FAFC", color: "#1E293B", fontWeight: 600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={item1?.name}>{item1 ? item1.name : ""}</td>
                                <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #F8FAFC" }}>{item1 && <span style={{ backgroundColor: COLOR_A1_BG, color: COLOR_A1, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{item1.count}</span>}</td>
                                <td style={{ borderBottom: "1px solid #F8FAFC", borderLeft: "1px dashed #E2E8F0" }}></td>
                                <td style={{ padding: "10px 12px", borderBottom: "1px solid #F8FAFC", color: "#1E293B", fontWeight: 600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={item2?.name}>{item2 ? item2.name : ""}</td>
                                <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #F8FAFC" }}>{item2 && <span style={{ backgroundColor: COLOR_A2_BG, color: COLOR_A2, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{item2.count}</span>}</td>
                            </tr>
                        );
                    })}
                </tbody>
             </table>
        </div>
    );
}

function VenueTornadoChart({ author1, author2 }) {
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
    const totalPapers = Object.values(d1).reduce((a,b)=>a+b,0) + Object.values(d2).reduce((a,b)=>a+b,0);
    if(totalPapers === 0) return <div style={noDataState}>No venue data available.</div>;

    return (
        <div style={chartContainer}>
             <div style={legendWrap}>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A1 }}></span> {author1.name}</div>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A2 }}></span> {author2.name}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {categories.map(cat => {
                    const v1 = d1[cat]; const v2 = d2[cat];
                    const w1 = (v1 / maxVal) * 100; const w2 = (v2 / maxVal) * 100;
                    if (v1 === 0 && v2 === 0) return null;
                    return (
                        <div key={cat} style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                                {v1 > 0 && <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>{v1}</span>}
                                <div style={{ width: `${w1}%`, height: "24px", backgroundColor: COLOR_A1, borderRadius: "4px 0 0 4px", opacity: 0.9, transition: "width 0.5s ease" }}></div>
                            </div>
                            <div style={{ width: "100px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#1E293B", flexShrink: 0 }}>{cat}</div>
                            <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: `${w2}%`, height: "24px", backgroundColor: COLOR_A2, borderRadius: "0 4px 4px 0", opacity: 0.9, transition: "width 0.5s ease" }}></div>
                                {v2 > 0 && <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>{v2}</span>}
                            </div>
                        </div>
                    )
                })}
            </div>
            <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginTop: "20px" }}>Number of Publications</div>
        </div>
    );
}

function BubbleChart({ author1, author2 }) {
    const aggregateData = (author) => {
        if (!author?.fullReport?.papers) return [];
        const yearMap = {};
        author.fullReport.papers.forEach(p => {
            const year = parseInt(p.year);
            const cits = parseInt(p.citations) || 0;
            if (!year || isNaN(year) || year > new Date().getFullYear() + 2) return;
            if (!yearMap[year]) { yearMap[year] = { year, count: 0, citations: 0 }; }
            yearMap[year].count += 1; yearMap[year].citations += cits;
        });
        return Object.values(yearMap).sort((a,b) => a.year - b.year);
    };
    const d1 = aggregateData(author1).map(d => ({ ...d, authorIdx: 0 }));
    const d2 = aggregateData(author2).map(d => ({ ...d, authorIdx: 1 }));
    const combinedData = [...d1, ...d2];
    if (combinedData.length === 0) return <div style={noDataState}>No timeline data available.</div>;

    const years = combinedData.map(d => d.year);
    const minYear = Math.min(...years); const maxYear = Math.max(...years);
    const yearSpan = maxYear - minYear || 1; 
    const maxPapers = Math.max(...combinedData.map(d => d.count)) || 1;
    const height = 300; const width = 600; 
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const minBub = 4; const maxBub = 35;
    const maxCits = Math.max(...combinedData.map(d => d.citations)) || 1;
    const getX = (year) => ((year - minYear) / yearSpan) * chartW;
    const getY = (count) => chartH - ((count / maxPapers) * chartH);
    const getR = (cits) => minBub + (cits / maxCits) * (maxBub - minBub);
    const xLabels = []; const step = yearSpan > 15 ? 5 : Math.ceil(yearSpan / 5); 
    for(let y = minYear; y <= maxYear; y+=step) { xLabels.push(y); }
    const yLabels = []; const yStep = Math.ceil(maxPapers / 4);
    for(let i = 0; i <= maxPapers; i+=yStep) { if(yLabels.length < 5) yLabels.push(i); }

    return (
        <div style={chartContainer}>
            <div style={legendWrap}>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A1 }}></span> {author1.name}</div>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A2 }}></span> {author2.name}</div>
            </div>
            <div style={{ position: 'relative', width: '100%', paddingBottom: '50%' }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflow: 'visible' }}>
                <g transform={`translate(${padding.left}, ${padding.top})`}>
                    {yLabels.map(labelVal => {
                        const yPos = getY(labelVal);
                        return ( <g key={'grid'+labelVal}> <line x1={0} y1={yPos} x2={chartW} y2={yPos} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4" /> <text x={-10} y={yPos + 4} textAnchor="end" fontSize={11} fill="#94A3B8">{labelVal}</text> </g> )
                    })}
                    {xLabels.map(year => { const xPos = getX(year); return <text key={'txt'+year} x={xPos} y={chartH + 20} textAnchor="middle" fontSize={11} fill="#94A3B8">{year}</text> })}
                    <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#CBD5E1" strokeWidth={2} />
                    <line x1={0} y1={0} x2={0} y2={chartH} stroke="#CBD5E1" strokeWidth={2} />
                    {combinedData.sort((a,b) => b.citations - a.citations).map((d, i) => {
                        const cx = getX(d.year); const cy = getY(d.count); const r = getR(d.citations);
                        const color = d.authorIdx === 0 ? COLOR_A1 : COLOR_A2; const bgColor = d.authorIdx === 0 ? COLOR_A1_BG : COLOR_A2_BG;
                        const offset = (d.authorIdx === 1 && d1.some(dp1 => dp1.year === d.year && dp1.count === d.count)) ? 4 : 0;
                        return ( <circle key={i} cx={cx + offset} cy={cy} r={r} fill={bgColor} stroke={color} strokeWidth={2} style={{ transition: 'all 0.3s ease', cursor: 'crosshair' }}><title>{`${d.authorIdx === 0 ? author1.name : author2.name} (${d.year})\nOutput: ${d.count} papers\nImpact: ${d.citations} citations`}</title></circle> )
                    })}
                </g>
            </svg>
            </div>
             <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94A3B8', marginTop: 0, textTransform: 'uppercase' }}>Year Published</div>
        </div>
    )
}

function RankChart({ author1, author2 }) {
    const processData = (author) => {
        if (!author?.fullReport?.papers) return {};
        const counts = {};
        author.fullReport.papers.forEach(p => {
            let r = p.rank || "Unranked";
            if (r.includes("Q1")) r = "Q1"; else if (r.includes("Q2")) r = "Q2"; else if (r.includes("Q3")) r = "Q3"; else if (r.includes("Q4")) r = "Q4"; else if (r.includes("A*")) r = "A*"; else if (r === "A") r = "A"; else if (r === "B") r = "B"; else if (r === "C") r = "C"; else if (r.includes("National") || r.includes("USA")) { r = "Unranked"; }
            counts[r] = (counts[r] || 0) + 1;
        });
        return counts;
    };
    const d1 = processData(author1); const d2 = processData(author2);
    const PRIORITY_RANKS = ["A*", "A", "Q1", "Q2", "Q3", "B", "C", "Unranked"];
    const allKeys = new Set([...Object.keys(d1), ...Object.keys(d2)]);
    const labels = Array.from(allKeys).sort((a, b) => {
        const idxA = PRIORITY_RANKS.indexOf(a); const idxB = PRIORITY_RANKS.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1; if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });
    const maxVal = Math.max( ...labels.map(l => Math.max(d1[l] || 0, d2[l] || 0)) ) || 1;
    if (labels.length === 0) return <div style={noDataState}>No ranked paper data available for comparison.</div>;

    return (
        <div style={chartContainer}>
            <div style={legendWrap}>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A1 }}></span> {author1.name}</div>
                <div style={legendItem}><span style={{ ...legendDot, background: COLOR_A2 }}></span> {author2.name}</div>
            </div>
            <div style={{ display: "flex", height: "240px", alignItems: "flex-end", gap: "20px", paddingBottom: "10px" }}>
                <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", height: "100%", textAlign: "center" }}>Total Papers</div>
                <div style={{ flex: 1, display: "flex", height: "100%", alignItems: "flex-end", gap: "4%" }}>
                    {labels.map((label) => {
                        const v1 = d1[label] || 0; const v2 = d2[label] || 0;
                        const h1 = (v1 / maxVal) * 100; const h2 = (v2 / maxVal) * 100;
                        return (
                            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                                <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4, height: "100%" }}>
                                    <div style={{ width: "40%", height: `${h1}%`, backgroundColor: COLOR_A1, borderRadius: "4px 4px 0 0", position: "relative", minHeight: v1 > 0 ? 4 : 0 }}>{v1 > 0 && <span style={barValue}>{v1}</span>}</div>
                                    <div style={{ width: "40%", height: `${h2}%`, backgroundColor: COLOR_A2, borderRadius: "4px 4px 0 0", position: "relative", minHeight: v2 > 0 ? 4 : 0 }}>{v2 > 0 && <span style={barValue}>{v2}</span>}</div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginTop: -4 }}>{label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Metric({ label, value }) {
  return (
    <div style={metricBox}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{value ?? 0}</div>
    </div>
  );
}

/* --- STYLES --- */
const page = { maxWidth: 1000, margin: "0 auto", padding: "40px 20px 120px", fontFamily: "Inter, sans-serif" };
const title = { fontSize: 32, fontWeight: 900, color: "#0F172A", marginBottom: 12 };
const selectors = { display: "flex", gap: 24, marginBottom: 40 };
const selectorLabel = { display: "block", fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 8, textTransform: "uppercase" };
const select = { width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #CBD5E1", background: "white", fontWeight: 600, color: "#0F172A", fontSize: 14, outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" };
const compareGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 };
const heroCard = { padding: 24, borderRadius: 20, background: "white", border: "1px solid #E2E8F0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" };
const name = { fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 4px 0" };
const affiliation = { fontSize: 13, color: "#64748B", marginBottom: 20, lineHeight: 1.4, minHeight: 36 };
const metrics = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const metricBox = { padding: "12px 16px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #F1F5F9" };
const empty = { height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontWeight: 500, fontStyle: "italic", border: "2px dashed #E2E8F0", borderRadius: 20 };
const missingData = { gridColumn: "span 2", padding: 12, background: "#FFF7ED", color: "#C2410C", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 };

// Chart Common Styles
const chartSection = { marginTop: 40, borderTop: "1px solid #E2E8F0", paddingTop: 40 };
const chartHeader = { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 };
const iconBadge = { width: 40, height: 40, borderRadius: 10, background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const chartTitle = { fontSize: 18, fontWeight: 800, color: "#1E293B", margin: "0 0 4px 0" };
const chartSub = { fontSize: 13, color: "#64748B", margin: 0 };
const chartContainer = { position: 'relative', backgroundColor: "white", padding: "24px 24px 36px 36px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" };
const noDataState = { padding: 40, textAlign: "center", color: "#94A3B8", fontStyle: "italic", background: "#F8FAFC", borderRadius: 12, border: "1px dashed #E2E8F0" };
const legendWrap = { display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 20, fontSize: 13, fontWeight: 600 };
const legendItem = { display: "flex", alignItems: "center", gap: 6 };
const legendDot = { width: 10, height: 10, borderRadius: 2 };
const barValue = { position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "#64748B" };