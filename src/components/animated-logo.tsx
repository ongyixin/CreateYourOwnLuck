"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const S = 1;
const C = "currentColor";

const Clover = () => (
  <svg viewBox="0 0 32 32" fill="none" className="w-full h-full" stroke={C} strokeWidth={S} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M16,15 C16,12 14,8 12,6 C11,5 10,5 9,6 C8,7 8,9 9,11 C10,13 13,15 16,15" />
    <path d="M16,15 C16,12 18,8 20,6 C21,5 22,5 23,6 C24,7 24,9 23,11 C22,13 19,15 16,15" />
    <path d="M16,17 C16,20 14,24 12,26 C11,27 10,27 9,26 C8,25 8,23 9,21 C10,19 13,17 16,17" />
    <path d="M16,17 C16,20 18,24 20,26 C21,27 22,27 23,26 C24,25 24,23 23,21 C22,19 19,17 16,17" />
    <path d="M15,16 C12,16 8,14 6,12 C5,11 5,10 6,9 C7,8 9,8 11,9 C13,10 15,13 15,16" />
    <path d="M15,16 C12,16 8,18 6,20 C5,21 5,22 6,23 C7,24 9,24 11,23 C13,22 15,19 15,16" />
    <path d="M17,16 C20,16 24,14 26,12 C27,11 27,10 26,9 C25,8 23,8 21,9 C19,10 17,13 17,16" />
    <path d="M17,16 C20,16 24,18 26,20 C27,21 27,22 26,23 C25,24 23,24 21,23 C19,22 17,19 17,16" />
    <rect x="15" y="15" width="2" height="2" fill={C} stroke="none" />
    <line x1="16" y1="26" x2="16" y2="31" />
    <line x1="16" y1="29" x2="18" y2="28" />
  </svg>
);

const Shirt = () => (
  <svg viewBox="0 0 32 32" fill="none" className="w-full h-full" stroke={C} strokeWidth={S} strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="11,4 8,4 5,5 3,8 4,10 6,11 8,10 9,8" />
    <polyline points="21,4 24,4 27,5 29,8 28,10 26,11 24,10 23,8" />
    <path d="M11,4 L13,7 C14,8 18,8 19,7 L21,4" />
    <path d="M9,8 L9,27 L10,28 L22,28 L23,27 L23,8" />
    <rect x="18" y="13" width="3" height="3" />
    <rect x="15.5" y="11" width="1" height="1" fill={C} stroke="none" />
    <rect x="15.5" y="15" width="1" height="1" fill={C} stroke="none" />
    <rect x="15.5" y="19" width="1" height="1" fill={C} stroke="none" />
    <rect x="15.5" y="23" width="1" height="1" fill={C} stroke="none" />
    <line x1="9" y1="8" x2="11" y2="4" />
    <line x1="23" y1="8" x2="21" y2="4" />
  </svg>
);

const Skirt = () => (
  <svg viewBox="0 0 32 32" fill="none" className="w-full h-full" stroke={C} strokeWidth={S} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M9,4 L23,4 L23,7 L9,7 Z" />
    <rect x="14" y="4.5" width="4" height="2" />
    <rect x="15.5" y="5" width="1" height="1" fill={C} stroke="none" />
    <path d="M9,7 L5,27 L6,28 L26,28 L27,27 L23,7" />
    <line x1="12" y1="7" x2="10" y2="28" />
    <line x1="16" y1="7" x2="16" y2="28" />
    <line x1="20" y1="7" x2="22" y2="28" />
    <line x1="6" y1="26" x2="26" y2="26" strokeDasharray="1 1" />
  </svg>
);

const Shoe = () => (
  <svg viewBox="0 0 32 32" fill="none" className="w-full h-full" stroke={C} strokeWidth={S} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M7,20 L7,11 L8,9 L10,8 L13,8 L14,9" />
    <path d="M10,8 L10,6 L13,6 L14,9" />
    <path d="M14,9 L14,14 L18,13 L22,12 L25,12 C27,12 29,13 29,15 L29,20" />
    <path d="M25,12 L26,10 L28,10 L29,12" />
    <path d="M5,20 L29,20 L30,21 L30,24 L29,25 L4,25 L3,24 L3,21 Z" />
    <line x1="4" y1="22" x2="30" y2="22" />
    <line x1="6" y1="23" x2="6" y2="25" />
    <line x1="10" y1="23" x2="10" y2="25" />
    <line x1="14" y1="23" x2="14" y2="25" />
    <line x1="18" y1="23" x2="18" y2="25" />
    <line x1="22" y1="23" x2="22" y2="25" />
    <line x1="26" y1="23" x2="26" y2="25" />
    <rect x="9" y="10" width="1" height="1" fill={C} stroke="none" />
    <rect x="11" y="9.5" width="1" height="1" fill={C} stroke="none" />
    <rect x="13" y="10" width="1" height="1" fill={C} stroke="none" />
    <path d="M10,17 C14,14 22,14 27,16" />
  </svg>
);

const Building = () => (
  <svg viewBox="0 0 32 32" fill="none" className="w-full h-full" stroke={C} strokeWidth={S} strokeLinecap="square" strokeLinejoin="miter">
    <line x1="16" y1="1" x2="16" y2="5" />
    <rect x="15" y="1" width="2" height="1" fill={C} stroke="none" />
    <line x1="14" y1="3" x2="18" y2="3" />
    <path d="M7,5 L25,5 L25,7 L7,7 Z" />
    <rect x="7" y="7" width="18" height="22" />
    <line x1="7" y1="13" x2="25" y2="13" />
    <line x1="7" y1="19" x2="25" y2="19" />
    {[0, 1, 2].map((row) =>
      [0, 1, 2, 3].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={9 + col * 4}
          y={8.5 + row * 6}
          width="2"
          height="2.5"
          fill={C}
          stroke="none"
        />
      ))
    )}
    <rect x="13" y="23" width="6" height="6" />
    <line x1="16" y1="23" x2="16" y2="29" />
    <rect x="14.5" y="26" width="0.8" height="0.8" fill={C} stroke="none" />
    <rect x="16.7" y="26" width="0.8" height="0.8" fill={C} stroke="none" />
    <line x1="6" y1="29" x2="26" y2="29" />
  </svg>
);

const stages = [
  { key: "clover", Component: Clover },
  { key: "shirt", Component: Shirt },
  { key: "skirt", Component: Skirt },
  { key: "shoe", Component: Shoe },
  { key: "building", Component: Building },
];

interface AnimatedLogoProps {
  size?: number;
  className?: string;
}

export default function AnimatedLogo({ size = 22, className = "" }: AnimatedLogoProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => (s + 1) % stages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const current = stages[stage];

  return (
    <div
      className={`relative text-neon-green ${className}`}
      style={{ width: size, height: size }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute inset-0"
        >
          <current.Component />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
