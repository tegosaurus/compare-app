import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star, Trash2, Plus, Pencil, Brain, TrendingUp,
  X, ChevronRight, Check, LayoutGrid, List as ListIcon, RotateCcw, GitCompare, AlertTriangle, Clock,
  PiggyBank
} from "lucide-react";

// --- THEME CONSTANTS ---
const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";
const BG = "#F8FAFC";
const STAR_YELLOW = "#f5bb0bff"; 
const CARD_TOP_BORDER = "#044168"; // The dark blue border color

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  
  // Filter/Sort State
  const [filterShortlisted, setFilterShortlisted] = useState(false);
  const [sortMode, setSortMode] = useState("recent"); 

  // Modal States
  const [editTarget, setEditTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null); 
  const [editRating, setEditRating] = useState(0);
  const [editHover, setEditHover] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [clearAllConfirmation, setClearAllConfirmation] = useState(false);

  useEffect(() => {
    try {
        const saved = JSON.parse(localStorage.getItem("compare_history") || "[]");
        if (Array.isArray(saved)) {
            setHistory(saved.map(item => ({ ...item, shortlisted: Boolean(item.shortlisted) })));
        } else {
            setHistory([]);
        }
    } catch (e) {
        console.error("Error loading history:", e);
        setHistory([]); 
    }
  }, []);

  const persist = (updated) => {
    setHistory(updated);
    localStorage.setItem("compare_history", JSON.stringify(updated));
  };

  const handleSaveEdit = () => {
    const updated = history.map(h => h.id === editTarget.id ? { ...h, userRating: editRating, userComment: editComment } : h);
    persist(updated);
    
    if (detailTarget && detailTarget.id === editTarget.id) {
        setDetailTarget({ ...detailTarget, userRating: editRating, userComment: editComment });
    }
    setEditTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmation) return;
    const updated = history.filter(h => h.id !== deleteConfirmation.id);
    persist(updated);
    if (detailTarget && detailTarget.id === deleteConfirmation.id) setDetailTarget(null);
    setDeleteConfirmation(null);
  };

  const handleConfirmClearAll = () => {
    persist([]);
    setClearAllConfirmation(false);
    setDetailTarget(null);
  };

  const isFiltered = filterShortlisted || sortMode !== "recent";

  const handleReset = () => {
    setFilterShortlisted(false);
    setSortMode("recent");
  };

  const filtered = useMemo(() => {
    const base = history.filter((i) => !filterShortlisted || i.shortlisted);
    return [...base].sort((a, b) => {
      if (sortMode === "recent") return new Date(b.date) - new Date(a.date);
      if (sortMode === "high") return (b.userRating || 0) - (a.userRating || 0);
      if (sortMode === "low") return (a.userRating || 0) - (b.userRating || 0);
      return 0;
    });
  }, [history, filterShortlisted, sortMode]);

  const miniActionBtn = { 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    width: 30, height: 30, 
    borderRadius: '8px', 
    border: `1px solid ${BORDER}`, 
    backgroundColor: 'white', 
    color: SLATE, 
    cursor: 'pointer', 
    transition: 'all 0.2s' 
  };

  return (
    <div style={{ width: "100%", background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)", minHeight: "100vh", paddingBottom: "60px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 20px" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", borderBottom: `1px solid ${BORDER}`, paddingBottom: "20px" }}>
          <div>
             <h1 style={{ fontSize: "27px", fontWeight: "800", color: NAVY, margin: 0 }}>Saved Profiles</h1>
             <p style={{ fontSize: "14px", color: SLATE, marginTop: "8px", fontWeight: "500" }}>Filter, shortlist, and organize your saves.</p>
          </div>
          <button onClick={() => navigate("/thinking-space")} style={primaryBtn}>
              <Brain size={18} /> Thinking Space <ChevronRight size={16} />
          </button>
        </div>

        {/* TOOLBAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={tabContainer}>
                  <button onClick={() => setFilterShortlisted(false)} style={{ ...tabBtn, backgroundColor: !filterShortlisted ? NAVY : "transparent", color: !filterShortlisted ? "white" : SLATE }}>All Profiles</button>
                  <button onClick={() => setFilterShortlisted(true)} style={{ ...tabBtn, backgroundColor: filterShortlisted ? NAVY : "transparent", color: filterShortlisted ? "white" : SLATE }}>Shortlisted</button>
              </div>

              {/* DROPDOWN ARROW FIX */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <select 
                    value={sortMode} 
                    onChange={(e) => setSortMode(e.target.value)} 
                    style={{ 
                        ...selectStyle, 
                        paddingRight: '32px', 
                        appearance: 'none',    
                        WebkitAppearance: 'none' 
                    }}
                  >
                      <option value="recent">Recently Saved</option>
                      <option value="high">Rating: High → Low</option>
                      <option value="low">Rating: Low → High</option>
                  </select>
                  <ChevronRight 
                    size={14} 
                    style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        pointerEvents: 'none', 
                        transform: 'rotate(90deg)', 
                        color: NAVY 
                    }} 
                  />
              </div>

              {isFiltered && (
                  <button onClick={handleReset} style={resetBtnStyle}>
                      <RotateCcw size={12} /> Reset
                  </button>
              )}
          </div>
          
          {history.length > 0 && (
              <button 
                  onClick={() => setClearAllConfirmation(true)} 
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 12, backgroundColor: "#F1F5F9", color: "#EF4444", border: "1px solid #E2E8F0", cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                  <Trash2 size={14} /> Clear All
              </button>
          )}
        </div>

        {/* CARDS GRID / EMPTY STATES */}
        {history.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {filtered.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onOpenDetail={() => setDetailTarget(item)}
                onShortlist={() => persist(history.map(h => h.id === item.id ? {...h, shortlisted: !h.shortlisted} : h))}
                onEdit={() => { setEditTarget(item); setEditRating(item.userRating || 0); setEditComment(item.userComment || ""); }}
                onDelete={(targetItem) => setDeleteConfirmation(targetItem)}
                onAnalyze={() => navigate('/analyze', { state: { preSelectId: item.id } })}
                miniBtnStyle={miniActionBtn}
              />
            ))}
            
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: SLATE }}>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>No profiles match your current filters.</p>
                <button onClick={handleReset} style={{ ...resetBtnStyle, textDecoration: 'underline', margin: '8px auto' }}>Reset filters</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '100px 20px', 
            backgroundColor: 'white', 
            borderRadius: '24px', 
            border: `1px dashed ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
              <Clock size={32} color={SLATE} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: NAVY, margin: 0 }}>Archive is empty</h2>
            <p style={{ fontSize: '14px', color: SLATE, marginTop: '8px', maxWidth: '340px', lineHeight: 1.5 }}>
              Profiles you analyze and save will appear here for long-term tracking and evaluation.
            </p>
            <button 
              onClick={() => navigate('/generate')}
              style={{ ...primaryBtn, marginTop: '5px', padding: '12px 20px',  }}
            >
              Analyze a Profile
            </button>
          </div>
        )}

        {/* DETAIL POP-UP */}
        {detailTarget && (
          <div style={modalOverlay} onMouseDown={() => setDetailTarget(null)}>
            <div 
              style={{ ...modalBody, width: '500px', height: '410px', display: 'flex', flexDirection: 'column' }} 
              onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={{ padding: '8px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setDetailTarget(null)} style={closeIconBtn}><X size={18} /></button>
                </div>

                <div style={{ padding: '16px 24px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={bigAvatar}>{(detailTarget.name || "??").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '22px', fontWeight: 800, color: NAVY, margin: 0, lineHeight: 1.1 }}>{detailTarget.name}</h3>
                            <p style={{ color: SLATE, fontSize: '13px', margin: '4px 0 0 0' }}>{detailTarget.affiliations}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', paddingLeft: '72px', marginTop: '-12px' }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill={(detailTarget.userRating || 0) >= s ? STAR_YELLOW : "none"} color={(detailTarget.userRating || 0) >= s ? STAR_YELLOW : "#CBD5E1"} />)}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}> {/* TIGHTER ICON GAP */}
                            <button onClick={() => { setEditTarget(detailTarget); setEditRating(detailTarget.userRating || 0); setEditComment(detailTarget.userComment || ""); }} style={miniActionBtn} title="Edit Note"><Pencil size={12} /></button>
                            <button 
                              onClick={() => { 
                                const updated = history.map(h => h.id === detailTarget.id ? {...h, shortlisted: !h.shortlisted} : h); 
                                persist(updated); 
                                setDetailTarget({...detailTarget, shortlisted: !detailTarget.shortlisted}); 
                              }} 
                              style={{ ...miniActionBtn, backgroundColor: detailTarget.shortlisted ? "#10B981" : "white", color: detailTarget.shortlisted ? "white" : SLATE, borderColor: detailTarget.shortlisted ? "#10B981" : BORDER }} 
                            >
                              {detailTarget.shortlisted ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
                            </button>
                            <button onClick={() => setDeleteConfirmation(detailTarget)} style={{ ...miniActionBtn, color: "#EF4444" }}><Trash2 size={12} /></button>
                            <button onClick={() => navigate('/analyze', { state: { preSelectId: detailTarget.id } })} style={miniActionBtn}><GitCompare size={12} /></button>
                        </div>
                    </div>

                    <div 
                        onClick={() => { setEditTarget(detailTarget); setEditRating(detailTarget.userRating || 0); setEditComment(detailTarget.userComment || ""); }}
                        style={{ backgroundColor: BG, borderRadius: '12px', border: `1px solid ${BORDER}`, padding: '16px', flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                    >
                        {/* "MY NOTES" TEXT MOVED UP MANUALLY */}
                        <p style={{ fontSize: '10px', fontWeight: 800, color: SLATE, textTransform: 'uppercase', marginBottom: '6px', marginTop: '-6px' }}>My Notes</p>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {detailTarget.userComment ? <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{detailTarget.userComment}</p> : <p style={{ fontSize: '14px', color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>Click to edit...</p>}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'center' }}>
                    <button 
                      onClick={() => navigate('/generate', { state: { report: detailTarget.fullReport } })} 
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 13px', borderRadius: '9px', backgroundColor: '#F1F5F9', border: `0px solid ${SLATE}`, color: NAVY, fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2.5px rgba(0,2,0.2,0.2)' }}
                    >
                        <TrendingUp size={16} /> View Report
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL (MATCHING GENERATE REPORT STYLE) */}
        {editTarget && (
          <div onClick={() => setEditTarget(null)} style={modalOverlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...modalBody, width: "400px" }}>
              <div style={modalHeader}>
                    <h2 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>Update Evaluation</h2>
                    <button onClick={() => setEditTarget(null)} style={closeIconBtn}><X size={18} /></button>
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "8px" }}>Update profile rating</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} size={24} fill={(editHover || editRating) >= star ? STAR_YELLOW : "transparent"} color={(editHover || editRating) >= star ? STAR_YELLOW : "#CBD5E1"} onClick={() => setEditRating(star)} onMouseEnter={() => setEditHover(star)} onMouseLeave={() => setEditHover(0)} style={{ cursor: "pointer" }} />
                        ))}
                    </div>
                </div>
                <div style={{ marginBottom: "20px" }}>
                    <textarea 
                      value={editComment} 
                      onChange={(e) => setEditComment(e.target.value)} 
                      maxLength="250" 
                      placeholder="Add notes..." 
                      style={textareaStyle} 
                    />
                    <div style={{ textAlign: "right", fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                        {250 - editComment.length} characters remaining
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setEditTarget(null)} style={btnSec}>Cancel</button>
                    <button onClick={handleSaveEdit} style={btnPri}>Update Profile</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SINGLE DELETE CONFIRMATION */}
        {deleteConfirmation && (
          <div onClick={() => setDeleteConfirmation(null)} style={modalOverlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...modalBody, width: "320px", textAlign: 'center', padding: '24px' }}>
                <div style={{ margin: '0 auto 16px', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={24} color="#EF4444" />
                </div>
                <h3 style={{ margin: '0 0 8px', color: NAVY, fontSize: '16px', fontWeight: '700' }}>Delete Profile?</h3>
                <p style={{ margin: '0 0 24px', color: SLATE, fontSize: '13px' }}>Are you sure you want to remove <b>{deleteConfirmation.name}</b>?</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setDeleteConfirmation(null)} style={btnSec}>Cancel</button>
                    <button onClick={handleConfirmDelete} style={{ ...btnPri, backgroundColor: '#EF4444', border: 'none', color: 'white' }}>Delete</button>
                </div>
            </div>
          </div>
        )}

        {clearAllConfirmation && (
          <div onClick={() => setClearAllConfirmation(false)} style={modalOverlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...modalBody, width: "320px", textAlign: 'center', padding: '24px' }}>
                <div style={{ margin: '0 auto 16px', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={24} color="#EF4444" />
                </div>
                <h3 style={{ margin: '0 0 8px', color: NAVY, fontSize: '16px', fontWeight: '700' }}>Clear All History?</h3>
                <p style={{ margin: '0 0 24px', color: SLATE, fontSize: '13px' }}>This will permanently delete all saved profiles. This action cannot be undone.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setClearAllConfirmation(false)} style={btnSec}>Cancel</button>
                    <button onClick={handleConfirmClearAll} style={{ ...btnPri, backgroundColor: '#EF4444', border: 'none', color: 'white' }}>Clear All</button>
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function HistoryCard({ item, onOpenDetail, onShortlist, onEdit, onDelete, onAnalyze, miniBtnStyle }) {
  const initials = (item.name || "??").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const savedDate = item.date ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-";
  const displayComment = item.userComment;

  return (
    <div 
        onClick={onOpenDetail}
        style={{ ...cardContainer, flexDirection: "column", height: "130px", padding: "15px", justifyContent: "flex-start", gap: "8px" }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
        <div style={{...avatarStyle, width: 44, height: 44}}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h4 style={{...cardNameStyle, fontSize: 16}}>{item.name}</h4>
                {item.shortlisted && <span style={miniBadge}>SHORTLISTED</span>}
            </div>
            <p style={{ fontSize: '11px', color: SLATE, margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.affiliations}</p>
            <div style={{...cardMetaRow, marginTop: 4 }}>
                <div style={{ display: "flex", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (<Star key={s} size={15} fill={(item.userRating || 0) >= s ? STAR_YELLOW : "none"} color={(item.userRating || 0) >= s ? STAR_YELLOW : "#CBD5E1"} />))}
                </div>
                <span style={{...metaText, fontSize: 11}}>Saved {savedDate}</span>
            </div>
        </div>
      </div>

      <div style={{ flex: 1, marginTop: '4px', overflow: 'hidden' }}>
        {displayComment && (
            <div style={{ fontSize: "12.5px", color: "#475569", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" }}>{displayComment}</div>
        )}
      </div>

      <div style={{ ...actionCol, marginTop: "-7px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onEdit} style={{...miniBtnStyle, width: 28, height: 28}}><Pencil size={12} /></button>
            <button onClick={onShortlist} style={{ ...miniBtnStyle, width: 28, height: 28, backgroundColor: item.shortlisted ? "#10B981" : "white", color: item.shortlisted ? "white" : SLATE, borderColor: item.shortlisted ? "#10B981" : BORDER }}>{item.shortlisted ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}</button>
            <button onClick={() => onDelete(item)} style={{ ...miniBtnStyle, width: 28, height: 28, color: "#EF4444" }}><Trash2 size={12} /></button>
            <button onClick={onAnalyze} style={{ ...miniBtnStyle, width: 28, height: 28 }}><GitCompare size={12} /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------- SHARED STYLES ---------- */
const primaryBtn = { display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, backgroundColor: "#044168", color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const tabContainer = { display: "flex", backgroundColor: "white", padding: "4px", borderRadius: "12px", border: `1px solid ${BORDER}` };
const tabBtn = { padding: "6px 15px", borderRadius: 12, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", backgroundColor: "#3EA2DB" };
const selectStyle = { padding: "9px 12px", borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, color: NAVY, cursor: "pointer", backgroundColor: "white", outline: "none" };
const resetBtnStyle = { background: "none", border: "none", color: "#EF4444", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 };
const cardContainer = { borderRadius: "16px", border: `1px solid ${BORDER}`, borderTop: `4px solid ${CARD_TOP_BORDER}`, background: `linear-gradient(180deg, rgba(62, 162, 219, 0.1) 0%, #ffffff 100%)`, display: "flex", transition: "all 0.2s ease", cursor: "pointer", boxShadow: "0 2px 3px rgba(0,0,0,0.05)" };
const avatarStyle = { borderRadius: "12px", backgroundColor: "white", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, border: `1px solid ${BORDER}`, flexShrink: 0 };
const cardNameStyle = { fontWeight: 800, color: NAVY, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const miniBadge = { padding: "3px 6px", backgroundColor: "#10B981", color: "white", borderRadius: "20px", fontSize: "9px", fontWeight: "700" };
const cardMetaRow = { display: "flex", alignItems: "center", gap: 10 };
const metaText = { fontWeight: 600, color: "#94A3B8" };
const actionCol = { display: "flex", alignItems: "center", justifyContent: "flex-end" };
const modalOverlay = { position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBody = { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden", border: `1px solid ${BORDER}` };
const modalHeader = { padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" };
const closeIconBtn = { background: "none", border: "none", cursor: "pointer", color: "#94A3B8" };
const textareaStyle = { width: "100%", height: "100px", padding: "12px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", resize: "none", outline: "none", backgroundColor: "#F8FAFC" };
const btnPri = { flex: 1, padding: "10px", borderRadius: "10px", background: "#0F172A", color: "white", border: "none", fontSize: "13px", fontWeight: "600", cursor: "pointer" };
const btnSec = { flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "white", fontSize: "13px", fontWeight: "600", color: "#64748B", cursor: "pointer" };
const bigAvatar = { width: 52, height: 52, borderRadius: "14px", backgroundColor: BG, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, border: `1px solid ${BORDER}`, flexShrink: 0 };
