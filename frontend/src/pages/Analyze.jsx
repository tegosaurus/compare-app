import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Star, TrendingUp, BarChart3, AlertCircle } from "lucide-react";

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
                    <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: i === 0 ? "#2563EB" : "#10B981" }}></div>
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

      {/* NEW: VISUALIZATION SECTION */}
      {compare[0] && compare[1] && (
        <div style={chartSection}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={iconBadge}><BarChart3 size={20} color="#2563EB" /></div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1E293B", margin: 0 }}>Publication Quality Comparison</h3>
            </div>
            
            {/* The Chart Component */}
            <RankChart author1={compare[0]} author2={compare[1]} />
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function RankChart({ author1, author2 }) {
    // Helper to process paper ranks
    const processData = (author) => {
        if (!author?.fullReport?.papers) return {};
        const counts = {};
        author.fullReport.papers.forEach(p => {
            // Clean rank (remove volume info if any, handle empty)
            let r = p.rank || "Unranked";
            // Normalize common variations if needed
            if (r.includes("Q1")) r = "Q1";
            else if (r.includes("Q2")) r = "Q2";
            else if (r.includes("A*")) r = "A*";
            else if (r === "A") r = "A";
            
            counts[r] = (counts[r] || 0) + 1;
        });
        return counts;
    };

    const d1 = processData(author1);
    const d2 = processData(author2);

    // Define the order we want on the X-axis
    const PRIORITY_RANKS = ["A*", "A", "Q1", "Q2", "Q3", "B", "C", "Unranked"];
    
    // Get all unique keys that actually exist in the data
    const allKeys = new Set([...Object.keys(d1), ...Object.keys(d2)]);
    
    // Sort keys based on priority, then alphabetical for unknown ones
    const labels = Array.from(allKeys).sort((a, b) => {
        const idxA = PRIORITY_RANKS.indexOf(a);
        const idxB = PRIORITY_RANKS.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    // Find max value for Y-axis scaling
    const maxVal = Math.max(
        ...labels.map(l => Math.max(d1[l] || 0, d2[l] || 0))
    ) || 1; // avoid divide by zero

    if (labels.length === 0) return <div style={{padding: 40, textAlign: "center", color: "#94A3B8"}}>No ranked paper data available for comparison.</div>;

    return (
        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 24, fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#2563EB" }}></span> {author1.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#10B981" }}></span> {author2.name}</div>
            </div>

            <div style={{ display: "flex", height: "240px", alignItems: "flex-end", gap: "20px", paddingBottom: "10px" }}>
                {/* Y-Axis Label */}
                <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", height: "100%", textAlign: "center" }}>
                    Number of Papers
                </div>

                {/* Bars */}
                <div style={{ flex: 1, display: "flex", height: "100%", alignItems: "flex-end", gap: "4%" }}>
                    {labels.map((label) => {
                        const v1 = d1[label] || 0;
                        const v2 = d2[label] || 0;
                        const h1 = (v1 / maxVal) * 100; // percent height
                        const h2 = (v2 / maxVal) * 100;

                        return (
                            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                                <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4, height: "100%" }}>
                                    {/* Bar 1 */}
                                    <div style={{ 
                                        width: "40%", 
                                        height: `${h1}%`, 
                                        backgroundColor: "#2563EB", 
                                        borderRadius: "4px 4px 0 0", 
                                        transition: "height 0.5s ease",
                                        position: "relative",
                                        minHeight: v1 > 0 ? 4 : 0
                                    }}>
                                        {v1 > 0 && <span style={barValue}>{v1}</span>}
                                    </div>
                                    
                                    {/* Bar 2 */}
                                    <div style={{ 
                                        width: "40%", 
                                        height: `${h2}%`, 
                                        backgroundColor: "#10B981", 
                                        borderRadius: "4px 4px 0 0",
                                        transition: "height 0.5s ease",
                                        position: "relative",
                                        minHeight: v2 > 0 ? 4 : 0
                                    }}>
                                        {v2 > 0 && <span style={barValue}>{v2}</span>}
                                    </div>
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

const page = { maxWidth: 1000, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "Inter, sans-serif" };
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
const chartSection = { marginTop: 40, borderTop: "1px solid #E2E8F0", paddingTop: 40 };
const iconBadge = { width: 40, height: 40, borderRadius: 10, background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" };
const missingData = { gridColumn: "span 2", padding: 12, background: "#FFF7ED", color: "#C2410C", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 };
const barValue = { position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 700, color: "#64748B" };