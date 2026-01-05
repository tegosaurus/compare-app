import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FileText, Bookmark, Boxes, UploadCloud, GitCompare } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const primaryBlue = "#1e40af"; 

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      
      {/* --- HEADER --- */}
      <header style={{
        height: "72px",
        display: "flex",
        alignItems: "center",
        padding: "0 32px", 
        backgroundColor: "white",
        borderBottom: "1px solid #E5E7EB",
        position: "sticky", top: 0, zIndex: 100
      }}>
        
        {/* Logo Section */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px", marginRight: "40px" }}>
          <div style={{ 
            padding: "8px", backgroundColor: primaryBlue, borderRadius: "8px", 
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 5px rgba(30, 64, 175, 0.3)" 
          }}>
            <Boxes size={20} color="white" />
          </div>
          <span style={{ fontSize: "20px", fontWeight: "800", color: "#111827", letterSpacing: "-0.5px" }}>
            ComPARE
          </span>
        </Link>

        <nav style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <NavLink 
            to="/generate" 
            icon={<FileText size={18} />} 
            text="Generate Report" 
            active={location.pathname === '/generate'} 
            color={primaryBlue} 
          />
          <NavLink 
            to="/history" 
            icon={<Bookmark size={18} />} 
            text="Saved" 
            active={location.pathname === '/history'} 
            color={primaryBlue} 
          />
          <NavLink 
            to="/analyze" 
            icon={<GitCompare size={18} />} 
            text="Compare" 
            active={location.pathname === '/analyze'} 
            color={primaryBlue} 
          />
        </nav>

        <div style={{ flex: 1 }} />

        <nav>
          <NavLink 
            to="/upload" 
            icon={<UploadCloud size={18} />} 
            text="Upload Quality Lists" 
            active={location.pathname === '/upload'} 
            color={primaryBlue} 
          />
        </nav>

      </header>

      {/* --- MAIN CONTENT --- */}
      <main style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <Outlet />
      </main>

    </div>
  );
};

// --- NAV LINK COMPONENT ---
const NavLink = ({ to, icon, text, active, color }) => {
  const [isHover, setIsHover] = useState(false);
  
  return (
    <Link 
      to={to} 
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        textDecoration: "none",
        color: active ? color : (isHover ? "#111827" : "#4B5563"), 
        fontWeight: active ? "600" : "500",
        fontSize: "14px",
        padding: "8px 16px", 
        borderRadius: "8px",
        backgroundColor: active ? "#EFF6FF" : (isHover ? "#F3F4F6" : "transparent"),
        transition: "all 0.15s ease-out",
      }}
    >
      <span style={{ opacity: active || isHover ? 1 : 0.7 }}>{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

export default Layout;
