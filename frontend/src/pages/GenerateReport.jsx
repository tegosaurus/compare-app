import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Bookmark, Star, X, Check, 
  TrendingUp, Award, Zap, FileText, Hash, HelpCircle, Loader2,
  Clock, LayoutDashboard, List,
  ChevronLeft, RefreshCw
} from 'lucide-react';
import { useLocation } from "react-router-dom";

import ContributionChart from './ContributionChart';
import ProductivityChart from './ProductivityChart'; 
import PublicationAnalytics from './PublicationAnalytics';
import PublicationsTable from './PublicationsTable';

// --- GLOBAL MEMORY ---
let cachedReport = null;

// --- TOOLTIP COMPONENT ---
function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
         onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <HelpCircle size={13} color="#b3b3b3ff" style={{ cursor: "help" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: "8px", width: "180px", padding: "8px 12px", backgroundColor: "#0F172A",
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

// --- REFRESH BUTTON WITH HOVER TOOLTIP ---
function RefreshButton({ onClick, isLoading }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {isHovered && !isLoading && (
        <div style={{
          position: "absolute", right: "100%", marginRight: "10px", whiteSpace: "nowrap",
          backgroundColor: "#0F172A", color: "white", padding: "4px 8px", borderRadius: "4px",
          fontSize: "10px", fontWeight: "600", pointerEvents: "none", zIndex: 10
        }}>
          Re-scrape for fresh results
          <div style={{ position: "absolute", top: "50%", left: "100%", transform: "translateY(-50%)", border: "4px solid transparent", borderLeftColor: "#0F172A" }} />
        </div>
      )}
      <button 
        onClick={onClick} 
        disabled={isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ background: "none", border: "none", cursor: isLoading ? "default" : "pointer", padding: "1px", display: "flex", alignItems: "center", borderRadius: "4px", backgroundColor: isHovered && !isLoading ? "#f1f5f9" : "transparent" }}
      >
        <RefreshCw size={15} strokeWidth={2} color="#0F172A" className={isLoading ? "animate-spin" : ""} />
      </button>
    </div>
  );
}

export default function GenerateReport() {
  const location = useLocation();
  const [url, setUrl] = useState("");
  const [reportData, setReportData] = useState(cachedReport);
  
  const [jobId, setJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isFocused, setIsFocused] = useState(false);
  const [recents, setRecents] = useState([]); 
  const [activeTab, setActiveTab] = useState("overview"); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const startYear = new Date().getFullYear() - 5;

  useEffect(() => {
    const localRecents = JSON.parse(localStorage.getItem("search_recents") || "[]");
    setRecents(localRecents); 
  }, []); 

  useEffect(() => {
    if (reportData) {
      const history = JSON.parse(localStorage.getItem("compare_history") || "[]");
      const savedItem = history.find(item => item.id === reportData.profile.id);
      
      if (savedItem) {
        setIsSaved(true);
        setRating(savedItem.userRating || 0);
        setComment(savedItem.userComment || "");
      } else {
        setIsSaved(false);
        setRating(0);
        setComment("");
      }
    }
  }, [reportData]);

  useEffect(() => {
    if (location.state?.report) {
      const incomingReport = location.state.report;
      setReportData(incomingReport);
      cachedReport = incomingReport;
      setUrl(`https://scholar.google.com/citations?user=${incomingReport.profile.id}&hl=en`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setReportData, setUrl]);

  const handleResetView = () => {
    setReportData(null);
    cachedReport = null;
    setUrl("");
    setProgress(0);
    setJobId(null);
    setIsLoading(false);
    setRating(0);
    setComment("");
  };

  const startAnalysis = async (link, forceRefresh = false) => {
    setIsLoading(true);
    setProgress(0);
    setReportData(null);
    setActiveTab("overview");
    setIsSaved(false);
    setRating(0);
    setComment("");

    try {
        const response = await fetch("http://localhost:8000/analyze/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: link, forceRefresh: forceRefresh }),
        });
        if (!response.ok) throw new Error("Failed to start analysis");
        const data = await response.json();
        setJobId(data.job_id);
    } catch (error) {
        console.error(error);
        setIsLoading(false);
        alert("Error starting analysis. Please check the URL.");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault(); 
    if (url.trim()) startAnalysis(url, false);
  };

  const handleRecentClick = (id) => {
    const link = `https://scholar.google.com/citations?user=${id}&hl=en`;
    setUrl(link);
    startAnalysis(link, false);
  };

  const handleRefreshData = () => {
    if (!reportData) return;
    const link = `https://scholar.google.com/citations?user=${reportData.profile.id}&hl=en`;
    startAnalysis(link, true); 
  };

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`http://localhost:8000/analyze/status/${jobId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.progress) setProgress(data.progress);
            if (data.status === "completed") {
                clearInterval(interval);
                setReportData(data.result);
                cachedReport = data.result;
                setJobId(null);
                setIsLoading(false);
                setProgress(100);
                addToRecents(data.result);
            } else if (data.status === "failed") {
                clearInterval(interval);
                setJobId(null);
                setIsLoading(false);
                alert("Analysis failed: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Polling Error:", err);
        }
    }, 500);
    return () => clearInterval(interval);
  }, [jobId]);

  const addToRecents = (data) => {
    let currentRecents = JSON.parse(localStorage.getItem("search_recents") || "[]");
    currentRecents = currentRecents.filter(r => r.id !== data.profile.id);
    const newRecent = {
        id: data.profile.id,
        name: data.profile.name,
        total_c: data.metrics.total_c,
        h_index: data.metrics.h_index,
        affiliations: data.profile.affiliations,
    };
    currentRecents.unshift(newRecent);
    const trimmedRecents = currentRecents.slice(0, 3);
    localStorage.setItem("search_recents", JSON.stringify(trimmedRecents));
    setRecents(trimmedRecents);
  };

  const handleToggleSave = () => {
    if (!reportData) return;
    const history = JSON.parse(localStorage.getItem("compare_history") || "[]");
    if (isSaved) {
        const updatedHistory = history.filter(item => item.id !== reportData.profile.id);
        localStorage.setItem("compare_history", JSON.stringify(updatedHistory));
        setIsSaved(false);
        setRating(0);
        setComment("");
    } else { 
        setIsModalOpen(true); 
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (!isSaved) {
      setRating(0);
      setComment("");
    } else {
        const history = JSON.parse(localStorage.getItem("compare_history") || "[]");
        const savedItem = history.find(item => item.id === reportData.profile.id);
        if (savedItem) {
            setRating(savedItem.userRating || 0);
            setComment(savedItem.userComment || "");
        }
    }
  };

  const handleConfirmSave = () => {
      if (!reportData) return;
      const history = JSON.parse(localStorage.getItem("compare_history") || "[]");
      const existingIndex = history.findIndex(h => h.id === reportData.profile.id);
      const entry = {
          id: reportData.profile.id,
          name: reportData.profile.name,
          total_c: reportData.metrics.total_c,
          h_index: reportData.metrics.h_index,
          affiliations: reportData.profile.affiliations,
          date: new Date().toISOString(),
          userRating: rating,
          userComment: comment,
          fullReport: reportData 
      };
      if (existingIndex > -1) { history[existingIndex] = entry; } else { history.unshift(entry); }
      localStorage.setItem("compare_history", JSON.stringify(history));
      setIsModalOpen(false);
      setIsSaved(true);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    };

  return (
    <div style={{ width: "100%", backgroundColor: "#F8FAFC", minHeight: "100vh", paddingBottom: "60px", fontFamily: "Inter, -apple-system, sans-serif" }}>
      
      {showSuccessToast && (
        <div style={{ position: "fixed", top: "24px", right: "24px", backgroundColor: "#0F172A", color: "white", padding: "10px 18px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 10px 15px rgba(0,0,0,0.2)", zIndex: 2000 }}>
          <Check size={16} color="#10B981" strokeWidth={3} />
          <span style={{ fontSize: "13px", fontWeight: "600" }}>Profile saved to history</span>
        </div>
      )}

      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingTop: "40px" }}>
        
        {!reportData && (
          <>
            <div style={{ maxWidth: "680px", margin: "0 auto 12px", position: "sticky", top: "20px", zIndex: 50 }}>
              <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", backgroundColor: "white", borderRadius: "16px", padding: "6px", boxShadow: isFocused ? "0 12px 35px -8px rgba(15, 23, 42, 0.15), 0 0 0 2px #0F172A" : "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)", border: "1px solid #E2E8F0", transition: "all 0.2s" }}>
                <div style={{ paddingLeft: "14px" }}><Search size={18} color={isFocused ? "#0F172A" : "#94A3B8"} /></div>
                <input type="text" placeholder="Paste Google Scholar profile URL..." value={url} onChange={(e) => setUrl(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} disabled={isLoading} style={{ flex: 1, height: "40px", border: "none", outline: "none", fontSize: "14px", marginLeft: "10px", width: "100%" }} />
                <button type="submit" disabled={isLoading || !url.trim()} style={{ height: "36px", padding: "0 20px", borderRadius: "10px", backgroundColor: isLoading ? "#94A3B8" : "#0F172A", color: "white", border: "none", cursor: "pointer", fontWeight: "600" }}>
                  {isLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Analyze</span>}
                </button>
              </form>
            </div>
            {isLoading && (
              <div style={{ marginBottom: "20px", textAlign: "center", maxWidth: "400px", margin: "0 auto 30px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px", color: "#64748B" }}>
                  <span>{reportData ? "Refreshing Data..." : "Analysing..."}</span>
                  <span style={{ color: "#0F172A" }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "#E2E8F0", borderRadius: "10px", overflow: "visible" }}>
                  <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#0F172A", transition: "width 0.8s ease-out" }} /> 
                </div>
              </div>
            )}
            {!isLoading && (
              <div className="animate-fade-in">
                {recents.length > 0 && (
                  <div style={{ marginBottom: "50px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingLeft: "4px" }}>
                        <Clock size={16} color="#64748B" />
                        <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Jump Back In</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                      {recents.map((profile) => ( <SavedProfileCard key={profile.id} profile={profile} onClick={() => handleRecentClick(profile.id)} /> ))}
                    </div>
                  </div>
                )}
                <div style={{ textAlign: "center" }}>
                   {recents.length === 0 && <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", marginBottom: "8px" }}>Research Intelligence Engine</h2>}
                   <p style={{ fontSize: "13px", color: "#64748B", fontWeight: "500", textTransform: "uppercase", marginBottom: "24px" }}>How it works</p>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                      <StepCard num="01" title="Locate Profile" text="Go to Google Scholar and copy the researcher's URL." icon={<Search size={18} />} />
                      <StepCard num="02" title="Extract Data" text="Our engine parses citations, h-index, and hidden metrics." icon={<Zap size={18} />} />
                      <StepCard num="03" title="Reveal Impact" text="See venue rankings, network graphs, and true influence." icon={<TrendingUp size={18} />} />
                   </div>
                </div>
              </div>
            )}
          </>
        )}

        {reportData && !isLoading && (
          <div className="animate-fade-in">
             <div style={{ marginBottom: "16px" }}>
                <button onClick={handleResetView} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#64748B", fontSize: "13px", fontWeight: "600", padding: "0" }}>
                    <ChevronLeft size={16} /> Search Another Researcher
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginBottom: "20px", borderBottom: "1px solid #E2E8F0", paddingBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "2px" }}>
                  <h1 style={{ fontSize: "27px", fontWeight: "800", color: "#0F172A", lineHeight: "1.1", margin: 0 }}>{reportData.profile.name}</h1>
                  <button onClick={handleToggleSave} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "0 10px", borderRadius: "20px", border: isSaved ? "none" : "1px solid #E2E8F0", backgroundColor: isSaved ? "#10B981" : "white", color: isSaved ? "white" : "#0F172A", fontWeight: "700", fontSize: "10px", cursor: "pointer", height: "20px", marginTop: "4px" }}>
                      {isSaved ? <Check size={10} strokeWidth={3} /> : <Bookmark size={10} />} 
                      {isSaved ? "Saved" : "Save"}
                  </button>
              </div>
              
              <p style={{ fontSize: "15px", color: "#64748B", marginBottom: "8px", fontWeight: "500" }}>{reportData.profile.affiliations || "No affiliation listed"}</p>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <span style={{ backgroundColor: "#F1F5F9", color: "#475569", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", border: "1px solid #E2E8F0" }}>
                  <Award size={14} /> Academic Age: {reportData.profile.academic_age} Years
                  </span>
                <span style={{ fontSize: "12px", color: "#88919dff" }}>ID: {reportData.profile.id}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
                  <RefreshButton onClick={handleRefreshData} isLoading={isLoading} />
                  <span style={{ fontSize: "11px", color: "#64748B", fontStyle: "italic", fontWeight: "500" }}>
                    Refreshed: {timeAgo(reportData.profile.last_updated)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px" }}>
                {reportData.metrics.keywords && reportData.metrics.keywords.slice(0, 5).map((kw, idx) => (
                  <span key={idx} style={{ fontSize: "12px", fontWeight: "600", color: "#475569", backgroundColor: "white", border: "1px solid #E2E8F0", padding: "3px 10px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "7px", marginBottom: "-12px" }}>
                    {kw.text} <span style={{ fontSize: "9px", opacity: 0.5 }}>{kw.count}</span>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", marginBottom: "24px" }}>
              <button onClick={() => setActiveTab("overview")} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600", color: activeTab === "overview" ? "#0F172A" : "#64748B", borderBottom: activeTab === "overview" ? "2px solid #0F172A" : "2px solid transparent", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><LayoutDashboard size={16} /> Impact Overview</button>
              <button onClick={() => setActiveTab("publications")} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600", color: activeTab === "publications" ? "#0F172A" : "#64748B", borderBottom: activeTab === "publications" ? "2px solid #0F172A" : "2px solid transparent", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><List size={16} /> Publications Analysis</button>
            </div>
            
            {activeTab === "overview" && (
              <div className="animate-fade-in">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
                      <HeroCard type="success" label="Total Publications" value={reportData.metrics.total_p} icon={<FileText size={20} color="#0F172A" />} />
                      <HeroCard type="primary" label="Total Citations" value={reportData.metrics.total_c.toLocaleString()} icon={<TrendingUp size={20} color="#0F172A" />} sub={`+${reportData.metrics.recent_c || 0} since ${startYear}`} />
                      <HeroCard type="warning" label="Recent Papers" value={reportData.metrics.recent_p} icon={<Zap size={20} color="#0F172A" />} sub={`Published since ${startYear}`} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                    <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E2E8F0", padding: "24px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "20px", display: "flex", alignItems: "center", gap: "5px" }}>
                          <Hash size={14} /> Citation Indices
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <MiniStat label="H-Index" value={reportData.metrics.h_index} tooltip="Measures both the productivity and citation impact of the publications." />
                            <div style={{ width: "1px", height: "40px", backgroundColor: "#d9dee5ff" }}></div>
                            <MiniStat label="i10-Index" value={reportData.metrics.i10_index} tooltip="Number of publications with at least 10 citations." />
                            <div style={{ width: "1px", height: "40px", backgroundColor: "#d9dee5ff" }}></div>
                            <MiniStat label="g-Index" value={reportData.metrics.g_index} tooltip="An alternative to the h-index that gives more weight to highly-cited papers." />
                            <div style={{ width: "1px", height: "40px", backgroundColor: "#d9dee5ff" }}></div>
                            <MiniStat label="Avg Cits" value={reportData.metrics.cpp} tooltip="Citations Per Paper (CPP). Average impact of each work." />
                        </div>
                    </div>
                    <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E2E8F0", padding: "24px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "20px", display: "flex", alignItems: "center", gap: "5px" }}>
                          <Zap size={14} color="#3EA2DB" /> Impact Markers
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <MiniStat 
                              label="Network" 
                              value={`${reportData.metrics.network_size}+`} 
                              sub="Unique Co-Authors" 
                              color="#3EA2DB" 
                              tooltip="Estimated unique co-authors based on processed publication history. Truncated at 100 entries."
                            />
                            <div style={{ width: "1px", height: "40px", backgroundColor: "#d9dee5ff" }}></div>
                            <MiniStat 
                              label="Authorship Role" 
                              value={`${reportData.metrics.leadership_score}%`} 
                              sub="First/Solo Author" 
                              color="#3EA2DB" 
                              tooltip="Percentage of papers where the researcher is 1st or solo author."
                            />
                            <div style={{ width: "1px", height: "40px", backgroundColor: "#d9dee5ff" }}></div>
                            <MiniStat 
                              label="Citation Share" 
                              value={`${reportData.metrics.one_hit}%`} 
                              sub="from Top Paper" 
                              color="#3EA2DB" 
                              tooltip="How much total impact is dependent on the single highest-cited paper."
                            />
                        </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                    <div style={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <ContributionChart papers={reportData.papers || []} />
                    </div>
                    <div style={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <ProductivityChart papers={reportData.papers || []} />
                    </div>
                  </div>
              </div>
            )}
            {activeTab === "publications" && (
                <div className="animate-fade-in">
                    <PublicationAnalytics papers={reportData.papers || []} />
                    <PublicationsTable papers={reportData.papers || []} />
                </div>
            )}
          </div>
        )}

        {isModalOpen && reportData && (
          <div 
            onClick={handleCloseModal} // Close on background click
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <div 
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
              style={{ backgroundColor: "white", borderRadius: "16px", width: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", border: "1px solid #E2E8F0" }}
            >
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>Save to History</h2>
                    <button onClick={handleCloseModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "4px" }}><X size={18} /></button>
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "8px" }}>How would you rate this profile?</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={24} fill={(hoverRating || rating) >= star ? "#f5bb0bff" : "transparent"} color={(hoverRating || rating) >= star ? "#f5bb0bff" : "#CBD5E1"} onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} style={{ cursor: "pointer" }} />
                        ))}
                    </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                    <textarea 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)} 
                        placeholder="Add a private note (optional)..." 
                        maxLength={250}
                        style={{ width: "100%", height: "80px", padding: "12px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", resize: "none", outline: "none", backgroundColor: "#F8FAFC" }} 
                    />
                    <div style={{ textAlign: "right", fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                        {250 - comment.length} characters remaining
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={handleCloseModal} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "white", fontSize: "13px", fontWeight: "600", color: "#64748B", cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleConfirmSave} style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "#0F172A", color: "white", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Save Profile</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- HELPERS ---
function timeAgo(dateString) {
    if (!dateString) return "Unknown date"; 
    let date = new Date(dateString);
    if (isNaN(date.getTime()) && typeof dateString === 'string') {
        const cleanString = dateString.replace(' UTC', '').replace(' ', 'T').split('.')[0] + 'Z';
        date = new Date(cleanString);
    }
    if (isNaN(date.getTime())) return "Just now";
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
}

function MiniStat({ label, value, sub, color, tooltip, labelTransform = "uppercase" }) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        flex: 1,               
        gap: "4px" 
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", width: "100%" }}>
          <span style={{ 
            fontSize: "12px", 
            fontWeight: "700", 
            color: "#64748B", 
            textTransform: labelTransform,
            letterSpacing: "0.02em"
          }}>
            {label}
          </span>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        <span style={{ fontSize: "22px", fontWeight: "800", color: color || "#0F172A", lineHeight: "1.2" }}>
          {value}
        </span>
        {sub && (
          <span style={{ 
            fontSize: "11px", 
            color: "#94A3B8", 
            fontWeight: "500", 
            textAlign: "center",
            marginTop: "-3px"
          }}>
            {sub}
          </span>
        )}
      </div>
    );
}

function StepCard({ num, title, text, icon }) {
  return (
    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0", textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "24px", fontWeight: "800", color: "#E2E8F0" }}>{num}</span>
        <div style={{ padding: "8px", backgroundColor: "#F8FAFC", borderRadius: "8px" }}>{icon}</div>
      </div>
      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0F172A" }}>{title}</h3>
      <p style={{ fontSize: "13px", color: "#64748B", lineHeight: "1.5" }}>{text}</p>
    </div>
  );
}

function SavedProfileCard({ profile, onClick }) {
    const initials = profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div onClick={onClick} style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0", cursor: "pointer", transition: "all 0.2s ease", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0F172A"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#F1F5F9", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px" }}>{initials}</div>
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>{profile.name}</h4>
            </div>
            <p style={{ fontSize: "12px", color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.affiliations || "Unknown affiliation"}</p>
            <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", backgroundColor: "#F8FAFC", borderRadius: "6px" }}><Hash size={12} color="#0F172A" /><span style={{ fontSize: "13px", fontWeight: "700" }}>{profile.h_index}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", backgroundColor: "#F8FAFC", borderRadius: "6px" }}><TrendingUp size={12} color="#0F172A" /><span style={{ fontSize: "13px", fontWeight: "700" }}>{profile.total_c}</span></div>
            </div>
        </div>
    );
}

function HeroCard({ type, label, value, icon, sub }) {
  const styles = { success: { border: "#044168", bg: "#ECFDF5", text: "#065F46" }, primary: { border: "#044168", bg: "#2b725b11", text: "#2b725cff" }, warning: { border: "#044168", bg: "#efefee8f", text: "#757575ff" } };
  const theme = styles[type] || styles.primary;
  return (
    <div style={{ backgroundColor: "white", padding: "16px 20px", borderRadius: "10px", border: "1px solid #E2E8F0", borderTop: `4px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
         <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
           <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>{label}</span>
         </div>
         <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "30px", fontWeight: "800", color: "#0F172A" }}>{value}</span>
            {sub && <span style={{ fontSize: "12px", fontWeight: "550", color: theme.text, backgroundColor: theme.bg, padding: "4px 6px", borderRadius: "8px" }}>{sub}</span>}
         </div>
      </div>
      <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#F8FAFC" }}>{icon}</div>
    </div>
  );
}
