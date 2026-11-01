/* Hellfire Protocol — game loop, combat, input and HUD. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
  const rand = (min, max) => min + Math.random() * (max - min);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const $ = (id) => document.getElementById(id);

  const canvas = $('game');
  const startScreen = $('start-screen');
  const startButton = $('start-button');
  const hud = $('hud');
  const crosshair = $('crosshair');
  const hitmarker = crosshair.querySelector('.hitmarker');
  const healthValue = $('health-value');
  const healthFill = $('health-fill');
  const heatFill = $('heat-fill');
  const killsValue = $('kills-value');
  const scoreValue = $('score-value');
  const hostileCount = $('hostile-count');
  const waveNumber = $('wave-number');
  const objectiveText = $('objective-text');
  const announcement = $('announcement');
  const annKicker = announcement.querySelector('.ann-kicker');
  const annTitle = announcement.querySelector('.ann-title');
  const toastStack = $('toast-stack');
  const damageFlash = $('damage-flash');
  const healFlash = $('heal-flash');
  const lockHint = $('lock-hint');
  const pauseScreen = $('pause-screen');
  const resumeButton = $('resume-button');
  const pauseQuit = $('pause-quit');
  const endScreen = $('end-screen');
  const endKicker = $('end-kicker');
  const endTitle = $('end-title');
  const endCopy = $('end-copy');
  const endKills = $('end-kills');
  const endScore = $('end-score');
  const endWave = $('end-wave');
  const restartButton = $('restart-button');
  const minimap = $('minimap');
  const joystick = $('joystick');
  const joystickKnob = $('joystick-knob');
  const lookZone = $('look-zone');
  const fireButton = $('fire-button');

  const { MAP_W, spawnPoints, playerStart } = HellWorld;
  const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  const audio = new HellAudio();
  const art = HellArt.build();
  const sprites = HellSprites.build();
  const renderer = new HellWorld.Renderer(canvas, art, sprites);

  const WAVES = [
    ['acolyte', 'acolyte', 'acolyte', 'acolyte'],
    ['acolyte', 'brute', 'acolyte', 'brute'],
    ['brute', 'acolyte', 'brute', 'brute']
  ];

  const ENEMY_TYPES = {
    acolyte: {
      hp: 70,
      speed: 1.32,
      preferred: 6.1,
      windup: 0.32,
      cooldown: [1.35, 2.25],
      damage: 11,
      shots: 1,
      spread: 0,
      score: 100,
      radius: 0.27,
      label: 'EMBER CULTIST'
    },
    brute: {
      hp: 150,
      speed: 1.04,
      preferred: 4.5,
      windup: 0.48,
      cooldown: [1.9, 2.85],
      damage: 14,
      shots: 3,
      spread: 0.12,
      score: 250,
      radius: 0.35,
      label: 'CINDER BRUTE'
    }
  };

  const G = {
    state: 'menu',
    time: 0,
    player: null,
    enemies: [],
    projectiles: [],
    particles: [],
    pickups: [],
    wave: 0,
    kills: 0,
    score: 0,
    waveTransition: false,
    intermission: 0,
    announcementTimer: 0,
    damageFlash: 0,
    healFlash: 0,
    hitMarker: 0,
    lockHintTimer: 0,
    emberTimer: 0,
    lastMapDraw: 0,
    endAt: 0
  };

  const input = {
    keys: new Set(),
    firing: false,
    joyX: 0,
    joyY: 0
  };

  let pointerLockWasActive = false;
  let lastHudState = {};

  function makePlayer() {
    return {
      x: playerStart.x,
      y: playerStart.y,
      angle: playerStart.angle,
      health: 100,
      maxHealth: 100,
      radius: 0.27,
      cooldown: 0,
      heat: 0,
      bob: 0,
      recoil: 0,
      muzzle: 0,
      damageFlash: 0,
      vx: 0,
      vy: 0
    };
  }

  function spawnEnemy(kind, x, y, options = {}) {
    const cfg = ENEMY_TYPES[kind];
    const enemy = {
      kind,
      x,
      y,
      hp: cfg.hp,
      maxHp: cfg.hp,
      radius: cfg.radius,
      anim: rand(0, 4),
      spawn: options.spawn ?? 0.5,
      dead: false,
      deadTimer: 0,
      hitFlash: 0,
      windup: 0,
      attackCooldown: options.initialCooldown ?? rand(cfg.cooldown[0], cfg.cooldown[1]),
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      strafeTimer: rand(0.8, 2.0),
      path: [],
      pathTimer: 0,
      aim: 0
    };
    G.enemies.push(enemy);
    if (enemy.spawn > 0) {
      spawnBurst(x, y, 0.12, 14, ['#ff6b1a', '#ffb23c', '#ff3510'], 1.1, 1.2);
    }
    return enemy;
  }

  function startWave(n) {
    G.wave = n;
    G.waveTransition = false;
    G.intermission = 0;
    G.enemies = G.enemies.filter(e => !e.dead);
    const types = WAVES[n - 1];
    types.forEach((kind, i) => {
      const point = spawnPoints[(n - 1) * 4 + i];
      const jitterX = rand(-0.2, 0.2);
      const jitterY = rand(-0.2, 0.2);
      spawnEnemy(kind, point[0] + jitterX, point[1] + jitterY, {
        spawn: i === 0 ? 0.2 : 0.38 + i * 0.07,
        initialCooldown: i === 0 ? 0.12 : rand(0.75, 1.7)
      });
    });
    showAnnouncement('THE GATE STIRS', `WAVE ${pad(n)}`, 2.1);
    addToast(n === 1 ? 'The congregation is awake' : n === 2 ? 'Something larger is coming' : 'The altar is defended');
    audio.wave();
  }

  function startGame() {
    audio.init();
    G.state = 'playing';
    G.player = makePlayer();
    G.enemies = [];
    G.projectiles = [];
    G.particles = [];
    G.pickups = [];
    G.wave = 0;
    G.kills = 0;
    G.score = 0;
    G.waveTransition = false;
    G.intermission = 0;
    G.damageFlash = 0;
    G.healFlash = 0;
    G.hitMarker = 0;
    G.endAt = 0;
    input.firing = false;
    input.joyX = 0;
    input.joyY = 0;
    toastStack.innerHTML = '';
    startScreen.classList.add('is-gone');
    pauseScreen.classList.add('is-hidden');
    endScreen.classList.add('is-hidden');
    hud.classList.remove('is-hidden');
    crosshair.style.display = '';
    lockHint.classList.remove('is-hidden');
    G.lockHintTimer = 7;
    if (isTouch) lockHint.classList.add('is-hidden');
    startWave(1);
    updateHud(0);
  }

  function initAttract() {
    G.state = 'menu';
    G.player = makePlayer();
    G.player.x = 16.5;
    G.player.y = 21.4;
    G.player.angle = -Math.PI / 2;
    G.enemies = [];
    G.projectiles = [];
    G.pickups = [];
    G.particles = [];
    G.wave = 0;
    G.kills = 0;
    G.score = 0;
    G.waveTransition = false;
    G.intermission = 0;
    G.damageFlash = 0;
    G.healFlash = 0;
    G.hitMarker = 0;
    spawnEnemy('acolyte', 12.1, 15.6, { spawn: 0 });
    spawnEnemy('brute', 20.9, 15.6, { spawn: 0 });
    spawnEnemy('acolyte', 16.5, 12.0, { spawn: 0 });
    for (const e of G.enemies) {
      e.spawn = 0;
      e.attackCooldown = 99;
    }
    hud.classList.add('is-hidden');
    pauseScreen.classList.add('is-hidden');
    endScreen.classList.add('is-hidden');
  }

  function abandonRun() {
    pauseScreen.classList.add('is-hidden');
    endScreen.classList.add('is-hidden');
    startScreen.classList.remove('is-gone');
    input.firing = false;
    initAttract();
  }

  function pauseGame() {
    if (G.state !== 'playing') return;
    G.state = 'paused';
    input.firing = false;
    input.keys.clear();
    pauseScreen.classList.remove('is-hidden');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = 'playing';
    pauseScreen.classList.add('is-hidden');
    lockHint.classList.remove('is-hidden');
    G.lockHintTimer = 4;
    if (!isTouch) lockPointer();
  }

  function endGame(victory) {
    if (G.state === 'dead' || G.state === 'victory') return;
    G.state = victory ? 'victory' : 'dead';
    G.endAt = G.time;
    input.firing = false;
    input.keys.clear();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    endKicker.textContent = victory ? 'SIGNAL CLEAR' : 'SIGNAL LOST';
    endTitle.textContent = victory ? 'GATE SEALED' : 'YOU BURNED';
    endCopy.textContent = victory
      ? 'The congregation is ash. The gate closes behind you. For now.'
      : 'The congregation keeps its gate. The fire keeps your name.';
    endKills.textContent = pad(G.kills);
    endScore.textContent = pad(G.score, 6);
    endWave.textContent = pad(G.wave);
    endScreen.classList.remove('is-hidden');
    if (victory) audio.victory(); else audio.death();
  }

  function showAnnouncement(kicker, title, duration = 2.1) {
    annKicker.textContent = kicker;
    annTitle.textContent = title;
    announcement.classList.add('is-visible');
    G.announcementTimer = duration;
  }

  function addToast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    toastStack.appendChild(el);
    while (toastStack.children.length > 4) toastStack.firstElementChild.remove();
    window.setTimeout(() => {
      el.classList.add('is-leaving');
      window.setTimeout(() => el.remove(), 330);
    }, 2100);
  }

  function spawnBurst(x, y, z, count, colors, speed = 1, lift = 1.4) {
    if (G.particles.length > 360) return;
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(0.15, speed);
      const life = rand(0.35, 1.0);
      G.particles.push({
        x,
        y,
        z: z + rand(-0.04, 0.1),
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        vz: rand(0.15, lift),
        gravity: 2.1,
        life,
        maxLife: life,
        size: rand(0.018, 0.05),
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function spawnMuzzle(x, y, angle) {
    for (let i = 0; i < 4; i++) {
      const a = angle + rand(-0.28, 0.28);
      const s = rand(0.6, 1.7);
      const life = rand(0.08, 0.22);
      G.particles.push({
        x,
        y,
        z: 0.49,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        vz: rand(-0.08, 0.2),
        gravity: 0,
        life,
        maxLife: life,
        size: rand(0.02, 0.05),
        color: i % 2 ? '#ffd56a' : '#ff6b1a'
      });
    }
  }

  function updateParticles(dt) {
    for (const p of G.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= p.gravity * dt;
      if (p.z < 0.03) {
        p.z = 0.03;
        p.vz *= -0.22;
        p.vx *= 0.82;
        p.vy *= 0.82;
      }
    }
    G.particles = G.particles.filter(p => p.life > 0);
  }

  function tryFire() {
    if (G.state !== 'playing') return;
    const p = G.player;
    if (p.cooldown > 0) return;
    p.cooldown = 0.275;
    p.recoil = 1;
    p.muzzle = 0.075;
    p.heat = Math.min(1, p.heat + 0.19);
    const dx = Math.cos(p.angle);
    const dy = Math.sin(p.angle);
    const x = p.x + dx * 0.48;
    const y = p.y + dy * 0.48;
    G.projectiles.push({
      x,
      y,
      vx: dx * 21,
      vy: dy * 21,
      speed: 21,
      damage: 40,
      life: 1.5,
      radius: 0.09,
      hostile: false,
      trail: []
    });
    spawnMuzzle(x, y, p.angle);
    audio.shoot();
  }

  function fireEnemy(enemy) {
    const cfg = ENEMY_TYPES[enemy.kind];
    const p = G.player;
    const lead = 0.16;
    const targetX = p.x + p.vx * lead;
    const targetY = p.y + p.vy * lead;
    const base = Math.atan2(targetY - enemy.y, targetX - enemy.x);
    const pan = clamp((enemy.x - p.x) / 9, -1, 1);
    for (let i = 0; i < cfg.shots; i++) {
      const offset = (i - (cfg.shots - 1) / 2) * cfg.spread;
      const angle = base + offset + rand(-0.025, 0.025);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      G.projectiles.push({
        x: enemy.x + dx * 0.44,
        y: enemy.y + dy * 0.44,
        vx: dx * 5.4,
        vy: dy * 5.4,
        speed: 5.4,
        damage: cfg.damage,
        life: 3.5,
        radius: 0.13,
        hostile: true,
        trail: []
      });
    }
    spawnBurst(enemy.x, enemy.y, 0.5, 7, ['#ff8b28', '#ff4f12', '#ffd369'], 0.7, 0.8);
    audio.enemyShoot(pan);
  }

  function damagePlayer(amount) {
    const p = G.player;
    if (G.state !== 'playing') return;
    p.health = Math.max(0, p.health - amount);
    G.damageFlash = 1;
    audio.hurt();
    spawnBurst(p.x, p.y, 0.42, 8, ['#ff3b14', '#ff7b28', '#8c160a'], 0.8, 1.1);
    if (p.health <= 0) endGame(false);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    const cfg = ENEMY_TYPES[enemy.kind];
    enemy.dead = true;
    enemy.deadTimer = 0.7;
    enemy.hp = 0;
    G.kills++;
    G.score += cfg.score;
    audio.death();
    spawnBurst(enemy.x, enemy.y, 0.55, 26, ['#ffd36a', '#ff6a1a', '#c1270c', '#7d1508'], 1.7, 2.1);
    addToast(`${cfg.label} banished +${cfg.score}`);
    if (G.kills % 3 === 0 || Math.random() < 0.3) dropPickup(enemy.x, enemy.y);
    if (G.enemies.every(e => e.dead) && !G.waveTransition) {
      G.waveTransition = true;
      G.intermission = 1.8;
      showAnnouncement('AREA CLEAR', 'THE GATE TREMBLES', 1.7);
    }
  }

  function dropPickup(x, y) {
    if (!HellWorld.canStand(x, y, 0.2)) return;
    G.pickups.push({ x, y, bob: rand(0, TAU) });
  }

  function updatePlayer(dt) {
    const p = G.player;
    let forward = 0;
    let strafe = 0;
    let turn = 0;

    if (input.keys.has('KeyW')) forward += 1;
    if (input.keys.has('KeyS')) forward -= 1;
    if (input.keys.has('KeyD')) strafe += 1;
    if (input.keys.has('KeyA')) strafe -= 1;
    if (input.keys.has('ArrowUp')) forward += 1;
    if (input.keys.has('ArrowDown')) forward -= 1;
    if (input.keys.has('ArrowRight')) turn += 1;
    if (input.keys.has('ArrowLeft')) turn -= 1;
    forward -= input.joyY;
    strafe += input.joyX;

    const length = Math.hypot(forward, strafe);
    if (length > 1) {
      forward /= length;
      strafe /= length;
    }

    p.angle += turn * 2.35 * dt;
    if (p.angle > Math.PI) p.angle -= TAU;
    if (p.angle < -Math.PI) p.angle += TAU;

    const sprint = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
    const speed = (sprint ? 4.55 : 3.25) * (length > 0.01 ? 1 : 0);
    const dirX = Math.cos(p.angle);
    const dirY = Math.sin(p.angle);
    const rightX = -dirY;
    const rightY = dirX;
    p.vx = (dirX * forward + rightX * strafe) * speed;
    p.vy = (dirY * forward + rightY * strafe) * speed;
    HellWorld.moveEntity(p, p.vx * dt, p.vy * dt, p.radius);

    if (length > 0.01) p.bob += dt * (sprint ? 12 : 8.6);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.recoil = Math.max(0, p.recoil - dt * 7.5);
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.heat = Math.max(0, p.heat - dt * 0.48);

    if (input.firing) tryFire();
  }

  function updateEnemies(dt) {
    const p = G.player;
    for (const e of G.enemies) {
      e.anim += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.spawn > 0) {
        e.spawn -= dt;
        continue;
      }
      if (e.dead) {
        e.deadTimer -= dt;
        continue;
      }

      const cfg = ENEMY_TYPES[e.kind];
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      const aim = Math.atan2(dy, dx);
      e.aim = aim;
      const los = HellWorld.lineOfSight(e.x, e.y, p.x, p.y);

      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) fireEnemy(e);
        continue;
      }

      let moveX = 0;
      let moveY = 0;
      const direct = los && dist < 10;

      if (direct) {
        if (dist > cfg.preferred + 1.2) {
          moveX += dx / dist;
          moveY += dy / dist;
        } else if (dist < cfg.preferred - 1.1) {
          moveX -= dx / dist;
          moveY -= dy / dist;
        } else {
          e.strafeTimer -= dt;
          if (e.strafeTimer <= 0) {
            e.strafeDir *= -1;
            e.strafeTimer = rand(0.8, 2.0);
          }
          moveX += -Math.sin(aim) * e.strafeDir * 0.72;
          moveY += Math.cos(aim) * e.strafeDir * 0.72;
        }
      } else {
        e.pathTimer -= dt;
        if (e.pathTimer <= 0) {
          e.path = HellWorld.findPath(e.x, e.y, p.x, p.y);
          e.pathTimer = rand(0.42, 0.68);
        }
        if (e.path.length) {
          const next = e.path[0];
          const ndx = next.x - e.x;
          const ndy = next.y - e.y;
          const ndist = Math.hypot(ndx, ndy);
          if (ndist < 0.28) e.path.shift();
          else {
            moveX += ndx / ndist;
            moveY += ndy / ndist;
          }
        } else {
          moveX += dx / Math.max(0.001, dist);
          moveY += dy / Math.max(0.001, dist);
        }
      }

      const moveLength = Math.hypot(moveX, moveY);
      if (moveLength > 0.01) {
        moveX /= moveLength;
        moveY /= moveLength;
        HellWorld.moveEntity(e, moveX * cfg.speed * dt, moveY * cfg.speed * dt, e.radius);
      }

      if (los && dist < 12) {
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) {
          e.windup = cfg.windup;
          e.attackCooldown = rand(cfg.cooldown[0], cfg.cooldown[1]);
          spawnBurst(e.x, e.y, 0.55, 5, ['#ff8b28', '#ffd369'], 0.4, 0.5);
        }
      }
    }

    // Keep the congregation from stacking into one body.
    for (let i = 0; i < G.enemies.length; i++) {
      const a = G.enemies[i];
      if (a.dead || a.spawn > 0) continue;
      for (let j = i + 1; j < G.enemies.length; j++) {
        const b = G.enemies[j];
        if (b.dead || b.spawn > 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.radius + b.radius + 0.25;
        if (d > 0.001 && d < min) {
          const push = (min - d) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          HellWorld.moveEntity(a, -nx * push, -ny * push, a.radius);
          HellWorld.moveEntity(b, nx * push, ny * push, b.radius);
        }
      }
    }

    G.enemies = G.enemies.filter(e => !(e.dead && e.deadTimer <= 0));
  }

  function updateProjectiles(dt) {
    for (const p of G.projectiles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.pop();

      const steps = Math.max(1, Math.ceil((p.speed * dt) / 0.11));
      const stepX = p.vx * dt / steps;
      const stepY = p.vy * dt / steps;
      for (let i = 0; i < steps; i++) {
        p.x += stepX;
        p.y += stepY;
        if (HellWorld.solidAt(p.x, p.y)) {
          spawnBurst(p.x, p.y, 0.5, 7, p.hostile ? ['#ff7a1f', '#ffb642', '#8d1b08'] : ['#ffd36a', '#ff6b1a', '#c52a0c'], 0.8, 0.8);
          p.life = 0;
          break;
        }
        if (p.hostile) {
          const dx = p.x - G.player.x;
          const dy = p.y - G.player.y;
          if (dx * dx + dy * dy < 0.32 * 0.32) {
            damagePlayer(p.damage);
            spawnBurst(p.x, p.y, 0.5, 8, ['#ff3b14', '#ff7b28'], 0.7, 0.8);
            p.life = 0;
            break;
          }
        } else {
          let hit = false;
          for (const e of G.enemies) {
            if (e.dead || e.spawn > 0) continue;
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            if (dx * dx + dy * dy < 0.36 * 0.36) {
              e.hp -= p.damage;
              e.hitFlash = 0.22;
              G.hitMarker = 0.13;
              G.score += 10;
              audio.hit();
              spawnBurst(p.x, p.y, 0.55, 8, ['#ffd36a', '#ff6b1a', '#fff0a0'], 0.9, 0.9);
              if (e.hp <= 0) killEnemy(e);
              p.life = 0;
              hit = true;
              break;
            }
          }
          if (hit) break;
        }
      }
    }
    G.projectiles = G.projectiles.filter(p => p.life > 0);
  }

  function updatePickups(dt) {
    const p = G.player;
    G.pickups = G.pickups.filter(item => {
      const dx = item.x - p.x;
      const dy = item.y - p.y;
      if (dx * dx + dy * dy < 0.48 * 0.48) {
        p.health = Math.min(p.maxHealth, p.health + 18);
        G.healFlash = 1;
        G.score += 50;
        audio.pickup();
        spawnBurst(item.x, item.y, 0.45, 12, ['#ffd36a', '#ff9a2e', '#fff0a0'], 0.8, 1.2);
        addToast('Soul ember +18 vitals');
        return false;
      }
      return true;
    });
  }

  function updateWave(dt) {
    if (!G.waveTransition) return;
    G.intermission -= dt;
    if (G.intermission > 0) return;
    if (G.wave >= WAVES.length) endGame(true);
    else startWave(G.wave + 1);
  }

  function update(dt) {
    if (G.state !== 'playing') return;
    G.damageFlash = Math.max(0, G.damageFlash - dt * 2.6);
    G.healFlash = Math.max(0, G.healFlash - dt * 2.2);
    G.hitMarker = Math.max(0, G.hitMarker - dt);
    G.lockHintTimer = Math.max(0, G.lockHintTimer - dt);
    if (G.lockHintTimer <= 0) lockHint.classList.add('is-hidden');

    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePickups(dt);
    updateParticles(dt);
    updateWave(dt);
  }

  function updateAttract(dt) {
    G.player.angle = -Math.PI / 2 + Math.sin(G.time * 0.14) * 0.055;
    G.player.x = 16.5 + Math.sin(G.time * 0.09) * 0.3;
    G.player.y = 21.4;
    for (const e of G.enemies) {
      e.anim += dt;
      e.spawn = Math.max(0, e.spawn - dt);
    }
    updateParticles(dt);
  }

  function updateAmbient(dt) {
    G.emberTimer -= dt;
    if (G.emberTimer > 0) return;
    G.emberTimer = rand(0.12, 0.34);
    const b = HellWorld.brazierPositions[Math.floor(Math.random() * HellWorld.brazierPositions.length)];
    const life = rand(0.7, 1.5);
    G.particles.push({
      x: b.x + rand(-0.28, 0.28),
      y: b.y + rand(-0.28, 0.28),
      z: rand(0.35, 0.8),
      vx: rand(-0.08, 0.08),
      vy: rand(-0.08, 0.08),
      vz: rand(0.25, 0.65),
      gravity: -0.04,
      life,
      maxLife: life,
      size: rand(0.012, 0.028),
      color: Math.random() < 0.5 ? '#ff7a22' : '#ffc04a'
    });
  }

  function updateHud(dt) {
    if (G.state === 'menu' || !G.player) return;
    const p = G.player;
    const health = Math.round(p.health);
    if (lastHudState.health !== health) {
      healthValue.textContent = health;
      healthValue.classList.toggle('is-low', health <= 30);
      healthFill.style.transform = `scaleX(${clamp(p.health / p.maxHealth, 0, 1)})`;
      lastHudState.health = health;
    }
    const heat = Math.round(p.heat * 100);
    if (lastHudState.heat !== heat) {
      heatFill.style.transform = `scaleX(${clamp(p.heat, 0, 1)})`;
      lastHudState.heat = heat;
    }
    const alive = G.enemies.filter(e => !e.dead).length;
    if (lastHudState.alive !== alive) {
      hostileCount.textContent = `${alive} HOSTILE${alive === 1 ? '' : 'S'}`;
      lastHudState.alive = alive;
    }
    if (lastHudState.kills !== G.kills) {
      killsValue.textContent = pad(G.kills);
      lastHudState.kills = G.kills;
    }
    if (lastHudState.score !== G.score) {
      scoreValue.textContent = pad(G.score, 6);
      lastHudState.score = G.score;
    }
    if (lastHudState.wave !== G.wave) {
      waveNumber.textContent = `WAVE ${pad(G.wave)}`;
      lastHudState.wave = G.wave;
    }
    const objective = G.waveTransition ? 'Hold position' : `Purge the cult · ${G.kills}/12`;
    if (lastHudState.objective !== objective) {
      objectiveText.textContent = objective;
      lastHudState.objective = objective;
    }

    damageFlash.style.opacity = (G.damageFlash * 0.9).toFixed(2);
    healFlash.style.opacity = (G.healFlash * 0.75).toFixed(2);
    hitmarker.classList.toggle('is-hit', G.hitMarker > 0);

    if (G.announcementTimer > 0) {
      G.announcementTimer -= dt;
      if (G.announcementTimer <= 0) announcement.classList.remove('is-visible');
    }

    if (G.time - G.lastMapDraw > 0.075) {
      renderer.drawMinimap(minimap, G);
      G.lastMapDraw = G.time;
    }
  }

  function updateEnd(dt) {
    updateParticles(dt);
    G.damageFlash = Math.max(0, G.damageFlash - dt * 2.6);
    G.healFlash = Math.max(0, G.healFlash - dt * 2.2);
    damageFlash.style.opacity = (G.damageFlash * 0.9).toFixed(2);
    healFlash.style.opacity = (G.healFlash * 0.75).toFixed(2);
  }

  let lastTime = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    G.time += dt;

    if (G.state === 'playing') update(dt);
    else if (G.state === 'menu') updateAttract(dt);
    else if (G.state === 'paused') updateParticles(dt);
    else updateEnd(dt);

    updateAmbient(dt);
    renderer.render(G);
    updateHud(dt);
  }

  function lockPointer() {
    if (isTouch) return;
    if (document.pointerLockElement === canvas) return;
    try {
      const result = canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      // Pointer lock is a convenience; the game still renders if it is denied.
    }
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (G.state === 'playing') pauseGame();
      else if (G.state === 'paused') resumeGame();
      return;
    }
    if (event.code === 'Space') {
      if (G.state === 'playing') {
        event.preventDefault();
        input.firing = true;
        tryFire();
      }
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    input.keys.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
    if (event.code === 'Space') input.firing = false;
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    input.firing = false;
  });

  window.addEventListener('mousemove', (event) => {
    if (G.state !== 'playing') return;
    if (document.pointerLockElement !== canvas) return;
    G.player.angle += event.movementX * 0.00215;
    if (G.player.angle > Math.PI) G.player.angle -= TAU;
    if (G.player.angle < -Math.PI) G.player.angle += TAU;
  });

  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || G.state !== 'playing' || isTouch) return;
    event.preventDefault();
    audio.init();
    if (!isTouch && document.pointerLockElement !== canvas) lockPointer();
    input.firing = true;
    tryFire();
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.firing = false;
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      pointerLockWasActive = true;
      lockHint.classList.add('is-hidden');
    } else if (pointerLockWasActive) {
      pointerLockWasActive = false;
      if (G.state === 'playing') pauseGame();
    }
  });

  // Touch joystick.
  let joystickPointer = null;
  function moveJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const max = rect.width * 0.34;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = dx / length * max;
      dy = dy / length * max;
    }
    input.joyX = dx / max;
    input.joyY = dy / max;
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  joystick.addEventListener('pointerdown', (event) => {
    joystickPointer = event.pointerId;
    try { joystick.setPointerCapture(event.pointerId); } catch {}
    moveJoystick(event);
    event.preventDefault();
  });

  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== joystickPointer) return;
    moveJoystick(event);
    event.preventDefault();
  });

  function releaseJoystick(event) {
    if (event.pointerId !== joystickPointer) return;
    joystickPointer = null;
    input.joyX = 0;
    input.joyY = 0;
    joystickKnob.style.transform = '';
  }
  joystick.addEventListener('pointerup', releaseJoystick);
  joystick.addEventListener('pointercancel', releaseJoystick);

  // Touch look.
  let lookPointer = null;
  let lookLastX = 0;
  lookZone.addEventListener('pointerdown', (event) => {
    if (G.state !== 'playing') return;
    lookPointer = event.pointerId;
    lookLastX = event.clientX;
    try { lookZone.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });
  lookZone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookPointer || G.state !== 'playing') return;
    const dx = event.clientX - lookLastX;
    lookLastX = event.clientX;
    G.player.angle += dx * 0.0065;
    if (G.player.angle > Math.PI) G.player.angle -= TAU;
    if (G.player.angle < -Math.PI) G.player.angle += TAU;
    event.preventDefault();
  });
  function releaseLook(event) {
    if (event.pointerId === lookPointer) lookPointer = null;
  }
  lookZone.addEventListener('pointerup', releaseLook);
  lookZone.addEventListener('pointercancel', releaseLook);

  fireButton.addEventListener('pointerdown', (event) => {
    if (G.state !== 'playing') return;
    audio.init();
    input.firing = true;
    fireButton.classList.add('is-firing');
    tryFire();
    event.preventDefault();
    event.stopPropagation();
  });
  function releaseFire(event) {
    input.firing = false;
    fireButton.classList.remove('is-firing');
    if (event) event.preventDefault();
  }
  fireButton.addEventListener('pointerup', releaseFire);
  fireButton.addEventListener('pointercancel', releaseFire);
  fireButton.addEventListener('pointerleave', releaseFire);

  startButton.addEventListener('click', () => {
    audio.init();
    startGame();
  });

  restartButton.addEventListener('click', () => {
    audio.init();
    startGame();
  });

  resumeButton.addEventListener('click', resumeGame);
  pauseQuit.addEventListener('click', abandonRun);

  // A small read-only handle is useful for tuning and automated playtests.
  window.__hellfire = { game: G, renderer, input, killEnemy, startWave, endGame };

  // Kick off the attract-mode scene behind the title card.
  initAttract();
  requestAnimationFrame(frame);
})();
