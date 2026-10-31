/**
 * ============================================================================
 * CAREER NAVIGATOR 2.0 — ATS RESUME ANALYZER SERVICE
 * In-memory document parsing (PDF & DOCX), transparent scoring, keyword audit,
 * and actionable ATS improvement recommendations.
 * ============================================================================
 */

import pdf from 'pdf-parse';
import mammoth from 'mammoth';

const ACTION_VERBS = [
    'achieved', 'analyzed', 'architected', 'automated', 'built', 'created', 'decreased',
    'delivered', 'deployed', 'designed', 'developed', 'engineered', 'enhanced', 'established',
    'executed', 'expanded', 'generated', 'implemented', 'improved', 'increased', 'initiated',
    'launched', 'led', 'managed', 'maximized', 'migrated', 'optimized', 'orchestrated',
    'produced', 'reduced', 'resolved', 'restructured', 'scaled', 'simplified', 'spearheaded',
    'streamlined', 'transformed', 'upgraded'
];

const COMMON_TECH_KEYWORDS = [
    'html', 'css', 'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'express',
    'python', 'django', 'fastapi', 'sql', 'postgres', 'mysql', 'mongodb', 'git', 'github',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'linux', 'ci/cd', 'rest api', 'graphql',
    'figma', 'tableau', 'power bi', 'excel', 'agile', 'scrum', 'testing', 'jest', 'cypress',
    'devops', 'cybersecurity', 'network', 'machine learning', 'data analysis'
];

/**
 * Extracts plain text from buffer based on mimetype
 */
export async function extractTextFromBuffer(buffer, mimetype, originalname = '') {
    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
        const data = await pdf(buffer);
        return data.text || '';
    } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword' ||
        originalname.endsWith('.docx')
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
    } else if (mimetype === 'text/plain') {
        return buffer.toString('utf-8');
    }
    throw new Error('Unsupported file format. Please upload a PDF (.pdf) or Word document (.docx).');
}

/**
 * Core ATS Algorithm Analyzer
 */
export function analyzeResumeText(rawText, jobDescription = '') {
    const text = (rawText || '').trim();
    if (text.length < 50) {
        throw new Error('Extracted text is too short to perform an ATS analysis. Please verify your document contents.');
    }

    const lowerText = text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. Contact Information Detection
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
    const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
    const hasLinkedIn = /linkedin\.com\/in\/|linkedin\.com/i.test(text);
    const hasGitHub = /github\.com/i.test(text);
    const hasPortfolio = /portfolio|website|github\.io/i.test(text);

    // 2. Section Detection
    const sections = {
        summary: /summary|profile|about me|objective/i.test(text),
        experience: /experience|work history|employment|professional background/i.test(text),
        education: /education|academic|university|degree|bachelor|master|diploma/i.test(text),
        skills: /skills|technologies|proficiencies|competencies|tech stack/i.test(text),
        projects: /projects|portfolio projects|personal projects/i.test(text),
        certifications: /certifications?|licenses?|credentials/i.test(text)
    };

    // 3. Action Verbs & Metrics Count
    let actionVerbsFound = [];
    ACTION_VERBS.forEach(verb => {
        const regex = new RegExp(`\\b${verb}\\b`, 'i');
        if (regex.test(lowerText)) actionVerbsFound.push(verb);
    });

    const metricsMatches = text.match(/\b\d+([.,]\d+)?%|\$\s?\d+([.,]\d+)?[kKmM]?|\b\d{1,3}(,\d{3})+\b|\b(increased|reduced|boosted|saved|grew)\s+by\s+\d+/gi) || [];
    const metricsCount = metricsMatches.length;

    // 4. Keyword Audit
    const detectedKeywords = COMMON_TECH_KEYWORDS.filter(kw => {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(lowerText);
    });

    // 5. Job Description Keyword Matching (if provided)
    let jdAnalysis = null;
    if (jobDescription && jobDescription.trim().length > 30) {
        const jdLower = jobDescription.toLowerCase();
        const jdKeywords = COMMON_TECH_KEYWORDS.filter(kw => jdLower.includes(kw));
        const matched = jdKeywords.filter(kw => detectedKeywords.includes(kw));
        const missing = jdKeywords.filter(kw => !detectedKeywords.includes(kw));
        const matchPercentage = jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 100;

        jdAnalysis = {
            targetKeywordsIdentified: jdKeywords,
            matchedKeywords: matched,
            missingKeywords: missing,
            matchPercentage: matchPercentage
        };
    }

    // 6. Score Calculation (Transparent 100-Point Formula)
    // Section Completeness: 25 pts max
    let sectionScore = 0;
    if (hasEmail) sectionScore += 4;
    if (hasPhone) sectionScore += 3;
    if (hasLinkedIn || hasGitHub || hasPortfolio) sectionScore += 3;
    if (sections.experience) sectionScore += 5;
    if (sections.skills) sectionScore += 4;
    if (sections.education) sectionScore += 3;
    if (sections.projects || sections.certifications) sectionScore += 3;

    // Content & Quantifiable Impact: 25 pts max
    let impactScore = 0;
    const actionVerbBonus = Math.min(actionVerbsFound.length * 2, 12); // up to 12 pts
    const metricsBonus = Math.min(metricsCount * 3, 13);               // up to 13 pts
    impactScore = actionVerbBonus + metricsBonus;

    // Formatting & Length: 25 pts max
    let formattingScore = 0;
    if (wordCount >= 350 && wordCount <= 1000) formattingScore += 12; // Ideal 1-2 page length
    else if (wordCount >= 200 && wordCount <= 1400) formattingScore += 8;
    else formattingScore += 4;

    const bulletCount = (text.match(/^[•\-\*]\s|(\n\s*[•\-\*])/g) || []).length;
    if (bulletCount >= 6) formattingScore += 8;
    else if (bulletCount >= 3) formattingScore += 4;
    else formattingScore += 2;

    if (sections.summary) formattingScore += 5;

    // Skills & Relevance: 25 pts max
    let skillsScore = 0;
    if (jdAnalysis) {
        skillsScore = Math.round((jdAnalysis.matchPercentage / 100) * 25);
    } else {
        skillsScore = Math.min(detectedKeywords.length * 2.5, 25);
    }

    const overallScore = Math.min(Math.round(sectionScore + impactScore + formattingScore + skillsScore), 100);

    // 7. Structured Recommendations
    const recommendations = [];

    if (!hasEmail || !hasPhone) {
        recommendations.push({
            type: 'critical',
            title: 'Add Clear Contact Headers',
            message: 'Ensure your primary email and phone number are formatted simply at the top of your resume without complex tables or images.'
        });
    }

    if (!hasLinkedIn && !hasGitHub && !hasPortfolio) {
        recommendations.push({
            type: 'medium',
            title: 'Add Online Professional Profiles',
            message: 'Include a clean link to your LinkedIn profile, GitHub profile, or online portfolio so recruiters can easily review your work.'
        });
    }

    if (metricsCount < 3) {
        recommendations.push({
            type: 'high',
            title: 'Quantify Your Achievements with Numbers',
            message: `Found only ${metricsCount} quantified metric(s). Replace passive tasks with measurable results (e.g., "Optimized queries, reducing API latency by 42%" instead of "Worked on backend queries").`
        });
    }

    if (actionVerbsFound.length < 5) {
        recommendations.push({
            type: 'high',
            title: 'Start Bullet Points with Dynamic Action Verbs',
            message: 'Begin each experience bullet point with strong action verbs like "Architected", "Engineered", "Automated", or "Spearheaded".'
        });
    }

    if (wordCount < 350) {
        recommendations.push({
            type: 'medium',
            title: 'Flesh Out Project & Experience Details',
            message: `Your resume is ${wordCount} words, which may appear thin to hiring systems. Aim for 450–800 words detailing responsibilities, technologies, and problem-solving outcomes.`
        });
    } else if (wordCount > 1100) {
        recommendations.push({
            type: 'medium',
            title: 'Condense into Concise Bullet Points',
            message: `Your resume is ${wordCount} words. For candidates with less than 7 years of experience, aim to keep it under 800 words to ensure rapid readability.`
        });
    }

    if (jdAnalysis && jdAnalysis.missingKeywords.length > 0) {
        recommendations.push({
            type: 'high',
            title: 'Incorporate Missing Job Description Keywords',
            message: `The target job description emphasizes: ${jdAnalysis.missingKeywords.slice(0, 6).join(', ')}. Naturally weave these tools or skills into your project bullets where truthful.`
        });
    }

    return {
        overallScore,
        scoringBreakdown: {
            sectionCompleteness: { score: sectionScore, max: 25 },
            quantifiableImpact: { score: impactScore, max: 25 },
            formattingAndLength: { score: formattingScore, max: 25 },
            skillsAndKeywords: { score: Math.round(skillsScore), max: 25 }
        },
        documentStats: {
            wordCount,
            bulletPointsFound: bulletCount,
            actionVerbsCount: actionVerbsFound.length,
            actionVerbs: actionVerbsFound.slice(0, 10),
            metricsIdentified: metricsMatches.slice(0, 8)
        },
        sectionsDetected: sections,
        contactInfoDetected: {
            email: hasEmail,
            phone: hasPhone,
            linkedIn: hasLinkedIn,
            gitHub: hasGitHub,
            portfolio: hasPortfolio
        },
        detectedKeywords,
        jobDescriptionMatch: jdAnalysis,
        recommendations,
        disclaimer: "Transparent ATS Compatibility Estimate: This score is calculated via automated algorithmic parsing against industry best practices. It does not represent an official score from any employer's proprietary ATS (such as Workday, Taleo, or Greenhouse)."
    };
}
