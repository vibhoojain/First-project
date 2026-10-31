async function runTests() {
    console.log('🧪 Running Career Navigator 2.0 Lean Launch Test Suite...\n');
    let passed = 0;
    let total = 0;

    async function test(name, fn) {
        total++;
        try {
            await fn();
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ [FAIL] ${name}:`, err.message);
        }
    }

    // 1. Health check
    await test('Server Health Check (/api/health)', async () => {
        const res = await fetch('http://localhost:5000/api/health');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== 'online') throw new Error(`Unexpected status: ${data.status}`);
    });

    // 2. Chat API
    await test('Navi AI Chat Assistant (/api/chat)', async () => {
        const res = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'How do I start learning web development?' })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.reply || typeof data.reply !== 'string' || data.reply.length < 20) {
            throw new Error('Invalid or empty reply');
        }
    });

    // 3. Resume text analysis & ATS scoring
    await test('ATS Resume Analyzer Scoring (/api/analyze-resume)', async () => {
        const res = await fetch('http://localhost:5000/api/analyze-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resumeText: 'SUMMARY: Professional Software Engineer with 4 years building React, Node.js, and SQL applications. Reduced query latency by 45% and improved app load time by 30%. EDUCATION: B.S. in Computer Science. SKILLS: JavaScript, React, Node.js, Express, PostgreSQL, Git, Docker, REST APIs.',
                jobDescription: 'Seeking React and Node.js developer experienced in SQL and performance optimization.'
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const analysis = data.analysis;
        if (!analysis || typeof analysis.overallScore !== 'number' || analysis.overallScore < 50) {
            throw new Error(`Unexpected score: ${analysis ? analysis.overallScore : undefined}`);
        }
        if (!analysis.scoringBreakdown || !analysis.recommendations) throw new Error('Missing breakdown or recommendations');
        if (!analysis.disclaimer) throw new Error('Missing required ATS estimate disclaimer');
    });

    // 4. AI Resume Summary Enhancer
    await test('AI Resume Summary Enhancer (/api/resume/enhance-summary)', async () => {
        const res = await fetch('http://localhost:5000/api/resume/enhance-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'Data Analyst',
                years: '2',
                skills: 'SQL, Python, Power BI, Excel',
                background: 'Analyzed sales data and built interactive executive dashboards'
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success || !data.summary || data.summary.length < 30) {
            throw new Error('Invalid enhanced summary response');
        }
    });

    // 5. AI Resume Bullet Enhancer
    await test('AI Resume Bullet Enhancer (/api/resume/enhance-bullets)', async () => {
        const res = await fetch('http://localhost:5000/api/resume/enhance-bullets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'Web Developer',
                rawBullets: 'Made web pages faster\nFixed customer checkout bugs\nAdded dark mode'
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success || typeof data.bullets !== 'string' || data.bullets.length < 20) {
            throw new Error('Invalid enhanced bullets response');
        }
    });

    // 6. Sliding Window Rate Limiting (15 req/min IP protection)
    await test('Sliding Window Rate Limiting (15 req/min IP protection)', async () => {
        const rapidRequests = [];
        for (let i = 0; i < 18; i++) {
            rapidRequests.push(
                fetch('http://localhost:5000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Ping' })
                })
            );
        }
        const responses = await Promise.all(rapidRequests);
        const hasRateLimited = responses.some(r => r.status === 429);
        if (!hasRateLimited) throw new Error('Expected 429 Too Many Requests was not triggered');
    });

    // 7. Core Frontend Static Pages
    const pages = [
        '/',
        '/career-ai',
        '/resume-analyzer',
        '/resume-builder',
        '/about',
        '/contact',
        '/request-career',
        '/careers/web-developer.html',
        '/careers/data-analyst.html',
        '/careers/ui-ux-designer.html',
        '/careers/cloud-engineer.html',
        '/careers/cybersecurity.html',
        '/careers/mobile-dev.html',
        '/careers/graphic-designer.html',
        '/careers/video-editor.html'
    ];

    for (const p of pages) {
        await test(`Page Route Accessible (${p})`, async () => {
            const res = await fetch(`http://localhost:5000${p}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            if (text.length < 500) throw new Error(`Page content suspiciously short (${text.length} chars)`);
        });
    }

    console.log(`\n========================================`);
    console.log(`🏁 Test Summary: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
    console.log(`========================================\n`);

    if (passed !== total) process.exit(1);
}

runTests();
