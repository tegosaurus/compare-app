import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Lock, List } from "lucide-react";

/* ---------------- Password Modal ---------------- */
function PasswordModal({ open, title, subtitle, error, loading, onConfirm, onCancel }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6 ml-11">{subtitle}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Unlock Access"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------- List Type Modal ---------------- */
function ListTypeModal({ open, value, onChange, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
                <List className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Select Data Type</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6 ml-11">
            What kind of quality list are you uploading today?
          </p>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3">
               <label className={`relative flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${value === 'journal' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input type="radio" name="listType" value="journal" onChange={onChange} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600" />
                  <div>
                      <div className="font-semibold text-slate-900">Journal List</div>
                      <div className="text-xs text-slate-500">Updates ISSN & Title rankings</div>
                  </div>
               </label>
               
               <label className={`relative flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${value === 'conference' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input type="radio" name="listType" value="conference" onChange={onChange} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600" />
                  <div>
                      <div className="font-semibold text-slate-900">Conference List</div>
                      <div className="text-xs text-slate-500">Updates Acronym & Name rankings</div>
                  </div>
               </label>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */
const REQUIRED_COLUMNS = {
  conference: ["Conference Name (DBLP)", "ERA Conference Name"],
  journal: ["Title", "Print ISSN", "E-ISSN"],
};

function normalizeHeader(h) { return String(h ?? "").trim(); }

function parseCsvHeaderLine(line) {
  const out = []; let cur = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ""));
}

async function readFirstLine(file) {
  const chunk = file.slice(0, 64 * 1024);
  const text = await chunk.text();
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const l of lines) { if (l.trim()) return l; }
  return "";
}

async function validateCsvColumns(file, listType) {
  const required = REQUIRED_COLUMNS[listType] || [];
  const firstLine = await readFirstLine(file);
  if (!firstLine) return { ok: false, error: "Could not read file header." };
  
  const uploaded = parseCsvHeaderLine(firstLine).map(normalizeHeader);
  const uploadedSet = new Set(uploaded);
  const missing = required.filter((c) => !uploadedSet.has(c));

  if (missing.length) {
    return { ok: false, error: `Missing columns: ${missing.join(", ")}`, missing, uploaded, required };
  }
  return { ok: true, uploaded, required };
}

/* ---------------- Main Component ---------------- */
export default function UploadPage() {
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [listTypeOpen, setListTypeOpen] = useState(false);
  const [selectedListType, setSelectedListType] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  const ADMIN_PASSWORD = "MDS10";
  const API_BASE_URL = "http://127.0.0.1:8000";

  function clearFileInput() { if (fileInputRef.current) fileInputRef.current.value = ""; }
  function resetFlow() { setSelectedListType(""); setListTypeOpen(false); clearFileInput(); }
  function handleUploadClick() { setPasswordError(""); setUploadError(""); setUploadSuccess(""); setPasswordOpen(true); resetFlow(); }
  
  async function handlePasswordConfirm(password) {
    if (!password) { setPasswordError("Password required."); return; }
    setPasswordLoading(true); setPasswordError("");
    await new Promise((r) => setTimeout(r, 300));
    if (password !== ADMIN_PASSWORD) { setPasswordError("Incorrect password."); setPasswordLoading(false); return; }
    setPasswordLoading(false); setPasswordOpen(false); setListTypeOpen(true);
  }

  function handlePasswordCancel() { if (passwordLoading) return; setPasswordOpen(false); setPasswordError(""); resetFlow(); }
  
  function handleListTypeChange(e) {
    const value = e.target.value; setSelectedListType(value);
    if (!value) return;
    setListTypeOpen(false);
    setTimeout(() => { fileInputRef.current?.click(); }, 0);
  }

  function handleListTypeCancel() { setListTypeOpen(false); resetFlow(); }

  async function uploadToBackend(file, listType) {
    const formData = new FormData();
    formData.append("file", file); formData.append("list_type", listType); formData.append("mode", "replace");
    const res = await fetch(`${API_BASE_URL}/upload-quality-list`, { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "Upload failed (server error).");
    return data;
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedListType) return;
    setUploadLoading(true); setUploadError(""); setUploadSuccess("");
    try {
      const name = (file.name || "").toLowerCase();
      if (!name.endsWith(".csv")) { setUploadError("Only CSV files are allowed."); resetFlow(); return; }
      
      const validation = await validateCsvColumns(file, selectedListType);
      if (!validation.ok) { setUploadError(validation.error); resetFlow(); return; }
      
      setUploadedFile({ file, type: selectedListType });
      const result = await uploadToBackend(file, selectedListType);
      setUploadSuccess(`Successfully updated ${result.rows_written} ${selectedListType} records.`);
      resetFlow();
    } catch (err) {
      setUploadError(err?.message || "Upload failed."); resetFlow();
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Tailwind CDN for styling if you don't have it installed locally */}
      <style>{`@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');`}</style>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto pt-16 px-6">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 mb-6 bg-blue-100 rounded-2xl">
            <UploadCloud className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Database Management
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">
            Upload and update the master lists for Journal and Conference quality rankings.
          </p>
        </div>

        {/* Action Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          
          {/* Status Banner Area */}
          {(uploadSuccess || uploadError) && (
            <div className={`px-6 py-4 flex items-start gap-3 ${uploadSuccess ? 'bg-green-50/80 border-b border-green-100' : 'bg-red-50/80 border-b border-red-100'}`}>
               {uploadSuccess ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
               <div>
                  <h4 className={`text-sm font-bold ${uploadSuccess ? 'text-green-800' : 'text-red-800'}`}>
                    {uploadSuccess ? "Update Complete" : "Upload Failed"}
                  </h4>
                  <p className={`text-sm mt-1 ${uploadSuccess ? 'text-green-700' : 'text-red-700'}`}>
                    {uploadSuccess || uploadError}
                  </p>
               </div>
               <button onClick={() => { setUploadSuccess(""); setUploadError(""); }} className="ml-auto text-slate-400 hover:text-slate-600">
                 <X className="w-4 h-4" />
               </button>
            </div>
          )}

          <div className="p-8 sm:p-10">
            {/* Upload Area */}
            <div 
              onClick={!uploadLoading ? handleUploadClick : undefined}
              className={`group relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${uploadLoading ? 'border-slate-200 bg-slate-50 cursor-wait' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer'}`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg transform translate-y-12 group-hover:translate-y-0 transition-transform">
                    Start Upload
                 </div>
              </div>

              <div className={`transition-all ${uploadLoading ? 'opacity-50 blur-sm' : ''}`}>
                <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                   <FileText className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                   {uploadedFile ? "Replace File" : "Click to Upload CSV"}
                </h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                   {uploadedFile 
                     ? <span className="font-mono text-slate-700 bg-slate-200 px-2 py-1 rounded">{uploadedFile.file.name}</span>
                     : "Supported files: .csv with required headers"
                   }
                </p>
              </div>

              {/* Loading Overlay */}
              {uploadLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                   <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                   <div className="text-sm font-bold text-blue-600">Processing...</div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modals */}
        <PasswordModal
          open={passwordOpen}
          title="Admin Verification"
          subtitle="This action modifies the production database. Please authenticate."
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
    </div>
  );
}