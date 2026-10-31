/**
 * ============================================================================
 * CAREER NAVIGATOR 2.0 — SECURE EXPRESS BACKEND
 * Serves static frontend and handles secure AI chat, resume analysis & building.
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { 
    checkRateLimit, 
    getNaviAIResponse, 
    generateProfessionalSummary, 
    enhanceBulletPoints 
} from './services/aiService.js';
import { extractTextFromBuffer, analyzeResumeText } from './services/atsService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory file upload configuration (5MB limit, 0 files stored on disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Trust proxy for IP rate limiting if behind Vercel/reverse proxy
app.set('trust proxy', 1);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        platform: 'Career Navigator 2.0',
        aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
        timestamp: new Date().toISOString()
    });
});

/**
 * --------------------------------------------------------------------------
 * PHASE 2A: GENUINE NAVI AI CHAT ENDPOINT
 * --------------------------------------------------------------------------
 */
app.post('/api/chat', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';

        // 1. Rate Limiting Check
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({
                error: 'Rate limit reached (max 15 requests per minute). Please wait 30 seconds before asking your next question.'
            });
        }

        const { message, history } = req.body;

        // 2. Input Validation
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message text is required.' });
        }

        if (message.length > 1500) {
            return res.status(400).json({ error: 'Message exceeds 1,500 character limit to preserve resources.' });
        }

        const validatedHistory = Array.isArray(history) ? history.slice(-8) : [];

        // 3. Generate Real AI Response
        const reply = await getNaviAIResponse(message.trim(), validatedHistory);

        return res.json({
            reply: reply,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[/api/chat error]:', error);
        return res.status(500).json({
            error: 'Navi encountered an unexpected issue. Please try again in a moment.'
        });
    }
});

/**
 * --------------------------------------------------------------------------
 * PHASE 2B: ATS RESUME ANALYZER ENDPOINT
 * In-memory document extraction (PDF/DOCX) & 100-point compatibility audit
 * --------------------------------------------------------------------------
 */
app.post('/api/analyze-resume', upload.single('resumeFile'), async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';

        // Rate limiting check
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({
                error: 'Analysis rate limit reached. Please wait a minute before analyzing another document.'
            });
        }

        let resumeText = '';
        const jobDescription = req.body?.jobDescription || '';

        // Extract from uploaded file or raw text input
        if (req.file) {
            resumeText = await extractTextFromBuffer(
                req.file.buffer,
                req.file.mimetype,
                req.file.originalname
            );
        } else if (req.body?.resumeText) {
            resumeText = String(req.body.resumeText);
        } else {
            return res.status(400).json({
                error: 'Please upload a PDF / Word document or paste your resume text to begin analysis.'
            });
        }

        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({
                error: 'Could not extract sufficient text from the provided document. Please ensure the document is not an image scan or password protected.'
            });
        }

        // Run algorithmic ATS evaluation
        const analysis = analyzeResumeText(resumeText, jobDescription);

        return res.json({
            success: true,
            analysis,
            analyzedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('[/api/analyze-resume error]:', error);
        return res.status(500).json({
            error: error.message || 'Failed to analyze resume. Please verify the document format.'
        });
    }
});

/**
 * --------------------------------------------------------------------------
 * PHASE 2C: AI RESUME BUILDER ENDPOINTS
 * Professional summary polishing & dynamic bullet point enhancement
 * --------------------------------------------------------------------------
 */
app.post('/api/resume/enhance-summary', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({ error: 'Rate limit reached. Please wait a moment.' });
        }

        const { fullName, role, skills, experienceYears, rawSummary } = req.body || {};
        const summary = await generateProfessionalSummary({
            fullName,
            role,
            skills,
            experienceYears,
            rawSummary
        });

        return res.json({ success: true, summary });
    } catch (err) {
        console.error('[/api/resume/enhance-summary error]:', err);
        return res.status(500).json({ error: 'Failed to enhance summary.' });
    }
});

app.post('/api/resume/enhance-bullets', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({ error: 'Rate limit reached. Please wait a moment.' });
        }

        const { role, rawBullets } = req.body || {};
        const bullets = await enhanceBulletPoints({ role, rawBullets });

        return res.json({ success: true, bullets });
    } catch (err) {
        console.error('[/api/resume/enhance-bullets error]:', err);
        return res.status(500).json({ error: 'Failed to enhance bullets.' });
    }
});

// Serve all static assets from the current directory
app.use(express.static(__dirname));

// Clean URL rewrites for standard pages
app.get('/career-ai', (req, res) => res.sendFile(path.join(__dirname, 'career-ai.html')));
app.get('/resume-analyzer', (req, res) => res.sendFile(path.join(__dirname, 'resume-analyzer.html')));
app.get('/resume-builder', (req, res) => res.sendFile(path.join(__dirname, 'resume-builder.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/request-career', (req, res) => res.sendFile(path.join(__dirname, 'request-career.html')));

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
});

// Start listening if run directly (not serverless)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Career Navigator 2.0 Server Live on port ${PORT}`);
        console.log(`📡 Local URL: http://localhost:${PORT}`);
        console.log(`🤖 AI Status: ${process.env.GEMINI_API_KEY ? 'Gemini Key Configured' : 'Running on Resilient Knowledge Engine'}`);
        console.log(`====================================================`);
    });
}

export default app;
