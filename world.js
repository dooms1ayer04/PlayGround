/* World generation, collision, raycasting and first-person rendering. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const MAP_W = 32;
  const MAP_H = 32;
  const PLANE = Math.tan((78 * Math.PI / 180) / 2);
  const EYE = 0.5;
  const clamp = (v, min, max) => v < min ? min : v > max ? max : v;

  function createMap() {
    const map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(1));

    function carve(x1, y1, x2, y2) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) map[y][x] = 0;
      }
    }

    // Three chambers, joined by short throat corridors.
    carve(2, 2, 29, 8);
    carve(2, 10, 29, 22);
    carve(2, 24, 29, 30);
    carve(13, 9, 18, 9);
    carve(13, 23, 18, 23);

    function wall(x, y, type) {
      if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) map[y][x] = type;
    }

    // Pillars and cover.
    for (const [x, y] of [[6, 13], [7, 13], [6, 14], [7, 14], [24, 13], [25, 13], [24, 14], [25, 14], [6, 19], [7, 19], [6, 20], [7, 20], [24, 19], [25, 19], [24, 20], [25, 20]]) wall(x, y, 2);
    for (const [x, y] of [[11, 16], [12, 16], [20, 16], [21, 16]]) wall(x, y, 2);

    // Rune altar wall at the far end of the arena.
    for (const [x, y] of [[14, 10], [15, 10], [16, 10], [17, 10], [14, 8], [17, 8], [14, 2], [15, 2], [16, 2], [17, 2]]) wall(x, y, 3);

    return map;
  }

  const map = createMap();

  const spawnPoints = [
    [16.5, 12.5],
    [9.0, 16.0],
    [23.0, 16.0],
    [16.5, 7.0],
    [16.5, 10.5],
    [9.0, 16.0],
    [23.0, 16.0],
    [16.5, 7.0],
    [16.5, 12.5],
    [9.0, 6.0],
    [23.0, 6.0],
    [16.5, 7.0]
  ];

  const brazierPositions = [
    { x: 12.3, y: 15.2 },
    { x: 20.7, y: 15.2 },
    { x: 8.6, y: 6.0 },
    { x: 23.4, y: 6.0 }
  ];

  const playerStart = { x: 16.5, y: 21.0, angle: -Math.PI / 2 };

  function solidAt(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
    return map[Math.floor(y)][Math.floor(x)] !== 0;
  }

  function wallAt(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 1;
    return map[Math.floor(y)][Math.floor(x)];
  }

  function canStand(x, y, radius) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      if (solidAt(x + Math.cos(a) * radius, y + Math.sin(a) * radius)) return false;
    }
    return true;
  }

  function moveEntity(entity, dx, dy, radius) {
    if (canStand(entity.x + dx, entity.y, radius)) entity.x += dx;
    if (canStand(entity.x, entity.y + dy, radius)) entity.y += dy;
  }

  function lineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 0.075);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (solidAt(x1 + dx * t, y1 + dy * t)) return false;
    }
    return true;
  }

  const DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  function findPath(sx, sy, tx, ty) {
    const startX = Math.floor(sx);
    const startY = Math.floor(sy);
    const targetX = Math.floor(tx);
    const targetY = Math.floor(ty);
    if (startX === targetX && startY === targetY) return [];
    if (solidAt(targetX + 0.5, targetY + 0.5)) return [];

    const total = MAP_W * MAP_H;
    const visited = new Uint8Array(total);
    const parent = new Int16Array(total);
    parent.fill(-1);
    const queue = new Int16Array(total);
    let head = 0;
    let tail = 0;
    const startIndex = startY * MAP_W + startX;
    const targetIndex = targetY * MAP_W + targetX;
    queue[tail++] = startIndex;
    visited[startIndex] = 1;

    while (head < tail) {
      const current = queue[head++];
      if (current === targetIndex) break;
      const cx = current % MAP_W;
      const cy = (current / MAP_W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const index = ny * MAP_W + nx;
        if (visited[index] || solidAt(nx + 0.5, ny + 0.5)) continue;
        if (dx !== 0 && dy !== 0) {
          if (solidAt(cx + dx + 0.5, cy + 0.5) || solidAt(cx + 0.5, cy + dy + 0.5)) continue;
        }
        visited[index] = 1;
        parent[index] = current;
        queue[tail++] = index;
      }
    }

    if (!visited[targetIndex]) return [];
    const cells = [];
    let node = targetIndex;
    while (node !== startIndex && node >= 0) {
      cells.push({ x: (node % MAP_W) + 0.5, y: ((node / MAP_W) | 0) + 0.5 });
      node = parent[node];
    }
    cells.reverse();
    return cells;
  }

  class Renderer {
    constructor(canvas, art, sprites) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.art = art;
      this.sprites = sprites;
      this.W = 0;
      this.H = 0;
      this.frame = null;
      this.frame32 = null;
      this.zbuf = null;
      this.resize = this.resize.bind(this);
      this.resize();
      window.addEventListener('resize', this.resize);
    }

    resize() {
      const cssW = Math.max(1, window.innerWidth);
      const cssH = Math.max(1, window.innerHeight);
      const aspect = cssH / cssW;
      // Keep the software-rendered pixel count sane on phones and laptops.
      const targetPixels = 230000;
      let W = Math.round(Math.sqrt(targetPixels / aspect));
      W = clamp(W, 300, 820);
      const H = Math.round(W * aspect);
      if (W === this.W && H === this.H) return;
      this.W = W;
      this.H = H;
      this.canvas.width = W;
      this.canvas.height = H;
      this.frame = this.ctx.createImageData(W, H);
      this.frame32 = new Uint32Array(this.frame.data.buffer);
      this.zbuf = new Float32Array(W);
      this.ctx.imageSmoothingEnabled = false;
    }

    renderFloorAndCeiling(px, py, dirX, dirY, planeX, planeY) {
      const W = this.W;
      const H = this.H;
      const half = H * 0.5;
      const data = this.frame32;
      const floorShades = this.art.floorShades;
      const ceilingShades = this.art.ceilingShades;
      const rayDirX0 = dirX - planeX;
      const rayDirY0 = dirY - planeY;
      const rayDirX1 = dirX + planeX;
      const rayDirY1 = dirY + planeY;
      const dark = 0xff0a0609;

      for (let y = 0; y < H; y++) {
        const isCeiling = y < half;
        const p = isCeiling ? half - y : y - half;
        const base = y * W;
        if (p < 0.7) {
          for (let x = 0; x < W; x++) data[base + x] = dark;
          continue;
        }

        const rowDistance = half / p;
        const stepX = rowDistance * (rayDirX1 - rayDirX0) / W;
        const stepY = rowDistance * (rayDirY1 - rayDirY0) / W;
        let fx = px + rowDistance * rayDirX0;
        let fy = py + rowDistance * rayDirY0;
        const shade = clamp(Math.round(15 - rowDistance * 1.18 - (isCeiling ? 1 : 0)), 0, 15);
        const texture = isCeiling ? ceilingShades[shade] : floorShades[shade];

        for (let x = 0; x < W; x++) {
          const tx = ((fx * 64) | 0) & 63;
          const ty = ((fy * 64) | 0) & 63;
          data[base + x] = texture[(ty << 6) + tx];
          fx += stepX;
          fy += stepY;
        }
      }

    }

    renderWalls(px, py, dirX, dirY, planeX, planeY) {
      const W = this.W;
      const H = this.H;
      const data = this.frame32;
      const zbuf = this.zbuf;
      const shades = this.art.wallShadesPixels;
      const half = H * 0.5;

      for (let x = 0; x < W; x++) {
        const cameraX = (2 * x) / W - 1;
        const rayDirX = dirX + planeX * cameraX;
        const rayDirY = dirY + planeY * cameraX;

        let mapX = Math.floor(px);
        let mapY = Math.floor(py);
        const deltaX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
        const deltaY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);
        let stepX;
        let stepY;
        let sideDistX;
        let sideDistY;

        if (rayDirX < 0) {
          stepX = -1;
          sideDistX = (px - mapX) * deltaX;
        } else {
          stepX = 1;
          sideDistX = (mapX + 1 - px) * deltaX;
        }
        if (rayDirY < 0) {
          stepY = -1;
          sideDistY = (py - mapY) * deltaY;
        } else {
          stepY = 1;
          sideDistY = (mapY + 1 - py) * deltaY;
        }

        let hit = 0;
        let side = 0;
        let tile = 1;
        let guard = 0;
        while (!hit && guard++ < 80) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaX;
            mapX += stepX;
            side = 0;
          } else {
            sideDistY += deltaY;
            mapY += stepY;
            side = 1;
          }
          if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) {
            hit = 1;
            tile = 1;
          } else if (map[mapY][mapX] !== 0) {
            hit = 1;
            tile = map[mapY][mapX];
          }
        }

        if (!hit) {
          zbuf[x] = 1e9;
          continue;
        }

        const perp = side === 0
          ? (mapX - px + (1 - stepX) / 2) / rayDirX
          : (mapY - py + (1 - stepY) / 2) / rayDirY;
        const distance = Math.max(0.0001, perp);
        zbuf[x] = distance;

        const lineHeight = H / distance;
        const drawStart = half - lineHeight * 0.5;
        let wallX = side === 0 ? py + distance * rayDirY : px + distance * rayDirX;
        wallX -= Math.floor(wallX);
        let texX = Math.floor(wallX * 64);
        if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) texX = 63 - texX;
        texX = clamp(texX, 0, 63);

        let level = clamp(Math.round(15 - distance * 1.04 - (side ? 1 : 0)), 0, 15);
        const texture = shades[clamp(tile - 1, 0, 2)][level];
        const yStart = Math.max(0, Math.floor(drawStart));
        const yEnd = Math.min(H, Math.ceil(drawStart + lineHeight));
        const texStep = 64 / lineHeight;
        let texY = (yStart - drawStart) * texStep;
        for (let y = yStart; y < yEnd; y++) {
          const row = (((texY | 0) & 63) << 6);
          data[y * W + x] = texture[row + texX];
          texY += texStep;
        }
      }
    }

    project(x, y, px, py, dirX, dirY, planeX, planeY, invDet) {
      const dx = x - px;
      const dy = y - py;
      const tx = invDet * (dirY * dx - dirX * dy);
      const ty = invDet * (-planeY * dx + planeX * dy);
      return { tx, ty, screenX: (this.W * 0.5) * (1 + tx / ty) };
    }

    collectRenderables(game, px, py, dirX, dirY, planeX, planeY, invDet) {
      const items = [];
      const add = (kind, x, y, data, minDepth = 0.08) => {
        const p = this.project(x, y, px, py, dirX, dirY, planeX, planeY, invDet);
        if (p.ty > minDepth) items.push({ kind, x, y, ...p, data });
      };

      for (const b of brazierPositions) add('brazier', b.x, b.y, b);
      for (const e of game.enemies) add('enemy', e.x, e.y, e);
      for (const p of game.pickups) add('pickup', p.x, p.y, p);
      for (const p of game.projectiles) add('projectile', p.x, p.y, p, 0.7);

      items.sort((a, b) => b.ty - a.ty);
      return items;
    }

    drawSpriteRuns(image, startX, endX, drawTop, drawHeight, depth, alpha = 1) {
      const W = this.W;
      const zbuf = this.zbuf;
      const left = Math.max(0, Math.floor(startX));
      const right = Math.min(W, Math.ceil(endX));
      if (right <= left || drawHeight <= 0) return;
      const spriteWidth = endX - startX;
      const ctx = this.ctx;
      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha;

      let runStart = -1;
      for (let x = left; x <= right; x++) {
        const visible = x < right && zbuf[x] > depth;
        if (visible && runStart < 0) runStart = x;
        if (!visible && runStart >= 0) {
          this.drawSpriteRun(image, runStart, x, startX, spriteWidth, drawTop, drawHeight);
          runStart = -1;
        }
      }
      if (runStart >= 0) this.drawSpriteRun(image, runStart, right, startX, spriteWidth, drawTop, drawHeight);
      ctx.globalAlpha = previousAlpha;
    }

    drawSpriteRun(image, runStart, runEnd, startX, spriteWidth, drawTop, drawHeight) {
      const sourceX = clamp(((runStart - startX) / spriteWidth) * image.width, 0, image.width - 1);
      const sourceW = Math.max(0.001, ((runEnd - runStart) / spriteWidth) * image.width);
      this.ctx.drawImage(image, sourceX, 0, sourceW, image.height, runStart, drawTop, runEnd - runStart, drawHeight);
    }

    screenGlow(x, y, radius, inner, outer) {
      if (radius <= 0) return;
      const ctx = this.ctx;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, inner);
      grad.addColorStop(1, outer);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    renderEnemy(item, game) {
      const e = item.data;
      const set = this.sprites.enemies[e.kind];
      const frame = Math.floor(e.anim * 7) % 4;
      const image = set.frames[frame];
      const H = this.H;
      const worldHeight = e.kind === 'brute' ? 2.0 : 1.7;
      let drawHeight = (H / item.ty) * worldHeight;
      let alpha = 1;
      let drawTop;
      const feetY = H * 0.5 + (H * 0.5) / item.ty;

      if (e.spawn > 0) {
        alpha = clamp(1 - e.spawn / 0.55, 0, 1);
        drawHeight *= 0.82 + alpha * 0.18;
      }
      if (e.dead) {
        alpha = clamp(e.deadTimer / 0.7, 0, 1);
        drawHeight *= 0.85 + alpha * 0.15;
      }
      drawTop = feetY - drawHeight;
      const drawWidth = drawHeight * (image.width / image.height);
      const startX = item.screenX - drawWidth * 0.5;
      const endX = startX + drawWidth;

      if (e.spawn > 0) {
        const ring = clamp(e.spawn / 0.55, 0, 1);
        const ringW = drawWidth * (1.1 - ring * 0.2);
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.strokeStyle = `rgba(255, 91, 19, ${ring * 0.8})`;
        this.ctx.lineWidth = Math.max(1, H * 0.004);
        this.ctx.beginPath();
        this.ctx.ellipse(item.screenX, feetY, ringW * 0.55, ringW * 0.12, 0, 0, TAU);
        this.ctx.stroke();
        this.ctx.restore();
      }

      if (alpha > 0.02) {
        if (!e.dead && e.windup > 0) {
          const pulse = 0.82 + Math.sin(game.time * 28 + e.x) * 0.18;
          this.screenGlow(item.screenX, drawTop + drawHeight * 0.52, drawWidth * 1.08, `rgba(255, 118, 28, ${0.3 * pulse})`, 'rgba(255, 58, 10, 0)');
        }
        this.screenGlow(item.screenX, drawTop + drawHeight * 0.48, drawWidth * 0.9, 'rgba(255, 75, 14, 0.16)', 'rgba(255, 58, 10, 0)');
        this.drawSpriteRuns(image, startX, endX, drawTop, drawHeight, item.ty, alpha);
        if (e.hitFlash > 0 && !e.dead) {
          this.drawSpriteRuns(set.flashes[frame], startX, endX, drawTop, drawHeight, item.ty, alpha * e.hitFlash * 0.9);
        }
      }

      if (!e.dead && e.spawn <= 0 && e.hp < e.maxHp) {
        const barW = Math.min(this.W * 0.1, drawWidth * 0.74);
        const barX = item.screenX - barW * 0.5;
        const barY = drawTop - Math.max(4, H * 0.008);
        this.ctx.fillStyle = 'rgba(4, 2, 3, 0.82)';
        this.ctx.fillRect(barX - 1, barY - 1, barW + 2, 4);
        this.ctx.fillStyle = e.kind === 'brute' ? '#ff4f16' : '#ff9a2e';
        this.ctx.fillRect(barX, barY, barW * clamp(e.hp / e.maxHp, 0, 1), 2);
      }
    }

    renderBrazier(item, game) {
      const frame = Math.floor(game.time * 9 + item.x * 0.7) % 4;
      const image = this.sprites.braziers[frame];
      const H = this.H;
      const drawHeight = (H / item.ty) * 1.08;
      const feetY = H * 0.5 + (H * 0.5) / item.ty;
      const drawTop = feetY - drawHeight;
      const drawWidth = drawHeight * (image.width / image.height);
      const startX = item.screenX - drawWidth * 0.5;
      const endX = startX + drawWidth;
      this.screenGlow(item.screenX, drawTop + drawHeight * 0.36, drawWidth * 1.25, 'rgba(255, 98, 24, 0.2)', 'rgba(255, 51, 8, 0)');
      this.drawSpriteRuns(image, startX, endX, drawTop, drawHeight, item.ty, 1);
    }

    renderPickup(item, game) {
      const frame = Math.floor(game.time * 8) % 4;
      const image = this.sprites.pickups[frame];
      const H = this.H;
      const z = 0.25 + Math.sin(game.time * 2.2 + item.x) * 0.05;
      const screenY = H * 0.5 + (EYE - z) * H / item.ty;
      const drawHeight = (H / item.ty) * 0.48;
      const drawWidth = drawHeight * (image.width / image.height);
      this.screenGlow(item.screenX, screenY, drawWidth * 1.1, 'rgba(255, 183, 65, 0.22)', 'rgba(255, 80, 14, 0)');
      this.drawSpriteRuns(image, item.screenX - drawWidth * 0.5, item.screenX + drawWidth * 0.5, screenY - drawHeight * 0.5, drawHeight, item.ty, 1);
    }

    renderProjectile(item, game) {
      const p = item.data;
      const H = this.H;
      const z = 0.52;
      const screenY = H * 0.5 + (EYE - z) * H / item.ty;
      const flicker = 1 + Math.sin(game.time * 22 + item.x * 7.3) * 0.09;
      const radius = Math.min(H * 0.045, Math.max(1, (H / item.ty) * 0.105)) * flicker;
      const ctx = this.ctx;
      const hot = p.hostile ? ['rgba(255, 239, 167, 1)', 'rgba(255, 92, 17, 0.9)', 'rgba(255, 41, 6, 0)'] : ['rgba(255, 255, 223, 1)', 'rgba(255, 173, 45, 0.9)', 'rgba(255, 74, 12, 0)'];

      // Fire trail: short tapered dashes, never a thick capsule.
      if (p.trail && p.trail.length > 1) {
        const dirX = Math.cos(game.player.angle);
        const dirY = Math.sin(game.player.angle);
        const planeX = -dirY * PLANE;
        const planeY = dirX * PLANE;
        const invDet = 1 / (planeX * dirY - dirX * planeY);
        const points = [];
        for (const t of p.trail) {
          const dx1 = t.x - game.player.x;
          const dy1 = t.y - game.player.y;
          const tx = invDet * (dirY * dx1 - dirX * dy1);
          const ty = invDet * (-planeY * dx1 + planeX * dy1);
          if (ty > 0.15) {
            points.push({
              x: (this.W * 0.5) * (1 + tx / ty),
              y: H * 0.5 + (EYE - z) * H / ty,
              ty
            });
          }
        }
        if (points.length > 1) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          for (let i = 0; i < points.length - 1; i++) {
            const fade = 1 - i / (points.length - 1);
            ctx.globalAlpha = fade * 0.45;
            ctx.strokeStyle = p.hostile ? 'rgba(255, 82, 14, 0.9)' : 'rgba(255, 198, 77, 0.9)';
            ctx.lineWidth = Math.max(1, Math.min(5, radius * 0.38 * fade));
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[i + 1].x, points[i + 1].y);
            ctx.stroke();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }

      this.screenGlow(item.screenX, screenY, Math.min(H * 0.095, radius * 3.1), hot[0], hot[2]);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hot[1];
      ctx.beginPath();
      ctx.arc(item.screenX, screenY, radius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = hot[0];
      ctx.beginPath();
      ctx.arc(item.screenX, screenY, radius * 0.42, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    renderParticles(game, px, py, dirX, dirY, planeX, planeY, invDet) {
      const H = this.H;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of game.particles) {
        if (p.life <= 0) continue;
        const dx = p.x - px;
        const dy = p.y - py;
        const tx = invDet * (dirY * dx - dirX * dy);
        const ty = invDet * (-planeY * dx + planeX * dy);
        if (ty <= 0.45) continue;
        const sx = (this.W * 0.5) * (1 + tx / ty);
        const sy = H * 0.5 + (EYE - p.z) * H / ty;
        const radius = Math.min(H * 0.045, Math.max(0.5, (H / ty) * p.size * (0.5 + p.life / p.maxLife * 0.5)));
        if (sx < -radius || sx > this.W + radius) continue;
        const alpha = clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    renderWeapon(game) {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      const player = game.player;
      const image = this.sprites.weapon;
      const aspect = W / H;
      const widthFactor = aspect > 1.18 ? 0.52 : 0.86;
      const drawWidth = W * widthFactor;
      const drawHeight = drawWidth * (image.height / image.width);
      const bobX = Math.sin(player.bob * 0.82) * W * 0.006;
      const bobY = Math.abs(Math.cos(player.bob * 0.82)) * H * 0.008;
      const recoil = player.recoil;
      const drawX = W - drawWidth + W * 0.02 + bobX;
      const drawY = H - drawHeight + H * 0.015 + bobY + recoil * H * 0.05;
      const rotation = -0.015 + recoil * 0.035;

      ctx.save();
      ctx.translate(drawX + drawWidth, drawY + drawHeight);
      ctx.rotate(rotation);
      ctx.drawImage(image, -drawWidth, -drawHeight, drawWidth, drawHeight);
      ctx.restore();

      const muzzleX = drawX + (this.sprites.weaponMeta.muzzleX / this.sprites.weaponMeta.width) * drawWidth;
      const muzzleY = drawY + (this.sprites.weaponMeta.muzzleY / this.sprites.weaponMeta.height) * drawHeight;
      this.muzzle = { x: muzzleX, y: muzzleY, scale: drawWidth / 520 };

      if (player.muzzle > 0) {
        const alpha = clamp(player.muzzle / 0.075, 0, 1);
        this.drawMuzzleFlash(muzzleX, muzzleY, drawWidth * 0.23, alpha);
      }
    }

    drawMuzzleFlash(x, y, size, alpha) {
      const ctx = this.ctx;
      const spin = performance.now() * 0.03;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.6);
      glow.addColorStop(0, 'rgba(255, 252, 210, 0.95)');
      glow.addColorStop(0.22, 'rgba(255, 199, 72, 0.75)');
      glow.addColorStop(0.55, 'rgba(255, 91, 16, 0.24)');
      glow.addColorStop(1, 'rgba(255, 53, 8, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, size * 1.6, 0, TAU);
      ctx.fill();

      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.fillStyle = 'rgba(255, 213, 100, 0.86)';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const r = i % 2 === 0 ? size : size * 0.24;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 251, 220, 0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.22, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    render(game) {
      const player = game.player;
      const px = player.x;
      const py = player.y;
      const dirX = Math.cos(player.angle);
      const dirY = Math.sin(player.angle);
      const planeX = -dirY * PLANE;
      const planeY = dirX * PLANE;
      const invDet = 1 / (planeX * dirY - dirX * planeY);

      this.renderFloorAndCeiling(px, py, dirX, dirY, planeX, planeY);
      this.renderWalls(px, py, dirX, dirY, planeX, planeY);
      this.ctx.putImageData(this.frame, 0, 0);

      const items = this.collectRenderables(game, px, py, dirX, dirY, planeX, planeY, invDet);
      for (const item of items) {
        if (item.kind === 'brazier') this.renderBrazier(item, game);
        else if (item.kind === 'enemy') this.renderEnemy(item, game);
        else if (item.kind === 'pickup') this.renderPickup(item, game);
        else if (item.kind === 'projectile') this.renderProjectile(item, game);
      }

      this.renderParticles(game, px, py, dirX, dirY, planeX, planeY, invDet);
      this.renderWeapon(game);
    }

    drawMinimap(minimap, game) {
      const g = minimap.getContext('2d');
      const size = minimap.width;
      const scale = size / MAP_W;
      const t = game.time;
      g.clearRect(0, 0, size, size);
      g.fillStyle = '#090607';
      g.fillRect(0, 0, size, size);

      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          const tile = map[y][x];
          if (!tile) continue;
          g.fillStyle = tile === 3 ? 'rgba(151, 52, 21, 0.56)' : tile === 2 ? 'rgba(89, 68, 54, 0.6)' : 'rgba(70, 54, 55, 0.55)';
          g.fillRect(x * scale + 0.5, y * scale + 0.5, Math.max(1, scale - 1), Math.max(1, scale - 1));
        }
      }

      const px = game.player.x * scale;
      const py = game.player.y * scale;
      const angle = game.player.angle;

      g.save();
      g.globalCompositeOperation = 'lighter';
      const cone = g.createRadialGradient(px, py, 0, px, py, size * 0.2);
      cone.addColorStop(0, 'rgba(255, 126, 37, 0.18)');
      cone.addColorStop(1, 'rgba(255, 75, 14, 0)');
      g.fillStyle = cone;
      g.beginPath();
      g.moveTo(px, py);
      g.arc(px, py, size * 0.2, angle - 0.55, angle + 0.55);
      g.closePath();
      g.fill();
      g.restore();

      for (const b of brazierPositions) {
        g.fillStyle = 'rgba(255, 113, 28, 0.72)';
        g.beginPath();
        g.arc(b.x * scale, b.y * scale, Math.max(1, scale * 0.22), 0, TAU);
        g.fill();
      }

      for (const p of game.pickups) {
        g.fillStyle = '#ffd56f';
        g.fillRect(p.x * scale - 1.5, p.y * scale - 1.5, 3, 3);
      }

      for (const e of game.enemies) {
        if (e.dead) continue;
        const pulse = 0.65 + Math.sin(t * 5 + e.x) * 0.25;
        g.fillStyle = `rgba(255, 52, 17, ${pulse})`;
        g.beginPath();
        g.arc(e.x * scale, e.y * scale, Math.max(1.4, scale * 0.32), 0, TAU);
        g.fill();
      }

      g.save();
      g.translate(px, py);
      g.rotate(angle);
      g.fillStyle = '#ffe9b4';
      g.beginPath();
      g.moveTo(scale * 0.9, 0);
      g.lineTo(-scale * 0.55, -scale * 0.42);
      g.lineTo(-scale * 0.3, 0);
      g.lineTo(-scale * 0.55, scale * 0.42);
      g.closePath();
      g.fill();
      g.restore();

      g.strokeStyle = 'rgba(241, 230, 210, 0.12)';
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, size - 1, size - 1);
      g.strokeStyle = 'rgba(255, 90, 22, 0.32)';
      g.beginPath();
      g.moveTo(size - 8, 4);
      g.lineTo(size - 4, 8);
      g.stroke();
    }
  }

  window.HellWorld = {
    MAP_W, MAP_H, PLANE, EYE, map, spawnPoints, brazierPositions, playerStart,
    solidAt, wallAt, canStand, moveEntity, lineOfSight, findPath, Renderer
  };
})();
