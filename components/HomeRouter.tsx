'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeScreen from '@/components/WelcomeScreen';
import GoalScreen from '@/components/GoalScreen';

const SKIP_KEY = 'resumeforge_skip_goal_screen';

interface Props {
  firstName: string | null;
  hasDocuments: boolean;
  hasBaseResume: boolean;
  hasApplications: boolean;
  baseResumeStale: boolean;
  baseResumeDaysOld: number;
}

export default function HomeRouter({
  firstName,
  hasDocuments,
  hasBaseResume,
  hasApplications,
  baseResumeStale,
  baseResumeDaysOld,
}: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hasDocuments) {
      // First-time user — never skip to tailor
      setChecked(true);
      return;
    }
    if (localStorage.getItem(SKIP_KEY) === 'true') {
      router.replace('/tailor');
      return;
    }
    setChecked(true);
  }, [hasDocuments, router]);

  if (!checked) return null;

  if (!hasDocuments) {
    return <WelcomeScreen />;
  }

  return (
    <GoalScreen
      firstName={firstName}
      hasBaseResume={hasBaseResume}
      hasApplications={hasApplications}
      baseResumeStale={baseResumeStale}
      baseResumeDaysOld={baseResumeDaysOld}
    />
  );
}
