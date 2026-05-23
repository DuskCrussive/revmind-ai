import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are RevMind AI — the ultimate AI automotive expert and personal mechanic. You are knowledgeable, friendly, and passionate about cars. Your personality is like a seasoned master mechanic who loves talking cars with everyone from first-time car owners to gearheads.

You help with:
- Diagnosing car problems (sounds, warning lights, symptoms, error codes like OBD-II codes)
- Maintenance schedules and recommendations
- Repair guides and DIY advice with step-by-step instructions
- Buying advice for new or used vehicles
- Latest automotive news, EV trends, new model releases, recalls
- Performance upgrades and modifications
- Tire, brake, oil, and fluid recommendations
- Understanding dashboard warning lights
- Cost estimates for repairs

Speak conversationally but with authority. Use car terminology naturally. When diagnosing, ask clarifying questions like a real mechanic would (year/make/model, mileage, when it started, etc.). Be encouraging to beginners. For safety-critical issues, always recommend seeing a professional mechanic.

Format responses clearly. Use bullet points or numbered steps when helpful. Keep responses focused and practical.`;

const SUGGESTED_QUESTIONS = [
  "My check engine light is on — what should I do?",
  "What does a knocking sound from my engine mean?",
  "How often should I really change my oil?",
  "What are the best EVs to buy in 2026?",
  "My car pulls to the left when braking — why?",
  "Latest automotive news this week?",
];

const CAR_ICON = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
  </svg>
);

const WRENCH_ICON = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
  </svg>
);

const SEND_ICON = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const SPARK_ICON = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
  </svg>
);

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#FF6B1A",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10,
      alignItems: "flex-start",
      marginBottom: 18,
    }}>
      {!isUser && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #FF6B1A, #FF3D00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: "0 2px 12px rgba(255,107,26,0.4)",
        }}>
          <CAR_ICON />
        </div>
      )}
      <div style={{
        maxWidth: "75%",
        background: isUser
          ? "linear-gradient(135deg, #1a1a2e, #16213e)"
          : "rgba(255,255,255,0.04)",
        border: isUser ? "1px solid rgba(255,107,26,0.3)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
        padding: "12px 16px",
        color: "#e8e8e8",
        fontSize: 14,
        lineHeight: 1.65,
        whiteSpace: "pre-wrap",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function RevMindAI() {
  const [view, setView] = useState("home"); // home | chat | news
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsContent, setNewsContent] = useState("");
  const [newsLoaded, setNewsLoaded] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages,
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, I couldn't get a response.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: "⚠️ Engine stalled — connection issue. Try again!" }]);
    }
    setLoading(false);
  };

  const loadNews = async () => {
    if (newsLoaded) return;
    setNewsLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: "Give me the top 6 automotive news stories and trends for 2026. Include EV updates, new model releases, tech innovations, and industry news. Format each as: HEADLINE | Brief 2-sentence summary. Separate each with a line break.",
          }],
          system: SYSTEM_PROMPT,
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setNewsContent(text);
      setNewsLoaded(true);
    } catch {
      setNewsContent("⚠️ Could not load news. Check connection.");
    }
    setNewsLoading(false);
  };

  const handleNewsTab = () => {
    setView("news");
    loadNews();
  };

  const startChat = (prompt) => {
    setView("chat");
    if (prompt) setTimeout(() => sendMessage(prompt), 100);
  };

  const newsItems = newsContent.split("\n").filter(l => l.trim() && l.includes("|")).map(line => {
    const [headline, ...rest] = line.split("|");
    return { headline: headline.trim(), summary: rest.join("|").trim() };
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      fontFamily: "'IBM Plex Mono', monospace",
      color: "#e8e8e8",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(255,107,26,0.3)} 50%{box-shadow:0 0 40px rgba(255,107,26,0.6)} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .nav-btn { background: none; border: none; cursor: pointer; color: #888; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.1em; padding: 8px 14px; border-radius: 6px; transition: all 0.2s; text-transform: uppercase; }
        .nav-btn:hover { color: #FF6B1A; }
        .nav-btn.active { color: #FF6B1A; background: rgba(255,107,26,0.1); }
        .suggest-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #ccc; padding: 10px 14px; border-radius: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s; text-align: left; line-height: 1.4; }
        .suggest-btn:hover { background: rgba(255,107,26,0.1); border-color: rgba(255,107,26,0.4); color: #FF6B1A; transform: translateY(-1px); }
        .send-btn { background: linear-gradient(135deg, #FF6B1A, #FF3D00); border: none; color: white; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 16px rgba(255,107,26,0.5); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .chat-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e8e8e8; padding: 12px 16px; border-radius: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; outline: none; resize: none; height: 42px; line-height: 1.2; }
        .chat-input:focus { border-color: rgba(255,107,26,0.5); background: rgba(255,255,255,0.07); }
        .chat-input::placeholder { color: #555; }
        .hero-cta { background: linear-gradient(135deg, #FF6B1A, #FF3D00); border: none; color: white; padding: 14px 32px; border-radius: 12px; font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s; animation: glow 3s ease-in-out infinite; }
        .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(255,107,26,0.6); }
        .news-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; animation: slideUp 0.4s ease both; transition: all 0.2s; cursor: pointer; }
        .news-card:hover { background: rgba(255,107,26,0.07); border-color: rgba(255,107,26,0.3); transform: translateY(-2px); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,107,26,0.3); border-radius: 2px; }
      `}</style>

      {/* TOP NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,10,15,0.95)", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("home")}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, #FF6B1A, #FF3D00)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CAR_ICON />
          </div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: "0.05em" }}>
            REV<span style={{ color: "#FF6B1A" }}>MIND</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>Home</button>
          <button className={`nav-btn ${view === "chat" ? "active" : ""}`} onClick={() => setView("chat")}>Diagnose</button>
          <button className={`nav-btn ${view === "news" ? "active" : ""}`} onClick={handleNewsTab}>News</button>
        </div>
      </nav>

      {/* HOME VIEW */}
      {view === "home" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Hero */}
          <div style={{
            padding: "60px 24px 40px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 50% 0%, rgba(255,107,26,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,107,26,0.1)", border: "1px solid rgba(255,107,26,0.3)",
              borderRadius: 20, padding: "5px 14px", marginBottom: 24,
            }}>
              <SPARK_ICON />
              <span style={{ fontSize: 11, color: "#FF6B1A", letterSpacing: "0.15em", textTransform: "uppercase" }}>AI-Powered Mechanic</span>
            </div>
            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "clamp(52px, 10vw, 88px)",
              fontWeight: 900, lineHeight: 0.9,
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}>
              YOUR CAR.<br />
              <span style={{ color: "#FF6B1A", WebkitTextStroke: "0px" }}>FULLY UNDERSTOOD.</span>
            </h1>
            <p style={{ color: "#888", fontSize: 14, maxWidth: 420, margin: "0 auto 32px", lineHeight: 1.7 }}>
              RevMind AI is your 24/7 master mechanic — diagnose problems, get repair guidance, track automotive news, and talk cars with an AI that actually knows what it's doing.
            </p>
            <button className="hero-cta" onClick={() => startChat("")}>
              START DIAGNOSING →
            </button>
          </div>

          {/* Feature Pills */}
          <div style={{ display: "flex", gap: 10, padding: "0 24px 32px", flexWrap: "wrap", justifyContent: "center" }}>
            {["🔧 Repair Guides", "🚨 Warning Lights", "⚡ EV Advice", "🏎️ Mods & Upgrades", "📰 Auto News", "💰 Cost Estimates"].map((f, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#aaa",
              }}>{f}</div>
            ))}
          </div>

          {/* Suggested Questions */}
          <div style={{ padding: "0 24px 40px" }}>
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <p style={{ fontSize: 11, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>Try asking...</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} className="suggest-btn" onClick={() => startChat(q)}
                    style={{ animationDelay: `${i * 0.08}s`, animation: "slideUp 0.4s ease both" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            padding: "24px",
            display: "flex", justifyContent: "center", gap: 48,
          }}>
            {[["10K+", "Issues Solved"], ["500+", "Car Models"], ["24/7", "Available"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: "#FF6B1A" }}>{n}</div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT VIEW */}
      {view === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "calc(100vh - 65px)" }}>
          {/* Chat header */}
          <div style={{
            padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, color: "#888" }}>RevMind is online — describe your car problem</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "linear-gradient(135deg, #FF6B1A, #FF3D00)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                  boxShadow: "0 0 30px rgba(255,107,26,0.4)",
                }}>
                  <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7 }}>
                  Hey! I'm <strong style={{ color: "#FF6B1A" }}>RevMind</strong> — your AI mechanic.<br />
                  Tell me your year, make, model, and what's going on.
                </p>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320, margin: "20px auto 0" }}>
                  {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                    <button key={i} className="suggest-btn" onClick={() => sendMessage(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg, #FF6B1A, #FF3D00)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <CAR_ICON />
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "4px 18px 18px 18px", padding: "12px 16px",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", gap: 8, maxWidth: 700, margin: "0 auto" }}>
              <textarea
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Describe your car problem... (year, make, model helps!)"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
                style={{ height: "auto", minHeight: 42, maxHeight: 100 }}
              />
              <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
                <SEND_ICON />
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 10, color: "#444", marginTop: 8 }}>
              AI advice only — for safety-critical repairs, consult a licensed mechanic.
            </p>
          </div>
        </div>
      )}

      {/* NEWS VIEW */}
      {view === "news" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: "0.02em" }}>
                AUTO <span style={{ color: "#FF6B1A" }}>NEWS</span>
              </h2>
              <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>Latest from the automotive world, powered by AI</p>
            </div>

            {newsLoading && (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ width: 32, height: 32, border: "2px solid rgba(255,107,26,0.2)", borderTopColor: "#FF6B1A", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ color: "#555", fontSize: 13 }}>Scanning the automotive world...</p>
              </div>
            )}

            {!newsLoading && newsItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {newsItems.map((item, i) => (
                  <div key={i} className="news-card" style={{ animationDelay: `${i * 0.1}s` }}
                    onClick={() => startChat(`Tell me more about: ${item.headline}`)}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        minWidth: 32, height: 32, borderRadius: 8,
                        background: "rgba(255,107,26,0.1)", border: "1px solid rgba(255,107,26,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14,
                      }}>
                        {["🚗","⚡","🔧","🏎️","🌍","💡"][i % 6]}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e8e8e8", marginBottom: 6, lineHeight: 1.4, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.03em", fontSize: 16 }}>
                          {item.headline}
                        </h3>
                        <p style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{item.summary}</p>
                        <p style={{ fontSize: 10, color: "#FF6B1A", marginTop: 8, letterSpacing: "0.1em" }}>TAP TO DISCUSS →</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!newsLoading && newsContent && newsItems.length === 0 && (
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: 20, fontSize: 13, color: "#888", lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}>
                {newsContent}
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button onClick={() => { setNewsLoaded(false); setNewsContent(""); loadNews(); }}
                style={{ background: "none", border: "1px solid rgba(255,107,26,0.3)", color: "#FF6B1A", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
                REFRESH NEWS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav for mobile */}
      <div style={{
        display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,10,15,0.98)", backdropFilter: "blur(10px)",
      }}>
        {[
          { key: "home", icon: "🏠", label: "Home" },
          { key: "chat", icon: "🔧", label: "Diagnose" },
          { key: "news", icon: "📰", label: "News" },
        ].map(tab => (
          <button key={tab.key} onClick={() => tab.key === "news" ? handleNewsTab() : setView(tab.key)}
            style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              padding: "10px 0 8px",
              color: view === tab.key ? "#FF6B1A" : "#555",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "color 0.2s",
            }}>
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
