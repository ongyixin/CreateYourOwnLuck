"use client";

import { useEffect, useRef, useCallback } from "react";

export default function CursorBloom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -200, y: -200 });
  const smoothRef = useRef({ x: -200, y: -200 });
  const frameRef = useRef(0);
  const activeRef = useRef(true);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    activeRef.current = true;

    const isMobile = window.matchMedia("(hover: none)").matches || window.innerWidth < 768;
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    resize();
    window.addEventListener("resize", resize);

    const handleMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleLeave = () => {
      mouseRef.current = { x: -200, y: -200 };
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);

    const draw = (time: number) => {
      if (!activeRef.current) return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      const ease = 0.18;
      smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * ease;
      smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * ease;

      const sx = smoothRef.current.x;
      const sy = smoothRef.current.y;

      ctx.clearRect(0, 0, w, h);

      if (sx > -150 && sx < w + 150 && sy > -150 && sy < h + 150) {
        const t = time * 0.001;
        const h1 = 153, h2 = 158, h3 = 160;
        const l1 = 68, l2 = 60, l3 = 55;

        for (let i = 0; i < 3; i++) {
          const phase = t * (1.0 + i * 0.4) + i * 2.1;
          const pulse = Math.sin(phase) * 0.5 + 0.5;
          const baseRadius = 70 + i * 55;
          const radius = baseRadius + pulse * 25;
          const alpha = (0.10 - i * 0.025) * (1 - pulse * 0.3);

          const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
          gradient.addColorStop(0, `hsla(${h1}, 100%, ${l1}%, ${alpha * 2})`);
          gradient.addColorStop(0.4, `hsla(${h2}, 95%, ${l2}%, ${alpha * 1.1})`);
          gradient.addColorStop(0.7, `hsla(${h3}, 85%, ${l3}%, ${alpha * 0.4})`);
          gradient.addColorStop(0.88, `hsla(${h3}, 80%, ${l3}%, ${alpha * 0.08})`);
          gradient.addColorStop(1, `hsla(${h3}, 80%, ${l3}%, 0)`);

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
        }

        const coreGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40);
        coreGrad.addColorStop(0, `hsla(${h1}, 100%, ${l1 + 10}%, 0.20)`);
        coreGrad.addColorStop(0.5, `hsla(${h2}, 100%, ${l2 + 5}%, 0.07)`);
        coreGrad.addColorStop(0.85, `hsla(${h3}, 90%, ${l3}%, 0.01)`);
        coreGrad.addColorStop(1, `hsla(${h3}, 90%, ${l3}%, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, w, h);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
    };
  }, [resize]);

  if (typeof window !== "undefined" && (window.matchMedia("(hover: none)").matches || window.innerWidth < 768)) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30"
    />
  );
}
