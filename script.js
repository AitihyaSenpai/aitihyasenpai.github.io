const canvas = document.createElement('canvas');
canvas.id = 'bubble-background';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '-1'; // Set z-index low so it appears behind profile card
canvas.style.pointerEvents = 'none';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
let bubbles = [];

// Cursor-following bubble (grows with cursor velocity)
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let prevMouse = { ...mouse };
let prevTime = Date.now();
let cursorVel = 0;
let cursorBaseRadius = 18;
let cursorRadius = cursorBaseRadius;
let cursorAlpha = 0.75;

window.addEventListener('mousemove', (e) => {
  const now = Date.now();
  const dt = Math.max(1, now - prevTime);
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  const dist = Math.hypot(dx, dy);
  // velocity normalized (px per 100ms)
  cursorVel = dist / dt * 100;
  prevMouse.x = e.clientX;
  prevMouse.y = e.clientY;
  prevTime = now;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function updateCursor() {
  const target = cursorBaseRadius + clamp(cursorVel, 0, 800) * 0.08;
  // smooth interpolation toward target radius
  cursorRadius += (target - cursorRadius) * 0.16;
  // decay velocity so bubble shrinks when mouse stops
  cursorVel *= 0.88;
}

function drawCursor() {
  const r = Math.max(4, cursorRadius);
  const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, r);
  grad.addColorStop(0, `rgb(24, 164, 164)`);
  grad.addColorStop(0.6, `rgba(24,164,164,0.6)`);
  grad.addColorStop(1, `rgba(24,164,164,0)`);
  ctx.globalAlpha = cursorAlpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function smoothstep(t) { return t * t * (3 - 2 * t); } // smooth interpolation

class Bubble {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.baseRadius = Math.random() * 40 + 10;
    this.radius = this.baseRadius;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.alpha = 0;
    this.birthTime = Date.now();
    this.lifetime = Math.random() * 4000 + 3000; // 3-7 seconds
    this.maxAlpha = Math.random() * 0.3 + 0.1; // 0.1-0.4 transparency
    // fixed white color; use gradient when drawing for soft edges
    this.color = { r: 24, g: 164, b: 164 };
  }

  update() {
    const elapsed = Date.now() - this.birthTime;
    const progress = clamp(elapsed / this.lifetime, 0, 1);

    // Smooth fade in (first 20%) and fade out (last 20%) using smoothstep
    if (progress < 0.2) {
      const p = clamp(progress / 0.2);
      this.alpha = this.maxAlpha * smoothstep(p);
    } else if (progress > 0.8) {
      const p = clamp((1 - progress) / 0.2);
      this.alpha = this.maxAlpha * smoothstep(p);
    } else {
      this.alpha = this.maxAlpha;
    }

    // Gentle pulsate during life
    const wobble = 0.03 * Math.sin((Date.now() - this.birthTime) / 300);
    this.radius = this.baseRadius * (1 + wobble);

    // Pop effect near end: expand smoothly then let alpha fade handle vanishing
    if (progress > 0.9) {
      const t = clamp((progress - 0.9) / 0.1); // 0..1
      // sine peak (0->peak->0) scaled for visible pop
      const popScale = 1 + Math.sin(t * Math.PI) * 1.2 * (1 - t * 0.6);
      this.radius = this.baseRadius * popScale;
    }

    // Move bubble
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off edges
    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
      this.vx *= -1;
      this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
    }
    if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
      this.vy *= -1;
      this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }

    return elapsed < this.lifetime;
  }

  draw() {
    const r = Math.max(1, this.radius);

    // Radial gradient for soft edges (white center -> transparent edge)
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0, `rgba(${this.color.r},${this.color.g},${this.color.b},1)`);
    grad.addColorStop(0.6, `rgba(${this.color.r},${this.color.g},${this.color.b},0.6)`);
    grad.addColorStop(1, `rgba(${this.color.r},${this.color.g},${this.color.b},0)`);

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and draw existing bubbles
  bubbles = bubbles.filter(bubble => {
    const isAlive = bubble.update();
    bubble.draw();
    return isAlive;
  });

  // Update and draw cursor-following bubble on top
  updateCursor();
  drawCursor();

  // Create new bubbles randomly (tweak spawn chance if needed)
  if (Math.random() < 0.05) {
    bubbles.push(new Bubble());
  }

  requestAnimationFrame(animate);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
