import { supabase } from './supabase';
import { useState, useRef, useEffect } from "react";

// ── Global Styles ─────────────────────────────────────────────────────────────
const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --bg:#F8F5F0; --warm:#EFE9DE; --sand:#DDD3C0; --ink:#1A1612;
      --muted:#7A6E62; --teal:#1A6B6B; --teal2:#2A8A7A; --rose:#B5464A;
      --gold:#C8860A; --lavender:#5B5EA6; --mint:#2D7D6B;
      --card:#FFFFFF; --shadow:rgba(26,22,18,0.09);
    }
    html,body,#root{height:100%;}
    body{background:var(--bg);color:var(--ink);font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;line-height:1.6;}
    h1,h2,h3,h4{font-family:'Fraunces',serif;}
    button{cursor:pointer;font-family:inherit;}
    textarea,input,select{font-family:inherit;}
    ::-webkit-scrollbar{width:5px;}
    ::-webkit-scrollbar-track{background:var(--warm);}
    ::-webkit-scrollbar-thumb{background:var(--sand);border-radius:3px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
    @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    .fu{animation:fadeUp 0.35s ease both;}
    .fu1{animation:fadeUp 0.35s 0.06s ease both;}
    .fu2{animation:fadeUp 0.35s 0.12s ease both;}
    .fu3{animation:fadeUp 0.35s 0.18s ease both;}
    .fu4{animation:fadeUp 0.35s 0.24s ease both;}
  `}</style>
);

// ── Data ──────────────────────────────────────────────────────────────────────
const DEFAULT_USERS = [
  {id:1,name:"Trevor Elliott",email:"hello@trevorelliottmbe.co.uk",role:"admin",  password:"Trevor2025",homeId:1,subscription:"active"},
  {id:2,name:"Trevor Elliott",email:"hello@trevorelliottmbe.co.uk",role:"manager",password:"Trevor2025",homeId:1,subscription:"active"},
];
function loadUsers(){
  try{
    const s=localStorage.getItem("mssf_users");
    const stored=s?JSON.parse(s):[];
    // Merge: keep default users, add any stored ones not already present
    const ids=new Set(DEFAULT_USERS.map(u=>u.id));
    const extra=stored.filter(u=>!ids.has(u.id));
    return [...DEFAULT_USERS,...extra];
  }catch(e){return DEFAULT_USERS.slice();}
}
const USERS = loadUsers();
// Child accounts are created by admin/manager via the Add Child form

const INIT_CHILDREN = [];

const INIT_CHAPTERS = [];

const INIT_HOMES = [
  {id:1,name:"Sunflower Children's Home",contact:"james@home.org",plan:"home",status:"active",childCount:2,created:"2024-01-01"},
];

// Age band calculated automatically from DOB
function calcAgeBand(dob){
  if(!dob) return "unknown";
  const age=Math.floor((Date.now()-new Date(dob))/(365.25*24*3600*1000));
  if(age<=6) return "4-6";
  if(age<=9) return "7-9";
  if(age<=12) return "10-12";
  if(age<=15) return "13-15";
  return "16-18";
}
function calcAge(dob){
  if(!dob) return "";
  return Math.floor((Date.now()-new Date(dob))/(365.25*24*3600*1000));
}
const STORY_STYLES = [
  {id:"personal",label:"Personal",icon:"💛",desc:"A warm, real story about you"},
  {id:"fictional",label:"Fictional",icon:"🏰",desc:"Your story told as an adventure book"},
  {id:"motivational",label:"Motivational",icon:"🚀",desc:"Your achievements told like a champion"},
  {id:"emotional",label:"Emotional",icon:"🌿",desc:"A heartfelt, tender story about your journey"},
];

const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB",{month:"long",year:"numeric"});
const fmtShort = (d) => new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});

// ── UI Primitives ─────────────────────────────────────────────────────────────
function Badge({label,color}){
  const m={approved:"#2D7D6B",published:"#1A6B6B",pending:"#C8860A",draft:"#5B5EA6",staff:"#5B5EA6",manager:"#2D7D6B",admin:"#B5464A",child:"#1A6B6B",active:"#2D7D6B",inactive:"#B5464A"};
  return <span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:"0.05em",background:m[color]||"#aaa",color:"#fff",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;
}

function Card({children,style,onClick,onMouseEnter,onMouseLeave}){
  return <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    style={{background:"#fff",borderRadius:16,border:"1px solid #DDD3C0",padding:24,boxShadow:"0 2px 16px rgba(26,22,18,0.07)",...style}}>{children}</div>;
}

function Btn({children,onClick,variant,size,disabled,style}){
  const v=variant||"primary",s=size||"md";
  const base={display:"inline-flex",alignItems:"center",gap:6,cursor:disabled?"not-allowed":"pointer",border:"none",borderRadius:10,fontWeight:600,fontFamily:"inherit",transition:"all 0.18s",opacity:disabled?0.5:1,fontSize:s==="sm"?12:14,padding:s==="sm"?"6px 14px":"10px 22px"};
  const vs={
    primary:{background:"#1A6B6B",color:"#fff"},
    secondary:{background:"#EFE9DE",color:"#1A1612",border:"1px solid #DDD3C0"},
    danger:{background:"#B5464A",color:"#fff"},
    gold:{background:"#C8860A",color:"#fff"},
    lavender:{background:"#5B5EA6",color:"#fff"},
    ghost:{background:"transparent",color:"#7A6E62",border:"1px solid #DDD3C0"},
    dark:{background:"#1A1612",color:"#fff"},
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...(vs[v]||vs.primary),...style}}>{children}</button>;
}

function FInput({label,value,onChange,type,placeholder,required,style}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
      {label&&<label style={{fontSize:12,fontWeight:600,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}{required?" *":""}</label>}
      <input type={type||"text"} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder||""}
        style={{padding:"9px 13px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,color:"#1A1612",outline:"none",transition:"border 0.15s"}}
        onFocus={(e)=>e.target.style.borderColor="#1A6B6B"} onBlur={(e)=>e.target.style.borderColor="#DDD3C0"}/>
    </div>
  );
}

function FTextarea({label,value,onChange,rows,placeholder,style}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
      {label&&<label style={{fontSize:12,fontWeight:600,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>}
      <textarea value={value} onChange={(e)=>onChange(e.target.value)} rows={rows||5} placeholder={placeholder||""}
        style={{padding:"9px 13px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,color:"#1A1612",resize:"vertical",outline:"none",lineHeight:1.6,transition:"border 0.15s"}}
        onFocus={(e)=>e.target.style.borderColor="#1A6B6B"} onBlur={(e)=>e.target.style.borderColor="#DDD3C0"}/>
    </div>
  );
}

function FSelect({label,value,onChange,options,placeholder}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&<label style={{fontSize:12,fontWeight:600,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>}
      <select value={value} onChange={(e)=>onChange(e.target.value)}
        style={{padding:"9px 13px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,color:"#1A1612",outline:"none"}}>
        <option value="">{placeholder||"Select..."}</option>
        {(options||[]).map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PageHeader({title,subtitle,action}){
  return(
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
      <div>
        <h2 style={{fontSize:26,color:"#1A1612",marginBottom:4,fontFamily:"'Fraunces',serif"}}>{title}</h2>
        {subtitle&&<p style={{color:"#7A6E62",fontSize:14}}>{subtitle}</p>}
      </div>
      {action&&<div>{action}</div>}
    </div>
  );
}

function ScoreDots({value,max,color}){
  return(
    <div style={{display:"flex",gap:4}}>
      {Array.from({length:max||5}).map((_,i)=>(
        <div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<value?(color||"#1A6B6B"):"#DDD3C0",transition:"background 0.3s"}}/>
      ))}
    </div>
  );
}

function Spinner({color}){
  return <div style={{width:36,height:36,border:"3px solid #DDD3C0",borderTopColor:color||"#1A6B6B",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/>;
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens){
  const res = await fetch("/api/anthropic",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:maxTokens||2000,messages:[{role:"user",content:prompt}]}),
  });
  const data = await res.json();
  const text = (data.content||[]).map((b)=>b.text||"").join("");
  return text.replace(/```json/g,"").replace(/```/g,"").trim();
}

function loadMammoth(){
  return new Promise((resolve)=>{
    if(window.mammoth) return resolve(window.mammoth);
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    s.onload=()=>resolve(window.mammoth);
    s.onerror=()=>resolve(null);
    document.head.appendChild(s);
  });
}

async function extractTextFromFile(file){
  const name = file.name.toLowerCase();

  if(name.endsWith(".docx")||name.endsWith(".doc")){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=async()=>{
        try{
          if(!window.JSZip){
            await new Promise((ok,fail)=>{
              const s=document.createElement("script");
              s.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
              s.onload=ok;s.onerror=fail;
              document.head.appendChild(s);
            });
          }
          if(!window.JSZip)throw new Error("no jszip");
          const zip=await window.JSZip.loadAsync(reader.result);
          const xf=zip.file("word/document.xml");
          if(!xf)throw new Error("invalid");
          const xml=await xf.async("string");
          const text=xml.replace(/<[^>]+>/g," ").replace(/[ \t\n\r]+/g," ").trim();
          if(text.length<20)throw new Error("empty");
          resolve(text);
        }catch(e){reject(new Error("Could not read document. Please paste the text directly."));}
      };
      reader.onerror=()=>reject(new Error("File read failed."));
      reader.readAsArrayBuffer(file);
    });
  }

  // .pdf — send to Claude as base64 document
  if(name.endsWith(".pdf")){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=async()=>{
        try{
          const base64=reader.result.split(",")[1];
          const res=await fetch("/api/anthropic",{
            method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2000,
              messages:[{role:"user",content:[
                {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
                {type:"text",text:"Extract all text content from this document. Return only the text, no commentary."}
              ]}]
            }),
          });
          const d=await res.json();
          resolve((d.content||[]).map((b)=>b.text||"").join(""));
        }catch(e){reject(new Error("Could not read PDF. Please paste the text directly."));}
      };
      reader.onerror=()=>reject(new Error("File read failed."));
      reader.readAsDataURL(file);
    });
  }

  // plain text
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const text=(reader.result||"").trim();
      if(text.length<20) reject(new Error("File appears empty. Please paste the text directly."));
      else resolve(text);
    };
    reader.onerror=()=>reject(new Error("File read failed."));
    reader.readAsText(file);
  });
}

async function generateChapter(reportText, child, previousChapters){
  // Build trend context from previous chapters
  let trendContext = "";
  if(previousChapters && previousChapters.length > 0){
    trendContext = "\n\nPREVIOUS MONTHS DATA FOR TREND ANALYSIS:\n";
    previousChapters.slice(-3).forEach((ch,i)=>{
      if(ch.childProgress){
        trendContext += `Month ${i+1}: Mood=${ch.childProgress.mood}/5, Effort=${ch.childProgress.effort}/5, Social=${ch.childProgress.social}/5\n`;
      }
    });
  }

  const prompt = `You are an expert trauma-informed life story writer for children in residential care.

Analyse this monthly report for ${child.preferredName} (age: ${calcAge(child.dob)}, age band: ${calcAgeBand(child.dob)}) and produce a full response.${trendContext}

Return ONLY valid JSON, no markdown fences:

{
  "reportDate": "The month and year this report covers in YYYY-MM-DD format (use the 1st of the month) — read this from the report title or content, do NOT use today's date",
  "chapter": {
    "title": "Warm chapter title (4-6 words)",
    "content": "2-4 paragraphs written in THIRD PERSON as a warm life story book chapter about the child, using their name naturally throughout (e.g. \'This month, TE showed the kind of quiet courage that deserves to be remembered.\'). Written like a novel chapter — engaging, celebratory, narrative storytelling. Warm, age-appropriate, trauma-informed. Highlight strengths, growth, positive moments. End with a hopeful forward-looking sentence. NO second person (no \'you\' or \'your\'). NO clinical language, NO incidents, NO blame, NO risk language."
  },
  "staffInsights": {
    "overview": "2-3 sentence professional summary for staff records",
    "tips": ["specific actionable care tip 1","specific care tip 2","specific care tip 3"],
    "trendAnalysis": {
      "flags": ["observable pattern 1 from the report e.g. missing episodes count","observable pattern 2"],
      "insights": ["professional insight connecting patterns to child wellbeing","second insight if applicable"],
      "disclaimer": true
    }
  },
  "childProgress": {
    "strengths": ["strength 1 in child-friendly language","strength 2","strength 3"],
    "challenges": ["one gentle growth area framed positively"],
    "mood": <1-5>,
    "effort": <1-5>,
    "social": <1-5>
  }
}

MONTHLY REPORT:
${reportText}`;

  const raw = await callClaude(prompt, 2000);
  return JSON.parse(raw);
}

async function rewriteInStyle(chapter, style, child){
  const styleGuides = {
    fictional:`Transform this into a SECOND PERSON fictional adventure story where the child is the hero. Use "you" throughout — e.g. "You stepped forward, brave as any knight". Magical, adventurous framing of their real experiences. Age-appropriate for ${calcAgeBand(child.dob)}.`,
    motivational:`Rewrite this as a powerful motivational piece written TO the child. Focus on their wins, strength, resilience. Energetic and empowering tone. Age-appropriate for age band ${calcAgeBand(child.dob)}.`,
    emotional:`Rewrite this in SECOND PERSON as a gentle, heartfelt, emotionally resonant piece speaking directly to the child. Use "you" — e.g. "This month, you carried something quietly — and you did it with so much grace." Tender, validating. Age-appropriate for ${calcAgeBand(child.dob)}.`,
    personal:`Keep this as a warm SECOND PERSON narrative speaking directly to the child. Use "you" throughout — direct, real, supportive, like a trusted adult speaking to them. Age-appropriate for ${calcAgeBand(child.dob)}.`,
  };
  const prompt = `${styleGuides[style]||styleGuides.personal}

Keep the same title. Return ONLY valid JSON:
{"title":"${chapter.title}","content":"rewritten content here"}

ORIGINAL:
${chapter.content}`;
  const raw = await callClaude(prompt, 1000);
  return JSON.parse(raw);
}

async function generateBulkChapters(reports, child){
  // Process sequentially
  const results = [];
  for(let i=0;i<reports.length;i++){
    const prev = results.slice(0,i).map(r=>({childProgress:r.childProgress}));
    const result = await generateChapter(reports[i].text, child, prev);
    result.reportLabel = reports[i].label;
    results.push(result);
  }
  return results;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_BY_ROLE = {
  staff:  ["dashboard","children","new-chapter","chapters","approvals"],
  manager:["dashboard","children","new-chapter","chapters","approvals"],
  admin:  ["admin-dashboard","admin-homes","admin-users","admin-settings","children","new-chapter","chapters","approvals"],
  child:  ["my-story","my-progress"],
};
const NAV_META = {
  dashboard:       {icon:"🏠",label:"Dashboard"},
  children:        {icon:"👤",label:"Children"},
  "new-chapter":   {icon:"✍️",label:"Add Report"},
  chapters:        {icon:"📚",label:"Story Timeline"},
  approvals:       {icon:"✅",label:"Approvals"},
  "admin-dashboard":{icon:"🏠",label:"Overview"},
  "admin-homes":   {icon:"🏡",label:"Care Homes"},
  "admin-users":   {icon:"👥",label:"All Users"},
  "admin-settings":{icon:"⚙️",label:"Platform Settings"},
  "my-story":      {icon:"📖",label:"My Story"},
  "my-progress":   {icon:"⭐",label:"My Progress"},
};

function Sidebar({user,page,setPage,onLogout}){
  const items = NAV_BY_ROLE[user.role]||[];
  const isChild = user.role==="child";
  const bg = isChild ? "linear-gradient(180deg,#1A6B6B 0%,#0D4A4A 100%)" : "#1A1612";
  return(
    <aside style={{width:"clamp(60px, 220px, 30vw)",minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"24px 18px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>📖</span>
          <div>
            <div style={{color:"#fff",fontFamily:"'Fraunces',serif",fontSize:15,lineHeight:1.2}}>My Story</div>
            <div style={{color:"rgba(255,255,255,0.35)",fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase"}}>So Far</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:"12px 10px"}}>
        {items.map((key)=>{
          const m=NAV_META[key]||{icon:"•",label:key};
          const active=page===key;
          return(
            <button key={key} onClick={()=>setPage(key)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:9,border:"none",cursor:"pointer",background:active?"rgba(255,255,255,0.12)":"transparent",color:active?"#fff":"rgba(255,255,255,0.55)",fontWeight:active?700:400,fontSize:13,marginBottom:2,transition:"all 0.18s"}}>
              <span style={{fontSize:15}}>{m.icon}</span>{m.label}
            </button>
          );
        })}
      </nav>
      <div style={{padding:"14px 14px 18px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:isChild?"rgba(255,255,255,0.2)":"#1A6B6B",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{user.name.charAt(0)}</div>
          <div style={{overflow:"hidden"}}>
            <div style={{color:"#fff",fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div>
            <div style={{color:"rgba(255,255,255,0.35)",fontSize:11,textTransform:"capitalize"}}>{user.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{width:"100%",padding:7,borderRadius:7,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"rgba(255,255,255,0.45)",fontSize:12,cursor:"pointer"}}>Sign out</button>
      </div>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({user,children,chapters,setPage}){
  const pending = chapters.filter((c)=>c.status==="pending");
  const approved = chapters.filter((c)=>c.status==="approved"||c.status==="published");
  const stats=[
    {label:"Children",value:children.length,icon:"👤",color:"#5B5EA6"},
    {label:"Total Entries",value:chapters.length,icon:"📚",color:"#2D7D6B"},
    {label:"Pending Review",value:pending.length,icon:"🕐",color:"#C8860A"},
    {label:"Approved",value:approved.length,icon:"✅",color:"#2D7D6B"},
  ];
  return(
    <div>
      <div className="fu"><PageHeader title={"Welcome back, "+user.name.split(" ")[0]+" 👋"} subtitle="Welcome — here is your overview for today."/></div>
      <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        {stats.map((s)=>(
          <Card key={s.label} style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:26}}>{s.icon}</div>
            <div>
              <div style={{fontSize:28,fontWeight:700,color:s.color,fontFamily:"'Fraunces',serif"}}>{s.value}</div>
              <div style={{fontSize:12,color:"#7A6E62"}}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>
      {pending.length>0&&(
        <div className="fu2">
          <Card style={{borderLeft:"4px solid #C8860A",marginBottom:18}}>
            <h3 style={{fontSize:15,marginBottom:12}}>⏳ Pending Approval</h3>
            {pending.map((ch)=>{
              const child=children.find((c)=>c.id===ch.childId);
              return(
                <div key={ch.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #EFE9DE"}}>
                  <span style={{fontWeight:600}}>{ch.title} <span style={{color:"#7A6E62",fontWeight:400,fontSize:13}}>— {child?child.preferredName:""}</span></span>
                  <Badge label="Pending" color="pending"/>
                </div>
              );
            })}
            <div style={{marginTop:12}}><Btn size="sm" onClick={()=>setPage("approvals")}>Review Now →</Btn></div>
          </Card>
        </div>
      )}
      <div className="fu3">
        <Card>
          <h3 style={{fontSize:15,marginBottom:14}}>📜 Recent Entries</h3>
          {[...chapters].reverse().slice(0,5).map((ch)=>{
            const child=children.find((c)=>c.id===ch.childId);
            return(
              <div key={ch.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #EFE9DE"}}>
                <div>
                  <span style={{fontWeight:600}}>{ch.title}</span>
                  <span style={{color:"#7A6E62",fontSize:13,marginLeft:8}}>— {child?child.preferredName:""}</span>
                  <span style={{color:"#7A6E62",fontSize:12,marginLeft:8}}>{fmtDate(ch.date)}</span>
                </div>
                <Badge label={ch.status} color={ch.status}/>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ── Children Page ─────────────────────────────────────────────────────────────
function ChildrenPage({user,children,setChildren,chapters,setPage,setActiveChild,homes}){
  const [showForm,setShowForm]=useState(false);
  const [showArchived,setShowArchived]=useState(false);
  const [mode,setMode]=useState("upload");
  const [form,setForm]=useState({preferredName:"",dob:"",gender:"",notes:"",childEmail:"",childPassword:"",homeId:""});
  const [extracting,setExtracting]=useState(false);
  const [extracted,setExtracted]=useState(false);
  const [dragOver,setDragOver]=useState(false);
  const fileRef=useRef();

  const saveChild=async()=>{
    if(!form.preferredName||!form.dob){
      alert("Please fill in the child's name and date of birth.");
      return;
    }
    // Determine which home this child belongs to
    const targetHomeId = user.role==="admin" ? form.homeId : user.homeId;
    if(!targetHomeId){
      alert(user.role==="admin"
        ? "Please select which home this child belongs to."
        : "Your account is not assigned to a home. Contact admin.");
      return;
    }
    // Insert into Supabase
    const {data,error}=await supabase.from('children').insert({
      home_id:targetHomeId,
      preferred_name:form.preferredName,
      dob:form.dob||null,
      gender:form.gender||null,
      notes:form.notes||null,
      archived:false,
    }).select().single();
    if(error){
      console.warn('children insert failed, falling back to local',error.message);
      setChildren((p)=>[...p,{...form,id:Date.now(),homeId:targetHomeId}]);
    } else if(data){
      // Use the Supabase-returned row (with real UUID and timestamps),
      // plus keep childEmail/childPassword in local state only (Session 5 will move these properly)
      setChildren((p)=>[...p,{
        id:data.id,
        homeId:data.home_id,
        preferredName:data.preferred_name,
        dob:data.dob||"",
        gender:data.gender||"",
        notes:data.notes||"",
        archived:!!data.archived,
        created:data.created_at,
        childEmail:form.childEmail||"",
        childPassword:form.childPassword||"",
      }]);
    }
    setForm({preferredName:"",dob:"",gender:"",notes:"",childEmail:"",childPassword:"",homeId:""});
    setExtracted(false);
    setShowForm(false);
  };

  const parseFromDoc=async(file)=>{
    setExtracting(true);
    try{
      const text=await extractTextFromFile(file);
      const prompt=`Extract child profile info from this referral/care plan. Return ONLY valid JSON:
{"preferredName":"child's first name or preferred name","dob":"date of birth in YYYY-MM-DD format — calculate from age if needed (today is 2026-04-30)","gender":"Male or Female or Non-binary or empty string","notes":"2 sentence summary of positive interests, hobbies, and care preferences only — no clinical info"}
IMPORTANT: dob is required. If exact DOB not found but age is stated, calculate approximate DOB from age.
DOCUMENT: ${text.slice(0,3000)}`;
      const raw=await callClaude(prompt,500);
      const parsed=JSON.parse(raw.replace(/```json/g,"").replace(/```/g,"").trim());
      setForm({preferredName:parsed.preferredName||"",dob:parsed.dob||"",gender:parsed.gender||"",notes:parsed.notes||""});
      setExtracted(true);
      setMode("manual");
    }catch(e){
      alert("Could not read document. Please switch to Fill Manually and enter the details.");
      setMode("manual");
    }
    setExtracting(false);
  };

  const handleDrop=async(e)=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)await parseFromDoc(f);};
  const handleSelect=async(e)=>{const f=e.target.files[0];if(f)await parseFromDoc(f);};

  return(
    <div>
      <div className="fu"><PageHeader title="Children's Profiles" subtitle="Each child has a private profile and their own story." action={<Btn onClick={()=>setShowForm((v)=>!v)}>{showForm?"Cancel":"+ Add Child"}</Btn>}/></div>

      {showForm&&(
        <div className="fu">
          <Card style={{marginBottom:22,borderLeft:"4px solid #1A6B6B"}}>
            <h3 style={{fontSize:16,marginBottom:14}}>New Child Profile</h3>
            <div style={{display:"flex",gap:4,background:"#EFE9DE",borderRadius:10,padding:4,marginBottom:18,width:"fit-content"}}>
              {[["upload","📎 Upload Document"],["manual","✏️ Fill Manually"]].map(([id,label])=>(
                <button key={id} onClick={()=>setMode(id)} style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:mode===id?700:500,background:mode===id?"#1A1612":"transparent",color:mode===id?"#fff":"#7A6E62",transition:"all 0.18s"}}>{label}</button>
              ))}
            </div>

            {mode==="upload"&&(
              <div>
                <div onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} onClick={()=>fileRef.current&&fileRef.current.click()}
                  style={{border:"2px dashed "+(dragOver?"#1A6B6B":"#DDD3C0"),borderRadius:12,padding:"32px 20px",textAlign:"center",cursor:"pointer",background:dragOver?"#F0F8F8":"#F8F5F0",transition:"all 0.18s",marginBottom:12}}>
                  {extracting?(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                      <div style={{width:20,height:20,border:"2.5px solid #DDD3C0",borderTopColor:"#1A6B6B",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                      <span style={{fontSize:13,color:"#1A6B6B",fontWeight:600}}>Reading document...</span>
                    </div>
                  ):(
                    <>
                      <div style={{fontSize:36,marginBottom:8}}>📎</div>
                      <p style={{fontSize:14,fontWeight:700,color:"#1A1612",marginBottom:4}}>Drop referral form or care plan here</p>
                      <p style={{fontSize:13,color:"#7A6E62",marginBottom:12}}>PDF, Word (.docx) or text file</p>
                      <Btn size="sm" variant="secondary" onClick={(e)=>{e.stopPropagation();fileRef.current&&fileRef.current.click();}}>Browse files</Btn>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.doc" onChange={handleSelect} style={{display:"none"}}/>
                </div>
                <div style={{padding:"10px 14px",background:"#EFF8F7",borderRadius:8,fontSize:13,color:"#1A6B6B"}}>✨ AI reads the document and fills the profile automatically. You can review and edit before saving.</div>
              </div>
            )}

            {mode==="manual"&&(
              <div>
                {extracted&&<div style={{padding:"12px 14px",background:"#EFF8F7",borderRadius:8,fontSize:14,color:"#1A6B6B",marginBottom:14,fontWeight:600,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>✅</span><span>Profile extracted from document — review the details below and click Save Profile</span></div>}
                {user.role==="admin"&&(
                  <div style={{marginBottom:14,padding:"12px 14px",background:"#F0F0FA",borderRadius:10,border:"1px solid #D0D0EA"}}>
                    <p style={{fontSize:13,fontWeight:700,color:"#5B5EA6",marginBottom:8}}>🏛 Admin: which home is this child at?</p>
                    <FSelect label="Home" value={form.homeId} onChange={(v)=>setForm((f)=>({...f,homeId:v}))} options={(homes||[]).filter(h=>h.status!=="inactive").map(h=>({value:String(h.id),label:h.name}))} placeholder="Select a home..." required/>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <FInput label="Preferred Name" value={form.preferredName} onChange={(v)=>setForm((f)=>({...f,preferredName:v}))} required/>
                  <FInput label="Date of Birth" value={form.dob} onChange={(v)=>setForm((f)=>({...f,dob:v}))} type="date" required/>
                  <FSelect label="Gender" value={form.gender} onChange={(v)=>setForm((f)=>({...f,gender:v}))} options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"},{value:"Non-binary",label:"Non-binary"},{value:"Prefer not to say",label:"Prefer not to say"}]} placeholder="Select..."/>
                  {form.dob&&<div style={{padding:"8px 12px",background:"#EFF8F7",borderRadius:8,fontSize:13,color:"#1A6B6B"}}>Age: <strong>{calcAge(form.dob)}</strong> · Band: <strong>{calcAgeBand(form.dob)}</strong></div>}
                </div>
                <FTextarea label="Notes (interests, tone preferences...)" value={form.notes} onChange={(v)=>setForm((f)=>({...f,notes:v}))} rows={2} style={{marginTop:14}}/>
                {/* Child Portal Login */}
                <div style={{marginTop:16,padding:"14px 16px",background:"#F0F0FA",borderRadius:10,border:"1px solid #D0D0EA"}}>
                  <p style={{fontSize:13,fontWeight:700,color:"#5B5EA6",marginBottom:4}}>📖 Child Portal Login (Optional)</p>
                  <p style={{fontSize:12,color:"#7A6E62",marginBottom:12}}>Set up login credentials so this child can access their own story portal. You set this — the child does not create their own account.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <FInput label="Child Login Email" value={form.childEmail||""} onChange={(v)=>setForm((f)=>({...f,childEmail:v}))} type="email" placeholder="e.g. joe@home.org"/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Child Password</div>
                      <div style={{display:"flex",gap:8}}>
                        <input type="text" value={form.childPassword||""} onChange={(e)=>setForm(f=>({...f,childPassword:e.target.value}))} placeholder="Set a simple password..."
                          style={{flex:1,padding:"9px 13px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,color:"#1A1612",outline:"none"}}/>
                        <button onClick={()=>{
                          const words=["Brave","Strong","Kind","Star","Hope","Bright","Calm","Bold"];
                          const nums=Math.floor(Math.random()*90+10);
                          setForm(f=>({...f,childPassword:words[Math.floor(Math.random()*words.length)]+nums}));
                        }} style={{padding:"9px 12px",borderRadius:8,border:"1px solid #DDD3C0",background:"#EFE9DE",cursor:"pointer",fontSize:12,fontWeight:600,color:"#7A6E62",fontFamily:"inherit",whiteSpace:"nowrap"}}>🎲 Generate</button>
                      </div>
                    </div>
                  </div>
                  {form.childEmail&&form.childPassword&&(
                    <div style={{marginTop:10,padding:"10px 12px",background:"#EFE9DE",borderRadius:7,fontSize:12,color:"#5B5EA6"}}>
                      ✓ Child will log in with: <strong>{form.childEmail}</strong> / <strong>{form.childPassword}</strong> — note these down and give them to the child directly.
                    </div>
                  )}
                </div>
                <div style={{marginTop:14,display:"flex",gap:10,alignItems:"center"}}>
                  <Btn onClick={saveChild} variant="primary">Save Profile</Btn>
                  {form.preferredName&&<span style={{fontSize:12,color:"#2D7D6B",fontWeight:600}}>✓ Ready to save</span>}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {/* Archived banner */}
        {children.filter(c=>c.archived).length>0&&(
          <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"#EFE9DE",borderRadius:10,border:"1px solid #DDD3C0",marginBottom:4}}>
            <span style={{fontSize:13,color:"#7A6E62"}}>{children.filter(c=>c.archived).length} archived profile{children.filter(c=>c.archived).length!==1?"s":""}</span>
            <button onClick={()=>setShowArchived(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#1A6B6B",fontWeight:600,fontFamily:"inherit"}}>{showArchived?"Hide Archived ▲":"Show Archived ▼"}</button>
          </div>
        )}
        {children.filter(c=>showArchived?c.archived:!c.archived).map((child)=>{
          const cc=chapters.filter((c)=>c.childId===child.id);
          const na=cc.filter((c)=>c.status==="approved"||c.status==="published").length;
          return(
            <Card key={child.id} style={{cursor:"pointer",transition:"transform 0.18s,box-shadow 0.18s"}}
              onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 10px 28px rgba(26,22,18,0.13)";}}
              onMouseLeave={(e)=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                <div style={{width:50,height:50,borderRadius:14,background:"#EFE9DE",border:"2px solid #DDD3C0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#1A6B6B",fontFamily:"'Fraunces',serif",flexShrink:0}}>{child.preferredName.charAt(0)}</div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontWeight:700,fontSize:17,color:child.archived?"#7A6E62":"#1A1612"}}>{child.preferredName}</div>
                {child.archived&&<span style={{fontSize:11,fontWeight:700,background:"#EFE9DE",color:"#7A6E62",padding:"2px 8px",borderRadius:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>Archived</span>}
              </div>
                  <div style={{color:"#7A6E62",fontSize:13}}>{child.gender&&child.gender+" · "}Age {calcAge(child.dob)} · Born {child.dob?new Date(child.dob).toLocaleDateString("en-GB",{month:"long",year:"numeric"}):""}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                <div style={{flex:1,background:"#EFE9DE",borderRadius:9,padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:700,color:"#C8860A",fontFamily:"'Fraunces',serif"}}>{cc.length}</div>
                  <div style={{fontSize:11,color:"#7A6E62"}}>Entries</div>
                </div>
                <div style={{flex:1,background:"#EFE9DE",borderRadius:9,padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:700,color:"#2D7D6B",fontFamily:"'Fraunces',serif"}}>{na}</div>
                  <div style={{fontSize:11,color:"#7A6E62"}}>Approved</div>
                </div>
              </div>
              {child.notes&&<p style={{fontSize:12,color:"#7A6E62",marginBottom:14,fontStyle:"italic"}}>"{child.notes}"</p>}
              {cc.length===0&&<div style={{marginBottom:12,padding:"8px 12px",background:"#FFF8EE",borderRadius:8,border:"1px solid #F0D898",fontSize:13,color:"#C8860A",fontWeight:600}}>📝 No entries yet — start their story!</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {cc.length>0&&<Btn size="sm" variant="secondary" onClick={()=>{setActiveChild(child);setPage("chapters");}}>📖 View Story</Btn>}
                <Btn size="sm" onClick={()=>{setActiveChild(child);setPage("new-chapter");}}>✍️ {cc.length===0?"Start Story":"Add Report"}</Btn>
                <button onClick={async()=>{
                  const newArchived=!child.archived;
                  setChildren((p)=>p.map((c)=>c.id===child.id?{...c,archived:newArchived}:c));
                  if(!child.archived) setShowArchived(false);
                  const {error}=await supabase.from('children').update({archived:newArchived}).eq('id',child.id);
                  if(error){console.warn('child archive update failed',error.message);}
                }} style={{marginLeft:"auto",background:child.archived?"#EFF8F7":"#FFF8EE",border:"1px solid "+(child.archived?"#C0E0DC":"#F0D898"),cursor:"pointer",color:child.archived?"#1A6B6B":"#C8860A",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20,fontFamily:"inherit",transition:"all 0.18s"}}
                  title={child.archived?"Restore profile":"Archive profile"}>
                  {child.archived?"↩ Restore":"📦 Archive"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── New Chapter (Monthly reports only) ───────────────────────────────────────
function NewChapterPage({user,children,chapters,setChapters,activeChild,setActiveChild}){
  const [selectedId,setSelectedId]=useState(activeChild?String(activeChild.id):"");
  const [mode,setMode]=useState("single"); // single | bulk
  const [reportText,setReportText]=useState("");
  const [staffNotes,setStaffNotes]=useState("");
  const [reportMonth,setReportMonth]=useState("");
  const [fileName,setFileName]=useState("");
  const [extracting,setExtracting]=useState(false);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);
  const [dragOver,setDragOver]=useState(false);
  // Bulk
  const [bulkReports,setBulkReports]=useState([{label:"",text:""}]);
  const [bulkLoading,setBulkLoading]=useState(false);
  const [bulkResults,setBulkResults]=useState(null);
  const fileRef=useRef();
  const bulkFileRef=useRef();

  const selectedChild=children.find((c)=>c.id===selectedId);
  const prevChapters=chapters.filter((c)=>c.childId===selectedId&&(c.status==="approved"||c.status==="published"));

  const handleFileDrop=async(e)=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)await loadFile(f);};
  const handleFileSelect=async(e)=>{const f=e.target.files[0];if(f)await loadFile(f);};
  const loadFile=async(file)=>{
    setFileName(file.name);setExtracting(true);setError("");
    try{setReportText(await extractTextFromFile(file));}
    catch(err){setError(err.message||"Could not read file. Please paste the text directly.");}
    setExtracting(false);
  };

  const generate=async()=>{
    if(!selectedChild||!reportText.trim()){setError("Please select a child and provide the report text.");return;}
    setError("");setLoading(true);setResult(null);
    try{
      const combined=(reportMonth?"REPORT MONTH: "+reportMonth+"\n\n":"")+reportText+(staffNotes?"\n\nSTAFF NOTES: "+staffNotes:"");
      const data=await generateChapter(combined,selectedChild,prevChapters);
      setResult(data);
    }catch(err){setError("Could not generate. Please check your connection and try again.");}
    setLoading(false);
  };

  const saveEntry=async()=>{
    if(!result||!selectedChild) return;
    const isoDate=reportMonth?new Date(reportMonth+'-01').toISOString():result.reportDate?new Date(result.reportDate).toISOString():new Date().toISOString();
    const row={child_id:selectedChild.id,title:result.chapter.title,content:result.chapter.content,date:isoDate,status:"pending",report_type:"monthly",staff_id:user.id,manager_id:null,staff_insights:result.staffInsights||"",child_progress:result.childProgress||""};
    const {data,error}=await supabase.from('chapters').insert(row).select().single();
    if(error){
      console.warn('chapter save failed, falling back to local',error.message);
      setChapters((p)=>[...p,{id:Date.now(),childId:selectedChild.id,title:result.chapter.title,date:isoDate,status:"pending",content:result.chapter.content,reportType:"monthly",staffId:user.id,managerId:null,staffInsights:result.staffInsights,childProgress:result.childProgress}]);
    }else{
      setChapters((p)=>[...p,{id:data.id,childId:data.child_id,title:data.title,content:data.content||"",date:data.date,status:data.status||"pending",reportType:data.report_type||"monthly",staffId:data.staff_id,managerId:data.manager_id,staffInsights:data.staff_insights||"",childProgress:data.child_progress||"",sourceText:data.source_text||"",sourceFilename:data.source_filename||"",created:data.created_at}]);
    }
    setSaved(true);
  };

  const downloadEntry=()=>{
    if(!result||!selectedChild) return;
    const blob=new Blob([selectedChild.preferredName+"'s Story — "+result.chapter.title+"\n"+fmtDate(new Date())+"\n\n"+result.chapter.content],{type:"text/plain"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=selectedChild.preferredName+"-chapter.txt";a.click();URL.revokeObjectURL(url);
  };

  const runBulk=async()=>{
    const valid=bulkReports.filter((r)=>r.text.trim()&&r.label.trim());
    if(!selectedChild||valid.length===0){setError("Please select a child and add at least one report with a label.");return;}
    setError("");setBulkLoading(true);setBulkResults(null);
    try{
      const results=await generateBulkChapters(valid,selectedChild);
      setBulkResults(results);
    }catch(err){setError("Bulk generation failed. Please try again.");}
    setBulkLoading(false);
  };

  const saveBulkAll=async()=>{
    if(!bulkResults||!selectedChild) return;
    const now=new Date();
    const rows=bulkResults.map((r,i)=>({
      child_id:selectedChild.id,
      title:r.chapter.title,
      content:r.chapter.content,
      date:r.reportDate?new Date(r.reportDate).toISOString():new Date(now.getFullYear(),now.getMonth()-bulkResults.length+i+1,1).toISOString(),
      status:"pending",
      report_type:"monthly",
      staff_id:user.id,
      manager_id:null,
      staff_insights:r.staffInsights||"",
      child_progress:r.childProgress||"",
    }));
    const {data,error}=await supabase.from('chapters').insert(rows).select();
    if(error){
      console.warn('bulk chapter save failed, falling back to local',error.message);
      const fallback=rows.map((row,i)=>({
        id:Date.now()+i,childId:row.child_id,title:row.title,content:row.content,date:row.date,
        status:row.status,reportType:row.report_type,staffId:row.staff_id,managerId:row.manager_id,
        staffInsights:row.staff_insights,childProgress:row.child_progress,
      }));
      setChapters((p)=>[...p,...fallback]);
    }else{
      const translated=data.map(c=>({
        id:c.id,childId:c.child_id,title:c.title,content:c.content||"",date:c.date,
        status:c.status||"pending",reportType:c.report_type||"monthly",
        staffId:c.staff_id,managerId:c.manager_id,
        staffInsights:c.staff_insights||"",childProgress:c.child_progress||"",
        sourceText:c.source_text||"",sourceFilename:c.source_filename||"",
        created:c.created_at,
      }));
      setChapters((p)=>[...p,...translated]);
    }
    setSaved(true);
  };

  const downloadBulkPDF=()=>{
    if(!bulkResults||!selectedChild) return;
    const win=window.open("","_blank");
    win.document.write(`<html><head><title>${selectedChild.preferredName}'s Story</title><style>
      body{font-family:Georgia,serif;max-width:640px;margin:40px auto;color:#1A1612;line-height:1.8;}
      h1{font-size:32px;text-align:center;margin-bottom:4px;}
      .sub{text-align:center;color:#7A6E62;margin-bottom:40px;}
      .ch{margin-bottom:40px;page-break-inside:avoid;}
      .num{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#1A6B6B;margin-bottom:4px;}
      h2{font-size:22px;margin-bottom:6px;}
      .date{font-size:12px;color:#aaa;margin-bottom:14px;}
      p{margin-bottom:12px;}hr{border:none;border-top:1px solid #DDD3C0;margin:32px 0;}
    </style></head><body>
    <h1>${selectedChild.preferredName}'s Story So Far</h1>
    <p class="sub">A personal life story book</p>
    ${bulkResults.map((r,i)=>`<div class="ch"><div class="num">Chapter ${i+1} — ${r.reportLabel}</div><h2>${r.chapter.title}</h2>${r.chapter.content.split("\n").filter(Boolean).map((p)=>`<p>${p}</p>`).join("")}</div>${i<bulkResults.length-1?"<hr>":""}`).join("")}
    </body></html>`);
    win.document.close();win.print();
  };

  if(saved) return(
    <div className="fu" style={{textAlign:"center",padding:"80px 0"}}>
      <div style={{fontSize:64,marginBottom:16}}>🎉</div>
      <h2 style={{fontSize:26,marginBottom:8}}>Added to {selectedChild?.preferredName}'s story!</h2>
      <p style={{color:"#7A6E62",marginBottom:28}}>A manager can review it in Approvals.</p>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <Btn onClick={()=>{setSaved(false);setResult(null);setBulkResults(null);setReportText("");setStaffNotes("");setFileName("");}}>Add Another</Btn>
        <Btn variant="secondary" onClick={()=>{setSaved(false);setResult(null);setBulkResults(null);setReportText("");setStaffNotes("");setFileName("");}}>Done</Btn>
      </div>
    </div>
  );

  return(
    <div>
      <div className="fu"><PageHeader title="Add Monthly Report" subtitle="Upload or paste a report — AI generates a life story chapter, staff insights, and trend analysis."/></div>

      {/* Mode toggle */}
      <div className="fu1" style={{display:"flex",gap:4,background:"#EFE9DE",borderRadius:10,padding:4,marginBottom:20,width:"fit-content"}}>
        {[["single","📄 Single Report"],["bulk","📦 Bulk Upload (Multiple Months)"]].map(([id,label])=>(
          <button key={id} onClick={()=>setMode(id)} style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:mode===id?700:500,background:mode===id?"#1A1612":"transparent",color:mode===id?"#fff":"#7A6E62",transition:"all 0.18s"}}>{label}</button>
        ))}
      </div>

      {/* Child selector */}
      <div className="fu2" style={{marginBottom:16}}>
        <Card>
          <div style={{fontSize:12,fontWeight:700,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Select Child</div>
          <FSelect value={selectedId} onChange={(v)=>{setSelectedId(v);setActiveChild(children.find((c)=>c.id===v)||null);}} options={children.filter((c)=>!c.archived).map((c)=>({value:String(c.id),label:c.preferredName}))} placeholder="Choose a child..."/>
          {selectedChild?.notes&&<div style={{marginTop:10,padding:"8px 12px",background:"#EFE9DE",borderRadius:8,fontSize:13,color:"#6B5A3E"}}>📌 {selectedChild.notes}</div>}
        </Card>
      </div>

      {/* SINGLE MODE */}
      {mode==="single"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="fu3">
              <Card>
                <div style={{fontSize:12,fontWeight:700,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Upload or Paste Monthly Report</div>
                <div onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleFileDrop} onClick={()=>fileRef.current&&fileRef.current.click()}
                  style={{border:"2px dashed "+(dragOver?"#1A6B6B":"#DDD3C0"),borderRadius:10,padding:"18px",textAlign:"center",cursor:"pointer",marginBottom:12,background:dragOver?"#EFF8F8":"transparent",transition:"all 0.18s"}}>
                  {extracting?(<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div style={{width:16,height:16,border:"2px solid #DDD3C0",borderTopColor:"#1A6B6B",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><span style={{fontSize:13,color:"#1A6B6B",fontWeight:600}}>Extracting text...</span></div>):(
                    <><div style={{fontSize:24,marginBottom:4}}>{fileName?"📄":"📎"}</div>
                    <p style={{fontSize:13,fontWeight:600,color:"#1A1612"}}>{fileName?"✓ "+fileName:"Drop PDF here or click to browse"}</p>
                    <p style={{fontSize:11,color:"#7A6E62",marginTop:2}}>PDF, Word (.docx) or text file</p></>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.doc" onChange={handleFileSelect} style={{display:"none"}}/>
                </div>
                <p style={{fontSize:12,color:"#7A6E62",textAlign:"center",marginBottom:8}}>— or paste the report text below —</p>
                <FTextarea value={reportText} onChange={setReportText} rows={7} placeholder="Paste the monthly staff report here. AI will transform it into a warm life story chapter, filtering all clinical and safeguarding content..."/>
              </Card>
            </div>
            <Card>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Report Month <span style={{fontSize:11,fontWeight:400}}>(optional override)</span></div>
                  <input type="month" value={reportMonth} onChange={(e)=>setReportMonth(e.target.value)}
                    style={{width:"100%",padding:"9px 13px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,color:"#1A1612",outline:"none"}}/>
                  <p style={{fontSize:11,color:"#7A6E62",marginTop:4}}>AI reads the date from the report — only set this if the date is wrong</p>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Staff Notes (Optional)</div>
                  <FTextarea value={staffNotes} onChange={setStaffNotes} rows={2} placeholder="e.g. Exclude the incident on 14th"/>
                </div>
              </div>
            </Card>
            {error&&<p style={{color:"#B5464A",fontSize:13,padding:"10px 14px",background:"#FFF0EF",borderRadius:8}}>{error}</p>}
            <Btn onClick={generate} disabled={loading||extracting} style={{width:"100%",justifyContent:"center",padding:"13px"}}>
              {loading?"✨ Generating chapter + insights...":"✨ Generate Chapter + Staff Insights"}
            </Btn>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {loading&&<Card style={{textAlign:"center",padding:"60px 20px"}}><Spinner/><p style={{color:"#7A6E62",fontSize:14,fontWeight:600}}>Writing chapter, analysing trends,</p><p style={{color:"#7A6E62",fontSize:14}}>preparing staff insights...</p></Card>}
            {!loading&&!result&&<Card style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:52,marginBottom:12}}>✍️</div><p style={{fontSize:14,color:"#7A6E62"}}>Your chapter and insights will appear here.</p></Card>}
            {!loading&&result&&(
              <>
                <Card className="fu" style={{borderLeft:"4px solid #1A6B6B"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <h3 style={{fontSize:15,color:"#1A6B6B"}}>📖 Story Chapter</h3>
                    <div style={{display:"flex",gap:8}}>
                      <Btn size="sm" variant="ghost" onClick={downloadEntry}>⬇ Download</Btn>
                      <Btn size="sm" onClick={saveEntry}>✓ Add to Story</Btn>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:"#7A6E62",marginBottom:10,padding:"7px 10px",background:"#EFE9DE",borderRadius:7}}>✏️ Edit below if needed, then click <strong>Add to Story</strong></div>
                  <input value={result.chapter.title} onChange={(e)=>setResult((r)=>({...r,chapter:{...r.chapter,title:e.target.value}}))} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:16,fontWeight:700,fontFamily:"'Fraunces',serif",color:"#1A1612",outline:"none",marginBottom:10}}/>
                  <textarea value={result.chapter.content} onChange={(e)=>setResult((r)=>({...r,chapter:{...r.chapter,content:e.target.value}}))} rows={7} style={{width:"100%",padding:"12px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,color:"#1A1612",resize:"vertical",outline:"none",lineHeight:1.8}}/>
                </Card>

                <Card className="fu1" style={{borderLeft:"4px solid #2D7D6B"}}>
                  <h3 style={{fontSize:15,color:"#2D7D6B",marginBottom:10}}>👩‍⚕️ Staff Insights</h3>
                  <div style={{background:"#EFE9DE",borderRadius:8,padding:12,marginBottom:12,fontSize:13,lineHeight:1.7,color:"#1A1612"}}><strong>Overview:</strong> {result.staffInsights.overview}</div>
                  <p style={{fontSize:12,fontWeight:700,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Care Tips</p>
                  {(result.staffInsights.tips||[]).map((tip,i)=>(
                    <div key={i} style={{display:"flex",gap:10,marginBottom:8,padding:"9px 12px",background:"#EFE9DE",borderRadius:8,fontSize:13,color:"#1A1612"}}>
                      <span style={{color:"#2D7D6B",fontWeight:700,flexShrink:0}}>{i+1}.</span>{tip}
                    </div>
                  ))}
                  {result.staffInsights.trendAnalysis&&(
                    <div style={{marginTop:12,padding:"12px 14px",background:"#F0F0FA",borderRadius:8,border:"1px solid #D0D0EA"}}>
                      <p style={{fontSize:12,fontWeight:700,color:"#5B5EA6",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>📊 Trend Analysis</p>
                      {result.staffInsights.trendAnalysis.flags.map((f,i)=><div key={i} style={{fontSize:13,color:"#1A1612",marginBottom:4}}>• {f}</div>)}
                      {result.staffInsights.trendAnalysis.insights.map((ins,i)=>(
                        <div key={i} style={{fontSize:13,color:"#5B5EA6",marginTop:6,fontStyle:"italic"}}>→ {ins}</div>
                      ))}
                      <div style={{marginTop:10,padding:"8px 10px",background:"rgba(91,94,166,0.08)",borderRadius:6,fontSize:11,color:"#5B5EA6",lineHeight:1.5}}>
                        ⚠️ <strong>Disclaimer:</strong> These insights are AI-generated observations based on submitted report data. They are intended as a reflective tool for trained professionals only and do not constitute clinical advice, diagnosis, or a formal assessment. All decisions regarding child welfare must be made by qualified care professionals in accordance with your organisation's policies.
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="fu2" style={{borderLeft:"4px solid #5B5EA6"}}>
                  <h3 style={{fontSize:15,color:"#5B5EA6",marginBottom:12}}>⭐ Progress Snapshot</h3>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                    {[["Mood","mood","#C8860A"],["Effort","effort","#2D7D6B"],["Social","social","#5B5EA6"]].map(([l,k,c])=>(
                      <div key={k} style={{background:"#EFE9DE",borderRadius:9,padding:"10px 12px",textAlign:"center"}}>
                        <div style={{fontSize:12,color:"#7A6E62",marginBottom:6,fontWeight:600}}>{l}</div>
                        <ScoreDots value={result.childProgress[k]} max={5} color={c}/>
                      </div>
                    ))}
                  </div>
                  {(result.childProgress.strengths||[]).length>0&&(
                    <div style={{marginBottom:10}}>
                      <p style={{fontSize:12,fontWeight:700,color:"#2D7D6B",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>✨ Strengths</p>
                      {result.childProgress.strengths.map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:13,color:"#1A1612"}}><span style={{color:"#2D7D6B"}}>★</span>{s}</div>)}
                    </div>
                  )}
                  {(result.childProgress.challenges||[]).length>0&&(
                    <div>
                      <p style={{fontSize:12,fontWeight:700,color:"#C8860A",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>🌱 Growth Areas</p>
                      {result.childProgress.challenges.map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:13,color:"#1A1612"}}><span style={{color:"#C8860A"}}>→</span>{s}</div>)}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* BULK MODE */}
      {mode==="bulk"&&(
        <div>
          <Card style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Add Monthly Reports (one per month)</div>
            {bulkReports.map((r,i)=>(
              <div key={i} style={{background:"#F8F5F0",borderRadius:10,padding:14,marginBottom:10,border:"1px solid #EDE8DF"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:26,height:26,borderRadius:7,background:"#1A6B6B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <input value={r.label} onChange={(e)=>setBulkReports((p)=>p.map((x,j)=>j===i?{...x,label:e.target.value}:x))} placeholder="Month label — e.g. January 2025"
                    style={{flex:1,padding:"7px 12px",borderRadius:7,border:"1px solid #DDD3C0",background:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                  {bulkReports.length>1&&<button onClick={()=>setBulkReports((p)=>p.filter((_,j)=>j!==i))} style={{background:"#FFF0EF",border:"1px solid #F0C0C0",borderRadius:7,padding:"5px 10px",cursor:"pointer",color:"#B5464A",fontSize:12,fontFamily:"inherit"}}>✕</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>📎 Upload File</div>
                    <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:7,border:"1px dashed #DDD3C0",background:"#fff",cursor:"pointer",fontSize:13,color:"#7A6E62"}}>
                      <span>{r.fileName||"Drop PDF, Word or text file"}</span>
                      <input type="file" accept=".pdf,.docx,.doc,.txt" style={{display:"none"}} onChange={async(e)=>{
                        const file=e.target.files[0];if(!file)return;
                        setBulkReports(p=>p.map((x,j)=>j===i?{...x,fileName:file.name,loading:true}:x));
                        try{const text=await extractTextFromFile(file);setBulkReports(p=>p.map((x,j)=>j===i?{...x,text,loading:false}:x));}
                        catch(err){setBulkReports(p=>p.map((x,j)=>j===i?{...x,loading:false}:x));alert("Could not read — paste text instead.");}
                      }}/>
                    </label>
                    {r.loading&&<p style={{fontSize:11,color:"#1A6B6B",marginTop:4}}>Reading file...</p>}
                    {r.text&&!r.loading&&<p style={{fontSize:11,color:"#2D7D6B",marginTop:4,fontWeight:600}}>✓ {r.text.length} characters ready</p>}
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Or Paste Text</div>
                    <textarea value={r.text} onChange={(e)=>setBulkReports((p)=>p.map((x,j)=>j===i?{...x,text:e.target.value}:x))} rows={3} placeholder="Paste report text..."
                      style={{width:"100%",padding:"8px 12px",borderRadius:7,border:"1px solid #DDD3C0",background:"#fff",fontSize:13,resize:"vertical",outline:"none",fontFamily:"inherit"}}/>
                  </div>
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <Btn size="sm" variant="secondary" onClick={()=>setBulkReports((p)=>[...p,{label:"",text:""}])}>+ Add Month</Btn>
            </div>
          </Card>
          {error&&<p style={{color:"#B5464A",fontSize:13,padding:"10px 14px",background:"#FFF0EF",borderRadius:8,marginBottom:12}}>{error}</p>}
          <Btn onClick={runBulk} disabled={bulkLoading||!selectedChild} style={{width:"100%",justifyContent:"center",padding:"13px",marginBottom:20}}>
            {bulkLoading?"✨ Generating all chapters...":"✨ Generate All Chapters"}
          </Btn>
          {bulkLoading&&<Card style={{textAlign:"center",padding:"40px"}}><Spinner/><p style={{color:"#7A6E62"}}>Processing {bulkReports.filter(r=>r.text.trim()).length} months — this may take a moment...</p></Card>}
          {bulkResults&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <h3 style={{fontSize:16}}>{bulkResults.length} chapters generated</h3>
                <div style={{display:"flex",gap:10}}>
                  <Btn variant="secondary" size="sm" onClick={downloadBulkPDF}>📥 Download Full Book PDF</Btn>
                  <Btn size="sm" onClick={saveBulkAll}>✓ Save All to Story</Btn>
                </div>
              </div>
              {bulkResults.map((r,i)=>(
                <Card key={i} style={{marginBottom:12,borderLeft:"4px solid #1A6B6B"}}>
                  <div style={{fontSize:11,color:"#7A6E62",fontWeight:600,marginBottom:4,textTransform:"uppercase"}}>Chapter {i+1} — {r.reportLabel}</div>
                  <h3 style={{fontSize:16,marginBottom:6}}>{r.chapter.title}</h3>
                  <p style={{fontSize:13,color:"#7A6E62",lineHeight:1.7}}>{r.chapter.content.slice(0,200)}...</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Story Timeline ────────────────────────────────────────────────────────────
function ChaptersPage({user,children,chapters,setChapters,setPage,activeChild,setActiveChild}){
  const [filterChildId,setFilterChildId]=useState(activeChild?String(activeChild.id):"");
  const [openId,setOpenId]=useState(null);
  const [tab,setTab]=useState("story");
  const [hasSubscription]=useState(user.subscription==="active");

  const filtered=chapters.filter((c)=>filterChildId?c.childId===filterChildId:true);
  const filterChild=children.find((c)=>c.id===filterChildId);
  const approved=filtered.filter((c)=>c.status==="approved"||c.status==="published");
  const trendData=approved.filter((c)=>c.childProgress).map((c)=>({date:fmtDate(c.date),mood:c.childProgress.mood||0,effort:c.childProgress.effort||0,social:c.childProgress.social||0}));

  const downloadFullBook=()=>{
    if(!hasSubscription){alert("PDF download is available on all subscription plans. Please sign up to continue.");return;}
    if(approved.length===0){alert("No approved chapters yet. Approve some chapters first.");return;}
    const name=filterChild?filterChild.preferredName+"'s":"My";
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} Story So Far</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Georgia&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Georgia,serif;background:#fff;color:#1A1612;line-height:1.85;padding:0;}
  .page{max-width:680px;margin:0 auto;padding:60px 48px;}
  .cover{text-align:center;padding:120px 48px 80px;}
  .cover-icon{font-size:64px;margin-bottom:24px;}
  .cover h1{font-size:42px;color:#1A1612;margin-bottom:12px;font-family:Georgia,serif;}
  .cover .name{font-size:28px;color:#1A6B6B;margin-bottom:8px;}
  .cover .sub{font-size:15px;color:#7A6E62;margin-bottom:40px;}
  .cover .divider{width:60px;height:3px;background:#1A6B6B;margin:0 auto 40px;}
  .cover .meta{font-size:13px;color:#aaa;}
  hr.page-break{page-break-after:always;border:none;margin:0;}
  .chapter{padding:60px 48px;page-break-inside:avoid;}
  .chapter-num{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#1A6B6B;margin-bottom:8px;font-weight:600;}
  .chapter h2{font-size:26px;margin-bottom:6px;color:#1A1612;}
  .chapter .date{font-size:12px;color:#aaa;margin-bottom:24px;}
  .chapter p{margin-bottom:16px;font-size:16px;line-height:1.9;color:#2A2420;}
  .chapter-divider{width:40px;height:2px;background:#DDD3C0;margin:40px 0;}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .chapter{page-break-inside:avoid;}
  }
</style></head><body>
<div class="cover">
  <div class="cover-icon">📖</div>
  <div class="name">${name} Story</div>
  <h1>So Far</h1>
  <div class="divider"></div>
  <p class="sub">A personal life story book · ${approved.length} chapter${approved.length!==1?"s":""}</p>
  <p class="meta">My Story So Far · ${new Date().toLocaleDateString("en-GB",{year:"numeric",month:"long"})}</p>
</div>
<hr class="page-break">
${approved.map((ch,i)=>`
<div class="chapter">
  <div class="chapter-num">Chapter ${i+1}</div>
  <h2>${ch.title}</h2>
  <div class="date">${fmtDate(ch.date)}</div>
  ${ch.content.split("\n").filter(Boolean).map((p)=>`<p>${p}</p>`).join("")}
  ${i<approved.length-1?"<div class=\"chapter-divider\"></div>":""}
</div>
${i<approved.length-1?"<hr class=\"page-break\">":`}`}
`).join("")}
</body></html>`;
    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=(filterChild?filterChild.preferredName+"-":"")+"story-so-far.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const TabBtn=({id,label})=>(
    <button onClick={()=>setTab(id)} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:tab===id?700:500,fontSize:13,background:tab===id?"#1A1612":"transparent",color:tab===id?"#fff":"#7A6E62",transition:"all 0.18s"}}>{label}</button>
  );

  return(
    <div>
      <div className="fu">
        <PageHeader title="Story Timeline" subtitle="Chapters, progress trends, and staff insights."
          action={filterChildId&&<Btn variant="secondary" size="sm" onClick={downloadFullBook}>📥 {hasSubscription?"Download Story PDF":"🔒 PDF (Subscribers Only)"}</Btn>}/>
      </div>
      <div className="fu1"><Card style={{marginBottom:20}}>
        <FSelect label="Filter by child" value={filterChildId} onChange={(v)=>{setFilterChildId(v);setActiveChild(children.find((c)=>c.id===v)||null);}} options={children.filter((c)=>!c.archived).map((c)=>({value:String(c.id),label:c.preferredName}))} placeholder="All children"/>
      </Card></div>

      {filterChildId&&(
        <div className="fu2" style={{display:"flex",gap:4,background:"#EFE9DE",borderRadius:10,padding:4,marginBottom:20,width:"fit-content"}}>
          <TabBtn id="story" label="📖 Story"/>
          <TabBtn id="progress" label="⭐ Progress"/>
          <TabBtn id="staff" label="👩‍⚕️ Staff Insights"/>
        </div>
      )}

      {(tab==="story"||!filterChildId)&&(
        <div style={{position:"relative"}}>
          {filtered.length===0&&<div style={{textAlign:"center",padding:60,color:"#DDD3C0"}}><div style={{fontSize:48,marginBottom:12}}>📖</div><p>No entries yet.</p></div>}
          {filtered.length>0&&<div style={{position:"absolute",left:22,top:0,bottom:0,width:2,background:"#DDD3C0"}}/>}
          <div style={{display:"flex",flexDirection:"column",gap:12,paddingLeft:52}}>
            {filtered.map((ch,i)=>{
              const chChild=children.find((c)=>c.id===ch.childId);
              const dotColor=ch.status==="published"?"#1A6B6B":ch.status==="approved"?"#2D7D6B":ch.status==="pending"?"#C8860A":"#5B5EA6";
              const isOpen=openId===ch.id;
              return(
                <div key={ch.id} style={{position:"relative"}}>
                  <div style={{position:"absolute",left:-38,top:18,width:16,height:16,borderRadius:"50%",background:dotColor,border:"3px solid #F8F5F0"}}/>
                  <Card style={{cursor:"pointer"}} onClick={()=>setOpenId(isOpen?null:ch.id)}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:11,color:"#7A6E62",fontWeight:600,marginBottom:1}}>Chapter {i+1}{!filterChildId&&chChild?" — "+chChild.preferredName:""}</div>
                        <h3 style={{fontSize:16,color:"#1A1612"}}>{ch.title}</h3>
                        <div style={{fontSize:12,color:"#7A6E62"}}>{fmtDate(ch.date)}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <Badge label={ch.status} color={ch.status}/>
                        <span style={{color:"#DDD3C0",fontSize:12}}>{isOpen?"▲":"▼"}</span>
                      </div>
                    </div>
                    {isOpen&&(
                      <div className="fu" style={{marginTop:14}}>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:15,lineHeight:1.9,color:"#1A1612",padding:16,background:"#EFE9DE",borderRadius:10,borderLeft:"3px solid #1A6B6B",marginBottom:10}}>
                          {ch.content.split("\n").filter(Boolean).map((p,pi)=><p key={pi} style={{marginBottom:10}}>{p}</p>)}
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <Btn size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation();
                            const blob=new Blob([ch.title+"\n"+fmtDate(ch.date)+"\n\n"+ch.content],{type:"text/plain"});
                            const url=URL.createObjectURL(blob);const a=document.createElement("a");
                            a.href=url;a.download=ch.title.replace(/ /g,"-")+".txt";a.click();URL.revokeObjectURL(url);
                          }}>⬇ Download</Btn>
                          {ch.status==="approved"&&(user.role==="manager"||user.role==="staff")&&(
                            <Btn size="sm" onClick={async(e)=>{e.stopPropagation();const {error}=await supabase.from('chapters').update({status:"published"}).eq('id',ch.id);if(error)console.warn('publish failed',error.message);setChapters(p=>p.map(c=>c.id===ch.id?{...c,status:"published"}:c));}} style={{background:"#1A6B6B",color:"#fff"}}>
                              📖 Publish to Child
                            </Btn>
                          )}
                          {ch.status==="published"&&(user.role==="manager"||user.role==="staff")&&(
                            <Btn size="sm" variant="secondary" onClick={async(e)=>{e.stopPropagation();const {error}=await supabase.from('chapters').update({status:"approved"}).eq('id',ch.id);if(error)console.warn('unpublish failed',error.message);setChapters(p=>p.map(c=>c.id===ch.id?{...c,status:"approved"}:c));}}>
                              ↩ Unpublish
                            </Btn>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="progress"&&filterChildId&&(
        <div className="fu">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:16}}>
            {[["Mood 😊","mood","#C8860A"],["Effort 💪","effort","#2D7D6B"],["Social 🤝","social","#5B5EA6"]].map(([label,key,color])=>(
              <Card key={key}>
                <h3 style={{fontSize:14,marginBottom:14,color:"#1A1612"}}>{label}</h3>
                {trendData.length===0&&<p style={{color:"#7A6E62",fontSize:13}}>No data yet.</p>}
                {trendData.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{fontSize:11,color:"#7A6E62",width:80,flexShrink:0}}>{d.date}</div>
                    <div style={{flex:1,height:10,background:"#EFE9DE",borderRadius:5,overflow:"hidden"}}>
                      <div style={{height:"100%",width:(d[key]/5*100)+"%",background:color,borderRadius:5,transition:"width 0.6s"}}/>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:color,width:18,textAlign:"right"}}>{d[key]}</div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <h3 style={{fontSize:14,marginBottom:12,color:"#2D7D6B"}}>⭐ Strengths across all months</h3>
              {approved.filter((c)=>c.childProgress).flatMap((c)=>c.childProgress.strengths||[]).slice(0,8).map((s,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:13,color:"#1A1612",padding:"7px 10px",background:"#EFE9DE",borderRadius:7}}><span style={{color:"#2D7D6B",fontWeight:700}}>★</span>{s}</div>
              ))}
            </Card>
            <Card>
              <h3 style={{fontSize:14,marginBottom:12,color:"#C8860A"}}>🌱 Growth areas</h3>
              <p style={{fontSize:12,color:"#7A6E62",marginBottom:10}}>Every challenge is a chance to grow.</p>
              {approved.filter((c)=>c.childProgress).flatMap((c)=>c.childProgress.challenges||[]).map((s,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:13,color:"#1A1612",padding:"7px 10px",background:"#FFF8EE",borderRadius:7,border:"1px solid #F0D898"}}><span style={{color:"#C8860A"}}>→</span>{s}</div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {tab==="staff"&&filterChildId&&(
        <div className="fu">
          {[...approved].reverse().filter((c)=>c.staffInsights).map((ch)=>(
            <Card key={ch.id} style={{marginBottom:16,borderLeft:"4px solid #2D7D6B"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div><h3 style={{fontSize:16}}>{ch.title}</h3><span style={{fontSize:12,color:"#7A6E62"}}>{fmtDate(ch.date)}</span></div>
                <Badge label="Approved" color="approved"/>
              </div>
              <div style={{background:"#EFE9DE",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,lineHeight:1.7}}><strong>Overview:</strong> {ch.staffInsights.overview}</div>
              {(ch.staffInsights.tips||[]).map((tip,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:7,padding:"8px 12px",background:"#EFE9DE",borderRadius:8,fontSize:13}}>
                  <span style={{color:"#2D7D6B",fontWeight:700,flexShrink:0}}>{i+1}.</span>{tip}
                </div>
              ))}
              {ch.staffInsights.trendAnalysis&&(
                <div style={{marginTop:10,padding:"10px 14px",background:"#F0F0FA",borderRadius:8,border:"1px solid #D0D0EA"}}>
                  <p style={{fontSize:12,fontWeight:700,color:"#5B5EA6",marginBottom:8}}>📊 Trend Flags</p>
                  {ch.staffInsights.trendAnalysis.flags.map((f,i)=><div key={i} style={{fontSize:13,marginBottom:4}}>• {f}</div>)}
                  {ch.staffInsights.trendAnalysis.insights.map((ins,i)=><div key={i} style={{fontSize:13,color:"#5B5EA6",fontStyle:"italic",marginTop:4}}>→ {ins}</div>)}
                  <div style={{marginTop:8,fontSize:11,color:"#5B5EA6",padding:"6px 8px",background:"rgba(91,94,166,0.08)",borderRadius:5,lineHeight:1.5}}>⚠️ AI-generated observations for trained professionals only. Not clinical advice.</div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Approvals ─────────────────────────────────────────────────────────────────
function ApprovalsPage({user,children,chapters,setChapters}){
  const pending=chapters.filter((c)=>c.status==="pending");
  const approved=chapters.filter((c)=>c.status==="approved");
  const [editingId,setEditingId]=useState(null);
  const [editContent,setEditContent]=useState({title:"",content:""});

  const approve=async(id)=>{const {error}=await supabase.from('chapters').update({status:"approved",manager_id:user.id}).eq('id',id);if(error)console.warn('approve failed',error.message);setChapters((p)=>p.map((c)=>c.id===id?{...c,status:"approved",managerId:user.id}:c));};
  const publish=async(id)=>{const {error}=await supabase.from('chapters').update({status:"published"}).eq('id',id);if(error)console.warn('publish failed',error.message);setChapters((p)=>p.map((c)=>c.id===id?{...c,status:"published"}:c));};
  const unpublish=async(id)=>{const {error}=await supabase.from('chapters').update({status:"approved"}).eq('id',id);if(error)console.warn('unpublish failed',error.message);setChapters((p)=>p.map((c)=>c.id===id?{...c,status:"approved"}:c));};
  const reject=async(id)=>{const {error}=await supabase.from('chapters').delete().eq('id',id);if(error)console.warn('reject failed',error.message);setChapters((p)=>p.filter((c)=>c.id!==id));};
  const startEdit=(ch)=>{setEditingId(ch.id);setEditContent({title:ch.title,content:ch.content});};
  const saveEdit=async(id)=>{
    const {error}=await supabase.from('chapters').update({title:editContent.title,content:editContent.content}).eq('id',id);
    if(error)console.warn('saveEdit failed',error.message);
    setChapters((p)=>p.map((c)=>c.id===id?{...c,title:editContent.title,content:editContent.content}:c));
    setEditingId(null);
  };

  const ChapterCard=({ch,showPublish})=>{
    const child=children.find((c)=>c.id===ch.childId);
    const author=USERS.find((u)=>u.id===ch.staffId);
    const isEditing=editingId===ch.id;
    return(
      <Card style={{marginBottom:18,borderLeft:"4px solid "+(ch.status==="published"?"#1A6B6B":ch.status==="approved"?"#2D7D6B":"#C8860A")}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
          <div>
            {isEditing
              ? <input value={editContent.title} onChange={(e)=>setEditContent(v=>({...v,title:e.target.value}))}
                  style={{fontSize:17,fontWeight:700,fontFamily:"'Fraunces',serif",padding:"6px 10px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",outline:"none",width:"100%",marginBottom:6}}/>
              : <h3 style={{fontSize:18,marginBottom:3}}>{ch.title}</h3>
            }
            <p style={{fontSize:13,color:"#7A6E62"}}>For <strong>{child?child.preferredName:"?"}</strong> · By {author?author.name:"?"} · {fmtDate(ch.date)}</p>
          </div>
          <Badge label={ch.status} color={ch.status}/>
        </div>

        {isEditing ? (
          <textarea value={editContent.content} onChange={(e)=>setEditContent(v=>({...v,content:e.target.value}))} rows={8}
            style={{width:"100%",padding:"12px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,lineHeight:1.8,resize:"vertical",outline:"none",marginBottom:12,fontFamily:"'Fraunces',serif"}}/>
        ):(
          <div style={{fontFamily:"'Fraunces',serif",fontSize:14,lineHeight:1.85,padding:"14px 16px",background:"#EFE9DE",borderRadius:10,marginBottom:14,borderLeft:"3px solid #1A6B6B"}}>
            {ch.content.split("\n").filter(Boolean).map((p,i)=><p key={i} style={{marginBottom:8}}>{p}</p>)}
          </div>
        )}

        {ch.staffInsights&&!isEditing&&<div style={{marginBottom:14,padding:"10px 14px",background:"#EFF8F7",borderRadius:10,border:"1px solid #C0E0DC"}}><p style={{fontSize:12,fontWeight:700,color:"#2D7D6B",marginBottom:4}}>Staff Overview</p><p style={{fontSize:13,color:"#1A1612"}}>{ch.staffInsights.overview}</p></div>}

        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {isEditing ? (
            <>
              <Btn variant="primary" onClick={()=>saveEdit(ch.id)}>💾 Save Changes</Btn>
              <Btn variant="ghost" onClick={()=>setEditingId(null)}>Cancel</Btn>
            </>
          ):(
            <>
              {ch.status==="pending"&&<Btn onClick={()=>approve(ch.id)}>✓ Approve</Btn>}
              {ch.status==="approved"&&<Btn variant="primary" onClick={()=>publish(ch.id)} style={{background:"#1A6B6B"}}>📖 Publish to Child</Btn>}
              {ch.status==="published"&&<Btn variant="secondary" onClick={()=>unpublish(ch.id)}>↩ Unpublish</Btn>}
              <Btn variant="ghost" onClick={()=>startEdit(ch)}>✏️ Edit</Btn>
              <Btn variant="danger" onClick={()=>reject(ch.id)}>✕ Remove</Btn>
            </>
          )}
        </div>
      </Card>
    );
  };

  return(
    <div>
      <div className="fu"><PageHeader title="Review & Publish" subtitle="Approve, edit, and control exactly what the child sees."/></div>

      {/* Status explanation */}
      <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        {[
          {color:"#C8860A",label:"Pending",desc:"Waiting for manager review"},
          {color:"#2D7D6B",label:"Approved",desc:"Reviewed — ready to publish to child"},
          {color:"#1A6B6B",label:"Published",desc:"Visible in the child's portal"},
        ].map(s=>(
          <div key={s.label} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#fff",borderRadius:10,border:"1px solid #DDD3C0"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#1A1612"}}>{s.label}</div>
              <div style={{fontSize:12,color:"#7A6E62"}}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {pending.length===0&&approved.length===0&&(
        <div className="fu2"><Card style={{textAlign:"center",padding:60}}><div style={{fontSize:48,marginBottom:12}}>✅</div><p style={{color:"#7A6E62"}}>All caught up — nothing to review.</p></Card></div>
      )}

      {pending.length>0&&(
        <div className="fu2">
          <h3 style={{fontSize:14,fontWeight:700,color:"#C8860A",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>⏳ Pending Review ({pending.length})</h3>
          {pending.map((ch)=><ChapterCard key={ch.id} ch={ch} showPublish={false}/>)}
        </div>
      )}

      {approved.length>0&&(
        <div className="fu3">
          <h3 style={{fontSize:14,fontWeight:700,color:"#2D7D6B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>✅ Approved — Ready to Publish ({approved.length})</h3>
          <div style={{padding:"10px 14px",background:"#EFF8F7",borderRadius:8,marginBottom:14,fontSize:13,color:"#1A6B6B",border:"1px solid #C0E0DC"}}>
            💡 Click <strong>Edit</strong> to make any final changes, then <strong>Publish to Child</strong> when ready. The child will only see published chapters.
          </div>
          {approved.map((ch)=><ChapterCard key={ch.id} ch={ch} showPublish={true}/>)}
        </div>
      )}
    </div>
  );
}

// ── Child Portal ──────────────────────────────────────────────────────────────
function ChildStoryPage({user,chapters,children}){
  const myChapters=chapters.filter((c)=>c.childId===user.childId&&c.status==="published");
  const [selectedStyle,setSelectedStyle]=useState("personal");
  const [rewriting,setRewriting]=useState(null);
  const [rewrittenChapters,setRewrittenChapters]=useState({});
  const [openId,setOpenId]=useState(myChapters.length>0?myChapters[myChapters.length-1].id:null);
  const child=children.find((c)=>c.id===user.childId);
  const name=child?child.preferredName:user.name;

  const rewriteChapter=async(ch)=>{
    setRewriting(ch.id);
    try{
      const result=await rewriteInStyle(ch,selectedStyle,child||{preferredName:name,dob:"2010-01-01"});
      setRewrittenChapters((p)=>({...p,[ch.id+"_"+selectedStyle]:result}));
    }catch(e){}
    setRewriting(null);
  };

  const getContent=(ch)=>rewrittenChapters[ch.id+"_"+selectedStyle]||ch;

  const styleConfig={
    personal:{label:"Personal",icon:"💛",desc:"Warm and real — just for you",color:"#C8860A"},
    fictional:{label:"Fictional",icon:"🏰",desc:"Your story as an adventure",color:"#5B5EA6"},
    motivational:{label:"Motivational",icon:"🚀",desc:"Your wins, your strength",color:"#2D7D6B"},
    emotional:{label:"Emotional",icon:"🌿",desc:"Gentle and heartfelt",color:"#B5464A"},
  };

  return(
    <div style={{maxWidth:780,margin:"0 auto",width:"100%",overflowX:"hidden"}}>

      {/* Hero header */}
      <div className="fu" style={{background:"linear-gradient(135deg,#1A4A4A 0%,#1A6B6B 100%)",borderRadius:20,padding:"32px 36px",marginBottom:28,position:"relative",overflow:"hidden"}}>
        <svg style={{position:"absolute",right:0,top:0,opacity:0.08}} width="200" height="140" viewBox="0 0 200 140">
          <circle cx="150" cy="30" r="80" fill="#C8860A"/>
          <circle cx="180" cy="100" r="50" fill="#fff"/>
        </svg>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:13,color:"rgba(255,253,249,0.6)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>📖 Your Life Story</div>
          <h1 style={{fontFamily:"'Georgia',serif",fontSize:32,color:"#FFFDF9",marginBottom:6,lineHeight:1.2}}>{name}'s Story So Far</h1>
          <p style={{color:"rgba(255,253,249,0.65)",fontSize:14}}>{myChapters.length} chapter{myChapters.length!==1?"s":""} · Your story, your way</p>
        </div>
      </div>

      {/* Style selector */}
      <div className="fu1" style={{background:"#fff",borderRadius:16,padding:"22px 24px",marginBottom:24,border:"1px solid #EDE8DF",boxShadow:"0 2px 16px rgba(26,22,18,0.05)"}}>
        <h3 style={{fontSize:15,fontFamily:"'Georgia',serif",marginBottom:4,color:"#1A1612"}}>How do you want to read your story? ✨</h3>
        <p style={{fontSize:13,color:"#7A6E62",marginBottom:16}}>Pick a style — your chapters will be rewritten just for you.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {Object.entries(styleConfig).map(([id,s])=>(
            <div key={id} onClick={()=>setSelectedStyle(id)} style={{padding:"16px 12px",borderRadius:12,border:"2px solid "+(selectedStyle===id?s.color:"#EDE8DF"),cursor:"pointer",textAlign:"center",background:selectedStyle===id?s.color+"12":"#FFFDF9",transition:"all 0.2s"}}>
              <div style={{fontSize:26,marginBottom:6}}>{s.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:selectedStyle===id?s.color:"#1A1612",marginBottom:3}}>{s.label}</div>
              <div style={{fontSize:11,color:"#7A6E62",lineHeight:1.4}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {myChapters.length===0&&(
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <div style={{fontSize:56,marginBottom:16}}>📝</div>
          <h3 style={{fontFamily:"'Georgia',serif",fontSize:22,color:"#1A1612",marginBottom:8}}>Your first chapter is coming soon</h3>
          <p style={{fontSize:14,color:"#7A6E62"}}>The people who support you are working on it right now.</p>
        </div>
      )}

      {/* Book-style chapters */}
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {myChapters.map((ch,i)=>{
          const content=getContent(ch);
          const isOpen=openId===ch.id;
          const isRewriting=rewriting===ch.id;
          const style=styleConfig[selectedStyle];
          return(
            <div key={ch.id} className="fu" style={{background:"#fff",borderRadius:16,border:"1px solid #EDE8DF",overflow:"hidden",boxShadow:"0 2px 16px rgba(26,22,18,0.06)",transition:"box-shadow 0.2s"}}>

              {/* Chapter tab */}
              <div onClick={()=>setOpenId(isOpen?null:ch.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",cursor:"pointer",borderBottom:isOpen?"1px solid #EDE8DF":"none",background:isOpen?"#FAFAF8":"#fff",transition:"background 0.2s"}}>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#1A4A4A,#1A6B6B)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Georgia',serif",fontSize:16,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <div>
                    <div style={{fontSize:11,color:"#7A6E62",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Chapter {i+1}</div>
                    <h3 style={{fontFamily:"'Georgia',serif",fontSize:18,color:"#1A1612",fontWeight:600,marginBottom:2}}>{content.title}</h3>
                    <div style={{fontSize:12,color:"#7A6E62"}}>{fmtDate(ch.date)}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{padding:"4px 12px",borderRadius:20,background:style.color+"18",fontSize:11,fontWeight:700,color:style.color}}>{style.icon} {style.label}</div>
                  <span style={{color:"#DDD3C0",fontSize:14,transition:"transform 0.2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
                </div>
              </div>

              {/* Book page content */}
              {isOpen&&(
                <div className="fu">
                  {isRewriting?(
                    <div style={{textAlign:"center",padding:"60px 24px"}}>
                      <div style={{width:40,height:40,border:"3px solid #EDE8DF",borderTopColor:"#1A6B6B",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
                      <p style={{fontSize:14,color:"#7A6E62",fontWeight:600}}>Rewriting your story as {style.label.toLowerCase()}...</p>
                    </div>
                  ):(
                    <>
                      {/* Decorative book page top */}
                      <div style={{background:"linear-gradient(180deg,#F5F0E8 0%,#FFFDF9 100%)",padding:"32px 48px 8px",borderBottom:"1px solid #EDE8DF"}}>
                        <div style={{textAlign:"center",marginBottom:20}}>
                          <div style={{width:40,height:3,background:"linear-gradient(90deg,#C8860A,#1A6B6B)",borderRadius:2,margin:"0 auto 12px"}}/>
                          <h2 style={{fontFamily:"'Georgia',serif",fontSize:22,color:"#1A1612",fontStyle:"italic",marginBottom:4}}>{content.title}</h2>
                          <p style={{fontSize:12,color:"#7A6E62",letterSpacing:"0.06em",textTransform:"uppercase"}}>{fmtDate(ch.date)}</p>
                          <div style={{width:40,height:3,background:"linear-gradient(90deg,#1A6B6B,#C8860A)",borderRadius:2,margin:"12px auto 0"}}/>
                        </div>
                      </div>

                      {/* The actual chapter text */}
                      <div style={{padding:"32px 48px 24px",background:"#FFFDF9"}}>
                        <div style={{fontFamily:"'Georgia',serif",fontSize:16,lineHeight:2,color:"#2A2420",letterSpacing:"0.01em"}}>
                          {content.content.split(String.fromCharCode(92,110)).filter(Boolean).map((para,pi)=>(
                            <p key={pi} style={{marginBottom:20,textIndent:pi===0?"0":"1.5em"}}>{para}</p>
                          ))}
                        </div>
                      </div>

                      {/* Page footer with style switcher */}
                      <div style={{padding:"16px 48px 24px",background:"#FAFAF8",borderTop:"1px solid #EDE8DF"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                          <p style={{fontSize:12,color:"#7A6E62"}}>Reading in <strong style={{color:style.color}}>{style.icon} {style.label}</strong> style</p>
                          <button onClick={()=>rewriteChapter(ch)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 18px",borderRadius:8,border:"1px solid "+style.color,background:style.color+"10",color:style.color,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                            onMouseEnter={(e)=>e.currentTarget.style.background=style.color+"20"} onMouseLeave={(e)=>e.currentTarget.style.background=style.color+"10"}>
                            ✨ Rewrite as {style.label}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {myChapters.length>0&&(
        <div className="fu" style={{textAlign:"center",padding:"32px 0 8px"}}>
          <p style={{fontSize:13,color:"#7A6E62",fontStyle:"italic",fontFamily:"'Georgia',serif"}}>
            "Every chapter of this story belongs to you."
          </p>
        </div>
      )}
    </div>
  );
}

function ChildProgressPage({user,chapters,children}){
  const myChapters=chapters.filter((c)=>c.childId===user.childId&&c.status==="published"&&c.childProgress);
  const trendData=myChapters.map((c)=>({date:fmtDate(c.date),mood:c.childProgress.mood||0,effort:c.childProgress.effort||0,social:c.childProgress.social||0}));
  const allStrengths=myChapters.flatMap((c)=>c.childProgress.strengths||[]);

  return(
    <div>
      <div className="fu"><PageHeader title="My Progress ⭐" subtitle="Look how far you have come!"/></div>
      {myChapters.length===0&&<Card style={{textAlign:"center",padding:60}}><p style={{color:"#7A6E62"}}>Your progress will appear here once your first chapter is approved.</p></Card>}
      {myChapters.length>0&&(
        <>
          <div className="fu1" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
            {[["My Mood 😊","mood","#C8860A"],["My Effort 💪","effort","#2D7D6B"],["Getting on with others 🤝","social","#5B5EA6"]].map(([label,key,color])=>(
              <Card key={key}>
                <h3 style={{fontSize:13,marginBottom:14,color:"#1A1612"}}>{label}</h3>
                {trendData.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{fontSize:11,color:"#7A6E62",width:72,flexShrink:0}}>{d.date}</div>
                    <div style={{flex:1,height:12,background:"#EFE9DE",borderRadius:6,overflow:"hidden"}}>
                      <div style={{height:"100%",width:(d[key]/5*100)+"%",background:color,borderRadius:6}}/>
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
          <div className="fu2">
            <Card style={{borderLeft:"4px solid #2D7D6B"}}>
              <h3 style={{fontSize:16,marginBottom:4}}>Things you should be proud of ⭐</h3>
              <p style={{fontSize:13,color:"#7A6E62",marginBottom:14}}>These are real things you've done — remembered and celebrated.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {allStrengths.map((s,i)=>(
                  <div key={i} style={{display:"flex",gap:8,padding:"10px 12px",background:"linear-gradient(135deg,#EFF8F7,#EFE9DE)",borderRadius:9,fontSize:13,color:"#1A1612",border:"1px solid #C0E0DC"}}>
                    <span style={{color:"#2D7D6B",fontWeight:700,flexShrink:0}}>★</span>{s}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminDashboard({homes,users,chapters}){
  const stats=[
    {label:"Care Homes",value:homes.length,icon:"🏡",color:"#1A6B6B"},
    {label:"Total Users",value:users.length,icon:"👥",color:"#5B5EA6"},
    {label:"Chapters Generated",value:chapters.length,icon:"📖",color:"#2D7D6B"},
    {label:"Active Subscriptions",value:homes.filter(h=>h.status==="active").length,icon:"✅",color:"#2D7D6B"},
  ];
  return(
    <div>
      <div className="fu"><PageHeader title="Platform Overview" subtitle="My Story So Far — admin dashboard"/></div>
      <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        {stats.map((s)=><Card key={s.label} style={{display:"flex",alignItems:"center",gap:14}}><div style={{fontSize:26}}>{s.icon}</div><div><div style={{fontSize:28,fontWeight:700,color:s.color,fontFamily:"'Fraunces',serif"}}>{s.value}</div><div style={{fontSize:12,color:"#7A6E62"}}>{s.label}</div></div></Card>)}
      </div>
      <div className="fu2">
        <Card>
          <h3 style={{fontSize:15,marginBottom:14}}>🏡 Registered Homes</h3>
          {homes.map((h)=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #EFE9DE"}}>
              <div><span style={{fontWeight:600}}>{h.name}</span><span style={{color:"#7A6E62",fontSize:13,marginLeft:8}}>· {h.childCount} children</span></div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}><Badge label={h.status} color={h.status}/><Badge label={h.plan} color="staff"/></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function AdminHomes({homes,setHomes}){
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:"",contact:"",plan:"starter"});
  const [editingId,setEditingId]=useState(null);
  const startEdit=(h)=>{
    setEditingId(h.id);
    setForm({name:h.name||"",contact:h.contact||"",plan:h.plan||"starter"});
    setShowForm(true);
  };
  const cancelEdit=()=>{
    setEditingId(null);
    setForm({name:"",contact:"",plan:"starter"});
    setShowForm(false);
  };
  const save=async()=>{
    if(!form.name||!form.contact) return;
    if(editingId){
      // UPDATE existing home
      const {error}=await supabase.from('homes').update({
        name:form.name,
        contact:form.contact,
        plan:form.plan||"home",
      }).eq('id',editingId);
      if(error){
        console.warn('homes update failed, applying locally only',error.message);
      }
      setHomes((p)=>p.map(x=>x.id===editingId?{...x,name:form.name,contact:form.contact,plan:form.plan||"home"}:x));
    } else {
      // INSERT new home
      const {data,error}=await supabase.from('homes').insert({
        name:form.name,
        contact:form.contact,
        plan:form.plan||"home",
        status:"active",
      }).select().single();
      if(error){
        console.warn('homes insert failed, falling back to local',error.message);
        setHomes((p)=>[...p,{...form,id:Date.now(),status:"active",childCount:0,created:new Date().toISOString()}]);
      } else if(data){
        setHomes((p)=>[...p,{id:data.id,name:data.name,contact:data.contact||"",plan:data.plan||"home",status:data.status||"active",childCount:0,created:data.created_at}]);
      }
    }
    setEditingId(null);
    setForm({name:"",contact:"",plan:"starter"});
    setShowForm(false);
  };
  return(
    <div>
      <div className="fu"><PageHeader title="Care Homes" subtitle="Manage registered homes and subscriptions." action={<Btn onClick={()=>showForm?cancelEdit():setShowForm(true)}>{showForm?"Cancel":"+ Add Home"}</Btn>}/></div>
      {showForm&&(
        <div className="fu"><Card style={{marginBottom:20,borderLeft:"4px solid #1A6B6B"}}>
          <h3 style={{fontSize:15,marginBottom:14}}>{editingId?"Edit Care Home":"New Care Home"}</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FInput label="Home Name" value={form.name} onChange={(v)=>setForm(f=>({...f,name:v}))} required/>
            <FInput label="Contact Email" value={form.contact} onChange={(v)=>setForm(f=>({...f,contact:v}))} type="email" required/>
            <FSelect label="Plan" value={form.plan} onChange={(v)=>setForm(f=>({...f,plan:v}))} options={[{value:"starter",label:"Starter — £49/mo"},{value:"home",label:"Home — £99/mo"},{value:"organisation",label:"Organisation — £199/mo"}]}/>
            <div/>
          </div>
          <div style={{marginTop:14}}><Btn onClick={save}>{editingId?"Save Changes":"Create Home"}</Btn></div>
        </Card></div>
      )}
      <div className="fu1"><Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"2px solid #DDD3C0"}}>{["Home","Contact","Plan","Children","Status","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:12,color:"#7A6E62",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}</tr></thead>
          <tbody>{homes.map(h=>(
            <tr key={h.id} style={{borderBottom:"1px solid #EFE9DE"}}>
              <td style={{padding:12,fontWeight:600}}>{h.name}</td>
              <td style={{padding:12,color:"#7A6E62",fontSize:13}}>{h.contact}</td>
              <td style={{padding:12}}><Badge label={h.plan} color="staff"/></td>
              <td style={{padding:12,color:"#7A6E62"}}>{h.childCount}</td>
              <td style={{padding:12}}><Badge label={h.status} color={h.status}/></td>
              <td style={{padding:12,display:"flex",gap:6}}>
                <Btn size="sm" variant="ghost" onClick={()=>startEdit(h)}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={async()=>{
                  const newStatus=h.status==="active"?"inactive":"active";
                  setHomes(p=>p.map(x=>x.id===h.id?{...x,status:newStatus}:x));
                  const {error}=await supabase.from('homes').update({status:newStatus}).eq('id',h.id);
                  if(error){console.warn('homes status update failed',error.message);}
                }}>{h.status==="active"?"Suspend":"Activate"}</Btn>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card></div>
    </div>
  );
}

function AdminUsers({users,setUsers,homes,user}){
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:"",email:"",role:"staff",home_id:""});
  const allUsers=users;
  const setAllUsers=setUsers;
  const [notifySent,setNotifySent]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [editingUser,setEditingUser]=useState(null);
  const [editingForm,setEditingForm]=useState({name:"",role:"staff",home_id:""});

  const startEdit=(u)=>{
    setEditingForm({name:u.name||"",role:u.role||"staff",home_id:u.homeId||""});
    setEditingUser(u);
  };

  const saveEdit=async()=>{
    if(!editingUser){return;}
    if(!editingForm.name){alert("Please enter a name.");return;}
    if(!editingForm.role){alert("Please select a role.");return;}
    try{
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editingForm.name,
          role: editingForm.role,
          home_id: editingForm.home_id || null,
        })
        .eq('id', editingUser.id);
      if(error){alert(`Could not save: ${error.message}`);return;}
      // Reload users
      const { data:rows } = await supabase.from('profiles').select('*').order('name');
      if(rows) setAllUsers(rows.map(p=>({
        id:p.id, name:p.name||"", email:p.email||"",
        role:p.role||"staff", homeId:p.home_id, childId:p.child_id,
        subscription:p.subscription||"active",
      })));
      setEditingUser(null);
    }catch(e){
      alert(`Network error: ${e.message}`);
    }
  };

  const save=async()=>{
    if(!form.name||!form.email){alert("Please fill in name and email.");return;}
    if(!form.role){alert("Please select a role.");return;}
    try{
      const { data:{session} } = await supabase.auth.getSession();
      if(!session){alert("Your session has expired. Please sign in again.");return;}
      const res = await fetch("/api/invite-user",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          home_id: form.home_id || null,
        }),
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok){
        alert(`Could not send invite: ${data.error || res.statusText}`);
        return;
      }
      setNotifySent(form.email);
      setForm({name:"",email:"",role:"staff",home_id:""});
      setShowForm(false);
      // Reload users so the new pending row appears
      const { data:rows } = await supabase.from('profiles').select('*').order('name');
      if(rows) setAllUsers(rows.map(p=>({
        id:p.id, name:p.name||"", email:p.email||"",
        role:p.role||"staff", homeId:p.home_id, childId:p.child_id,
        subscription:p.subscription||"active",
      })));
    }catch(e){
      alert(`Network error: ${e.message}`);
    }
  };

  const deleteUser=async(id)=>{
    try{
      const { data:{session} } = await supabase.auth.getSession();
      if(!session){alert("Your session has expired. Please sign in again.");return;}
      const res = await fetch("/api/delete-user",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: id }),
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok){
        alert(`Could not delete user: ${data.error || res.statusText}`);
        return;
      }
      setConfirmDelete(null);
      // Reload users so the row disappears
      const { data:rows } = await supabase.from('profiles').select('*').order('name');
      if(rows) setAllUsers(rows.map(p=>({
        id:p.id, name:p.name||"", email:p.email||"",
        role:p.role||"staff", homeId:p.home_id, childId:p.child_id,
        subscription:p.subscription||"active",
      })));
    }catch(e){
      alert(`Network error: ${e.message}`);
    }
  };

  return(
    <div>
      <div className="fu"><PageHeader title="All Users" subtitle="Manage staff, managers, children and admins." action={<Btn onClick={()=>setShowForm(v=>!v)}>{showForm?"Cancel":"+ Add User"}</Btn>}/></div>

      {notifySent&&(
        <div className="fu" style={{marginBottom:16,padding:"12px 16px",background:"#EFF8F7",borderRadius:10,border:"1px solid #C0E0DC",fontSize:13,color:"#1A6B6B",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>✅</span>
          <span>Invite email sent to <strong>{notifySent}</strong> — they'll set their own password from the link.</span>
          <button onClick={()=>setNotifySent(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#1A6B6B",fontSize:16}}>✕</button>
        </div>
      )}

      {showForm&&(
        <div className="fu"><Card style={{marginBottom:20,borderLeft:"4px solid #5B5EA6"}}>
          <h3 style={{fontSize:15,marginBottom:4}}>New User</h3>
          <p style={{fontSize:13,color:"#7A6E62",marginBottom:16}}>An invite email will be sent to the address below. The user clicks the link, sets their own password, and signs in.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FInput label="Full Name" value={form.name} onChange={(v)=>setForm(f=>({...f,name:v}))} required/>
            <FInput label="Email Address" value={form.email} onChange={(v)=>setForm(f=>({...f,email:v}))} type="email" required/>
            <FSelect label="Role" value={form.role} onChange={(v)=>setForm(f=>({...f,role:v}))} options={[{value:"staff",label:"Staff"},{value:"manager",label:"Manager"},{value:"admin",label:"Admin"}]}/>
            <FSelect label="Home" value={form.home_id} onChange={(v)=>setForm(f=>({...f,home_id:v}))} options={[{value:"",label:"— Select home —"},...(homes||[]).map(h=>({value:h.id,label:h.name}))]}/>
          </div>
          <div style={{marginTop:14,display:"flex",gap:10}}>
            <Btn onClick={save}>Send Invite</Btn>
            <Btn variant="secondary" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </Card></div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,22,18,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
          <Card style={{maxWidth:400,width:"100%",textAlign:"center",padding:32}}>
            <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
            <h3 style={{fontSize:18,marginBottom:8}}>Delete {confirmDelete.name}?</h3>
            <p style={{fontSize:13,color:"#7A6E62",marginBottom:24}}>This permanently deletes their account and removes their profile. They will no longer be able to log in. To restore access, you would need to invite them again. This cannot be undone.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <Btn variant="danger" onClick={()=>deleteUser(confirmDelete.id)}>Yes, Delete User</Btn>
              <Btn variant="secondary" onClick={()=>setConfirmDelete(null)}>Cancel</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Edit user modal */}
      {editingUser&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,22,18,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
          <Card style={{maxWidth:520,width:"100%",padding:28}}>
            <h3 style={{fontSize:17,marginBottom:4}}>Edit User</h3>
            <p style={{fontSize:13,color:"#7A6E62",marginBottom:18}}>Update {editingUser.email}. Email can't be changed here.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <FInput label="Full Name" value={editingForm.name} onChange={(v)=>setEditingForm(f=>({...f,name:v}))} required/>
              <FSelect label="Role" value={editingForm.role} onChange={(v)=>setEditingForm(f=>({...f,role:v}))} options={[{value:"staff",label:"Staff"},{value:"manager",label:"Manager"},{value:"admin",label:"Admin"}]}/>
              <FSelect label="Home" value={editingForm.home_id} onChange={(v)=>setEditingForm(f=>({...f,home_id:v}))} options={[{value:"",label:"— No home —"},...(homes||[]).map(h=>({value:h.id,label:h.name}))]}/>
            </div>
            <div style={{marginTop:18,display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setEditingUser(null)}>Cancel</Btn>
              <Btn onClick={saveEdit}>Save Changes</Btn>
            </div>
          </Card>
        </div>
      )}

      <div className="fu1"><Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"2px solid #DDD3C0"}}>{["Name","Email","Role","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:12,color:"#7A6E62",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}</tr></thead>
          <tbody>{allUsers.map(u=>(
            <tr key={u.id} style={{borderBottom:"1px solid #EFE9DE",opacity:u.deleted?0.4:1}}>
              <td style={{padding:12,fontWeight:600}}>{u.name}</td>
              <td style={{padding:12,color:"#7A6E62",fontSize:13}}>{u.email}</td>
              <td style={{padding:12}}><Badge label={u.role} color={u.role}/></td>
              
              <td style={{padding:12,display:"flex",gap:8}}>
                <Btn size="sm" variant="ghost" onClick={()=>startEdit(u)}>Edit</Btn>
                {user && u.id !== user.id && (
                  <Btn size="sm" variant="danger" onClick={()=>setConfirmDelete(u)}>Delete</Btn>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card></div>
    </div>
  );
}

function AdminSettings(){
  return(
    <div>
      <div className="fu"><PageHeader title="Platform Settings" subtitle="Global configuration for My Story So Far."/></div>
      <div className="fu1" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {[
          {title:"Platform Name",desc:"Shown in emails and UI.",input:true,val:"My Story So Far"},
          {title:"Default AI Style",desc:"Tone guidance for all AI generation.",input:true,val:"Warm, trauma-informed, second person"},
          {title:"PDF Access",desc:"Who can download PDFs.",input:false,val:"Subscribers only"},
          {title:"Data Retention",desc:"Auto-delete after child leaves.",input:false,val:"7 years (statutory)"},
          {title:"Approval Required",desc:"Must manager approve before publishing.",input:false,val:"Yes — all homes"},
          {title:"Disclaimer Text",desc:"Shown with all AI trend analysis.",input:true,val:"AI observations for trained professionals only. Not clinical advice."},
        ].map((s)=>(
          <Card key={s.title}>
            <h3 style={{fontSize:15,marginBottom:4}}>{s.title}</h3>
            <p style={{fontSize:13,color:"#7A6E62",marginBottom:10}}>{s.desc}</p>
            {s.input?<input defaultValue={s.val} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #DDD3C0",background:"#F8F5F0",fontSize:14,outline:"none"}}/>
              :<div style={{padding:"8px 12px",borderRadius:8,background:"#EFE9DE",fontSize:13,color:"#7A6E62"}}>{s.val}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({onShowLogin}){
  const [demoStep,setDemoStep]=useState(0);
  const demoSteps=[
    {icon:"📄",title:"Staff uploads monthly report",desc:"Paste or drop a PDF — the app reads it instantly",color:"#C8860A"},
    {icon:"✨",title:"AI writes the chapter",desc:"Warm, trauma-informed, written in third person — in seconds",color:"#6B4FA8"},
    {icon:"✅",title:"Manager reviews and publishes",desc:"Edit, approve, and publish to the child with one click",color:"#1A6B6B"},
    {icon:"📖",title:"A life book is born",desc:"Chapters build into a story the child keeps forever",color:"#B5464A"},
  ];
  useEffect(()=>{const t=setInterval(()=>setDemoStep(s=>(s+1)%demoSteps.length),2400);return()=>clearInterval(t);},[]);

  return(
    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",background:"#FFFDF9"}}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(255,253,249,0.96)",backdropFilter:"blur(10px)",borderBottom:"1px solid #EDE8DF",padding:"0 5%",display:"flex",alignItems:"center",justifyContent:"space-between",height:68,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#1A4A4A,#1A6B6B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(26,107,107,0.3)"}}>📖</div>
          <span style={{fontFamily:"'Georgia',serif",fontSize:19,fontWeight:700,color:"#1A1612",letterSpacing:"-0.3px"}}>My Story So Far</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:28}}>
          {["Features","Pricing","Trust"].map(l=>(
            <button key={l} onClick={()=>{const el=document.getElementById(l.toLowerCase());if(el)el.scrollIntoView({behavior:"smooth"});}}
              style={{fontSize:14,color:"#6B6258",fontWeight:500,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0,transition:"color 0.2s"}}
              onMouseEnter={(e)=>e.target.style.color="#1A6B6B"} onMouseLeave={(e)=>e.target.style.color="#6B6258"}>{l}</button>
          ))}
          <button onClick={onShowLogin} style={{fontSize:14,fontWeight:600,color:"#1A1612",background:"none",border:"1.5px solid #DDD3C0",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
            onMouseEnter={(e)=>{e.currentTarget.style.borderColor="#1A6B6B";e.currentTarget.style.color="#1A6B6B";}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor="#DDD3C0";e.currentTarget.style.color="#1A1612";}}>Sign In</button>
          <button onClick={onShowLogin} style={{fontSize:14,fontWeight:600,color:"#fff",background:"linear-gradient(135deg,#1A4A4A,#1A6B6B)",border:"none",borderRadius:8,padding:"9px 22px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(26,107,107,0.35)",transition:"all 0.2s"}}
            onMouseEnter={(e)=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={(e)=>e.currentTarget.style.transform=""}>Request Access →</button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{background:"linear-gradient(160deg,#0D2E2E 0%,#1A4A4A 45%,#1A3A2A 100%)",padding:"100px 5% 90px",position:"relative",overflow:"hidden"}}>
        {/* Background illustration — abstract book/stars */}
        <svg style={{position:"absolute",top:0,right:0,width:"50%",height:"100%",opacity:0.08}} viewBox="0 0 600 500" preserveAspectRatio="xMaxYMid slice">
          <circle cx="400" cy="80" r="180" fill="#C8860A"/>
          <circle cx="500" cy="300" r="120" fill="#fff"/>
          <circle cx="200" cy="400" r="80" fill="#C8860A"/>
          <path d="M300 50 L320 110 L380 110 L330 145 L350 205 L300 170 L250 205 L270 145 L220 110 L280 110 Z" fill="#fff"/>
          <path d="M480 180 L490 210 L520 210 L497 228 L506 258 L480 240 L454 258 L463 228 L440 210 L470 210 Z" fill="#C8860A"/>
          <path d="M150 100 L157 122 L180 122 L162 135 L169 157 L150 144 L131 157 L138 135 L120 122 L143 122 Z" fill="#fff"/>
          <rect x="80" y="250" width="120" height="160" rx="8" fill="none" stroke="#fff" strokeWidth="3"/>
          <rect x="80" y="250" width="60" height="160" rx="4" fill="none" stroke="#C8860A" strokeWidth="2"/>
          <line x1="80" y1="285" x2="200" y2="285" stroke="#fff" strokeWidth="1" opacity="0.5"/>
          <line x1="80" y1="310" x2="200" y2="310" stroke="#fff" strokeWidth="1" opacity="0.5"/>
          <line x1="80" y1="335" x2="200" y2="335" stroke="#fff" strokeWidth="1" opacity="0.5"/>
        </svg>

        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:72,alignItems:"center",position:"relative",zIndex:1}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(200,134,10,0.2)",border:"1px solid rgba(200,134,10,0.4)",borderRadius:20,padding:"5px 14px",marginBottom:28}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#C8860A"}}/>
              <span style={{fontSize:12,fontWeight:700,color:"#C8860A",textTransform:"uppercase",letterSpacing:"0.1em"}}>Trusted by UK children's homes</span>
            </div>
            <h1 style={{fontFamily:"'Georgia',serif",fontSize:52,lineHeight:1.1,color:"#FFFDF9",marginBottom:24,letterSpacing:"-1px"}}>
              Children in care deserve to know{" "}
              <em style={{color:"#C8860A",fontStyle:"italic"}}>their story.</em>
            </h1>
            <p style={{fontSize:17,color:"rgba(255,253,249,0.75)",lineHeight:1.85,marginBottom:14}}>
              Too many young people leave care without ever understanding how far they have come.
            </p>
            <p style={{fontSize:17,color:"rgba(255,253,249,0.75)",lineHeight:1.85,marginBottom:40}}>
              <strong style={{color:"#FFFDF9"}}>My Story So Far</strong> turns monthly reports into a life book they can be proud of — celebrating their strength, resilience, and growth.
            </p>
            <div style={{display:"flex",gap:14,marginBottom:44}}>
              <button onClick={onShowLogin} style={{fontSize:15,fontWeight:700,color:"#1A1612",background:"linear-gradient(135deg,#C8860A,#E2A820)",border:"none",borderRadius:10,padding:"14px 32px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 20px rgba(200,134,10,0.4)",transition:"all 0.2s"}}
                onMouseEnter={(e)=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={(e)=>e.currentTarget.style.transform=""}>Request Free Trial →</button>
              <button onClick={onShowLogin} style={{fontSize:15,fontWeight:600,color:"rgba(255,253,249,0.9)",background:"rgba(255,253,249,0.08)",border:"1.5px solid rgba(255,253,249,0.25)",borderRadius:10,padding:"14px 28px",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                onMouseEnter={(e)=>e.currentTarget.style.background="rgba(255,253,249,0.14)"} onMouseLeave={(e)=>e.currentTarget.style.background="rgba(255,253,249,0.08)"}>Sign In</button>
            </div>
            <div style={{display:"flex",gap:28}}>
              {[["🔒","Zero data stored"],["🇬🇧","UK GDPR compliant"],["💳","Cancel anytime"]].map(([icon,label])=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:7,fontSize:13,color:"rgba(255,253,249,0.55)",fontWeight:500}}><span>{icon}</span>{label}</div>
              ))}
            </div>
          </div>

          {/* Animated demo card */}
          <div style={{position:"relative"}}>
            <div style={{background:"rgba(255,253,249,0.06)",backdropFilter:"blur(20px)",borderRadius:20,border:"1px solid rgba(255,253,249,0.12)",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
              {/* Mac-style window bar */}
              <div style={{background:"rgba(0,0,0,0.2)",padding:"12px 18px",display:"flex",alignItems:"center",gap:7}}>
                {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}
                <span style={{color:"rgba(255,253,249,0.3)",fontSize:12,marginLeft:10,fontFamily:"monospace"}}>mystorysofar.co.uk</span>
              </div>
              <div style={{padding:28}}>
                {/* Progress bar */}
                <div style={{display:"flex",gap:6,marginBottom:24}}>
                  {demoSteps.map((s,i)=>(
                    <div key={i} style={{flex:1,height:3,borderRadius:2,background:i===demoStep?s.color:"rgba(255,253,249,0.15)",transition:"background 0.5s"}}/>
                  ))}
                </div>
                {demoSteps.map((s,i)=>(
                  <div key={i} style={{display:demoStep===i?"block":"none"}}>
                    <div style={{textAlign:"center",padding:"16px 0 20px"}}>
                      <div style={{fontSize:52,marginBottom:14}}>{s.icon}</div>
                      <h3 style={{fontFamily:"'Georgia',serif",fontSize:20,color:"#FFFDF9",marginBottom:8,fontWeight:600}}>{s.title}</h3>
                      <p style={{fontSize:14,color:"rgba(255,253,249,0.6)",lineHeight:1.6}}>{s.desc}</p>
                    </div>
                  </div>
                ))}
                {/* Sample chapter */}
                <div style={{background:"rgba(255,253,249,0.08)",borderRadius:12,padding:"16px 18px",borderLeft:"3px solid #C8860A"}}>
                  <div style={{fontSize:10,color:"#C8860A",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Chapter 4 · April 2025 · TE</div>
                  <p style={{fontFamily:"'Georgia',serif",fontSize:13,lineHeight:1.9,color:"rgba(255,253,249,0.85)",fontStyle:"italic"}}>
                    "This month, TE showed something truly wonderful — courage that everyone around him noticed and respected. That kind of strength is rare, and it belongs to him."
                  </p>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div style={{position:"absolute",top:-16,right:-16,background:"linear-gradient(135deg,#C8860A,#E2A820)",borderRadius:14,padding:"12px 18px",boxShadow:"0 8px 24px rgba(200,134,10,0.4)"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginBottom:2,fontWeight:600}}>CHAPTERS WRITTEN</div>
              <div style={{fontSize:26,fontWeight:700,color:"#fff",fontFamily:"'Georgia',serif",lineHeight:1}}>2,400+</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EMOTIONAL BANNER ─────────────────────────────────────── */}
      <section style={{background:"#FFFDF9",padding:"64px 5%"}}>
        <div style={{maxWidth:900,margin:"0 auto",textAlign:"center"}}>
          <p style={{fontFamily:"'Georgia',serif",fontSize:28,lineHeight:1.7,color:"#1A1612",fontStyle:"italic",marginBottom:20}}>
            "Every child in care has a story worth telling. We make sure they get to read it."
          </p>
          <div style={{width:60,height:3,background:"linear-gradient(90deg,#C8860A,#1A6B6B)",borderRadius:2,margin:"0 auto"}}/>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{background:"#F5F0E8",padding:"80px 5%"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <span style={{fontSize:12,fontWeight:700,color:"#1A6B6B",textTransform:"uppercase",letterSpacing:"0.12em"}}>The Process</span>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:38,color:"#1A1612",marginTop:10,marginBottom:12,letterSpacing:"-0.5px"}}>From report to life chapter in minutes</h2>
            <p style={{fontSize:16,color:"#6B6258",maxWidth:500,margin:"0 auto"}}>No training needed. Fits into your existing monthly reporting process.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2,position:"relative"}}>
            {[
              {num:"01",icon:"📄",title:"Upload the Report",desc:"Staff drop in a PDF or Word monthly report — or paste the text directly",color:"#1A4A4A"},
              {num:"02",icon:"✨",title:"AI Writes the Chapter",desc:"Trauma-informed AI transforms clinical notes into a warm, third-person life story",color:"#6B4FA8"},
              {num:"03",icon:"✅",title:"Manager Approves",desc:"Review, edit if needed, then approve and publish — the child sees nothing until ready",color:"#1A6B6B"},
              {num:"04",icon:"📖",title:"Story Grows",desc:"Each chapter joins a life book the child can read, choose their style, and keep forever",color:"#C8860A"},
            ].map((s,i)=>(
              <div key={i} style={{background:"#fff",padding:"32px 24px",borderRadius:16,border:"1px solid #EDE8DF",position:"relative",boxShadow:"0 2px 16px rgba(26,22,18,0.05)"}}>
                <div style={{fontSize:11,fontWeight:700,color:s.color,letterSpacing:"0.1em",marginBottom:12}}>{s.num}</div>
                <div style={{fontSize:36,marginBottom:14}}>{s.icon}</div>
                <h3 style={{fontFamily:"'Georgia',serif",fontSize:17,color:"#1A1612",marginBottom:10,fontWeight:600}}>{s.title}</h3>
                <p style={{fontSize:13,color:"#6B6258",lineHeight:1.7}}>{s.desc}</p>
                {i<3&&<div style={{position:"absolute",top:"50%",right:-14,width:26,height:26,borderRadius:"50%",background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,zIndex:1,transform:"translateY(-50%)"}}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" style={{background:"#FFFDF9",padding:"80px 5%"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <span style={{fontSize:12,fontWeight:700,color:"#1A6B6B",textTransform:"uppercase",letterSpacing:"0.12em"}}>Features</span>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:38,color:"#1A1612",marginTop:10,marginBottom:12,letterSpacing:"-0.5px"}}>Built for the people who care most</h2>
            <p style={{fontSize:16,color:"#6B6258",maxWidth:480,margin:"0 auto"}}>Simple enough for any staff member. Powerful enough to change a child's life.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {[
              {icon:"📎",title:"Upload Any Document",desc:"Drop in a referral form, care plan or monthly report. AI reads it and does the work instantly.",accent:"#1A6B6B"},
              {icon:"✨",title:"AI Chapters in Seconds",desc:"Every report becomes a warm, trauma-informed story chapter written in beautiful third person.",accent:"#6B4FA8"},
              {icon:"📊",title:"Trend Analysis",desc:"AI spots patterns across months — missing episodes, activities, wellbeing — with a professional disclaimer.",accent:"#C8860A"},
              {icon:"👤",title:"Child's Own Portal",desc:"Children log in to read their story and choose how it is written — personal, fictional, motivational, or emotional.",accent:"#1A6B6B"},
              {icon:"📦",title:"Bulk Upload",desc:"Upload months of reports at once. Each becomes a chapter. Download the full life book as a formatted PDF.",accent:"#B5464A"},
              {icon:"🔒",title:"Zero Data Retention",desc:"We process your data in real time. Nothing stored on our servers. Your organisation owns everything.",accent:"#1A4A4A"},
            ].map((f)=>(
              <div key={f.title} style={{background:"#fff",borderRadius:16,padding:"28px 24px",border:"1px solid #EDE8DF",boxShadow:"0 2px 16px rgba(26,22,18,0.04)",transition:"transform 0.2s,box-shadow 0.2s"}}
                onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(26,22,18,0.12)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                <div style={{width:48,height:48,borderRadius:12,background:f.accent+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16}}>{f.icon}</div>
                <h3 style={{fontFamily:"'Georgia',serif",fontSize:17,color:"#1A1612",marginBottom:10,fontWeight:600}}>{f.title}</h3>
                <p style={{fontSize:13,color:"#6B6258",lineHeight:1.75}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE BREAK ──────────────────────────────────────────── */}
      <section style={{background:"linear-gradient(135deg,#1A4A4A,#0D2E2E)",padding:"72px 5%"}}>
        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:32}}>
            {[
              {quote:"This has completely changed how we approach life story work. The children love reading their own chapters.",author:"Registered Manager, Leeds"},
              {quote:"It used to take hours. Now it takes minutes — and the quality is so much better than anything we managed before.",author:"Support Worker, Birmingham"},
              {quote:"For the first time, one of our young people said they felt proud of their story. That means everything.",author:"Residential Care Manager, Glasgow"},
            ].map((t,i)=>(
              <div key={i} style={{padding:"28px 24px",background:"rgba(255,253,249,0.06)",borderRadius:14,border:"1px solid rgba(255,253,249,0.1)"}}>
                <div style={{fontFamily:"'Georgia',serif",fontSize:32,color:"#C8860A",marginBottom:10,lineHeight:1}}>"</div>
                <p style={{fontSize:14,color:"rgba(255,253,249,0.85)",lineHeight:1.8,marginBottom:18,fontStyle:"italic"}}>{t.quote}</p>
                <p style={{fontSize:12,color:"#C8860A",fontWeight:700}}>— {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ────────────────────────────────────────────────── */}
      <section id="trust" style={{background:"#F5F0E8",padding:"80px 5%"}}>
        <div style={{maxWidth:1000,margin:"0 auto",textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:16,background:"linear-gradient(135deg,#1A4A4A,#1A6B6B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 20px",boxShadow:"0 8px 24px rgba(26,107,107,0.3)"}}>🔒</div>
          <span style={{fontSize:12,fontWeight:700,color:"#1A6B6B",textTransform:"uppercase",letterSpacing:"0.12em"}}>Data & Trust</span>
          <h2 style={{fontFamily:"'Georgia',serif",fontSize:38,color:"#1A1612",marginTop:10,marginBottom:16,letterSpacing:"-0.5px"}}>Your data. Your rights. Always.</h2>
          <p style={{fontSize:16,color:"#6B6258",lineHeight:1.85,maxWidth:580,margin:"0 auto 48px"}}>We are a <strong style={{color:"#1A1612"}}>data processor, not a data controller.</strong> We never store, sell, or retain information about the children in your care. You hold full data ownership.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[
              {icon:"🇬🇧",title:"UK GDPR Compliant",desc:"Fully compliant with UK GDPR and the Data Protection Act 2018"},
              {icon:"🗑️",title:"Zero Retention",desc:"Data processed in real time — nothing stored after processing"},
              {icon:"📤",title:"Full Export Rights",desc:"Export everything as PDF at any time — your data, your choice"},
              {icon:"🔐",title:"Encrypted in Transit",desc:"All data encrypted end-to-end. Reports never travel in plain text"},
              {icon:"👤",title:"You Own the Data",desc:"You are the data controller. Full rights to access, correct, and delete"},
              {icon:"📋",title:"DPA Available",desc:"Full Data Processing Agreement provided on request"},
            ].map((item)=>(
              <div key={item.title} style={{background:"#fff",borderRadius:14,padding:"22px 20px",border:"1px solid #EDE8DF",textAlign:"left",boxShadow:"0 2px 10px rgba(26,22,18,0.04)"}}>
                <div style={{fontSize:24,marginBottom:10}}>{item.icon}</div>
                <h3 style={{fontSize:14,fontWeight:700,color:"#1A1612",marginBottom:6}}>{item.title}</h3>
                <p style={{fontSize:13,color:"#6B6258",lineHeight:1.65}}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" style={{background:"#FFFDF9",padding:"80px 5%"}}>
        <div style={{maxWidth:1000,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <span style={{fontSize:12,fontWeight:700,color:"#1A6B6B",textTransform:"uppercase",letterSpacing:"0.12em"}}>Pricing</span>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:38,color:"#1A1612",marginTop:10,marginBottom:12,letterSpacing:"-0.5px"}}>Simple, transparent pricing</h2>
            <p style={{fontSize:16,color:"#6B6258"}}>14-day free trial · No setup fees · No long contracts · Cancel anytime</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {[
              {name:"Starter",price:"£49",period:"/month",desc:"Up to 5 children",features:["Unlimited monthly reports","AI chapter generation","Staff & manager roles","Online story view","PDF life book download"],highlight:false,color:"#1A6B6B"},
              {name:"Home",price:"£99",period:"/month",desc:"Up to 20 children",features:["Everything in Starter","Child portal & login","Progress dashboards","Trend analysis","Bulk upload","Priority support"],highlight:true,color:"#C8860A"},
              {name:"Organisation",price:"£199",period:"/month",desc:"Unlimited children",features:["Everything in Home","Multiple homes","Admin controls","API access","Dedicated onboarding","Custom branding"],highlight:false,color:"#6B4FA8"},
            ].map((plan)=>(
              <div key={plan.name} style={{background:plan.highlight?"linear-gradient(160deg,#1A4A4A,#0D2E2E)":"#fff",borderRadius:20,padding:"32px 28px",border:plan.highlight?"none":"1px solid #EDE8DF",boxShadow:plan.highlight?"0 20px 50px rgba(13,46,46,0.3)":"0 2px 16px rgba(26,22,18,0.05)",position:"relative"}}>
                {plan.highlight&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#C8860A,#E2A820)",color:"#fff",fontSize:11,fontWeight:700,padding:"5px 18px",borderRadius:20,letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(200,134,10,0.4)"}}>Most Popular</div>}
                <h3 style={{fontFamily:"'Georgia',serif",fontSize:22,color:plan.highlight?"#FFFDF9":"#1A1612",marginBottom:4}}>{plan.name}</h3>
                <p style={{fontSize:13,color:plan.highlight?"rgba(255,253,249,0.5)":"#6B6258",marginBottom:20}}>{plan.desc}</p>
                <div style={{marginBottom:24}}>
                  <span style={{fontFamily:"'Georgia',serif",fontSize:42,fontWeight:700,color:plan.color}}>{plan.price}</span>
                  <span style={{fontSize:14,color:plan.highlight?"rgba(255,253,249,0.4)":"#6B6258"}}>{plan.period}</span>
                </div>
                <div style={{marginBottom:28}}>
                  {plan.features.map((f)=>(
                    <div key={f} style={{display:"flex",gap:10,marginBottom:10,fontSize:14,color:plan.highlight?"rgba(255,253,249,0.8)":"#4A4038",alignItems:"flex-start"}}>
                      <span style={{color:plan.color,fontWeight:700,flexShrink:0,marginTop:1}}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={onShowLogin} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,background:plan.highlight?"linear-gradient(135deg,#C8860A,#E2A820)":plan.color+"18",color:plan.highlight?"#fff":plan.color,transition:"all 0.2s",boxShadow:plan.highlight?"0 6px 18px rgba(200,134,10,0.4)":"none"}}
                  onMouseEnter={(e)=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={(e)=>e.currentTarget.style.transform=""}>Request Access</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{background:"linear-gradient(160deg,#0D2E2E 0%,#1A4A4A 50%,#1A3A2A 100%)",padding:"88px 5%",position:"relative",overflow:"hidden"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.05}} viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
          <circle cx="100" cy="150" r="200" fill="#C8860A"/>
          <circle cx="700" cy="100" r="150" fill="#fff"/>
        </svg>
        <div style={{maxWidth:700,margin:"0 auto",textAlign:"center",position:"relative",zIndex:1}}>
          <h2 style={{fontFamily:"'Georgia',serif",fontSize:42,color:"#FFFDF9",marginBottom:18,lineHeight:1.2,letterSpacing:"-0.5px"}}>Every child in care has a story worth telling.</h2>
          <p style={{fontSize:17,color:"rgba(255,253,249,0.75)",marginBottom:36,lineHeight:1.8}}>Help the young people in your care leave with something they can hold onto — a book that says: <em style={{color:"#C8860A"}}>look how far you have come.</em></p>
          <div style={{display:"flex",gap:14,justifyContent:"center"}}>
            <button onClick={onShowLogin} style={{fontSize:15,fontWeight:700,color:"#1A1612",background:"linear-gradient(135deg,#C8860A,#E2A820)",border:"none",borderRadius:10,padding:"15px 36px",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 24px rgba(200,134,10,0.45)",transition:"all 0.2s"}}
              onMouseEnter={(e)=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={(e)=>e.currentTarget.style.transform=""}>Request 14-Day Free Trial</button>
            <button onClick={onShowLogin} style={{fontSize:15,fontWeight:600,color:"rgba(255,253,249,0.85)",background:"rgba(255,253,249,0.08)",border:"1.5px solid rgba(255,253,249,0.2)",borderRadius:10,padding:"15px 28px",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
              onMouseEnter={(e)=>e.currentTarget.style.background="rgba(255,253,249,0.14)"} onMouseLeave={(e)=>e.currentTarget.style.background="rgba(255,253,249,0.08)"}>Sign In</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{background:"#0D2020",padding:"28px 5%",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#1A4A4A,#1A6B6B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📖</div>
          <span style={{fontFamily:"'Georgia',serif",fontSize:14,color:"rgba(255,253,249,0.5)"}}>My Story So Far</span>
        </div>
        <div style={{display:"flex",gap:24}}>
          {["Privacy Policy","Terms","Data Processing Agreement","Contact"].map(l=>(
            <span key={l} style={{fontSize:12,color:"rgba(255,253,249,0.3)",cursor:"pointer",transition:"color 0.2s"}}
              onMouseEnter={(e)=>e.target.style.color="rgba(255,253,249,0.6)"} onMouseLeave={(e)=>e.target.style.color="rgba(255,253,249,0.3)"}>{l}</span>
          ))}
        </div>
        <p style={{fontSize:12,color:"rgba(255,253,249,0.2)"}}>© 2025 My Story So Far Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}

function SetPasswordScreen({user,onPasswordSet,onCancel}){
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [err,setErr]=useState("");
  const [saving,setSaving]=useState(false);

  const handle=async()=>{
    setErr("");
    if(password.length<8){ setErr("Password must be at least 8 characters."); return; }
    if(password!==confirm){ setErr("Passwords don't match."); return; }
    setSaving(true);
    try{
      const {error}=await supabase.auth.updateUser({password,data:{needs_password_set:false}});
      if(error){ setErr(error.message||"Could not save password. Try again."); setSaving(false); return; }
      onPasswordSet();
    }catch(e){
      setErr("Network error. Check your connection and try again.");
      setSaving(false);
    }
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#F8F5F0",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div className="fu" style={{width:"100%",maxWidth:440}}>
        <Card style={{padding:40}}>
          <div style={{fontSize:42,marginBottom:12,textAlign:"center"}}>👋</div>
          <h2 style={{fontSize:22,marginBottom:8,textAlign:"center"}}>Welcome to My Story So Far</h2>
          <p style={{color:"#7A6E62",fontSize:14,lineHeight:1.6,marginBottom:24,textAlign:"center"}}>
            Set a password to finish setting up your account.
          </p>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,color:"#7A6E62",marginBottom:4}}>Email</label>
            <input type="email" value={user?.email||""} disabled style={{width:"100%",padding:"10px 12px",border:"1px solid #E5DDD2",borderRadius:8,background:"#F4EFE8",color:"#7A6E62",fontSize:14}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,color:"#7A6E62",marginBottom:4}}>New password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus placeholder="At least 8 characters" style={{width:"100%",padding:"10px 12px",border:"1px solid #E5DDD2",borderRadius:8,fontSize:14}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,color:"#7A6E62",marginBottom:4}}>Confirm password</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") handle();}} style={{width:"100%",padding:"10px 12px",border:"1px solid #E5DDD2",borderRadius:8,fontSize:14}}/>
          </div>
          {err&&<div style={{color:"#B23A2E",fontSize:13,marginBottom:12,padding:"8px 12px",background:"#FBEAE7",borderRadius:6}}>{err}</div>}
          <Btn onClick={handle} disabled={saving} style={{width:"100%",marginBottom:8}}>{saving?"Saving…":"Save password and continue"}</Btn>
          <button onClick={onCancel} style={{width:"100%",padding:"10px 12px",background:"transparent",border:"none",color:"#7A6E62",fontSize:13,cursor:"pointer"}}>Sign out instead</button>
        </Card>
      </div>
    </div>
  );
}

function SignInModal({onLogin,onClose}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [mode,setMode]=useState("signin"); // signin | request
  const [reqForm,setReqForm]=useState({name:"",org:"",role:"",email:"",phone:"",children:""});
  const [submitted,setSubmitted]=useState(false);
  const [forgotSent,setForgotSent]=useState(false);

  const [selectedRole,setSelectedRole]=useState("");
  const [loginFailed,setLoginFailed]=useState(false);

  // Load child accounts from localStorage
  const storedChildren=(() => {
    try { const s=localStorage.getItem("mssf_children"); return s?JSON.parse(s):[]; } catch(e){return [];}
  })();
  const childAccounts=storedChildren.filter(c=>c.childEmail&&c.childPassword).map(c=>({
    id:c.id+"_child", name:c.preferredName, email:c.childEmail, password:c.childPassword,
    role:"child", homeId:c.homeId||1, childId:c.id, subscription:"active"
  }));
  const storedAllUsers=loadUsers();
  const allAccounts=[...storedAllUsers,...childAccounts];
  const matchingUsers=allAccounts.filter((u)=>u.email.toLowerCase()===email.toLowerCase()&&u.password===pass);
  const isTrevor=email.toLowerCase().includes("trevorelliottmbe")&&pass==="Trevor2025";
  const multipleRoles=matchingUsers.length>1||isTrevor;
  const trevorRoles=[{role:"admin"},{role:"manager"}];
  const displayRoles=isTrevor?trevorRoles:matchingUsers;

  const handle=async()=>{
    try {
      const r = await supabase.auth.signInWithPassword({ email, password: pass });
      if (r.data && r.data.user && !r.error) {
        // Load profile row for this user — has role and home_id
        const {data:profile,error:profileError}=await supabase
          .from('profiles')
          .select('id,name,role,home_id,subscription')
          .eq('id',r.data.user.id)
          .single();
        if(profileError||!profile){
          console.warn('profile load failed after login',profileError?.message);
          setErr("Login succeeded but profile not found. Contact admin.");
          return;
        }
        onLogin({
          id:r.data.user.id,
          name:profile.name||r.data.user.email,
          email:r.data.user.email,
          role:profile.role||'staff',
          homeId:profile.home_id,
          subscription:profile.subscription||'active',
        });
        return;
      }
    } catch(e) {}
    setLoginFailed(true);
    // Direct match for Trevor — hardcoded fallback
    if(email.toLowerCase().includes("trevorelliottmbe")&&pass==="Trevor2025"){
      if(!selectedRole){setErr("Please select a role — Admin or Manager.");return;}
      onLogin({id:selectedRole==="admin"?1:2,name:"Trevor Elliott",email:"hello@trevorelliottmbe.co.uk",role:selectedRole,password:"Trevor2025",homeId:1,subscription:"active"});
      return;
    }
    const matches=allAccounts.filter((u)=>u.email.toLowerCase()===email.toLowerCase()&&u.password===pass);
    if(matches.length===0){setErr("Invalid email or password. Check caps lock is off.");return;}
    if(matches.length>1&&!selectedRole){setErr("Please select which role you want to sign in as.");return;}
    const u=selectedRole?matches.find(m=>m.role===selectedRole):matches[0];
    if(u) onLogin(u); else setErr("Invalid email or password.");
  };

  if(submitted) return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,22,18,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div className="fu" style={{width:"100%",maxWidth:440}}>
        <Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:52,marginBottom:16}}>✉️</div>
          <h2 style={{fontSize:22,marginBottom:8}}>Request received!</h2>
          <p style={{color:"#7A6E62",fontSize:14,lineHeight:1.7,marginBottom:24}}>Thank you — we personally review every application to ensure the safety and security of the children on our platform. We'll be in touch within 1 working day.</p>
          <Btn onClick={onClose}>Back to Home</Btn>
        </Card>
      </div>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,22,18,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16,overflowY:"auto"}}>
      <div className="fu" style={{width:"100%",maxWidth:460,margin:"auto"}}>
        <Card style={{position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"#EFE9DE",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",color:"#7A6E62"}}>✕</button>

          <div style={{display:"flex",gap:4,background:"#EFE9DE",borderRadius:10,padding:4,marginBottom:24,width:"fit-content"}}>
            {[["signin","Sign In"],["request","Request Access"]].map(([id,label])=>(
              <button key={id} onClick={()=>setMode(id)} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:mode===id?700:500,background:mode===id?"#1A1612":"transparent",color:mode===id?"#fff":"#7A6E62",transition:"all 0.18s"}}>{label}</button>
            ))}
          </div>

          {mode==="signin"&&(
            <>
              <div style={{textAlign:"center",marginBottom:22}}>
                <div style={{width:48,height:48,borderRadius:14,background:"#1A6B6B",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:10}}>📖</div>
                <h2 style={{fontSize:20,color:"#1A1612",marginBottom:3}}>Welcome back</h2>
                <p style={{fontSize:13,color:"#7A6E62"}}>Sign in to My Story So Far</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <FInput label="Email" value={email} onChange={setEmail} type="email" placeholder="your@email.org"/>
                <FInput label="Password" value={pass} onChange={setPass} type="password" placeholder="••••••••"/>
                {loginFailed&&multipleRoles&&(
                  <div>
                    <label style={{fontSize:12,fontWeight:600,color:"#7A6E62",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:6}}>Sign in as</label>
                    <div style={{display:"flex",gap:8}}>
                      {(isTrevor?trevorRoles:matchingUsers).map(u=>(
                        <button key={u.role} onClick={()=>setSelectedRole(u.role)}
                          style={{flex:1,padding:"9px 12px",borderRadius:8,border:"2px solid "+(selectedRole===u.role?"#1A6B6B":"#DDD3C0"),background:selectedRole===u.role?"#EFF8F7":"#F8F5F0",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:selectedRole===u.role?700:500,color:selectedRole===u.role?"#1A6B6B":"#7A6E62",transition:"all 0.18s",textTransform:"capitalize"}}>
                          {u.role==="admin"?"🏛 Admin":u.role==="manager"?"👔 Manager":u.role==="staff"?"👤 Staff":u.role==="child"?"📖 Child":"👤 "+u.role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {err&&<p style={{color:"#B5464A",fontSize:13,background:"#FFF0EF",padding:"8px 12px",borderRadius:8}}>{err}</p>}
                <Btn onClick={handle} style={{width:"100%",justifyContent:"center",padding:"11px"}}>Sign In →</Btn>
              </div>

              <p style={{textAlign:"center",fontSize:12,color:"#7A6E62",marginTop:10}}><span onClick={()=>{setMode("forgot");setErr("");}} style={{color:"#1A6B6B",cursor:"pointer",fontWeight:600}}>Forgot password?</span></p>
              <p style={{textAlign:"center",fontSize:12,color:"#7A6E62",marginTop:14}}>New here? <span onClick={()=>setMode("request")} style={{color:"#1A6B6B",cursor:"pointer",fontWeight:700}}>Request access →</span></p>
            </>
          )}

          {mode==="request"&&(
            <>
              <div style={{marginBottom:18}}>
                <h2 style={{fontSize:20,color:"#1A1612",marginBottom:4}}>Request Free Trial</h2>
                <p style={{fontSize:13,color:"#7A6E62",lineHeight:1.6}}>We personally review every application to protect the children on our platform. We'll respond within 1 working day.</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <FInput label="Your Name" value={reqForm.name} onChange={(v)=>setReqForm(f=>({...f,name:v}))} required/>
                <FInput label="Organisation Name" value={reqForm.org} onChange={(v)=>setReqForm(f=>({...f,org:v}))} required/>
                <FSelect label="Your Role" value={reqForm.role} onChange={(v)=>setReqForm(f=>({...f,role:v}))} options={[{value:"manager",label:"Registered Manager"},{value:"staff",label:"Support Worker"},{value:"director",label:"Director / Owner"},{value:"other",label:"Other"}]}/>
                <FInput label="Work Email" value={reqForm.email} onChange={(v)=>setReqForm(f=>({...f,email:v}))} type="email" required/>
                <FInput label="Phone Number" value={reqForm.phone} onChange={(v)=>setReqForm(f=>({...f,phone:v}))}/>
                <FInput label="How many children do you support?" value={reqForm.children} onChange={(v)=>setReqForm(f=>({...f,children:v}))} placeholder="e.g. 8"/>
                <div style={{padding:"10px 12px",background:"#EFF8F7",borderRadius:8,fontSize:12,color:"#1A6B6B",lineHeight:1.6}}>🔒 Your details are only used to process your application. We never share your data with third parties.</div>
                <Btn onClick={async()=>{
                  if(!reqForm.name||!reqForm.org||!reqForm.email) return;
                  try{
                    await fetch("https://formspree.io/f/xkoyowen",{
                      method:"POST",
                      headers:{"Content-Type":"application/json","Accept":"application/json"},
                      body:JSON.stringify({
                        _subject:"New Trial Request — My Story So Far",
                        name:reqForm.name,
                        organisation:reqForm.org,
                        role:reqForm.role||"Not specified",
                        email:reqForm.email,
                        phone:reqForm.phone||"Not provided",
                        children_supported:reqForm.children||"Not specified",
                        message:"New trial request submitted via mystorysofar.co.uk",
                      }),
                    });
                  }catch(e){}
                  setSubmitted(true);
                }} style={{width:"100%",justifyContent:"center",padding:"11px"}}>Submit Request →</Btn>
              </div>
              <p style={{textAlign:"center",fontSize:12,color:"#7A6E62",marginTop:14}}>Already have an account? <span onClick={()=>setMode("signin")} style={{color:"#1A6B6B",cursor:"pointer",fontWeight:700}}>Sign in →</span></p>
            </>
          )}

          {mode==="forgot"&&(
            <>
              <div style={{marginBottom:18}}>
                <h2 style={{fontSize:20,color:"#1A1612",marginBottom:4}}>Reset your password</h2>
                <p style={{fontSize:13,color:"#7A6E62",lineHeight:1.6}}>Enter your email and we'll send you a link to set a new password.</p>
              </div>
              {forgotSent?(
                <div style={{padding:"14px 16px",background:"#EFF8F7",borderRadius:8,border:"1px solid #C0E0DC",fontSize:13,color:"#1A6B6B",lineHeight:1.6,marginBottom:14}}>
                  ✅ If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox (and spam folder).
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <FInput label="Email" value={email} onChange={setEmail} type="email" placeholder="your@email.org"/>
                  {err&&<p style={{color:"#B5464A",fontSize:13,background:"#FFF0EF",padding:"8px 12px",borderRadius:8}}>{err}</p>}
                  <Btn onClick={async()=>{
                    if(!email){setErr("Please enter your email.");return;}
                    setErr("");
                    try{
                      await supabase.auth.resetPasswordForEmail(email,{
                        redirectTo: window.location.origin,
                      });
                      setForgotSent(true);
                    }catch(e){
                      // Show success either way so we don't leak which emails exist
                      setForgotSent(true);
                    }
                  }} style={{width:"100%",justifyContent:"center",padding:"11px"}}>Send reset link →</Btn>
                </div>
              )}
              <p style={{textAlign:"center",fontSize:12,color:"#7A6E62",marginTop:14}}><span onClick={()=>{setMode("signin");setForgotSent(false);setErr("");}} style={{color:"#1A6B6B",cursor:"pointer",fontWeight:700}}>← Back to sign in</span></p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [needsPasswordSet,setNeedsPasswordSet]=useState(false);
  const [showLogin,setShowLogin]=useState(false);
  const [page,setPage]=useState("dashboard");
  const [children,setChildren]=useState(()=>{
    try{const s=localStorage.getItem("mssf_children");return s?JSON.parse(s):[];}catch(e){return [];}
  });
  const [chapters,setChapters]=useState(()=>{
    try{const s=localStorage.getItem("mssf_chapters");return s?JSON.parse(s):[];}catch(e){return [];}
  });
  const [activeChild,setActiveChild]=useState(null);
  const [homes,setHomes]=useState(()=>{
    try{const s=localStorage.getItem("mssf_homes");return s?JSON.parse(s):[{id:1,name:"My Care Home",contact:"",plan:"home",status:"active",childCount:0,created:new Date().toISOString()}];}catch(e){return [{id:1,name:"My Care Home",contact:"",plan:"home",status:"active",childCount:0,created:new Date().toISOString()}];}
  });
  const [allUsers,setAllUsers]=useState([]);
  // Load users from Supabase profiles on mount, translating snake_case → camelCase
  useEffect(()=>{
    supabase.from('profiles').select('*').order('name').then(({data,error})=>{
      if(error){console.warn('profiles load failed',error.message);return;}
      if(Array.isArray(data) && data.length>0){
        const translated=data.map(p=>({
          id:p.id,
          name:p.name||"",
          email:p.email||"",
          role:p.role||"staff",
          homeId:p.home_id,
          childId:p.child_id,
          subscription:p.subscription||"active",
          mustChangePassword:false,
        }));
        setAllUsers(translated);
      }
    });
  },[]);

  // Auto-save to localStorage whenever data changes
  useEffect(()=>{try{localStorage.setItem("mssf_children",JSON.stringify(children));}catch(e){}},[children]);
  // Load children from Supabase on mount, translating snake_case → camelCase
  useEffect(()=>{
    supabase.from('children').select('*').order('preferred_name').then(({data,error})=>{
      if(error){console.warn('children load failed',error.message);return;}
      if(Array.isArray(data) && data.length>0){
        const translated=data.map(c=>({
          id:c.id,
          homeId:c.home_id,
          preferredName:c.preferred_name,
          dob:c.dob||"",
          gender:c.gender||"",
          notes:c.notes||"",
          archived:!!c.archived,
          created:c.created_at,
        }));
        setChildren(translated);
      }
    });
  },[]);
  // Load chapters from Supabase on mount, translating snake_case → camelCase
  useEffect(()=>{
    supabase.from('chapters').select('*').order('date',{ascending:false}).then(({data,error})=>{
      if(error){console.warn('chapters load failed',error.message);return;}
      if(Array.isArray(data) && data.length>0){
        const translated=data.map(c=>({
          id:c.id,
          childId:c.child_id,
          title:c.title,
          content:c.content||"",
          date:c.date,
          status:c.status||"pending",
          reportType:c.report_type||"monthly",
          staffId:c.staff_id,
          managerId:c.manager_id,
          staffInsights:c.staff_insights||"",
          childProgress:c.child_progress||"",
          sourceText:c.source_text||"",
          sourceFilename:c.source_filename||"",
          created:c.created_at,
        }));
        setChapters(translated);
      }
    });
  },[]);
  useEffect(()=>{try{localStorage.setItem("mssf_chapters",JSON.stringify(chapters));}catch(e){}},[chapters]);

  useEffect(()=>{try{localStorage.setItem("mssf_homes",JSON.stringify(homes));}catch(e){}},[homes]);  // Load homes from Supabase on mount, translating snake_case → camelCase
  useEffect(()=>{
    supabase.from('homes').select('*').order('name').then(({data,error})=>{
      if(error){console.warn('homes load failed',error.message);return;}
      if(Array.isArray(data) && data.length>0){
        const translated=data.map(h=>({
          id:h.id,
          name:h.name,
          contact:h.contact||"",
          plan:h.plan||"home",
          status:h.status||"active",
          childCount:0,
          created:h.created_at,
        }));
        setHomes(translated);
      }
    });
  },[]);

  // Session restoration — check for an existing Supabase session on mount.
  // Triggered on initial load AND on auth events (sign-in, sign-out, invite redirect).
  // When a session is found, load the matching profile row and call handleLogin
  // so the rest of the app treats this exactly like a fresh sign-in.
  useEffect(()=>{
    let cancelled=false;
    const hydrateFromSession=async(session)=>{
      if(cancelled) return;
      if(!session||!session.user){ setAuthLoading(false); return; }
      const {data:profile,error:profileError}=await supabase
        .from('profiles')
        .select('id,name,role,home_id,subscription')
        .eq('id',session.user.id)
        .single();
      if(cancelled) return;
      if(profileError||!profile){
        console.warn('session restore: profile not found',profileError?.message);
        setAuthLoading(false);
        return;
      }
      // Detect freshly-invited users who have never set a password.
      // Supabase sets last_sign_in_at on every sign-in, including the implicit
      // one triggered by clicking an invite link. If it's within ~5 seconds of
      // created_at, this is their very first session.
      const meta=session.user.user_metadata||{};
      const created=session.user.created_at?new Date(session.user.created_at).getTime():0;
      const lastSignIn=session.user.last_sign_in_at?new Date(session.user.last_sign_in_at).getTime():0;
      const firstEverSession=created>0&&lastSignIn>0&&(lastSignIn-created)<60000;
      setNeedsPasswordSet(meta.needs_password_set===true||firstEverSession);
      handleLogin({
        id:session.user.id,
        name:profile.name||session.user.email,
        email:session.user.email,
        role:profile.role||'staff',
        homeId:profile.home_id,
        subscription:profile.subscription||'active',
      });
      setAuthLoading(false);
    };
    supabase.auth.getSession().then(({data})=>hydrateFromSession(data?.session));
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{
      console.log('[auth-event]', event, { hasSession: !!session, url: window.location.href });
      if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED') hydrateFromSession(session);
      if(event==='PASSWORD_RECOVERY'){
        // User clicked a reset-password email link. Hydrate session and force SetPasswordScreen.
        hydrateFromSession(session);
        setNeedsPasswordSet(true);
      }
      if(event==='SIGNED_OUT'){ setUser(null); setNeedsPasswordSet(false); setPage('dashboard'); }
    });
    return ()=>{ cancelled=true; listener?.subscription?.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Clear any old demo data on first load
  useEffect(()=>{
    try{
      const ver=localStorage.getItem("mssf_version");
      if(ver!=="trevor-v1"){
        localStorage.removeItem("mssf_children");
        localStorage.removeItem("mssf_chapters");
        localStorage.setItem("mssf_version","trevor-v1");
        setChildren([]);
        setChapters([]);
      }
    }catch(e){}
  },[]);

  const handleLogin=(u)=>{
    setUser(u);setShowLogin(false);
    if(u.role==="child") setPage("my-story");
    else if(u.role==="admin") setPage("admin-dashboard");
    else setPage("dashboard");
  };

  if(authLoading) return(
    <><G/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#F8F5F0",color:"#7A6E62",fontSize:14}}>Loading…</div>
    </>
  );

  if(!user) return(
    <><G/>
      <LandingPage onShowLogin={()=>setShowLogin(true)}/>
      {showLogin&&<SignInModal onLogin={handleLogin} onClose={()=>setShowLogin(false)}/>}
    </>
  );

  if(needsPasswordSet) return(
    <><G/>
      <SetPasswordScreen
        user={user}
        onPasswordSet={()=>setNeedsPasswordSet(false)}
        onCancel={async()=>{await supabase.auth.signOut();setUser(null);setNeedsPasswordSet(false);setPage("dashboard");}}
      />
    </>
  );

  const p={user,children,setChildren,chapters,setChapters,activeChild,setActiveChild,setPage,homes,setHomes};

  return(
    <><G/>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar user={user} page={page} setPage={setPage} onLogout={async()=>{await supabase.auth.signOut();setUser(null);setNeedsPasswordSet(false);setPage("dashboard");}}/>
        <main style={{flex:1,padding:"32px 36px",overflowY:"auto",background:"#F8F5F0"}}>
          {page==="dashboard"        &&<Dashboard        {...p}/>}
          {page==="children"         &&<ChildrenPage      {...p}/>}
          {page==="new-chapter"      &&<NewChapterPage    {...p}/>}
          {page==="chapters"         &&<ChaptersPage      {...p}/>}
          {page==="approvals"        &&<ApprovalsPage     {...p}/>}
          {page==="my-story"         &&<ChildStoryPage    user={user} chapters={chapters} children={children}/>}
          {page==="my-progress"      &&<ChildProgressPage user={user} chapters={chapters} children={children}/>}
          {page==="admin-dashboard"  &&<AdminDashboard    homes={homes} users={allUsers} chapters={chapters}/>}
          {page==="admin-homes"      &&<AdminHomes        homes={homes} setHomes={setHomes}/>}
          {page==="admin-users"      &&<AdminUsers        users={allUsers} setUsers={setAllUsers} homes={homes} user={user}/>}
          {page==="admin-settings"   &&<AdminSettings/>}
        </main>
      </div>
    </>
  );
}
