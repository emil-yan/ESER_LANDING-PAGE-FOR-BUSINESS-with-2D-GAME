/* ============================================================
   SOURCE GAMES — main.js
   Landing page interactions: scroll reveal, stat counters,
   navbar scroll state, custom cursor glow
   ============================================================ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     NAVBAR: add shadow + tighter bg on scroll
  ═══════════════════════════════════════════════════════════ */
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.background = 'rgba(10,13,18,0.98)';
      navbar.style.borderBottomColor = 'rgba(82,140,200,0.28)';
    } else {
      navbar.style.background = '';
      navbar.style.borderBottomColor = '';
    }
  }, { passive: true });

  /* ═══════════════════════════════════════════════════════════
     SCROLL REVEAL — mark elements with data-reveal
  ═══════════════════════════════════════════════════════════ */
  const revealTargets = [
    '.about-tag',
    '.about-heading',
    '.about-body-col',
    '.feature-card',
    '.section-tag',
    '.section-title',
    '.section-sub',
    '.game-wrapper',
    '.community-heading',
    '.community-sub',
    '.community-actions',
  ];

  // Add attribute to all matching elements
  revealTargets.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = `${i * 0.06}s`;
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));

  /* ═══════════════════════════════════════════════════════════
     STAT COUNTER ANIMATION
  ═══════════════════════════════════════════════════════════ */
  function animateCounter(el, target, duration = 1800) {
    const start = performance.now();
    const suffix = el.dataset.suffix || '';

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const value = Math.round(eased * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // Observe stat numbers
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.target, 10);
        if (!isNaN(target)) animateCounter(entry.target, target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num[data-target]').forEach(el => statObserver.observe(el));

  /* ═══════════════════════════════════════════════════════════
     SMOOTH ANCHOR SCROLL
  ═══════════════════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ═══════════════════════════════════════════════════════════
     CURSOR GLOW (subtle) — desktop only
  ═══════════════════════════════════════════════════════════ */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const glow = document.createElement('div');
    glow.id = 'cursor-glow';
    Object.assign(glow.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '9998',
      width: '260px', height: '260px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(77,157,224,0.08) 0%, transparent 70%)',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 0.3s',
      top: '0', left: '0',
    });
    document.body.appendChild(glow);

    let mx = 0, my = 0, gx = 0, gy = 0;

    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    (function glowLoop() {
      gx = lerp(gx, mx, 0.1);
      gy = lerp(gy, my, 0.1);
      glow.style.left = gx + 'px';
      glow.style.top  = gy + 'px';
      requestAnimationFrame(glowLoop);
    })();

    function lerp(a, b, t) { return a + (b - a) * t; }

    // hide on idle
    let idleTimer;
    window.addEventListener('mousemove', () => {
      glow.style.opacity = '1';
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { glow.style.opacity = '0'; }, 3000);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     HERO TITLE GLITCH EFFECT (subtle, on interval)
  ═══════════════════════════════════════════════════════════ */
  const titleLine = document.querySelector('.title-line');
  if (titleLine) {
    function glitchEffect() {
      titleLine.style.textShadow = `
        ${(Math.random() * 6 - 3).toFixed(1)}px 0 rgba(77,157,224,0.6),
        ${(Math.random() * -4).toFixed(1)}px 0 rgba(232,116,42,0.4)
      `;
      setTimeout(() => {
        titleLine.style.textShadow = '0 0 80px rgba(77,157,224,0.2), 0 0 1px #4d9de0';
      }, 100);
    }

    setInterval(glitchEffect, 3200);
    // immediate first
    setTimeout(glitchEffect, 1500);
  }

  /* ═══════════════════════════════════════════════════════════
     FEATURE CARD HOVER — animated border glow
  ═══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = 'inset 0 0 0 1px rgba(77,157,224,0.3)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
    });
  });

  /* ═══════════════════════════════════════════════════════════
     PARALLAX HERO ORBS on mouse move
  ═══════════════════════════════════════════════════════════ */
  const orb1 = document.querySelector('.orb-1');
  const orb2 = document.querySelector('.orb-2');

  if (orb1 && orb2) {
    window.addEventListener('mousemove', e => {
      const rx = (e.clientX / window.innerWidth  - 0.5) * 2;
      const ry = (e.clientY / window.innerHeight - 0.5) * 2;
      orb1.style.transform = `translate(${rx * 18}px, ${ry * 12}px)`;
      orb2.style.transform = `translate(${rx * -14}px, ${ry * -10}px)`;
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════
     GAME SECTION FOCUS — pause page scroll when cursor over canvas
  ═══════════════════════════════════════════════════════════ */
  const gameCanvas = document.getElementById('gameCanvas');
  if (gameCanvas) {
    gameCanvas.addEventListener('mouseenter', () => {
      document.body.style.overflow = 'hidden';
    });
    gameCanvas.addEventListener('mouseleave', () => {
      document.body.style.overflow = '';
    });
    // mobile tap focus
    gameCanvas.addEventListener('touchstart', () => {
      gameCanvas.focus();
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════
     INIT LOG
  ═══════════════════════════════════════════════════════════ */
  console.log('%c[ SOURCE GAMES ]', 'color:#4d9de0;font-family:monospace;font-size:14px;font-weight:bold;');
  console.log('%cBuilt with HTML · CSS · Vanilla JS', 'color:#6a7f96;font-family:monospace;font-size:11px;');

})();
