import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import fetch from "node-fetch";
import pool from "./db.js";
import { requireAuth, requireAdmin, optionalAuth } from "./authMiddleware.js";

dotenv.config();
console.log("GROQ KEY LOADED:", process.env.GROQ_API_KEY ? "YES" : "NO - CHECK .env FILE");

// ─── Cloudinary config ──────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─── Multer memory storage (we upload to Cloudinary manually) ─────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  }
});

// Helper: upload buffer to Cloudinary using upload_stream
function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "pri_resumes", resource_type: "raw", public_id: `resume_${Date.now()}`, format: "pdf" },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    Readable.from(buffer).pipe(stream);
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ─── In-memory session store ───────────────────────────────────────────
const sessions = new Map();

// ─── CHALLENGES ────────────────────────────────────────────────────────
const CHALLENGES = [
  {
    id: "ch_001",
    category: "Responsive Layouts",
    difficulty: "medium",
    task: "Design a prompt that instructs an AI to build a fully responsive navigation bar with mobile hamburger menu, smooth scroll links, and active-state highlighting.",
    tags: ["CSS", "Flexbox", "JavaScript", "UX"],
    attempts: 2341,
    avgScore: 0.64,
    glitch: {
      description: "Mobile menu toggle has an event listener bug — the handler is attached inside the loop, creating duplicate listeners on each click.",
      bugLine: 23,
      hint: "Look at how the click event is registered relative to the loop."
    }
  },
  {
    id: "ch_002",
    category: "API Integration",
    difficulty: "hard",
    task: "Write a prompt that makes an AI implement a debounced search input that fetches from a REST API, handles loading/error states, and caches results to avoid duplicate requests.",
    tags: ["JavaScript", "REST API", "Performance", "Error Handling"],
    attempts: 1876,
    avgScore: 0.58,
    glitch: {
      description: "The debounce timer is never cleared before setting a new one — it fires on every keystroke instead of waiting.",
      bugLine: 18,
      hint: "Think about what needs to happen to the previous timeout before creating a new one."
    }
  },
  {
    id: "ch_003",
    category: "React State Management",
    difficulty: "hard",
    task: "Craft a prompt to instruct an AI to build a shopping cart with optimistic UI updates, rollback on error, and persistent localStorage sync.",
    tags: ["React", "useState", "useEffect", "localStorage"],
    attempts: 1122,
    avgScore: 0.55,
    glitch: {
      description: "useEffect dependency array is missing `cart`, causing the localStorage sync to only fire once on mount, never on updates.",
      bugLine: 31,
      hint: "Check what values the useEffect reads and whether they're all in the dependency array."
    }
  },
  {
    id: "ch_004",
    category: "CSS Architecture",
    difficulty: "medium",
    task: "Write a prompt that instructs an AI to create a design token system using CSS custom properties, with dark/light mode switching and a component that inherits tokens correctly.",
    tags: ["CSS Variables", "Theming", "Design Tokens", "Accessibility"],
    attempts: 987,
    avgScore: 0.67,
    glitch: {
      description: "The theme toggle writes to `document.body.classList` but the CSS selectors target `[data-theme]` attribute — the class change has no effect.",
      bugLine: 12,
      hint: "Trace how the JavaScript changes the DOM vs. what the CSS is actually watching."
    }
  }
];

// ─── GLITCHED CODE SNIPPETS ─────────────────────────────────────────────
const GLITCH_CODE = {
  ch_001: `// Responsive Navbar Component
const nav = document.querySelector('.navbar');
const menuBtn = document.querySelector('.menu-btn');
const navLinks = document.querySelectorAll('.nav-link');

let isOpen = false;

function toggleMenu() {
  isOpen = !isOpen;
  nav.classList.toggle('open', isOpen);
  menuBtn.setAttribute('aria-expanded', isOpen);
}

// Smooth scroll with active state
navLinks.forEach((link, index) => {
  link.addEventListener('click', (e) => {
    navLinks.forEach(l => l.classList.remove('active'));
    e.target.classList.add('active');
  });

  // BUG: event listener added inside loop on every render
  // Creates N duplicate handlers where N = number of links
  menuBtn.addEventListener('click', toggleMenu); // ← BUG LINE
});

// Should be outside the loop:
// menuBtn.addEventListener('click', toggleMenu);`,

  ch_002: `// Debounced Search with Caching
const cache = new Map();
let debounceTimer;

async function search(query) {
  if (cache.has(query)) {
    renderResults(cache.get(query));
    return;
  }

  showLoading();

  // BUG: previous timer never cleared before setting new one
  // debounceTimer fires on EVERY keystroke immediately
  debounceTimer = setTimeout(async () => { // ← BUG: clearTimeout missing
    try {
      const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
      const data = await res.json();
      cache.set(query, data);
      renderResults(data);
    } catch (err) {
      showError('Search failed. Please try again.');
    } finally {
      hideLoading();
    }
  }, 300);
}

// Fix: clearTimeout(debounceTimer) before line 18`,

  ch_003: `// Shopping Cart with Optimistic Updates
import { useState, useEffect } from 'react';

export function useCart() {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  // BUG: missing 'cart' in dependency array
  // localStorage never updates after initial mount
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, []); // ← BUG: should be [cart]

  async function addItem(item) {
    const prev = [...cart];
    setCart(c => [...c, { ...item, id: Date.now() }]); // optimistic

    try {
      await api.post('/cart', item);
    } catch {
      setCart(prev); // rollback
      toast.error('Failed to add item');
    }
  }

  return { cart, addItem };
}`,

  ch_004: `/* Design Token System */
:root {
  --color-bg: #ffffff;
  --color-text: #0f172a;
  --color-primary: #6366f1;
}

[data-theme="dark"] {  /* ← CSS watches data-theme attribute */
  --color-bg: #0f172a;
  --color-text: #f1f5f9;
  --color-primary: #818cf8;
}

.theme-btn {
  background: var(--color-primary);
  color: var(--color-bg);
}

// JavaScript toggle
const btn = document.querySelector('.theme-btn');
btn.addEventListener('click', () => {
  // BUG: toggles a CLASS, but CSS watches an ATTRIBUTE
  document.body.classList.toggle('dark'); // ← BUG LINE
  // Fix: document.body.dataset.theme = isDark ? 'dark' : 'light'
});`
};

// ─── ROUTES ────────────────────────────────────────────────────────────

// GET /challenges
app.get("/challenges", (req, res) => {
  res.json(CHALLENGES.map(({ glitch, ...c }) => c));
});

// GET /challenge/:id
app.get("/challenge/:id", (req, res) => {
  const c = CHALLENGES.find(ch => ch.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  const { glitch, ...safe } = c;
  res.json(safe);
});

// POST /session/start
app.post("/session/start", (req, res) => {
  const { challengeId } = req.body;
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    sessionId,
    challengeId,
    startedAt: Date.now(),
    promptScore: null,
    feedbackScore: null,
    pri: null
  });
  res.json({ sessionId });
});

// POST /evaluate/prompt
app.post("/evaluate/prompt", async (req, res) => {
  const { prompt, challengeId, sessionId } = req.body;
  const challenge = CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 900,
      messages: [{
        role: "user",
        content: `You are a Prompt Intelligence Evaluator specializing in web development prompts.

CHALLENGE TASK: "${challenge.task}"
CATEGORY: ${challenge.category}

USER'S PROMPT: "${prompt}"

Evaluate this prompt. Return ONLY valid JSON, no markdown, no extra text:
{
  "overall": <0.0-1.0 float>,
  "scores": [
    {"label": "Prompt Clarity", "val": <0.0-1.0>},
    {"label": "Constraint Coverage", "val": <0.0-1.0>},
    {"label": "Output Specification", "val": <0.0-1.0>},
    {"label": "Edge Case Coverage", "val": <0.0-1.0>},
    {"label": "Technical Precision", "val": <0.0-1.0>}
  ],
  "issues": ["<specific missing element>", ...],
  "strengths": ["<what they did well>", ...]
}`
      }]
    });

    const text = message.choices[0].message.content;
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());

    if (sessionId && sessions.has(sessionId)) {
      sessions.get(sessionId).promptScore = result.overall;
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /challenge/:id/ai-response  — returns glitched code
app.get("/challenge/:id/ai-response", (req, res) => {
  const code = GLITCH_CODE[req.params.id];
  if (!code) return res.status(404).json({ error: "No code for this challenge" });
  res.json({ code });
});

// POST /evaluate/feedback
app.post("/evaluate/feedback", async (req, res) => {
  const { feedback, challengeId, sessionId } = req.body;
  const challenge = CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return res.status(404).json({ error: "Challenge not found" });

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are judging a developer's ability to detect a bug in AI-generated web dev code.

THE BUG: ${challenge.glitch.description}
HINT: ${challenge.glitch.hint}

USER'S FEEDBACK: "${feedback}"

Return ONLY valid JSON:
{
  "detected": <true/false>,
  "bug_detection": <0.0-1.0>,
  "reasoning_depth": <0.0-1.0>,
  "summary": "<one sentence assessment>"
}`
      }]
    });

    const text = message.choices[0].message.content;
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());

    // Calculate PRI
    const session = sessions.get(sessionId);
    const promptClarity = session?.promptScore ?? 0.5;
    const pri = {
      promptClarity,
      bugDetection: result.bug_detection,
      reasoningDepth: result.reasoning_depth,
      total: +((promptClarity + result.bug_detection + result.reasoning_depth) / 3).toFixed(2),
      detected: result.detected,
      summary: result.summary
    };

    if (session) session.pri = pri;

    res.json(pri);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /dashboard
app.get("/dashboard", (req, res) => {
  const allSessions = [...sessions.values()].filter(s => s.pri);
  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "0.00";

  res.json({
    totalSessions: allSessions.length,
    avgPRI: avg(allSessions.map(s => s.pri.total)),
    avgPromptClarity: avg(allSessions.map(s => s.pri.promptClarity)),
    bugDetectionRate: avg(allSessions.map(s => s.pri.bugDetection)),
    sessions: allSessions.slice(-10).reverse()
  });
});

app.listen(PORT, () => console.log(`PRI Backend running on http://localhost:${PORT}`));

// ═══════════════════════════════════════════════════════════════════
// CAREER INTELLIGENCE — 4-Agent Pipeline
// ═══════════════════════════════════════════════════════════════════

const ROLE_REQ = {
  "Frontend Developer":      { mustHave:["HTML/CSS","JavaScript","React or Vue","Git"], niceToHave:["TypeScript","Figma","REST APIs"], internshipFields:["Web Development","Software Engineering","UI/UX"], avgSalary:{entry:"₹3-5 LPA / $45-65k",mid:"₹8-14 LPA / $80-110k"}, topCourses:[{name:"The Odin Project",url:"https://www.theodinproject.com",free:true},{name:"freeCodeCamp",url:"https://www.freecodecamp.org",free:true},{name:"Meta Frontend Certificate",url:"https://www.coursera.org/professional-certificates/meta-front-end-developer",free:false}], topInternships:[{name:"Internshala Web Dev",url:"https://internshala.com/internships/web-development-internship"},{name:"LinkedIn Frontend Intern",url:"https://www.linkedin.com/jobs/frontend-developer-internships"},{name:"Wellfound",url:"https://wellfound.com/jobs"}], certifications:[{name:"Meta Frontend Certificate",url:"https://www.coursera.org/professional-certificates/meta-front-end-developer"}] },
  "Full Stack Developer":    { mustHave:["HTML/CSS","JavaScript","React or Next.js","Node.js or Python","SQL","Git"], niceToHave:["TypeScript","Docker","AWS","GraphQL"], internshipFields:["Web Development","Software Engineering","Full Stack"], avgSalary:{entry:"₹4-7 LPA / $55-75k",mid:"₹12-20 LPA / $100-140k"}, topCourses:[{name:"Full Stack Open (Helsinki)",url:"https://fullstackopen.com",free:true},{name:"The Odin Project Full Stack",url:"https://www.theodinproject.com/paths/full-stack-javascript",free:true},{name:"MERN Stack Udemy",url:"https://www.udemy.com/course/mern-stack-front-to-back",free:false}], topInternships:[{name:"Internshala Full Stack",url:"https://internshala.com/internships/full-stack-development-internship"},{name:"Wellfound",url:"https://wellfound.com/jobs"},{name:"LinkedIn",url:"https://www.linkedin.com/jobs/full-stack-developer-internships"}], certifications:[{name:"Meta Full Stack Certificate",url:"https://www.coursera.org/professional-certificates/meta-full-stack-engineer"}] },
  "Data Scientist":          { mustHave:["Python","Pandas/NumPy","Machine Learning basics","SQL","Data Visualization"], niceToHave:["TensorFlow or PyTorch","Spark","Statistics","Kaggle experience"], internshipFields:["Data Science","Data Analytics","Machine Learning","AI"], avgSalary:{entry:"₹4-8 LPA / $60-80k",mid:"₹12-22 LPA / $100-150k"}, topCourses:[{name:"fast.ai",url:"https://www.fast.ai",free:true},{name:"Google Data Analytics",url:"https://www.coursera.org/professional-certificates/google-data-analytics",free:false},{name:"Kaggle Learn",url:"https://www.kaggle.com/learn",free:true}], topInternships:[{name:"Internshala Data Science",url:"https://internshala.com/internships/data-science-internship"},{name:"LinkedIn Data Science",url:"https://www.linkedin.com/jobs/data-scientist-internships"},{name:"Kaggle Jobs",url:"https://www.kaggle.com/jobs"}], certifications:[{name:"Google Advanced Data Analytics",url:"https://www.coursera.org/professional-certificates/google-advanced-data-analytics"},{name:"IBM Data Science",url:"https://www.coursera.org/professional-certificates/ibm-data-science"}] },
  "Machine Learning Engineer":{ mustHave:["Python","TensorFlow or PyTorch","ML algorithms","Git","Linux"], niceToHave:["MLOps","Docker","Cloud ML","C++"], internshipFields:["Machine Learning","AI","Data Science","Research"], avgSalary:{entry:"₹6-10 LPA / $70-95k",mid:"₹15-28 LPA / $120-180k"}, topCourses:[{name:"Andrew Ng ML Specialization",url:"https://www.coursera.org/specializations/machine-learning-introduction",free:false},{name:"fast.ai",url:"https://www.fast.ai",free:true},{name:"Hugging Face NLP Course",url:"https://huggingface.co/learn/nlp-course",free:true}], topInternships:[{name:"LinkedIn ML Intern",url:"https://www.linkedin.com/jobs/machine-learning-engineer-internships"},{name:"Wellfound AI",url:"https://wellfound.com/jobs?role=machine-learning-engineer"},{name:"Internshala ML",url:"https://internshala.com/internships/machine-learning-internship"}], certifications:[{name:"TensorFlow Developer Certificate",url:"https://www.tensorflow.org/certificate"},{name:"AWS ML Specialty",url:"https://aws.amazon.com/certification/certified-machine-learning-specialty"}] },
  "Cybersecurity Analyst":   { mustHave:["Networking fundamentals","Linux","Security concepts","Python or Bash"], niceToHave:["Penetration testing","SIEM tools","Cloud security"], internshipFields:["Cybersecurity","Information Security","Network Security"], avgSalary:{entry:"₹4-7 LPA / $55-75k",mid:"₹10-18 LPA / $90-130k"}, topCourses:[{name:"Google Cybersecurity Certificate",url:"https://www.coursera.org/professional-certificates/google-cybersecurity",free:false},{name:"TryHackMe",url:"https://tryhackme.com",free:true},{name:"Cybrary",url:"https://www.cybrary.it",free:true}], topInternships:[{name:"LinkedIn Cybersecurity Intern",url:"https://www.linkedin.com/jobs/cybersecurity-internships"},{name:"Internshala Security",url:"https://internshala.com/internships/cyber-security-internship"},{name:"HackTheBox Jobs",url:"https://www.hackthebox.com/companies"}], certifications:[{name:"CompTIA Security+",url:"https://www.comptia.org/certifications/security"},{name:"CEH",url:"https://www.eccouncil.org/programs/certified-ethical-hacker-ceh"}] },
  "DevOps Engineer":         { mustHave:["Linux","Docker","CI/CD","Git","Bash scripting"], niceToHave:["Kubernetes","Terraform","AWS/GCP/Azure","Ansible"], internshipFields:["DevOps","Cloud Engineering","Infrastructure"], avgSalary:{entry:"₹5-8 LPA / $60-80k",mid:"₹12-22 LPA / $100-150k"}, topCourses:[{name:"KodeKloud DevOps",url:"https://kodekloud.com",free:false},{name:"Docker & Kubernetes Udemy",url:"https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide",free:false},{name:"Linux Foundation Free Courses",url:"https://training.linuxfoundation.org/resources/?_sft_content_type=free-course",free:true}], topInternships:[{name:"LinkedIn DevOps Intern",url:"https://www.linkedin.com/jobs/devops-internships"},{name:"Wellfound DevOps",url:"https://wellfound.com/jobs?role=devops-engineer"},{name:"Internshala Cloud",url:"https://internshala.com/internships/cloud-computing-internship"}], certifications:[{name:"AWS Solutions Architect",url:"https://aws.amazon.com/certification/certified-solutions-architect-associate"},{name:"CKA Kubernetes Admin",url:"https://www.cncf.io/certification/cka"}] },
  "Backend Developer":       { mustHave:["Node.js or Python or Java","REST APIs","SQL or NoSQL","Git"], niceToHave:["Docker","AWS/GCP","Redis","GraphQL"], internshipFields:["Software Engineering","Backend Development","Cloud"], avgSalary:{entry:"₹4-6 LPA / $50-70k",mid:"₹10-18 LPA / $90-130k"}, topCourses:[{name:"CS50 Web Programming",url:"https://cs50.harvard.edu/web",free:true},{name:"Node.js Complete Guide",url:"https://www.udemy.com/course/nodejs-the-complete-guide",free:false},{name:"FastAPI Full Course",url:"https://www.youtube.com/watch?v=0sOvCWFmrtA",free:true}], topInternships:[{name:"Internshala Backend",url:"https://internshala.com/internships/backend-development-internship"},{name:"LinkedIn Backend Intern",url:"https://www.linkedin.com/jobs/backend-developer-internships"},{name:"HackerEarth Jobs",url:"https://www.hackerearth.com/jobs"}], certifications:[{name:"AWS Developer Associate",url:"https://aws.amazon.com/certification/certified-developer-associate"},{name:"Meta Backend Certificate",url:"https://www.coursera.org/professional-certificates/meta-back-end-developer"}] }
};

const careerProfiles = new Map();

// Agent 1: Extractor
async function agentExtract(conversation) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const res = await client.chat.completions.create({
    model:"llama-3.3-70b-versatile", max_tokens:800,
    messages:[
      {role:"system",content:"You are a Profile Extractor. Extract student profile data from a conversation. Return ONLY valid JSON, no markdown. Use null for missing fields."},
      {role:"user",content:`Extract from this conversation:\n\n${conversation}\n\nReturn JSON:\n{"name":null,"field":null,"gpa":null,"targetRole":null,"targetSalary":null,"targetCompanyType":null,"timeline":null,"skills":[],"certifications":[],"github":false,"linkedin":false,"cocurricular":0,"hackathons":0,"english":null,"hasInternship":false,"internshipGrade":null,"internshipField":null,"internshipDuration":null,"supervisorRating":null,"gotJobOffer":null}`}
    ]
  });
  return JSON.parse(res.choices[0].message.content.replace(/```json|```/g,"").trim());
}

// Agent 2: Scorer (pure logic)
function agentScore(profile) {
  const role = ROLE_REQ[profile.targetRole] || ROLE_REQ["Full Stack Developer"];
  const sl = (profile.skills||[]).map(s=>s.toLowerCase());
  const mh = role.mustHave.filter(r=>sl.some(s=>s.includes(r.toLowerCase().split(" ")[0]))).length;
  const nth = role.niceToHave.filter(r=>sl.some(s=>s.includes(r.toLowerCase().split(" ")[0]))).length;
  let skills = Math.round((mh/role.mustHave.length)*70+(nth/role.niceToHave.length)*30);
  if(profile.github) skills=Math.min(skills+15,100);
  let academic=0;
  if(profile.gpa){const s=profile.gpa>5?profile.gpa/10:profile.gpa/5;academic+=s*50;}
  if(profile.linkedin)academic+=15;
  if(profile.certifications?.length)academic+=Math.min(profile.certifications.length*10,25);
  academic=Math.min(Math.round(academic),100);
  let internship=0;
  if(profile.hasInternship){
    internship+=30;
    const gm={"A+":25,"A":22,"B+":18,"B":14,"C":8};
    internship+=gm[profile.internshipGrade]||0;
    const fm=role.internshipFields.some(f=>profile.internshipField?.toLowerCase().includes(f.toLowerCase().split(" ")[0]));
    if(fm)internship+=20;
    if((profile.internshipDuration||0)>=3)internship+=10;
    if((profile.supervisorRating||0)>=4)internship+=8;
    if(profile.gotJobOffer)internship+=7;
  }
  internship=Math.min(Math.round(internship),100);
  let activities=0;
  if(profile.hackathons>0)activities+=Math.min(profile.hackathons*20,40);
  if(profile.cocurricular>0)activities+=Math.min(profile.cocurricular*15,40);
  if(profile.english==="Fluent")activities+=20;
  else if(profile.english==="Intermediate")activities+=10;
  activities=Math.min(activities,100);
  const overall=Math.round(internship*0.45+skills*0.25+academic*0.20+activities*0.10);
  return{overall,breakdown:{internship,skills,academic,activities}};
}

// Agent 3: Gap Analyzer (pure logic)
function agentGaps(profile,scores) {
  const role=ROLE_REQ[profile.targetRole]||ROLE_REQ["Full Stack Developer"];
  const gaps=[],strengths=[];
  const sl=(profile.skills||[]).map(s=>s.toLowerCase());
  role.mustHave.forEach(req=>{
    const has=sl.some(s=>s.includes(req.toLowerCase().split(" ")[0]));
    if(!has)gaps.push({severity:"critical",message:`Missing must-have skill: ${req}`});
    else strengths.push({message:`Has ${req} ✓`});
  });
  if(!profile.github)gaps.push({severity:"high",message:"No GitHub — most tech roles require a project portfolio"});
  else strengths.push({message:"Active GitHub profile ✓"});
  if(!profile.hasInternship)gaps.push({severity:"critical",message:"No internship experience — highest impact factor on employability (76% accuracy per research)"});
  else{
    const fm=role.internshipFields.some(f=>profile.internshipField?.toLowerCase().includes(f.toLowerCase().split(" ")[0]));
    if(!fm)gaps.push({severity:"high",message:`Internship field doesn't match target role`});
    else strengths.push({message:`Relevant internship in ${profile.internshipField} ✓`});
  }
  if(!profile.certifications?.length)gaps.push({severity:"medium",message:"No certifications — one relevant cert boosts profile significantly"});
  else strengths.push({message:`${profile.certifications.length} certification(s) ✓`});
  if(!profile.linkedin)gaps.push({severity:"medium",message:"No LinkedIn — recruiters screen here first"});
  else strengths.push({message:"LinkedIn profile active ✓"});
  const readinessLevel=scores.overall>=75?"Strong":scores.overall>=55?"Developing":"Early Stage";
  return{gaps,strengths,readinessLevel};
}

// Agent 4: Roadmap Builder (AI)
async function agentRoadmap(profile,scores,gapAnalysis) {
  const client=new Groq({apiKey:process.env.GROQ_API_KEY});
  const res=await client.chat.completions.create({
    model:"llama-3.3-70b-versatile",max_tokens:1000,
    messages:[
      {role:"system",content:"You are a Career Roadmap Specialist. Return ONLY valid JSON, no markdown, no extra text."},
      {role:"user",content:`Build a 3-phase career roadmap.
TARGET: ${profile.targetRole} | SCORE: ${scores.overall}/100 (${gapAnalysis.readinessLevel}) | TIMELINE: ${profile.timeline||"1 year"}
GAPS: ${gapAnalysis.gaps.map(g=>g.message).join("; ")}
STRENGTHS: ${gapAnalysis.strengths.map(s=>s.message).join("; ")}
Return: {"summary":"<2 sentences>","salaryRealistic":"<honest salary>","phases":[{"phase":1,"title":"","duration":"","focus":"","actions":["","",""]},{"phase":2,"title":"","duration":"","focus":"","actions":["","",""]},{"phase":3,"title":"","duration":"","focus":"","actions":["",""]}]}`}
    ]
  });
  return JSON.parse(res.choices[0].message.content.replace(/```json|```/g,"").trim());
}

// ── Career Routes ──────────────────────────────────────────────────

app.get("/career/roles",(req,res)=>res.json({roles:Object.keys(ROLE_REQ)}));

app.post("/career/chat",async(req,res)=>{
  const{messages,sessionId}=req.body;
  if(!messages||!sessionId)return res.status(400).json({error:"messages and sessionId required"});
  try{
    const client=new Groq({apiKey:process.env.GROQ_API_KEY});
    const roles=Object.keys(ROLE_REQ).join(", ");
    const response=await client.chat.completions.create({
      model:"llama-3.3-70b-versatile",max_tokens:300,
      messages:[
        {role:"system",content:`You are a friendly Career Intelligence assistant. Collect the student's profile through natural conversation — NOT a form. Ask ONE question at a time. Be warm and encouraging.\n\nCollect: name, field of study, target role (from: ${roles}), target salary, company type, timeline, GPA, skills, certifications, GitHub/LinkedIn, internship experience, hackathons.\n\nOnce you have targetRole + field + skills + one of (GPA or internship info), end your message with exactly: [PROFILE_READY]\n\nKeep responses to 2-3 sentences. Be conversational, not robotic.`},
        ...messages
      ]
    });
    const reply=response.choices[0].message.content;
    const cleanReply = reply.replace("[PROFILE_READY]","").replace("[RESUME_NEEDED]","").trim();
    res.json({
      reply: cleanReply,
      profileReady: reply.includes("[PROFILE_READY]"),
      resumeNeeded: reply.includes("[RESUME_NEEDED]")
    });
  }catch(err){console.error("career/chat error:",err.message);res.status(500).json({error:err.message});}
});

app.post("/career/analyze",async(req,res)=>{
  const{messages,sessionId}=req.body;
  if(!messages||!sessionId)return res.status(400).json({error:"messages and sessionId required"});
  try{
    const conversation=messages.map(m=>`${m.role==="user"?"Student":"AI"}: ${m.content}`).join("\n");
    console.log("→ Agent 1: Extracting...");const profile=await agentExtract(conversation);
    console.log("→ Agent 2: Scoring...");const scores=agentScore(profile);
    console.log("→ Agent 3: Gap analysis...");const gapAnalysis=agentGaps(profile,scores);
    console.log("→ Agent 4: Building roadmap...");const roadmap=await agentRoadmap(profile,scores,gapAnalysis);
    const roleData=ROLE_REQ[profile.targetRole]||ROLE_REQ["Full Stack Developer"];
    if(!careerProfiles.has(sessionId))careerProfiles.set(sessionId,{snapshots:[]});
    const store=careerProfiles.get(sessionId);
    store.snapshots.push({timestamp:Date.now(),score:scores.overall});
    store.latest={profile,scores,gapAnalysis,roadmap};
    res.json({profile,scores,gapAnalysis,roadmap,resources:{courses:roleData.topCourses,internships:roleData.topInternships,certifications:roleData.certifications,avgSalary:roleData.avgSalary},progress:store.snapshots});
  }catch(err){console.error("career/analyze error:",err.message);res.status(500).json({error:err.message});}
});

app.get("/career/progress/:sessionId",(req,res)=>{
  const store=careerProfiles.get(req.params.sessionId);
  res.json(store?{snapshots:store.snapshots,latest:store.latest}:{snapshots:[],latest:null});
});

// ═══════════════════════════════════════════════════════════════════
// ─── AUTH ROUTES ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "email, password and name required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  try {
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already registered" });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id, email, name, role",
      [email.toLowerCase(), hash, name]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email.toLowerCase()]);
    if (!result.rows.length) return res.status(401).json({ error: "Invalid email or password" });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });
    await pool.query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// GET /auth/me — verify token + get current user
app.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id=$1", [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── RESUME ROUTES ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// POST /resume/upload — upload PDF to Cloudinary + extract text
app.post("/resume/upload", requireAuth, upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    console.log("→ Uploading resume to Cloudinary...", req.file.originalname);

    // Upload buffer directly to Cloudinary v2
    const cloudResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    console.log("✓ Cloudinary upload success:", cloudResult.secure_url);

    // Extract text from PDF buffer directly (no fetch needed)
    let extractedText = "";
    try {
      const parsed = await pdfParse(req.file.buffer);
      extractedText = parsed.text;
      console.log("✓ PDF text extracted:", extractedText.length, "chars");
    } catch (e) { console.warn("PDF parse warning:", e.message); }

    // Mark old resumes inactive
    await pool.query("UPDATE resumes SET is_active=FALSE WHERE user_id=$1", [req.user.id]);

    // Save to DB
    const result = await pool.query(
      "INSERT INTO resumes (user_id, cloudinary_url, cloudinary_id, filename, extracted_text) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [req.user.id, cloudResult.secure_url, cloudResult.public_id, req.file.originalname, extractedText]
    );
    res.json({ resume: result.rows[0], textLength: extractedText.length });
  } catch (err) { console.error("Resume upload error:", err); res.status(500).json({ error: err.message }); }
});

// GET /resume/me — get current user's active resume
app.get("/resume/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM resumes WHERE user_id=$1 AND is_active=TRUE ORDER BY uploaded_at DESC LIMIT 1",
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── GITHUB + LEETCODE DATA ROUTES ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// POST /profile/github — fetch and cache GitHub data
app.post("/profile/github", requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });
  try {
    // GitHub REST API (no auth needed for public data)
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: { "User-Agent": "PRI-Platform" } }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=stars`, { headers: { "User-Agent": "PRI-Platform" } })
    ]);
    if (!userRes.ok) return res.status(404).json({ error: "GitHub user not found" });
    const userData = await userRes.json();
    const reposData = await reposRes.json();

    // Aggregate language stats
    const langCount = {};
    reposData.forEach(r => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });
    const topLanguages = Object.entries(langCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([l])=>l);
    const totalStars = reposData.reduce((s,r)=>s+r.stargazers_count,0);
    const topRepos = reposData.slice(0,5).map(r=>({ name:r.name, stars:r.stargazers_count, language:r.language, url:r.html_url, description:r.description }));

    // Save to DB
    await pool.query(`
      INSERT INTO github_data (user_id, username, public_repos, top_languages, total_stars, top_repos, fetched_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        username=$2, public_repos=$3, top_languages=$4, total_stars=$5, top_repos=$6, fetched_at=NOW()
    `, [req.user.id, username, userData.public_repos, topLanguages, totalStars, JSON.stringify(topRepos)]);

    // Update profile
    await pool.query(`
      INSERT INTO student_profiles (user_id, github_username) VALUES ($1,$2)
      ON CONFLICT (user_id) DO UPDATE SET github_username=$2, updated_at=NOW()
    `, [req.user.id, username]);

    res.json({ username, public_repos: userData.public_repos, topLanguages, totalStars, topRepos });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /profile/leetcode — fetch and cache LeetCode data
app.post("/profile/leetcode", requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });
  try {
    // LeetCode public GraphQL API
    const query = `{ matchedUser(username: "${username}") { submitStats { acSubmissionNum { difficulty count } } profile { ranking } } }`;
    const lcRes = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "PRI-Platform" },
      body: JSON.stringify({ query })
    });
    const lcData = await lcRes.json();
    const user = lcData?.data?.matchedUser;
    if (!user) return res.status(404).json({ error: "LeetCode user not found" });

    const stats = user.submitStats.acSubmissionNum;
    const total = stats.find(s=>s.difficulty==="All")?.count || 0;
    const easy = stats.find(s=>s.difficulty==="Easy")?.count || 0;
    const medium = stats.find(s=>s.difficulty==="Medium")?.count || 0;
    const hard = stats.find(s=>s.difficulty==="Hard")?.count || 0;

    await pool.query(`
      INSERT INTO leetcode_data (user_id, username, total_solved, easy_solved, medium_solved, hard_solved, ranking, fetched_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        username=$2, total_solved=$3, easy_solved=$4, medium_solved=$5, hard_solved=$6, ranking=$7, fetched_at=NOW()
    `, [req.user.id, username, total, easy, medium, hard, user.profile?.ranking || null]);

    await pool.query(`
      INSERT INTO student_profiles (user_id, leetcode_username) VALUES ($1,$2)
      ON CONFLICT (user_id) DO UPDATE SET leetcode_username=$2, updated_at=NOW()
    `, [req.user.id, username]);

    res.json({ username, total_solved: total, easy_solved: easy, medium_solved: medium, hard_solved: hard, ranking: user.profile?.ranking });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── ENHANCED CAREER ANALYZE (with resume + GitHub + LeetCode) ──────
// ═══════════════════════════════════════════════════════════════════

// Agent 5: Resume Ranker
async function agentRankResume(resumeText, targetRole) {
  if (!resumeText || resumeText.length < 100) return null;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile", max_tokens: 800,
    messages: [
      { role: "system", content: "You are a Resume Expert and ATS specialist. Return ONLY valid JSON, no markdown." },
      { role: "user", content: `Analyze this resume for a ${targetRole} position.

RESUME TEXT:
${resumeText.slice(0, 3000)}

Return JSON:
{
  "overall_score": <0-100>,
  "ats_score": <0-100>,
  "sections": {
    "contact": <0-100>,
    "summary": <0-100>,
    "experience": <0-100>,
    "skills": <0-100>,
    "education": <0-100>,
    "projects": <0-100>
  },
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<specific improvement1>", "<specific improvement2>", "<specific improvement3>"],
  "missing_keywords": ["<keyword missing for ${targetRole}>"],
  "verdict": "<2 sentence honest assessment>"
}` }
    ]
  });
  return JSON.parse(res.choices[0].message.content.replace(/```json|```/g, "").trim());
}

// Override /career/analyze to use DB + resume + GitHub + LeetCode
app.post("/career/analyze/full", requireAuth, async (req, res) => {
  const { messages, sessionId } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });
  try {
    // Get all user data from DB
    const [profileRes, resumeRes, githubRes, leetcodeRes] = await Promise.all([
      pool.query("SELECT * FROM student_profiles WHERE user_id=$1", [req.user.id]),
      pool.query("SELECT * FROM resumes WHERE user_id=$1 AND is_active=TRUE LIMIT 1", [req.user.id]),
      pool.query("SELECT * FROM github_data WHERE user_id=$1", [req.user.id]),
      pool.query("SELECT * FROM leetcode_data WHERE user_id=$1", [req.user.id])
    ]);

    const dbProfile = profileRes.rows[0] || {};
    const resume = resumeRes.rows[0];
    const github = githubRes.rows[0];
    const leetcode = leetcodeRes.rows[0];

    // Build enriched conversation with all data sources
    const conversation = messages.map(m => `${m.role === "user" ? "Student" : "AI"}: ${m.content}`).join("\n");
    const enrichedContext = `
${conversation}

ADDITIONAL DATA FROM PROFILE:
${github ? `GitHub: ${github.username} | ${github.public_repos} repos | Stars: ${github.total_stars} | Top languages: ${github.top_languages?.join(", ")}` : "GitHub: not connected"}
${leetcode ? `LeetCode: ${leetcode.username} | Solved: ${leetcode.total_solved} (Easy:${leetcode.easy_solved} Med:${leetcode.medium_solved} Hard:${leetcode.hard_solved}) | Ranking: ${leetcode.ranking}` : "LeetCode: not connected"}
${resume ? `Resume: uploaded (${resume.extracted_text?.length || 0} chars extracted)` : "Resume: not uploaded"}
`;

    console.log("→ Agent 1: Extracting...");
    const profile = await agentExtract(enrichedContext);

    // Boost skills from GitHub languages
    if (github?.top_languages?.length) {
      profile.skills = [...new Set([...(profile.skills||[]), ...github.top_languages])];
      profile.github = true;
    }

    // Boost from LeetCode
    if (leetcode?.total_solved > 0) {
      if (!profile.skills) profile.skills = [];
      if (leetcode.total_solved > 100) profile.skills.push("Data Structures & Algorithms");
      profile.hackathons = (profile.hackathons || 0);
    }

    console.log("→ Agent 2: Scoring...");
    const scores = agentScore(profile);

    console.log("→ Agent 3: Gap analysis...");
    const gapAnalysis = agentGaps(profile, scores);

    console.log("→ Agent 4: Building roadmap...");
    const roadmap = await agentRoadmap(profile, scores, gapAnalysis);

    console.log("→ Agent 5: Resume ranking...");
    const resumeFeedback = resume?.extracted_text
      ? await agentRankResume(resume.extracted_text, profile.targetRole)
      : null;

    const roleData = ROLE_REQ[profile.targetRole] || ROLE_REQ["Full Stack Developer"];

    // Save score to DB
    await pool.query(`
      INSERT INTO career_scores (user_id, overall_score, internship_score, skills_score, academic_score, activities_score, resume_score, readiness_level, target_role, gaps, strengths, roadmap, resume_feedback)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [
      req.user.id, scores.overall,
      scores.breakdown.internship, scores.breakdown.skills,
      scores.breakdown.academic, scores.breakdown.activities,
      resumeFeedback?.overall_score || null,
      gapAnalysis.readinessLevel, profile.targetRole,
      JSON.stringify(gapAnalysis.gaps), JSON.stringify(gapAnalysis.strengths),
      JSON.stringify(roadmap), JSON.stringify(resumeFeedback)
    ]);

    // Update student profile
    await pool.query(`
      INSERT INTO student_profiles (user_id, field, gpa, target_role, target_salary, skills, github_username, has_internship, internship_field, hackathons)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (user_id) DO UPDATE SET
        field=COALESCE($2,student_profiles.field), gpa=COALESCE($3,student_profiles.gpa),
        target_role=COALESCE($4,student_profiles.target_role), target_salary=COALESCE($5,student_profiles.target_salary),
        skills=COALESCE($6,student_profiles.skills), updated_at=NOW()
    `, [req.user.id, profile.field, profile.gpa, profile.targetRole, profile.targetSalary,
        profile.skills, profile.github ? profile.github_username : null,
        profile.hasInternship, profile.internshipField, profile.hackathons]);

    res.json({
      profile,
      scores,
      gapAnalysis,
      roadmap,
      resumeFeedback,
      github: github || null,
      leetcode: leetcode || null,
      resources: { courses: roleData.topCourses, internships: roleData.topInternships, certifications: roleData.certifications, avgSalary: roleData.avgSalary }
    });
  } catch (err) { console.error("analyze/full error:", err); res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── USER PROFILE & SCORE HISTORY ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// GET /profile/me — full profile with score history
app.get("/profile/me", requireAuth, async (req, res) => {
  try {
    const [userRes, profileRes, scoresRes, githubRes, leetcodeRes] = await Promise.all([
      pool.query("SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id=$1", [req.user.id]),
      pool.query("SELECT * FROM student_profiles WHERE user_id=$1", [req.user.id]),
      pool.query("SELECT overall_score, resume_score, readiness_level, target_role, created_at FROM career_scores WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20", [req.user.id]),
      pool.query("SELECT * FROM github_data WHERE user_id=$1", [req.user.id]),
      pool.query("SELECT * FROM leetcode_data WHERE user_id=$1", [req.user.id])
    ]);
    res.json({
      user: userRes.rows[0],
      profile: profileRes.rows[0] || null,
      scoreHistory: scoresRes.rows,
      github: githubRes.rows[0] || null,
      leetcode: leetcodeRes.rows[0] || null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── ADMIN DASHBOARD ROUTES ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// GET /admin/analytics — aggregate stats for admin
app.get("/admin/analytics", requireAdmin, async (req, res) => {
  try {
    const [usersRes, scoresRes, rolesRes, gapsRes, recentRes] = await Promise.all([
      // Total users + breakdown
      pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN last_login > NOW()-INTERVAL '7 days' THEN 1 END) as active_week FROM users WHERE role='student'"),
      // Score distribution
      pool.query(`SELECT
        AVG(overall_score)::int as avg_score,
        MIN(overall_score) as min_score,
        MAX(overall_score) as max_score,
        COUNT(DISTINCT user_id) as students_analyzed,
        AVG(resume_score)::int as avg_resume_score,
        COUNT(CASE WHEN readiness_level='Strong' THEN 1 END) as strong_count,
        COUNT(CASE WHEN readiness_level='Developing' THEN 1 END) as developing_count,
        COUNT(CASE WHEN readiness_level='Early Stage' THEN 1 END) as early_count
        FROM career_scores`),
      // Top target roles
      pool.query(`SELECT target_role, COUNT(*) as count FROM career_scores WHERE target_role IS NOT NULL GROUP BY target_role ORDER BY count DESC LIMIT 8`),
      // Score by role
      pool.query(`SELECT target_role, AVG(overall_score)::int as avg_score, COUNT(*) as count FROM career_scores WHERE target_role IS NOT NULL GROUP BY target_role ORDER BY avg_score DESC`),
      // Recent students
      pool.query(`SELECT u.name, u.email, u.created_at, sp.target_role,
        (SELECT overall_score FROM career_scores WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) as latest_score
        FROM users u LEFT JOIN student_profiles sp ON sp.user_id=u.id
        WHERE u.role='student' ORDER BY u.created_at DESC LIMIT 10`)
    ]);

    res.json({
      users: usersRes.rows[0],
      scores: scoresRes.rows[0],
      topRoles: rolesRes.rows,
      scoreByRole: gapsRes.rows,
      recentStudents: recentRes.rows
    });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// GET /admin/students — list all students with latest scores
app.get("/admin/students", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at, u.last_login,
        sp.target_role, sp.field, sp.skills,
        (SELECT overall_score FROM career_scores WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) as latest_score,
        (SELECT readiness_level FROM career_scores WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) as readiness,
        (SELECT COUNT(*) FROM career_scores WHERE user_id=u.id) as analysis_count
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id=u.id
      WHERE u.role='student'
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/student/:id — full detail for one student
app.get("/admin/student/:id", requireAdmin, async (req, res) => {
  try {
    const [userRes, profileRes, scoresRes] = await Promise.all([
      pool.query("SELECT id, name, email, created_at, last_login FROM users WHERE id=$1", [req.params.id]),
      pool.query("SELECT * FROM student_profiles WHERE user_id=$1", [req.params.id]),
      pool.query("SELECT * FROM career_scores WHERE user_id=$1 ORDER BY created_at DESC", [req.params.id])
    ]);
    if (!userRes.rows.length) return res.status(404).json({ error: "Student not found" });
    res.json({ user: userRes.rows[0], profile: profileRes.rows[0], scores: scoresRes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── HISTORY ROUTES ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// GET /history/career — career score history for current user
app.get("/history/career", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, overall_score, internship_score, skills_score, academic_score,
             activities_score, resume_score, readiness_level, target_role,
             gaps, strengths, roadmap, created_at
      FROM career_scores
      WHERE user_id=$1
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /history/challenges — PRI challenge history for current user
app.get("/history/challenges", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cs.*, c.category, c.difficulty, c.task
      FROM challenge_sessions cs
      LEFT JOIN LATERAL (
        SELECT * FROM (VALUES
          ('ch_001','Responsive Layouts','medium','Navigation bar challenge'),
          ('ch_002','API Integration','hard','Debounced search challenge'),
          ('ch_003','React State Management','hard','Shopping cart challenge'),
          ('ch_004','CSS Architecture','medium','Design token challenge')
        ) AS t(id, category, difficulty, task)
        WHERE t.id = cs.challenge_id
      ) c ON true
      WHERE cs.user_id=$1
      ORDER BY cs.created_at DESC
      LIMIT 20
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── GLITCH STATS ROUTES ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// GET /stats/glitch — detailed PRI stats for current user
app.get("/stats/glitch", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_attempts,
        AVG(pri_total)::decimal(4,3) as avg_pri,
        AVG(prompt_score)::decimal(4,3) as avg_prompt,
        AVG(bug_detection)::decimal(4,3) as avg_bug_detection,
        AVG(reasoning_depth)::decimal(4,3) as avg_reasoning,
        MAX(pri_total)::decimal(4,3) as best_pri,
        COUNT(CASE WHEN detected_bug=true THEN 1 END) as bugs_detected,
        COUNT(CASE WHEN detected_bug=false THEN 1 END) as bugs_missed,
        challenge_id,
        COUNT(*) as attempts_per_challenge
      FROM challenge_sessions
      WHERE user_id=$1
      GROUP BY challenge_id
    `, [req.user.id]);

    const overall = await pool.query(`
      SELECT
        COUNT(*) as total,
        AVG(pri_total)::decimal(4,3) as avg_pri,
        MAX(pri_total)::decimal(4,3) as best_pri,
        COUNT(CASE WHEN detected_bug=true THEN 1 END) as total_detected
      FROM challenge_sessions WHERE user_id=$1
    `, [req.user.id]);

    const recent = await pool.query(`
      SELECT pri_total, prompt_score, bug_detection, reasoning_depth, detected_bug, challenge_id, created_at
      FROM challenge_sessions WHERE user_id=$1
      ORDER BY created_at DESC LIMIT 10
    `, [req.user.id]);

    res.json({ byChallenge: result.rows, overall: overall.rows[0], recent: recent.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── CERTIFICATE UPLOAD & WEIGHT ROUTES ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// POST /profile/certificates — save certifications with weight calculation
app.post("/profile/certificates", requireAuth, async (req, res) => {
  const { certifications } = req.body; // array of { name, issuer, year, url }
  if (!certifications || !Array.isArray(certifications)) {
    return res.status(400).json({ error: "certifications array required" });
  }
  try {
    // Calculate cert weight based on issuer prestige
    const CERT_WEIGHTS = {
      "google": 95, "aws": 93, "microsoft": 90, "meta": 90, "ibm": 85,
      "coursera": 70, "udemy": 55, "nptel": 75, "oracle": 85,
      "cisco": 82, "comptia": 80, "tensorflow": 88, "mongodb": 78
    };
    const weighted = certifications.map(c => {
      const issuerLower = (c.issuer || "").toLowerCase();
      const weight = Object.entries(CERT_WEIGHTS).find(([k]) => issuerLower.includes(k))?.[1] || 65;
      return { ...c, weight };
    });
    const totalValue = weighted.reduce((sum, c) => sum + c.weight, 0);
    const avgValue = weighted.length ? Math.round(totalValue / weighted.length) : 0;

    // Save to student_profiles
    const certNames = certifications.map(c => `${c.name} (${c.issuer})`);
    await pool.query(`
      INSERT INTO student_profiles (user_id, certifications)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET certifications=$2, updated_at=NOW()
    `, [req.user.id, certNames]);

    res.json({ certifications: weighted, totalValue, avgValue, profileImpact: `+${Math.min(Math.round(avgValue * 0.15), 20)} points to academic score` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /profile/certificates — get user's saved certifications
app.get("/profile/certificates", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT certifications FROM student_profiles WHERE user_id=$1", [req.user.id]);
    res.json({ certifications: result.rows[0]?.certifications || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ─── RESUME GENERATION FROM CHAT ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// POST /resume/generate — generate resume content from conversation
app.post("/resume/generate", requireAuth, async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });
  try {
    const conversation = messages.map(m => `${m.role === "user" ? "Student" : "AI"}: ${m.content}`).join("\n");
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", max_tokens: 1500,
      messages: [
        { role: "system", content: "You are a professional resume writer. Generate a clean, ATS-optimized resume from the conversation. Return ONLY valid JSON, no markdown." },
        { role: "user", content: `From this career chat conversation, generate a professional resume:\n\n${conversation}\n\nReturn JSON:\n{"name":"","email":"","phone":"","location":"","summary":"2-3 sentence professional summary","education":[{"degree":"","institution":"","year":"","gpa":""}],"experience":[{"title":"","company":"","duration":"","bullets":["","",""]}],"skills":{"technical":[],"tools":[],"soft":[]},"certifications":[{"name":"","issuer":"","year":""}],"projects":[{"name":"","tech":"","description":"","link":""}],"activities":[]}` }
      ]
    });
    const text = response.choices[0].message.content;
    const resumeData = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(resumeData);
  } catch (err) { console.error("Resume gen error:", err); res.status(500).json({ error: err.message }); }
});
