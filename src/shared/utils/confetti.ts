/** Lightweight canvas-based confetti burst – no dependencies */
export function fireConfetti(duration = 2500) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:9999;pointer-events:none;width:100%;height:100%";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = [
    "hsl(142,71%,45%)", "hsl(47,96%,53%)", "hsl(348,83%,47%)",
    "hsl(217,91%,60%)", "hsl(280,68%,60%)", "hsl(24,95%,53%)",
  ];

  interface Particle { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; rot: number; vr: number; life: number }
  const particles: Particle[] = [];
  const W = window.innerWidth;
  const H = window.innerHeight;

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 - 100,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 4,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }

  const start = performance.now();
  function frame(now: number) {
    const elapsed = now - start;
    if (elapsed > duration) { canvas.remove(); return; }
    ctx.clearRect(0, 0, W, H);
    const fade = Math.max(0, 1 - (elapsed - duration * 0.6) / (duration * 0.4));
    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.25;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade * Math.min(1, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
