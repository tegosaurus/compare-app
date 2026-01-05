import { useEffect, useState } from "react";
import { Star, Users, TrendingUp, FileText } from "lucide-react";

export default function AnalyzeCompare() {
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState([null, null]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("compare_history") || "[]");
    setHistory(saved);
    setCompare([saved[0] || null, saved[1] || null]);
  }, []);

  const handleSelect = (index, id) => {
    const selected = history.find((h) => h.id === id) || null;
    const next = [...compare];
    next[index] = selected;
    setCompare(next);
  };

  return (
    <div style={page}>
      <h2 style={title}>Compare Authors</h2>

      {/* Selectors */}
      <div style={selectors}>
        {[0, 1].map((i) => (
          <select
            key={i}
            value={compare[i]?.id || ""}
            onChange={(e) => handleSelect(i, e.target.value)}
            style={select}
          >
            <option value="">Select author…</option>
            {history.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* Cards */}
      <div style={compareGrid}>
        {compare.map((author, i) => (
          <div key={i} style={heroCard}>
            {author ? (
              <>
                <h3 style={name}>{author.name}</h3>
                <div style={affiliation}>
                  {author.affiliations || "No affiliation"}
                </div>

                <div style={metrics}>
                  <Metric label="Total Citations" value={author.total_c} />
                  <Metric label="H-Index" value={author.h_index} />
                  <Metric label="Rating" value={author.userRating} />
                  <Metric
                    label="Comment"
                    value={author.userComment || "—"}
                    wide
                  />
                </div>
              </>
            ) : (
              <div style={empty}>Select an author</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const page = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 24,
};

const title = {
  fontWeight: 900,
  marginBottom: 20,
};

const selectors = {
  display: "flex",
  gap: 16,
  marginBottom: 28,
};

const select = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid #CBD5F5",
  background: "#F8FAFF",
  fontWeight: 700,
};

const compareGrid = {
  display: "flex",
  gap: 20,
  flexWrap: "wrap",
};

/* 🔥 History-style Hero Card */
const heroCard = {
  flex: 1,
  minWidth: 320,
  padding: 24,
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(236,242,255,1), rgba(250,250,255,1))",
  border: "1px solid rgba(199,210,254,0.6)",
  boxShadow: "0 8px 24px rgba(99,102,241,0.08)",
};

const name = {
  fontWeight: 900,
  fontSize: 20,
};

const affiliation = {
  color: "#6366F1",
  fontWeight: 600,
  marginBottom: 18,
};

const metrics = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const empty = {
  height: 160,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94A3B8",
  fontStyle: "italic",
};

function Metric({ label, value, wide }) {
  return (
    <div
      style={{
        gridColumn: wide ? "span 2" : "auto",
        padding: 14,
        borderRadius: 14,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(239,246,255,0.8))",
        border: "1px solid rgba(199,210,254,0.6)",
      }}
    >
      <div style={{ fontWeight: 700, color: "#4F46E5" }}>{label}</div>
      <div style={{ marginTop: 6 }}>{value ?? 0}</div>
    </div>
  );
}