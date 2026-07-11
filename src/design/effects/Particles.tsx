import { useEffect, useRef } from "react";

/**
 * Canvas particle field.
 *
 * Cheap deterministic-motion sprite bank. Prefers reduced-motion when the
 * user has requested it (`prefers-reduced-motion: reduce`).
 *
 * `variant` maps to a preset palette + physics profile:
 *   - "gold-shimmer" : soft up-drifting gold sparkles (Home hero, Draw rank)
 *   - "jester-burst" : radial magenta shards (Revolution)
 *   - "crown-rain"   : star + crown emojis raining (Match end)
 *   - "ember"        : orange lingering embers (Round result)
 *
 * The canvas sizes itself to the parent — put it inside a `position:relative`
 * container. Pointer events are disabled so it never blocks touches.
 */
export function Particles({
  variant,
  density = 1,
  paused,
  style,
}: {
  variant: "gold-shimmer" | "jester-burst" | "crown-rain" | "ember";
  density?: number;
  paused?: boolean;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (paused) return;
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const preset = presets[variant];

    // Size the canvas BEFORE spawning particles. Otherwise the pool
    // seeds with Math.random() * canvas.width where width is still 0,
    // and every particle spawns at (0,0) — the top-left clump you
    // could see on the home screen.
    const onResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    onResize();
    const particles = spawnPool(canvas, preset, density);
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement!);

    let t = 0;
    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        preset.step(p, canvas);
        preset.draw(ctx, p, dpr);
        if (preset.dead(p, canvas)) preset.reset(p, canvas);
      }
    };
    tick();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [variant, density, paused]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
        ...style,
      }}
    />
  );
}

/* -------------------------- Preset engine -------------------------- */

type Particle = { x: number; y: number; vx: number; vy: number; life: number; seed: number };

interface Preset {
  count: number;
  spawn: (canvas: HTMLCanvasElement) => Particle;
  step: (p: Particle, canvas: HTMLCanvasElement) => void;
  draw: (ctx: CanvasRenderingContext2D, p: Particle, dpr: number) => void;
  dead: (p: Particle, canvas: HTMLCanvasElement) => boolean;
  reset: (p: Particle, canvas: HTMLCanvasElement) => void;
}

function spawnPool(canvas: HTMLCanvasElement, preset: Preset, density: number): Particle[] {
  const n = Math.round(preset.count * density);
  return Array.from({ length: n }, () => preset.spawn(canvas));
}

const presets: Record<string, Preset> = {
  "gold-shimmer": {
    count: 32,
    spawn(canvas) {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.4,
        life: Math.random() * 200,
        seed: Math.random(),
      };
    },
    step(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;
    },
    draw(ctx, p, dpr) {
      const flick = 0.4 + 0.6 * Math.abs(Math.sin(p.life * 0.05 + p.seed * 6));
      const r = 1.2 * dpr + Math.sin(p.life * 0.04) * 0.4 * dpr;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
      g.addColorStop(0, `rgba(248,217,138,${0.85 * flick})`);
      g.addColorStop(0.4, `rgba(242,193,78,${0.25 * flick})`);
      g.addColorStop(1, "rgba(242,193,78,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2);
      ctx.fill();
    },
    dead(p) {
      return p.y < -20;
    },
    reset(p, canvas) {
      p.x = Math.random() * canvas.width;
      p.y = canvas.height + Math.random() * 40;
      p.vy = -0.2 - Math.random() * 0.4;
      p.life = 0;
    },
  },
  "jester-burst": {
    count: 48,
    spawn(canvas) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3.4;
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        seed: Math.random(),
      };
    },
    step(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy = p.vy * 0.98 + 0.05;
      p.life += 1;
    },
    draw(ctx, p, dpr) {
      const alpha = Math.max(0, 1 - p.life / 120);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 0.06 + p.seed * 5);
      ctx.fillStyle = `rgba(200,85,240,${alpha})`;
      ctx.fillRect(-3 * dpr, -3 * dpr, 6 * dpr, 6 * dpr);
      ctx.strokeStyle = `rgba(224,182,255,${alpha * 0.6})`;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(-3 * dpr, -3 * dpr, 6 * dpr, 6 * dpr);
      ctx.restore();
    },
    dead(p) {
      return p.life > 120;
    },
    reset(p, canvas) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3.4;
      p.x = canvas.width / 2;
      p.y = canvas.height / 2;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 0;
    },
  },
  "crown-rain": {
    count: 22,
    spawn(canvas) {
      return {
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.8 + Math.random() * 1.8,
        life: Math.random() * 100,
        seed: Math.random(),
      };
    },
    step(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;
    },
    draw(ctx, p, dpr) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.life * 0.03) * 0.3);
      ctx.font = `${14 * dpr}px system-ui, "Apple Color Emoji"`;
      ctx.textAlign = "center";
      ctx.fillText(p.seed > 0.5 ? "👑" : "★", 0, 0);
      ctx.restore();
    },
    dead(p, canvas) {
      return p.y > canvas.height + 20;
    },
    reset(p, canvas) {
      p.x = Math.random() * canvas.width;
      p.y = -20;
      p.vy = 0.8 + Math.random() * 1.8;
    },
  },
  ember: {
    count: 24,
    spawn(canvas) {
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.4 - Math.random() * 0.6,
        life: Math.random() * 60,
        seed: Math.random(),
      };
    },
    step(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;
    },
    draw(ctx, p, dpr) {
      const a = Math.max(0, 1 - p.life / 240);
      ctx.fillStyle = `rgba(251,146,60,${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    },
    dead(p) {
      return p.y < -10;
    },
    reset(p, canvas) {
      p.x = Math.random() * canvas.width;
      p.y = canvas.height + Math.random() * 60;
      p.life = 0;
    },
  },
};
