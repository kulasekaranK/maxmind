import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";

/* ── MODELS ─────────────────────────────────────────────────────────────── */
const MODELS = [
  { id:"moonshotai/kimi-k2.6", label:"Kimi K2.6", vendor:"Moonshot AI", tag:"Reasoning", color:"#10b981", thinking:true, webSearch:false, thinkingParam:{chat_template_kwargs:{thinking:true}}, maxTokens:56384, temperature:1.0 },
  { id:"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", label:"Nemotron Omni", vendor:"NVIDIA", tag:"Reasoning", color:"#60a5fa", thinking:true, webSearch:false, thinkingParam:{chat_template_kwargs:{enable_thinking:true},reasoning_budget:16384}, maxTokens:65536, temperature:0.6 },
   { id:"moonshotai/kimi-k2-thinking", label:"Kimi K2", vendor:"Moonshot AI", tag:"Reasoning", color:"#10b981", thinking:true, webSearch:false, thinkingParam:{chat_template_kwargs:{thinking:true}}, maxTokens:56384, temperature:1.0 },
  { id:"deepseek-ai/deepseek-v4-pro", label:"DeepSeek V4 Pro", vendor:"DeepSeek", tag:"Reasoning", color:"#a78bfa", thinking:true, webSearch:false, thinkingParam:{}, maxTokens:32768, temperature:0.6 },
  { id:"z-ai/glm-5.1", label:"glm 5.1", vendor:"z-ai", tag:"Reasoning", color:"#fbbf24", thinking:true, webSearch:false, thinkingParam:{}, maxTokens:32768, temperature:0.7 },
  { id:"mistralai/mistral-medium-3.5-128b", label:"Mistral Medium", vendor:"Mistral", tag:"General", color:"#f97316", thinking:true, webSearch:true, thinkingParam:{}, maxTokens:32768, temperature:0.7 },
  { id:"meta/llama-3.3-70b-instruct", label:"Llama 3.3 70B", vendor:"Meta", tag:"General", color:"#34d399", thinking:false, webSearch:true, thinkingParam:{}, maxTokens:32768, temperature:0.7 },
  ];

const DEFAULT_SYS = `You are MAXMIND, an elite AI assistant engineered for advanced technical and software engineering tasks. You specialize in IBM Sterling OMS, enterprise systems, complex reasoning, and developer-grade problem solving. Be precise, structured, and thorough. Always format code with proper language tags. Break down complex problems step by step.`;

const INTERNAL_SYS = `Additional behavior directives (not visible to user):
- Always structure long answers with clear headings
- For code, always specify the language and add inline comments
- When uncertain, say so explicitly
- Prefer concise answers unless complexity demands more
- Use tables for comparisons when it improves clarity`;

const LS = {
  get:(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{ return d; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} },
};
const CUSTOM_KEY = "mx_custom_v3";
const TOKEN_LOG_KEY = "mx_token_log_v1";
const fileToB64 = f => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(f); });

const estimateTokens = (text) => Math.ceil((text||"").length / 3.8);

const logTokens = (inputTxt, outputTxt, model) => {
  const now = Date.now();
  const entry = { ts: now, input: estimateTokens(inputTxt), output: estimateTokens(outputTxt), model };
  const existing = LS.get(TOKEN_LOG_KEY, []);
  existing.push(entry);
  const cutoff = now - 31 * 24 * 60 * 60 * 1000;
  LS.set(TOKEN_LOG_KEY, existing.filter(e => e.ts > cutoff));
};

/* ── ACCENT PALETTES ─────────────────────────────────────────────────────── */
const ACCENTS = {
  violet: { id:"violet", label:"Violet", acc:"#7C3AED", acc2:"#6D28D9", accBg:"rgba(124,58,237,0.1)", accBd:"rgba(124,58,237,0.25)", glow:"rgba(124,58,237,0.35)", dot:"#8B5CF6" },
  rose:   { id:"rose",   label:"Rose",   acc:"#E11D48", acc2:"#BE123C", accBg:"rgba(225,29,72,0.1)",  accBd:"rgba(225,29,72,0.25)",  glow:"rgba(225,29,72,0.3)",  dot:"#F43F5E" },
  green:  { id:"green",  label:"Green",  acc:"#059669", acc2:"#047857", accBg:"rgba(5,150,105,0.1)",  accBd:"rgba(5,150,105,0.25)",  glow:"rgba(5,150,105,0.3)",  dot:"#10B981" },
};

/* ── THEMES ─────────────────────────────────────────────────────────────── */
const buildTheme = (base, accent) => {
  const a = ACCENTS[accent] || ACCENTS.violet;
  const bases = {
    dark: {
      id:"dark", label:"Dark", icon:"🌙",
      bg:"#080C12", panel:"#0D1117", sidebar:"rgba(5,8,14,0.97)",
      glass:"rgba(255,255,255,0.035)", glassH:"rgba(255,255,255,0.065)",
      bd:"rgba(255,255,255,0.07)", bdH:"rgba(255,255,255,0.14)",
      tx:"#EEF2FF", sub:"#64748B", dim:"rgba(255,255,255,0.08)",
      codeBg:"#060810", codeTx:"#C4B5FD", codeHdr:"rgba(255,255,255,0.03)",
      thBg:"rgba(124,58,237,0.07)", thBd:"rgba(124,58,237,0.2)", thTx:"#A78BFA",
      inBg:"rgba(255,255,255,0.04)", inBd:"rgba(255,255,255,0.08)",
      scroll:"rgba(255,255,255,0.07)",
      uBg:`linear-gradient(135deg,${a.accBg},rgba(255,255,255,0.03))`, uBd:a.accBd,
      aBg:"rgba(255,255,255,0.03)", aBd:"rgba(255,255,255,0.06)",
      blob1:"rgba(124,58,237,0.13)", blob2:"rgba(109,40,217,0.08)", blob3:"rgba(59,130,246,0.07)",
    },
    light: {
      id:"light", label:"Light", icon:"☀️",
      bg:"#F1F4FA", panel:"#FFFFFF", sidebar:"rgba(237,241,250,0.98)",
      glass:"rgba(0,0,0,0.035)", glassH:"rgba(0,0,0,0.065)",
      bd:"rgba(0,0,0,0.085)", bdH:"rgba(0,0,0,0.18)",
      tx:"#0F172A", sub:"#64748B", dim:"rgba(0,0,0,0.06)",
      codeBg:"#1A1626", codeTx:"#C4B5FD", codeHdr:"rgba(255,255,255,0.05)",
      thBg:"rgba(124,58,237,0.05)", thBd:"rgba(124,58,237,0.16)", thTx:"#6D28D9",
      inBg:"rgba(0,0,0,0.035)", inBd:"rgba(0,0,0,0.09)",
      scroll:"rgba(0,0,0,0.1)",
      uBg:`linear-gradient(135deg,${a.accBg},rgba(0,0,0,0.02))`, uBd:a.accBd,
      aBg:"rgba(0,0,0,0.022)", aBd:"rgba(0,0,0,0.065)",
      blob1:"rgba(124,58,237,0.07)", blob2:"rgba(109,40,217,0.05)", blob3:"rgba(59,130,246,0.04)",
    },
    oled: {
      id:"oled", label:"OLED", icon:"⬛",
      bg:"#000000", panel:"#070707", sidebar:"rgba(0,0,0,0.99)",
      glass:"rgba(255,255,255,0.022)", glassH:"rgba(255,255,255,0.045)",
      bd:"rgba(255,255,255,0.055)", bdH:"rgba(255,255,255,0.1)",
      tx:"#E2E8F0", sub:"#334155", dim:"rgba(255,255,255,0.055)",
      codeBg:"#020202", codeTx:"#C4B5FD", codeHdr:"rgba(255,255,255,0.025)",
      thBg:"rgba(124,58,237,0.07)", thBd:"rgba(124,58,237,0.18)", thTx:"#A78BFA",
      inBg:"rgba(255,255,255,0.022)", inBd:"rgba(255,255,255,0.055)",
      scroll:"rgba(255,255,255,0.055)",
      uBg:`linear-gradient(135deg,${a.accBg},rgba(255,255,255,0.015))`, uBd:a.accBd,
      aBg:"rgba(255,255,255,0.022)", aBd:"rgba(255,255,255,0.045)",
      blob1:"rgba(124,58,237,0.1)", blob2:"rgba(109,40,217,0.07)", blob3:"rgba(59,130,246,0.05)",
    }
  };
  return { ...bases[base]||bases.dark, ...a };
};

const ThemeCtx = createContext(null);
const useThm = () => useContext(ThemeCtx);

/* ── WEB SEARCH (Brave via public CORS proxy) ────────────────────────────── */
const searchWeb = async (query) => {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await res.json();
    const results = [];
    if (data.AbstractText) results.push({ title: data.Heading||"Summary", snippet: data.AbstractText, url: data.AbstractURL });
    (data.RelatedTopics||[]).slice(0,4).forEach(t => {
      if (t.Text && t.FirstURL) results.push({ title: t.Text.split(" - ")[0]||"Result", snippet: t.Text, url: t.FirstURL });
    });
    return results.slice(0,5);
  } catch { return []; }
};

/* ── MARKDOWN PARSER ────────────────────────────────────────────────────── */
function parseInline(text, pkey) {
  if (!text) return null;
  const parts = [];
  const re = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|~~[^~]+~~)/g;
  let last=0, i=0, m;
  while ((m=re.exec(text))!==null) {
    if (m.index>last) parts.push(<span key={`${pkey}-t${i++}`}>{text.slice(last,m.index)}</span>);
    const tok=m[0];
    if (tok.startsWith('***')) parts.push(<strong key={`${pkey}-t${i++}`}><em>{tok.slice(3,-3)}</em></strong>);
    else if (tok.startsWith('**')) parts.push(<strong key={`${pkey}-t${i++}`}>{tok.slice(2,-2)}</strong>);
    else if (tok.startsWith('*')) parts.push(<em key={`${pkey}-t${i++}`}>{tok.slice(1,-1)}</em>);
    else if (tok.startsWith('`')) parts.push(<code key={`${pkey}-t${i++}`} className="mxi">{tok.slice(1,-1)}</code>);
    else if (tok.startsWith('~~')) parts.push(<del key={`${pkey}-t${i++}`}>{tok.slice(2,-2)}</del>);
    else if (tok.startsWith('[')) {
      const lm=tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if(lm) parts.push(<a key={`${pkey}-t${i++}`} href={lm[2]} target="_blank" rel="noreferrer" className="mxa">{lm[1]}</a>);
    }
    last=m.index+m[0].length;
  }
  if (last<text.length) parts.push(<span key={`${pkey}-t${i}`}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

function TextBlock({ text, bkey }) {
  const lines = text.split('\n');
  const out=[]; let i=0, ek=0;
  while (i<lines.length) {
    const line=lines[i]; const k=`${bkey}-${ek++}`;
    if (!line.trim()) { out.push(<div key={k} style={{height:'6px'}}/>); i++; continue; }
    const hm=line.match(/^(#{1,6}) (.+)/);
    if (hm) {
      const lvl=hm[1].length;
      const sizes=["22px","18px","15px","14px","13px","12px"];
      const weights=[800,700,600,600,600,600];
      out.push(<div key={k} style={{fontSize:sizes[lvl-1],fontWeight:weights[lvl-1],margin:`${lvl===1?'18px':'12px'} 0 6px`,lineHeight:1.3,letterSpacing:lvl<=2?"-0.02em":0}}>{parseInline(hm[2],k)}</div>);
      i++; continue;
    }
    if (/^[-*+] /.test(line)) {
      const items=[]; let ik=0;
      while(i<lines.length && /^[-*+] /.test(lines[i])) {
        items.push(<li key={ik++}>{parseInline(lines[i].slice(2),`${k}-li${ik}`)}</li>);
        i++;
      }
      out.push(<ul key={k} className="mdl">{items}</ul>); continue;
    }
    if (/^\d+\. /.test(line)) {
      const items=[]; let ik=0;
      while(i<lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={ik++}>{parseInline(lines[i].replace(/^\d+\.\s/,''),`${k}-li${ik}`)}</li>);
        i++;
      }
      out.push(<ol key={k} className="mdl">{items}</ol>); continue;
    }
    if (line.startsWith('> ')) { out.push(<blockquote key={k} className="mdbq">{parseInline(line.slice(2),k)}</blockquote>); i++; continue; }
    if (/^---+$/.test(line.trim())) { out.push(<hr key={k} className="mdhr"/>); i++; continue; }
    out.push(<p key={k} style={{margin:'0 0 6px',lineHeight:1.8}}>{parseInline(line,k)}</p>);
    i++;
  }
  return <>{out}</>;
}

function CodeBlock({ lang, code }) {
  const t=useThm();
  const [copied,setCopied]=useState(false);
  const copy=()=>{ navigator.clipboard.writeText(code).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); };
  return (
    <div style={{background:t.codeBg,border:`1px solid ${t.bd}`,borderRadius:'12px',overflow:'hidden',margin:'10px 0',fontFamily:"'JetBrains Mono',monospace"}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 14px',background:t.codeHdr,borderBottom:`1px solid ${t.bd}`}}>
        <span style={{fontSize:'10px',color:t.sub,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>{lang||'code'}</span>
        <button onClick={copy} style={{background:copied?`rgba(16,185,129,0.12)`:`rgba(255,255,255,0.04)`,border:`1px solid ${copied?'rgba(16,185,129,0.3)':t.bd}`,color:copied?'#10b981':t.sub,borderRadius:'6px',padding:'3px 10px',cursor:'pointer',fontSize:'11px',fontFamily:'inherit',fontWeight:600,transition:'all 0.2s'}}>
          {copied?'✓ Copied':'Copy'}
        </button>
      </div>
      <pre style={{margin:0,padding:'16px',overflowX:'auto'}}>
        <code style={{color:t.codeTx,fontSize:'13px',lineHeight:1.7,display:'block',whiteSpace:'pre'}}>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownRenderer({ content }) {
  const segments = useMemo(() => {
    if (!content) return [];
    const parts=[]; const re=/```(\w*)\n?([\s\S]*?)```/g;
    let last=0, key=0, m;
    while ((m=re.exec(content))!==null) {
      if (m.index>last) parts.push({type:'text',val:content.slice(last,m.index),key:key++});
      parts.push({type:'code',lang:m[1]||'',code:m[2].trim(),key:key++});
      last=m.index+m[0].length;
    }
    if (last<content.length) parts.push({type:'text',val:content.slice(last),key:key++});
    return parts;
  }, [content]);
  return (
    <div className="md-root">
      {segments.map(s=>s.type==='code'
        ? <CodeBlock key={s.key} lang={s.lang} code={s.code}/>
        : <TextBlock key={s.key} text={s.val} bkey={s.key}/>
      )}
    </div>
  );
}

/* ── ICONS ──────────────────────────────────────────────────────────────── */
const Ic=({n,s=16,c="currentColor"})=>(
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {n==='send'&&<><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></>}
    {n==='plus'&&<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
    {n==='trash'&&<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>}
    {n==='settings'&&<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}
    {n==='cd'&&<polyline points="6 9 12 15 18 9"/>}
    {n==='cr'&&<polyline points="9 18 15 12 9 6"/>}
    {n==='x'&&<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
    {n==='menu'&&<><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/></>}
    {n==='stop'&&<rect x="4" y="4" width="16" height="16" rx="3"/>}
    {n==='dl'&&<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}
    {n==='key'&&<><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>}
    {n==='attach'&&<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>}
    {n==='brain'&&<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>}
    {n==='msg'&&<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>}
    {n==='check'&&<polyline points="20 6 9 17 4 12"/>}
    {n==='chart'&&<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
    {n==='search'&&<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}
    {n==='link'&&<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>}
    {n==='edit'&&<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>}
    {n==='pin'&&<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}
    {n==='globe'&&<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>}
    {n==='tok'&&<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></>}
    {n==='palette'&&<><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01a.566.566 0 0 1-.11-.64c.1-.23.38-.35.71-.35H16c3.31 0 6-2.69 6-6 0-4.96-4.48-9-10-9z"/></>}
  </svg>
);

/* ── LOGO ────────────────────────────────────────────────────────────────── */
const MaxMindLogo=({size=32,glow=false,accent="#7C3AED"})=>(
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={glow?{filter:`drop-shadow(0 0 16px ${accent}aa)`}:{}}>
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={accent}/><stop offset="100%" stopColor={accent+"bb"}/></linearGradient>
      <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.95"/><stop offset="100%" stopColor="#fff" stopOpacity="0.75"/></linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#lg1)"/>
    <path d="M7 29V13l7.5 8.5 5.5-7.5 5.5 7.5L33 13v16" stroke="url(#lg2)" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="20" cy="9.5" r="2.3" fill="rgba(255,255,255,0.9)"/>
  </svg>
);

/* ── ANIMATED BG ─────────────────────────────────────────────────────────── */
function AiBg() {
  const t=useThm();
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
      <div className="blob b1" style={{background:`radial-gradient(ellipse,${t.blob1} 0%,transparent 68%)`}}/>
      <div className="blob b2" style={{background:`radial-gradient(ellipse,${t.blob2} 0%,transparent 65%)`}}/>
      <div className="blob b3" style={{background:`radial-gradient(ellipse,${t.blob3} 0%,transparent 70%)`}}/>
    </div>
  );
}

/* ── TOKEN DASHBOARD ─────────────────────────────────────────────────────── */
function TokenDashboard({onClose}) {
  const t=useThm();
  const logs = LS.get(TOKEN_LOG_KEY, []);
  const now = Date.now();
  const ranges = [
    { label:"Today", cutoff: now - 24*60*60*1000 },
    { label:"Yesterday", cutoff: now - 48*60*60*1000, end: now - 24*60*60*1000 },
    { label:"Last 7 days", cutoff: now - 7*24*60*60*1000 },
    { label:"Last 30 days", cutoff: now - 30*24*60*60*1000 },
  ];
  const calc = (cutoff, end) => {
    const filtered = logs.filter(l => l.ts >= cutoff && (end ? l.ts < end : true));
    const input = filtered.reduce((s,l) => s + l.input, 0);
    const output = filtered.reduce((s,l) => s + l.output, 0);
    return { msgs: filtered.length, input, output, total: input + output };
  };
  const stats = ranges.map(r => ({ ...r, ...calc(r.cutoff, r.end) }));

  // By model
  const byModel = {};
  logs.filter(l => l.ts >= now - 30*24*60*60*1000).forEach(l => {
    if (!byModel[l.model]) byModel[l.model] = { input:0, output:0, msgs:0 };
    byModel[l.model].input += l.input; byModel[l.model].output += l.output; byModel[l.model].msgs++;
  });
  const modelList = Object.entries(byModel).sort((a,b) => (b[1].input+b[1].output) - (a[1].input+a[1].output));
  const maxTotal = modelList[0] ? modelList[0][1].input + modelList[0][1].output : 1;

  const statCard = (label, value, sub) => (
    <div style={{background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"14px",padding:"16px 18px",flex:1,minWidth:"120px"}}>
      <div style={{fontSize:"10px",color:t.sub,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:"8px"}}>{label}</div>
      <div style={{fontSize:"24px",fontWeight:800,color:t.tx,letterSpacing:"-0.02em"}}>{value.toLocaleString()}</div>
      {sub && <div style={{fontSize:"11px",color:t.sub,marginTop:"4px"}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"680px",background:t.panel,borderRadius:"24px 24px 0 0",border:`1px solid ${t.bd}`,borderBottom:"none",padding:"0",maxHeight:"85vh",overflowY:"auto",zIndex:1,boxShadow:`0 -20px 60px rgba(0,0,0,0.5)`}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"22px 24px 16px",borderBottom:`1px solid ${t.bd}`,position:"sticky",top:0,background:t.panel,zIndex:2,backdropFilter:"blur(20px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <Ic n="tok" s={18} c={t.acc}/>
            <div>
              <div style={{fontWeight:800,fontSize:"16px",color:t.tx}}>Token Usage</div>
              <div style={{fontSize:"11px",color:t.sub}}>Estimated — based on local message history</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:"6px"}}><Ic n="x" s={17} c={t.sub}/></button>
        </div>

        <div style={{padding:"22px 24px",display:"flex",flexDirection:"column",gap:"24px"}}>
          {/* Range stats */}
          <div>
            <div style={{fontSize:"11px",fontWeight:700,color:t.sub,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>Usage by period</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"10px"}}>
              {stats.map(s=>(
                <div key={s.label} style={{background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"14px",padding:"14px 16px"}}>
                  <div style={{fontSize:"10px",color:t.sub,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,marginBottom:"8px"}}>{s.label}</div>
                  <div style={{fontSize:"20px",fontWeight:800,color:t.tx,letterSpacing:"-0.02em"}}>{s.total.toLocaleString()}</div>
                  <div style={{fontSize:"10.5px",color:t.sub,marginTop:"4px"}}>{s.msgs} messages</div>
                  <div style={{display:"flex",gap:"6px",marginTop:"8px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"9.5px",background:t.accBg,color:t.acc,border:`1px solid ${t.accBd}`,borderRadius:"4px",padding:"2px 6px"}}>↑ {s.input.toLocaleString()}</span>
                    <span style={{fontSize:"9.5px",background:"rgba(16,185,129,0.08)",color:"#10b981",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"4px",padding:"2px 6px"}}>↓ {s.output.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By model */}
          {modelList.length > 0 && (
            <div>
              <div style={{fontSize:"11px",fontWeight:700,color:t.sub,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>By model (last 30 days)</div>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {modelList.map(([model, data]) => {
                  const total = data.input + data.output;
                  const pct = Math.round((total / maxTotal) * 100);
                  const m = MODELS.find(x => x.id === model);
                  return (
                    <div key={model} style={{background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"12px",padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                          <span style={{width:"7px",height:"7px",borderRadius:"50%",background:m?.color||t.acc,display:"inline-block"}}/>
                          <span style={{fontSize:"12.5px",color:t.tx,fontWeight:600}}>{m?.label||model}</span>
                          <span style={{fontSize:"10px",color:t.sub}}>{data.msgs} msgs</span>
                        </div>
                        <span style={{fontSize:"12px",color:t.tx,fontWeight:700}}>{total.toLocaleString()} tok</span>
                      </div>
                      <div style={{height:"3px",background:t.dim,borderRadius:"2px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${t.acc},${t.acc2})`,borderRadius:"2px",transition:"width 0.6s ease"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {logs.length === 0 && (
            <div style={{textAlign:"center",padding:"40px 0",color:t.sub}}>
              <Ic n="tok" s={32} c={t.dim}/>
              <div style={{marginTop:"12px",fontSize:"13px"}}>No usage data yet. Start chatting!</div>
            </div>
          )}

          <div style={{fontSize:"10px",color:t.dim,textAlign:"center",borderTop:`1px solid ${t.bd}`,paddingTop:"12px"}}>
            Token counts are estimates (~3.8 chars/token). Actual billing may differ. All data is local only.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CHAT MANAGER MODAL ──────────────────────────────────────────────────── */
function ChatManager({chats, activeId, onSelect, onDelete, onRename, onExport, onClose}) {
  const t=useThm();
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const filtered = chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  const totalMsgs = chats.reduce((s,c) => s + (c.messages?.length||0), 0);

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:"560px",background:t.panel,borderRadius:"20px",border:`1px solid ${t.bd}`,maxHeight:"80vh",display:"flex",flexDirection:"column",zIndex:1,boxShadow:`0 20px 60px rgba(0,0,0,0.5)`,margin:"20px"}}>
        <div style={{padding:"20px 22px 16px",borderBottom:`1px solid ${t.bd}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
            <div>
              <div style={{fontWeight:800,fontSize:"16px",color:t.tx}}>Chat Manager</div>
              <div style={{fontSize:"11px",color:t.sub,marginTop:"2px"}}>{chats.length} conversations · {totalMsgs} messages</div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:"6px"}}><Ic n="x" s={17} c={t.sub}/></button>
          </div>
          <div style={{position:"relative"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations…"
              style={{width:"100%",background:t.inBg,border:`1px solid ${t.inBd}`,borderRadius:"10px",padding:"9px 13px 9px 36px",color:t.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            <div style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)"}}><Ic n="search" s={14} c={t.sub}/></div>
          </div>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.length === 0 && (
            <div style={{padding:"40px",textAlign:"center",color:t.sub,fontSize:"13px"}}>No conversations found</div>
          )}
          {filtered.map(c => (
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 18px",borderBottom:`1px solid ${t.bd}`,cursor:"pointer",transition:"background 0.12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=t.glass}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div onClick={()=>{onSelect(c.id);onClose();}} style={{flex:1,minWidth:0}}>
                {renaming===c.id ? (
                  <input value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){onRename(c.id,renameVal);setRenaming(null);}if(e.key==="Escape")setRenaming(null);}}
                    onClick={e=>e.stopPropagation()}
                    autoFocus
                    style={{background:t.inBg,border:`1px solid ${t.acc}`,borderRadius:"6px",padding:"4px 8px",color:t.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",width:"100%"}}/>
                ) : (
                  <>
                    <div style={{fontSize:"13px",color:activeId===c.id?t.acc:t.tx,fontWeight:activeId===c.id?700:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    <div style={{fontSize:"11px",color:t.sub,marginTop:"2px"}}>{c.messages?.length||0} messages</div>
                  </>
                )}
              </div>
              <div style={{display:"flex",gap:"4px",flexShrink:0}}>
                <button title="Rename" onClick={e=>{e.stopPropagation();setRenaming(c.id);setRenameVal(c.title);}}
                  style={{background:"none",border:"none",cursor:"pointer",padding:"5px",borderRadius:"6px",opacity:0.5,transition:"opacity 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.5"}>
                  <Ic n="edit" s={13} c={t.sub}/>
                </button>
                <button title="Export" onClick={e=>{e.stopPropagation();onExport(c.id);}}
                  style={{background:"none",border:"none",cursor:"pointer",padding:"5px",borderRadius:"6px",opacity:0.5,transition:"opacity 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.5"}>
                  <Ic n="dl" s={13} c={t.sub}/>
                </button>
                <button title="Delete" onClick={e=>{e.stopPropagation();onDelete(c.id);}}
                  style={{background:"none",border:"none",cursor:"pointer",padding:"5px",borderRadius:"6px",opacity:0.5,transition:"opacity 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.5"}>
                  <Ic n="trash" s={13} c="#ef4444"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── SEARCH RESULTS PILL ─────────────────────────────────────────────────── */
function SearchResultsPill({results, onClose}) {
  const t=useThm();
  const [open,setOpen]=useState(false);
  if(!results||!results.length) return null;
  return (
    <div style={{marginBottom:"10px"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"inline-flex",alignItems:"center",gap:"7px",background:`rgba(59,130,246,0.08)`,border:"1px solid rgba(59,130,246,0.25)",color:"#60a5fa",borderRadius:"20px",padding:"5px 13px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:600}}>
        <Ic n="globe" s={13} c="#60a5fa"/>
        {results.length} web results
        <Ic n={open?"cd":"cr"} s={12} c="#60a5fa"/>
      </button>
      {open && (
        <div style={{marginTop:"8px",background:t.panel,border:`1px solid ${t.bd}`,borderRadius:"12px",overflow:"hidden"}}>
          {results.map((r,i)=>(
            <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{display:"flex",gap:"10px",padding:"10px 14px",borderBottom:i<results.length-1?`1px solid ${t.bd}`:"none",textDecoration:"none",transition:"background 0.12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=t.glass}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <Ic n="link" s={13} c={t.sub}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:"12.5px",color:t.acc,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                <div style={{fontSize:"11px",color:t.sub,marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.snippet}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── UI PRIMITIVES ───────────────────────────────────────────────────────── */
const Toggle=({on,onChange,small})=>{
  const t=useThm();
  return (
    <div onClick={()=>onChange(!on)} style={{width:small?"34px":"44px",height:small?"18px":"24px",borderRadius:"12px",background:on?`linear-gradient(135deg,${t.acc},${t.acc2})`:`rgba(255,255,255,0.08)`,cursor:"pointer",position:"relative",transition:"background 0.25s",border:`1px solid ${on?t.accBd:t.bd}`,flexShrink:0}}>
      <div style={{position:"absolute",top:small?"3px":"3px",left:on?(small?"18px":"22px"):"3px",width:small?"10px":"16px",height:small?"10px":"16px",borderRadius:"50%",background:"#fff",transition:"left 0.22s",boxShadow:"0 1px 4px rgba(0,0,0,0.35)"}}/>
    </div>
  );
};

function ThemeToggle({themeId,setThemeId,accentId,setAccentId}) {
  const t=useThm();
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
      <div style={{display:"flex",gap:"4px",background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"10px",padding:"4px"}}>
        {["dark","light","oled"].map(id=>(
          <button key={id} onClick={()=>setThemeId(id)}
            style={{padding:"5px 9px",borderRadius:"7px",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:"11px",fontWeight:600,background:themeId===id?`linear-gradient(135deg,${t.acc},${t.acc2})`:"transparent",color:themeId===id?"#fff":t.sub,transition:"all 0.18s"}}>
            {id==="dark"?"🌙":id==="light"?"☀️":"⬛"} {id.charAt(0).toUpperCase()+id.slice(1)}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:"6px",padding:"2px 0"}}>
        {Object.entries(ACCENTS).map(([id,a])=>(
          <button key={id} onClick={()=>setAccentId(id)} title={a.label}
            style={{width:"24px",height:"24px",borderRadius:"50%",background:a.acc,border:accentId===id?`2px solid ${t.tx}`:`2px solid transparent`,cursor:"pointer",transition:"all 0.18s",boxShadow:accentId===id?`0 0 0 2px ${a.acc}44`:"none"}}>
          </button>
        ))}
      </div>
    </div>
  );
}

const Field=({label,hint,children})=>{
  const t=useThm();
  return (
    <div>
      <div style={{fontSize:"10px",fontWeight:700,color:t.sub,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"8px"}}>{label}</div>
      {children}
      {hint&&<div style={{fontSize:"11px",color:t.dim,marginTop:"5px"}}>{hint}</div>}
    </div>
  );
};

/* ── THINK BLOCK ─────────────────────────────────────────────────────────── */
function ThinkBlock({content,streaming}) {
  const t=useThm();
  const [open,setOpen]=useState(false);
  return (
    <div style={{marginBottom:"12px"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{display:"inline-flex",alignItems:"center",gap:"7px",background:t.thBg,border:`1px solid ${t.thBd}`,color:t.thTx,borderRadius:"20px",padding:"5px 13px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:600,transition:"all 0.2s"}}>
        <Ic n="brain" s={13} c={t.thTx}/>
        {streaming?<span style={{animation:"pulse 1.4s infinite"}}>Reasoning…</span>:"Reasoning trace"}
        <Ic n={open?"cd":"cr"} s={12} c={t.thTx}/>
      </button>
      {open&&(
        <div style={{marginTop:"8px",background:t.thBg,border:`1px solid ${t.thBd}`,borderRadius:"12px",padding:"13px 16px",fontSize:"12px",lineHeight:"1.75",color:t.thTx,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"pre-wrap",overflowX:"auto",maxHeight:"320px",overflowY:"auto"}}>
          {content||"…"}
        </div>
      )}
    </div>
  );
}

/* ── MESSAGE ─────────────────────────────────────────────────────────────── */
function Message({msg}) {
  const t=useThm();
  const isUser=msg.role==="user";
  return (
    <div className="msg-in" style={{display:"flex",gap:"12px",marginBottom:"24px",flexDirection:isUser?"row-reverse":"row",alignItems:"flex-start"}}>
      {isUser?(
        <div style={{width:"32px",height:"32px",borderRadius:"10px",background:t.accBg,border:`1px solid ${t.accBd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"13px"}}>👤</div>
      ):(
        <div style={{flexShrink:0,marginTop:"1px"}}><MaxMindLogo size={32} accent={t.acc}/></div>
      )}
      <div style={{maxWidth:"82%",minWidth:0,display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start"}}>
        <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"5px"}}>
          <span style={{fontSize:"10.5px",fontWeight:800,color:isUser?t.acc:t.sub,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"'Syne',sans-serif"}}>
            {isUser?"You":"MAXMIND"}
          </span>
          {!isUser&&msg.model&&(
            <span style={{fontSize:"9.5px",color:t.sub,background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"4px",padding:"1px 6px"}}>{msg.model}</span>
          )}
          {!isUser&&msg.webSearched&&(
            <span style={{fontSize:"9.5px",color:"#60a5fa",background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:"4px",padding:"1px 6px",display:"inline-flex",alignItems:"center",gap:"3px"}}><Ic n="globe" s={9} c="#60a5fa"/> Web</span>
          )}
        </div>

        {msg.searchResults&&<SearchResultsPill results={msg.searchResults}/>}

        {(msg.thinking||(msg.streaming&&!msg.content))&&msg.role==="assistant"&&(
          <ThinkBlock content={msg.thinking||""} streaming={msg.streaming&&!msg.content}/>
        )}

        {msg.imageUrl&&(
          <div style={{marginBottom:"8px"}}>
            <img src={msg.imageUrl} alt="attachment" style={{maxWidth:"240px",maxHeight:"160px",borderRadius:"10px",border:`1px solid ${t.bd}`,objectFit:"cover"}}/>
          </div>
        )}

        {(msg.content||(msg.streaming&&!msg.thinking))&&(
          <div style={{background:isUser?t.uBg:t.aBg,border:`1px solid ${isUser?t.uBd:t.aBd}`,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRadius:isUser?"16px 16px 4px 16px":"4px 16px 16px 16px",padding:"13px 16px",maxWidth:"100%",boxSizing:"border-box"}}>
            {msg.streaming&&!msg.content?(
              <div style={{display:"flex",gap:"5px",alignItems:"center",padding:"2px 0"}}>
                {[0,1,2].map(i=><div key={i} style={{width:"7px",height:"7px",borderRadius:"50%",background:t.acc,animation:`typeBounce 1.2s ease-in-out infinite`,animationDelay:`${i*0.15}s`}}/>)}
              </div>
            ):(
              <MarkdownRenderer content={msg.content}/>
            )}
          </div>
        )}

        {!isUser&&msg.content&&!msg.streaming&&(
          <button onClick={()=>navigator.clipboard.writeText(msg.content)}
            style={{marginTop:"6px",display:"inline-flex",alignItems:"center",gap:"4px",background:"transparent",border:`1px solid ${t.bd}`,color:t.sub,borderRadius:"6px",padding:"3px 9px",cursor:"pointer",fontSize:"11px",fontFamily:"inherit",transition:"all 0.18s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=t.acc;e.currentTarget.style.color=t.acc;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=t.bd;e.currentTarget.style.color=t.sub;}}>
            <Ic n="check" s={11} c="currentColor"/> Copy
          </button>
        )}
      </div>
    </div>
  );
}

/* ── MODEL PICKER ────────────────────────────────────────────────────────── */
function ModelPicker({selected,onChange,models}) {
  const t=useThm();
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const m=models.find(x=>x.id===selected)||models[0];
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:"8px",background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"10px",padding:"7px 12px",cursor:"pointer",color:t.tx,fontFamily:"inherit",fontSize:"13px",fontWeight:500,transition:"all 0.18s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=t.bdH}
        onMouseLeave={e=>e.currentTarget.style.borderColor=t.bd}>
        <span style={{width:"8px",height:"8px",borderRadius:"50%",background:m.color,boxShadow:`0 0 8px ${m.color}99`,flexShrink:0}}/>
        <span style={{maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</span>
        <span style={{fontSize:"9.5px",color:m.tag==="Reasoning"?"#a78bfa":"#34d399",background:m.tag==="Reasoning"?"rgba(167,139,250,0.1)":"rgba(52,211,153,0.1)",border:`1px solid ${m.tag==="Reasoning"?"rgba(167,139,250,0.22)":"rgba(52,211,153,0.22)"}`,borderRadius:"4px",padding:"1px 5px",whiteSpace:"nowrap"}}>{m.tag}</span>
        <Ic n="cd" s={13} c={t.sub}/>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,background:t.panel,border:`1px solid ${t.bd}`,borderRadius:"14px",overflow:"hidden",width:"280px",zIndex:100,boxShadow:`0 20px 60px rgba(0,0,0,0.5)`,backdropFilter:"blur(24px)"}}>
          <div style={{padding:"6px"}}>
            {models.map(mod=>(
              <div key={mod.id} onClick={()=>{onChange(mod.id);setOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 11px",borderRadius:"9px",cursor:"pointer",background:selected===mod.id?t.accBg:"transparent",transition:"background 0.12s"}}
                onMouseEnter={e=>{if(selected!==mod.id)e.currentTarget.style.background=t.glass;}}
                onMouseLeave={e=>{if(selected!==mod.id)e.currentTarget.style.background="transparent";}}>
                <span style={{width:"9px",height:"9px",borderRadius:"50%",background:mod.color,boxShadow:`0 0 8px ${mod.color}88`,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"13px",color:t.tx,fontWeight:500}}>{mod.label}</div>
                  <div style={{fontSize:"10.5px",color:t.sub,marginTop:"1px"}}>{mod.vendor} · {mod.webSearch?"🌐 Web search":"No web"}</div>
                </div>
                <span style={{fontSize:"9.5px",color:mod.tag==="Reasoning"?"#a78bfa":"#34d399",background:mod.tag==="Reasoning"?"rgba(167,139,250,0.1)":"rgba(52,211,153,0.1)",border:`1px solid ${mod.tag==="Reasoning"?"rgba(167,139,250,0.2)":"rgba(52,211,153,0.2)"}`,borderRadius:"4px",padding:"2px 6px",whiteSpace:"nowrap"}}>{mod.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SIDEBAR ─────────────────────────────────────────────────────────────── */
function Sidebar({chats,activeId,onSelect,onNew,onDelete,collapsed,onToggle,isMobile,onClose,onOpenManager}) {
  const t=useThm();
  const w=collapsed&&!isMobile?"60px":"248px";
  return (
    <>
      {isMobile&&!collapsed&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:49,backdropFilter:"blur(4px)"}}/>}
      <div style={{
        width:isMobile?"248px":w,
        position:isMobile?"fixed":"relative",
        left:isMobile?(collapsed?"-260px":"0"):"auto",
        top:0,bottom:0,zIndex:isMobile?50:"auto",
        background:t.sidebar,
        borderRight:`1px solid ${t.bd}`,
        display:"flex",flexDirection:"column",
        transition:"width 0.22s cubic-bezier(0.4,0,0.2,1), left 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow:"hidden",flexShrink:0,
        backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
      }}>
        <div style={{padding:"16px 12px 12px",borderBottom:`1px solid ${t.bd}`,display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{flexShrink:0}}><MaxMindLogo size={30} accent={t.acc}/></div>
          {(!collapsed||isMobile)&&<span className="maxmind-font" style={{fontWeight:900,fontSize:"17px",letterSpacing:"-0.01em",color:t.acc,whiteSpace:"nowrap",flex:1,fontFamily:"'Syne',sans-serif"}}>MAXMIND</span>}
          <button onClick={isMobile?onClose:onToggle} style={{background:"none",border:"none",cursor:"pointer",padding:"5px",borderRadius:"7px",display:"flex",marginLeft:"auto"}}>
            <Ic n={isMobile?"x":"menu"} s={15} c={t.sub}/>
          </button>
        </div>
        <div style={{padding:"10px 8px 4px"}}>
          <button onClick={onNew} style={{width:"100%",background:t.accBg,border:`1px solid ${t.accBd}`,borderRadius:"10px",padding:(collapsed&&!isMobile)?"9px":"9px 13px",cursor:"pointer",color:t.acc,display:"flex",alignItems:"center",gap:"8px",justifyContent:(collapsed&&!isMobile)?"center":"flex-start",fontFamily:"inherit",fontSize:"13px",fontWeight:600,transition:"all 0.18s"}}
            onMouseEnter={e=>e.currentTarget.style.background=t.accBg+"ee"}
            onMouseLeave={e=>e.currentTarget.style.background=t.accBg}>
            <Ic n="plus" s={14} c={t.acc}/>{(!collapsed||isMobile)&&"New Chat"}
          </button>
        </div>
        {(!collapsed||isMobile)&&(
          <div style={{padding:"4px 8px 0"}}>
            <button onClick={onOpenManager} style={{width:"100%",background:"transparent",border:`1px solid ${t.bd}`,borderRadius:"10px",padding:"7px 13px",cursor:"pointer",color:t.sub,display:"flex",alignItems:"center",gap:"8px",fontFamily:"inherit",fontSize:"12px",fontWeight:500,transition:"all 0.18s"}}
              onMouseEnter={e=>e.currentTarget.style.background=t.glass}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <Ic n="edit" s={12} c={t.sub}/>Manage chats
            </button>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto",padding:"8px 8px 8px"}}>
          {chats.length===0&&(!collapsed||isMobile)&&<div style={{padding:"20px 10px",textAlign:"center",color:t.sub,fontSize:"12px"}}>No conversations yet</div>}
          {chats.map(c=>(
            <div key={c.id} className="sb-item" onClick={()=>{onSelect(c.id);if(isMobile)onClose();}}
              style={{display:"flex",alignItems:"center",gap:"8px",padding:(collapsed&&!isMobile)?"9px":"8px 10px",borderRadius:"9px",cursor:"pointer",background:activeId===c.id?t.accBg:"transparent",border:`1px solid ${activeId===c.id?t.accBd:"transparent"}`,marginBottom:"2px",transition:"all 0.12s",justifyContent:(collapsed&&!isMobile)?"center":"flex-start"}}>
              <Ic n="msg" s={13} c={activeId===c.id?t.acc:t.dim}/>
              {(!collapsed||isMobile)&&(
                <>
                  <span style={{fontSize:"12.5px",color:activeId===c.id?t.tx:t.sub,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</span>
                  <button className="sb-del" onClick={e=>{e.stopPropagation();onDelete(c.id);}} style={{background:"none",border:"none",cursor:"pointer",padding:"3px",borderRadius:"5px",opacity:0,transition:"opacity 0.15s",flexShrink:0}}>
                    <Ic n="trash" s={11} c={t.sub}/>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── SETUP MODAL ─────────────────────────────────────────────────────────── */
function SetupModal({onSave,themeId,setThemeId,accentId,setAccentId}) {
  const t=useThm();
  const [key,setKey]=useState("");
  const [model,setModel]=useState(MODELS[0].id);
  const inp={width:"100%",background:t.inBg,border:`1px solid ${t.inBd}`,borderRadius:"10px",padding:"10px 13px",color:t.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"20px"}}>
      <AiBg/>
      <div style={{width:"100%",maxWidth:"440px",background:t.panel,border:`1px solid ${t.bd}`,borderRadius:"22px",padding:"36px 30px",backdropFilter:"blur(40px)",boxShadow:`0 40px 80px rgba(0,0,0,0.5)`,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:"14px"}}><MaxMindLogo size={54} glow accent={t.acc}/></div>
          <div className="maxmind-logotype" style={{fontSize:"32px",fontWeight:900,letterSpacing:"-0.02em",fontFamily:"'Syne',sans-serif",color:t.acc}}>MAXMIND</div>
          <div style={{fontSize:"11px",color:t.sub,marginTop:"6px",letterSpacing:"0.06em",textTransform:"uppercase"}}>Private AI Workspace · NVIDIA Powered</div>
          <div style={{display:"flex",justifyContent:"center",marginTop:"16px"}}>
            <ThemeToggle themeId={themeId} setThemeId={setThemeId} accentId={accentId} setAccentId={setAccentId}/>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <Field label="NVIDIA API Key" hint={<>Get yours at <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" style={{color:t.acc}}>build.nvidia.com</a></>}>
            <div style={{position:"relative"}}>
              <input value={key} onChange={e=>setKey(e.target.value)} type="password" placeholder="nvapi-…" style={{...inp,paddingLeft:"38px"}} onFocus={e=>e.target.style.borderColor=t.acc} onBlur={e=>e.target.style.borderColor=t.inBd}/>
              <div style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)"}}><Ic n="key" s={14} c={t.sub}/></div>
            </div>
          </Field>
          <Field label="Starting Model">
            <select value={model} onChange={e=>setModel(e.target.value)} style={{...inp,cursor:"pointer"}}>
              {MODELS.map(m=><option key={m.id} value={m.id}>{m.label} · {m.vendor} ({m.tag})</option>)}
            </select>
          </Field>
          <button disabled={!key.trim()} onClick={()=>onSave(key.trim(),model)}
            style={{marginTop:"6px",background:key.trim()?`linear-gradient(135deg,${t.acc},${t.acc2})`:`rgba(255,255,255,0.04)`,color:key.trim()?"#fff":t.dim,border:`1px solid ${key.trim()?"transparent":t.bd}`,borderRadius:"13px",padding:"14px",cursor:key.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:"14px",fontFamily:"inherit",letterSpacing:"0.02em",transition:"all 0.2s",boxShadow:key.trim()?`0 4px 24px ${t.glow}`:"none"}}>
            Launch MAXMIND →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── SETTINGS DRAWER ─────────────────────────────────────────────────────── */
function SettingsDrawer({config,onChange,onClose,models,onAddModel,themeId,setThemeId,accentId,setAccentId}) {
  const t=useThm();
  const [loc,setLoc]=useState(config);
  const up=(k,v)=>setLoc(p=>({...p,[k]:v}));
  const [nm,setNm]=useState({id:"",label:"",vendor:"",tag:"General"});
  const inp={width:"100%",background:t.inBg,border:`1px solid ${t.inBd}`,borderRadius:"10px",padding:"10px 13px",color:t.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,zIndex:200}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}/>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:"100%",maxWidth:"440px",background:t.panel,borderLeft:`1px solid ${t.bd}`,backdropFilter:"blur(30px)",display:"flex",flexDirection:"column",overflowY:"auto"}}>
        <div style={{padding:"20px 22px 16px",borderBottom:`1px solid ${t.bd}`,display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
          <MaxMindLogo size={28} accent={t.acc}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"15px",color:t.tx}}>Settings</div>
            <div style={{fontSize:"11px",color:t.sub,marginTop:"1px"}}>Configure your workspace</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:"5px",borderRadius:"7px"}}><Ic n="x" s={17} c={t.sub}/></button>
        </div>
        <div style={{padding:"22px",display:"flex",flexDirection:"column",gap:"20px",flex:1}}>
          <Field label="Appearance">
            <ThemeToggle themeId={themeId} setThemeId={setThemeId} accentId={accentId} setAccentId={setAccentId}/>
          </Field>
          <Field label="NVIDIA API Key" hint="Stored in browser localStorage only">
            <input type="password" value={loc.apiKey} onChange={e=>up("apiKey",e.target.value)} placeholder="nvapi-…" style={inp} onFocus={e=>e.target.style.borderColor=t.acc} onBlur={e=>e.target.style.borderColor=t.inBd}/>
          </Field>
          <Field label="Default Model">
            <select value={loc.model} onChange={e=>up("model",e.target.value)} style={{...inp,cursor:"pointer"}}>
              {models.map(m=><option key={m.id} value={m.id}>{m.label} · {m.vendor}</option>)}
            </select>
          </Field>
          <Field label="Add Custom Model">
            <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
              {[["id","Model ID (vendor/model-name)"],["label","Label"],["vendor","Vendor"]].map(([k,ph])=>(
                <input key={k} value={nm[k]} onChange={e=>setNm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={inp} onFocus={e=>e.target.style.borderColor=t.acc} onBlur={e=>e.target.style.borderColor=t.inBd}/>
              ))}
              <select value={nm.tag} onChange={e=>setNm(p=>({...p,tag:e.target.value}))} style={{...inp,cursor:"pointer"}}>
                <option value="General">General</option>
                <option value="Reasoning">Reasoning</option>
              </select>
              <button disabled={!nm.id.trim()||!nm.label.trim()} onClick={()=>{onAddModel({id:nm.id.trim(),label:nm.label.trim(),vendor:nm.vendor.trim()||"Custom",tag:nm.tag,color:"#94a3b8",thinking:false,webSearch:false,thinkingParam:{},maxTokens:32768,temperature:0.7});setNm({id:"",label:"",vendor:"",tag:"General"});}}
                style={{background:t.accBg,border:`1px solid ${t.accBd}`,color:t.acc,borderRadius:"10px",padding:"10px",cursor:"pointer",fontWeight:700,fontFamily:"inherit",fontSize:"13px"}}>
                + Add Model
              </button>
            </div>
          </Field>
          <Field label={`Temperature — ${loc.temperature}`}>
            <input type="range" min="0" max="2" step="0.05" value={loc.temperature} onChange={e=>up("temperature",parseFloat(e.target.value))} style={{width:"100%",accentColor:t.acc}}/>
          </Field>
          <Field label={`Max Tokens — ${loc.maxTokens.toLocaleString()}`}>
            <input type="range" min="1024" max="65536" step="1024" value={loc.maxTokens} onChange={e=>up("maxTokens",parseInt(e.target.value))} style={{width:"100%",accentColor:t.acc}}/>
          </Field>
          <Field label="User System Prompt" hint="Visible & editable by you">
            <textarea value={loc.systemPrompt} onChange={e=>up("systemPrompt",e.target.value)} rows={5}
              style={{...inp,resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:"12px",lineHeight:"1.65",minHeight:"110px"}}
              onFocus={e=>e.target.style.borderColor=t.acc} onBlur={e=>e.target.style.borderColor=t.inBd}/>
          </Field>
          <Field label="Internal Behavior Directives" hint="Hidden system instructions — maintained internally">
            <textarea value={loc.internalPrompt||INTERNAL_SYS} onChange={e=>up("internalPrompt",e.target.value)} rows={5}
              style={{...inp,resize:"vertical",fontFamily:"'JetBrains Mono',monospace",fontSize:"12px",lineHeight:"1.65",minHeight:"110px",borderColor:t.thBd}}
              onFocus={e=>e.target.style.borderColor=t.thTx} onBlur={e=>e.target.style.borderColor=t.thBd}/>
          </Field>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:t.glass,borderRadius:"11px",border:`1px solid ${t.bd}`}}>
            <div>
              <div style={{fontSize:"13px",fontWeight:600,color:t.tx}}>Show Reasoning</div>
              <div style={{fontSize:"11px",color:t.sub,marginTop:"2px"}}>Display AI thinking trace</div>
            </div>
            <Toggle on={loc.showThinking} onChange={v=>up("showThinking",v)}/>
          </div>
          <button onClick={()=>{onChange(loc);onClose();}}
            style={{background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",border:"none",borderRadius:"12px",padding:"13px",fontWeight:700,fontSize:"14px",cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 20px ${t.glow}`}}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── EMPTY STATE ─────────────────────────────────────────────────────────── */
function EmptyState({onNewChat}) {
  const t=useThm();
  const [tick, setTick] = useState(0);
  useEffect(()=>{ const i=setInterval(()=>setTick(p=>p+1),3000); return()=>clearInterval(i); },[]);

  const phrases = ["Engineered for clarity.", "Built for the complex.", "Think deeper, ship faster.", "Your private AI workspace."];

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:"0",animation:"fadeUp 0.5s ease",padding:"40px 20px",userSelect:"none"}}>
      {/* Animated logo */}
      <div style={{position:"relative",marginBottom:"28px"}}>
        <div className="logo-ring"/>
        <div className="logo-ring logo-ring-2"/>
        <MaxMindLogo size={64} glow accent={t.acc}/>
      </div>

      {/* Wordmark */}
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:"clamp(36px,6vw,52px)",fontWeight:900,letterSpacing:"-0.03em",color:t.acc,lineHeight:1,marginBottom:"10px"}}>
        MAXMIND
      </div>

      {/* Animated tagline */}
      <div style={{height:"20px",overflow:"hidden",marginBottom:"36px"}}>
        <div key={tick} style={{fontSize:"13px",color:t.sub,letterSpacing:"0.05em",animation:"slideIn 0.4s ease",textTransform:"uppercase",fontWeight:500}}>
          {phrases[tick % phrases.length]}
        </div>
      </div>

      {/* Status line */}
      <div style={{display:"flex",alignItems:"center",gap:"20px",marginBottom:"44px"}}>
        {[["Private","🔒"],["Local Only","💾"],["NVIDIA API","⚡"]].map(([label,icon])=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"11px",color:t.sub}}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>

      {/* Start button */}
      <button onClick={onNewChat}
        style={{background:`linear-gradient(135deg,${t.acc},${t.acc2})`,color:"#fff",border:"none",borderRadius:"14px",padding:"13px 28px",fontFamily:"inherit",fontSize:"14px",fontWeight:700,cursor:"pointer",letterSpacing:"0.02em",boxShadow:`0 4px 24px ${t.glow}`,transition:"all 0.2s",transform:"translateY(0)"}}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 32px ${t.glow}`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 4px 24px ${t.glow}`;}}>
        Start a conversation →
      </button>
    </div>
  );
}

/* ── SCROLL BTN ──────────────────────────────────────────────────────────── */
function ScrollBtn({onClick}) {
  const t=useThm();
  return (
    <button onClick={onClick}
      style={{position:"absolute",bottom:"16px",left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${t.acc},${t.acc2})`,border:"none",borderRadius:"20px",padding:"7px 16px",cursor:"pointer",color:"#fff",fontSize:"12px",fontWeight:600,fontFamily:"inherit",display:"flex",alignItems:"center",gap:"6px",boxShadow:`0 4px 20px ${t.glow}`,zIndex:10,animation:"fadeUp 0.2s ease"}}>
      <Ic n="cd" s={13} c="#fff"/> Scroll to bottom
    </button>
  );
}

/* ── MAIN APP ────────────────────────────────────────────────────────────── */
export default function App() {
  const [themeId,setThemeId]=useState(()=>LS.get("mx_theme","dark"));
  const [accentId,setAccentId]=useState(()=>LS.get("mx_accent","violet"));
  const theme=useMemo(()=>buildTheme(themeId,accentId),[themeId,accentId]);
  useEffect(()=>LS.set("mx_theme",themeId),[themeId]);
  useEffect(()=>LS.set("mx_accent",accentId),[accentId]);

  const [config,setConfig]=useState(()=>LS.get("mx_cfg_v2",{apiKey:"",model:MODELS[0].id,systemPrompt:DEFAULT_SYS,internalPrompt:INTERNAL_SYS,temperature:0.7,maxTokens:16384,showThinking:true}));
  const [customModels,setCustomModels]=useState(()=>LS.get(CUSTOM_KEY,[]));
  const allModels=useMemo(()=>[...MODELS,...customModels],[customModels]);
  const [chats,setChats]=useState(()=>LS.get("mx_chats_v2",[]));
  const [activeId,setActiveId]=useState(null);
  const [showSetup,setShowSetup]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [showTokens,setShowTokens]=useState(false);
  const [showChatMgr,setShowChatMgr]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const [input,setInput]=useState("");
  const [streaming,setStreaming]=useState(false);
  const [currentModel,setCurrentModel]=useState(config.model);
  const [pendingImg,setPendingImg]=useState(null);
  const [atBottom,setAtBottom]=useState(true);
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [useThinking,setUseThinking]=useState(true);
  const [useWebSearch,setUseWebSearch]=useState(false);
  const [isSearching,setIsSearching]=useState(false);

  const abortRef=useRef(null);
  const scrollRef=useRef(null);
  const userScrolledRef=useRef(false);
  const taRef=useRef(null);
  const fileRef=useRef(null);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  useEffect(()=>{if(!config.apiKey)setShowSetup(true);},[]);
  useEffect(()=>LS.set("mx_cfg_v2",config),[config]);
  useEffect(()=>LS.set("mx_chats_v2",chats),[chats]);
  useEffect(()=>LS.set(CUSTOM_KEY,customModels),[customModels]);

  // Update web search toggle when model changes
  useEffect(()=>{
    const m = allModels.find(x=>x.id===currentModel);
    if (!m?.webSearch) setUseWebSearch(false);
  },[currentModel]);

  const onScroll=useCallback(()=>{
    const el=scrollRef.current; if(!el) return;
    const bottom=el.scrollHeight-el.scrollTop-el.clientHeight<80;
    setAtBottom(bottom);
    userScrolledRef.current=!bottom;
  },[]);

  useEffect(()=>{
    if(!userScrolledRef.current&&scrollRef.current){
      scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
    }
  });

  const scrollToBottom=()=>{
    userScrolledRef.current=false;
    scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"});
  };

  const activeChat=chats.find(c=>c.id===activeId);
  const messages=activeChat?.messages||[];

  const newChat=()=>{const id=Date.now().toString();setChats(p=>[{id,title:"New Chat",messages:[]},...p]);setActiveId(id);setInput("");};
  const deleteChat=id=>{setChats(p=>p.filter(c=>c.id!==id));if(activeId===id)setActiveId(chats.find(c=>c.id!==id)?.id||null);};
  const renameChat=(id,title)=>setChats(p=>p.map(c=>c.id===id?{...c,title}:c));
  const updateChat=useCallback((id,fn)=>setChats(p=>p.map(c=>c.id===id?fn(c):c)),[]);
  const addCustomModel=m=>setCustomModels(p=>p.some(x=>x.id===m.id)||MODELS.some(x=>x.id===m.id)?p:[m,...p]);

  const exportChat=(id)=>{
    const chat=id?chats.find(c=>c.id===id):activeChat;
    if(!chat) return;
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([chat.messages.map(m=>`[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n")],{type:"text/plain"}));
    a.download=`maxmind-${chat.title.replace(/\s+/g,"-")}.txt`;
    a.click();
  };

  const handleImg=async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    const b64=await fileToB64(file);
    setPendingImg({file,b64,url:URL.createObjectURL(file),mt:file.type});
    e.target.value="";
  };

  const sendMessage=async()=>{
    const text=input.trim();
    if((!text&&!pendingImg)||streaming) return;
    if(!config.apiKey){setShowSetup(true);return;}
    let chatId=activeId;
    if(!chatId){chatId=Date.now().toString();setChats(p=>[{id:chatId,title:text.slice(0,42)||"Image Chat",messages:[]},...p]);setActiveId(chatId);}
    const img=pendingImg; setPendingImg(null); setInput("");
    if(taRef.current){taRef.current.style.height="auto";}
    userScrolledRef.current=false;
    const uid=Date.now(), aid=Date.now()+1;
    const modelCfg=allModels.find(m=>m.id===currentModel)||allModels[0];
    const modelLabel=modelCfg.label||currentModel;
    const userMsg={id:uid,role:"user",content:text,imageUrl:img?.url||null};

    // Web search
    let searchResults = [];
    let searchContext = "";
    if(useWebSearch && modelCfg.webSearch && text) {
      setIsSearching(true);
      searchResults = await searchWeb(text);
      setIsSearching(false);
      if(searchResults.length) {
        searchContext = "\n\n[Web Search Results]:\n" + searchResults.map((r,i)=>`${i+1}. ${r.title}\n${r.snippet}\nURL: ${r.url}`).join("\n\n") + "\n\nUse these results to inform your response where relevant.";
      }
    }

    const aMsg={id:aid,role:"assistant",content:"",thinking:"",streaming:true,model:modelLabel,webSearched:useWebSearch&&!!searchResults.length,searchResults};
    updateChat(chatId,c=>({...c,title:c.title==="New Chat"?(text.slice(0,42)||"Image Chat"):c.title,messages:[...c.messages,userMsg,aMsg]}));
    setStreaming(true);

    const hist=[...(chats.find(c=>c.id===chatId)?.messages||[]).filter(m=>!m.streaming),userMsg];
    const sysContent = `${config.systemPrompt}\n\n${config.internalPrompt||INTERNAL_SYS}`;
    const apiMsgs=[
      {role:"system",content:sysContent},
      ...hist.map((m,idx)=>{
        if(m.role==="user"&&m.id===uid&&img){
          return{role:"user",content:[{type:"image_url",image_url:{url:`data:${img.mt};base64,${img.b64}`}},{type:"text",text:(text||"Describe this image.")+searchContext}]};
        }
        if(m.role==="user"&&m.id===uid&&searchContext){
          return{role:"user",content:m.content+searchContext};
        }
        return{role:m.role,content:m.content};
      }),
    ];

    const canThink = modelCfg.thinking && useThinking;
    const payload={model:currentModel,messages:apiMsgs,temperature:config.temperature,top_p:0.95,max_tokens:config.maxTokens,stream:true,...(canThink?modelCfg.thinkingParam:{})};
    abortRef.current=new AbortController();
    let thinkBuf="",contBuf="",inputBuf="";
    apiMsgs.forEach(m=>{ if(typeof m.content==="string") inputBuf+=m.content; });

    try {
      const res=await fetch("/nvidia-api/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${config.apiKey}`},body:JSON.stringify(payload),signal:abortRef.current.signal});
      if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err?.error?.message||`HTTP ${res.status}`);}
      const reader=res.body.getReader(); const dec=new TextDecoder(); let buf="";
      while(true){
        const{done,value}=await reader.read(); if(done) break;
        buf+=dec.decode(value,{stream:true});
        const lines=buf.split("\n"); buf=lines.pop();
        for(const line of lines){
          if(!line.startsWith("data: ")) continue;
          const data=line.slice(6).trim(); if(data==="[DONE]") break;
          try{const j=JSON.parse(data);const delta=j.choices?.[0]?.delta;if(!delta) continue;if(delta.reasoning_content)thinkBuf+=delta.reasoning_content;if(delta.content)contBuf+=delta.content;updateChat(chatId,c=>({...c,messages:c.messages.map(m=>m.id===aid?{...m,content:contBuf,thinking:thinkBuf}:m)}));}catch{}
        }
      }
      logTokens(inputBuf, contBuf, currentModel);
    }catch(e){
      if(e.name!=="AbortError")updateChat(chatId,c=>({...c,messages:c.messages.map(m=>m.id===aid?{...m,content:`❌ Error: ${e.message}`}:m)}));
    }finally{
      updateChat(chatId,c=>({...c,messages:c.messages.map(m=>m.id===aid?{...m,streaming:false}:m)}));
      setStreaming(false);
    }
  };

  const handleKey=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}};

  const t=theme;
  const modelCfg=allModels.find(m=>m.id===currentModel)||allModels[0];
  const inpStyle={width:"100%",background:"transparent",border:"none",padding:"13px 15px 8px",color:t.tx,fontSize:"14px",fontFamily:"inherit",resize:"none",outline:"none",lineHeight:"1.65",maxHeight:"180px",overflow:"auto",display:"block"};

  return (
    <ThemeCtx.Provider value={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Figtree:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { font-family: 'Figtree', system-ui, sans-serif; background: ${t.bg}; color: ${t.tx}; -webkit-font-smoothing: antialiased; overflow: hidden; transition: background 0.3s, color 0.3s; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scroll}; border-radius: 4px; }

        .blob { position: absolute; border-radius: 50%; filter: blur(60px); }
        .b1 { width: 900px; height: 700px; top: -20%; left: 25%; animation: b1 22s ease-in-out infinite; }
        .b2 { width: 700px; height: 600px; bottom: -15%; right: 5%; animation: b2 28s ease-in-out infinite; }
        .b3 { width: 600px; height: 500px; top: 25%; left: -12%; animation: b3 25s ease-in-out infinite; }
        @keyframes b1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(50px,-70px) scale(1.1)} 66%{transform:translate(-30px,40px) scale(0.92)} }
        @keyframes b2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-60px,50px) scale(1.12)} 66%{transform:translate(40px,-30px) scale(0.9)} }
        @keyframes b3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,60px) scale(1.07)} 66%{transform:translate(-50px,-40px) scale(0.95)} }

        @keyframes pulse { 0%,100%{opacity:0.25} 50%{opacity:1} }
        @keyframes typeBounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-7px);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spinSlow2 { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes shimmer { 0%{opacity:0.4} 50%{opacity:0.9} 100%{opacity:0.4} }
        .msg-in { animation: fadeUp 0.22s ease forwards; }

        .logo-ring { position:absolute; inset:-10px; border-radius:50%; border:1.5px solid ${t.accBd}; animation:spinSlow 8s linear infinite; }
        .logo-ring-2 { inset:-18px; border-color:${t.acc}33; animation:spinSlow2 14s linear infinite; }

        .sb-item:hover { background: ${t.glass} !important; }
        .sb-item:hover .sb-del { opacity: 1 !important; }

        .input-wrap:focus-within { border-color: ${t.acc} !important; box-shadow: 0 0 0 3px ${t.accBg} !important; }
        .hdr-btn:hover { background: ${t.glassH} !important; border-color: ${t.bdH} !important; }

        .md-root { font-size: 14px; line-height: 1.8; color: ${t.tx}; }
        .md-root strong { color: ${t.tx}; font-weight: 700; }
        .md-root em { font-style: italic; opacity: 0.85; }
        .md-root del { text-decoration: line-through; opacity: 0.6; }
        .mxi { background: ${t.accBg}; border: 1px solid ${t.accBd}; color: ${t.acc}; border-radius: 5px; padding: 1px 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.86em; }
        .mxa { color: ${t.acc}; text-decoration: none; border-bottom: 1px solid ${t.accBd}; transition: border-color 0.15s; }
        .mxa:hover { border-bottom-color: ${t.acc}; }
        .mdl { padding-left: 18px; margin: 6px 0 10px; }
        .mdl li { padding: 2px 0; color: ${t.tx}; }
        ul.mdl { list-style: none; padding-left: 0; }
        ul.mdl li { padding-left: 16px; position: relative; }
        ul.mdl li::before { content: "▸"; position: absolute; left: 0; color: ${t.acc}; font-size: 10px; top: 6px; }
        .mdbq { border-left: 3px solid ${t.accBd}; padding: 4px 14px; margin: 10px 0; color: ${t.sub}; font-style: italic; }
        .mdhr { border: none; border-top: 1px solid ${t.bd}; margin: 14px 0; }

        input:focus, select:focus, textarea:focus { border-color: ${t.acc} !important; box-shadow: 0 0 0 3px ${t.accBg} !important; }

        .toggle-pill { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11.5px; font-weight:600; cursor:pointer; border:1px solid; transition:all 0.18s; font-family:inherit; }
      `}</style>

      {showSetup&&<SetupModal onSave={(key,model)=>{const c={...config,apiKey:key,model};setConfig(c);setCurrentModel(model);setShowSetup(false);}} themeId={themeId} setThemeId={setThemeId} accentId={accentId} setAccentId={setAccentId}/>}
      {showSettings&&<SettingsDrawer config={config} models={allModels} onAddModel={addCustomModel} onChange={c=>{setConfig(c);setCurrentModel(c.model);}} onClose={()=>setShowSettings(false)} themeId={themeId} setThemeId={setThemeId} accentId={accentId} setAccentId={setAccentId}/>}
      {showTokens&&<TokenDashboard onClose={()=>setShowTokens(false)}/>}
      {showChatMgr&&<ChatManager chats={chats} activeId={activeId} onSelect={setActiveId} onDelete={deleteChat} onRename={renameChat} onExport={id=>exportChat(id)} onClose={()=>setShowChatMgr(false)}/>}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg}/>

      <AiBg/>

      <div style={{display:"flex",height:"100vh",position:"relative",zIndex:1}}>
        {/* Desktop sidebar */}
        {!isMobile&&<Sidebar chats={chats} activeId={activeId} onSelect={setActiveId} onNew={newChat} onDelete={deleteChat}
          collapsed={collapsed} onToggle={()=>setCollapsed(o=>!o)}
          isMobile={false} onClose={()=>{}}
          onOpenManager={()=>setShowChatMgr(true)}/>}
        {/* Mobile sidebar */}
        {isMobile&&<Sidebar chats={chats} activeId={activeId} onSelect={id=>{setActiveId(id);setSidebarOpen(false);}} onNew={()=>{newChat();setSidebarOpen(false);}} onDelete={deleteChat}
          collapsed={!sidebarOpen} onToggle={()=>setSidebarOpen(o=>!o)}
          isMobile={true} onClose={()=>setSidebarOpen(false)}
          onOpenManager={()=>{setShowChatMgr(true);setSidebarOpen(false);}}/>}

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

          {/* Header */}
          <div style={{padding:isMobile?"10px 14px":"11px 20px",borderBottom:`1px solid ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:`${t.panel}cc`,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",flexShrink:0,gap:"10px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
              {isMobile&&(
                <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:`1px solid ${t.bd}`,cursor:"pointer",padding:"7px",borderRadius:"9px",display:"flex"}} className="hdr-btn">
                  <Ic n="menu" s={16} c={t.sub}/>
                </button>
              )}
              <ModelPicker selected={currentModel} onChange={setCurrentModel} models={allModels}/>
              {activeChat&&!isMobile&&<span style={{fontSize:"12px",color:t.sub,paddingLeft:"10px",borderLeft:`1px solid ${t.bd}`,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"180px"}}>{activeChat.title}</span>}
            </div>
            <div style={{display:"flex",gap:"6px",alignItems:"center",flexShrink:0}}>
              <button onClick={()=>setShowTokens(true)} title="Token usage" className="hdr-btn" style={{display:"flex",alignItems:"center",gap:"5px",background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"9px",padding:"6px 11px",cursor:"pointer",color:t.sub,fontSize:"12px",fontFamily:"inherit",fontWeight:500,transition:"all 0.18s"}}>
                <Ic n="tok" s={13} c="currentColor"/>{!isMobile&&"Usage"}
              </button>
              {activeChat?.messages?.length>0&&(
                <button onClick={()=>exportChat()} className="hdr-btn" style={{display:"flex",alignItems:"center",gap:"5px",background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"9px",padding:"6px 11px",cursor:"pointer",color:t.sub,fontSize:"12px",fontFamily:"inherit",fontWeight:500,transition:"all 0.18s"}}>
                  <Ic n="dl" s={13} c="currentColor"/>{!isMobile&&"Export"}
                </button>
              )}
              <button onClick={()=>setShowSettings(true)} className="hdr-btn" style={{background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"9px",padding:"7px",cursor:"pointer",display:"flex",transition:"all 0.18s"}}>
                <Ic n="settings" s={15} c={t.sub}/>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} onScroll={onScroll} style={{flex:1,overflowY:"auto",padding:isMobile?"20px 14px 10px":"28px 24px 10px",position:"relative"}}>
            {messages.length===0?(
              <EmptyState onNewChat={newChat}/>
            ):(
              <div style={{maxWidth:"820px",margin:"0 auto"}}>
                {messages.map(msg=><Message key={msg.id} msg={msg}/>)}
                <div style={{height:"10px"}}/>
              </div>
            )}
            {!atBottom&&<ScrollBtn onClick={scrollToBottom}/>}
          </div>

          {/* Input */}
          <div style={{padding:isMobile?"10px 14px 16px":"12px 24px 20px",background:`${t.panel}88`,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",flexShrink:0}}>
            <div style={{maxWidth:"820px",margin:"0 auto"}}>
              {pendingImg&&(
                <div style={{marginBottom:"8px",display:"flex",alignItems:"center",gap:"10px",background:t.glass,border:`1px solid ${t.bd}`,borderRadius:"10px",padding:"8px 12px"}}>
                  <img src={pendingImg.url} alt="preview" style={{width:"36px",height:"36px",borderRadius:"6px",objectFit:"cover",border:`1px solid ${t.bd}`}}/>
                  <span style={{fontSize:"12px",color:t.sub,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pendingImg.file.name}</span>
                  <button onClick={()=>setPendingImg(null)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px"}}><Ic n="x" s={14} c={t.sub}/></button>
                </div>
              )}
              <div className="input-wrap" style={{background:t.inBg,border:`1px solid ${t.inBd}`,borderRadius:"16px",backdropFilter:"blur(30px)",transition:"border-color 0.2s, box-shadow 0.2s"}}>
                <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder={isSearching?"Searching the web…":"Ask anything… (Enter · Shift+Enter for newline)"} rows={1}
                  style={inpStyle} disabled={isSearching}
                  onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,180)+"px";}}/>

                {/* Toolbar row */}
                <div style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 10px 10px",flexWrap:"wrap"}}>
                  {/* Left tools */}
                  <button onClick={()=>fileRef.current?.click()} title="Attach image"
                    style={{background:"none",border:`1px solid ${t.bd}`,color:t.sub,borderRadius:"8px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",display:"flex",alignItems:"center",gap:"5px",fontFamily:"inherit",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=t.bdH;e.currentTarget.style.color=t.tx;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=t.bd;e.currentTarget.style.color=t.sub;}}>
                    <Ic n="attach" s={12} c="currentColor"/>{!isMobile&&<span>Image</span>}
                  </button>

                  {/* Thinking toggle — only if model supports it */}
                  {modelCfg?.thinking && (
                    <button onClick={()=>setUseThinking(o=>!o)} className="toggle-pill"
                      style={{background:useThinking?t.thBg:"transparent",border:`1px solid ${useThinking?t.thBd:t.bd}`,color:useThinking?t.thTx:t.sub}}>
                      <Ic n="brain" s={11} c="currentColor"/>
                      {!isMobile&&"Think"}
                    </button>
                  )}

                  {/* Web search toggle — only if model supports it */}
                  {modelCfg?.webSearch && (
                    <button onClick={()=>setUseWebSearch(o=>!o)} className="toggle-pill"
                      style={{background:useWebSearch?"rgba(59,130,246,0.1)":"transparent",border:`1px solid ${useWebSearch?"rgba(59,130,246,0.3)":t.bd}`,color:useWebSearch?"#60a5fa":t.sub}}>
                      <Ic n="globe" s={11} c="currentColor"/>
                      {!isMobile&&"Web"}
                    </button>
                  )}

                  <div style={{flex:1}}/>

                  {/* Right: vendor label + send */}
                  {!isMobile&&<span style={{fontSize:"11px",color:t.dim}}>{modelCfg?.vendor}</span>}
                  <button onClick={streaming?()=>{abortRef.current?.abort();setStreaming(false);}:sendMessage}
                    style={{width:"36px",height:"36px",borderRadius:"10px",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",background:streaming?"rgba(239,68,68,0.12)":(input.trim()||pendingImg)?`linear-gradient(135deg,${t.acc},${t.acc2})`:`rgba(255,255,255,0.04)`,boxShadow:(!streaming&&(input.trim()||pendingImg))?`0 2px 16px ${t.glow}`:"none"}}>
                    <Ic n={streaming?"stop":"send"} s={14} c={streaming?"#ef4444":(input.trim()||pendingImg)?"#fff":t.dim}/>
                  </button>
                </div>
              </div>
              <div style={{textAlign:"center",marginTop:"7px"}}>
                <span style={{fontSize:"10px",color:t.sub,opacity:0.5,letterSpacing:"0.03em"}}>MAXMIND · All data stays local · NVIDIA API only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
