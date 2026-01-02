import React, { useEffect, useRef, useState } from "react";

const ADMIN_PASSWORD = "MDS10";

/* ---------------- Password Modal ---------------- */
function PasswordModal({ open, title, subtitle, error, onConfirm, onCancel }) {
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
            />
          </label>

          {error ? <div className="modalError">{error}</div> : null}

          <div className="modalActions">
            <button
              type="button"
              className="modalBtn modalBtnGhost"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className="modalBtn modalBtnPrimary">
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Role Card ---------------- */
function RoleCard({ role, listType, onUpdate, onDelete, onMoveToHired }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleMoveToHired() {
    setMenuOpen(false);
    if (onMoveToHired) onMoveToHired(role.id);
  }

  function handleDelete() {
    setMenuOpen(false);
    onDelete(role.id);
  }

  return (
    <div className="roleCard">
      <div className="roleHeader">
        <input
          className="roleHeaderInput"
          value={role.roleTitle}
          onChange={(e) => onUpdate(role.id, { roleTitle: e.target.value })}
        />

        <div className="menuWrap" ref={menuRef}>
          <button
            type="button"
            className="moreBtn"
            aria-label="More options"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </button>

          {menuOpen ? (
            <div className="menu">
              {listType === "required" ? (
                <button
                  type="button"
                  className="menuItem"
                  onClick={handleMoveToHired}
                >
                  move to candidate hired
                </button>
              ) : null}

              <button
                type="button"
                className="menuItem danger"
                onClick={handleDelete}
              >
                Delete role
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="roleBody">
        <label className="field">
          <div className="fieldLabel">Department</div>
          <input
            className="fieldInput"
            placeholder="Enter department"
            value={role.department}
            onChange={(e) => onUpdate(role.id, { department: e.target.value })}
          />
        </label>

        <label className="field">
          <div className="fieldLabel">Salary</div>
          <input
            className="fieldInput"
            placeholder="Enter salary"
            value={role.salary}
            onChange={(e) => onUpdate(role.id, { salary: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

/* ---------------- Role Board ---------------- */
function RoleBoard({
  requiredRoles,
  hiredRoles,
  onUpdateRole,
  onDeleteRole,
  onMoveToHired,
}) {
  return (
    <section className="board">
      <div className="column">
        <h2 className="columnTitle">Candidate required</h2>

        <div className="cardStack">
          {requiredRoles.length === 0 ? (
            <div className="emptyState">No roles yet.</div>
          ) : (
            requiredRoles.map((r) => (
              <RoleCard
                key={r.id}
                role={r}
                listType="required"
                onUpdate={(id, patch) => onUpdateRole("required", id, patch)}
                onDelete={(id) => onDeleteRole("required", id)}
                onMoveToHired={(id) => onMoveToHired(id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="column">
        <h2 className="columnTitle">Candidate hired</h2>

        <div className="cardStack">
          {hiredRoles.length === 0 ? (
            <div className="emptyState">No roles yet.</div>
          ) : (
            hiredRoles.map((r) => (
              <RoleCard
                key={r.id}
                role={r}
                listType="hired"
                onUpdate={(id, patch) => onUpdateRole("hired", id, patch)}
                onDelete={(id) => onDeleteRole("hired", id)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */
export default function UploadPage() {
  const [requiredRoles, setRequiredRoles] = useState([]);
  const [hiredRoles, setHiredRoles] = useState([]);

  // file upload refs/state
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  // password modal state
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  function handleCreateRole() {
    const newRole = {
      id: crypto.randomUUID(),
      roleTitle: "Role title",
      department: "",
      salary: "",
    };
    setRequiredRoles((prev) => [newRole, ...prev]);
  }

  function moveToHired(id) {
    const roleToMove = requiredRoles.find((r) => r.id === id);
    if (!roleToMove) return;

    setRequiredRoles((prev) => prev.filter((r) => r.id !== id));
    setHiredRoles((prev) => [roleToMove, ...prev]);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setPasswordError("");
    setPasswordOpen(true);
  }

  function clearFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePasswordConfirm(enteredPassword) {
    if (enteredPassword === ADMIN_PASSWORD) {
      setUploadedFile(pendingFile);
      setPendingFile(null);
      setPasswordOpen(false);
      setPasswordError("");
      clearFileInput();
      return;
    }

    setPasswordError("Incorrect password. Upload cancelled.");
    setUploadedFile(null);
    setPendingFile(null);
    clearFileInput();
  }

  function handlePasswordCancel() {
    setPasswordOpen(false);
    setPasswordError("");
    setPendingFile(null);
    clearFileInput();
  }

  function updateRole(listType, id, patch) {
    const updater = (roles) =>
      roles.map((r) => (r.id === id ? { ...r, ...patch } : r));

    if (listType === "required") setRequiredRoles(updater);
    if (listType === "hired") setHiredRoles(updater);
  }

  function deleteRole(listType, id) {
    if (listType === "required")
      setRequiredRoles((prev) => prev.filter((r) => r.id !== id));
    if (listType === "hired")
      setHiredRoles((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <>
      <style>{styles}</style>

      <div className="uploadPageWrap">
        <div className="headerRow">
          <div>
            <div className="label">Upload Page</div>
            <h1 className="pageTitle">Faculty Quality Upload</h1>
            <div className="pageSub">
              Create roles, move candidates, and upload the faculty quality list
              (password protected).
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="btn btnSecondary" onClick={handleCreateRole}>
            Create role
          </button>

          <button className="btn btnPrimary" onClick={handleUploadClick}>
            Upload faculty quality list
          </button>

          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.txt"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {uploadedFile ? (
            <div className="uploadHint">
              ✅ Uploaded: <span className="fileName">{uploadedFile.name}</span>
            </div>
          ) : (
            <div className="uploadHint">
              {passwordError ? (
                <span className="errorText">{passwordError}</span>
              ) : (
                <span className="mutedHint">No file uploaded yet.</span>
              )}
            </div>
          )}
        </div>

        <RoleBoard
          requiredRoles={requiredRoles}
          hiredRoles={hiredRoles}
          onUpdateRole={updateRole}
          onDeleteRole={deleteRole}
          onMoveToHired={moveToHired}
        />

        <PasswordModal
          open={passwordOpen}
          title="Admin Password Required"
          subtitle="Enter the admin password to upload this file."
          error={passwordError}
          onConfirm={handlePasswordConfirm}
          onCancel={handlePasswordCancel}
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

.uploadPageWrap{
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 18px 60px;
}

.headerRow { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
.label { font-size: 14px; color: var(--muted); margin-bottom: 6px; }
.pageTitle { margin: 0; font-size: 44px; font-weight: 800; color: #111827; letter-spacing: -0.03em; }
.pageSub { margin-top: 8px; color: #6B7280; max-width: 760px; line-height: 1.6; }

.actions {
  margin-top: 18px;
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
  transition: transform 0.05s ease, opacity 0.2s ease;
}
.btn:active { transform: translateY(1px); }
.btnPrimary { background: var(--blue); color: white; }
.btnSecondary { background: #e8edf3; color: #2a2f36; }
.btn:hover { opacity: 0.92; }

.uploadHint { font-size: 13px; color: var(--muted); }
.fileName { color: var(--text); font-weight: 600; }
.errorText { color: #b42318; font-weight: 700; }
.mutedHint { color: #9CA3AF; }

/* RoleBoard.css */
.board {
  margin-top: 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: start;
}
.columnTitle {
  font-size: 18px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 14px 0;
}
.cardStack { display: flex; flex-direction: column; gap: 16px; }

/* RoleCard.css */
.roleCard {
  width: 320px;
  border-radius: 14px;
  border: 1px solid #cfd9e3;
  background: white;
  overflow: hidden;
}
.roleHeader {
  background: #6fb7d4;
  color: white;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.roleHeaderInput {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: white;
  font-size: 13px;
  font-weight: 600;
}
.menuWrap { position: relative; display: flex; align-items: center; }
.moreBtn {
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  gap: 3px;
  align-items: center;
  padding: 6px;
}
.dot { width: 4px; height: 4px; background: white; border-radius: 999px; display: inline-block; }

.menu {
  position: absolute;
  right: 0;
  top: 34px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  min-width: 140px;
  padding: 6px;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.08);
  z-index: 50;
}
.menuItem {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.menuItem:hover { background: #f3f4f6; }
.menuItem.danger { color: #b42318; }

.roleBody {
  padding: 14px 14px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.fieldLabel { font-size: 12px; color: #6b7280; }
.fieldInput {
  border: 1px solid #cfd9e3;
  outline: none;
  border-radius: 10px;
  padding: 10px 10px;
  font-size: 13px;
}
.fieldInput:focus {
  border-color: #6fb7d4;
  box-shadow: 0 0 0 3px rgba(111, 183, 212, 0.18);
}
.emptyState {
  width: 320px;
  padding: 14px;
  border-radius: 14px;
  border: 1px dashed #cfd9e3;
  color: #6b7280;
  font-size: 13px;
}

/* PasswordModal.css */
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
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 38px rgba(0, 0, 0, 0.2);
  padding: 18px 18px 16px 18px;
}
.modalTitle { margin: 0; font-size: 18px; font-weight: 800; color: #111827; }
.modalSubtitle { margin: 8px 0 16px 0; font-size: 13px; color: #6b7280; }
.modalForm { display: flex; flex-direction: column; gap: 12px; }
.modalLabel { font-size: 12px; color: #6b7280; display: flex; flex-direction: column; gap: 8px; }
.modalInput {
  border: 1px solid #cfd9e3;
  outline: none;
  border-radius: 12px;
  padding: 12px 12px;
  font-size: 14px;
}
.modalInput:focus {
  border-color: #6fb7d4;
  box-shadow: 0 0 0 3px rgba(111, 183, 212, 0.18);
}
.modalError {
  font-size: 13px;
  color: #b42318;
  background: #fff1f1;
  border: 1px solid #ffd1d1;
  padding: 10px 12px;
  border-radius: 12px;
}
.modalActions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modalBtn { border: none; cursor: pointer; padding: 10px 14px; border-radius: 12px; font-size: 13px; }
.modalBtnPrimary { background: #4aa2c9; color: white; }
.modalBtnGhost { background: #eef2f7; color: #111827; }
`;
