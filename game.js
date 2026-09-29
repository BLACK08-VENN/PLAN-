'use strict';

const worlds = {
  drive: {
    name: 'The everyday drive', sky: ['#dfeafa', '#b9d0f1'], hill: '#a9bfe6', ground: '#31589c',
    monster: 0, monsterName: 'truck hazard', product: 'Motor Insurance', url: 'https://icealion.co.ke/motor-insurance',
    facts: [
      ['Before the road', 'Check that your motor policy is active and understand its cover, limits and exclusions before you need it.'],
      ['If something happens', 'Record the details and follow the insurer’s claims process. The documents required and what is payable depend on your policy.'],
      ['Choose what fits', 'Motor plans offer different levels of protection. Compare the policy details, including excesses and exclusions.']
    ]
  },
  school: {
    name: 'The school years', sky: ['#e9eefb', '#c9d8f4'], hill: '#bdcbea', ground: '#31589c',
    monster: 1, monsterName: 'germ', product: 'UsomiBora Education Insurance', url: 'https://icealion.co.ke/education-insurance-usomibora-',
    facts: [
      ['Start with a goal', 'Estimate the future education cost and choose contributions you can sustain.'],
      ['Find your rhythm', 'UsomiBora lists monthly, quarterly and annual payment options. Check the current terms before joining.'],
      ['Read the full picture', 'Understand the benefits, life cover, contributions and what happens if payments change.']
    ]
  },
  travel: {
    name: 'The trip away', sky: ['#d9eafb', '#b5d2ef'], hill: '#a6c0e7', ground: '#31589c',
    monster: [0, 2, 0, 2], monsterName: 'truck and storm hazards', product: 'Travel Insurance', url: 'https://icealion.co.ke/travel-insurance',
    facts: [
      ['Before take-off', 'Check the destination, travel dates and policy conditions before you leave.'],
      ['Keep the details', 'If plans are disrupted, keep records and follow the claim steps in your policy.'],
      ['Know your cover', 'Review benefit limits and exclusions, including any relevant activities or medical conditions.']
    ]
  },
  cushion: {
    name: 'The rainy-day fund', sky: ['#e8eefa', '#cbd9f0'], hill: '#becdea', ground: '#31589c',
    monster: 3, monsterName: 'coin gobbler', product: 'Money Market Fund', url: 'https://icealion.co.ke/money-market-fund',
    facts: [
      ['Name the goal', 'Pick a realistic target and a contribution that fits your budget.'],
      ['Look beyond returns', 'Read the fund documents for access rules, fees and risks. Past returns do not promise future results.'],
      ['Review as life changes', 'Check whether the fund still suits your needs and understand its current withdrawal process.']
    ]
  }
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const card = document.getElementById('card');
const soundToggle = document.getElementById('soundToggle');
const keys = { left: false, right: false, jump: false };
const W = window.innerWidth <= 680 ? 480 : 960;
const H = W === 480 ? 570 : 450, GROUND = H - 90, END = 2820;
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = Math.round(W * dpr);
canvas.height = Math.round(H * dpr);
canvas.style.aspectRatio = `${W}/${H}`;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const lionHero = new Image(); lionHero.src = 'lion-hero.webp';
const monsterAtlas = new Image(); monsterAtlas.src = 'monsters.webp';
const environment = new Image(); environment.src = 'environment.webp';
const props = new Image(); props.src = 'props.webp';
const platforms = [
  { x: 340, y: GROUND - 72, w: 160 }, { x: 810, y: GROUND - 85, w: 160 },
  { x: 1270, y: GROUND - 70, w: 170 }, { x: 1730, y: GROUND - 87, w: 160 },
  { x: 2220, y: GROUND - 70, w: 170 }
];
const blocks = [490, 1010, 1810, 2450];
const coinPositions = [190, 280, 370, 440, 575, 690, 850, 930, 1080, 1170, 1330, 1410, 1550, 1660, 1780, 1870, 2020, 2140, 2280, 2370, 2500, 2620]
  .map((x, i) => ({ x, y: i % 4 >= 2 ? GROUND - 113 : GROUND - 75 }));
const stops = [650, 1450, 2250];
const monsterPositions = [760, 1200, 1970, 2580];
let worldKey = null, state = 'menu', camera = 0, stars = 0, last = 0, invulnerable = 0;
let player = { x: 75, y: GROUND - 48, w: 34, h: 48, vx: 0, vy: 0, onGround: true };
let seen = new Set(), collected = new Set(), defeated = new Set(), particles = [];
let soundOn = true, audioContext = null;
const pickupAudio = new Audio('coin-pickup.mp3');
pickupAudio.preload = 'auto';
pickupAudio.volume = .28;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function audio() {
  if (!soundOn) return null;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  } catch { return null; }
}
function tone(freq, duration = .12, volume = .025, type = 'sine', delay = 0) {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime + delay, osc = ac.createOscillator(), gain = ac.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
  osc.connect(gain).connect(ac.destination); osc.start(t); osc.stop(t + duration + .02);
}
function sound(kind) {
  if (kind === 'jump') tone(330, .1, .018);
  if (kind === 'star' && soundOn) {
    if (pickupAudio.readyState >= 2) {
      pickupAudio.currentTime = 0;
      pickupAudio.play().catch(() => { tone(620, .09, .019); tone(850, .13, .016, 'sine', .065); });
    } else { tone(620, .09, .019); tone(850, .13, .016, 'sine', .065); }
  }
  if (kind === 'stomp') { tone(190, .09, .025, 'triangle'); tone(470, .15, .019, 'sine', .07); }
  if (kind === 'bump') tone(160, .1, .012, 'sine');
  if (kind === 'tip') { tone(450, .11, .015); tone(570, .15, .013, 'sine', .1); }
  if (kind === 'finish') [440, 550, 660].forEach((f, i) => tone(f, .2, .021, 'sine', i * .12));
}
soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
  if (!soundOn) { pickupAudio.pause(); pickupAudio.currentTime = 0; }
  soundToggle.textContent = soundOn ? 'Sound on' : 'Sound off';
  soundToggle.setAttribute('aria-pressed', String(soundOn));
  soundToggle.setAttribute('aria-label', soundOn ? 'Mute game sounds' : 'Turn on game sounds');
  if (soundOn) sound('tip');
});

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, onClick, className = 'primary') {
  const node = el('button', text, className);
  node.type = 'button'; node.addEventListener('click', onClick); return node;
}
function show(nodes) { card.replaceChildren(...nodes); overlay.classList.remove('hidden'); }
function hide() { overlay.classList.add('hidden'); }
function progress(n) {
  document.getElementById('fill').style.width = n + '%';
  document.getElementById('progress').setAttribute('aria-valuenow', Math.round(n));
}
function hud() {
  document.getElementById('starCount').textContent = `Stars: ${stars}`;
  document.getElementById('stopCount').textContent = `${3 - seen.size} tips · ${defeated.size}/4 cleared`;
  progress(Math.min(100, player.x / END * 100));
}
function menu() {
  state = 'menu'; worldKey = null; camera = 0;
  document.body.classList.remove('playing');
  player = { x: 75, y: GROUND - 48, w: 34, h: 48, vx: 0, vy: 0, onGround: true };
  document.getElementById('levelName').textContent = 'Choose your journey';
  document.getElementById('starCount').textContent = 'Stars: 0';
  document.getElementById('stopCount').textContent = '3 tips · 4 monsters'; progress(0);
  const choices = el('div', undefined, 'choices');
  Object.entries(worlds).forEach(([key, world]) => choices.append(button(world.name, () => start(key), 'choice')));
  show([el('p', 'PICK A JOURNEY', 'eyebrow'), el('h2', 'Where shall we go?'),
    el('p', 'Move right. Jump on the little monsters to clear them, and collect stars. There is no timer.'), choices]);
}
function start(key) {
  worldKey = key; state = 'playing'; camera = 0; stars = 0; invulnerable = 0;
  document.body.classList.add('playing');
  player = { x: 75, y: GROUND - 48, w: 34, h: 48, vx: 0, vy: 0, onGround: true };
  seen = new Set(); collected = new Set(); defeated = new Set(); particles = [];
  Object.keys(keys).forEach(k => keys[k] = false);
  document.getElementById('levelName').textContent = worlds[key].name;
  audio(); hud(); hide(); sound('tip');
  if (W === 480 && typeof window.scrollTo === 'function') window.scrollTo(0, 0);
}
function discovery(index) {
  state = 'paused'; seen.add(index); hud(); sound('tip');
  const [title, detail] = worlds[worldKey].facts[index];
  show([el('p', `DISCOVERY ${index + 1} OF 3`, 'eyebrow'), el('h2', title),
    el('div', detail, 'note'), button('Keep playing', () => { hide(); state = 'playing'; })]);
}
function finish() {
  state = 'finished'; progress(100); sound('finish');
  const world = worlds[worldKey], row = el('div', undefined, 'actions');
  const link = el('a', 'Explore on ICEA LION', 'primary');
  link.href = world.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  row.append(link, button('Play another', menu, 'secondary'));
  show([el('p', 'YOU REACHED THE FINISH', 'eyebrow'), el('h2', 'You win!'),
    el('p', `You collected ${stars} stars and cleared ${defeated.size} of 4 little monsters.`),
    el('div', 'First-premium discount unlocked! Show this screen to ICEA LION staff to ask about the offer. The discount amount, eligible products and redemption terms are set by ICEA LION.', 'note'),
    el('p', `Interested in ${world.product}? See the product details before deciding.`), row]);
}
function burst(x, y, color) {
  if (reducedMotion) return;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    particles.push({ x, y, vx: Math.cos(angle) * (1.2 + i % 3), vy: Math.sin(angle) * (1.2 + i % 3) - 1.5, life: 28, color });
  }
}
function step(dt) {
  if (state !== 'playing') return;
  const p = player, oldBottom = p.y + p.h, oldX = p.x;
  if (invulnerable > 0) invulnerable -= dt;
  p.vx = (Number(keys.right) - Number(keys.left)) * 4.7;
  if (keys.jump && p.onGround) {
    p.vy = -12.2; p.onGround = false; keys.jump = false; sound('jump');
  }
  p.x = Math.max(8, Math.min(END + 20, p.x + p.vx * dt));
  p.vy = Math.min(14, p.vy + .52 * dt); p.y += p.vy * dt; p.onGround = false;
  if (p.y + p.h >= GROUND && oldBottom <= GROUND + 18 && p.vy >= 0) {
    p.y = GROUND - p.h; p.vy = 0; p.onGround = true;
  }
  for (const platform of platforms) {
    if (p.vy >= 0 && oldBottom <= platform.y + 8 && p.y + p.h >= platform.y && p.x + p.w > platform.x && p.x < platform.x + platform.w) {
      p.y = platform.y - p.h; p.vy = 0; p.onGround = true;
    }
  }
  for (const x of blocks) {
    if (p.x + p.w > x && p.x < x + 38 && p.y + p.h > GROUND - 33 && p.y < GROUND) {
      p.x = oldX <= x ? x - p.w : x + 38; p.vx = 0;
    }
  }
  for (let i = 0; i < monsterPositions.length; i++) {
    if (defeated.has(i)) continue;
    const x = monsterPositions[i], top = GROUND - 47;
    if (p.x + p.w <= x + 5 || p.x >= x + 49 || p.y + p.h <= top + 6 || p.y >= GROUND) continue;
    if (p.vy >= 0 && oldBottom <= top + 17) {
      defeated.add(i); p.y = top - p.h; p.vy = -8.4; p.onGround = false;
      stars += 2; burst(x + 27, top + 24, '#cc8a2c'); sound('stomp'); hud();
    } else if (invulnerable <= 0) {
      p.x = oldX < x ? x - p.w - 4 : x + 54;
      p.vy = -4.5; p.onGround = false; invulnerable = 45; sound('bump');
    }
  }
  if (p.y > H) { p.y = GROUND - p.h; p.vy = 0; p.onGround = true; }
  camera = Math.max(0, Math.min(END - W + 170, p.x - W * .42));
  coinPositions.forEach((coin, i) => {
    if (!collected.has(i) && Math.abs(p.x + p.w / 2 - coin.x) < 29 && Math.abs(p.y + p.h / 2 - coin.y) < 39) {
      collected.add(i); stars++; burst(coin.x, coin.y, '#f2bc50'); sound('star'); hud();
    }
  });
  particles = particles.filter(bit => bit.life > 0);
  particles.forEach(bit => { bit.x += bit.vx * dt; bit.y += bit.vy * dt; bit.vy += .08 * dt; bit.life -= dt; });
  for (let i = 0; i < stops.length; i++) if (p.x >= stops[i] && !seen.has(i)) { discovery(i); return; }
  if (p.x >= END) { finish(); return; }
  hud();
}
function rounded(x, y, w, h, radius, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
}
function gradient(x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
}
function drawPlayer(x, y, t) {
  ctx.fillStyle = '#172d59'; ctx.beginPath(); ctx.ellipse(x + 17, GROUND + 5, 27, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); if (invulnerable > 0 && Math.floor(t / 100) % 2) ctx.globalAlpha = .65;
  ctx.translate(x + 17, y + 20);
  ctx.scale(keys.left && !keys.right ? -1 : 1, 1);
  const bob = reducedMotion || !player.onGround ? 0 : Math.sin(t / 100) * (keys.left || keys.right ? 1.5 : .5);
  if (lionHero.complete && lionHero.naturalWidth) {
    ctx.drawImage(lionHero, -37, -39 + bob, 74, 78);
  } else {
    rounded(-18, -10, 36, 40, 10, gradient(-18, -10, 36, 40, '#e0ad61', '#a06a2a'));
    rounded(-16, 0, 32, 28, 8, '#113885');
  }
  ctx.restore();
}
function drawMonster(x, y, type, t) {
  ctx.fillStyle = '#172d5940'; ctx.beginPath(); ctx.ellipse(x + 27, GROUND + 5, 36, 7, 0, 0, Math.PI * 2); ctx.fill();
  const bob = reducedMotion ? 0 : Math.sin(t / 330 + x) * 2.2;
  if (monsterAtlas.complete && monsterAtlas.naturalWidth) {
    const sw = monsterAtlas.naturalWidth / 2, sh = monsterAtlas.naturalHeight / 2;
    const sx = type % 2 * sw, sy = Math.floor(type / 2) * sh;
    ctx.drawImage(monsterAtlas, sx, sy, sw, sh, x - 13, y - 27 + bob, 80, 78);
  } else {
    rounded(x, y + bob, 54, 46, 18, gradient(x, y, 54, 46, '#5d80bc', '#17367d'));
    rounded(x + 34, y + 13 + bob, 7, 7, 4, '#fff');
  }
}
function draw(time) {
  const world = worlds[worldKey] || worlds.drive;
  ctx.fillStyle = gradient(0, 0, W, H, ...world.sky); ctx.fillRect(0, 0, W, H);
  if (environment.complete && environment.naturalWidth) {
    const sourceWidth = Math.min(environment.naturalWidth, environment.naturalHeight * W / (GROUND + 20));
    const travel = Math.max(1, END - W + 170);
    const sourceX = (environment.naturalWidth - sourceWidth) * Math.max(0, Math.min(1, camera / travel));
    ctx.drawImage(environment, sourceX, 0, sourceWidth, environment.naturalHeight, 0, 0, W, GROUND + 20);
    ctx.fillStyle = '#b6c9ec16'; ctx.fillRect(0, 0, W, GROUND);
  } else {
    for (let i = 0; i < 9; i++) {
      const x = i * 420 - camera * .4 - 160;
      ctx.fillStyle = world.hill; ctx.beginPath(); ctx.ellipse(x, GROUND + 42, 260, 145, 0, Math.PI, 0); ctx.fill();
    }
  }
  ctx.fillStyle = gradient(0, GROUND, W, H - GROUND, '#5577b6', '#123673'); ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#f0ca7a'; ctx.fillRect(0, GROUND, W, 9);
  for (let i = 0; i < Math.ceil(W / 46) + 1; i++) {
    const x = i * 46 - camera % 46;
    ctx.fillStyle = i % 3 ? '#ffffff13' : '#0b27552b';
    ctx.beginPath(); ctx.ellipse(x, GROUND + 28 + i % 2 * 27, 17, 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const a of platforms) {
    const x = a.x - camera; if (x < -a.w || x > W) continue;
    rounded(x + 5, a.y + 8, a.w, 17, 5, '#132c6f63');
    if (props.complete && props.naturalWidth) ctx.drawImage(props, 40, 150, 690, 150, x, a.y - 6, a.w, 35);
    else { rounded(x, a.y, a.w, 20, 6, gradient(x, a.y, a.w, 20, '#e1ad59', '#97611e')); rounded(x, a.y, a.w, 7, 4, '#ffdc91'); }
  }
  for (const block of blocks) {
    const x = block - camera; if (x < -40 || x > W) continue;
    rounded(x + 3, GROUND - 29, 38, 30, 4, '#122d6e65');
    if (props.complete && props.naturalWidth) ctx.drawImage(props, 790, 65, 300, 270, x - 3, GROUND - 40, 44, 40);
    else rounded(x, GROUND - 34, 38, 33, 5, gradient(x, GROUND - 34, 38, 33, '#e2ae60', '#a96c26'));
  }
  for (let i = 0; i < stops.length; i++) {
    const x = stops[i] - camera; if (x < -110 || x > W + 20) continue;
    if (props.complete && props.naturalWidth) ctx.drawImage(props, 756, 392, 287, 334, x - 20, GROUND - 130, 98, 130);
    else { rounded(x + 3, GROUND - 106, 7, 107, 3, '#143374'); rounded(x - 21, GROUND - 123, 95, 42, 9, '#fff8e8'); }
    ctx.fillStyle = '#113885'; ctx.font = 'bold 16px system-ui'; ctx.fillText('IDEA ' + (i + 1), x - 7, GROUND - 96);
  }
  coinPositions.forEach((coin, i) => {
    if (collected.has(i)) return;
    const x = coin.x - camera; if (x < -22 || x > W + 22) return;
    const y = coin.y + (reducedMotion ? 0 : Math.sin(time / 350 + i) * 4);
    if (props.complete && props.naturalWidth) ctx.drawImage(props, 215, 402, 293, 279, x - 18, y - 18, 36, 36);
    else { ctx.fillStyle = '#eeb34e'; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); }
  });
  for (let i = 0; i < monsterPositions.length; i++) {
    if (!defeated.has(i)) {
      const x = monsterPositions[i] - camera;
      if (x > -85 && x < W + 30) drawMonster(x, GROUND - 47, Array.isArray(world.monster) ? world.monster[i] : world.monster, time);
    }
  }
  const flag = END - camera; rounded(flag + 2, GROUND - 174, 9, 174, 4, gradient(flag, GROUND - 174, 9, 174, '#456bad', '#102b67'));
  ctx.fillStyle = gradient(flag, GROUND - 174, 90, 52, '#f8d990', '#bb7820');
  ctx.beginPath(); ctx.moveTo(flag + 10, GROUND - 174); ctx.quadraticCurveTo(flag + 45, GROUND - 186, flag + 92, GROUND - 151);
  ctx.quadraticCurveTo(flag + 52, GROUND - 137, flag + 10, GROUND - 126); ctx.fill();
  rounded(flag - 7, GROUND - 7, 26, 8, 4, '#d5a354');
  for (const bit of particles) {
    ctx.globalAlpha = Math.max(0, bit.life / 28); rounded(bit.x - camera, bit.y, 5, 5, 2, bit.color);
  } ctx.globalAlpha = 1;
  drawPlayer(player.x - camera, player.y, time);
}
function loop(time) {
  const dt = Math.min(2, (time - last) / 16.67 || 1); last = time;
  step(dt); draw(time); requestAnimationFrame(loop);
}
function bindHold(id, key) {
  const b = document.getElementById(id);
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); b.setPointerCapture(e.pointerId); keys[key] = true; b.classList.add('pressed');
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => b.addEventListener(event, () => {
    keys[key] = false; b.classList.remove('pressed');
  }));
}
bindHold('left', 'left'); bindHold('right', 'right'); bindHold('jump', 'jump');
document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w'].includes(key)) e.preventDefault();
  if (key === 'arrowleft' || key === 'a') keys.left = true;
  if (key === 'arrowright' || key === 'd') keys.right = true;
  if (key === 'arrowup' || key === 'w' || key === ' ') keys.jump = true;
});
document.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') keys.left = false;
  if (key === 'arrowright' || key === 'd') keys.right = false;
  if (key === 'arrowup' || key === 'w' || key === ' ') keys.jump = false;
});
window.addEventListener('blur', () => Object.keys(keys).forEach(key => keys[key] = false));
menu(); requestAnimationFrame(loop);
