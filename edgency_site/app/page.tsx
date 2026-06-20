import type { FC } from "react";

const APK_URL = "https://drive.google.com/file/d/142-YFfEtBJtNGv2hMELRxU5OnX2vZ9lk/view?usp=drive_link";
const DEMO_URL = "https://youtu.be/86TxAm9-0_o";
const GITHUB_URL = "https://github.com/NatX223/Edgency";

const CATEGORIES = [
  {
    icon: "🩺",
    title: "Medical",
    desc: "Cardiac arrest, trauma, seizures, severe bleeding",
    accent: "coral",
    model: "MedPsy 1.7B",
  },
  {
    icon: "🌍",
    title: "Earthquake",
    desc: "Landslides, tremors, structural collapse, rescue",
    accent: "indigo",
    model: "Gemma 4 2B",
  },
  {
    icon: "🌊",
    title: "Flood",
    desc: "Tsunamis, flash floods, water rescue, evacuation",
    accent: "indigo",
    model: "Gemma 4 2B",
  },
  {
    icon: "⛈️",
    title: "Storm",
    desc: "Tornadoes, heavy winds, lightning, shelter-in-place",
    accent: "indigo",
    model: "Gemma 4 2B",
  },
];

const FEATURES = [
  {
    icon: "📡",
    title: "Fully Offline",
    desc: "AI runs on your phone's GPU. No internet, no servers, no API keys. Works when cell towers fail.",
  },
  {
    icon: "🎙️",
    title: "Voice & Vision",
    desc: "Describe emergencies by voice or share scene photos. On-device Whisper transcribes speech; Gemma 4 analyzes images.",
  },
  {
    icon: "📋",
    title: "Protocol-Grounded",
    desc: "Responses grounded in WHO prehospital protocols and FEMA disaster guidelines via on-device RAG.",
  },
  {
    icon: "🧠",
    title: "Role-Adaptive",
    desc: "Adapts to your profile — civilian or first responder — with awareness of your medical history and experience level.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Set your profile",
    desc: "Tell Edgency your role, experience level, and medical conditions. Stored on-device only, never uploaded.",
  },
  {
    n: "02",
    title: "Pick your emergency",
    desc: "Select Medical, Earthquake, Flood, or Storm. The right AI model and protocol database activates instantly.",
  },
  {
    n: "03",
    title: "Get real guidance",
    desc: "Chat by text, voice, or camera. Edgency streams step-by-step instructions grounded in emergency protocols.",
  },
];

const TECH = [
  "Expo 54 / React Native",
  "QVAC SDK 0.12",
  "MedPsy 1.7B",
  "Gemma 4 2B Multimodal",
  "Whisper Tiny ASR",
  "llama.cpp",
  "SQLite",
  "RAG + Embeddings",
];

// ─── Nav ──────────────────────────────────────────────────────────────────────
const Nav: FC = () => (
  <nav style={{
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    backgroundColor: "rgba(19,19,19,0.85)",
  }}>
    <div style={{
      maxWidth: 1120, margin: "0 auto", padding: "0 24px",
      height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22, color: "#ff7e5f" }}>✳</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: "#ff7e5f", letterSpacing: "-0.02em" }}>
          Edgency
        </span>
      </div>
      <a href={APK_URL} target="_blank" rel="noopener noreferrer" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        backgroundColor: "#ff7e5f", color: "#3d0700",
        fontWeight: 600, fontSize: 14, padding: "8px 18px",
        borderRadius: 999, textDecoration: "none",
      }}>
        Download APK
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 17V3M7 12l5 5 5-5M3 21h18" />
        </svg>
      </a>
    </div>
  </nav>
);

// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero: FC = () => (
  <section style={{ position: "relative", overflow: "hidden", paddingTop: 160, paddingBottom: 120, textAlign: "center" }}>
    {/* Coral orb */}
    <div style={{
      position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
      width: 700, height: 700, borderRadius: "50%", pointerEvents: "none",
      background: "radial-gradient(circle, rgba(255,126,95,0.13) 0%, transparent 70%)",
    }} />
    {/* Indigo orb */}
    <div style={{
      position: "absolute", top: 80, left: "62%",
      width: 380, height: 380, borderRadius: "50%", pointerEvents: "none",
      background: "radial-gradient(circle, rgba(197,192,255,0.07) 0%, transparent 70%)",
    }} />

    <div style={{ maxWidth: 740, margin: "0 auto", padding: "0 24px", position: "relative" }}>
      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,126,95,0.1)", border: "1px solid rgba(255,126,95,0.22)",
        borderRadius: 999, padding: "5px 14px", marginBottom: 32,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#ff7e5f", display: "inline-block" }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "#ffb4a3" }}>On-Device AI · No Cloud Required</span>
      </div>

      <h1 style={{
        fontSize: "clamp(44px, 8.5vw, 84px)",
        fontWeight: 700, lineHeight: 1.04,
        letterSpacing: "-0.03em", color: "#e5e2e1",
        marginBottom: 24,
      }}>
        Emergency AI.<br />
        <span style={{ color: "#ff7e5f" }}>On‑Device.</span><br />
        Always Ready.
      </h1>

      <p style={{
        fontSize: "clamp(16px, 2.5vw, 19px)",
        color: "#dec0b9", lineHeight: 1.65,
        maxWidth: 540, margin: "0 auto 48px",
      }}>
        Real-time guidance for civilians and first responders — powered entirely by on-device AI.
        Works when cell towers are down. No internet. No server. No compromise.
      </p>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <a href={APK_URL} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          backgroundColor: "#ff7e5f", color: "#3d0700",
          fontWeight: 700, fontSize: 16, padding: "14px 28px",
          borderRadius: 14, textDecoration: "none",
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17V3M7 12l5 5 5-5M3 21h18" />
          </svg>
          Download for Android
        </a>
        <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#e5e2e1", fontWeight: 600, fontSize: 16, padding: "14px 28px",
          borderRadius: 14, textDecoration: "none",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Watch Demo
        </a>
      </div>
    </div>
  </section>
);

// ─── Trust strip ──────────────────────────────────────────────────────────────
const TRUST = [
  { icon: "📶", label: "Works Offline" },
  { icon: "🔒", label: "Private by Design" },
  { icon: "⚡", label: "GPU-Accelerated" },
  { icon: "📚", label: "WHO & FEMA Protocols" },
];

const TrustStrip: FC = () => (
  <div style={{
    borderTop: "1px solid rgba(255,255,255,0.06)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backgroundColor: "rgba(32,31,31,0.6)", padding: "20px 24px",
  }}>
    <div style={{
      maxWidth: 900, margin: "0 auto",
      display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "14px 48px",
    }}>
      {TRUST.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 17 }}>{item.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#dec0b9" }}>{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Section heading helper ───────────────────────────────────────────────────
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 56 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#ff7e5f", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
        {eyebrow}
      </p>
      <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#e5e2e1", marginBottom: sub ? 14 : 0 }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 16, color: "#dec0b9", maxWidth: 480, margin: "0 auto" }}>{sub}</p>}
    </div>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────
const Categories: FC = () => (
  <section style={{ maxWidth: 1120, margin: "0 auto", padding: "100px 24px" }}>
    <SectionHead
      eyebrow="Emergency Coverage"
      title="Handles Every Emergency"
      sub="Four specialist configurations, each routing to the right AI model and protocol database."
    />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
      {CATEGORIES.map((cat) => {
        const isC = cat.accent === "coral";
        return (
          <div key={cat.title} style={{
            backgroundColor: "#201f1f",
            border: `1px solid ${isC ? "rgba(255,126,95,0.22)" : "rgba(197,192,255,0.12)"}`,
            borderRadius: 24, padding: "28px 24px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, fontSize: 22,
              backgroundColor: isC ? "rgba(255,126,95,0.12)" : "rgba(197,192,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {cat.icon}
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e5e2e1", marginBottom: 4 }}>{cat.title}</h3>
              <p style={{ fontSize: 14, color: "#9ba1a6", lineHeight: 1.55, marginBottom: 12 }}>{cat.desc}</p>
            </div>
            <span style={{
              marginTop: "auto", display: "inline-flex", alignSelf: "flex-start",
              fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
              color: isC ? "#ffb4a3" : "#c5c0ff",
              backgroundColor: isC ? "rgba(255,126,95,0.1)" : "rgba(197,192,255,0.08)",
            }}>
              {cat.model}
            </span>
          </div>
        );
      })}
    </div>
  </section>
);

// ─── How it works ─────────────────────────────────────────────────────────────
const HowItWorks: FC = () => (
  <section style={{
    background: "linear-gradient(180deg, #131313 0%, #1a1818 50%, #131313 100%)",
    padding: "100px 24px",
  }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <SectionHead eyebrow="How It Works" title="From panic to protocol in seconds" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
        {STEPS.map((step, i) => (
          <div key={step.n} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: "#ff7e5f", letterSpacing: "0.06em",
                backgroundColor: "rgba(255,126,95,0.1)", padding: "3px 8px", borderRadius: 6,
              }}>
                {step.n}
              </span>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 1,
                  background: "linear-gradient(90deg, rgba(255,126,95,0.3), rgba(255,255,255,0.03))",
                }} />
              )}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#e5e2e1" }}>{step.title}</h3>
            <p style={{ fontSize: 14, color: "#9ba1a6", lineHeight: 1.65 }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Features ─────────────────────────────────────────────────────────────────
const Features: FC = () => (
  <section style={{ maxWidth: 1120, margin: "0 auto", padding: "100px 24px" }}>
    <SectionHead eyebrow="Built Different" title="AI that works when nothing else does" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
      {FEATURES.map((f) => (
        <div key={f.title} style={{
          backgroundColor: "#201f1f",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 24, padding: "28px 24px",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, fontSize: 20, marginBottom: 16,
            backgroundColor: "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {f.icon}
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "#e5e2e1", marginBottom: 8 }}>{f.title}</h3>
          <p style={{ fontSize: 14, color: "#9ba1a6", lineHeight: 1.65 }}>{f.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

// ─── Tech strip ───────────────────────────────────────────────────────────────
const TechStrip: FC = () => (
  <div style={{
    borderTop: "1px solid rgba(255,255,255,0.06)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    padding: "28px 24px", backgroundColor: "#0e0e0e",
  }}>
    <p style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#57423d", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
      Powered by
    </p>
    <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "10px 12px", justifyContent: "center" }}>
      {TECH.map((t) => (
        <span key={t} style={{
          fontSize: 13, fontWeight: 500, color: "#9ba1a6",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "5px 12px", borderRadius: 8,
        }}>
          {t}
        </span>
      ))}
    </div>
  </div>
);

// ─── Download CTA ─────────────────────────────────────────────────────────────
const DownloadCTA: FC = () => (
  <section style={{ padding: "120px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
    <div style={{
      position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)",
      width: 600, height: 600, borderRadius: "50%", pointerEvents: "none",
      background: "radial-gradient(circle, rgba(255,126,95,0.1) 0%, transparent 70%)",
    }} />
    <div style={{ maxWidth: 600, margin: "0 auto", position: "relative" }}>
      <span style={{ fontSize: 52, display: "block", marginBottom: 24, color: "#ff7e5f" }}>✳</span>
      <h2 style={{
        fontSize: "clamp(32px, 5vw, 52px)",
        fontWeight: 700, letterSpacing: "-0.03em",
        color: "#e5e2e1", marginBottom: 16,
      }}>
        Ready when disaster isn&apos;t.
      </h2>
      <p style={{ fontSize: 17, color: "#dec0b9", marginBottom: 40, lineHeight: 1.65, maxWidth: 480, margin: "0 auto 40px" }}>
        Download Edgency for free. Set up your profile once, and the AI is ready —
        even with zero signal.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <a href={APK_URL} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          backgroundColor: "#ff7e5f", color: "#3d0700",
          fontWeight: 700, fontSize: 16, padding: "16px 32px",
          borderRadius: 16, textDecoration: "none",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17V3M7 12l5 5 5-5M3 21h18" />
          </svg>
          Download APK · Android
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#e5e2e1", fontWeight: 600, fontSize: 16, padding: "16px 28px",
          borderRadius: 16, textDecoration: "none",
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          View on GitHub
        </a>
      </div>
      <p style={{ fontSize: 13, color: "#57423d", marginTop: 24 }}>
        Android only · Enable &quot;Install unknown apps&quot; in settings after downloading
      </p>
    </div>
  </section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer: FC = () => (
  <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px" }}>
    <div style={{
      maxWidth: 1120, margin: "0 auto",
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18, color: "#ff7e5f" }}>✳</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#9ba1a6" }}>Edgency</span>
        <span style={{ fontSize: 13, color: "#57423d", marginLeft: 4 }}>· MIT License</span>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {[
          { label: "Demo Video", href: DEMO_URL, external: true },
          { label: "GitHub", href: GITHUB_URL, external: true },
          { label: "Download APK", href: APK_URL, external: true },
        ].map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.external ? "_blank" : undefined}
            rel={l.external ? "noopener noreferrer" : undefined}
            style={{ fontSize: 13, color: "#9ba1a6", textDecoration: "none" }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  </footer>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <>
      <Nav />
      <main style={{ paddingTop: 64 }}>
        <Hero />
        <TrustStrip />
        <Categories />
        <HowItWorks />
        <Features />
        <TechStrip />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  );
}
