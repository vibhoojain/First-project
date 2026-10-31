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
 * Intelligent rule-based career guidance fallback
 * Used when no API key is yet configured in .env or during temporary network outages
 */
function getIntelligentFallback(query) {
    const q = (query || '').toLowerCase();

    if (q.includes('web dev') || q.includes('frontend') || q.includes('fullstack') || q.includes('html') || q.includes('javascript') || q.includes('react')) {
        return `### Web Development Roadmap & Advice

To break into Web Development in 2026:

1. **Foundations (Month 1-2):**
   - Semantic **HTML5** & modern **CSS3** (Flexbox, CSS Grid, Responsive Design).
   - Core **JavaScript (ES6+)**: Array methods, DOM manipulation, Async/Await, and Fetch API.
2. **Framework & Version Control (Month 3-4):**
   - Version control with **Git & GitHub**.
   - Learn a modern framework like **React** or **Next.js**.
3. **Portfolio Projects (Month 5):**
   - Build a real CRUD dashboard with API integration.
   - Build an e-commerce or booking web application.
   - Deploy projects live to **Vercel** or **GitHub Pages**.
4. **Monetization & Earning:**
   - **Freelancing:** Small business websites on Upwork/Fiverr ($250–$1,000 per site).
   - **Full-time:** Junior Frontend or Software Engineer roles ($50k–$85k USD / ₹5L–₹12L INR).

*Explore our full interactive guide in the [Web Developer Roadmap](careers/web-developer.html).*`;
    }

    if (q.includes('data') || q.includes('analyst') || q.includes('sql') || q.includes('excel') || q.includes('power bi')) {
        return `### Data Analyst Career Pathway

Data Analysts turn raw numbers into high-value business strategy:

1. **Spreadsheets:** Master Advanced Excel (XLOOKUP, Pivot Tables, Power Query).
2. **Databases:** Master **SQL** (Joins, Window Functions, Aggregate Queries).
3. **Visualization:** Learn **Tableau** or **Power BI** to craft executive dashboards.
4. **Programming (Optional for starters):** Python with Pandas and Matplotlib.
5. **Portfolio:** Download datasets from Kaggle and publish 3 case studies explaining *what business problems you solved*.

*Check our complete guide on the [Data Analyst Roadmap](careers/data-analyst.html).*`;
    }

    if (q.includes('cloud') || q.includes('aws') || q.includes('devops') || q.includes('azure')) {
        return `### Cloud Engineering & DevOps Strategy

Cloud Engineering is among the highest-paid technical tracks:

1. **System Administration:** Master Linux command line, permissions, and bash scripting.
2. **Networking:** Understand IP addressing, DNS, subnets, and firewalls.
3. **Cloud Provider:** Master **AWS** (EC2, S3, IAM, VPC) or **Azure**.
4. **Certification:** Aim for **AWS Certified Solutions Architect Associate**.
5. **Infrastructure as Code (IaC):** Learn **Docker** and **Terraform**.

*Read the step-by-step [Cloud Engineer Roadmap](careers/cloud-engineer.html).*`;
    }

    if (q.includes('ui') || q.includes('ux') || q.includes('figma') || q.includes('design')) {
        return `### UI/UX Design Learning Path

UI/UX combines psychological research with visual problem solving:

1. **UX Foundations:** User flows, wireframing, heuristic evaluations, and user testing.
2. **Visual Hierarchy:** Typography scales, 8pt grid systems, color theory, and WCAG accessibility.
3. **Figma Mastery:** Auto-layout, component variants, and interactive prototyping.
4. **Case Studies:** Create 3 detailed case presentations on Behance documenting the research and design iteration.

*Visit the full [UI/UX Designer Roadmap](careers/ui-ux-designer.html).*`;
    }

    return `### Career Guidance from Navi

Choosing the right digital career depends on aligning your natural strengths with high-demand market skills:

- **If you enjoy logic and creating:** Explore **Web Development** or **Mobile App Development**.
- **If you love numbers and patterns:** Explore **Data Analysis** or **Cloud Engineering**.
- **If you have a creative and visual eye:** Explore **UI/UX Design**, **Graphic Design**, or **Video Editing**.
- **If you value security and defense:** Explore **Cybersecurity**.

**Next Step:** Tell me your current experience level, favorite hobbies, or whether you want to pursue freelancing vs full-time employment, and I will create a personalized recommendation for you!

*(Note: Add your free \`GEMINI_API_KEY\` to your \`.env\` file for full real-time generative responses.)*`;
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
