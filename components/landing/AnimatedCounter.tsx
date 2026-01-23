"use client";

import { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: string;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 2000,
  className = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState("0");
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    // Extract numeric value
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (isNaN(numericValue)) {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    const startValue = 0;
    const endValue = numericValue;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;

      // Format based on original value format
      if (value.includes("+")) {
        setDisplayValue(`${Math.floor(currentValue).toLocaleString("sk-SK")}${suffix}+`);
      } else if (value.includes("%")) {
        setDisplayValue(`${currentValue.toFixed(1)}${suffix}%`);
      } else if (value.includes("M") || value.includes("€")) {
        if (currentValue >= 1) {
          setDisplayValue(`€${currentValue.toFixed(1)}${suffix}M`);
        } else {
          setDisplayValue(`€${(currentValue * 1000).toFixed(0)}${suffix}K`);
        }
      } else {
        setDisplayValue(`${Math.floor(currentValue).toLocaleString("sk-SK")}${suffix}`);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final value matches exactly
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix && !value.includes(suffix) && suffix}
    </span>
  );
}
