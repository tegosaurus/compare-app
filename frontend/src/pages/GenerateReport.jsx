import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { analyzeProfile } from '../api';
import { 
  Search, Bookmark, Star, X, Check, 
  TrendingUp, Users, Award, Zap, FileText, Hash, HelpCircle, Loader2,
  Clock, ArrowUp, ArrowDown, ArrowUpDown, RotateCcw, LayoutDashboard, List, Lock,
  ChevronLeft, RefreshCw 
} from 'lucide-react';

import ContributionChart from './ContributionChart';
import ProductivityChart from './ProductivityChart'; 
import PublicationAnalytics from './PublicationAnalytics';

// --- GLOBAL MEMORY ---
let cachedReport = null;

export default function GenerateReport() {
  const [url, setUrl] = useState("");
  const [reportData, setReportData] = useState(cachedReport);
  const [progress, setProgress] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  
  const [recents, setRecents] = useState([]); 
  const [activeTab, setActiveTab] = useState("overview"); 

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const localRecents = JSON.parse(localStorage.getItem("search_recents") || "[]");
    setRecents(localRecents); 
  }, []); 

  useEffect(() => {
    if (reportData) {
      const history = JSON.parse(localStorage.getItem("compare_history") || "[]");
      const alreadySaved = history.some(item => item.id === reportData.profile.id);
      setIsSaved(alreadySaved);
      if(alreadySaved) {
         const item = history.find(i => i.id === reportData.profile.id);
         setRating(item.userRating || 0);
         setComment(item.userComment || "");
      }
    }
  }, [reportData]);

  const handleResetView = () => {
    setReportData(null);
    cachedReport = null;
    setUrl("");
    setProgress(0);
  };

  const mutation = useMutation({
    mutationFn: ({ link, forceRefresh }) => analyzeProfile(link, forceRefresh), 
    onMutate: () => {
      setProgress(0);
      if (!reportData) {
          setReportData(null);
          cachedReport = null; 
          setActiveTab("overview"); 
      }
      setIsSaved(false); 
    },
    onSuccess: (data) => {
      setProgress(100);
      setTimeout(() => {
        setReportData(data);
        cachedReport = data;
        if (!reportData || reportData.profile.id !== data.profile.id) {
            setRating(0);
            setComment("");
        }
        setProgress(0); 
        addToRecents(data);
      }, 600);
    },
    onError: () => setProgress(0)
  });

  const handleSearch = (e) => {
    e.preventDefault(); 
    if (url.trim()) mutation.mutate({ link: url, forceRefresh: false });
  };

  const handleRecentClick = (id) => {
    const link = `https://scholar.google.com/citations?user=${id}&hl=en`;
    setUrl(link);
    mutation.mutate({ link, forceRefresh: false });
  };

  const handleRefreshData = () => {
    if (!reportData) return;
    const link = `https://scholar.google.com/citations?user=${reportData.profile.id}&hl=en`;
    mutation.mutate({ link, forceRefresh: true }); 
  };

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

  useEffect(() => {
    let interval;
    if (mutation.isPending) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const increment = prev < 50 ? 5 : prev < 80 ? 2 : 0.5;
          return Math.min(prev + increment, 95);
        });
      }, 200); 
    } else { clearInterval(interval); }
    return () => clearInterval(interval);
  }, [mutation.isPending]);

  const handleToggleSave = () => {
    const history = JSON.parse(localStorage.getItem("compare_history") || "[]");
    if (isSaved) {
        const updatedHistory = history.filter(item => item.id !== reportData.profile.id);
        localStorage.setItem("compare_history", JSON.stringify(updatedHistory));
        setIsSaved(false);
    } else { setIsModalOpen(true); }
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
        userComment: comment
    };
    if (existingIndex > -1) { history[existingIndex] = entry; } else { history.unshift(entry); }
    localStorage.setItem("compare_history", JSON.stringify(history));
    setIsModalOpen(false);
    setIsSaved(true);
  };

  return (
    <div style={{ width: "100%", backgroundColor: "#F8FAFC", minHeight: "100vh", paddingBottom: "60px", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingTop: "40px" }}>
        
        {!reportData && (
          <>
            <div style={{ maxWidth: "680px", margin: "0 auto 12px", position: "sticky", top: "20px", zIndex: 50 }}>
              <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", backgroundColor: "white", borderRadius: "16px", padding: "6px", boxShadow: isFocused ? "0 12px 35px -8px rgba(15, 23, 42, 0.15), 0 0 0 2px #0F172A" : "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)", border: "1px solid #E2E8F0", transition: "all 0.2s" }}>
                <div style={{ paddingLeft: "14px" }}><Search size={18} color={isFocused ? "#0F172A" : "#94A3B8"} /></div>
                <input type="text" placeholder="Paste Google Scholar profile URL..." value={url} onChange={(e) => setUrl(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} disabled={mutation.isPending} style={{ flex: 1, height: "40px", border: "none", outline: "none", fontSize: "14px", marginLeft: "10px", width: "100%" }} />
                <button type="submit" disabled={mutation.isPending || !url.trim()} style={{ height: "36px", padding: "0 20px", borderRadius: "10px", backgroundColor: mutation.isPending ? "#94A3B8" : "#0F172A", color: "white", border: "none", cursor: "pointer", fontWeight: "600" }}>
                  {mutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <span>Analyze</span>}
                </button>
              </form>
            </div>
            <div style={{ textAlign: "center", marginBottom: "40px", display: "flex", justifyContent: "center", gap: "16px", fontSize: "11px", color: "#64748B", fontWeight: "500" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Zap size={12} fill="#F59E0B" color="#F59E0B" /> Real-time extraction</span>
                <span style={{ width: "1px", height: "14px", backgroundColor: "#CBD5E1" }}></span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Lock size={11} /> No login required</span>
            </div>
          </>
        )}

        {mutation.isPending && (
          <div style={{ marginBottom: "20px", textAlign: "center", maxWidth: "400px", margin: "0 auto 30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px", color: "#64748B" }}>
              <span>{reportData ? "Refreshing Data..." : "Analysing..."}</span>
              <span style={{ color: "#0F172A" }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "#E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#0F172A", transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {!reportData && !mutation.isPending && (
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
              <div style={{ marginBottom: "24px" }}>
                {recents.length === 0 && <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", marginBottom: "8px" }}>Research Intelligence Engine</h2>}
                <p style={{ fontSize: "13px", color: "#64748B", fontWeight: "500", textTransform: "uppercase" }}>How it works</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <StepCard num="01" title="Locate Profile" text="Go to Google Scholar and copy the researcher's URL." icon={<Search size={18} />} />
                <StepCard num="02" title="Extract Data" text="Our engine parses citations, h-index, and hidden metrics." icon={<Zap size={18} />} />
                <StepCard num="03" title="Reveal Impact" text="See venue rankings, network graphs, and true influence." icon={<TrendingUp size={18} />} />
              </div>
            </div>
          </div>
        )}

        {reportData && !mutation.isPending && (
          <div className="animate-fade-in">
             <div style={{ marginBottom: "20px" }}>
                <button onClick={handleResetView} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#64748B", fontSize: "13px", fontWeight: "600", padding: "0" }}>
                    <ChevronLeft size={16} /> Search Another Researcher
                </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", borderBottom: "1px solid #E2E8F0", paddingBottom: "24px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "6px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#0F172A", lineHeight: "1.1" }}>{reportData.profile.name}</h1>
                    <button onClick={handleToggleSave} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "24px", border: isSaved ? "1px solid #0F172A" : "1px solid #E2E8F0", backgroundColor: isSaved ? "#0F172A" : "white", color: isSaved ? "white" : "#0F172A", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}>
                        {isSaved ? <Check size={12} /> : <Bookmark size={12} />} {isSaved ? "Saved" : "Save"}
                    </button>
                </div>
                <p style={{ fontSize: "15px", color: "#64748B", maxWidth: "700px" }}>{reportData.profile.affiliations || "No affiliation listed"}</p>
                <div style={{ display: "flex", gap: "12px", marginTop: "16px", alignItems: "center" }}>
                  <span style={{ backgroundColor: "#F1F5F9", color: "#334155", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}><Award size={14} /> Academic Age: {reportData.profile.academic_age} Years</span>
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>ID: {reportData.profile.id}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px" }}>
                    <button onClick={handleRefreshData} disabled={mutation.isPending} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                        <RefreshCw size={14} color="#64748B" className={mutation.isPending ? "animate-spin" : ""} />
                    </button>
                    <span style={{ fontSize: "11px", color: "#64748B", fontStyle: "italic" }}>Last updated: {timeAgo(reportData.profile.last_updated)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KEYWORDS CONTAINER */}
            <div style={{ marginBottom: "32px", padding: "24px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Zap size={14} fill="#F59E0B" color="#F59E0B" /> Core Research Focus
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {reportData.metrics.keywords && reportData.metrics.keywords.length > 0 ? (
                        reportData.metrics.keywords.map((kw, idx) => (
                            <div key={idx} style={{ padding: "8px 16px", backgroundColor: idx === 0 ? "#0F172A" : "#F8FAFC", color: idx === 0 ? "white" : "#0F172A", borderRadius: "84px", fontSize: "13px", fontWeight: "600", border: "1px solid #E2E8F0", textTransform: "capitalize", display: "flex", alignItems: "center", gap: "8px" }}>
                                {kw.text} <span style={{ opacity: 0.5, fontSize: "10px", backgroundColor: idx === 0 ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.1)", padding: "2px 6px", borderRadius: "10px" }}>{kw.count}</span>
                            </div>
                        ))
                    ) : ( <span style={{ fontSize: "13px", color: "#94A3B8", fontStyle: "italic" }}>No significant keywords extracted.</span> )}
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", marginBottom: "24px" }}>
              <button onClick={() => setActiveTab("overview")} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600", color: activeTab === "overview" ? "#0F172A" : "#64748B", borderBottom: activeTab === "overview" ? "2px solid #0F172A" : "2px solid transparent", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><LayoutDashboard size={16} /> Impact Overview</button>
              <button onClick={() => setActiveTab("publications")} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600", color: activeTab === "publications" ? "#0F172A" : "#64748B", borderBottom: activeTab === "publications" ? "2px solid #0F172A" : "2px solid transparent", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><List size={16} /> Publications Analysis</button>
            </div>

            {activeTab === "overview" && (
              <div className="animate-fade-in">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
                      <HeroCard type="success" label="Total Papers" value={reportData.metrics.total_p} icon={<FileText size={20} color="#059669" />} sub="Lifetime" />
                      <HeroCard type="primary" label="Total Citations" value={reportData.metrics.total_c.toLocaleString()} icon={<TrendingUp size={20} color="#0F172A" />} sub={`+${reportData.metrics.recent_c || 0} recent`} />
                      <HeroCard type="warning" label="Recent Papers" value={reportData.metrics.recent_p} icon={<Zap size={20} color="#D97706" />} sub="Last 5y" />
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                    <div style={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <ContributionChart papers={reportData.papers || []} />
                    </div>
                    <div style={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                        <ProductivityChart papers={reportData.papers || []} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#64748B", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Performance Indices</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "60px" }}>
                      <DetailCard label="H-Index" value={reportData.metrics.h_index} icon={<Hash size={18} color="#0F172A"/>} />
                      <DetailCard label="i10-Index" value={reportData.metrics.i10_index} icon={<Hash size={18} color="#0F172A"/>} />
                      <DetailCard label="g-Index" value={reportData.metrics.g_index} icon={<Hash size={18} color="#0F172A"/>} />
                      <DetailCard label="Avg Cits/Paper" value={reportData.metrics.cpp} icon={<TrendingUp size={18} color="#64748B"/>} />
                      <DetailCard label="Network Size" value={`${reportData.metrics.network_size}+`} icon={<Users size={18} color="#EA580C"/>} sub="Co-authors" />
                      <DetailCard label="Leadership" value={`${reportData.metrics.leadership_score}%`} icon={<Award size={18} color="#D97706"/>} sub="1st/Solo" />
                      <DetailCard label="One-Hit Wonder" value={`${reportData.metrics.one_hit}%`} icon={<Zap size={18} color="#EF4444"/>} sub="Top dependency" />
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

        {/* MODAL */}
        {isModalOpen && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(2px)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }} className="animate-fade-in">
            <div style={{ backgroundColor: "white", borderRadius: "16px", width: "450px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0F172A" }}>Save to History</h2>
                    <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}><X size={20} /></button>
              </div>
              <div style={{ padding: "24px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#0F172A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "18px" }}>{reportData.profile.name.charAt(0)}</div>
                    <div>
                        <div style={{ fontWeight: "700", color: "#0F172A", fontSize: "14px" }}>{reportData.profile.name}</div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>{reportData.profile.affiliations?.substring(0, 40)}...</div>
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "24px", padding: "16px", backgroundColor: "#F8FAFC", borderRadius: "12px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" }}>Your Rating</span>
                    <div style={{ display: "flex", gap: "10px" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={28} fill={(hoverRating || rating) >= star ? "#0F172A" : "transparent"} color={(hoverRating || rating) >= star ? "#0F172A" : "#CBD5E1"} onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} style={{ cursor: "pointer" }} />
                        ))}
                    </div>
                </div>
                <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#0F172A", marginBottom: "8px" }}>Notes</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a personal note..." style={{ width: "100%", height: "90px", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", resize: "none", outline: "none" }} />
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "white", fontSize: "14px", fontWeight: "600", color: "#64748B", cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleConfirmSave} style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "#0F172A", color: "white", border: "none", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Save</button>
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

// --- COMPONENTS ---

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

function HeroCard({ type, label, value, icon, sub, tooltip }) {
  const styles = { success: { border: "#059669", bg: "#ECFDF5", text: "#065F46" }, primary: { border: "#0F172A", bg: "#F1F5F9", text: "#0F172A" }, warning: { border: "#D97706", bg: "#FFFBEB", text: "#92400E" } };
  const theme = styles[type] || styles.primary;
  return (
    <div style={{ backgroundColor: "white", padding: "16px 20px", borderRadius: "10px", border: "1px solid #E2E8F0", borderTop: `4px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
         <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
           <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>{label}</span>
           {tooltip && <HelpCircle size={12} color="#CBD5E1" />}
         </div>
         <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "30px", fontWeight: "800", color: "#0F172A" }}>{value}</span>
            {sub && <span style={{ fontSize: "12px", fontWeight: "600", color: theme.text, backgroundColor: theme.bg, padding: "2px 6px", borderRadius: "4px" }}>{sub}</span>}
         </div>
      </div>
      <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#F8FAFC" }}>{icon}</div>
    </div>
  );
}

function DetailCard({ label, value, icon, sub }) {
  return (
    <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "10px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ padding: "8px", backgroundColor: "#F8FAFC" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "11px", color: "#64748B", fontWeight: "600", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>{value}</div>
        {sub && <div style={{ fontSize: "11px", color: "#94A3B8" }}>{sub}</div>}
      </div>
    </div>
  );
}

function PublicationsTable({ papers }) {
  const [filterVenue, setFilterVenue] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [filterRank, setFilterRank] = useState(null);
  const [filterRecent, setFilterRecent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const defaultSort = { key: 'year', direction: 'desc' };
  const [sortConfig, setSortConfig] = useState(defaultSort); 
  const itemsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [filterVenue, filterType, filterRank, filterRecent]);

  const venueStats = useMemo(() => {
    const counts = {};
    const cleanVenue = (rawName) => {
        if (!rawName || rawName === "Unknown") return null;
        return rawName.replace(/\s+\d+.*$/, '').trim();
    };
    papers.forEach(p => {
      const originalName = p.venue || "Unknown";
      const cleanName = cleanVenue(originalName);
      if (cleanName && cleanName !== "Unknown") { counts[cleanName] = (counts[cleanName] || 0) + 1; }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [papers]);

  const showVenueFilter = venueStats.length > 0 && venueStats[0].count > 1;

  const filteredPapers = useMemo(() => {
    return papers.filter(p => {
      if (filterVenue) {
          const pVenueClean = (p.venue || "").replace(/\s+\d+.*$/, '').trim();
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
        if (sortConfig.key === 'author_pos') {
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
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPapers.slice(start, start + itemsPerPage);
  }, [sortedPapers, currentPage]);

  const totalPages = Math.ceil(sortedPapers.length / itemsPerPage);

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
    if (sortConfig.key !== key) return <ArrowUpDown size={12} color="#CBD5E1" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={12} color="#0F172A" />;
    return <ArrowDown size={12} color="#0F172A" />;
  };

  const FilterSection = ({ title, children }) => (
      <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>{children}</div>
      </div>
  );

  const CheckboxRow = ({ label, count, checked, onClick }) => (
      <div onClick={onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", backgroundColor: checked ? "#F1F5F9" : "transparent", color: checked ? "#0F172A" : "#475569", fontSize: "13px", fontWeight: checked ? "600" : "400" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "14px", height: "14px", borderRadius: "3px", border: checked ? "1px solid #0F172A" : "1px solid #CBD5E1", backgroundColor: checked ? "#0F172A" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>{checked && <Check size={10} color="white" strokeWidth={4} />}</div>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "140px" }}>{label}</span>
          </div>
          {count !== undefined && <span style={{ fontSize: "10px", color: "#94A3B8" }}>{count}</span>}
      </div>
  );

  return (
    <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
      <div style={{ width: "200px", flexShrink: 0, position: "sticky", top: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#0F172A" }}>Filters</div>
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

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 16px 12px", borderBottom: "2px solid #E2E8F0", position: "relative" }}>
            <div style={{ flex: 1, fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => requestSort('title')}>Publication Details {getSortIcon('title')}</div>
            <div style={{ width: "100px", textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }} onClick={() => requestSort('rank')}>Rank {getSortIcon('rank')}</div>
            <div style={{ width: "120px", textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }} onClick={() => requestSort('author_pos')}>Author Pos {getSortIcon('author_pos')}</div>
            <div style={{ width: "80px", textAlign: "right", fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }} onClick={() => requestSort('citations')}>Cits {getSortIcon('citations')}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
            {displayedPapers.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>No publications found matching these filters.</div>
            ) : (
                displayedPapers.map((paper, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", padding: "16px 16px", borderBottom: "1px solid #F1F5F9" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "white"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                        <div style={{ flex: 1, paddingRight: "24px" }}>
                            <div style={{ fontSize: "15px", fontWeight: "600", color: "#1E293B", lineHeight: "1.4", marginBottom: "4px" }}>{paper.title}</div>
                            <div style={{ fontSize: "12px", color: "#64748B", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: "500", color: "#475569" }}>{paper.year}</span>
                                <span style={{ width: "3px", height: "3px", backgroundColor: "#CBD5E1", borderRadius: "50%" }}></span>
                                <span style={{ fontStyle: "italic" }}>{paper.venue || "Unknown Venue"}</span>
                                <span style={{ textTransform: "capitalize", backgroundColor: "#F1F5F9", padding: "1px 6px", borderRadius: "4px" }}>{paper.venue_type || "Article"}</span>
                            </div>
                        </div>
                        <div style={{ width: "100px", display: "flex", justifyContent: "center" }}>
                            {paper.rank ? (
                                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", textAlign: "center", minWidth: "36px", backgroundColor: paper.rank.includes("Q1") || paper.rank.includes("A*") ? "#F1F5F9" : "#FFFBEB", color: "#0F172A", border: "1px solid #E2E8F0" }}>{paper.rank}</span>
                            ) : (<span style={{ fontSize: "16px", color: "#E2E8F0" }}>-</span>)}
                        </div>
                        <div style={{ width: "120px", display: "flex", justifyContent: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "600", padding: "2px 10px", borderRadius: "20px", color: "#0F172A", border: "1px solid #E2E8F0" }}>{paper.author_pos || "-"}</span>
                        </div>
                        <div style={{ width: "80px", textAlign: "right" }}><span style={{ fontSize: "14px", fontWeight: "700", color: "#334155" }}>{paper.citations || 0}</span></div>
                    </div>
                ))
            )}
        </div>
        {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "30px", borderTop: "1px solid #E2E8F0", paddingTop: "16px" }}>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Page <span style={{ fontWeight: "600", color: "#0F172A" }}>{currentPage}</span> of {totalPages}</div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", backgroundColor: "white", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "12px" }}>Previous</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", backgroundColor: "white", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: "12px" }}>Next</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
