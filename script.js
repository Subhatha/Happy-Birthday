const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const letters = "HAPPY BIRTHDAY!".split("").filter(c => c !== " ");
const letterContainer = document.getElementById('letter-container');

let fireworks = [];
let currentLetterIndex = 0;
let allExploded = false;
let audioUnlocked = false;

// Load firework sound
const fireworkSound = new Audio('/firework.wav');
fireworkSound.volume = 0.3;

// Unlock audio on first user interaction
function unlockAudio() {
  if (!audioUnlocked) {
    fireworkSound.play().then(() => {
      fireworkSound.pause();
      fireworkSound.currentTime = 0;
      audioUnlocked = true;
      console.log('Audio unlocked!');
      window.removeEventListener('click', unlockAudio);
    }).catch(e => {
      console.log('Audio unlock failed:', e);
    });
  }
}
window.addEventListener('click', unlockAudio);

function playFireworkSound() {
  if (!audioUnlocked) return; // don't play before unlock
  const soundClone = fireworkSound.cloneNode();
  soundClone.volume = 0.3;
  soundClone.play();
}

function randomColor() {
  const colors = ['#ff0040', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0040ff', '#8000ff'];
  return colors[Math.floor(Math.random() * colors.length)];
}

class Firework {
  constructor(letter, x, targetY, callback) {
    this.x = x;
    this.y = canvas.height;
    this.targetY = targetY;
    this.color = randomColor();
    this.speed = 15;
    this.trail = [];
    this.letter = letter;
    this.done = false;
    this.callback = callback;
    this.exploded = false;
    this.particles = [];
  }

  update() {
    if (!this.exploded) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 10) this.trail.shift();

      this.y -= this.speed;

      if (this.y <= this.targetY) {
        this.exploded = true;
        this.explode();
        if (this.callback) setTimeout(this.callback, 600);
      }
    } else {
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.015;
      });
      this.particles = this.particles.filter(p => p.alpha > 0);
      if (this.particles.length === 0) this.done = true;
    }
  }

  draw() {
    if (!this.exploded) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + 10);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      this.trail.forEach((pos, idx) => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = (idx / this.trail.length) * 0.6;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    } else {
      this.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }

  explode() {
    playFireworkSound();

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1
      });
    }

    if (this.letter) {
      const letterEl = document.createElement('div');
      letterEl.className = 'letter';
      letterEl.textContent = this.letter;

      letterEl.style.left = `${this.x}px`;
      letterEl.style.top = `${this.y}px`;
      letterContainer.appendChild(letterEl);

      letterEl.style.opacity = 0;
      letterEl.style.transform = 'scale(0.5)';
      setTimeout(() => {
        letterEl.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        letterEl.style.opacity = 1;
        letterEl.style.transform = 'scale(1)';
      }, 50);

      if (currentLetterIndex === letters.length) {
        allExploded = true;
        gatherLetters();
      }
    }
  }
}

function flyAwayLetters() {
  const letterEls = document.querySelectorAll('.letter');
  let index = 0;

  function flyNext() {
    if (index >= letterEls.length) return;
    const letterEl = letterEls[index];
    flyAwayWithBalloon(letterEl);
    index++;
    setTimeout(flyNext, 300);
  }

  flyNext();
}

function flyAwayWithBalloon(letterEl) {
  // Attach balloon element (make sure .balloon is styled in CSS)
  const balloon = document.createElement('div');
  balloon.className = 'balloon';
  letterEl.appendChild(balloon);

  let x = parseFloat(letterEl.style.left);
  let y = parseFloat(letterEl.style.top);
  let opacity = 1;

  // Balloon floats mostly up with slight horizontal sway
  let swayDirection = Math.random() < 0.5 ? -1 : 1;
  let swayAmount = 0;

  const interval = setInterval(() => {
    swayAmount += 0.05;
    x += Math.sin(swayAmount) * 1.5 * swayDirection;
    y -= 2;  // float upward faster
    opacity -= 0.007;

    letterEl.style.left = `${x}px`;
    letterEl.style.top = `${y}px`;
    letterEl.style.opacity = opacity;

    if (opacity <= 0) {
      clearInterval(interval);
      letterEl.remove();
    }
  }, 20);
}

function gatherLetters() {
  const letterEls = document.querySelectorAll('.letter');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const totalWidth = letterEls.length * 30;
  letterEls.forEach((el, i) => {
    const targetX = centerX - totalWidth / 2 + i * 30;
    const targetY = centerY;

    el.style.transition = 'all 1s ease-out';
    el.style.left = `${targetX}px`;
    el.style.top = `${targetY}px`;
  });

  setTimeout(() => {
    // Fireworks anywhere on screen after gathering letters
    startContinuousFireworks(0, canvas.width, 0, canvas.height);
    setTimeout(flyAwayLetters, 1500);
  }, 1200);
}

function startContinuousFireworks(minX, maxX, minY, maxY) {
  function launchBurst() {
    const count = 5 + Math.floor(Math.random() * 6); // 5 to 10 fireworks
    for (let i = 0; i < count; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);

      const fw = new Firework("", x, y, null);
      fw.exploded = true;
      fw.explode();

      fireworks.push(fw);
    }
    // Schedule next burst at random interval 300-1500ms
    const nextDelay = 300 + Math.random() * 1200;
    setTimeout(launchBurst, nextDelay);
  }

  launchBurst();
}


function animate() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  fireworks.forEach((fw, i) => {
    fw.update();
    fw.draw();
    if (fw.done) fireworks.splice(i, 1);
  });

  requestAnimationFrame(animate);
}

const margin = 50;
const spacing = (canvas.width - margin * 2) / (letters.length - 1);
const letterPositionsX = [];
for (let i = 0; i < letters.length; i++) {
  letterPositionsX.push(margin + i * spacing);
}

function launchNextFirework() {
  if (currentLetterIndex >= letters.length) return;

  const letter = letters[currentLetterIndex];
  const x = letterPositionsX[currentLetterIndex];
  const targetY = 100 + Math.random() * (canvas.height / 2 - 100);

  const firework = new Firework(letter, x, targetY, launchNextFirework);
  fireworks.push(firework);
  currentLetterIndex++;
}

function start() {
  animate();
  launchNextFirework();
}

start();
