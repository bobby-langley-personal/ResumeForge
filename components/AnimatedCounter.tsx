'use client';

import { useEffect, useState } from 'react';

export default function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const duration = 1400;
    const steps = 50;
    const stepMs = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      // Cubic ease-out so it accelerates quickly then slows at the end
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (step >= steps) clearInterval(timer);
    }, stepMs);
    return () => clearInterval(timer);
  }, [target]);

  return <>{count.toLocaleString()}</>;
}
