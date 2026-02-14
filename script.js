const canvas = document.createElement('canvas');
canvas.id = 'bubble-background';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '-1';
canvas.style.pointerEvents = 'auto'; // So hover works
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
let bubbles = [];

// Cursor-following bubble
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let prevMouse = { ...mouse };
let prevTime = Date.now();
let cursorVel = 0;
let cursorBaseRadius = 18;
let cursorRadius = cursorBaseRadius;
let cursorAlpha = 0.75;

// Pop effect variables
let popEffects = [];
let hoveredBubbleIndex = -1; // Track which bubble is being hovered

window.addEventListener('mousemove', (e) => {
  const now = Date.now();
  const dt = Math.max(1, now - prevTime);
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  const dist = Math.hypot(dx, dy);
  cursorVel = dist / dt * 100;
  prevMouse.x = e.clientX;
  prevMouse.y = e.clientY;
  prevTime = now;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  
  // Check for bubble hover
  checkBubbleHover(mouse.x, mouse.y);
});

function checkBubbleHover(mx, my) {
  let newHoveredIndex = -1;
  
  // Check from last to first (top-most first)
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bubble = bubbles[i];
    const dist = Math.hypot(mx - bubble.x, my - bubble.y);
    
    if (dist <= bubble.radius) {
      newHoveredIndex = i;
      break;
    }
  }
  
  // If we're hovering a new bubble (not the same as before)
  if (newHoveredIndex !== -1 && newHoveredIndex !== hoveredBubbleIndex) {
    popBubble(newHoveredIndex);
  }
  
  hoveredBubbleIndex = newHoveredIndex;
}

function popBubble(index) {
  const bubble = bubbles[index];
  if (!bubble || bubble.isPopping) return;
  
  // Mark as popping to prevent multiple pops
  bubble.isPopping = true;
  
  // Create pop effect
  popEffects.push({
    x: bubble.x,
    y: bubble.y,
    radius: bubble.radius,
    alpha: 0.9,
    age: 0,
    maxAge: 40, // frames
    vx: bubble.vx,
    vy: bubble.vy
  });
  
  // Add some extra small particles
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    popEffects.push({
      x: bubble.x,
      y: bubble.y,
      radius: bubble.radius * 0.3,
      alpha: 0.8,
      age: 0,
      maxAge: 30,
      vx: bubble.vx + Math.cos(angle) * speed,
      vy: bubble.vy + Math.sin(angle) * speed,
      isParticle: true
    });
  }
  
  // Remove the bubble
  bubbles.splice(index, 1);
  
  // Update hovered index since array changed
  if (index <= hoveredBubbleIndex) {
    hoveredBubbleIndex = -1;
  }
}

function updatePopEffects() {
  for (let i = popEffects.length - 1; i >= 0; i--) {
    const pop = popEffects[i];
    pop.age++;
    
    // Move particles
    if (pop.isParticle) {
      pop.x += pop.vx;
      pop.y += pop.vy;
      pop.vx *= 0.98;
      pop.vy *= 0.98;
      pop.alpha *= 0.96;
    } else {
      pop.alpha *= 0.94;
      pop.radius *= 1.03;
    }
    
    if (pop.age >= pop.maxAge || pop.alpha < 0.01) {
      popEffects.splice(i, 1);
    }
  }
}

function drawPopEffects() {
  popEffects.forEach(pop => {
    const progress = pop.age / pop.maxAge;
    
    if (pop.isParticle) {
      // Draw particles
      ctx.globalAlpha = pop.alpha;
      ctx.fillStyle = `rgba(24, 164, 164, ${pop.alpha})`;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, pop.radius * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw main pop ring
      ctx.globalAlpha = pop.alpha;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pop.alpha})`;
      ctx.lineWidth = 4 * (1 - progress);
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, pop.radius * (1 + progress), 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw inner glow
      ctx.globalAlpha = pop.alpha * 0.6;
      ctx.fillStyle = `rgba(24, 164, 164, ${pop.alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, pop.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

function updateCursor() {
  const target = cursorBaseRadius + clamp(cursorVel, 0, 800) * 0.08;
  cursorRadius += (target - cursorRadius) * 0.16;
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
function smoothstep(t) { return t * t * (3 - 2 * t); }

class Bubble {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.baseRadius = Math.random() * 40 + 10;
    this.radius = this.baseRadius;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = (Math.random() - 0.5) * 1.2;
    this.alpha = 0;
    this.birthTime = Date.now();
    this.lifetime = Math.random() * 10000 + 8000; // 8-18 seconds
    this.maxAlpha = Math.random() * 0.35 + 0.2;
    this.color = { r: 24, g: 164, b: 164 };
    this.isPopping = false;
    this.hoverGlow = 0;
  }

  update() {
    if (this.isPopping) return false;
    
    const elapsed = Date.now() - this.birthTime;
    const progress = clamp(elapsed / this.lifetime, 0, 1);

    // Fade in/out
    if (progress < 0.15) {
      const p = clamp(progress / 0.15);
      this.alpha = this.maxAlpha * smoothstep(p);
    } else if (progress > 0.85) {
      const p = clamp((1 - progress) / 0.15);
      this.alpha = this.maxAlpha * smoothstep(p);
    } else {
      this.alpha = this.maxAlpha;
    }

    // Add hover glow effect
    if (hoveredBubbleIndex !== -1 && bubbles[hoveredBubbleIndex] === this) {
      this.hoverGlow = Math.min(1, this.hoverGlow + 0.05);
    } else {
      this.hoverGlow = Math.max(0, this.hoverGlow - 0.05);
    }

    // Gentle pulsate
    const wobble = 0.02 * Math.sin((Date.now() - this.birthTime) / 400);
    this.radius = this.baseRadius * (1 + wobble + this.hoverGlow * 0.1);

    // Move bubble
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off edges
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -0.9;
    } else if (this.x + this.radius > canvas.width) {
      this.x = canvas.width - this.radius;
      this.vx *= -0.9;
    }
    
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy *= -0.9;
    } else if (this.y + this.radius > canvas.height) {
      this.y = canvas.height - this.radius;
      this.vy *= -0.9;
    }

    return elapsed < this.lifetime;
  }

  draw() {
    const r = Math.max(1, this.radius);
    
    // Add hover glow outline
    if (this.hoverGlow > 0.01) {
      ctx.globalAlpha = this.hoverGlow * 0.8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.hoverGlow})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw bubble
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0, `rgba(${this.color.r},${this.color.g},${this.color.b},1)`);
    grad.addColorStop(0.6, `rgba(${this.color.r},${this.color.g},${this.color.b},0.6)`);
    grad.addColorStop(1, `rgba(${this.color.r},${this.color.g},${this.color.b},0)`);

    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlight
    ctx.globalAlpha = this.alpha * 0.3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(this.x - r * 0.2, this.y - r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update pop effects
  updatePopEffects();

  // Update and draw existing bubbles
  bubbles = bubbles.filter(bubble => {
    const isAlive = bubble.update();
    bubble.draw();
    return isAlive;
  });

  // Draw pop effects on top
  drawPopEffects();

  // Update and draw cursor-following bubble
  updateCursor();
  drawCursor();

  // Create new bubbles
  if (Math.random() < 0.02) {
    bubbles.push(new Bubble());
  }

  requestAnimationFrame(animate);
}

// Initialize with bubbles
for (let i = 0; i < 12; i++) {
  setTimeout(() => {
    bubbles.push(new Bubble());
  }, i * 300);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});