// ThinkingSpace.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, GripVertical, Plus } from "lucide-react";

const BRAND_BLUE_1 = "#2563EB";
const BRAND_BLUE_2 = "#3B82F6";

const HISTORY_KEY = "compare_history";
const BOARD_KEY = "thinking_board_v1";

const COLUMNS = [
  { key: "undecided", title: "Undecided" },
  { key: "analysis", title: "Further analysis required" },
  { key: "discard", title: "Potential discard" },
  { key: "confirmed", title: "Confirmed" },
];

export default function ThinkingSpace() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [board, setBoard] = useState(() => loadBoard());

  const [dragging, setDragging] = useState(null); // { id, fromCol }

  // Load history + reconcile board (remove deleted items, add new to undecided)
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    setHistory(saved);

    const reconciled = reconcileBoard(board, saved);
    setBoard(reconciled);
    localStorage.setItem(BOARD_KEY, JSON.stringify(reconciled));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If history changes in another tab/page, keep board in sync (nice-to-have)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === HISTORY_KEY) {
        const latest = JSON.parse(e.newValue || "[]");
        setHistory(latest);
        setBoard((prev) => {
          const next = reconcileBoard(prev, latest);
          localStorage.setItem(BOARD_KEY, JSON.stringify(next));
          return next;
        });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const byId = useMemo(() => {
    const map = new Map();
    history.forEach((h) => map.set(h.id, h));
    return map;
  }, [history]);

  const columnItems = useMemo(() => {
    const result = {};
    COLUMNS.forEach((c) => (result[c.key] = []));
    Object.entries(board).forEach(([col, ids]) => {
      result[col] = (ids || []).filter((id) => byId.has(id));
    });
    return result;
  }, [board, byId]);

  const persistBoard = (next) => {
    setBoard(next);
    localStorage.setItem(BOARD_KEY, JSON.stringify(next));
  };

  const onDragStart = (id, fromCol) => {
    setDragging({ id, fromCol });
  };

  const onDrop = (toCol) => {
    if (!dragging) return;
    const { id, fromCol } = dragging;
    persistBoard(moveCard(board, id, fromCol, toCol));
    setDragging(null);
  };

  return (
    <div style={wrap}>
      <div style={header}>
        <button onClick={() => navigate(-1)} style={backBtn} title="Back">
          <ArrowLeft size={18} />
        </button>

        <div>
          <div style={title}>Thinking Space</div>
          <div style={subtitle}>
            Drag and drop profiles between columns.
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={badge}>
          <span style={{ fontWeight: 900 }}>{history.length}</span>
          <span style={{ color: "#6B7280" }}>profiles</span>
        </div>
      </div>

      <div style={boardGrid}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            title={col.title}
            count={columnItems[col.key]?.length || 0}
            onDrop={() => onDrop(col.key)}
          >
            {(columnItems[col.key] || []).map((id) => (
              <KanbanCard
                key={id}
                item={byId.get(id)}
                onDragStart={() => onDragStart(id, col.key)}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function loadBoard() {
  const raw = localStorage.getItem(BOARD_KEY);
  if (!raw) return emptyBoard();
  try {
    const parsed = JSON.parse(raw);
    return { ...emptyBoard(), ...parsed };
  } catch {
    return emptyBoard();
  }
}

function emptyBoard() {
  return {
    undecided: [],
    analysis: [],
    discard: [],
    confirmed: [],
  };
}

function reconcileBoard(current, historyList) {
  const base = emptyBoard();
  const ids = historyList.map((h) => h.id);
  const idSet = new Set(ids);

  // keep only ids that still exist
  for (const col of Object.keys(base)) {
    base[col] = (current?.[col] || []).filter((id) => idSet.has(id));
  }

  // add missing ids to top of undecided
  const placed = new Set(Object.values(base).flat());
  const missing = ids.filter((id) => !placed.has(id));
  base.undecided = [...missing, ...base.undecided];

  return base;
}

function moveCard(board, id, fromCol, toCol) {
  const next = { ...board };

  // remove from all cols (safety)
  for (const col of Object.keys(next)) {
    next[col] = (next[col] || []).filter((x) => x !== id);
  }

  // add to top of destination
  next[toCol] = [id, ...(next[toCol] || [])];

  return next;
}

/* ---------------- UI Components ---------------- */

function KanbanColumn({ title, count, children, onDrop }) {
  return (
    <div
      style={colWrap}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div style={colHeader}>
        <div style={colTitle}>{title}</div>
        <div style={colCount}>{count}</div>
      </div>
      <div style={colBody}>{children}</div>
    </div>
  );
}

function KanbanCard({ item, onDragStart }) {
  const savedDate = item?.date ? new Date(item.date).toLocaleDateString() : "-";
  const rating = item?.userRating || 0;

  return (
    <div draggable onDragStart={onDragStart} style={kCard} title="Drag to move">
      <div style={kTop}>
        <div style={kName} title={item?.name}>
          {item?.name || "Unknown"}
        </div>
        <div style={kGrip}>
          <GripVertical size={16} color="#9CA3AF" />
        </div>
      </div>

      <div style={kAffil} title={item?.affiliations || ""}>
        {item?.affiliations || "No institute listed"}
      </div>

      <div style={kMetaRow}>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              fill={rating >= s ? "#FBBF24" : "none"}
              color={rating >= s ? "#FBBF24" : "#D1D5DB"}
            />
          ))}
        </div>

        <div style={kDate}>Saved {savedDate}</div>
      </div>

      {item?.userComment ? (
        <div style={kComment}>{item.userComment}</div>
      ) : (
        <div style={kNoComment}>No comment</div>
      )}

      {item?.shortlisted && (
        <div style={kTag}>
          <Plus size={12} />
          Shortlisted
        </div>
      )}
    </div>
  );
}

/* ---------------- Styles ---------------- */

const wrap = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "28px 18px 60px",
};

const header = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background:
    "linear-gradient(180deg, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.02) 85%)",
  border: "1px solid rgba(37,99,235,0.18)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
};

const backBtn = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid rgba(37,99,235,0.20)",
  background: "white",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const title = { fontSize: 22, fontWeight: 900, color: "#0B1220" };
const subtitle = { marginTop: 2, fontSize: 13, color: "#6B7280" };

const badge = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "white",
  border: "1px solid rgba(37,99,235,0.18)",
  borderRadius: 999,
  padding: "8px 12px",
};

const boardGrid = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(240px, 1fr))",
  gap: 14,
  alignItems: "start",
};

const colWrap = {
  background: "white",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  overflow: "hidden",
  minHeight: 220,
};

const colHeader = {
  padding: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: `linear-gradient(90deg, rgba(37,99,235,0.08), rgba(59,130,246,0.04))`,
  borderBottom: "1px solid #E5E7EB",
};

const colTitle = { fontWeight: 900, fontSize: 14, color: "#111827" };

const colCount = {
  minWidth: 28,
  height: 28,
  borderRadius: 999,
  background: "rgba(37,99,235,0.12)",
  border: "1px solid rgba(37,99,235,0.18)",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 900,
  color: BRAND_BLUE_1,
};

const colBody = {
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const kCard = {
  background:
    "linear-gradient(180deg, rgba(37,99,235,0.07) 0%, rgba(255,255,255,1) 55%)",
  border: "1px solid rgba(37,99,235,0.15)",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  cursor: "grab",
  position: "relative",
};

const kTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const kName = {
  fontSize: 14,
  fontWeight: 900,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const kGrip = {
  width: 28,
  height: 28,
  borderRadius: 10,
  background: "rgba(255,255,255,0.75)",
  border: "1px solid rgba(0,0,0,0.06)",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const kAffil = {
  marginTop: 6,
  fontSize: 12,
  color: "#6B7280",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const kMetaRow = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const kDate = { fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap" };

const kComment = {
  marginTop: 10,
  fontSize: 12,
  color: "#374151",
  background: "rgba(243,244,246,0.8)",
  border: "1px solid rgba(0,0,0,0.04)",
  padding: "8px 10px",
  borderRadius: 12,
  fontStyle: "italic",
  wordBreak: "break-word",
};

const kNoComment = { marginTop: 10, fontSize: 12, color: "#9CA3AF" };

const kTag = {
  position: "absolute",
  top: 10,
  right: 10,
  fontSize: 11,
  fontWeight: 900,
  color: BRAND_BLUE_1,
  background: "rgba(37,99,235,0.12)",
  border: "1px solid rgba(37,99,235,0.20)",
  padding: "2px 8px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
