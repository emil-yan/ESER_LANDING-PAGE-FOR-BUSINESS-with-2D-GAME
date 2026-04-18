/* ============================================================
   SOURCE GAMES — game.js
   2D Gmod-inspired platformer with ragdoll characters
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Canvas sizing ───────────────────────────────────────── */
  const W = 900, H = 420;
  canvas.width = W;
  canvas.height = H;

  /* ── Palette ─────────────────────────────────────────────── */
  const COL = {
    sky:       '#08111c',
    skyFar:    '#0d1825',
    ground:    '#1a2840',
    groundTop: '#4d9de0',
    platform:  '#1e2e45',
    platTop:   '#3a6fa8',
    prop:      '#e8742a',
    propStroke:'#c0551a',
    particle:  '#4d9de0',
    npcBody:   '#2d6ba0',
    npcHead:   '#3a8fd4',
    npcDark:   '#1a3d5c',
    accent:    '#4d9de0',
    text:      '#6a9dc8',
  };

  /* ── Input ───────────────────────────────────────────────── */
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true;  e.preventDefault(); });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });

  /* ── Helpers ─────────────────────────────────────────────── */
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ═══════════════════════════════════════════════════════════
     PLATFORM LAYOUT
  ═══════════════════════════════════════════════════════════ */
  const GROUND_Y = H - 60;

  const platforms = [
    { x: 0,    y: GROUND_Y, w: W, h: 60 }, // ground
    { x: 100,  y: 310,      w: 130, h: 14 },
    { x: 290,  y: 250,      w: 100, h: 14 },
    { x: 450,  y: 300,      w: 120, h: 14 },
    { x: 620,  y: 230,      w: 140, h: 14 },
    { x: 760,  y: 320,      w: 90,  h: 14 },
  ];

  /* ═══════════════════════════════════════════════════════════
     GMOD STICK CHARACTER
  ═══════════════════════════════════════════════════════════ */
  function makeCharacter(x, y, isPlayer) {
    return {
      x, y,
      vx: 0, vy: 0,
      w: 22, h: 38,
      onGround: false,
      jumps: 0,
      maxJumps: 2,
      dir: 1,
      isPlayer,
      /* ragdoll */
      ragdoll: false,
      ragAngle: 0, ragVel: 0,
      /* limb sway */
      limbT: rand(0, Math.PI * 2),
      /* colors */
      bodyCol: isPlayer ? '#3a8fd4' : COL.npcBody,
      headCol: isPlayer ? '#5ab0f4' : COL.npcHead,
      hatCol:  isPlayer ? COL.accent : '#1a3d5c',
    };
  }

  /* ═══════════════════════════════════════════════════════════
     PROPS
  ═══════════════════════════════════════════════════════════ */
  function makeProp(x, y, vx, vy, type) {
    return {
      x, y, vx, vy,
      w: type === 'barrel' ? 22 : 18,
      h: type === 'barrel' ? 26 : 18,
      angle: 0, angVel: rand(-0.18, 0.18),
      onGround: false,
      type,
      life: 600,
    };
  }

  const propTypes = ['barrel', 'crate', 'barrel'];

  /* ═══════════════════════════════════════════════════════════
     PARTICLES
  ═══════════════════════════════════════════════════════════ */
  function makeParticle(x, y, col) {
    return {
      x, y,
      vx: rand(-2.5, 2.5),
      vy: rand(-4, -0.5),
      life: rand(25, 50),
      maxLife: 50,
      size: rand(2, 5),
      col,
    };
  }

  /* ═══════════════════════════════════════════════════════════
     NPCS
  ═══════════════════════════════════════════════════════════ */
  function makeNPC() {
    const plat = platforms[Math.floor(rand(1, platforms.length))];
    const c = makeCharacter(plat.x + plat.w / 2, plat.y - 38, false);
    c.patrolX1 = plat.x + 10;
    c.patrolX2 = plat.x + plat.w - 10;
    c.patrolDir = 1;
    c.bodyCol = ['#2d6ba0','#3a5a80','#1e4570'][Math.floor(rand(0,3))];
    c.headCol = '#5ab0f4';
    return c;
  }

  /* ═══════════════════════════════════════════════════════════
     BACKGROUND STARS
  ═══════════════════════════════════════════════════════════ */
  const stars = Array.from({ length: 60 }, () => ({
    x: rand(0, W), y: rand(0, H * 0.7),
    r: rand(0.5, 1.5), a: rand(0.2, 0.8),
  }));

  /* ═══════════════════════════════════════════════════════════
     WORLD CAMERA
  ═══════════════════════════════════════════════════════════ */
  const cam = { x: 0, y: 0 };

  /* ═══════════════════════════════════════════════════════════
     GAME STATE
  ═══════════════════════════════════════════════════════════ */
  let player = makeCharacter(80, GROUND_Y - 38, true);
  let npcs   = Array.from({ length: 3 }, makeNPC);
  let props  = [];
  let particles = [];
  let propCooldown = 0;

  /* ── Reset ───────────────────────────────────────────────── */
  function resetGame() {
    player = makeCharacter(80, GROUND_Y - 38, true);
    npcs   = Array.from({ length: 3 }, makeNPC);
    props  = [];
    particles = [];
  }

  /* ═══════════════════════════════════════════════════════════
     PHYSICS
  ═══════════════════════════════════════════════════════════ */
  const GRAVITY  = 0.5;
  const FRICTION = 0.82;
  const SPEED    = 3.8;
  const JUMP_V   = -11;

  function platformCollide(obj, plat) {
    const bottom = obj.y + obj.h;
    const prevBottom = bottom - obj.vy;
    if (
      obj.x + obj.w > plat.x &&
      obj.x < plat.x + plat.w &&
      prevBottom <= plat.y + 2 &&
      bottom >= plat.y
    ) {
      obj.y = plat.y - obj.h;
      obj.vy = 0;
      obj.onGround = true;
      obj.jumps = 0;
      return true;
    }
    return false;
  }

  function updatePhysics(obj) {
    obj.onGround = false;
    obj.vy += GRAVITY;
    obj.x += obj.vx;
    obj.y += obj.vy;

    for (const p of platforms) {
      if (platformCollide(obj, p)) break;
    }

    // world bounds
    obj.x = clamp(obj.x, 0, W - obj.w);
    if (obj.y > H + 50) {
      obj.y = 0; obj.vy = 0;
    }
  }

  function updateRagdoll(obj) {
    obj.ragVel += (0 - obj.ragAngle) * 0.05;
    obj.ragVel *= 0.88;
    obj.ragAngle += obj.ragVel;
    obj.vy += GRAVITY;
    obj.vx *= 0.96;
    obj.x += obj.vx;
    obj.y += obj.vy;
    for (const p of platforms) {
      platformCollide(obj, p);
    }
    obj.x = clamp(obj.x, 0, W - obj.w);
    if (obj.y > H + 50) { obj.y = 0; obj.vy = 0; }
  }

  /* ═══════════════════════════════════════════════════════════
     PROP PHYSICS
  ═══════════════════════════════════════════════════════════ */
  function updateProp(prop) {
    prop.life--;
    prop.onGround = false;
    prop.vy += GRAVITY * 0.9;
    prop.angle += prop.angVel;
    prop.x += prop.vx;
    prop.y += prop.vy;

    for (const p of platforms) {
      if (platformCollide(prop, p)) {
        prop.vx *= FRICTION;
        prop.angVel *= 0.7;
      }
    }
    prop.x = clamp(prop.x, 0, W - prop.w);
    if (prop.y > H + 50) prop.life = 0;

    // prop–NPC collision
    for (const npc of npcs) {
      if (!npc.ragdoll) {
        const dx = (npc.x + npc.w / 2) - (prop.x + prop.w / 2);
        const dy = (npc.y + npc.h / 2) - (prop.y + prop.h / 2);
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
          npc.ragdoll = true;
          npc.ragAngle = 0;
          npc.ragVel = prop.vx * 0.3;
          npc.vx = prop.vx * 0.8;
          npc.vy = -5;
          // splash particles
          for (let i = 0; i < 10; i++) {
            particles.push(makeParticle(npc.x + npc.w / 2, npc.y + npc.h / 2, COL.accent));
          }
          // prop bounce
          prop.vy = -4;
          prop.vx *= -0.5;
          prop.angVel *= -1.2;
          // respawn npc after 4s
          setTimeout(() => {
            npc.ragdoll = false; npc.ragAngle = 0; npc.ragVel = 0;
            const plat = platforms[Math.floor(rand(1, platforms.length))];
            npc.x = plat.x + plat.w / 2;
            npc.y = plat.y - 38;
            npc.vx = 0; npc.vy = 0;
          }, 4000);
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     UPDATE LOOP
  ═══════════════════════════════════════════════════════════ */
  function update() {
    if (keys['KeyR']) resetGame();

    /* ── Player input ──────────────────────────────────────── */
    if (!player.ragdoll) {
      const left  = keys['ArrowLeft']  || keys['KeyA'];
      const right = keys['ArrowRight'] || keys['KeyD'];
      const jump  = keys['ArrowUp']    || keys['KeyW'] || keys['Space'];

      if (left)  { player.vx -= SPEED; player.dir = -1; }
      if (right) { player.vx += SPEED; player.dir =  1; }
      if (!left && !right) player.vx *= 0.7;
      player.vx = clamp(player.vx, -SPEED, SPEED);

      if (jump && player.jumps < player.maxJumps) {
        if (!keys['_jumpHeld']) {
          player.vy = JUMP_V;
          player.jumps++;
          keys['_jumpHeld'] = true;
          for (let i = 0; i < 6; i++) {
            particles.push(makeParticle(
              player.x + player.w / 2, player.y + player.h,
              COL.accent
            ));
          }
        }
      } else { keys['_jumpHeld'] = false; }

      /* throw prop */
      if ((keys['KeyZ'] || keys['KeyX']) && propCooldown <= 0) {
        const type = propTypes[Math.floor(rand(0, propTypes.length))];
        props.push(makeProp(
          player.x + player.w / 2,
          player.y + player.h / 2,
          player.dir * 9,
          -3,
          type
        ));
        propCooldown = 25;
        player.vx -= player.dir * 2; // kick back
      }
    }
    if (propCooldown > 0) propCooldown--;

    /* ── Player physics ────────────────────────────────────── */
    if (player.ragdoll) updateRagdoll(player);
    else updatePhysics(player);
    player.limbT += 0.12;

    /* ── NPC AI ────────────────────────────────────────────── */
    for (const npc of npcs) {
      if (npc.ragdoll) { updateRagdoll(npc); continue; }
      // patrol
      npc.vx = npc.patrolDir * 1.2;
      if (npc.x >= npc.patrolX2) npc.patrolDir = -1;
      if (npc.x <= npc.patrolX1) npc.patrolDir =  1;
      npc.dir = npc.patrolDir;
      updatePhysics(npc);
      npc.limbT += 0.09;
    }

    /* ── Props ─────────────────────────────────────────────── */
    for (let i = props.length - 1; i >= 0; i--) {
      updateProp(props[i]);
      if (props[i].life <= 0) props.splice(i, 1);
    }

    /* ── Particles ─────────────────────────────────────────── */
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    /* ── Camera follow ─────────────────────────────────────── */
    const targetCX = player.x - W / 2;
    cam.x = lerp(cam.x, clamp(targetCX, 0, 0), 0.1); // world is one screen wide — keep at 0
  }

  /* ═══════════════════════════════════════════════════════════
     DRAW HELPERS
  ═══════════════════════════════════════════════════════════ */

  /* Draw a Gmod-style 2D stick character */
  function drawCharacter(c) {
    ctx.save();
    const cx = c.x + c.w / 2;
    const cy = c.y;

    if (c.ragdoll) {
      ctx.translate(cx, cy + c.h / 2);
      ctx.rotate(c.ragAngle + Math.sin(Date.now() * 0.003) * 0.08);
      drawStickFigure(c, 0, -c.h / 2, true);
    } else {
      drawStickFigure(c, cx, cy, false);
    }
    ctx.restore();
  }

  function drawStickFigure(c, cx, cy, centered) {
    const t = c.limbT;
    const dir = c.dir;
    const moving = Math.abs(c.vx) > 0.3;
    const legSwing  = moving ? Math.sin(t) * 0.35  : 0;
    const armSwing  = moving ? Math.sin(t) * 0.28  : Math.sin(t * 0.4) * 0.1;
    const bodyBob   = moving ? Math.abs(Math.sin(t)) * 1.5 : 0;
    const airTilt   = !c.onGround ? dir * 0.12 : 0;

    const ox = cx, oy = cy + bodyBob;

    /* Body proportions */
    const headR  = 7;
    const neckY  = oy + headR * 2;
    const hipY   = oy + 26;
    const footY  = oy + 38;

    /* ── Hat (Gmod Citizen style) ──────────────────────────── */
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(airTilt);
    // head
    ctx.beginPath();
    ctx.arc(0, headR, headR, 0, Math.PI * 2);
    ctx.fillStyle = c.headCol;
    ctx.fill();
    // face shading
    ctx.beginPath();
    ctx.arc(dir * 2, headR - 1, headR * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    // eye
    ctx.beginPath();
    ctx.arc(dir * 3.5, headR - 1, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = c.ragdoll ? '#e05252' : '#c8e8ff';
    ctx.fill();
    // hat brim
    ctx.fillStyle = c.hatCol;
    ctx.fillRect(-8, -1, 16, 3);
    // hat top
    ctx.fillRect(-5, -9, 10, 10);
    ctx.restore();

    /* ── Torso ─────────────────────────────────────────────── */
    ctx.save();
    ctx.translate(ox, oy + headR * 2 - 2);
    ctx.rotate(airTilt * 0.5);
    // body rect
    ctx.fillStyle = c.bodyCol;
    ctx.beginPath();
    ctx.roundRect(-5, 0, 10, 13, 2);
    ctx.fill();
    // vest accent
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(-2, 11); ctx.stroke();
    ctx.restore();

    /* ── Arms ──────────────────────────────────────────────── */
    function drawArm(side, swing) {
      ctx.save();
      ctx.translate(ox + side * 5, oy + headR * 2 + 2);
      ctx.rotate(swing * side);
      ctx.strokeStyle = c.bodyCol;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * 5, 9);
      ctx.stroke();
      ctx.restore();
    }
    drawArm(-1,  armSwing);
    drawArm( 1, -armSwing);

    /* ── Legs ──────────────────────────────────────────────── */
    function drawLeg(side, swing) {
      ctx.save();
      ctx.translate(ox + side * 3, oy + headR * 2 + 11);
      ctx.rotate(swing * side);
      // thigh
      ctx.strokeStyle = c.ragdoll ? '#3a5a80' : '#1e3a5c';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * 2, 11);
      ctx.stroke();
      // shin
      ctx.beginPath();
      ctx.moveTo(side * 2, 11);
      ctx.lineTo(side * 4, 22);
      ctx.stroke();
      // boot
      ctx.fillStyle = '#0d1825';
      ctx.beginPath();
      ctx.ellipse(side * 4.5, 23, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawLeg(-1, -legSwing);
    drawLeg( 1,  legSwing);
  }

  /* Draw a prop (barrel / crate) */
  function drawProp(prop) {
    ctx.save();
    ctx.translate(prop.x + prop.w / 2, prop.y + prop.h / 2);
    ctx.rotate(prop.angle);

    if (prop.type === 'barrel') {
      // body
      ctx.fillStyle = prop.life < 60 ? '#a03010' : COL.prop;
      ctx.beginPath();
      ctx.roundRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h, 4);
      ctx.fill();
      // bands
      ctx.strokeStyle = COL.propStroke;
      ctx.lineWidth = 2;
      for (const by of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.moveTo(-prop.w / 2, by);
        ctx.lineTo( prop.w / 2, by);
        ctx.stroke();
      }
    } else {
      // crate
      ctx.fillStyle = prop.life < 60 ? '#7a4020' : '#a07040';
      ctx.fillRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      ctx.strokeStyle = '#6a4820';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      // X
      ctx.beginPath();
      ctx.moveTo(-prop.w / 2, -prop.h / 2); ctx.lineTo(prop.w / 2, prop.h / 2);
      ctx.moveTo( prop.w / 2, -prop.h / 2); ctx.lineTo(-prop.w / 2, prop.h / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN DRAW
  ═══════════════════════════════════════════════════════════ */
  let lastTime = 0, fps = 60;

  function draw(timestamp) {
    const dt = timestamp - lastTime;
    fps = Math.round(lerp(fps, 1000 / (dt || 16), 0.08));
    lastTime = timestamp;
    const fpsBadge = document.getElementById('fps-counter');
    if (fpsBadge) fpsBadge.textContent = fps + ' FPS';

    /* sky */
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#060c14');
    skyGrad.addColorStop(1, '#0d1e30');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    /* stars */
    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(Date.now() * 0.0007 + s.x));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = '#9cc8e8';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* bg city silhouette */
    ctx.fillStyle = '#0a1520';
    for (let bx = 0; bx < W; bx += 40) {
      const bh = 30 + Math.sin(bx * 0.07) * 20 + (bx % 80 === 0 ? 25 : 0);
      ctx.fillRect(bx, GROUND_Y - bh, 36, bh);
    }

    /* platforms */
    for (const p of platforms) {
      // fill
      ctx.fillStyle = COL.platform;
      ctx.fillRect(p.x, p.y + 2, p.w, p.h - 2);
      // top edge glow
      const platGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 4);
      platGrad.addColorStop(0, COL.platTop);
      platGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = platGrad;
      ctx.fillRect(p.x, p.y, p.w, 4);
      // grid marks on ground
      if (p.h > 20) {
        ctx.strokeStyle = 'rgba(77,157,224,0.06)';
        ctx.lineWidth = 1;
        for (let gx = p.x; gx < p.x + p.w; gx += 40) {
          ctx.beginPath(); ctx.moveTo(gx, p.y); ctx.lineTo(gx, p.y + p.h); ctx.stroke();
        }
      }
    }

    /* particles */
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.col;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* props */
    for (const p of props) drawProp(p);

    /* NPCs */
    for (const npc of npcs) drawCharacter(npc);

    /* player */
    drawCharacter(player);

    /* HUD */
    ctx.fillStyle = 'rgba(77,157,224,0.55)';
    ctx.font = '700 11px "Share Tech Mono"';
    ctx.fillText(`JUMPS: ${player.maxJumps - player.jumps} / ${player.maxJumps}`, 12, 18);
    ctx.fillText(`PROPS: ${props.length}`, 12, 32);

    /* Controls reminder overlay (first 5s) */
    if (timestamp < 5000) {
      ctx.globalAlpha = 1 - timestamp / 5000;
      ctx.fillStyle = 'rgba(10,13,18,0.55)';
      ctx.fillRect(W / 2 - 130, H / 2 - 22, 260, 44);
      ctx.fillStyle = '#4d9de0';
      ctx.font = '12px "Share Tech Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('WASD / ARROWS · SPACE to jump · Z to throw', W / 2, H / 2 + 4);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     GAME LOOP
  ═══════════════════════════════════════════════════════════ */
  function loop(ts) {
    update();
    draw(ts);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

})();
