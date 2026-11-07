/**
 * ============================================================================
 * CAREER NAVIGATOR 2.0 — SECURE AI SERVICE
 * Lean architecture supporting Google Gemini API (Free Tier) & OpenAI fallback
 * With in-memory rate limiting, token optimization, and intelligent fallbacks.
 * ============================================================================
 */

// Simple in-memory sliding window rate limiter
const ipRequestHistory = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;      // 15 requests/min per IP (aligned with Gemini free tier)

export function checkRateLimit(ip) {
    const now = Date.now();
    const timestamps = ipRequestHistory.get(ip) || [];
    
    // Filter timestamps within the window
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }
    
    recent.push(now);
    ipRequestHistory.set(ip, recent);
    
    // Periodic garbage collection
    if (ipRequestHistory.size > 2000) {
        for (const [key, times] of ipRequestHistory.entries()) {
            if (times.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) {
                ipRequestHistory.delete(key);
            }
        }
    }
    
    return true;
}

const SYSTEM_INSTRUCTION = `You are Navi, the empathetic, encouraging, and highly knowledgeable AI Career Guide from Career Navigator 2.0, a digital career navigation platform founded by Vibhoo Jain.

Your Mission:
1. Help students, career switchers, and beginners move from confusion to professional clarity.
2. Provide structured career guidance, skill breakdowns, milestone roadmaps, and programming help.
3. Offer practical, realistic project suggestions and specific monetization avenues (junior full-time roles, freelancing on Upwork/Fiverr, remote contracts, digital products).
4. Emphasize zero-cost, high-quality learning resources (official documentation, free YouTube courses, GitHub, Kaggle).

Style Guidelines:
- Keep answers structured, encouraging, concise, and actionable.
- Use clean Markdown formatting: bold highlights, bulleted lists, and step-by-step numbers.
- Never invent nonexistent qualifications or give misleading financial guarantees.
- Always be encouraging, practical, and solution-focused.`;

/**
 * Call Google Gemini API (gemini-1.5-flash / gemini-2.0-flash)
 */
async function callGemini(apiKey, message, history = []) {
    // Format history for Gemini API
    const contents = [];
    
    // Add truncated conversation history (up to last 6 messages)
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
        if (h.role && h.content) {
            contents.push({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: String(h.content).slice(0, 800) }]
            });
        }
    }

    // Add current user prompt
    contents.push({
        role: 'user',
        parts: [{ text: message }]
    });

    // Try gemini-1.5-flash endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: contents,
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 900,
                topP: 0.95
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('Gemini API returned an empty completion.');
    }

    return text;
}

/**
 * Call OpenAI API fallback if OPENAI_API_KEY is configured
 */
async function callOpenAI(apiKey, message, history = []) {
    const messages = [
        { role: 'system', content: SYSTEM_INSTRUCTION }
    ];

    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
        if (h.role && h.content) {
            messages.push({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: String(h.content).slice(0, 800)
            });
        }
    }

    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 900,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API Error: ${response.status} - ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response returned from OpenAI.';
}

/**
 * Comprehensive Intelligent Career Guidance Engine
 * Provides instant, zero-cost, high-value career counseling across all 8 disciplines,
 * salaries, beginner transitions, freelancing, and resume optimization without needing API keys.
 */
function getIntelligentFallback(query) {
    const raw = (query || '').toLowerCase().trim();
    const clean = raw.replace(/[^\w\s\+\#]/g, ' ');

    // 1. Greetings & Small Talk / Identity
    if (/^(hi|hello|hey|namaste|greetings|hola|sup|yo|start|good (morning|afternoon|evening))\b/.test(clean) || clean === 'hi' || clean === 'hello') {
        return `### 👋 Hello! I'm Navi, Your Career Guide

Welcome to **Career Navigator 2.0**! I'm here to help you move from career uncertainty to a crystal-clear learning and earning roadmap.

**Here are some popular things you can ask me right now:**
- 💻 *"How do I become a Web Developer from scratch?"*
- 🎨 *"Can I start UI/UX Design with zero coding experience?"*
- 💰 *"Which tech career pays the highest salary for beginners?"*
- 📊 *"What skills do I need for a Data Analyst role?"*
- 🌐 *"How do I land my first freelancing client on Upwork?"*
- 🛡️ *"Is Cybersecurity good for beginners?"*

Tell me: **What are your interests, current background, or target role?** Let's build your path!`;
    }

    if (clean.includes('who are you') || clean.includes('who made') || clean.includes('who created') || clean.includes('vibhoo') || clean.includes('about you')) {
        return `### 🧭 About Navi & Career Navigator 2.0

I am **Navi**, the built-in AI Career Mentor for **Career Navigator 2.0**, designed and created by **Vibhoo Jain**.

**Our Mission:**
Provide students, career switchers, and aspiring tech professionals with **100% free, structured roadmaps**, realistic earning pathways, ATS resume analysis, and practical career navigation without expensive bootcamps or confusion.

Feel free to ask me anything about our 8 career roadmaps, salaries, freelancing, or resume optimization!`;
    }

    // Curated Free YouTube Courses & Playlists Intent
    if (clean.includes('youtube') || clean.includes('yt') || clean.includes('playlist') || clean.includes('video course') || clean.includes('free course') || clean.includes('free tutorial')) {
        return `### 🎬 Top Curated Free YouTube Courses & Playlists

Here are our top verified, 100% free YouTube courses and playlist recommendations:

- 💻 **Web Development:**
  - [freeCodeCamp 21-Hour Full Stack Web Dev](https://www.youtube.com/watch?v=nu_pCVPKzTk)
  - [Chai aur Code — JavaScript & React Playlist](https://www.youtube.com/playlist?list=PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37)
  - [CodeWithHarry — Sigma Web Dev Playlist](https://www.youtube.com/playlist?list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w)

- 🎨 **UI/UX Design:**
  - [freeCodeCamp — UI/UX Design Figma Tutorial](https://www.youtube.com/watch?v=c9Wg6Cb_YlU)
  - [Ansh Mehra — Complete Free UI/UX Course Playlist](https://www.youtube.com/playlist?list=PLlHtucAD9KT3R51rF7t6_3nS2K71hP0W5)
  - [Mizko — Figma UI3 & Design Systems Series](https://www.youtube.com/playlist?list=PLlhtuvb1dkhC49Hq_Q97q7W_F_z2WpC5I)

- 📊 **Data Analyst:**
  - [Alex The Analyst — Complete Data Analyst Bootcamp Playlist](https://www.youtube.com/playlist?list=PLUaB-1hjhk8FE_XZ27vVC30MTJ326VY9q)
  - [freeCodeCamp — Data Analysis with Python Course](https://www.youtube.com/watch?v=r-uOLxNrNk8)

- ☁️ **Cloud & DevOps:**
  - [TechWorld with Nana — DevOps Bootcamp](https://www.youtube.com/watch?v=9pZ2xmsSDdo)
  - [freeCodeCamp — AWS Solutions Architect (SAA-C03)](https://www.youtube.com/watch?v=Ia-UEYYR44s)

- 🛡️ **Cybersecurity:**
  - [freeCodeCamp — Cybersecurity for Beginners](https://www.youtube.com/watch?v=inWWh25TCEo)
  - [NetworkChuck — Free Complete CCNA & Network Defense](https://www.youtube.com/playlist?list=PLIhvC56v63IKrZUiWFjVC2dAmuPVo43b0)

- 📱 **Mobile Development:**
  - [freeCodeCamp — 37-Hour Flutter Master Course](https://www.youtube.com/watch?v=VPvVD8t02U8)
  - [The Net Ninja — Flutter & Dart Playlist](https://www.youtube.com/playlist?list=PL4cUxeGkcC9jLYyp2Aoh6hcWuxFDX6PBJ)

- 🖌️ **Graphic Design:**
  - [GFXMentor — Graphic Design Full Course Playlist](https://www.youtube.com/playlist?list=PLW-zSkCnZ-gA5Jn6gZtUa6Dny70PQ__vU)

- 🎬 **Video Editing:**
  - [Casey Faris — DaVinci Resolve Beginner to Pro Masterclass](https://www.youtube.com/watch?v=63Jn_Kge5H8)
  - [freeCodeCamp — Adobe Premiere Pro Tutorial](https://www.youtube.com/watch?v=jKxXosC0H5A)

👉 *You can also find direct embedded tutorials and video links on each individual [Career Roadmap](index.html#careers)!*`;
    }

    // 2. Web Development
    if (clean.includes('web dev') || clean.includes('frontend') || clean.includes('fullstack') || clean.includes('html') || clean.includes('javascript') || clean.includes('react') || clean.includes('web developer')) {
        return `### 💻 Web Development Career Roadmap (2026 Edition)

Web Development remains the #1 entry point into tech due to high hiring volume and rapid freelancing monetization.

#### 1. Core Learning Milestones:
- **Month 1 — The Foundations:** Semantic **HTML5**, modern **CSS3** (Flexbox, CSS Grid, Responsive Mobile-first Design).
- **Month 2 — Core JavaScript (ES6+):** DOM manipulation, Event loop, Array methods (\`map\`, \`filter\`, \`reduce\`), Async/Await & Fetch API.
- **Month 3 — Modern Frontend Framework:** Master **React.js** or **Next.js** (Hooks, State Management, Component Architecture).
- **Month 4 — Backend & Databases:** Node.js, Express.js, and relational/NoSQL databases (**PostgreSQL** or **MongoDB**).
- **Month 5 — Real-world Deployments:** Git & GitHub version control, deploying full-stack apps to **Vercel** or **Render**.

#### 2. Earning & Monetization Paths:
- **Freelancing (Upwork / Local Businesses):** Custom responsive landing pages & WordPress/Shopify customization ($250–$1,000 / ₹15,000–₹50,000 per project).
- **Junior Full-Time Roles:** Junior Frontend / Full-stack Developer ($55,000–$85,000 USD / ₹5L–₹12L INR entry-level).

👉 *Explore the complete milestone checklist on the [Web Developer Roadmap](careers/web-developer.html).*`;
    }

    // 3. UI/UX Design
    if (clean.includes('ui') || clean.includes('ux') || clean.includes('figma') || clean.includes('design') || clean.includes('wireframe') || clean.includes('product design')) {
        return `### 🎨 UI/UX Design Career Roadmap (Zero Coding Required)

UI/UX Design is the perfect blend of psychology, visual aesthetics, and user problem-solving. **No programming required!**

#### 1. Core Learning Milestones:
- **Month 1 — UX Foundations & User Psychology:** User personas, user journey mapping, information architecture, heuristic evaluation.
- **Month 2 — Figma Mastery:** Auto-layout, component variants, design tokens, interactive micro-prototypes, 8pt spatial grid system.
- **Month 3 — Design Systems & Accessibility:** WCAG 2.1 color contrast standards, typography hierarchies, reusable UI kits.
- **Month 4 — Portfolio Case Studies:** Create 2–3 deep case studies on **Behance** or **Dribbble** documenting *problem -> research -> wireframe -> final prototype*.

#### 2. Earning Potential:
- **Freelancing:** Mobile app UI design & SaaS dashboards ($30–$75/hr on Upwork).
- **Full-Time Salaries:** $50,000–$80,000 USD / ₹4.5L–₹11L INR for Junior Product Designers.

👉 *Check out the interactive milestone tracker on the [UI/UX Designer Roadmap](careers/ui-ux-designer.html).*`;
    }

    // 4. Data Analyst
    if (clean.includes('data') || clean.includes('analyst') || clean.includes('sql') || clean.includes('excel') || clean.includes('power bi') || clean.includes('tableau') || clean.includes('analytics')) {
        return `### 📊 Data Analyst Career Roadmap

Data Analysts transform unstructured raw numbers into actionable strategic business decisions.

#### 1. Core Learning Milestones:
- **Phase 1 — Advanced Excel:** XLOOKUP, Pivot Tables, conditional formulas, Power Query data cleaning.
- **Phase 2 — Business SQL Mastery (Critical):** Complex JOINs, Aggregations, Window Functions (\`ROW_NUMBER\`, \`DENSE_RANK\`), Subqueries.
- **Phase 3 — BI Visualization:** Build interactive executive dashboards in **Power BI** or **Tableau**.
- **Phase 4 — Scripting (Optional for starters):** Python with **Pandas** and **Matplotlib** for exploratory data analysis (EDA).
- **Phase 5 — Portfolio:** Download real-world datasets from **Kaggle** and publish 3 case studies showing *what business revenue insight you uncovered*.

#### 2. Earning Potential:
- **Junior Data Analyst:** $55,000–$85,000 USD / ₹6L–₹14L INR.
- High mobility into Business Intelligence (BI) Engineer and Data Science tracks.

👉 *See the full step-by-step checklist on the [Data Analyst Roadmap](careers/data-analyst.html).*`;
    }

    // 5. Cloud Engineering & DevOps
    if (clean.includes('cloud') || clean.includes('aws') || clean.includes('devops') || clean.includes('azure') || clean.includes('docker') || clean.includes('kubernetes') || clean.includes('terraform') || clean.includes('linux')) {
        return `### ☁️ Cloud Engineering & DevOps Roadmap

Cloud Engineers manage the scalable internet backbone behind modern applications and command top-tier compensation.

#### 1. Core Learning Milestones:
- **Milestone 1 — Linux & Networking:** Bash scripting, file permissions, SSH, TCP/IP, DNS, subnets, and CIDR blocks.
- **Milestone 2 — Cloud Provider Mastery:** Focus on **AWS** (EC2, S3, IAM, VPC, CloudWatch) or **Microsoft Azure**.
- **Milestone 3 — Containerization:** **Docker** for containerized apps and container networking fundamentals.
- **Milestone 4 — Infrastructure as Code (IaC):** **Terraform** for automated multi-environment provisioning.
- **Milestone 5 — Industry Certification:** Target **AWS Certified Solutions Architect – Associate (SAA-C03)**.

#### 2. Earning Potential:
- **Entry-to-Mid Cloud Engineer:** $65,000–$105,000 USD / ₹7L–₹18L INR (among the highest beginner tech packages).

👉 *Follow the step-by-step milestone path on the [Cloud Engineer Roadmap](careers/cloud-engineer.html).*`;
    }

    // 6. Cybersecurity Analyst
    if (clean.includes('cyber') || clean.includes('security') || clean.includes('hacking') || clean.includes('soc') || clean.includes('pentest') || clean.includes('comptia')) {
        return `### 🛡️ Cybersecurity Analyst Career Roadmap

Cybersecurity analysts defend corporate infrastructure, investigate intrusions, and prevent multi-million-dollar data breaches.

#### 1. Core Learning Milestones:
- **Milestone 1 — Network & OS Defense:** OSI Model, packet analysis with **Wireshark**, Linux server hardening.
- **Milestone 2 — Security Fundamentals:** Threat modeling, cryptography, vulnerability assessments, OWASP Top 10 vulnerabilities.
- **Milestone 3 — SOC Operations & SIEM:** Monitoring security incidents with **Splunk** or **Wazuh**.
- **Milestone 4 — Hands-on Labs:** Complete defensive challenges on **TryHackMe** (Cyber Defense path) and **Hack The Box**.
- **Milestone 5 — Certifications:** **CompTIA Security+ (SY0-701)** or **Certified SOC Analyst (CSA)**.

#### 2. Earning Potential:
- **Junior Security Analyst / SOC Tier 1:** $60,000–$95,000 USD / ₹6.5L–₹16L INR with near 0% unemployment rates.

👉 *Access the defensive roadmap on the [Cybersecurity Roadmap](careers/cybersecurity.html).*`;
    }

    // 7. Mobile App Developer
    if (clean.includes('mobile') || clean.includes('app dev') || clean.includes('android') || clean.includes('ios') || clean.includes('flutter') || clean.includes('react native') || clean.includes('swift') || clean.includes('kotlin')) {
        return `### 📱 Mobile App Development Roadmap

Mobile developers create native and cross-platform apps downloaded by millions on smartphones.

#### 1. Strategic Decision (Choose Your Path):
- **Cross-Platform (Fastest Career Path):** Learn **Flutter (Dart)** or **React Native (JavaScript/TypeScript)** to deploy to both iOS and Android simultaneously.
- **Native iOS:** Swift & SwiftUI (Requires a Mac).
- **Native Android:** Kotlin & Jetpack Compose.

#### 2. Milestones & Monetization:
- **Milestone 1:** Mobile UI layout & state management (Bloc, Provider, or Redux).
- **Milestone 2:** REST API consumption, local caching (SQLite/Hive), push notifications.
- **Milestone 3:** Publishing at least **1 live application** to Google Play Store or Apple App Store.
- **Earning Potential:** $52,000–$88,000 USD / ₹5.5L–₹14L INR; high mobile freelancing contract rates ($35–$80/hr).

👉 *Start tracking your milestones on the [Mobile Developer Roadmap](careers/mobile-dev.html).*`;
    }

    // 8. Graphic Design
    if (clean.includes('graphic') || clean.includes('photoshop') || clean.includes('illustrator') || clean.includes('logo') || clean.includes('branding') || clean.includes('poster')) {
        return `### 🖌️ Graphic Designer Career Roadmap

Graphic design delivers visual branding, advertising creatives, and marketing collateral for businesses.

#### 1. Core Learning Milestones:
- **Milestone 1 — Visual Design Theory:** Color psychology, typographic hierarchy, composition, gestalt principles.
- **Milestone 2 — Industry Tool Suite:** Master **Adobe Photoshop** (photo manipulation, raster art) & **Adobe Illustrator** (vector logos, icons).
- **Milestone 3 — Commercial Deliverables:** Social media ad packs, brand identity guidelines, pitch deck designs.
- **Milestone 4 — Portfolio:** Build a cohesive 8-piece visual portfolio showcasing client-ready brand identities.
- **Earning Potential:** $40,000–$65,000 USD / ₹3.5L–₹8L INR; exceptionally fast for freelancing on Fiverr/Instagram.

👉 *View the full guide on the [Graphic Designer Roadmap](careers/graphic-designer.html).*`;
    }

    // 9. Video Editor
    if (clean.includes('video') || clean.includes('editing') || clean.includes('premiere') || clean.includes('davinci') || clean.includes('after effects') || clean.includes('youtube') || clean.includes('reel') || clean.includes('tiktok')) {
        return `### 🎬 Video Editor Career Roadmap

Video editing is experiencing exponential growth fueled by the creator economy, YouTube, and short-form video marketing (Reels/TikTok).

#### 1. Core Learning Milestones:
- **Milestone 1 — Editing Software:** **Adobe Premiere Pro** or **DaVinci Resolve** (free studio-grade alternative).
- **Milestone 2 — Pacing & Narrative:** Rhythm, jump cuts, visual B-roll integration, and audience retention hooks.
- **Milestone 3 — Audio & Sound Design:** Dialogue cleanup, EQ, sound effects (SFX), and subtle background ducking.
- **Milestone 4 — Motion Graphics:** Motion text titles, kinetic typography, lower thirds with **After Effects**.
- **Milestone 5 — Creator Retainers:** Package monthly short-form bundles (e.g., 15 Reels/month for $500–$1,500/client).
- **Earning Potential:** $42,000–$75,000 USD / ₹4L–₹10L INR or $2,000–$5,000/month in creator retainers.

👉 *Check out the complete breakdown on the [Video Editor Roadmap](careers/video-editor.html).*`;
    }

    // 10. Salaries / High Paying / Best Paying Careers
    if (clean.includes('salary') || clean.includes('salaries') || clean.includes('pay') || clean.includes('income') || clean.includes('highest') || clean.includes('earn') || clean.includes('paisa') || clean.includes('package') || clean.includes('money')) {
        return `### 💰 Tech Career Salary & Earning Breakdown (2026)

Here is a realistic comparison of entry-level to mid-level earning potentials across digital roles:

| Career Pathway | Entry Level (US / Global) | Entry Level (India / APAC) | Remote / Freelance Rate |
| :--- | :--- | :--- | :--- |
| **Cloud Engineer** | $65,000 – $105,000 | ₹7,00,000 – ₹18,00,000 | $45 – $100 / hr |
| **Cybersecurity** | $60,000 – $95,000 | ₹6,50,000 – ₹16,00,000 | $40 – $90 / hr |
| **Data Analyst** | $55,000 – $85,000 | ₹6,00,000 – ₹14,00,000 | $35 – $75 / hr |
| **Web Developer** | $50,000 – $85,000 | ₹5,00,000 – ₹12,00,000 | $30 – $75 / hr |
| **Mobile Developer**| $52,000 – $88,000 | ₹5,50,000 – ₹14,00,000 | $35 – $80 / hr |
| **UI/UX Designer** | $48,000 – $78,000 | ₹4,50,000 – ₹11,00,000 | $30 – $70 / hr |
| **Video Editor** | $42,000 – $75,000 | ₹4,00,000 – ₹10,00,000 | $25 – $65 / hr |
| **Graphic Designer**| $40,000 – $65,000 | ₹3,50,000 – ₹8,00,000 | $20 – $50 / hr |

#### 💡 Navi's Insider Tip:
- If your goal is **fastest monetization within 60 days**: Pick **Video Editing** or **UI/UX Design**.
- If your goal is **highest long-term starting salary**: Pick **Cloud Engineering** or **Data Analysis**.`;
    }

    // 11. Zero Coding / Non-Tech / Beginners
    if (clean.includes('zero') || clean.includes('no experience') || clean.includes('non tech') || clean.includes('no coding') || clean.includes('without coding') || clean.includes('beginner') || clean.includes('arts') || clean.includes('commerce') || clean.includes('switch')) {
        return `### 🚀 How to Break Into Tech With Zero Coding Experience

You **do not need a computer science degree or coding background** to build a lucrative career in tech.

#### Top 3 Zero-Code Pathways:
1. **🎨 UI/UX Design:** Focuses on user psychology, app layouts, and Figma prototyping. High demand, creative, zero programming syntax.
2. **🎬 Video Editing & Creator Media:** High demand from YouTubers, SaaS brands, and agencies. Master DaVinci Resolve or Premiere Pro.
3. **🖌️ Graphic Design:** Brand identity, logos, and advertising graphics with Photoshop & Illustrator.

#### If You Still Want to Learn Tech/Code:
- **Web Development** is by far the friendliest coding discipline to start from scratch because you get instant visual feedback in your browser (HTML/CSS).
- **Data Analysis** requires only straightforward English-like query syntax (**SQL**) and spreadsheets (**Excel**).

👉 *Need guidance for a specific career switch? Ask me about any of these roles!*`;
    }

    // 12. Freelancing & Finding Clients
    if (clean.includes('freelance') || clean.includes('upwork') || clean.includes('fiverr') || clean.includes('client') || clean.includes('side income') || clean.includes('earn online')) {
        return `### 💼 The 5-Step Playbook to Land Your First 3 Freelance Clients

Landing your first paid client is a predictable process if you follow this sequence:

1. **Build 3 Proof-of-Work Samples First:** Don't pitch clients empty-handed. Create 3 realistic sample projects (e.g. redesign a real local restaurant's website, or edit a dynamic 60s sample reel).
2. **Target a Specific Niche:** Don't say *"I am a general web designer"*. Say *"I build high-converting booking websites for dental clinics and physiotherapists"*.
3. **The Upwork / Freelance Strategy:**
   - Filter jobs by *Payment Verified* and *Client Spend > $1,000*.
   - In your proposal, answer the client's problem in the **first 2 lines**. Never paste generic copy-paste templates.
   - Attach a 60-second personalized Loom video reviewing their problem.
4. **Offer a Low-Risk Starter Package:** For your first 2 clients, offer an introductory rate in exchange for a glowing 5-star testimonial.
5. **Ask for Referrals:** After every successful project, ask: *"Who else in your network needs similar results?"*`;
    }

    // 13. Resume & ATS Optimization
    if (clean.includes('resume') || clean.includes('cv') || clean.includes('ats') || clean.includes('interview') || clean.includes('job application')) {
        return `### 📄 ATS Resume Optimization & Interview Secrets

Over 75% of resumes are filtered out by Applicant Tracking Systems (ATS) before a recruiter ever reads them.

#### 5 Rules for a 90+ ATS Score:
1. **Clean Single-Column Layout:** Avoid multi-column graphics, text boxes, tables, or image photos. ATS parsers read sequentially from top to bottom.
2. **Use Standard Section Headers:** Use \`Summary\`, \`Experience\`, \`Education\`, \`Skills\`, and \`Projects\`.
3. **The Google XYZ Formula:** Write bullets like: *"Accomplished [X] as measured by [Y], by doing [Z]"* (e.g. *"Reduced page load latency by 35% by implementing Redis caching and query indexing"*).
4. **Match Job Description Keywords:** Include exact phrases mentioned in the job post (e.g., \`React\`, \`Node.js\`, \`REST API\`, \`CI/CD\`).
5. **Power Action Verbs:** Start every bullet with words like *Architected, Engineered, Optimized, Streamlined, Spearheaded*.

👉 *Audit your resume right now for free on our [ATS Resume Analyzer](resume-analyzer.html) or build one using our [AI Resume Builder](resume-builder.html).*`;
    }

    // 14. College Degree vs Self-Taught
    if (clean.includes('degree') || clean.includes('college') || clean.includes('btech') || clean.includes('without degree') || clean.includes('self taught') || clean.includes('bootcamp')) {
        return `### 🎓 Do You Need a Degree to Get Hired in Tech?

**The short answer: No, 100% not required for 85%+ of modern digital roles.**

#### What Tech Hiring Managers Actually Value:
1. **Proof of Work:** A live GitHub link, deployed Vercel demo, or Figma prototype speaks 10x louder than a diploma.
2. **Clear Communication:** Explaining *why* you chose a specific architecture or design decision.
3. **Problem Solving:** Being able to debug issues and learn modern documentation independently.

A degree can help pass conservative corporate HR filters at legacy banks, but modern tech startups, digital agencies, remote companies, and freelance clients care strictly about: **Can you build what we need?**`;
    }

    // 15. Default Fallback with structured choices
    return `### 🧭 Career Navigator Recommendation

I'm here to give you tailored guidance. Which of these five main career directions sounds closest to your personality?

- 💻 **Software & Engineering:** [Web Development](careers/web-developer.html) or [Mobile Apps](careers/mobile-dev.html) *(If you enjoy building logic and applications)*
- 📊 **Data & Strategy:** [Data Analytics](careers/data-analyst.html) *(If you like numbers, spreadsheets, and uncovering business insights)*
- 🎨 **Creative & Visual:** [UI/UX Design](careers/ui-ux-designer.html), [Graphic Design](careers/graphic-designer.html), or [Video Editing](careers/video-editor.html) *(If you prefer visual creation without coding)*
- ☁️ **Infrastructure & Scale:** [Cloud Engineering](careers/cloud-engineer.html) *(If you like Linux, enterprise networks, and cloud architecture)*
- 🛡️ **Defense & Security:** [Cybersecurity](careers/cybersecurity.html) *(If you want to protect systems and hunt vulnerabilities)*

💬 **Just reply with your goal** (e.g., *"I want to earn $1,000/month freelancing"*, or *"I want to switch from marketing to tech"*), and I'll lay out your step-by-step game plan!`;
}

/**
 * Main dispatch function for AI Career Assistant
 */
export async function getNaviAIResponse(message, history = []) {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openAIKey = process.env.OPENAI_API_KEY?.trim();

    // 1. Try Gemini if configured
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
        try {
            return await callGemini(geminiKey, message, history);
        } catch (err) {
            console.warn('[AI Service] Gemini call failed, attempting fallback:', err.message);
        }
    }

    // 2. Try OpenAI if configured
    if (openAIKey && openAIKey !== 'your_openai_api_key_here') {
        try {
            return await callOpenAI(openAIKey, message, history);
        } catch (err) {
            console.warn('[AI Service] OpenAI call failed:', err.message);
        }
    }

    // 3. Fallback to resilient built-in knowledge engine
    return getIntelligentFallback(message);
}

/**
 * AI-assisted Professional Summary Generator (Phase 2C)
 * Strictly strictly respects user-provided details without fabricating experience.
 */
export async function generateProfessionalSummary({ fullName, role, skills, experienceYears, rawSummary }) {
    const prompt = `Write a high-impact, 3-to-4 sentence professional resume summary for:
- Candidate: ${fullName || 'Professional'}
- Target Role: ${role || 'Digital Specialist'}
- Key Skills: ${skills || 'Technical skills'}
- Current Experience Level: ${experienceYears || 'Early Career / Professional'}
- Existing Notes/Draft: "${rawSummary || ''}"

CRITICAL RULE: Do NOT invent fake qualifications, degrees, or imaginary employer names. Only polish, articulate, and present the user's stated skills with strong industry keywords and confident, concise phrasing.`;

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
        try {
            return await callGemini(geminiKey, prompt);
        } catch (e) {
            console.warn('Gemini summary call fallback:', e.message);
        }
    }

    // High quality deterministic fallback
    return `Results-driven ${role || 'professional'} with hands-on expertise in ${skills || 'core technologies'}. Dedicated to building high-quality, scalable solutions and collaborating across teams to solve complex problems. Proven ability to learn rapidly, implement industry best practices, and deliver measurable outcomes.`;
}

/**
 * AI-assisted Resume Bullet Point Enhancer (Phase 2C)
 * Rewrites user draft bullets into action-driven statements without inventing fake metrics.
 */
export async function enhanceBulletPoints({ role, rawBullets }) {
    const prompt = `Improve and strengthen these resume bullet points for a ${role || 'professional'}:
Draft bullets:
${rawBullets}

Instructions:
1. Start each bullet point with a dynamic past-tense action verb (e.g., Architected, Engineered, Streamlined, Automated).
2. Improve clarity, impact, and professional tone.
3. Keep the candidate's actual responsibilities truthful; do not invent imaginary achievements or fake awards.
4. Return 3-4 polished, concise bullet points separated by newlines, formatted with standard hyphens (-).`;

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
        try {
            return await callGemini(geminiKey, prompt);
        } catch (e) {
            console.warn('Gemini bullets call fallback:', e.message);
        }
    }

    // High quality deterministic fallback
    const lines = (rawBullets || '').split('\n').filter(l => l.trim().length > 5);
    if (!lines.length) {
        return `- Developed and deployed modern features aligning with client specifications and project milestones.\n- Collaborated with cross-functional teams to diagnose issues, refactor legacy code, and improve system performance.\n- Implemented best practices in version control and documentation, streamlining onboarding for team members.`;
    }
    return lines.map(line => {
        const cleaned = line.replace(/^[•\-\*\s]+/, '').trim();
        return `- Successfully executed ${cleaned.toLowerCase()}, ensuring adherence to quality standards and team objectives.`;
    }).join('\n');
}
