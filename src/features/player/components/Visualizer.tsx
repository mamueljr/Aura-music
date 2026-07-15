import { useEffect, useRef } from 'react';

import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';

type Mode = 'bars' | 'circular';

/**
 * Canvas spectrum visualizer fed by the engine's AnalyserNode.
 * Two render modes: classic bars and a circular "aura" ring.
 */
export function Visualizer({ mode, className }: { mode: Mode; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const styles = getComputedStyle(canvas);
    const c1 = styles.getPropertyValue('--aura-1').trim() || '#8b5cf6';
    const c2 = styles.getPropertyValue('--aura-2').trim() || '#22d3ee';
    const c3 = styles.getPropertyValue('--aura-3').trim() || '#f472b6';

    const freq = new Uint8Array(1024);
    let rotation = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);

      const analyser = player.getAnalyser();
      if (analyser) {
        analyser.getByteFrequencyData(freq as Uint8Array<ArrayBuffer>);
      } else {
        freq.fill(0);
      }

      if (mode === 'bars') drawBars(ctx, freq, width, height, c1, c2);
      else {
        rotation += isPlayingRef.current ? 0.0022 : 0.0006;
        drawCircular(ctx, freq, width, height, rotation, c1, c2, c3);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [mode]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  freq: Uint8Array,
  width: number,
  height: number,
  c1: string,
  c2: string,
) {
  const BAR_COUNT = 56;
  const gap = 3;
  const barWidth = (width - gap * (BAR_COUNT - 1)) / BAR_COUNT;

  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(1, c2);
  ctx.fillStyle = gradient;

  for (let i = 0; i < BAR_COUNT; i++) {
    // Log-ish sampling: more resolution in the low end, like real players.
    const start = Math.floor(Math.pow(i / BAR_COUNT, 1.7) * (freq.length * 0.72));
    const end = Math.max(
      start + 1,
      Math.floor(Math.pow((i + 1) / BAR_COUNT, 1.7) * (freq.length * 0.72)),
    );
    let sum = 0;
    for (let j = start; j < end; j++) sum += freq[j];
    const value = sum / (end - start) / 255;

    const barHeight = Math.max(3, value * height * 0.92);
    const x = i * (barWidth + gap);
    const y = height - barHeight;
    const radius = Math.min(barWidth / 2, 4);

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 2, 2]);
    ctx.fill();
  }
}

function drawCircular(
  ctx: CanvasRenderingContext2D,
  freq: Uint8Array,
  width: number,
  height: number,
  rotation: number,
  c1: string,
  c2: string,
  c3: string,
) {
  const cx = width / 2;
  const cy = height / 2;
  const SPOKES = 96;
  const baseRadius = Math.min(width, height) * 0.27;
  const maxLength = Math.min(width, height) * 0.2;

  // Soft glow core
  const glow = ctx.createRadialGradient(cx, cy, baseRadius * 0.2, cx, cy, baseRadius);
  glow.addColorStop(0, `${c1}55`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, (Math.PI * 2 * baseRadius) / SPOKES - 3.5);

  for (let i = 0; i < SPOKES; i++) {
    const bin = Math.floor(Math.pow(i / SPOKES, 1.6) * (freq.length * 0.7));
    const value = freq[bin] / 255;
    const length = 4 + value * maxLength;
    const angle = (i / SPOKES) * Math.PI * 2 + rotation;

    const x1 = cx + Math.cos(angle) * baseRadius;
    const y1 = cy + Math.sin(angle) * baseRadius;
    const x2 = cx + Math.cos(angle) * (baseRadius + length);
    const y2 = cy + Math.sin(angle) * (baseRadius + length);

    const third = i / SPOKES;
    ctx.strokeStyle = third < 0.33 ? c1 : third < 0.66 ? c2 : c3;
    ctx.globalAlpha = 0.45 + value * 0.55;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Inner ring
  ctx.strokeStyle = `${c2}88`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius - 6, 0, Math.PI * 2);
  ctx.stroke();
}
