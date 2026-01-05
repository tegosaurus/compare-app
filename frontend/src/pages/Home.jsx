import { Link } from 'react-router-dom';
import { Zap, CheckCircle2, TrendingUp, ArrowRight } from 'lucide-react';

const Home = () => {
  const primaryBlue = "#1e40af"; 

  return (
    <div>
      <section style={{
        textAlign: "center",
        padding: "120px 24px",
        backgroundColor: "white",
        borderBottom: "1px solid #E5E7EB",
        backgroundImage: "radial-gradient(circle at top right, #EFF6FF, transparent 40%), radial-gradient(circle at bottom left, #EFF6FF, transparent 40%)"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          
          <h1 style={{
            fontSize: "56px", fontWeight: "900", color: "#111827",
            lineHeight: "1.1", marginBottom: "24px", letterSpacing: "-1px"
          }}>
            The Professional <span style={{ color: primaryBlue }}>Academic Profile</span> Analyzer.
          </h1>
          
          <p style={{ fontSize: "20px", color: "#6B7280", maxWidth: "700px", margin: "0 auto 40px", lineHeight: "1.6" }}>
            Instantly evaluate publication quality, track advanced metrics, and analyze research impact using real-time data.
          </p>

          <Link to="/generate" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "16px 32px", backgroundColor: primaryBlue, color: "white",
            borderRadius: "10px", fontWeight: "700", fontSize: "18px",
            textDecoration: "none", boxShadow: "0 4px 12px rgba(30, 64, 175, 0.2)",
            transition: "transform 0.1s", cursor: "pointer"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Start Analyzing Now <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
             <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#111827", marginBottom: "12px" }}>Why use ComPARE?</h2>
             <p style={{ fontSize: "18px", color: "#6B7280" }}>Better insights for researchers and evaluators.</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
            <FeatureCard 
              icon={<Zap size={32} color="white" />} iconBg={primaryBlue}
              title="Lightning Fast"
              description="Generate comprehensive reports in seconds. No more manual counting or spreadsheet work."
            />
            <FeatureCard 
              icon={<CheckCircle2 size={32} color="white" />} iconBg="#059669" // Green
              title="Verified Accuracy"
              description="Data is sourced directly from live Google Scholar profiles for maximum reliability."
            />
            <FeatureCard 
              icon={<TrendingUp size={32} color="white" />} iconBg="#D97706" // Orange
              title="Smart Metrics"
              description="Go beyond the h-index with venue analysis, leadership scores, and citation patterns."
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, iconBg, title, description }) => (
  <div style={{
    padding: "32px", borderRadius: "16px", backgroundColor: "white",
    border: "1px solid #E5E7EB", boxShadow: "0 2px 4px rgba(0,0,0,0.01)",
    textAlign: "left", transition: "all 0.2s"
  }}
  onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 20px -8px rgba(0, 0, 0, 0.08)"; }}
  onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.01)"; }}
  >
    <div style={{ display: "inline-flex", padding: "12px", borderRadius: "12px", backgroundColor: iconBg, marginBottom: "20px", boxShadow: `0 4px 10px -2px ${iconBg}60` }}>
      {icon}
    </div>
    <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", marginBottom: "12px" }}>{title}</h3>
    <p style={{ fontSize: "16px", color: "#6B7280", lineHeight: "1.5" }}>{description}</p>
  </div>
);

export default Home;
