'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'resumeforge_tour_completed';

// ── Arrow injection helpers ───────────────────────────────────────────────────

let arrowEl: HTMLElement | null = null;

function showArrow(targetId: string, direction: 'up' | 'down' | 'left' | 'right' = 'down') {
  hideArrow();
  // Small delay so driver.js finishes scrolling before we measure
  setTimeout(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'tour-field-arrow';

    const arrows = { up: '↑', down: '↓', left: '←', right: '→' };
    el.textContent = arrows[direction];

    if (direction === 'down') {
      el.style.left = `${rect.left + rect.width / 2 - 11}px`;
      el.style.top  = `${rect.top - 34}px`;
    } else if (direction === 'up') {
      el.style.left = `${rect.left + rect.width / 2 - 11}px`;
      el.style.top  = `${rect.bottom + 8}px`;
    } else if (direction === 'right') {
      el.style.left = `${rect.left - 34}px`;
      el.style.top  = `${rect.top + rect.height / 2 - 11}px`;
    } else {
      el.style.left = `${rect.right + 8}px`;
      el.style.top  = `${rect.top + rect.height / 2 - 11}px`;
    }

    document.body.appendChild(el);
    arrowEl = el;
  }, 120);
}

function hideArrow() {
  if (arrowEl) { arrowEl.remove(); arrowEl = null; }
}

// ── Tour definition ───────────────────────────────────────────────────────────

export function startTour() {
  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done',
    overlayColor: 'rgba(0,0,0,0.7)',
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'resumeforge-tour',
    onDestroyStarted: () => {
      hideArrow();
      localStorage.setItem(TOUR_KEY, 'true');
      driverObj.destroy();
    },
    steps: [
      {
        element: '#tour-heading',
        popover: {
          title: 'Welcome to ResumeForge 👋',
          description:
            "Let's show you how to get a tailored resume in under 60 seconds. Click Next to get started.",
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-job-details',
        popover: {
          title: 'Enter the role details',
          description:
            'Fill in the company name, job title, and paste the full job description. Paste the JD first — ResumeForge will try to auto-fill Company and Title, so just double-check.',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => showArrow('jobDescription', 'down'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-background',
        popover: {
          title: 'Add your background',
          description:
            'Upload your existing resume, load a saved document from your library, or paste your work history. The more detail you add, the better your results.',
          side: 'left',
          align: 'start',
        },
        onHighlightStarted: () => showArrow('tour-upload-btn', 'down'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-context',
        popover: {
          title: 'Boost results with extra context (optional)',
          description:
            'Add cover letter samples, portfolios, or your expanded work history — the AI uses these as reference to write more specific, compelling content.',
          side: 'left',
          align: 'start',
        },
        onHighlightStarted: () => showArrow('tour-context', 'up'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-questions',
        popover: {
          title: 'Answer tough application questions (optional)',
          description:
            'Paste in written questions from the application and get AI-generated answers grounded in your real experience.',
          side: 'top',
          align: 'start',
        },
        onHighlightStarted: () => showArrow('tour-questions', 'down'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-generate',
        popover: {
          title: "You're ready to go",
          description:
            'Hit the button and get a tailored resume and cover letter in about 30 seconds. Your application is saved to AI Resumes for re-downloading anytime.',
          side: 'top',
          align: 'center',
        },
        onHighlightStarted: () => showArrow('tour-generate', 'down'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-nav',
        popover: {
          title: 'Navigate from here',
          description:
            'Use this menu to get around — Tailor New Resume brings you here to generate, AI Resumes shows your saved applications, and My Profile is where you store your resume and context files so they auto-load every time.',
          side: 'bottom',
          align: 'end',
        },
        onHighlightStarted: () => showArrow('tour-nav', 'up'),
        onDeselected: hideArrow,
      },
    ],
  });

  driverObj.drive();
}

export default function TourGuide() {
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (completed === 'true') return;

    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
