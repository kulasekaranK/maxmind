import { useState, useEffect, useRef, useCallback } from "react";

// ─── MODELS ──────────────────────────────────────────────────────────────────
const MODELS = [
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", vendor: "Moonshot AI", tag: "Reasoning", color: "#10b981", thinking: true, thinkingParam: { chat_template_kwargs: { thinking: true } }, maxTokens: 16384, temperature: 1.0 },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", label: "Nemotron Omni", vendor: "NVIDIA", tag: "Reasoning", color: "#76a9fa", thinking: true, thinkingParam: { chat_template_kwargs: { enable_thinking: true }, reasoning_budget: 16384 }, maxTokens: 65536, temperature: 0.6 },
  { id: "deepseek-ai/deepseek-r1-0528", label: "DeepSeek R1", vendor: "DeepSeek", tag: "Reasoning", color: "#a78bfa", thinking: true, thinkingParam: {}, maxTokens: 32768, temperature: 0.6 },
  { id: "qwen/qwq-32b", label: "QwQ 32B", vendor: "Qwen", tag: "Reasoning", color: "#fbbf24", thinking: true, thinkingParam: {}, maxTokens: 32768, temperature: 0.7 },
  { id: "mistralai/mistral-large-instruct", label: "Mistral Large", vendor: "Mistral", tag: "General", color: "#f97316", thinking: false, thinkingParam: {}, maxTokens: 32768, temperature: 0.7 },
  { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B", vendor: "Meta", tag: "General", color: "#34d399", thinking: false, thinkingParam: {}, maxTokens: 32768, temperature: 0.7 },
  { id: "google/gemma-3-27b-it", label: "Gemma 3 27B", vendor: "Google", tag: "General", color: "#60a5fa", thinking: false, thinkingParam: {}, maxTokens: 16384, temperature: 0.7 },
];

const DEFAULT_SYSTEM = `You are MAXMIND, an elite AI assistant engineered for advanced technical and software engineering tasks. You specialize in IBM Sterling OMS, enterprise systems, complex reasoning, and developer-grade problem solving. Be precise, structured, and thorough. Always format code with proper language tags. Break down complex problems step by step.`;

const SUGGESTIONS = [
  { icon: "⚡", text: "Explain IBM Sterling OMS order orchestration flow" },
  { icon: "🔍", text: "Debug a Java NullPointerException in production" },
  { icon: "🗄️", text: "Write an optimized SQL query with multiple joins" },
  { icon: "🏗️", text: "Design a scalable REST API architecture" },
];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const CUSTOM_MODELS_KEY = "mx_custom_models";
// ─── MAXMIND LOGO ─────────────────────────────────────────────────────────────
const MaxMindLogo = ({ size = 32, glow = false }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={glow ? { filter: "drop-shadow(0 0 14px rgba(99,102,241,0.65))" } : {}}>
    <defs>
      <linearGradient id="mlg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
      <linearGradient id="mlg2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e0e7ff"/>
        <stop offset="100%" stopColor="#c4b5fd"/>
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill="url(#mlg1)"/>
    <path d="M7 29V13l7.5 8.5 5.5-7.5 5.5 7.5L33 13v16" stroke="url(#mlg2)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="20" cy="9.5" r="2.2" fill="#c4b5fd"/>
  </svg>
);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Ic = ({ n, s = 16, c = "currentColor", style: st = {} }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={st}>
    {n === "send" && <><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></>}
    {n === "plus" && <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
    {n === "trash" && <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>}
    {n === "settings" && <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}
    {n === "cd" && <polyline points="6 9 12 15 18 9"/>}
    {n === "cr" && <polyline points="9 18 15 12 9 6"/>}
    {n === "copy" && <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>}
    {n === "check" && <polyline points="20 6 9 17 4 12"/>}
    {n === "x" && <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
    {n === "menu" && <><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/></>}
    {n === "stop" && <rect x="4" y="4" width="16" height="16" rx="3"/>}
    {n === "dl" && <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}
    {n === "key" && <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>}
    {n === "attach" && <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>}
    {n === "brain" && <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>}
  </svg>
);

// ─── MARKDOWN ─────────────────────────────────────────────────────────────────
function applyInline(s) {
  return s
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`([^`\n]+)`/g, "<code class='mx-ic'>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMD(raw) {
  if (!raw) return "";
  // Escape
  let t = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Extract fenced code blocks
  const blocks = [];
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = blocks.length;
    blocks.push({ lang: lang || "text", code: code.trim() });
    return `\x00BLOCK${idx}\x00`;
  });

  const lines = t.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.includes("\x00BLOCK")) { out.push(l); i++; continue; }
    if (l.startsWith("### ")) { out.push(`<h3>${applyInline(l.slice(4))}</h3>`); i++; continue; }
    if (l.startsWith("## "))  { out.push(`<h2>${applyInline(l.slice(3))}</h2>`); i++; continue; }
    if (l.startsWith("# "))   { out.push(`<h1>${applyInline(l.slice(2))}</h1>`); i++; continue; }
    if (/^---+$/.test(l.trim())) { out.push("<hr/>"); i++; continue; }
    if (l.startsWith("> "))  { out.push(`<blockquote>${applyInline(l.slice(2))}</blockquote>`); i++; continue; }
    if (/^[-*+] /.test(l)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) { items.push(`<li>${applyInline(lines[i].slice(2))}</li>`); i++; }
      out.push(`<ul>${items.join("")}</ul>`); continue;
    }
    if (/^\d+\. /.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(`<li>${applyInline(lines[i].replace(/^\d+\. /, ""))}</li>`); i++; }
      out.push(`<ol>${items.join("")}</ol>`); continue;
    }
    if (l.trim() === "") { out.push("<div class='mx-spacer'></div>"); i++; continue; }
    out.push(`<p>${applyInline(l)}</p>`);
    i++;
  }

  let html = out.join("");

  // Restore code blocks
  html = html.replace(/\x00BLOCK(\d+)\x00/g, (_, idx) => {
    const { lang, code } = blocks[parseInt(idx)];
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div class="mx-code-wrap"><div class="mx-code-hdr"><span class="mx-code-lang">${lang}</span><button class="mx-copy-code" data-code="${encodeURIComponent(code)}">Copy</button></div><pre><code>${escaped}</code></pre></div>`;
  });

  return html;
}

// ─── COPY BUTTON ──────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); }); }}
      style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: done ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${done ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.09)"}`, color: done ? "#10b981" : "#6b7280", borderRadius: "6px", padding: "4px 9px", cursor: "pointer", fontSize: "11px", fontFamily: "inherit", transition: "all 0.2s" }}>
      <Ic n={done ? "check" : "copy"} s={11} c={done ? "#10b981" : "#6b7280"} />
      {done ? "Copied" : "Copy"}
    </button>
  );
}

// ─── THINKING BLOCK ───────────────────────────────────────────────────────────
function ThinkBlock({ content, streaming }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: "12px" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.22)", color: "#a78bfa", borderRadius: "20px", padding: "5px 13px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", fontWeight: 500 }}>
        <Ic n="brain" s={13} c="#a78bfa" />
        {streaming ? <span style={{ animation: "pulse 1.4s infinite" }}>Thinking…</span> : "Reasoning trace"}
        <Ic n={open ? "cd" : "cr"} s={12} c="#a78bfa" />
      </button>
      {open && (
        <div style={{ marginTop: "9px", background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.13)", borderRadius: "12px", padding: "13px 16px", fontSize: "12px", lineHeight: "1.75", color: "#7c6bbb", fontFamily: "'JetBrains Mono','Fira Code',monospace", whiteSpace: "pre-wrap", overflowX: "auto", maxHeight: "340px", overflowY: "auto" }}>
          {content}
        </div>
      )}
    </div>
  );
}

// ─── MESSAGE ──────────────────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === "user";
  const mdRef = useRef(null);

  useEffect(() => {
    if (!mdRef.current) return;
    mdRef.current.querySelectorAll(".mx-copy-code").forEach(btn => {
      btn.onclick = () => {
        navigator.clipboard.writeText(decodeURIComponent(btn.dataset.code));
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 2000);
      };
    });
  }, [msg.content]);

  return (
    <div style={{ display: "flex", gap: "13px", marginBottom: "26px", flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start" }}>
      {/* Avatar */}
      {isUser ? (
        <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "13px" }}>
          👤
        </div>
      ) : (
        <div style={{ flexShrink: 0, marginTop: "1px" }}>
          <MaxMindLogo size={32} />
        </div>
      )}

      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
        {/* Label */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
          <span style={{ fontSize: "11.5px", fontWeight: 700, color: isUser ? "#818cf8" : "#a5b4fc", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {isUser ? "You" : "MAXMIND"}
          </span>
          {!isUser && msg.model && (
            <span style={{ fontSize: "10px", color: "#374151", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "4px", padding: "1px 6px" }}>
              {msg.model}
            </span>
          )}
        </div>

        {/* Thinking */}
        {(msg.thinking || (msg.streaming && !msg.content)) && msg.role === "assistant" && (
          <ThinkBlock content={msg.thinking || ""} streaming={msg.streaming && !msg.content} />
        )}

        {/* Attached image preview */}
        {msg.imageUrl && (
          <div style={{ marginBottom: "8px" }}>
            <img src={msg.imageUrl} alt="attachment" style={{ maxWidth: "260px", maxHeight: "180px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.09)", objectFit: "cover" }} />
          </div>
        )}

        {/* Bubble */}
        {(msg.content || (msg.streaming && !msg.thinking)) && (
          <div style={{
            background: isUser
              ? "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(124,58,237,0.16) 100%)"
              : "rgba(255,255,255,0.035)",
            border: `1px solid ${isUser ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
            padding: "13px 17px",
          }}>
            {msg.streaming && !msg.content ? (
              <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "2px 0" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", animation: `bounce 1.2s ease-in-out infinite`, animationDelay: `${i*0.15}s` }} />)}
              </div>
            ) : (
              <div ref={mdRef} className="mx-md" dangerouslySetInnerHTML={{ __html: renderMD(msg.content) }} />
            )}
          </div>
        )}

        {/* Copy action */}
        {!isUser && msg.content && !msg.streaming && (
          <div style={{ marginTop: "7px" }}>
            <CopyBtn text={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── shared styles ─────────────────────────────────────────────────────────────
const inp = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 13px", color: "#f9fafb", fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const ib = { background: "none", border: "none", cursor: "pointer", padding: "5px", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" };

// ─── FIELD ────────────────────────────────────────────────────────────────────
const Field = ({ label, hint, children }) => (
  <div>
    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: "11px", color: "#374151", marginTop: "5px" }}>{hint}</div>}
  </div>
);

const Toggle = ({ on, onChange }) => (
  <div onClick={() => onChange(!on)} style={{ width: "42px", height: "24px", borderRadius: "12px", background: on ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.08)", cursor: "pointer", position: "relative", transition: "background 0.25s", border: `1px solid ${on ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}` }}>
    <div style={{ position: "absolute", top: "3px", left: on ? "20px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.22s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
  </div>
);

// ─── SETTINGS DRAWER ──────────────────────────────────────────────────────────
function SettingsDrawer({ config, onChange, onClose, models, onAddModel }) {
  const [loc, setLoc] = useState(config);
  const up = (k, v) => setLoc(p => ({ ...p, [k]: v }));
  const [newModel, setNewModel] = useState({ id: "", label: "", vendor: "", tag: "General" });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "460px", background: "rgba(10,12,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(30px)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "12px" }}>
          <MaxMindLogo size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#f9fafb" }}>Settings</div>
            <div style={{ fontSize: "11px", color: "#374151", marginTop: "1px" }}>Configure your workspace</div>
          </div>
          <button onClick={onClose} style={ib}><Ic n="x" s={17} c="#4b5563" /></button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "22px", flex: 1 }}>
          <Field label="NVIDIA API Key" hint="Stays in your browser's localStorage only">
            <input type="password" value={loc.apiKey} onChange={e => up("apiKey", e.target.value)} placeholder="nvapi-..." style={inp} />
          </Field>
          <Field label="Default Model">
            <select value={loc.model} onChange={e => up("model", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {models.map(m => <option key={m.id} value={m.id}>{m.label} · {m.vendor}</option>)}
            </select>
          </Field>
<Field label="Add Custom Model" hint="Adds a model to your dropdown (stored locally)">
  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
    <input
      value={newModel.id}
      onChange={e => setNewModel(p => ({ ...p, id: e.target.value }))}
      placeholder="Model ID (example: vendor/model-name)"
      style={inp}
    />
    <input
      value={newModel.label}
      onChange={e => setNewModel(p => ({ ...p, label: e.target.value }))}
      placeholder="Label (example: My Custom Model)"
      style={inp}
    />
    <input
      value={newModel.vendor}
      onChange={e => setNewModel(p => ({ ...p, vendor: e.target.value }))}
      placeholder="Vendor (example: OpenAI / Anthropic / Custom)"
      style={inp}
    />
    <select
      value={newModel.tag}
      onChange={e => setNewModel(p => ({ ...p, tag: e.target.value }))}
      style={{ ...inp, cursor: "pointer" }}
    >
      <option value="General">General</option>
      <option value="Reasoning">Reasoning</option>
    </select>

    <button
      disabled={!newModel.id.trim() || !newModel.label.trim()}
      onClick={() => {
        onAddModel({
          id: newModel.id.trim(),
          label: newModel.label.trim(),
          vendor: newModel.vendor.trim() || "Custom",
          tag: newModel.tag,
          color: "#94a3b8",
          thinking: false,
          thinkingParam: {},
          maxTokens: 32768,
          temperature: 0.7
        });
        setNewModel({ id: "", label: "", vendor: "", tag: "General" });
      }}
      style={{
        background: "rgba(99,102,241,0.12)",
        border: "1px solid rgba(99,102,241,0.22)",
        color: "#818cf8",
        borderRadius: "10px",
        padding: "11px",
        cursor: "pointer",
        fontWeight: 700,
        fontFamily: "inherit"
      }}
    >
      + Add Model
    </button>
  </div>
</Field>
          <Field label={`Temperature — ${loc.temperature}`}>
            <input type="range" min="0" max="2" step="0.05" value={loc.temperature} onChange={e => up("temperature", parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#6366f1" }} />
          </Field>
          <Field label={`Max Tokens — ${loc.maxTokens.toLocaleString()}`}>
            <input type="range" min="1024" max="65536" step="1024" value={loc.maxTokens} onChange={e => up("maxTokens", parseInt(e.target.value))} style={{ width: "100%", accentColor: "#6366f1" }} />
          </Field>
          <Field label="System Prompt">
            <textarea value={loc.systemPrompt} onChange={e => up("systemPrompt", e.target.value)} rows={8} style={{ ...inp, resize: "vertical", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.65", minHeight: "160px" }} />
          </Field>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", background: "rgba(255,255,255,0.02)", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>Show Thinking</div>
              <div style={{ fontSize: "11px", color: "#374151", marginTop: "2px" }}>Display AI reasoning when supported</div>
            </div>
            <Toggle on={loc.showThinking} onChange={v => up("showThinking", v)} />
          </div>
          <button onClick={() => { onChange(loc); onClose(); }}
            style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SETUP MODAL ──────────────────────────────────────────────────────────────
function SetupModal({ onSave }) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#06080f", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{ position: "absolute", top: "10%", left: "30%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "20%", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ width: "430px", background: "rgba(11,13,22,0.95)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: "22px", padding: "40px 34px", backdropFilter: "blur(40px)", boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ textAlign: "center", marginBottom: "34px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}><MaxMindLogo size={52} glow /></div>
          <div style={{ fontSize: "30px", fontWeight: 900, letterSpacing: "-0.03em", background: "linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 60%, #818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MAXMIND</div>
          <div style={{ fontSize: "12px", color: "#374151", marginTop: "6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Private AI Workspace · NVIDIA Powered</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Field label="NVIDIA API Key" hint={<>Get yours at <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" style={{ color: "#818cf8" }}>build.nvidia.com</a> · stored locally only</>}>
            <div style={{ position: "relative" }}>
              <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="nvapi-…" style={{ ...inp, paddingLeft: "38px" }} />
              <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}><Ic n="key" s={14} c="#4b5563" /></div>
            </div>
          </Field>
          <Field label="Starting Model">
            <select value={model} onChange={e => setModel(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.label} · {m.vendor} ({m.tag})</option>)}
            </select>
          </Field>
          <button disabled={!key.trim()} onClick={() => onSave(key.trim(), model)}
            style={{ marginTop: "8px", background: key.trim() ? "linear-gradient(135deg, #6366f1, #7c3aed)" : "rgba(255,255,255,0.04)", color: key.trim() ? "#fff" : "#2d3748", border: `1px solid ${key.trim() ? "transparent" : "rgba(255,255,255,0.05)"}`, borderRadius: "13px", padding: "15px", cursor: key.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "15px", fontFamily: "inherit", letterSpacing: "0.02em", transition: "all 0.2s", boxShadow: key.trim() ? "0 4px 24px rgba(99,102,241,0.4)" : "none" }}>
            Launch MAXMIND →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODEL PICKER ──────────────────────────────────────────────────────────────
function ModelPicker({ selected, onChange, models }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const m = models.find(x => x.id === selected) || models[0];

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: "9px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px", padding: "7px 12px", cursor: "pointer", color: "#e5e7eb", fontFamily: "inherit", fontSize: "13px", fontWeight: 500 }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: m.color, boxShadow: `0 0 8px ${m.color}99`, flexShrink: 0 }} />
        {m.label}
        <span style={{ fontSize: "10px", color: m.tag === "Reasoning" ? "#a78bfa" : "#34d399", background: m.tag === "Reasoning" ? "rgba(167,139,250,0.1)" : "rgba(52,211,153,0.1)", border: `1px solid ${m.tag === "Reasoning" ? "rgba(167,139,250,0.22)" : "rgba(52,211,153,0.22)"}`, borderRadius: "4px", padding: "1px 6px" }}>{m.tag}</span>
        <Ic n="cd" s={13} c="#4b5563" />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: "rgba(10,12,20,0.98)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "14px", overflow: "hidden", width: "295px", zIndex: 100, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
          <div style={{ padding: "7px" }}>
            {models.map(mod => (
              <div key={mod.id} onClick={() => { onChange(mod.id); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: "11px", padding: "9px 11px", borderRadius: "8px", cursor: "pointer", background: selected === mod.id ? "rgba(99,102,241,0.12)" : "transparent", transition: "background 0.1s" }}
                onMouseEnter={e => { if (selected !== mod.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (selected !== mod.id) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: mod.color, boxShadow: `0 0 8px ${mod.color}88`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", color: "#e5e7eb", fontWeight: 500 }}>{mod.label}</div>
                  <div style={{ fontSize: "11px", color: "#374151", marginTop: "1px" }}>{mod.vendor}</div>
                </div>
                <span style={{ fontSize: "10px", color: mod.tag === "Reasoning" ? "#a78bfa" : "#34d399", background: mod.tag === "Reasoning" ? "rgba(167,139,250,0.1)" : "rgba(52,211,153,0.1)", border: `1px solid ${mod.tag === "Reasoning" ? "rgba(167,139,250,0.2)" : "rgba(52,211,153,0.2)"}`, borderRadius: "4px", padding: "2px 6px" }}>{mod.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ chats, activeId, onSelect, onNew, onDelete, collapsed, onToggle }) {
  return (
    <div style={{ width: collapsed ? "58px" : "245px", background: "rgba(5,7,13,0.85)", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", flexShrink: 0, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div style={{ padding: "18px 13px 13px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ flexShrink: 0 }}><MaxMindLogo size={30} /></div>
        {!collapsed && <span style={{ fontWeight: 900, fontSize: "17px", letterSpacing: "-0.025em", background: "linear-gradient(135deg, #a5b4fc, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap" }}>MAXMIND</span>}
        <button onClick={onToggle} style={{ ...ib, marginLeft: "auto" }}><Ic n="menu" s={15} c="#2d3748" /></button>
      </div>
      <div style={{ padding: "10px 8px 6px" }}>
        <button onClick={onNew} style={{ width: "100%", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "9px", padding: collapsed ? "9px" : "9px 13px", cursor: "pointer", color: "#818cf8", display: "flex", alignItems: "center", gap: "8px", justifyContent: collapsed ? "center" : "flex-start", fontFamily: "inherit", fontSize: "13px", fontWeight: 600 }}>
          <Ic n="plus" s={14} c="#818cf8" />{!collapsed && "New Chat"}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
        {chats.length === 0 && !collapsed && <div style={{ padding: "20px 10px", textAlign: "center", color: "#1f2937", fontSize: "12px" }}>No conversations yet</div>}
        {chats.map(c => (
          <div key={c.id} className="sb-item" onClick={() => onSelect(c.id)}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: collapsed ? "9px" : "8px 10px", borderRadius: "8px", cursor: "pointer", background: activeId === c.id ? "rgba(99,102,241,0.12)" : "transparent", border: `1px solid ${activeId === c.id ? "rgba(99,102,241,0.2)" : "transparent"}`, marginBottom: "2px", transition: "all 0.12s", justifyContent: collapsed ? "center" : "flex-start" }}>
            <Ic n="brain" s={13} c={activeId === c.id ? "#818cf8" : "#2d3748"} />
            {!collapsed && <>
              <span style={{ fontSize: "12.5px", color: activeId === c.id ? "#e5e7eb" : "#4b5563", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
              <button className="sb-del" onClick={e => { e.stopPropagation(); onDelete(c.id); }} style={{ ...ib, opacity: 0, transition: "opacity 0.15s" }}><Ic n="trash" s={12} c="#374151" /></button>
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IMAGE TO BASE64 ──────────────────────────────────────────────────────────
const fileToB64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [config, setConfig] = useState(() => LS.get("mx_cfg", { apiKey: "", model: MODELS[0].id, systemPrompt: DEFAULT_SYSTEM, temperature: 0.7, maxTokens: 16384, showThinking: true }));
  const [customModels, setCustomModels] = useState(() => LS.get(CUSTOM_MODELS_KEY, []));
  const allModels = [...MODELS, ...customModels];
  const [chats, setChats] = useState(() => LS.get("mx_chats", []));
  const [activeId, setActiveId] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentModel, setCurrentModel] = useState(config.model);
  const [pendingImg, setPendingImg] = useState(null);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const addCustomModel = model => {
    setCustomModels(prev => {
      if (prev.some(m => m.id === model.id) || MODELS.some(m => m.id === model.id)) return prev;
      return [model, ...prev];
    });
  };

  useEffect(() => { if (!config.apiKey) setShowSetup(true); }, []);
  useEffect(() => { LS.set("mx_cfg", config); }, [config]);
  useEffect(() => { LS.set("mx_chats", chats); }, [chats]);
useEffect(() => { LS.set(CUSTOM_MODELS_KEY, customModels); }, [customModels]);
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40); }, [chats, activeId]);

  const activeChat = chats.find(c => c.id === activeId);
  const messages = activeChat?.messages || [];

  const newChat = () => { const id = Date.now().toString(); setChats(p => [{ id, title: "New Chat", messages: [] }, ...p]); setActiveId(id); setInput(""); };
  const deleteChat = id => { setChats(p => p.filter(c => c.id !== id)); if (activeId === id) setActiveId(chats.find(c => c.id !== id)?.id || null); };
  const updateChat = useCallback((id, fn) => setChats(p => p.map(c => c.id === id ? fn(c) : c)), []);

  const handleImg = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const b64 = await fileToB64(file);
    setPendingImg({ file, b64, url: URL.createObjectURL(file), mt: file.type });
    e.target.value = "";
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !pendingImg) || streaming) return;
    if (!config.apiKey) { setShowSetup(true); return; }

    let chatId = activeId;
    if (!chatId) {
      chatId = Date.now().toString();
      setChats(p => [{ id: chatId, title: text.slice(0, 42) || "Image", messages: [] }, ...p]);
      setActiveId(chatId);
    }

    const img = pendingImg; setPendingImg(null); setInput("");
    if (taRef.current) taRef.current.style.height = "auto";

    const uid = Date.now(), aid = Date.now() + 1;
    const modelLabel = allModels.find(m => m.id === currentModel)?.label || currentModel;
    const userMsg = { id: uid, role: "user", content: text, imageUrl: img?.url || null };
    const aMsg = { id: aid, role: "assistant", content: "", thinking: "", streaming: true, model: modelLabel };

    updateChat(chatId, c => ({ ...c, title: c.title === "New Chat" ? (text.slice(0, 42) || "Image Chat") : c.title, messages: [...c.messages, userMsg, aMsg] }));
    setStreaming(true);

    const hist = [...(chats.find(c => c.id === chatId)?.messages || []).filter(m => !m.streaming), userMsg];
    const apiMsgs = [
      { role: "system", content: config.systemPrompt },
      ...hist.map(m => {
        if (m.role === "user" && m.id === uid && img) {
          return { role: "user", content: [{ type: "image_url", image_url: { url: `data:${img.mt};base64,${img.b64}` } }, { type: "text", text: text || "Describe this image and extract all visible text." }] };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    const modelCfg = allModels.find(m => m.id === currentModel) || allModels[0];
    const payload = { model: currentModel, messages: apiMsgs, temperature: config.temperature, top_p: 0.95, max_tokens: config.maxTokens, stream: true, ...(modelCfg.thinking ? modelCfg.thinkingParam : {}) };

    abortRef.current = new AbortController();
    let thinkBuf = "", contBuf = "";

    try {
      const res = await fetch("/nvidia-api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` }, body: JSON.stringify(payload), signal: abortRef.current.signal });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `HTTP ${res.status}`); }

      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim(); if (data === "[DONE]") break;
          try { const j = JSON.parse(data); const delta = j.choices?.[0]?.delta; if (!delta) continue; if (delta.reasoning_content) thinkBuf += delta.reasoning_content; if (delta.content) contBuf += delta.content; updateChat(chatId, c => ({ ...c, messages: c.messages.map(m => m.id === aid ? { ...m, content: contBuf, thinking: thinkBuf } : m) })); } catch {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") updateChat(chatId, c => ({ ...c, messages: c.messages.map(m => m.id === aid ? { ...m, content: `**Error:** ${e.message}` } : m) }));
    } finally {
      updateChat(chatId, c => ({ ...c, messages: c.messages.map(m => m.id === aid ? { ...m, streaming: false } : m) }));
      setStreaming(false);
    }
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const exportChat = () => {
    if (!activeChat) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([activeChat.messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n")], { type: "text/plain" }));
    a.download = `maxmind-${activeChat.title.replace(/\s+/g, "-")}.txt`; a.click();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #06080f; color: #e5e7eb; -webkit-font-smoothing: antialiased; }

        /* ── Layered background ── */
        body::before {
          content: '';
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse 90% 55% at 50% -5%, rgba(99,102,241,0.2) 0%, transparent 65%),
            radial-gradient(ellipse 55% 40% at 85% 5%,  rgba(124,58,237,0.13) 0%, transparent 55%),
            radial-gradient(ellipse 45% 35% at 15% 8%,  rgba(79,70,229,0.11) 0%, transparent 50%),
            linear-gradient(180deg, #090b18 0%, #070810 35%, #06080f 70%, #06080f 100%);
          pointer-events: none; z-index: 0;
        }
        /* fade to full dark at bottom */
        body::after {
          content: '';
          position: fixed; bottom: 0; left: 0; right: 0; height: 50%;
          background: linear-gradient(to top, #06080f 0%, transparent 100%);
          pointer-events: none; z-index: 0;
        }
        #root { position: relative; z-index: 1; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }

        /* ── Animations ── */
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.55);opacity:0.35} 40%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        /* ── Sidebar ── */
        .sb-item:hover { background: rgba(255,255,255,0.04) !important; }
        .sb-item:hover .sb-del { opacity: 1 !important; }

        /* ── Focus ── */
        input:focus, select:focus, textarea:focus { border-color: rgba(99,102,241,0.45) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.09) !important; outline: none !important; }

        /* ── Markdown ── */
        .mx-md { font-size: 14px; line-height: 1.82; color: #d1d5db; text-align: left; }
        .mx-md p  { margin: 0 0 8px; text-align: left; }
        .mx-md p:last-child { margin-bottom: 0; }
        .mx-md h1 { font-size: 19px; font-weight: 800; color: #f9fafb; margin: 20px 0 10px; letter-spacing: -0.025em; text-align: left; }
        .mx-md h2 { font-size: 16px; font-weight: 700; color: #f3f4f6; margin: 16px 0 8px; letter-spacing: -0.01em; text-align: left; }
        .mx-md h3 { font-size: 14.5px; font-weight: 600; color: #e5e7eb; margin: 13px 0 6px; text-align: left; }
        .mx-md strong { color: #f3f4f6; font-weight: 700; }
        .mx-md em { color: #c4b5fd; font-style: italic; }
        .mx-md del { color: #6b7280; text-decoration: line-through; }
        .mx-md a { color: #818cf8; text-decoration: none; border-bottom: 1px solid rgba(129,140,248,0.3); }
        .mx-md a:hover { border-bottom-color: #818cf8; }
        .mx-md hr { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 14px 0; }
        .mx-md blockquote { border-left: 3px solid rgba(99,102,241,0.45); padding: 4px 14px; margin: 10px 0; color: #9ca3af; font-style: italic; }
        .mx-md ul { list-style: none; padding: 0; margin: 6px 0 10px; }
        .mx-md ul li { padding: 2px 0 2px 18px; position: relative; color: #d1d5db; text-align: left; }
        .mx-md ul li::before { content: "▸"; position: absolute; left: 0; color: #6366f1; font-size: 10px; top: 5px; }
        .mx-md ol { padding-left: 20px; margin: 6px 0 10px; }
        .mx-md ol li { padding: 2px 0; color: #d1d5db; text-align: left; }
        .mx-md ol li::marker { color: #6366f1; font-weight: 700; }
        .mx-spacer { height: 6px; }
        .mx-ic { background: rgba(99,102,241,0.14); border: 1px solid rgba(99,102,241,0.2); color: #a5b4fc; border-radius: 5px; padding: 1px 6px; font-family: 'JetBrains Mono','Fira Code',monospace; font-size: 0.87em; }
        .mx-code-wrap { background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; margin: 12px 0; }
        .mx-code-hdr { display: flex; align-items: center; justify-content: space-between; padding: 7px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .mx-code-lang { font-size: 10.5px; color: #374151; text-transform: uppercase; letter-spacing: 0.09em; font-family: monospace; font-weight: 700; }
        .mx-code-wrap pre { margin: 0; padding: 16px; overflow-x: auto; }
        .mx-code-wrap code { color: #a5b4fc; font-family: 'JetBrains Mono','Fira Code',monospace; font-size: 12.5px; line-height: 1.7; white-space: pre; display: block; }
        .mx-copy-code { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); color: #4b5563; border-radius: 5px; padding: 3px 9px; cursor: pointer; font-size: 11px; font-family: inherit; transition: all 0.15s; }
        .mx-copy-code:hover { background: rgba(255,255,255,0.08); color: #9ca3af; }

        /* ── Message enter ── */
        .msg-enter { animation: fadeUp 0.22s ease forwards; }

        /* ── Input textarea ── */
        .mx-ta::placeholder { color: #2d3748; }
        .mx-ta { caret-color: #818cf8; }
      `}</style>

      {showSetup && <SetupModal onSave={(key, model) => { const c = { ...config, apiKey: key, model }; setConfig(c); setCurrentModel(model); setShowSetup(false); }} />}
      {showSettings && (
  <SettingsDrawer
    config={config}
    models={allModels}
    onAddModel={addCustomModel}
    onChange={c => { setConfig(c); setCurrentModel(c.model); }}
    onClose={() => setShowSettings(false)}
  />
)}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImg} />

      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar chats={chats} activeId={activeId} onSelect={setActiveId} onNew={newChat} onDelete={deleteChat} collapsed={collapsed} onToggle={() => setCollapsed(o => !o)} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(6,8,15,0.65)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <ModelPicker selected={currentModel} onChange={setCurrentModel} models={allModels} />
              {activeChat && <span style={{ fontSize: "12.5px", color: "#1f2937", paddingLeft: "10px", borderLeft: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{activeChat.title}</span>}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {activeChat?.messages?.length > 0 && (
                <button onClick={exportChat} style={{ ...ib, border: "1px solid rgba(255,255,255,0.06)", padding: "6px 11px", borderRadius: "8px", fontSize: "12px", color: "#2d3748", display: "flex", gap: "5px", alignItems: "center" }}>
                  <Ic n="dl" s={13} c="#2d3748" /> Export
                </button>
              )}
              <button onClick={() => setShowSettings(true)} style={{ ...ib, border: "1px solid rgba(255,255,255,0.06)", padding: "7px", borderRadius: "8px" }}>
                <Ic n="settings" s={15} c="#2d3748" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "30px 24px 10px" }}>
            {messages.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "18px", animation: "fadeUp 0.35s ease" }}>
                <MaxMindLogo size={56} glow />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.035em", background: "linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 45%, #818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MAXMIND</div>
                  <div style={{ color: "#1f2937", fontSize: "13px", marginTop: "5px", letterSpacing: "0.04em" }}>Private · NVIDIA-powered · Local only</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", width: "100%", marginTop: "4px" }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s.text} onClick={() => { setInput(s.text); taRef.current?.focus(); }}
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(16px)", borderRadius: "12px", padding: "14px 15px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.18s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.07)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.22)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                      <div style={{ fontSize: "17px", marginBottom: "5px" }}>{s.icon}</div>
                      <div style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.5" }}>{s.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ width: "100%", margin: "0" }} className="msg-enter">
                {messages.map(msg => <Message key={msg.id} msg={msg} />)}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 24px 22px", background: "rgba(6,8,15,0.4)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", flexShrink: 0 }}>
            <div style={{ width: "100%", margin: "0" }}>
              {/* Image preview */}
              {pendingImg && (
                <div style={{ marginBottom: "9px", display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "8px 12px" }}>
                  <img src={pendingImg.url} alt="preview" style={{ width: "38px", height: "38px", borderRadius: "6px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.08)" }} />
                  <span style={{ fontSize: "12px", color: "#4b5563", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingImg.file.name}</span>
                  <button onClick={() => setPendingImg(null)} style={ib}><Ic n="x" s={14} c="#374151" /></button>
                </div>
              )}

              {/* Textarea container with glass effect */}
              <div className="input-box" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", transition: "border-color 0.2s, box-shadow 0.2s" }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.38)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)"; }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}>
                <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} className="mx-ta"
                  placeholder="Ask anything… (Enter to send · Shift+Enter for newline)" rows={1}
                  style={{ width: "100%", background: "transparent", border: "none", padding: "14px 16px 8px", color: "#e5e7eb", fontSize: "14px", fontFamily: "inherit", resize: "none", outline: "none", lineHeight: "1.65", maxHeight: "180px", overflow: "auto", display: "block" }}
                  onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px"; }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 10px" }}>
                  <button onClick={() => fileRef.current?.click()} title="Attach image"
                    style={{ ...ib, padding: "7px 9px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", color: "#2d3748", fontSize: "12px", gap: "5px", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#6b7280"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#2d3748"; }}>
                    <Ic n="attach" s={14} c="currentColor" /> Image
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: "#111318" }}>
                      {MODELS.find(m => m.id === currentModel)?.vendor}
                    </span>
                    <button onClick={streaming ? () => { abortRef.current?.abort(); setStreaming(false); } : sendMessage}
                      style={{ width: "36px", height: "36px", borderRadius: "10px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0, background: streaming ? "rgba(239,68,68,0.14)" : (input.trim() || pendingImg) ? "linear-gradient(135deg, #6366f1, #7c3aed)" : "rgba(255,255,255,0.04)", boxShadow: (!streaming && (input.trim() || pendingImg)) ? "0 2px 16px rgba(99,102,241,0.45)" : "none" }}>
                      <Ic n={streaming ? "stop" : "send"} s={14} c={streaming ? "#ef4444" : (input.trim() || pendingImg) ? "#fff" : "#2d3748"} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: "7px" }}>
                <span style={{ fontSize: "10.5px", color: "#0e1117", letterSpacing: "0.02em" }}>MAXMIND · All data stays local · NVIDIA API only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}