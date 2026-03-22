"use client";

import { cn } from "@/lib/utils";

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Slider({ min, max, value, onChange, disabled, className }: SliderProps) {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={cn(
        "w-full h-[3px] appearance-none cursor-pointer rounded-none",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "[&::-webkit-slider-thumb]:appearance-none",
        "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
        "[&::-webkit-slider-thumb]:rounded-sm",
        "[&::-webkit-slider-thumb]:bg-neon-amber",
        "[&::-webkit-slider-thumb]:border-0",
        "[&::-webkit-slider-thumb]:cursor-pointer",
        "[&::-webkit-slider-thumb]:transition-transform",
        "[&::-webkit-slider-thumb]:hover:scale-110",
        "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
        "[&::-moz-range-thumb]:rounded-sm",
        "[&::-moz-range-thumb]:bg-neon-amber",
        "[&::-moz-range-thumb]:border-0",
        "[&::-moz-range-thumb]:cursor-pointer",
        className
      )}
      style={{
        background: `linear-gradient(to right, hsl(var(--neon-amber)) 0%, hsl(var(--neon-amber)) ${percent}%, hsl(var(--border)) ${percent}%, hsl(var(--border)) 100%)`,
      }}
    />
  );
}
