// History.jsx
// Full file: branded History page + filters + shortlist/edit/delete modals
// + "Thinking Space" button
// + Deletes also remove from Thinking Space board storage
//
// Requires: react-router-dom (for navigation)
// Add route elsewhere: <Route path="/thinking-space" element={<ThinkingSpace />} />
// and create ThinkingSpace.jsx (I can paste it if you want)

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  History as HistoryIcon,
  Clock,
  Star,
  Trash2,
  Plus,
  Pencil,
  Filter,
  Brain,
  TrendingUp
} from "lucide-react";

const BRAND_BLUE_1 = "#2563EB";
const BRAND_BLUE_2 = "#3B82F6";

const BOARD_KEY = "thinking_board_v1";
const BOARD_COLS = ["undecided", "analysis", "discard", "confirmed"];

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  // Filters
  const [filterShortlisted, setFilterShortlisted] = useState(false);
  const [starSort, setStarSort] = useState("high"); // high | low

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editHover, setEditHover] = useState(0);
  const [editComment, setEditComment] = useState("");

  // Load history
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("compare_history") || "[]");

    const normalized = saved.map((item) => ({
      ...item,
      shortlisted: Boolean(item.shortlisted),
      profile_link: item.profile_link || "",
    }));

    setHistory(normalized);
    localStorage.setItem("compare_history", JSON.stringify(normalized));
  }, []);

  const persist = (updated) => {
    setHistory(updated);
    localStorage.setItem("compare_history", JSON.stringify(updated));
  };

  // Clear all
  const clearAll = () => {
    if (confirm("Are you sure you want to delete all history?")) {
      setHistory([]);
      localStorage.removeItem("compare_history");
      // Optional: also clear thinking board
      localStorage.removeItem(BOARD_KEY);
    }
  };

  // Remove id from Thinking Space board
  const removeFromThinkingBoard = (id) => {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return;
    try {
      const board = JSON.parse(raw);
      const next = {};
      for (const col of BOARD_COLS) {
        next[col] = (board?.[col] || []).filter((x) => x !== id);
      }
      localStorage.setItem(BOARD_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Shortlist toggle
  const toggleShortlist = (id) => {
    persist(
      history.map((h) =>
        h.id === id ? { ...h, shortlisted: !h.shortlisted } : h
      )
    );
  };

  // Edit
  const openEdit = (item) => {
    setEditTarget(item);
    setEditRating(item.userRating || 0);
    setEditHover(0);
    setEditComment(item.userComment || "");
  };

  const saveEdit = () => {
    persist(
      history.map((h) =>
        h.id === editTarget.id
          ? { ...h, userRating: editRating, userComment: editComment }
          : h
      )
    );
    setEditTarget(null);
  };

  // Delete
  const confirmDelete = () => {
    if (!deleteTarget) return;

    // Remove from history
    persist(history.filter((h) => h.id !== deleteTarget.id));

    // Remove from thinking board too
    removeFromThinkingBoard(deleteTarget.id);

    setDeleteTarget(null);
  };

  // Filter + sort
  const filtered = useMemo(() => {
    const base = history.filter((i) => !filterShortlisted || i.shortlisted);
    const dir = starSort === "high" ? -1 : 1;

    return [...base].sort((a, b) => {
      const ar = a.userRating || 0;
      const br = b.userRating || 0;
      if (ar !== br) return (ar - br) * dir;
      return new Date(b.date) - new Date(a.date);
    });
  }, [history, filterShortlisted, starSort]);

  return (
    <div style={pageWrap}>
      {/* BRAND HEADER */}
      <div style={brandHeaderWrap}>
        <div style={brandTitleRow}>
          <BrandWordmark />
        </div>

        <div style={brandSubRow}>
          <div style={pill}>
            <HistoryIcon size={16} color={BRAND_BLUE_1} />
            <span style={{ fontWeight: 800, color: "#111827" }}>
              Filter, shortlist & manage your saved reports
            </span>
          </div>

          {history.length > 0 && (
            <button onClick={clearAll} style={clearBtn}>
              <Trash2 size={16} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {history.length > 0 && (
        <div style={filterBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={filterIconBadge}>
              <Filter size={16} color={BRAND_BLUE_1} />
            </div>
            <div style={{ fontWeight: 900, color: "#111827" }}>Filters</div>
          </div>

          <button
            onClick={() => setFilterShortlisted((v) => !v)}
            style={{
              ...chipBtn,
              ...(filterShortlisted ? chipActive : null),
            }}
          >
            <Plus size={14} />
            Shortlisted
          </button>

          <select
            value={starSort}
            onChange={(e) => setStarSort(e.target.value)}
            style={select}
          >
            <option value="high">Stars: High → Low</option>
            <option value="low">Stars: Low → High</option>
          </select>

          <div style={{ flex: 1 }} />

          <button
            onClick={() => {
              setFilterShortlisted(false);
              setStarSort("high");
            }}
            style={resetBtn}
          >
            Reset
          </button>
        </div>
      )}

      {/* Empty */}
      {history.length === 0 && (
        <div style={emptyState}>
          <div style={emptyIconWrap}>
            <Clock size={44} color={BRAND_BLUE_1} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
            No saved reports yet
          </div>
          <div style={{ color: "#6B7280", marginTop: 4 }}>
            Generate a report and save it to see it here.
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={cardList}>
        {filtered.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            onShortlist={() => toggleShortlist(item.id)}
            onEdit={() => openEdit(item)}
            onDelete={() => setDeleteTarget(item)}
            onAnalyze={() => navigate('/analyze', { state: { preSelectId: item.id } })}
          />
        ))}
      </div>

      {/* Thinking Space Button */}
      <div style={thinkingSpaceWrap}>
        <button
          onClick={() => navigate("/thinking-space")}
          style={thinkingBtn}
        >
          <Brain size={18} />
          Thinking Space
          <span style={{ opacity: 0.9, fontWeight: 900 }}>→</span>
        </button>
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <h3 style={{ marginTop: 0, marginBottom: 6, fontWeight: 900 }}>
            Delete this entry?
          </h3>
          <p style={{ color: "#6B7280", marginTop: 0 }}>
            This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => setDeleteTarget(null)} style={btnSecondary}>
              Cancel
            </button>
            <button onClick={confirmDelete} style={btnDanger}>
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal onClose={() => setEditTarget(null)}>
          <h3 style={{ marginTop: 0, marginBottom: 6, fontWeight: 900 }}>
            Edit information
          </h3>

          <div style={{ display: "flex", gap: 6, margin: "10px 0 14px" }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={28}
                onClick={() => setEditRating(s)}
                onMouseEnter={() => setEditHover(s)}
                onMouseLeave={() => setEditHover(0)}
                fill={(editHover || editRating) >= s ? "#FBBF24" : "none"}
                color={(editHover || editRating) >= s ? "#FBBF24" : "#D1D5DB"}
                style={{ cursor: "pointer" }}
              />
            ))}
          </div>

          <textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            placeholder="Note..."
            style={textarea}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => setEditTarget(null)} style={btnSecondary}>
              Cancel
            </button>
            <button onClick={saveEdit} style={btnPrimary}>
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Components ---------- */

function BrandWordmark() {
  return (
    <div style={wordmark}>
      <span style={wordmarkBlack}>Profile History</span>
    </div>
  );
}

function HistoryCard({ item, onShortlist, onEdit, onDelete, onAnalyze }) {
  const savedDate = item.date ? new Date(item.date).toLocaleDateString() : "-";
  const rating = item.userRating || 0;

  return (
    <div style={card}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top Row: Name + Tag + Date */}
        <div style={cardTopRow}>
          <div style={cardName} title={item.name}>
            {item.name}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {item.shortlisted && (
              <span style={shortlistedTag}>
                <Plus size={12} />
                Shortlisted
              </span>
            )}
            <span style={cardDate}>Saved {savedDate}</span>
          </div>
        </div>

        {/* Institute */}
        <div style={cardInstitute} title={item.affiliations || ""}>
          {item.affiliations || "No institute listed"}
        </div>

        {/* Stars */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              fill={rating >= s ? "#FBBF24" : "none"}
              color={rating >= s ? "#FBBF24" : "#D1D5DB"}
            />
          ))}
        </div>

        {/* Comment */}
        {item.userComment && <div style={cardComment}>{item.userComment}</div>}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <IconBtn onClick={onAnalyze} title="Deep Analyze" active={false}>
          <TrendingUp size={16} color={BRAND_BLUE_1} />
        </IconBtn>
        <IconBtn
          onClick={onShortlist}
          active={item.shortlisted}
          title="Toggle shortlist"
        >
          <Plus size={16} />
        </IconBtn>
        <IconBtn onClick={onEdit} title="Edit rating/comment">
          <Pencil size={16} />
        </IconBtn>
        <IconBtn onClick={onDelete} danger title="Delete">
          <Trash2 size={16} />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, active, danger, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        border: `1px solid ${danger ? "#FEE2E2" : "#E5E7EB"}`,
        background: active ? "rgba(37, 99, 235, 0.08)" : "white",
        color: danger ? "#EF4444" : "#374151",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {children}
    </button>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onMouseDown={onClose} style={modalOverlay}>
      <div onMouseDown={(e) => e.stopPropagation()} style={modalBody}>
        {children}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const pageWrap = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "36px 20px 60px",
};

const brandHeaderWrap = {
  background: "#F9FAFB",
  borderRadius: 18,
  padding: 18,
  border: "1px solid #E5E7EB",
};

const brandTitleRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const brandSubRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 12,
  flexWrap: "wrap",
};

const wordmark = {
  fontSize: 42,
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: "-0.04em",
};

const wordmarkBlack = {
  color: "#0B1220",
};

const pill = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "white",
  border: "1px solid rgba(37, 99, 235, 0.18)",
  borderRadius: 999,
  padding: "8px 12px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const clearBtn = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "white",
  border: "1px solid #FEE2E2",
  borderRadius: 12,
  padding: "8px 12px",
  color: "#EF4444",
  fontWeight: 800,
  cursor: "pointer",
};

const filterBar = {
  marginTop: 16,
  padding: 14,
  background: "white",
  borderRadius: 14,
  border: "1px solid #E5E7EB",
  display: "flex",
  gap: 12,
  alignItems: "center",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  flexWrap: "wrap",
};

const filterIconBadge = {
  width: 34,
  height: 34,
  borderRadius: 12,
  background: "rgba(37, 99, 235, 0.10)",
  border: "1px solid rgba(37, 99, 235, 0.14)",
  display: "grid",
  placeItems: "center",
};

const chipBtn = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  background: "white",
  fontWeight: 900,
  cursor: "pointer",
  color: "#111827",
};

const chipActive = {
  border: "1px solid rgba(37, 99, 235, 0.35)",
  background: "rgba(37, 99, 235, 0.08)",
  color: BRAND_BLUE_1,
};

const select = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  fontWeight: 900,
  cursor: "pointer",
  color: "#111827",
};

const resetBtn = {
  background: "none",
  border: "none",
  fontWeight: 900,
  cursor: "pointer",
  color: BRAND_BLUE_1,
};

const emptyState = {
  marginTop: 26,
  padding: 28,
  borderRadius: 16,
  border: "1px dashed rgba(37, 99, 235, 0.35)",
  background: "rgba(37, 99, 235, 0.05)",
  textAlign: "center",
};

const emptyIconWrap = {
  width: 64,
  height: 64,
  borderRadius: 18,
  margin: "0 auto 10px",
  background: "rgba(37, 99, 235, 0.12)",
  border: "1px solid rgba(37, 99, 235, 0.20)",
  display: "grid",
  placeItems: "center",
};

const cardList = {
  marginTop: 18,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const card = {
  padding: 18,
  background:
    "linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.00) 70%)",
  borderRadius: 14,
  border: "0.5px solid #E5E7EB",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

const cardTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
};

const cardName = {
  fontSize: 18,
  fontWeight: 900,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "68%",
};

const cardDate = {
  fontSize: 12,
  color: "#9CA3AF",
  whiteSpace: "nowrap",
};

const shortlistedTag = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 900,
  color: BRAND_BLUE_1,
  background: "rgba(37, 99, 235, 0.10)",
  border: "1px solid rgba(37, 99, 235, 0.22)",
  padding: "2px 10px",
  borderRadius: 999,
  whiteSpace: "nowrap",
};

const cardInstitute = {
  fontSize: 13,
  color: "#6B7280",
  marginTop: 4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const cardComment = {
  marginTop: 10,
  fontSize: 13,
  fontStyle: "italic",
  background: "#FFFFFF",
  padding: 10,
  borderRadius: 10,
  color: "#374151",
  wordBreak: "break-word",
  border: "1px solid rgba(0,0,0,0.04)",
};

const thinkingSpaceWrap = {
  marginTop: 26,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const thinkingBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 18px",
  borderRadius: 14,
  border: "1px solid rgba(37, 99, 235, 0.25)",
  background: `linear-gradient(90deg, ${BRAND_BLUE_1}, ${BRAND_BLUE_2})`,
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(37, 99, 235, 0.25)",
  minWidth: 220,
  justifyContent: "center",
};

const thinkingHint = {
  fontSize: 13,
  color: "#6B7280",
  textAlign: "center",
  maxWidth: 720,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 16,
  zIndex: 1000,
};

const modalBody = {
  background: "white",
  padding: 20,
  borderRadius: 14,
  width: 440,
  border: "1px solid #E5E7EB",
  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
};

const textarea = {
  width: "100%",
  height: 90,
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  padding: 10,
  outline: "none",
  resize: "none",
  fontSize: 14,
};

const btnPrimary = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: "none",
  background: `linear-gradient(90deg, ${BRAND_BLUE_1}, ${BRAND_BLUE_2})`,
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const btnSecondary = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  background: "white",
  color: "#374151",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDanger = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: "none",
  background: "#EF4444",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};
