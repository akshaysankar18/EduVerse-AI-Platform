/* ============================================
   EDUVERSE AI — PREMIUM LANDING JS
   v2.0 — Production Upgrade
   ============================================ */

'use strict';

// ============================================================
// UTILITY
// ============================================================
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ============================================================
// NAVBAR — scroll glassmorphism + mobile toggle
// ============================================================
(function initNavbar() {
  const navbar = qs('#navbar');
  let lastY = 0;

  const handleScroll = () => {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 20);
    // Hide navbar when scrolling down fast, show when scrolling up
    if (y > lastY + 5 && y > 200) {
      navbar.style.transform = 'translateY(-100%)';
    } else if (y < lastY - 5 || y < 200) {
      navbar.style.transform = '';
    }
    lastY = y;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Mobile hamburger
  const hamburger = qs('#nav-hamburger');
  const mobileMenu = qs('#mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      // Animate spans
      const spans = qsa('span', hamburger);
      if (open) {
        spans[0].style.transform = 'rotate(45deg) translate(4.5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(4.5px, -5px)';
      } else {
        spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
  }
})();

function closeMobileMenu() {
  const mobileMenu = qs('#mobile-menu');
  const hamburger = qs('#nav-hamburger');
  if (!mobileMenu) return;
  mobileMenu.classList.remove('open');
  if (hamburger) {
    qsa('span', hamburger).forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
}
window.closeMobileMenu = closeMobileMenu;

// ============================================================
// SMOOTH SCROLL — for anchor links
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ============================================================
// HERO PARTICLE CANVAS
// ============================================================
(function initParticles() {
  const canvas = qs('#hero-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H, animId;

  const resize = () => {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    if (particles.length === 0) createParticles();
  };

  const createParticles = () => {
    const count = Math.floor((W * H) / 18000);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.6 ? '124,255,79' : '16,185,129',
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    }
    animId = requestAnimationFrame(draw);
  };

  window.addEventListener('resize', () => { resize(); });
  resize();
  draw();
})();

// ============================================================
// HERO TYPING EFFECT
// ============================================================
(function initTyping() {
  const el = qs('#typing-word');
  if (!el) return;
  const words = ['Learning.', 'Growth.', 'Journey.', 'Excellence.', 'Future.'];
  let wi = 0, ci = 0, deleting = false;
  const speed = { type: 80, delete: 45, pause: 2200 };

  const tick = () => {
    const word = words[wi];
    if (!deleting) {
      ci++;
      el.textContent = word.slice(0, ci);
      if (ci === word.length) {
        deleting = true;
        setTimeout(tick, speed.pause);
        return;
      }
      setTimeout(tick, speed.type);
    } else {
      ci--;
      el.textContent = word.slice(0, ci);
      if (ci === 0) {
        deleting = false;
        wi = (wi + 1) % words.length;
        setTimeout(tick, 300);
        return;
      }
      setTimeout(tick, speed.delete);
    }
  };

  setTimeout(tick, 1200);
})();

// ============================================================
// HERO MOUSE PARALLAX — floating cards + orbs
// ============================================================
(function initParallax() {
  const hero = qs('#hero');
  if (!hero || window.innerWidth < 1024) return;

  const orbs = qsa('.hero-orb', hero);
  const floats = qsa('.hero-float', hero);
  let mx = 0, my = 0, cx = 0, cy = 0;
  let animating = false;

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    mx = (e.clientX - rect.left - rect.width / 2) / rect.width;
    my = (e.clientY - rect.top - rect.height / 2) / rect.height;
    if (!animating) {
      animating = true;
      requestAnimationFrame(applyParallax);
    }
  });

  const applyParallax = () => {
    cx += (mx - cx) * 0.06;
    cy += (my - cy) * 0.06;

    orbs.forEach((orb, i) => {
      const d = (i + 1) * 12;
      orb.style.transform = `translate(${cx * d}px, ${cy * d}px)`;
    });
    floats.forEach((f, i) => {
      const d = (i % 2 === 0 ? -1 : 1) * (i + 1) * 8;
      const fd = i * 6;
      f.style.transform += ``;
      f.style.transform = f.style.transform.replace(/translate3d\([^)]+\)/, '');
      const base = f.dataset.baseTransform || f.style.transform;
      f.style.transform = `translateX(${cx * d}px) translateY(${cy * fd}px)`;
    });

    animating = Math.abs(mx - cx) > 0.001 || Math.abs(my - cy) > 0.001;
    if (animating) requestAnimationFrame(applyParallax);
  };
})();

// ============================================================
// INTERSECTION OBSERVER — scroll animations
// ============================================================
(function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay || '0s';
        el.style.animationDelay = delay;
        el.style.animationFillMode = 'both';
        el.classList.add('animated-in');
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  qsa('[data-animate]').forEach(el => observer.observe(el));
})();

// ============================================================
// COUNTER ANIMATION
// ============================================================
(function initCounters() {
  const counters = qsa('[data-count]');
  if (!counters.length) return;

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count);
    const duration = 1800;
    const start = performance.now();

    const formatNum = (n) => {
      if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
      return n;
    };

    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const val = Math.floor(easeOut(progress) * target);
      el.textContent = formatNum(val);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = formatNum(target);
    };
    requestAnimationFrame(update);
  };

  const counterObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => counterObs.observe(c));
})();

// ============================================================
// STATS BARS ANIMATION
// ============================================================
(function initStatBars() {
  const bars = qsa('.stat-item-bar-fill');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => { e.target.style.width = e.target.style.width; }, 100);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  bars.forEach(b => obs.observe(b));
})();

// ============================================================
// PAGE TRANSITIONS
// ============================================================
(function initPageTransitions() {
  const overlay = qs('#page-overlay');
  if (!overlay) return;

  // Fade in on page load
  overlay.style.opacity = '1';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity = '0';
    });
  });

  // Fade out before navigating
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http') || link.target === '_blank') return;

    e.preventDefault();
    overlay.style.transition = 'opacity 0.35s ease';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    setTimeout(() => {
      window.location.href = href;
    }, 380);
  });
})();

// ============================================================
// WATCH DEMO MODAL
// ============================================================
(function initWatchDemo() {
  const btn = qs('#watch-demo-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);
      backdrop-filter:blur(24px);display:flex;align-items:center;justify-content:center;
      padding:24px;animation:fadeIn 0.3s ease;
    `;
    modal.innerHTML = `
      <div style="background:#141414;border:1px solid rgba(124,255,79,0.15);border-radius:24px;padding:40px;max-width:560px;width:100%;text-align:center;position:relative">
        <button onclick="this.closest('[style*=fixed]').remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.08);border:none;border-radius:8px;width:32px;height:32px;color:#fff;cursor:pointer;font-size:16px">✕</button>
        <div style="font-size:48px;margin-bottom:20px">🎬</div>
        <div style="font-size:20px;font-weight:800;margin-bottom:12px">Demo Coming Soon</div>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin-bottom:28px">Our product walkthrough video is being produced. In the meantime, try the live platform — it's free to get started!</p>
        <a href="dashboard.html" style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#7CFF4F;color:#000;border-radius:100px;font-weight:700;font-size:14px;text-decoration:none">Explore the Platform →</a>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  });
})();

// ============================================================
// AGENT CARD 3D HOVER TILT
// ============================================================
(function initAgentCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;
  qsa('.ai-agent-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-4px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

// ============================================================
// FEATURE CARD SHIMMER ON HOVER
// ============================================================
(function initFeatureCardShimmer() {
  qsa('.feature-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', `${x}%`);
      card.style.setProperty('--my', `${y}%`);
    });
  });
})();

// ============================================================
// GLOBAL RIPPLE EFFECT ON .btn-primary
// ============================================================
(function initRipple() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-primary');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height) * 2.5;
    ripple.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;
      left:${x - size/2}px;top:${y - size/2}px;
      background:rgba(0,0,0,0.15);border-radius:50%;
      transform:scale(0);animation:ripple-effect 0.55s ease-out forwards;
      pointer-events:none;
    `;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
})();

// ============================================================
// ACTIVE NAV LINK ON SCROLL
// ============================================================
(function initActiveNavLink() {
  const sections = qsa('section[id]');
  const navLinks = qsa('.nav-link');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => obs.observe(s));
})();

// Inject animation style once
const style = document.createElement('style');
style.textContent = `
  [data-animate] {
    opacity:0;
    transform:translateY(28px);
    transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
  }
  [data-animate].animated-in {
    opacity:1;
    transform:translateY(0);
  }
  @keyframes ripple-effect {
    to { transform:scale(1); opacity:0; }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to { opacity:1; }
  }
`;
document.head.appendChild(style);
