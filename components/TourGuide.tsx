'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'resumeforge_tour_completed';

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
            'Fill in the company name, job title, and job description for the role you\'re applying to. Paste the job description and ResumeForge will try to auto-fill Company and Title — not always perfect, so double-check.',
          side: 'right',
          align: 'start',
        },
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
      },
      {
        element: '#tour-my-documents',
        popover: {
          title: 'First — upload your resume here',
          description:
            'Save your resume (and any other documents) to My Documents. Your default resume auto-loads every time you come back, so you never have to paste it again.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  });

  driverObj.drive();
}

export default function TourGuide() {
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (completed === 'true') return;

    // Small delay so the page renders fully before the tour starts
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
