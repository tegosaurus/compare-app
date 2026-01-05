import React, { useEffect, useRef, useState } from "react";

/* ---------------- Password Modal ---------------- */
function PasswordModal({
  open,
  title,
  subtitle,
  error,
  loading,
  onConfirm,
  onCancel,
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm(password);
  }

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard">
        <h3 className="modalTitle">{title}</h3>
        <p className="modalSubtitle">{subtitle}</p>

        <form onSubmit={handleSubmit} className="modalForm">
          <label className="modalLabel">
            Password
            <input
              className="modalInput"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={loading}
            />
          </label>

          {error ? <div className="modalError">{error}</div> : null}

          <div className="modalActions">
            <button
              type="button"
              className="modalBtn modalBtnGhost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modalBtn modalBtnPrimary"
              disabled={loading}
            >
              {loading ? "Checking..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- List Type Modal ---------------- */
function ListTypeModal({ open, value, onChange, onCancel }) {
  if (!open) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modalCard">
        <h3 className="modalTitle">Choose list type</h3>
        <p className="modalSubtitle">
          Select what you are uploading before choosing the file.
        </p>

        <div className="modalForm">
          <label className="modalLabel">
            List type
            <select className="modalSelect" value={value} onChange={onChange}>
              <option value="">Select…</option>
              <option value="journal">Journal list</option>
              <option value="conference">Conference list</option>
            </select>
          </label>

          <div className="modalActions">
            <button
              type="button"
              className="modalBtn modalBtnGhost"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function UploadPage() {
  const fileInputRef = useRef(null);

  const [uploadedFile, setUploadedFile] = useState(null); // { file, type }
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [listTypeOpen, setListTypeOpen] = useState(false);
  const [selectedListType, setSelectedListType] = useState("");

  // ✅ Change this if your FastAPI runs elsewhere (deployed URL)
  const API_BASE_URL = "http://127.0.0.1:8000";

  function clearFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetFlow() {
    setSelectedListType("");
    setListTypeOpen(false);
    clearFileInput();
  }

  function handleUploadClick() {
    setPasswordError("");
    setPasswordOpen(true);
    resetFlow();
  }

  // password via FastAPI 
  async function handlePasswordConfirm(password) {
    if (!password) {
      setPasswordError("Password required.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");

    try {
      const res = await fetch(`${API_BASE_URL}/verify-admin-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      // Server responded but with an error code
      if (!res.ok) {
        setPasswordError("Could not verify password. (Server error)");
        return;
      }

      // Response in JSON
      const data = await res.json();

      if (!data?.ok) {
        setPasswordError("Incorrect password.");
        return;
      }

      // correct password
      setPasswordOpen(false);
      setListTypeOpen(true);
    } catch (e) {
      // Network error / backend down / CORS blocked
      setPasswordError("Could not verify password. Is the backend running?");
    } finally {
      setPasswordLoading(false);
    }
  }

  function handlePasswordCancel() {
    if (passwordLoading) return; // prevent cancel while checking
    setPasswordOpen(false);
    setPasswordError("");
    resetFlow();
  }

  function handleListTypeChange(e) {
    const value = e.target.value;
    setSelectedListType(value);

    if (!value) return;

    setListTypeOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  }

  function handleListTypeCancel() {
    setListTypeOpen(false);
    resetFlow();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedListType) return;

    setUploadedFile({ file, type: selectedListType });
    resetFlow();
  }

  return (
    <>
      <style>{styles}</style>

      <div className="uploadPageWrap">
        <div className="headerRow">
          <div>
            <div className="label">Upload</div>
            <h1 className="pageTitle">Faculty Quality Upload</h1>
            <div className="pageSub"></div>
          </div>
        </div>

        <div className="actions">
          <button className="btn btnPrimary" onClick={handleUploadClick}>
            Upload faculty quality list
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.txt"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {uploadedFile ? (
            <div className="uploadHint">
              Uploaded ({uploadedFile.type}):{" "}
              <span className="fileName">{uploadedFile.file.name}</span>
            </div>
          ) : (
            <div className="uploadHint">
              <span className="mutedHint">No file uploaded yet.</span>
            </div>
          )}
        </div>

        <PasswordModal
          open={passwordOpen}
          title="Admin Password Required"
          subtitle="Enter the admin password to continue."
          error={passwordError}
          loading={passwordLoading}
          onConfirm={handlePasswordConfirm}
          onCancel={handlePasswordCancel}
        />

        <ListTypeModal
          open={listTypeOpen}
          value={selectedListType}
          onChange={handleListTypeChange}
          onCancel={handleListTypeCancel}
        />
      </div>
    </>
  );
}

const styles = `
:root {
  --blue: #4aa2c9;
  --text: #1f2937;
  --muted: #6b7280;
}

.uploadPageWrap {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 18px 60px;
}

.headerRow {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.label {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 6px;
}

.pageTitle {
  margin: 0;
  font-size: 44px;
  font-weight: 800;
  color: #111827;
}

.pageSub {
  margin-top: 8px;
  color: #6B7280;
  max-width: 760px;
  line-height: 1.6;
}

.actions {
  margin-top: 24px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.btnPrimary {
  background: var(--blue);
  color: white;
}

.uploadHint {
  font-size: 13px;
  color: var(--muted);
}

.fileName {
  color: var(--text);
  font-weight: 600;
}

.mutedHint {
  color: #9CA3AF;
}

/* Modals */
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 999;
  padding: 18px;
}

.modalCard {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 18px;
}

.modalTitle {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.modalSubtitle {
  margin: 8px 0 16px 0;
  font-size: 13px;
  color: #6b7280;
}

.modalForm {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modalLabel {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modalInput,
.modalSelect {
  border: 1px solid #cfd9e3;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
}

.modalActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modalBtn {
  border: none;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
}

.modalBtnPrimary {
  background: var(--blue);
  color: white;
}

.modalBtnGhost {
  background: #eef2f7;
}

.modalError {
  font-size: 13px;
  color: #b42318;
  background: #fff1f1;
  border: 1px solid #ffd1d1;
  padding: 10px;
  border-radius: 12px;
}
`;
