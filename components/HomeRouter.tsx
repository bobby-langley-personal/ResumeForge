'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeScreen from '@/components/WelcomeScreen';
import GoalScreen from '@/components/GoalScreen';
import OnboardingOverlay from '@/components/OnboardingOverlay';

const SKIP_KEY = 'resumeforge_skip_goal_screen';
const ONBOARDING_KEY = 'easy_apply_onboarding_seen';

interface Props {
  firstName: string | null;
  hasDocuments: boolean;
  hasApplications: boolean;
}

export default function HomeRouter({ firstName, hasDocuments, hasApplications }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!hasDocuments) {
      // Only show the onboarding overlay once, for new users with no documents
      const seen = localStorage.getItem(ONBOARDING_KEY) === 'true';
      setShowOnboarding(!seen);
      setChecked(true);
      return;
    }
    if (localStorage.getItem(SKIP_KEY) === 'true') {
      router.replace('/tailor');
      return;
    }
    setChecked(true);
  }, [hasDocuments, router]);

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  }

  if (!checked) return null;

  if (showOnboarding) {
    return <OnboardingOverlay onDismiss={dismissOnboarding} />;
  }

  if (!hasDocuments) {
    return <WelcomeScreen />;
  }

  return (
    <GoalScreen
      firstName={firstName}
      hasApplications={hasApplications}
    />
  );
}
