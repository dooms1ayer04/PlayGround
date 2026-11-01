/* Hand-drawn procedural sprites: cultists, brutes, braziers and the pyro-carbine. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const { makeCanvas, drawFlame } = window.HellArt;

  function outline(g, color = '#0a0507', width = 2) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.stroke();
  }

  function tint(source, color) {
    const c = makeCanvas(source.width, source.height);
    const g = c.getContext('2d');
    g.drawImage(source, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function drawCultist(frame) {
    const c = makeCanvas(96, 144);
    const g = c.getContext('2d');
    const bob = Math.sin((frame / 4) * TAU) * 1.3;
    const breath = Math.sin((frame / 4) * TAU + 0.4);

    g.save();
    g.translate(bob, 0);

    // Faint body aura, useful against the dark walls.
    g.save();
    g.globalCompositeOperation = 'lighter';
    const aura = g.createRadialGradient(49, 84, 4, 49, 84, 49);
    aura.addColorStop(0, 'rgba(255, 71, 14, 0.11)');
    aura.addColorStop(1, 'rgba(255, 53, 8, 0)');
    g.fillStyle = aura;
    g.beginPath();
    g.arc(49, 84, 49, 0, TAU);
    g.fill();
    g.restore();

    // Staff, planted behind the shoulder.
    g.strokeStyle = '#2a1712';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(25, 131);
    g.lineTo(33, 45);
    g.stroke();
    g.strokeStyle = 'rgba(225, 166, 111, 0.22)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(28, 128);
    g.lineTo(35, 48);
    g.stroke();

    // Staff collar and caged ember.
    g.fillStyle = '#4c2a1b';
    g.beginPath();
    g.ellipse(34, 46, 8, 5, -0.22, 0, TAU);
    g.fill();
    outline(g, '#0c0708', 1.5);
    g.fillStyle = '#1b1010';
    g.beginPath();
    g.arc(34, 41, 5.2, 0, TAU);
    g.fill();
    g.strokeStyle = '#b95625';
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(34, 41, 5.2, 0, TAU);
    g.stroke();

    drawFlame(g, 34, 28, 11 + breath * 1.5, frame * 1.9, ['#fff6bc', '#ffd15c', '#ff6c1e', '#a9270c']);

    // Left arm reaching toward the staff.
    g.strokeStyle = '#3a0e16';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(33, 86);
    g.quadraticCurveTo(26, 99, 28, 108);
    g.stroke();
    g.strokeStyle = 'rgba(205, 82, 54, 0.18)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(31, 89);
    g.quadraticCurveTo(25, 100, 27, 106);
    g.stroke();
    g.fillStyle = '#2d1111';
    g.beginPath();
    g.arc(28, 109, 5, 0, TAU);
    g.fill();
    outline(g, '#080405', 1.2);

    // Robe silhouette.
    const robe = g.createLinearGradient(28, 55, 67, 130);
    robe.addColorStop(0, '#5b151d');
    robe.addColorStop(0.48, '#3d0f17');
    robe.addColorStop(1, '#20080e');
    g.beginPath();
    g.moveTo(39, 45);
    g.quadraticCurveTo(48, 32, 58, 45);
    g.lineTo(65, 65);
    g.lineTo(71, 79);
    g.lineTo(78, 127);
    g.lineTo(68, 120);
    g.lineTo(62, 136);
    g.lineTo(54, 126);
    g.lineTo(47, 139);
    g.lineTo(38, 126);
    g.lineTo(31, 136);
    g.lineTo(24, 123);
    g.lineTo(17, 128);
    g.lineTo(23, 80);
    g.lineTo(31, 78);
    g.lineTo(33, 64);
    g.closePath();
    g.fillStyle = robe;
    g.fill();
    outline(g);

    // Tattered fabric slits and orange piping.
    g.strokeStyle = 'rgba(245, 104, 47, 0.4)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(31, 84);
    g.lineTo(27, 121);
    g.moveTo(66, 83);
    g.lineTo(72, 119);
    g.stroke();
    g.strokeStyle = 'rgba(9, 4, 6, 0.72)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(44, 91);
    g.lineTo(41, 119);
    g.moveTo(55, 88);
    g.lineTo(58, 118);
    g.stroke();

    // Shoulder spikes.
    g.fillStyle = '#231314';
    g.beginPath();
    g.moveTo(33, 77);
    g.lineTo(16, 76);
    g.lineTo(26, 87);
    g.lineTo(11, 91);
    g.lineTo(28, 95);
    g.closePath();
    g.fill();
    outline(g, '#080405', 1.5);
    g.beginPath();
    g.moveTo(65, 77);
    g.lineTo(82, 75);
    g.lineTo(72, 87);
    g.lineTo(87, 90);
    g.lineTo(69, 95);
    g.closePath();
    g.fill();
    outline(g, '#080405', 1.5);

    // Hood.
    const hood = g.createLinearGradient(38, 35, 62, 70);
    hood.addColorStop(0, '#7a1e24');
    hood.addColorStop(0.55, '#56151c');
    hood.addColorStop(1, '#2c0b12');
    g.beginPath();
    g.moveTo(34, 65);
    g.quadraticCurveTo(35, 41, 48, 31);
    g.quadraticCurveTo(62, 37, 64, 54);
    g.lineTo(61, 70);
    g.closePath();
    g.fillStyle = hood;
    g.fill();
    outline(g);

    // Hood rim.
    g.strokeStyle = '#a63a26';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(38, 52);
    g.quadraticCurveTo(43, 37, 49, 35);
    g.quadraticCurveTo(58, 39, 61, 50);
    g.stroke();

    // Face void and burning eyes.
    g.fillStyle = '#060304';
    g.beginPath();
    g.moveTo(41, 50);
    g.quadraticCurveTo(49, 47, 59, 51);
    g.lineTo(57, 69);
    g.quadraticCurveTo(49, 73, 43, 68);
    g.closePath();
    g.fill();

    g.save();
    g.shadowColor = '#ff6a18';
    g.shadowBlur = 7;
    g.fillStyle = '#ffc04a';
    g.fillRect(46, 57, 3, 2);
    g.fillRect(55, 57, 3, 2);
    g.fillStyle = '#fff2b0';
    g.fillRect(47, 57, 1, 1);
    g.fillRect(56, 57, 1, 1);
    g.restore();

    // Belt and sigil.
    g.strokeStyle = '#160a0c';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(26, 104);
    g.quadraticCurveTo(48, 110, 70, 103);
    g.stroke();
    g.fillStyle = '#5c2b1b';
    g.beginPath();
    g.arc(48, 107, 4.2, 0, TAU);
    g.fill();
    g.strokeStyle = '#c15b2c';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(48, 107, 4.2, 0, TAU);
    g.stroke();

    // Right arm, palm open around a guttering flame.
    g.strokeStyle = '#420f18';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(66, 84);
    g.quadraticCurveTo(74, 94, 75, 103);
    g.stroke();
    g.strokeStyle = 'rgba(225, 94, 54, 0.22)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(67, 86);
    g.quadraticCurveTo(73, 95, 74, 101);
    g.stroke();
    g.fillStyle = '#2d1111';
    g.beginPath();
    g.arc(76, 105, 4.6, 0, TAU);
    g.fill();
    outline(g, '#080405', 1.2);
    drawFlame(g, 78, 97, 5.2 + Math.sin(frame * 2.1) * 0.7, frame * 2.3 + 1, ['#fff1aa', '#ffc147', '#ff5a14', '#8e1c0a']);

    // Boots.
    g.fillStyle = '#160b0d';
    g.beginPath();
    g.ellipse(39, 137, 8, 4, -0.14, 0, TAU);
    g.ellipse(58, 137, 8, 4, 0.12, 0, TAU);
    g.fill();

    g.restore();
    return c;
  }

  function drawBrute(frame) {
    const c = makeCanvas(112, 160);
    const g = c.getContext('2d');
    const bob = Math.sin((frame / 4) * TAU + 0.6) * 1.1;
    const breath = Math.sin((frame / 4) * TAU);

    g.save();
    g.translate(bob, 0);

    g.save();
    g.globalCompositeOperation = 'lighter';
    const aura = g.createRadialGradient(56, 92, 6, 56, 92, 58);
    aura.addColorStop(0, 'rgba(255, 62, 10, 0.13)');
    aura.addColorStop(1, 'rgba(255, 50, 8, 0)');
    g.fillStyle = aura;
    g.beginPath();
    g.arc(56, 92, 58, 0, TAU);
    g.fill();
    g.restore();

    // Legs.
    g.fillStyle = '#1d1a1b';
    g.beginPath();
    g.moveTo(39, 123);
    g.lineTo(50, 126);
    g.lineTo(49, 153);
    g.lineTo(35, 154);
    g.lineTo(33, 135);
    g.closePath();
    g.fill();
    outline(g, '#080506', 2);
    g.beginPath();
    g.moveTo(62, 126);
    g.lineTo(75, 123);
    g.lineTo(81, 136);
    g.lineTo(78, 154);
    g.lineTo(64, 153);
    g.closePath();
    g.fill();
    outline(g, '#080506', 2);

    // Hooves / boots.
    g.fillStyle = '#0d090a';
    g.beginPath();
    g.ellipse(42, 155, 13, 5, 0, 0, TAU);
    g.ellipse(71, 155, 13, 5, 0, 0, TAU);
    g.fill();

    // Rear arm and fist flame (left).
    g.strokeStyle = '#282022';
    g.lineWidth = 17;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(35, 84);
    g.lineTo(21, 113);
    g.stroke();
    g.strokeStyle = 'rgba(222, 115, 57, 0.12)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(34, 86);
    g.lineTo(22, 111);
    g.stroke();
    g.fillStyle = '#1b1213';
    g.beginPath();
    g.arc(18, 118, 10, 0, TAU);
    g.fill();
    outline(g, '#070405', 2);
    drawFlame(g, 17, 108, 11 + breath * 1.3, frame * 2.0, ['#fff6b5', '#ffd057', '#ff6419', '#961b09']);

    // Torso armour.
    const torso = g.createLinearGradient(30, 55, 82, 132);
    torso.addColorStop(0, '#4a3d38');
    torso.addColorStop(0.45, '#2a2324');
    torso.addColorStop(1, '#151012');
    g.beginPath();
    g.moveTo(34, 59);
    g.lineTo(52, 49);
    g.lineTo(72, 55);
    g.lineTo(84, 77);
    g.lineTo(79, 121);
    g.lineTo(67, 132);
    g.lineTo(43, 131);
    g.lineTo(29, 117);
    g.lineTo(28, 79);
    g.closePath();
    g.fillStyle = torso;
    g.fill();
    outline(g, '#070405', 2.4);

    // Chest plates.
    g.fillStyle = '#372d2b';
    g.beginPath();
    g.moveTo(39, 68);
    g.lineTo(55, 60);
    g.lineTo(71, 69);
    g.lineTo(67, 91);
    g.lineTo(52, 98);
    g.lineTo(38, 89);
    g.closePath();
    g.fill();
    outline(g, '#100b0c', 1.4);
    g.strokeStyle = 'rgba(233, 199, 160, 0.13)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(41, 70);
    g.lineTo(55, 64);
    g.lineTo(68, 71);
    g.stroke();

    // Glowing chest rune.
    g.save();
    g.strokeStyle = '#ff6520';
    g.shadowColor = '#ff430b';
    g.shadowBlur = 8;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(53, 72);
    g.lineTo(59, 80);
    g.lineTo(53, 89);
    g.lineTo(47, 80);
    g.closePath();
    g.stroke();
    g.fillStyle = '#ff9d3b';
    g.beginPath();
    g.arc(53, 80, 1.6, 0, TAU);
    g.fill();
    g.restore();

    // Belt and loin cloth.
    g.fillStyle = '#241113';
    g.fillRect(35, 112, 43, 9);
    g.fillStyle = '#8f2f1a';
    g.beginPath();
    g.moveTo(49, 120);
    g.lineTo(63, 120);
    g.lineTo(67, 138);
    g.lineTo(56, 134);
    g.lineTo(48, 141);
    g.closePath();
    g.fill();
    outline(g, '#0a0607', 1.3);

    // Shoulder armour.
    g.fillStyle = '#211b1d';
    g.beginPath();
    g.moveTo(34, 66);
    g.lineTo(16, 66);
    g.lineTo(9, 77);
    g.lineTo(22, 84);
    g.lineTo(35, 79);
    g.closePath();
    g.fill();
    outline(g, '#070405', 2);
    g.beginPath();
    g.moveTo(71, 65);
    g.lineTo(89, 64);
    g.lineTo(101, 75);
    g.lineTo(88, 83);
    g.lineTo(72, 79);
    g.closePath();
    g.fill();
    outline(g, '#070405', 2);

    // Spikes.
    g.fillStyle = '#3b3030';
    g.beginPath();
    g.moveTo(17, 67);
    g.lineTo(12, 50);
    g.lineTo(23, 62);
    g.closePath();
    g.fill();
    outline(g, '#090607', 1.2);
    g.beginPath();
    g.moveTo(90, 64);
    g.lineTo(98, 48);
    g.lineTo(86, 61);
    g.closePath();
    g.fill();
    outline(g, '#090607', 1.2);

    // Helmet / horned skull.
    const helm = g.createLinearGradient(42, 26, 71, 59);
    helm.addColorStop(0, '#574744');
    helm.addColorStop(0.52, '#2e2526');
    helm.addColorStop(1, '#171012');
    g.beginPath();
    g.moveTo(41, 48);
    g.quadraticCurveTo(40, 27, 55, 22);
    g.quadraticCurveTo(70, 26, 73, 44);
    g.lineTo(68, 58);
    g.lineTo(45, 58);
    g.closePath();
    g.fillStyle = helm;
    g.fill();
    outline(g, '#070405', 2.2);

    // Horns.
    g.fillStyle = '#8b7563';
    g.beginPath();
    g.moveTo(42, 31);
    g.quadraticCurveTo(25, 25, 24, 12);
    g.quadraticCurveTo(36, 18, 48, 25);
    g.closePath();
    g.fill();
    outline(g, '#0c0808', 1.2);
    g.beginPath();
    g.moveTo(68, 28);
    g.quadraticCurveTo(84, 20, 91, 8);
    g.quadraticCurveTo(77, 16, 63, 23);
    g.closePath();
    g.fill();
    outline(g, '#0c0808', 1.2);

    // Visor.
    g.fillStyle = '#090506';
    g.beginPath();
    g.moveTo(44, 40);
    g.lineTo(69, 40);
    g.lineTo(67, 50);
    g.lineTo(46, 50);
    g.closePath();
    g.fill();
    g.save();
    g.shadowColor = '#ff5d18';
    g.shadowBlur = 9;
    g.fillStyle = '#ffc451';
    g.fillRect(48, 43, 5, 2);
    g.fillRect(61, 43, 4, 2);
    g.fillStyle = '#fff1b1';
    g.fillRect(49, 43, 2, 1);
    g.fillRect(62, 43, 1, 1);
    g.restore();

    // Front arm, ready to throw.
    g.strokeStyle = '#332a2b';
    g.lineWidth = 17;
    g.beginPath();
    g.moveTo(77, 82);
    g.lineTo(91, 111);
    g.stroke();
    g.strokeStyle = 'rgba(227, 125, 65, 0.13)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(78, 84);
    g.lineTo(90, 109);
    g.stroke();
    g.fillStyle = '#1b1213';
    g.beginPath();
    g.arc(94, 117, 10, 0, TAU);
    g.fill();
    outline(g, '#070405', 2);
    drawFlame(g, 96, 107, 13 + breath * 1.6, frame * 1.85 + 2, ['#fff5b3', '#ffd057', '#ff5a16', '#8c1909']);

    // Armour nicks.
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(38, 100);
    g.lineTo(44, 104);
    g.moveTo(69, 98);
    g.lineTo(64, 102);
    g.stroke();

    g.restore();
    return c;
  }

  function makeEnemySet(kind) {
    const frames = [];
    const flashes = [];
    for (let i = 0; i < 4; i++) {
      const c = kind === 'brute' ? drawBrute(i) : drawCultist(i);
      frames.push(c);
      flashes.push(tint(c, '#ff8a33'));
    }
    return { frames, flashes, kind };
  }

  function drawBrazier(frame) {
    const c = makeCanvas(80, 112);
    const g = c.getContext('2d');
    const flicker = Math.sin(frame * 1.9) * 0.7;

    // Stone pedestal.
    g.fillStyle = '#181214';
    g.beginPath();
    g.moveTo(25, 108);
    g.lineTo(28, 80);
    g.lineTo(52, 80);
    g.lineTo(56, 108);
    g.closePath();
    g.fill();
    outline(g, '#070405', 1.4);
    g.fillStyle = '#2c2223';
    g.fillRect(31, 84, 18, 3);
    g.fillStyle = 'rgba(218, 180, 139, 0.08)';
    g.fillRect(34, 88, 3, 15);

    // Bowl.
    const bowl = g.createLinearGradient(16, 70, 64, 92);
    bowl.addColorStop(0, '#51403b');
    bowl.addColorStop(0.45, '#2c2121');
    bowl.addColorStop(1, '#171011');
    g.beginPath();
    g.moveTo(15, 69);
    g.quadraticCurveTo(40, 79, 65, 69);
    g.lineTo(59, 87);
    g.quadraticCurveTo(40, 96, 21, 87);
    g.closePath();
    g.fillStyle = bowl;
    g.fill();
    outline(g, '#070405', 1.5);

    // Coals.
    g.fillStyle = '#ff6a1c';
    g.beginPath();
    g.ellipse(40, 72, 20, 6, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#ffc049';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(29 + i * 5.3, 71 + Math.sin(i * 2.3) * 2, 1.4, 0, TAU);
      g.fill();
    }

    drawFlame(g, 40, 43 + flicker, 20, frame * 2.1, ['#fff7bd', '#ffd25d', '#ff681c', '#9f1d09']);

    // Rim highlights.
    g.strokeStyle = 'rgba(255, 116, 45, 0.25)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(19, 72);
    g.quadraticCurveTo(40, 80, 61, 72);
    g.stroke();
    return c;
  }

  function drawPickup(frame) {
    const c = makeCanvas(42, 54);
    const g = c.getContext('2d');
    const float = Math.sin(frame * 1.8) * 2;

    g.save();
    g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(21, 28 + float, 0, 21, 28 + float, 21);
    glow.addColorStop(0, 'rgba(255, 189, 72, 0.48)');
    glow.addColorStop(0.5, 'rgba(255, 81, 18, 0.14)');
    glow.addColorStop(1, 'rgba(255, 57, 10, 0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(21, 28 + float, 21, 0, TAU);
    g.fill();
    g.restore();

    g.save();
    g.translate(21, 27 + float);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#ff8c2f';
    g.fillRect(-6, -6, 12, 12);
    g.fillStyle = '#ffd36d';
    g.fillRect(-3, -3, 6, 6);
    g.fillStyle = '#fff4c2';
    g.fillRect(-1, -1, 2, 2);
    g.strokeStyle = 'rgba(255, 218, 121, 0.72)';
    g.lineWidth = 1;
    g.strokeRect(-9, -9, 18, 18);
    g.restore();

    g.strokeStyle = 'rgba(255, 103, 29, 0.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(21, 46, 9, 3, 0, 0, TAU);
    g.stroke();
    return c;
  }

  function drawWeapon() {
    const c = makeCanvas(520, 360);
    const g = c.getContext('2d');

    // Barrel body.
    const barrel = g.createLinearGradient(55, 58, 310, 238);
    barrel.addColorStop(0, '#4c403a');
    barrel.addColorStop(0.26, '#302724');
    barrel.addColorStop(0.62, '#1a1515');
    barrel.addColorStop(1, '#0f0b0c');
    g.beginPath();
    g.moveTo(50, 72);
    g.lineTo(96, 44);
    g.lineTo(322, 172);
    g.lineTo(308, 250);
    g.lineTo(57, 128);
    g.closePath();
    g.fillStyle = barrel;
    g.fill();
    outline(g, '#070405', 5);

    // Top rail.
    const rail = g.createLinearGradient(70, 40, 315, 175);
    rail.addColorStop(0, '#62524a');
    rail.addColorStop(0.45, '#302725');
    rail.addColorStop(1, '#171112');
    g.beginPath();
    g.moveTo(77, 45);
    g.lineTo(333, 165);
    g.lineTo(325, 188);
    g.lineTo(72, 66);
    g.closePath();
    g.fillStyle = rail;
    g.fill();
    outline(g, '#080506', 3);

    // Barrel fluting.
    g.strokeStyle = 'rgba(235, 204, 164, 0.1)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(106, 67);
    g.lineTo(306, 174);
    g.moveTo(102, 85);
    g.lineTo(302, 192);
    g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(112, 113);
    g.lineTo(307, 211);
    g.stroke();

    // Heat vents.
    for (let i = 0; i < 4; i++) {
      g.save();
      g.translate(133 + i * 36, 87 + i * 17);
      g.rotate(0.44);
      g.fillStyle = '#090607';
      g.fillRect(-12, -5, 26, 10);
      g.fillStyle = i % 2 ? 'rgba(255, 102, 26, 0.72)' : 'rgba(255, 64, 12, 0.46)';
      g.fillRect(-9, -2, 20, 3);
      g.restore();
    }

    // Muzzle brake.
    g.save();
    g.translate(65, 83);
    g.rotate(0.44);
    g.fillStyle = '#211a19';
    g.beginPath();
    g.ellipse(0, 0, 19, 32, 0, 0, TAU);
    g.fill();
    outline(g, '#070405', 4);
    g.fillStyle = '#080506';
    g.beginPath();
    g.ellipse(0, 0, 10, 21, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(255, 105, 29, 0.65)';
    g.shadowColor = '#ff4b10';
    g.shadowBlur = 10;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(0, 0, 13, 25, 0, 0, TAU);
    g.stroke();
    g.fillStyle = '#ff8a30';
    g.beginPath();
    g.ellipse(0, 0, 3.5, 6, 0, 0, TAU);
    g.fill();
    g.restore();

    // Receiver.
    const receiver = g.createLinearGradient(250, 160, 430, 330);
    receiver.addColorStop(0, '#413532');
    receiver.addColorStop(0.45, '#251d1d');
    receiver.addColorStop(1, '#100b0c');
    g.beginPath();
    g.moveTo(258, 160);
    g.lineTo(423, 252);
    g.lineTo(442, 301);
    g.lineTo(383, 351);
    g.lineTo(246, 264);
    g.closePath();
    g.fillStyle = receiver;
    g.fill();
    outline(g, '#070405', 4);

    // Receiver panel.
    g.fillStyle = '#191313';
    g.beginPath();
    g.moveTo(286, 190);
    g.lineTo(386, 246);
    g.lineTo(370, 294);
    g.lineTo(272, 239);
    g.closePath();
    g.fill();
    outline(g, '#080506', 2);

    // Glowing canister.
    g.save();
    g.translate(328, 253);
    g.rotate(0.42);
    const canister = g.createLinearGradient(0, -18, 0, 18);
    canister.addColorStop(0, '#ffd06c');
    canister.addColorStop(0.5, '#ff6c1c');
    canister.addColorStop(1, '#8f1c0a');
    g.fillStyle = canister;
    g.fillRect(-27, -12, 54, 24);
    g.strokeStyle = '#0b0708';
    g.lineWidth = 2;
    g.strokeRect(-27, -12, 54, 24);
    g.fillStyle = 'rgba(255, 241, 180, 0.6)';
    g.fillRect(-19, -7, 34, 3);
    g.restore();

    // Grip and glove.
    g.beginPath();
    g.moveTo(360, 292);
    g.lineTo(420, 323);
    g.lineTo(397, 358);
    g.lineTo(332, 327);
    g.closePath();
    g.fillStyle = '#161011';
    g.fill();
    outline(g, '#060405', 3);

    g.fillStyle = '#4a2118';
    g.beginPath();
    g.moveTo(345, 286);
    g.lineTo(381, 303);
    g.lineTo(366, 335);
    g.lineTo(328, 316);
    g.closePath();
    g.fill();
    outline(g, '#0a0607', 2);
    g.strokeStyle = 'rgba(236, 161, 106, 0.24)';
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(340 + i * 8, 295 + i * 4);
      g.lineTo(351 + i * 8, 319 + i * 4);
      g.stroke();
    }

    // Support hand under the barrel.
    g.fillStyle = '#3e1b15';
    g.beginPath();
    g.ellipse(233, 203, 23, 15, 0.43, 0, TAU);
    g.fill();
    outline(g, '#090506', 2);
    g.strokeStyle = 'rgba(232, 158, 106, 0.23)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(222, 196);
    g.lineTo(245, 208);
    g.moveTo(217, 204);
    g.lineTo(239, 216);
    g.stroke();

    // Bolts and scratches.
    g.fillStyle = '#090607';
    for (const [x, y] of [[286, 177], [406, 272], [271, 252], [376, 318]]) {
      g.beginPath();
      g.arc(x, y, 3.2, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(223, 187, 149, 0.17)';
      g.fillRect(x - 1, y - 1, 1, 1);
      g.fillStyle = '#090607';
    }
    g.strokeStyle = 'rgba(238, 199, 156, 0.12)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(109, 61);
    g.lineTo(291, 154);
    g.moveTo(286, 213);
    g.lineTo(357, 252);
    g.stroke();

    // Orange energy conduit.
    g.save();
    g.strokeStyle = 'rgba(255, 92, 22, 0.72)';
    g.shadowColor = '#ff4d11';
    g.shadowBlur = 7;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(305, 174);
    g.lineTo(353, 202);
    g.lineTo(402, 230);
    g.stroke();
    g.restore();

    return c;
  }

  function build() {
    const braziers = [];
    for (let i = 0; i < 4; i++) braziers.push(drawBrazier(i));
    const pickups = [];
    for (let i = 0; i < 4; i++) pickups.push(drawPickup(i));
    return {
      enemies: {
        acolyte: makeEnemySet('acolyte'),
        brute: makeEnemySet('brute')
      },
      braziers,
      pickups,
      weapon: drawWeapon(),
      weaponMeta: { width: 520, height: 360, muzzleX: 63, muzzleY: 82 }
    };
  }

  window.HellSprites = { build, tint };
})();
