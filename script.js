// Canvas setup
const canvas = document.createElement('canvas');
canvas.id = 'bubble-background';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '-1';
canvas.style.pointerEvents = 'auto';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
let bubbles = [];

// Audio setup
let audioContext;
let analyser;
let source;
let audioData;
let isAudioInitialized = false;
let audioInitAttempted = false;

// Cursor position
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// Pop effect variables
let popEffects = [];
let hoveredBubbleIndex = -1;

// Audio initialization function
async function initAudio() {
    if (audioInitAttempted) return;
    audioInitAttempted = true;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        audioData = new Uint8Array(analyser.frequencyBinCount);
        isAudioInitialized = true;
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        console.log("Audio initialized successfully");
        
        const btn = document.getElementById('audio-init-btn');
        if (btn) btn.remove();
        
    } catch (error) {
        console.error("Error initializing audio:", error);
        audioInitAttempted = false;
    }
}

// Get audio levels
function getAudioLevels() {
    if (!isAudioInitialized || !analyser || !audioData) return null;
    
    analyser.getByteFrequencyData(audioData);
    
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i];
    }
    const average = sum / audioData.length / 255;
    
    let bassSum = 0;
    for (let i = 0; i < 10; i++) {
        bassSum += audioData[i];
    }
    const bassLevel = bassSum / 10 / 255;
    
    let trebleSum = 0;
    for (let i = audioData.length - 10; i < audioData.length; i++) {
        trebleSum += audioData[i];
    }
    const trebleLevel = trebleSum / 10 / 255;
    
    return {
        volume: average,
        bass: bassLevel,
        treble: trebleLevel,
        rawData: [...audioData]
    };
}

// Add audio button
function addAudioInitButton() {
    const button = document.createElement('button');
    button.id = 'audio-init-btn';
    button.textContent = '🎵 Enable Music Visualizer';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.padding = '12px 24px';
    button.style.background = '#18a4a4';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '25px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    button.style.transition = 'all 0.3s ease';
    
    button.onmouseover = () => {
        button.style.transform = 'scale(1.05)';
        button.style.background = '#56d9d9';
    };
    
    button.onmouseout = () => {
        button.style.transform = 'scale(1)';
        button.style.background = '#18a4a4';
    };
    
    button.onclick = async () => {
        button.textContent = '🎵 Initializing...';
        button.disabled = true;
        await initAudio();
    };
    
    document.body.appendChild(button);
}

// Mouse event listeners
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    checkBubbleHover(mouse.x, mouse.y);
});

function checkBubbleHover(mx, my) {
    let newHoveredIndex = -1;
    
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbles[i];
        const dist = Math.hypot(mx - bubble.x, my - bubble.y);
        
        if (dist <= bubble.radius) {
            newHoveredIndex = i;
            break;
        }
    }
    
    if (newHoveredIndex !== -1 && newHoveredIndex !== hoveredBubbleIndex) {
        popBubble(newHoveredIndex);
    }
    
    hoveredBubbleIndex = newHoveredIndex;
}

function popBubble(index) {
    const bubble = bubbles[index];
    if (!bubble || bubble.isPopping) return;
    
    bubble.isPopping = true;
    
    popEffects.push({
        x: bubble.x,
        y: bubble.y,
        radius: bubble.radius,
        alpha: 0.9,
        age: 0,
        maxAge: 40,
        vx: bubble.vx,
        vy: bubble.vy
    });
    
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
    
    bubbles.splice(index, 1);
    
    if (index <= hoveredBubbleIndex) {
        hoveredBubbleIndex = -1;
    }
}

function updatePopEffects() {
    for (let i = popEffects.length - 1; i >= 0; i--) {
        const pop = popEffects[i];
        pop.age++;
        
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
            ctx.globalAlpha = pop.alpha;
            ctx.fillStyle = `rgba(24, 164, 164, ${pop.alpha})`;
            ctx.beginPath();
            ctx.arc(pop.x, pop.y, pop.radius * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.globalAlpha = pop.alpha;
            ctx.strokeStyle = `rgba(255, 255, 255, ${pop.alpha})`;
            ctx.lineWidth = 4 * (1 - progress);
            ctx.beginPath();
            ctx.arc(pop.x, pop.y, pop.radius * (1 + progress), 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.globalAlpha = pop.alpha * 0.6;
            ctx.fillStyle = `rgba(24, 164, 164, ${pop.alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(pop.x, pop.y, pop.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
}

function drawAudioIndicator() {
    if (!isAudioInitialized) return;
    
    const audio = getAudioLevels();
    if (!audio) return;
    
    const barWidth = 6;
    const barSpacing = 3;
    const startX = 30;
    const startY = canvas.height - 80;
    const numBars = 30;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(startX - 10, startY - 60, (barWidth + barSpacing) * numBars + 10, 70);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`Volume: ${Math.round(audio.volume * 100)}%`, startX, startY - 70);
    
    for (let i = 0; i < numBars && i < audio.rawData.length; i++) {
        const barHeight = (audio.rawData[i] / 255) * 50;
        const hue = 180 + (audio.rawData[i] / 255) * 60;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 + audio.volume * 0.5})`;
        ctx.fillRect(
            startX + i * (barWidth + barSpacing),
            startY - barHeight,
            barWidth,
            barHeight
        );
    }
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
        this.lifetime = Math.random() * 10000 + 8000;
        this.maxAlpha = Math.random() * 0.35 + 0.2;
        this.color = { r: 24, g: 164, b: 164 };
        this.isPopping = false;
        this.hoverGlow = 0;
        
        // Audio-reactive properties
        this.audioResponsiveness = Math.random() * 0.5 + 0.5;
        this.frequencyAffinity = Math.random();
        this.baseVx = this.vx;
        this.baseVy = this.vy;
        this.baseColor = { ...this.color };
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
        if (this.isPopping) return false;
        
        const elapsed = Date.now() - this.birthTime;
        const progress = clamp(elapsed / this.lifetime, 0, 1);

        const audio = getAudioLevels();
        
        let audioInfluence = 0;
        let bassInfluence = 0;
        let trebleInfluence = 0;
        
        if (audio) {
            audioInfluence = (audio.bass * (1 - this.frequencyAffinity) + 
                             audio.treble * this.frequencyAffinity) * this.audioResponsiveness;
            bassInfluence = audio.bass * this.audioResponsiveness;
            trebleInfluence = audio.treble * this.audioResponsiveness;
        }

        if (progress < 0.15) {
            const p = clamp(progress / 0.15);
            this.alpha = this.maxAlpha * smoothstep(p);
        } else if (progress > 0.85) {
            const p = clamp((1 - progress) / 0.15);
            this.alpha = this.maxAlpha * smoothstep(p);
        } else {
            this.alpha = this.maxAlpha;
        }

        if (hoveredBubbleIndex !== -1 && bubbles[hoveredBubbleIndex] === this) {
            this.hoverGlow = Math.min(1, this.hoverGlow + 0.05);
        } else {
            this.hoverGlow = Math.max(0, this.hoverGlow - 0.05);
        }

        const naturalWobble = 0.02 * Math.sin((Date.now() - this.birthTime) / 400 + this.pulsePhase);
        const audioPulse = audioInfluence * 0.5;
        const bassPulse = bassInfluence * 0.3;
        
        this.radius = this.baseRadius * (1 + naturalWobble + this.hoverGlow * 0.1 + audioPulse + bassPulse);

        if (audio) {
            this.vx = this.baseVx * (1 + audio.volume * 2);
            this.vy = this.baseVy * (1 + audio.volume * 2);
        }

        if (audio) {
            const bassShift = bassInfluence * 100;
            const trebleShift = trebleInfluence * 100;
            
            this.color.r = Math.min(255, this.baseColor.r + bassShift);
            this.color.g = Math.min(255, this.baseColor.g - trebleShift * 0.5);
            this.color.b = Math.min(255, this.baseColor.b + trebleShift);
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -0.9;
            this.baseVx = this.vx;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -0.9;
            this.baseVx = this.vx;
        }
        
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -0.9;
            this.baseVy = this.vy;
        } else if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy *= -0.9;
            this.baseVy = this.vy;
        }

        return elapsed < this.lifetime;
    }

    draw() {
        const r = Math.max(1, this.radius);
        
        if (this.hoverGlow > 0.01) {
            ctx.globalAlpha = this.hoverGlow * 0.8;
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.hoverGlow})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
        grad.addColorStop(0, `rgba(${this.color.r},${this.color.g},${this.color.b},1)`);
        grad.addColorStop(0.6, `rgba(${this.color.r},${this.color.g},${this.color.b},0.6)`);
        grad.addColorStop(1, `rgba(${this.color.r},${this.color.g},${this.color.b},0)`);

        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        
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

    updatePopEffects();
    
    bubbles = bubbles.filter(bubble => {
        const isAlive = bubble.update();
        bubble.draw();
        return isAlive;
    });

    drawPopEffects();
    drawAudioIndicator();

    // Create new bubbles
    if (Math.random() < 0.02) {
        bubbles.push(new Bubble());
    }

    requestAnimationFrame(animate);
}

// Initialize
window.addEventListener('load', () => {
    addAudioInitButton();
    
    // Initialize oneko cat (modified to come closer and pop bubbles)
    (function oneko() {
        const nekoEl = document.createElement("div");
        let nekoPosX = 32;
        let nekoPosY = 32;
        let mousePosX = 0;
        let mousePosY = 0;
        let frameCount = 0;
        let idleTime = 0;
        let idleAnimation = null;
        let idleAnimationFrame = 0;
        const nekoSpeed = 8;
        const spriteSets = {
            idle: [[-3, -3]],
            alert: [[-7, -3]],
            scratch: [
                [-5, 0],
                [-6, 0],
                [-7, 0],
            ],
            tired: [[-3, -2]],
            sleeping: [
                [-2, 0],
                [-2, -1],
            ],
            N: [
                [-1, -2],
                [-1, -3],
            ],
            NE: [
                [0, -2],
                [0, -3],
            ],
            E: [
                [-3, 0],
                [-3, -1],
            ],
            SE: [
                [-5, -1],
                [-5, -2],
            ],
            S: [
                [-6, -3],
                [-7, -2],
            ],
            SW: [
                [-5, -3],
                [-6, -1],
            ],
            W: [
                [-4, -2],
                [-4, -3],
            ],
            NW: [
                [-1, 0],
                [-1, -1],
            ],
        };
        
        // Function to check if cat collides with any bubble
        function checkCatBubbleCollision() {
            const catCenterX = nekoPosX;
            const catCenterY = nekoPosY;
            const catRadius = 16; // Half of cat size
            
            for (let i = bubbles.length - 1; i >= 0; i--) {
                const bubble = bubbles[i];
                const dist = Math.hypot(catCenterX - bubble.x, catCenterY - bubble.y);
                
                // If cat touches bubble, pop it
                if (dist <= catRadius + bubble.radius) {
                    popBubble(i);
                }
            }
        }
        
        function create() {
            nekoEl.id = "oneko";
            nekoEl.style.width = "32px";
            nekoEl.style.height = "32px";
            nekoEl.style.position = "fixed";
            nekoEl.style.backgroundImage = "url('./oneko.gif')";
            nekoEl.style.imageRendering = "pixelated";
            nekoEl.style.left = "16px";
            nekoEl.style.top = "16px";
            nekoEl.style.zIndex = "9999";
            nekoEl.style.pointerEvents = "none";

            document.body.appendChild(nekoEl);

            document.onmousemove = (event) => {
                mousePosX = event.clientX;
                mousePosY = event.clientY;
            };

            window.onekoInterval = setInterval(frame, 100);
        }

        function setSprite(name, frame) {
            const sprite = spriteSets[name][frame % spriteSets[name].length];
            nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${
                sprite[1] * 32
            }px`;
        }

        function resetIdleAnimation() {
            idleAnimation = null;
            idleAnimationFrame = 0;
        }

        function idle() {
            idleTime += 1;

            if (
                idleTime > 10 &&
                Math.floor(Math.random() * 200) == 0 &&
                idleAnimation == null
            ) {
                idleAnimation = ["sleeping", "scratch"][
                    Math.floor(Math.random() * 2)
                ];
            }

            switch (idleAnimation) {
                case "sleeping":
                    if (idleAnimationFrame < 8) {
                        setSprite("tired", 0);
                        break;
                    }
                    setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
                    if (idleAnimationFrame > 192) {
                        resetIdleAnimation();
                    }
                    break;
                case "scratch":
                    setSprite("scratch", idleAnimationFrame);
                    if (idleAnimationFrame > 9) {
                        resetIdleAnimation();
                    }
                    break;
                default:
                    setSprite("idle", 0);
                    return;
            }
            idleAnimationFrame += 1;
        }

        function frame() {
            frameCount += 1;
            
            // Calculate direction to go TOWARD mouse (original oneko behavior)
            const diffX = mousePosX - nekoPosX; // Mouse - cat = direction to mouse
            const diffY = mousePosY - nekoPosY;
            const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

            // Check for bubble collisions before moving
            checkCatBubbleCollision();

            if (distance < nekoSpeed || distance < 48) {
                idle();
                // Still check collisions while idle
                checkCatBubbleCollision();
                return;
            }

            idleAnimation = null;
            idleAnimationFrame = 0;

            if (idleTime > 1) {
                setSprite("alert", 0);
                idleTime = Math.min(idleTime, 7);
                idleTime -= 1;
                return;
            }

            // Move toward mouse
            if (distance > 0) {
                const moveX = (diffX / distance) * nekoSpeed;
                const moveY = (diffY / distance) * nekoSpeed;
                
                nekoPosX += moveX;
                nekoPosY += moveY;
                
                // Determine direction for sprite
                let direction = "";
                if (moveY < -1) direction += "N";
                if (moveY > 1) direction += "S";
                if (moveX < -1) direction += "W";
                if (moveX > 1) direction += "E";
                
                if (direction === "") direction = "idle";
                setSprite(direction, frameCount);
            }

            // Keep cat within canvas bounds
            nekoPosX = Math.max(16, Math.min(canvas.width - 16, nekoPosX));
            nekoPosY = Math.max(16, Math.min(canvas.height - 16, nekoPosY));

            nekoEl.style.left = `${nekoPosX - 16}px`;
            nekoEl.style.top = `${nekoPosY - 16}px`;
            
            // Check for bubble collisions after moving
            checkCatBubbleCollision();
        }

        create();
    })();
    
    // Start with some bubbles
    for (let i = 0; i < 12; i++) {
        setTimeout(() => {
            bubbles.push(new Bubble());
        }, i * 300);
    }
});

animate();

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});