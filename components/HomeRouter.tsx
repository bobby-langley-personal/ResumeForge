'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeScreen from '@/components/WelcomeScreen';
import GoalScreen from '@/components/GoalScreen';
import OnboardingOverlay from '@/components/OnboardingOverlay';

const SKIP_KEY = 'resumeforge_skip_goal_screen';

interface Props {
  firstName: string | null;
  documentCount: number;
  hasApplications: boolean;
}

export default function HomeRouter({ firstName, documentCount, hasApplications }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  useEffect(() => {
    // Users with multiple docs + skip flag → go straight to tailor
    if (documentCount > 1 && localStorage.getItem(SKIP_KEY) === 'true') {
      router.replace('/tailor');
      return;
    }
    setChecked(true);
  }, [documentCount, router]);

  if (!checked) return null;

  // No documents — always show the orientation overlay, then WelcomeScreen
  if (documentCount === 0) {
    if (!overlayDismissed) {
      return <OnboardingOverlay variant="new" onDismiss={() => setOverlayDismissed(true)} />;
    }
    return <WelcomeScreen />;
  }

  // Exactly one document — nudge to enrich the library, then GoalScreen
  if (documentCount === 1) {
    if (!overlayDismissed) {
      return <OnboardingOverlay variant="sparse" onDismiss={() => setOverlayDismissed(true)} />;
    }
  }

  return (
    <GoalScreen
      firstName={firstName}
      hasApplications={hasApplications}
    />
  );
}
