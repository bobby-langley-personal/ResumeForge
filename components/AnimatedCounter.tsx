'use client';

import { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(1);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0) return;
    const node = ref.current;
    if (!node) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      // Short delay so the user sees "1" tick before the ramp begins
      setTimeout(() => {
        const duration = 1800;
        const steps = 60;
        const stepMs = duration / steps;
        let step = 0;
        const timer = setInterval(() => {
          step++;
          const progress = step / steps;
          // Ease-in-out: slow start, fast middle, satisfying slow finish
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          setCount(Math.max(1, Math.round(eased * target)));
          if (step >= steps) clearInterval(timer);
        }, stepMs);
      }, 300);
    };

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { run(); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}
