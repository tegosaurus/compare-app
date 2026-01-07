import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Check, RotateCcw, ChevronDown, ChevronUp, ChevronsDown } from 'lucide-react';

export default function PublicationsTable({ papers }) {
  const [filterVenue, setFilterVenue] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [filterRank, setFilterRank] = useState(null);
  const [filterRecent, setFilterRecent] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const tableTopRef = useRef(null);
  const defaultSort = { key: 'year', direction: 'desc' };
  const [sortConfig, setSortConfig] = useState(defaultSort);

  // Custom Rank Weighting Logic
  const rankPriority = {
    'A*': 100,
    'A': 80,
    'Q1': 79,
    'B': 60,
    'Q2': 59,
    'C': 40,
    'Q3': 39,
    'Q4': 20,
    'N/A': 1,
    '-': 0
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setVisibleCount(20); }, [filterVenue, filterType, filterRank, filterRecent]);

  const cleanVenueName = (rawName) => {
    if (!rawName || rawName === "Unknown") return "Unknown Venue";
    let name = rawName;
    name = name.replace(/^Proceedings\s+of\s+the\s+/i, '');
    name = name.replace(/^International\s+Journal\s+of\s+/i, '');
    name = name.replace(/\b\d+(?:st|nd|rd|th)\b/i, '');
    name = name.replace(/^\d{4}\s+/i, '');
    name = name.replace(/\s+\d+\s*\(\d+\).*$/, ''); 
    name = name.replace(/,?\s*\d+(?:-\d+)?(?:,\s*\d{4})?$/, '');
    name = name.replace(/\s*\([^)]+\)$/, '');
    name = name.replace(/-/g, ' ');
    name = name.replace(/\s+/g, ' ');
    return name.trim();
  };

  const venueStats = useMemo(() => {
    const counts = {};
    papers.forEach(p => {
      const originalName = p.venue || "Unknown";
      const cleanName = cleanVenueName(originalName);
      if (cleanName && cleanName !== "Unknown Venue") { 
          counts[cleanName] = (counts[cleanName] || 0) + 1; 
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [papers]);

  const showVenueFilter = venueStats.length > 0 && venueStats[0].count > 1;

  const filteredPapers = useMemo(() => {
    return papers.filter(p => {
      if (filterVenue) {
          const pVenueClean = cleanVenueName(p.venue || "");
          if (pVenueClean !== filterVenue) return false;
      }
      if (filterType) {
          const t = (p.venue_type || "").toLowerCase();
          if (filterType === 'Journal' && !t.includes('journal')) return false;
          if (filterType === 'Conference' && !t.includes('conference') && !t.includes('proceeding')) return false;
      }
      if (filterRank) {
          const r = (p.rank || "").toUpperCase();
          if (!r.includes(filterRank)) return false;
      }
      if (filterRecent) {
          const currentYear = new Date().getFullYear();
          const pYear = parseInt(p.year);
          if (!pYear || currentYear - pYear > 5) return false;
      }
      return true;
    });
  }, [papers, filterVenue, filterType, filterRank, filterRecent]);

  const sortedPapers = useMemo(() => {
    let data = [...filteredPapers];
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'rank') {
          // Use the custom weighting map
          aVal = rankPriority[aVal?.toUpperCase()] ?? 0;
          bVal = rankPriority[bVal?.toUpperCase()] ?? 0;
        } else if (sortConfig.key === 'author_pos') {
            if (aVal === '1st') aVal = 1; else if (aVal === 'Last') aVal = 999; else aVal = parseInt(aVal) || 99;
            if (bVal === '1st') bVal = 1; else if (bVal === 'Last') bVal = 999; else bVal = parseInt(bVal) || 99;
        } else if (sortConfig.key === 'citations' || sortConfig.key === 'year') {
            aVal = Number(aVal) || 0; bVal = Number(bVal) || 0;
        } else {
            aVal = (aVal || "").toString().toLowerCase(); bVal = (bVal || "").toString().toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [filteredPapers, sortConfig]);

  const displayedPapers = useMemo(() => {
    return sortedPapers.slice(0, visibleCount);
  }, [sortedPapers, visibleCount]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key) {
        if (sortConfig.direction === 'desc') { direction = 'asc'; } else { setSortConfig(defaultSort); return; }
    }
    setSortConfig({ key, direction });
  };

  const clearAllFilters = () => {
      setFilterVenue(null); setFilterType(null); setFilterRank(null); setFilterRecent(false); setSortConfig(defaultSort);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} color="#a8abaeff" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} color="#c13c22ff" />;
    return <ArrowDown size={14} color="#c13c22ff" />;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", position: "relative" }} ref={tableTopRef}>
      
      {/* FLOATING BACK TO TOP ICON */}
      {showScrollTop && (
        <button 
          onClick={scrollToTop}
          style={{
            position: 'fixed', bottom: '30px', right: '30px', width: '42px', height: '42px',
            borderRadius: '50%', backgroundColor: '#0F172A', color: 'white', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000, transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronUp size={20} strokeWidth={3} />
        </button>
      )}

      {/* SIDEBAR FILTER */}
      <div style={{ width: "230px", flexShrink: 0, position: "sticky", top: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "550", color: "#0F172A" }}>Filters</div>
          {(filterVenue || filterType || filterRank || filterRecent) && (
            <button onClick={clearAllFilters} style={{ border: "none", background: "none", color: "#EF4444", fontSize: "11px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}><RotateCcw size={10} /> Reset</button>
          )}
        </div>
        {showVenueFilter && (
            <FilterSection title="Top Venues">
                {venueStats.map((venue) => (
                    <CheckboxRow key={venue.name} label={venue.name} count={venue.count} checked={filterVenue === venue.name} onClick={() => setFilterVenue(filterVenue === venue.name ? null : venue.name)} />
                ))}
            </FilterSection>
        )}
        <FilterSection title="Type">
            <CheckboxRow label="Journal" checked={filterType === 'Journal'} onClick={() => setFilterType(filterType === 'Journal' ? null : 'Journal')} />
            <CheckboxRow label="Conference" checked={filterType === 'Conference'} onClick={() => setFilterType(filterType === 'Conference' ? null : 'Conference')} />
        </FilterSection>
        <FilterSection title="Impact Tier">
            <CheckboxRow label="Q1 Journal" checked={filterRank === 'Q1'} onClick={() => setFilterRank(filterRank === 'Q1' ? null : 'Q1')} />
            <CheckboxRow label="A* Conference" checked={filterRank === 'A*'} onClick={() => setFilterRank(filterRank === 'A*' ? null : 'A*')} />
        </FilterSection>
        <FilterSection title="Timeframe">
            <CheckboxRow label="Last 5 Years" checked={filterRecent} onClick={() => setFilterRecent(!filterRecent)} />
        </FilterSection>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        {/* --- STICKY TABLE HEADER --- */}
        <div style={{ 
            display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "2px solid #E2E8F0", 
            position: "sticky", top: "70px", backgroundColor: "#F8FAFC", zIndex: 80, margin: "0 -16px",           
            paddingLeft: "32px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" 
        }}>
            <div style={{ flex: 1, fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => requestSort('title')}>Publication Details {getSortIcon('title')}</div>
            <div style={{ width: "100px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", paddingRight: "8px" }} onClick={() => requestSort('rank')}>Rank {getSortIcon('rank')}</div>
            <div style={{ width: "120px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", paddingRight: "8px" }} onClick={() => requestSort('author_pos')}>Author Pos {getSortIcon('author_pos')}</div>
            <div style={{ width: "80px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }} onClick={() => requestSort('citations')}>Cited By {getSortIcon('citations')}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
            {displayedPapers.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>No publications found matching these filters.</div>
            ) : (
                displayedPapers.map((paper, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", padding: "16px 16px", borderBottom: "1px solid #F1F5F9" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "white"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                        <div style={{ flex: 1, paddingRight: "24px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1E293B", lineHeight: "1.4", marginBottom: "4px" }}>{paper.title}</div>
                            <div style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontStyle: "italic", color: "#555a5fff", fontSize: "13px" }}>{paper.venue || "Unknown Venue"}</span>
                                <span style={{ width: "3px", height: "3px", backgroundColor: "#9da3abff", borderRadius: "50%" }}></span>
                                <span style={{ textTransform: "capitalize", backgroundColor: "#efefee8f", padding: "2px 7px", borderRadius: "8px", color: "#757575ff", fontWeight: "550" }}>{paper.venue_type || "Article"}</span>
                            </div>
                        </div>
                        <div style={{ width: "100px", display: "flex", justifyContent: "flex-end", paddingRight: "8px" }}>
                            <span style={{ fontSize: "14px", color: "#334155", fontWeight: "700" }}>{paper.rank || "-"}</span>
                        </div>
                        <div style={{ width: "120px", display: "flex", justifyContent: "flex-end", paddingRight: "8px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: "#334155" }}>{paper.author_pos || "-"}</span>
                        </div>
                        <div style={{ width: "80px", textAlign: "right" }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: "#334155" }}>{paper.citations || 0}</span>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Updated Action Row with smaller buttons */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "30px", borderTop: "1px solid #E2E8F0", paddingTop: "24px", paddingBottom: "60px" }}>
          {sortedPapers.length > visibleCount && (
            <>
              <button 
                onClick={() => setVisibleCount(prev => prev + 20)} 
                style={{ 
                  display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", 
                  backgroundColor: "white", cursor: "pointer", fontSize: "11px", fontWeight: "600", color: "#475569", transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
              >
                <ChevronDown size={12} /> Show More
              </button>

              <button 
                onClick={() => setVisibleCount(sortedPapers.length)} 
                style={{ 
                  display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", 
                  backgroundColor: "white", cursor: "pointer", fontSize: "11px", fontWeight: "600", color: "#475569", transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
              >
                <ChevronsDown size={12} /> Show All ({sortedPapers.length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const FilterSection = ({ title, children }) => (
    <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "10px", fontWeight: "600", color: "#959da9ff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px" }}>{title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>{children}</div>
    </div>
);

const CheckboxRow = ({ label, count, checked, onClick }) => (
    <div onClick={onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", backgroundColor: checked ? "#F1F5F9" : "transparent", color: checked ? "#0F172A" : "#475569", fontSize: "11px", fontWeight: checked ? "600" : "400" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "5px", flex: 1 }}>
            <div style={{ marginTop: "2px", width: "12px", height: "12px", minWidth: "12px", minHeight: "12px", flexShrink: 0, borderRadius: "2px", border: checked ? "1px solid #08236eff" : "1px solid #CBD5E1", backgroundColor: checked ? "#08236eff" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {checked && <Check size={11} color="white" />}
            </div>
            <span style={{ lineHeight: "1.3", wordBreak: "break-word" }}>{label}</span>
        </div>
        {count !== undefined && <span style={{ fontSize: "10px", color: "#94A3B8", marginLeft: "4px", marginTop: "1px" }}>{count}</span>}
    </div>
);
