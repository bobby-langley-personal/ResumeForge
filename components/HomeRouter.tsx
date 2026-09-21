'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeScreen from '@/components/WelcomeScreen';
import GoalScreen from '@/components/GoalScreen';
import OnboardingOverlay from '@/components/OnboardingOverlay';

const SKIP_KEY = 'resumeforge_skip_goal_screen';
const SPARSE_DISMISSED_KEY = 'resumeforge_sparse_dismissed';

interface Props {
  firstName: string | null;
  documentCount: number;
  hasApplications: boolean;
}

export default function HomeRouter({ firstName, documentCount, hasApplications }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [newOverlayDismissed, setNewOverlayDismissed] = useState(false);
  const [sparseDismissed, setSparseDismissed] = useState(false);

  useEffect(() => {
    // Users with multiple docs + skip flag → go straight to tailor
    if (documentCount > 1 && localStorage.getItem(SKIP_KEY) === 'true') {
      router.replace('/tailor');
      return;
    }
    // Sparse overlay persists dismissal across sessions
    setSparseDismissed(localStorage.getItem(SPARSE_DISMISSED_KEY) === 'true');
    setChecked(true);
  }, [documentCount, router]);

  if (!checked) return null;

  // No documents — show the orientation overlay, then WelcomeScreen
  if (documentCount === 0) {
    if (!newOverlayDismissed) {
      return <OnboardingOverlay variant="new" onDismiss={() => setNewOverlayDismissed(true)} />;
    }
    return <WelcomeScreen />;
  }

  // Exactly one document — nudge to enrich the library (once per browser, then skip)
  if (documentCount === 1 && !sparseDismissed) {
    return (
      <OnboardingOverlay
        variant="sparse"
        onDismiss={() => {
          localStorage.setItem(SPARSE_DISMISSED_KEY, 'true');
          setSparseDismissed(true);
        }}
      />
    );
  }

  return (
    <GoalScreen
      firstName={firstName}
      hasApplications={hasApplications}
    />
  );
}
