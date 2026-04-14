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
    popoverClass: 'easy-apply-tour',
    onDestroyStarted: () => {
      hideArrow();
      localStorage.setItem(TOUR_KEY, 'true');
      driverObj.destroy();
    },
    steps: [
      {
        element: '#tour-heading',
        popover: {
          title: 'Welcome to Easy Apply AI 👋',
          description:
            "Let's show you how to get a tailored resume in under 60 seconds. Click Next to get started.",
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-job-details',
        popover: {
          title: 'Check the job details',
          description:
            'Paste the job description first — Easy Apply auto-fills Company and Job Title from it. Give them a quick look to make sure they look right before generating.',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => showArrow('jobDescription', 'down'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-questions',
        popover: {
          title: 'Got application questions?',
          description:
            'If the job posting has written questions ("Tell us about yourself…"), paste them here and get AI-written answers grounded in your experience. You can always do this later from the AI chat on your saved resume too.',
          side: 'top',
          align: 'start',
        },
        onHighlightStarted: () => showArrow('tour-questions', 'down'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-background',
        popover: {
          title: 'Your experience is loaded',
          description:
            'This shows the experience files the AI will draw from. Your uploaded resume should already be here — you can swap it or add extra context like portfolios or cover letter samples.',
          side: 'left',
          align: 'start',
        },
        onHighlightStarted: () => showArrow('tour-background', 'up'),
        onDeselected: hideArrow,
      },
      {
        element: '#tour-generate',
        popover: {
          title: "Hit Generate — you're ready",
          description:
            'Get a tailored resume in about 30 seconds. Your result is saved to AI Resumes so you can re-download or refine it anytime.<br/><br/>💡 <strong>Pro tip:</strong> Install the <a href="https://chromewebstore.google.com/detail/foodpkmblpknlbkmdnnlgjkbnnhmbcid" target="_blank" style="color:#60a5fa;text-decoration:underline">Chrome Extension</a> — it reads any job board tab and fills all of this in for you automatically.',
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
            'Use this menu to get around — <strong>AI Resumes</strong> shows your saved applications, <strong>My Experience</strong> is where you manage your uploaded files.',
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
