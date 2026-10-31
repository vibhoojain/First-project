/**
 * ============================================================================
 * CAREER NAVIGATOR 2.0 - CORE SCRIPT
 * Handles Theme Toggling, Mobile Navigation, Search & Filters,
 * Interactive Navi AI Preview, Roadmap Progress Tracker, and Auth Notices.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initThemeManager();
    initMobileNav();
    initSmoothScroll();
    initAuthNoticeModal();
    initCareerSearchAndFilter();
    initNaviPreviewInteraction();
    initRoadmapProgressTracker();
    initCareerComparison();
});

/* ----------------------------------------------------------------------------
   1. Theme Manager (Dark & Light Mode with localStorage)
   ---------------------------------------------------------------------------- */
function initThemeManager() {
    const savedTheme = localStorage.getItem('cn_theme');
    // Default to dark mode for the premium SaaS look unless light is saved
    const preferredTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    
    applyTheme(preferredTheme);

    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            localStorage.setItem('cn_theme', nextTheme);
        });
    });

    // Listen for OS theme changes if user hasn't explicitly set a preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('cn_theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fa-solid fa-sun';
                btn.setAttribute('aria-label', 'Switch to light mode');
                btn.setAttribute('title', 'Switch to light mode');
            } else {
                icon.className = 'fa-solid fa-moon';
                btn.setAttribute('aria-label', 'Switch to dark mode');
                btn.setAttribute('title', 'Switch to dark mode');
            }
        }
    });
}

/* ----------------------------------------------------------------------------
   2. Mobile Navigation Toggle with Animation
   ---------------------------------------------------------------------------- */
function initMobileNav() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');

    if (!mobileMenuBtn || !navLinks) return;

    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navLinks.classList.toggle('active');
        mobileMenuBtn.setAttribute('aria-expanded', isOpen);

        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            if (isOpen) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }
    });

    // Close when clicking anywhere outside the menu
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            closeMobileNav(mobileMenuBtn, navLinks);
        }
    });

    // Close when Esc is pressed
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMobileNav(mobileMenuBtn, navLinks);
        }
    });
}

function closeMobileNav(mobileMenuBtn, navLinks) {
    if (!navLinks || !navLinks.classList.contains('active')) return;
    navLinks.classList.remove('active');
    if (mobileMenuBtn) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    }
}

/* ----------------------------------------------------------------------------
   3. Smooth Scroll for Anchor Links (Safe & Bug-Free)
   ---------------------------------------------------------------------------- */
function initSmoothScroll() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') return; // Don't crash on empty anchor

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth'
                });
                closeMobileNav(mobileMenuBtn, navLinks);
            }
        });
    });
}

/* ----------------------------------------------------------------------------
   4. Auth Notice Modal (Transparent Phase 1 Placeholder)
   ---------------------------------------------------------------------------- */
function initAuthNoticeModal() {
    const triggers = document.querySelectorAll('.auth-trigger');
    const modalBackdrop = document.getElementById('auth-modal-backdrop');
    if (!triggers.length || !modalBackdrop) return;

    const closeBtn = document.getElementById('modal-close-btn');
    const exploreBtn = document.getElementById('modal-explore-btn');

    const openModal = (e) => {
        e.preventDefault();
        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        modalBackdrop.classList.remove('active');
        document.body.style.overflow = '';
    };

    triggers.forEach(trigger => trigger.addEventListener('click', openModal));

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (exploreBtn) exploreBtn.addEventListener('click', closeModal);

    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
            closeModal();
        }
    });
}

/* ----------------------------------------------------------------------------
   5. Career Search & Category Filtering
   ---------------------------------------------------------------------------- */
function initCareerSearchAndFilter() {
    const searchInput = document.getElementById('career-search');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const careerCards = document.querySelectorAll('.career-card');
    const countBadge = document.getElementById('career-count');
    const emptyState = document.getElementById('career-empty-state');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!careerCards.length) return;

    let currentCategory = 'all';
    let currentQuery = '';

    function filterCards() {
        let visibleCount = 0;

        careerCards.forEach(card => {
            const title = (card.getAttribute('data-title') || '').toLowerCase();
            const category = (card.getAttribute('data-category') || '').toLowerCase();
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();
            const description = (card.getAttribute('data-desc') || '').toLowerCase();

            const matchesCategory = currentCategory === 'all' || category.includes(currentCategory);
            const matchesQuery = !currentQuery || 
                title.includes(currentQuery) || 
                description.includes(currentQuery) || 
                tags.includes(currentQuery);

            if (matchesCategory && matchesQuery) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (countBadge) {
            countBadge.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'career' : 'careers'}`;
        }

        if (emptyState) {
            emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentQuery = e.target.value.trim().toLowerCase();
            filterCards();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-filter') || 'all';
            filterCards();
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            currentQuery = '';
            currentCategory = 'all';
            filterBtns.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
            });
            filterCards();
        });
    }
}

/* ----------------------------------------------------------------------------
   6. Navi AI Preview Interaction on Homepage
   ---------------------------------------------------------------------------- */
function initNaviPreviewInteraction() {
    const promptChips = document.querySelectorAll('.navi-prompt-chip');
    const chatWindow = document.getElementById('navi-preview-chat');

    if (!promptChips.length || !chatWindow) return;

    const previewAnswers = {
        'web-dev': {
            q: 'How do I become a Web Developer from scratch?',
            a: 'Start by mastering HTML5 structure and modern CSS (Flexbox & Grid), then learn JavaScript fundamentals (DOM, async/fetch). Build 3 real projects (like an interactive dashboard or calculator), then master Git and deploy to Vercel or GitHub Pages!'
        },
        'high-income': {
            q: 'Which tech career pays the most for beginners?',
            a: 'Cloud Engineering, Cybersecurity, and Data Analysis currently command the highest entry-level packages ($65k-$95k USD / ₹7L-₹16L INR). Web Development and Video Editing offer the fastest paths to lucrative freelancing contracts!'
        },
        'no-experience': {
            q: 'Can I start with zero coding or technical background?',
            a: 'Yes, absolutely! UI/UX Design, Graphic Design, and Video Editing require creativity and tool mastery rather than coding. If you want to code, Web Development has the most beginner-friendly learning curve.'
        }
    };

    promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-prompt');
            const data = previewAnswers[key];
            if (!data) return;

            // Render simulated message pair in preview
            chatWindow.innerHTML = `
                <div class="navi-msg user">
                    <div class="navi-msg-bubble">${data.q}</div>
                </div>
                <div class="navi-msg ai">
                    <div class="navi-bot-avatar" style="width: 36px; height: 36px; font-size: 1rem; flex-shrink: 0;">
                        <i class="fa-solid fa-robot"></i>
                    </div>
                    <div class="navi-msg-bubble">
                        ${data.a}
                        <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted);">
                            <i class="fa-solid fa-circle-check" style="color: var(--accent-green); margin-right: 4px;"></i>
                            Preview answer based on Career Navigator 2.0 roadmaps.
                        </div>
                    </div>
                </div>
            `;
            chatWindow.scrollTop = chatWindow.scrollHeight;
        });
    });
}

/* ----------------------------------------------------------------------------
   7. Roadmap Progress Tracker (Persistent in localStorage)
   ---------------------------------------------------------------------------- */
function initRoadmapProgressTracker() {
    const progressTrackWrap = document.querySelector('.roadmap-progress-bar-wrap');
    if (!progressTrackWrap) return;

    const careerId = progressTrackWrap.getAttribute('data-career-id');
    if (!careerId) return;

    const checkboxes = document.querySelectorAll('.step-checkbox');
    const progressFill = document.querySelector('.progress-fill');
    const progressPercentText = document.querySelector('.progress-percent');
    const completedCountText = document.querySelector('.progress-completed-count');

    if (!checkboxes.length) return;

    const storageKey = `cn_roadmap_${careerId}`;
    let savedProgress = [];
    try {
        savedProgress = JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (e) {
        savedProgress = [];
    }

    // Apply saved state
    checkboxes.forEach((cb, index) => {
        cb.checked = savedProgress.includes(index);
        updateCardCheckedState(cb);

        cb.addEventListener('change', () => {
            updateCardCheckedState(cb);
            const currentChecked = [];
            checkboxes.forEach((box, i) => {
                if (box.checked) currentChecked.push(i);
            });
            localStorage.setItem(storageKey, JSON.stringify(currentChecked));
            updateProgressBar();

            if (cb.checked) {
                showToast(`Milestone marked as complete! Keep going!`, 'success');
            }
        });
    });

    function updateCardCheckedState(cb) {
        const itemCard = cb.closest('.roadmap-item-card');
        if (itemCard) {
            itemCard.style.borderColor = cb.checked ? 'var(--primary-color)' : 'var(--border-color)';
            itemCard.style.backgroundColor = cb.checked ? 'var(--primary-light)' : 'var(--bg-surface)';
        }
    }

    function updateProgressBar() {
        const total = checkboxes.length;
        const completed = document.querySelectorAll('.step-checkbox:checked').length;
        const percent = Math.round((completed / total) * 100);

        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressPercentText) progressPercentText.textContent = `${percent}%`;
        if (completedCountText) completedCountText.textContent = `${completed} of ${total} milestones completed`;
    }

    updateProgressBar();
}

/* ----------------------------------------------------------------------------
   8. Global Toast Notification System
   ---------------------------------------------------------------------------- */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ----------------------------------------------------------------------------
   9. Career Comparison Matrix Engine (Phase 2E / Explorer)
   ---------------------------------------------------------------------------- */
const CAREER_COMPARE_DATA = {
    'web-developer': {
        name: 'Web Developer',
        category: 'Engineering & Code',
        difficulty: 'Beginner-Friendly',
        duration: '3–6 Months',
        coding: 'Heavy (HTML, CSS, JS, React)',
        salary: '$50,000–$85,000 / ₹5L–₹12L',
        bestFor: 'Builders who enjoy logical problem solving and interactive web applications',
        roadmap: 'careers/web-developer.html'
    },
    'data-analyst': {
        name: 'Data Analyst',
        category: 'Data & AI',
        difficulty: 'Moderate',
        duration: '4–6 Months',
        coding: 'Moderate (SQL, Python, Excel)',
        salary: '$55,000–$85,000 / ₹6L–₹14L',
        bestFor: 'Analytical minds who love uncovering patterns and business insights',
        roadmap: 'careers/data-analyst.html'
    },
    'ui-ux-designer': {
        name: 'UI/UX Designer',
        category: 'Creative & Product',
        difficulty: 'Creative / Zero-Code',
        duration: '2–4 Months',
        coding: 'None Required (Figma, Prototyping)',
        salary: '$48,000–$78,000 / ₹4.5L–₹11L',
        bestFor: 'Empathic designers focused on user psychology and intuitive interfaces',
        roadmap: 'careers/ui-ux-designer.html'
    },
    'cloud-engineer': {
        name: 'Cloud Engineer',
        category: 'Cloud & Infrastructure',
        difficulty: 'Advanced / High Demand',
        duration: '5–8 Months',
        coding: 'Moderate (Linux, Bash, Terraform, AWS)',
        salary: '$65,000–$105,000 / ₹7L–₹18L',
        bestFor: 'Systems thinkers passionate about enterprise infrastructure and DevOps',
        roadmap: 'careers/cloud-engineer.html'
    },
    'cybersecurity': {
        name: 'Cybersecurity Analyst',
        category: 'Security & Defense',
        difficulty: 'Technical / Rigorous',
        duration: '6–9 Months',
        coding: 'Low-to-Moderate (Networking, Linux, SIEM)',
        salary: '$60,000–$95,000 / ₹6.5L–₹16L',
        bestFor: 'Defenders who want to secure networks and protect against digital threats',
        roadmap: 'careers/cybersecurity.html'
    },
    'mobile-dev': {
        name: 'Mobile App Developer',
        category: 'Engineering & Code',
        difficulty: 'Moderate',
        duration: '4–7 Months',
        coding: 'Heavy (Flutter/React Native, Swift/Kotlin)',
        salary: '$52,000–$88,000 / ₹5.5L–₹14L',
        bestFor: 'Smartphone enthusiasts eager to build native apps used by millions',
        roadmap: 'careers/mobile-dev.html'
    },
    'graphic-designer': {
        name: 'Graphic Designer',
        category: 'Creative & Media',
        difficulty: 'Creative / Fast Start',
        duration: '2–4 Months',
        coding: 'None (Photoshop, Illustrator)',
        salary: '$40,000–$65,000 / ₹3.5L–₹8L',
        bestFor: 'Visual artists who love branding, logo design, and marketing collateral',
        roadmap: 'careers/graphic-designer.html'
    },
    'video-editor': {
        name: 'Video Editor',
        category: 'Creative & Media',
        difficulty: 'Creative / Fast Monetization',
        duration: '2–3 Months',
        coding: 'None (Premiere Pro, DaVinci Resolve)',
        salary: '$42,000–$75,000 / ₹4L–₹10L',
        bestFor: 'Storytellers excited by creator economy video pacing and sound design',
        roadmap: 'careers/video-editor.html'
    }
};

function initCareerComparison() {
    const selectA = document.getElementById('compare-select-a');
    const selectB = document.getElementById('compare-select-b');
    const tableWrap = document.getElementById('compare-table-wrap');

    if (!selectA || !selectB || !tableWrap) return;

    function renderComparison() {
        const itemA = CAREER_COMPARE_DATA[selectA.value];
        const itemB = CAREER_COMPARE_DATA[selectB.value];

        if (!itemA || !itemB) return;

        tableWrap.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); background: var(--bg-surface-elevated);">
                        <th style="padding: 14px 18px; width: 25%;">Feature</th>
                        <th style="padding: 14px 18px; width: 37.5%; color: var(--primary-color);">${itemA.name}</th>
                        <th style="padding: 14px 18px; width: 37.5%; color: var(--accent-purple);">${itemB.name}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 14px 18px; font-weight: 600;">Category</td>
                        <td style="padding: 14px 18px;">${itemA.category}</td>
                        <td style="padding: 14px 18px;">${itemB.category}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 14px 18px; font-weight: 600;">Difficulty Level</td>
                        <td style="padding: 14px 18px;"><span class="tag" style="margin: 0;">${itemA.difficulty}</span></td>
                        <td style="padding: 14px 18px;"><span class="tag" style="margin: 0;">${itemB.difficulty}</span></td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 14px 18px; font-weight: 600;">Est. Time to Learn</td>
                        <td style="padding: 14px 18px;"><i class="fa-solid fa-clock" style="color: var(--primary-color); margin-right: 6px;"></i>${itemA.duration}</td>
                        <td style="padding: 14px 18px;"><i class="fa-solid fa-clock" style="color: var(--accent-purple); margin-right: 6px;"></i>${itemB.duration}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 14px 18px; font-weight: 600;">Coding Required?</td>
                        <td style="padding: 14px 18px;">${itemA.coding}</td>
                        <td style="padding: 14px 18px;">${itemB.coding}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 14px 18px; font-weight: 600;">Est. Earning Potential</td>
                        <td style="padding: 14px 18px; color: var(--accent-green); font-weight: 600;">${itemA.salary}</td>
                        <td style="padding: 14px 18px; color: var(--accent-green); font-weight: 600;">${itemB.salary}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 14px 18px; font-weight: 600;">Best Suited For</td>
                        <td style="padding: 14px 18px; color: var(--text-muted);">${itemA.bestFor}</td>
                        <td style="padding: 14px 18px; color: var(--text-muted);">${itemB.bestFor}</td>
                    </tr>
                    <tr>
                        <td style="padding: 16px 18px; font-weight: 600;">Full Pathway</td>
                        <td style="padding: 16px 18px;">
                            <a href="${itemA.roadmap}" class="btn btn-primary btn-sm">
                                View ${itemA.name} Guide <i class="fa-solid fa-arrow-right"></i>
                            </a>
                        </td>
                        <td style="padding: 16px 18px;">
                            <a href="${itemB.roadmap}" class="btn btn-secondary btn-sm">
                                View ${itemB.name} Guide <i class="fa-solid fa-arrow-right"></i>
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    selectA.addEventListener('change', renderComparison);
    selectB.addEventListener('change', renderComparison);

    renderComparison();
}
