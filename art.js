/* Procedural texture and sprite factory for Hellfire Protocol. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  function makeCanvas(width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }

  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function shadeCanvas(source, level) {
    const c = makeCanvas(source.width, source.height);
    const g = c.getContext('2d');
    g.drawImage(source, 0, 0);
    const darkness = 0.94 * (1 - level / 15);
    if (darkness > 0.001) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(5, 2, 6, ${darkness})`;
      g.fillRect(0, 0, c.width, c.height);
      if (level < 7) {
        g.fillStyle = `rgba(117, 24, 11, ${(7 - level) * 0.012})`;
        g.fillRect(0, 0, c.width, c.height);
      }
    }
    return c;
  }

  function texturePixels(source) {
    const g = source.getContext('2d');
    const data = g.getImageData(0, 0, source.width, source.height).data;
    return new Uint32Array(data.buffer);
  }

  function drawFlame(g, x, y, size, phase, palette = ['#fff2a8', '#ffb52d', '#ff4b10', '#9e160b']) {
    const flicker = 0.84 + Math.sin(phase * 2.3) * 0.12 + Math.sin(phase * 5.1) * 0.05;
    g.save();
    g.globalCompositeOperation = 'lighter';

    const glow = g.createRadialGradient(x, y + size * 0.1, 0, x, y + size * 0.1, size * 2.15);
    glow.addColorStop(0, 'rgba(255, 154, 49, 0.48)');
    glow.addColorStop(0.34, 'rgba(255, 79, 16, 0.18)');
    glow.addColorStop(1, 'rgba(255, 52, 8, 0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x, y + size * 0.1, size * 2.15, 0, TAU);
    g.fill();

    g.translate(x, y + size * 0.45);
    g.scale(1, flicker);

    g.fillStyle = palette[2];
    g.beginPath();
    g.moveTo(0, -size * 0.5);
    g.bezierCurveTo(size * 0.48, -size * 0.12, size * 0.52, size * 0.28, size * 0.24, size * 0.46);
    g.bezierCurveTo(size * 0.08, size * 0.58, -size * 0.18, size * 0.55, -size * 0.32, size * 0.36);
    g.bezierCurveTo(-size * 0.55, size * 0.08, -size * 0.27, -size * 0.18, 0, -size * 0.5);
    g.fill();

    g.fillStyle = palette[1];
    g.beginPath();
    g.moveTo(-size * 0.02, -size * 0.29);
    g.bezierCurveTo(size * 0.28, -size * 0.04, size * 0.31, size * 0.25, size * 0.12, size * 0.38);
    g.bezierCurveTo(-size * 0.02, size * 0.47, -size * 0.24, size * 0.32, -size * 0.22, size * 0.12);
    g.bezierCurveTo(-size * 0.22, -size * 0.04, -size * 0.09, -size * 0.16, -size * 0.02, -size * 0.29);
    g.fill();

    g.fillStyle = palette[0];
    g.beginPath();
    g.ellipse(0, size * 0.18, size * 0.1, size * 0.23, 0.12, 0, TAU);
    g.fill();

    g.restore();
  }

  function speckle(g, width, height, seed, count, colors, minSize = 1, maxSize = 2) {
    const r = rng(seed);
    for (let i = 0; i < count; i++) {
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      const s = minSize + Math.floor(r() * (maxSize - minSize + 1));
      g.fillRect(Math.floor(r() * width), Math.floor(r() * height), s, s);
    }
  }

  function createStoneWall() {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const r = rng(4409);
    g.fillStyle = '#191316';
    g.fillRect(0, 0, 64, 64);

    for (let row = 0; row < 4; row++) {
      const y = row * 16;
      const offset = row % 2 ? 16 : 0;
      for (let col = -1; col < 3; col++) {
        const x = col * 32 + offset;
        const value = 25 + Math.floor(r() * 13);
        g.fillStyle = `rgb(${value + 8}, ${value}, ${value + 2})`;
        g.fillRect(x + 1, y + 1, 30, 14);
        g.fillStyle = 'rgba(210, 181, 155, 0.08)';
        g.fillRect(x + 2, y + 2, 28, 1);
        g.fillStyle = 'rgba(0, 0, 0, 0.24)';
        g.fillRect(x + 2, y + 13, 28, 2);
        if (r() > 0.56) {
          g.fillStyle = 'rgba(0, 0, 0, 0.28)';
          g.fillRect(x + 5 + Math.floor(r() * 19), y + 5, 1, 3 + Math.floor(r() * 5));
        }
      }
    }

    speckle(g, 64, 64, 991, 72, ['rgba(0,0,0,0.32)', 'rgba(222,191,158,0.07)', 'rgba(111,43,25,0.16)']);

    g.strokeStyle = '#0d090b';
    g.lineWidth = 1;
    for (let y = 16; y < 64; y += 16) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(64, y);
      g.stroke();
    }

    g.save();
    g.strokeStyle = '#ff5a16';
    g.shadowColor = '#ff4c0e';
    g.shadowBlur = 6;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(45, 4);
    g.lineTo(41, 13);
    g.lineTo(48, 20);
    g.lineTo(43, 30);
    g.lineTo(46, 38);
    g.stroke();
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(15, 52);
    g.lineTo(20, 45);
    g.lineTo(18, 39);
    g.stroke();
    g.restore();

    const grime = g.createLinearGradient(0, 38, 0, 64);
    grime.addColorStop(0, 'rgba(7,4,5,0)');
    grime.addColorStop(1, 'rgba(4,2,4,0.52)');
    g.fillStyle = grime;
    g.fillRect(0, 38, 64, 26);
    return c;
  }

  function createMetalWall() {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const r = rng(7831);
    g.fillStyle = '#1c1817';
    g.fillRect(0, 0, 64, 64);

    for (let y = 0; y < 64; y += 32) {
      for (let x = 0; x < 64; x += 32) {
        const v = 27 + Math.floor(r() * 9);
        const grad = g.createLinearGradient(x, y, x + 32, y + 32);
        grad.addColorStop(0, `rgb(${v + 7}, ${v + 2}, ${v})`);
        grad.addColorStop(0.48, `rgb(${v}, ${v - 2}, ${v - 3})`);
        grad.addColorStop(1, `rgb(${v - 9}, ${v - 10}, ${v - 8})`);
        g.fillStyle = grad;
        g.fillRect(x + 1, y + 1, 30, 30);
        g.strokeStyle = '#0b0808';
        g.lineWidth = 2;
        g.strokeRect(x + 1, y + 1, 30, 30);
        g.fillStyle = 'rgba(236, 215, 186, 0.11)';
        g.fillRect(x + 3, y + 3, 26, 1);
      }
    }

    for (const [x, y] of [[6, 6], [26, 6], [38, 6], [58, 6], [6, 26], [26, 26], [38, 26], [58, 26], [6, 38], [26, 38], [38, 38], [58, 38], [6, 58], [26, 58], [38, 58], [58, 58]]) {
      g.fillStyle = '#0c0909';
      g.beginPath();
      g.arc(x, y, 2.2, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(220, 186, 143, 0.26)';
      g.fillRect(x - 1, y - 1, 1, 1);
    }

    g.fillStyle = 'rgba(17, 9, 8, 0.85)';
    g.fillRect(0, 31, 64, 3);

    g.save();
    g.strokeStyle = 'rgba(255, 79, 18, 0.64)';
    g.shadowColor = '#ff4d13';
    g.shadowBlur = 5;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(7, 0);
    g.lineTo(7, 7);
    g.lineTo(13, 12);
    g.lineTo(10, 18);
    g.stroke();
    g.restore();

    g.fillStyle = 'rgba(112, 37, 15, 0.21)';
    for (let i = 0; i < 9; i++) {
      g.fillRect(10 + Math.floor(r() * 45), 30 + Math.floor(r() * 33), 1, 3 + Math.floor(r() * 10));
    }

    const grime = g.createLinearGradient(0, 44, 0, 64);
    grime.addColorStop(0, 'rgba(3,2,3,0)');
    grime.addColorStop(1, 'rgba(3,2,3,0.6)');
    g.fillStyle = grime;
    g.fillRect(0, 44, 64, 20);
    return c;
  }

  function createRuneWall() {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const r = rng(2317);
    g.fillStyle = '#150e12';
    g.fillRect(0, 0, 64, 64);

    speckle(g, 64, 64, 1289, 55, ['rgba(255,103,26,0.09)', 'rgba(0,0,0,0.35)', 'rgba(225,188,142,0.05)']);

    g.strokeStyle = '#090607';
    g.lineWidth = 3;
    g.strokeRect(4, 4, 56, 56);
    g.strokeStyle = 'rgba(255, 80, 17, 0.22)';
    g.lineWidth = 1;
    g.strokeRect(7, 7, 50, 50);

    g.save();
    g.translate(32, 33);
    g.strokeStyle = '#ff6b20';
    g.shadowColor = '#ff4a0c';
    g.shadowBlur = 8;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(0, 0, 18, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -16);
    g.lineTo(13, 12);
    g.lineTo(-15, -2);
    g.lineTo(15, -2);
    g.lineTo(-13, 12);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 4, 0, TAU);
    g.stroke();
    g.restore();

    g.save();
    g.strokeStyle = 'rgba(255, 90, 22, 0.78)';
    g.shadowColor = '#ff4a0c';
    g.shadowBlur = 5;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(14, 64);
    g.lineTo(18, 53);
    g.lineTo(16, 45);
    g.lineTo(23, 39);
    g.stroke();
    g.beginPath();
    g.moveTo(50, 64);
    g.lineTo(46, 57);
    g.lineTo(49, 51);
    g.stroke();
    g.restore();

    const shade = g.createLinearGradient(0, 0, 64, 64);
    shade.addColorStop(0, 'rgba(0,0,0,0.14)');
    shade.addColorStop(0.5, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.fillStyle = shade;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  function createFloor() {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const r = rng(5663);
    g.fillStyle = '#171214';
    g.fillRect(0, 0, 64, 64);

    for (let y = 0; y < 64; y += 16) {
      for (let x = 0; x < 64; x += 16) {
        const v = 22 + Math.floor(r() * 10);
        g.fillStyle = `rgb(${v + 3}, ${v}, ${v + 2})`;
        g.fillRect(x + 1, y + 1, 14, 14);
        g.fillStyle = 'rgba(219, 192, 159, 0.055)';
        g.fillRect(x + 2, y + 2, 12, 1);
        g.fillStyle = 'rgba(0,0,0,0.24)';
        g.fillRect(x + 2, y + 14, 12, 1);
      }
    }

    speckle(g, 64, 64, 1901, 110, ['rgba(0,0,0,0.28)', 'rgba(210,181,145,0.06)', 'rgba(108,37,20,0.14)'], 1, 2);

    g.save();
    g.strokeStyle = 'rgba(255, 81, 18, 0.52)';
    g.shadowColor = '#ff4d12';
    g.shadowBlur = 4;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(31, 18);
    g.lineTo(36, 24);
    g.lineTo(33, 31);
    g.lineTo(38, 39);
    g.stroke();
    g.restore();

    const grime = g.createRadialGradient(32, 32, 3, 32, 32, 42);
    grime.addColorStop(0, 'rgba(0,0,0,0)');
    grime.addColorStop(1, 'rgba(0,0,0,0.26)');
    g.fillStyle = grime;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  function createCeiling() {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const r = rng(8128);
    g.fillStyle = '#0c080b';
    g.fillRect(0, 0, 64, 64);

    for (let y = 0; y < 64; y += 16) {
      const v = 12 + Math.floor(r() * 8);
      g.fillStyle = `rgb(${v + 3}, ${v}, ${v + 1})`;
      g.fillRect(0, y + 1, 64, 14);
      g.fillStyle = 'rgba(189, 156, 127, 0.055)';
      g.fillRect(0, y + 2, 64, 1);
      g.fillStyle = 'rgba(0,0,0,0.38)';
      g.fillRect(0, y + 15, 64, 1);
    }

    for (let x = 0; x < 64; x += 16) {
      g.fillStyle = '#080607';
      g.fillRect(x, 0, 3, 64);
      g.fillStyle = 'rgba(203, 172, 137, 0.06)';
      g.fillRect(x + 1, 0, 1, 64);
      g.fillStyle = '#0b0809';
      g.fillRect(x + 7, 0, 1, 64);
    }

    speckle(g, 64, 64, 732, 45, ['rgba(0,0,0,0.32)', 'rgba(174, 128, 91, 0.05)']);
    return c;
  }

  function build() {
    const wallSources = [createStoneWall(), createMetalWall(), createRuneWall()];
    const floor = createFloor();
    const ceiling = createCeiling();
    const wallShades = wallSources.map(source => Array.from({ length: 16 }, (_, i) => shadeCanvas(source, i)));
    const wallShadesPixels = wallShades.map(levels => levels.map(texturePixels));
    const floorShades = Array.from({ length: 16 }, (_, i) => texturePixels(shadeCanvas(floor, i)));
    const ceilingShades = Array.from({ length: 16 }, (_, i) => texturePixels(shadeCanvas(ceiling, i)));
    return { wallSources, wallShades, wallShadesPixels, floorShades, ceilingShades };
  }

  window.HellArt = { build, makeCanvas, rng, shadeCanvas, texturePixels, drawFlame, TAU };
})();
