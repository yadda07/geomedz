/* ==========================================================================
   BELARBIA MOHAMED AMINE · CABINET GEOMED (ORAN, ALGÉRIE)
   Moteur Interactif Mobile / Tablette / PC :
   - Tiroir de navigation natif (Popover Manual + Scroll Snap + Fallbacks)
   - Scroll-Spy Barre d'Application Mobile (iOS / Android) & Header PC
   - Console Topographique & LiDAR 3D sur Papier Cadastral Clair (3 Modes)
   - Carte Géodésique Multi-Wilayas Interactive avec Zoom Cadrage Fluide
   - Filtrage Interactif des Collaborations & Grands Chantiers
   - Qualificateur de Mission 3 Étapes + Presets Tactiles
   - Visionneuse Photo Chantiers avec Swipe Tactile Gauche/Droite
   - Générateur QR Code ISO/IEC 18004 & Partage Natif Web Share API
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. MODERN WEB GUIDANCE FALLBACKS
     ------------------------------------------------------------------------ */

  // Fallback for shrinking-header-on-scroll
  if (!CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)')) {
    const header = document.querySelector('.site-header');
    if (header) {
      const initialHeight = window.innerWidth <= 720 ? 62 : 70;
      const finalHeight = 56;
      const scrollDistance = 120;
      window.addEventListener(
        'scroll',
        () => {
          const scrollPercent = Math.min(1, window.scrollY / scrollDistance);
          const newHeight = initialHeight - (initialHeight - finalHeight) * scrollPercent;
          header.style.height = `${newHeight}px`;
        },
        { passive: true }
      );
    }
  }

  // Fallback for scroll-entry-exit-effects
  if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0) scale(1)';
          }
        }
      },
      { threshold: 0.08 }
    );

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.scroll-reveal').forEach((el) => {
        el.style.opacity = '0.15';
        el.style.transform = 'translateY(14px) scale(0.99)';
        el.style.transition = 'opacity 0.38s ease, transform 0.38s ease';
        revealObserver.observe(el);
      });
    });
  }

  // Fallback & ARIA sync for validate-input-after-interaction
  const UserInvalidFallback = (() => {
    const dirtyState = new WeakMap();

    const updateState = (input) => {
      const isValid = input.checkValidity();
      input.classList.toggle('user-invalid-fallback', !isValid);
      input.classList.toggle('user-valid-fallback', isValid);
      if (!isValid) {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    };

    const handleEvent = (event) => {
      const input = event.target;
      if (event.type === 'reset') {
        const controls = input.elements || [];
        for (const control of controls) {
          dirtyState.delete(control);
          control.classList.remove('user-invalid-fallback', 'user-valid-fallback');
          control.removeAttribute('aria-invalid');
        }
        return;
      }

      if (!input || !input.checkValidity) return;

      if (event.type === 'input' || event.type === 'change') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasInteracted = true;
        dirtyState.set(input, state);
        if (state.hasBlurred) updateState(input);
      } else if (event.type === 'blur') {
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(input, state);
        if (state.hasInteracted) updateState(input);
      }
    };

    const init = (root = document) => {
      if (CSS.supports('selector(:user-invalid)')) return;
      root.addEventListener('blur', handleEvent, true);
      root.addEventListener('input', handleEvent);
      root.addEventListener('change', handleEvent);
      root.addEventListener('reset', handleEvent, true);
    };

    return { init };
  })();

  const syncAria = (el) => {
    if (!el || typeof el.matches !== 'function' || !('validity' in el)) return;
    try {
      el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
    } catch (_) {}
  };

  document.addEventListener('blur', (e) => syncAria(e.target), true);
  document.addEventListener('input', (e) => {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('aria-invalid')) {
      syncAria(e.target);
    }
  });

  /* ------------------------------------------------------------------------
     2. NAVIGATION DRAWER (POPOVER="MANUAL" + SCROLL SNAP + FALLBACKS)
     ------------------------------------------------------------------------ */
  const initNavigationDrawer = () => {
    const drawer = document.getElementById('drawer');
    const openBtn = document.getElementById('drawer-open');
    const closeBtn = document.getElementById('drawer-close');
    if (!drawer || !openBtn) return;

    const scroller = drawer.querySelector('.Drawer-scroller');
    const sheet = drawer.querySelector('.Drawer-sheet');
    const mainEl = document.querySelector('main');
    if (!scroller || !sheet) return;

    const supportsPopover = typeof drawer.showPopover === 'function';

    const showLayer = () => {
      if (supportsPopover) {
        try {
          drawer.showPopover();
        } catch (_) {}
      } else {
        drawer.classList.add('is-open-fallback');
      }
    };

    const hideLayer = () => {
      if (supportsPopover) {
        try {
          drawer.hidePopover();
        } catch (_) {}
      } else {
        drawer.classList.remove('is-open-fallback');
      }
    };

    async function openDrawer() {
      showLayer();

      if (!CSS.supports('scroll-initial-target', 'nearest')) {
        scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'instant' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }

      scroller.scrollTo({ left: 0, behavior: 'auto' });
    }

    function closeDrawer() {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'auto' });
    }

    function onDrawerOpened() {
      if (mainEl) mainEl.inert = true;
      openBtn.setAttribute('aria-expanded', 'true');
      sheet.focus();
    }

    function onDrawerClosed() {
      hideLayer();
      if (mainEl) mainEl.inert = false;
      openBtn.setAttribute('aria-expanded', 'false');
    }

    const visibleThreshold = 1 / window.innerWidth;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry) return;
        if (entry.intersectionRatio < visibleThreshold) onDrawerClosed();
        if (entry.intersectionRatio >= 0.98) onDrawerOpened();
      },
      { root: drawer, threshold: [visibleThreshold, 0.98, 1] }
    );
    observer.observe(sheet);

    if (!CSS.supports('animation-timeline: scroll()')) {
      scroller.addEventListener(
        'scroll',
        () => {
          const w = sheet.offsetWidth || 1;
          const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / w));
          drawer.style.setProperty('--drawer-backdrop', String(ratio));
        },
        { passive: true }
      );
    }

    openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    drawer.addEventListener('click', (event) => {
      if (!sheet.contains(event.target)) closeDrawer();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && openBtn.getAttribute('aria-expanded') === 'true') {
        closeDrawer();
      }
    });

    sheet.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        const targetEl = targetId ? document.querySelector(targetId) : null;
        if (targetEl) {
          e.preventDefault();
          closeDrawer();
          setTimeout(() => {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }, 180);
        }
      });
    });
  };

  /* ------------------------------------------------------------------------
     3. SCROLL-SPY NAVIGATION (BARRE MOBILE APP + HEADER DESKTOP)
     ------------------------------------------------------------------------ */
  const initScrollSpy = () => {
    const sections = document.querySelectorAll('main section[id], main[id]');
    const navLinks = document.querySelectorAll('.main-nav .nav-link');
    const bottomTabs = document.querySelectorAll('.mobile-bottom-nav .bottom-tab');

    const setActiveId = (id) => {
      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === `#${id}`);
      });

      bottomTabs.forEach((tab) => {
        const target = tab.getAttribute('data-spy-target') || tab.getAttribute('href')?.replace('#', '');
        const isMatch =
          target === id ||
          (id === 'contact' && target === 'qualifier') ||
          (id === 'hero-section' && target === 'top');
        tab.classList.toggle('active', isMatch);
      });
    };

    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id') || 'top';
            setActiveId(id);
          }
        });
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: 0.02 }
    );

    sections.forEach((sec) => spyObserver.observe(sec));
  };

  /* ------------------------------------------------------------------------
     4. CONSOLE TOPOGRAPHIQUE & LIDAR 3D (FOND PAPIER CADASTRAL CLAIR)
        Modes: 'mnt3d' (Relief 3D), 'cad' (Plan Courbes & Polygonale), 'lidar' (Scan Laser)
     ------------------------------------------------------------------------ */
  const initGeodeticConsole = () => {
    const canvas = document.getElementById('topo-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let mode = 'mnt3d';
    let pointer = { x: 0.56, y: 0.44 };
    let t = 0;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || 480;
      height = rect.height || 220;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resize);
    resize();

    document.querySelectorAll('[data-console-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-console-mode]').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        mode = btn.getAttribute('data-console-mode') || 'mnt3d';
      });
    });

    const elUtm = document.getElementById('hud-utm-coords');
    const elAlt = document.getElementById('hud-alt-val');
    const elAzimuth = document.getElementById('hud-azimuth-val');
    const elDist = document.getElementById('hud-dist-val');

    const updateTelemetry = (nx, ny) => {
      const east = (708420 + (nx - 0.5) * 3200).toFixed(2);
      const north = (3948650 + (0.5 - ny) * 2400).toFixed(2);
      const z = (118.4 + Math.sin(nx * 4.5) * 24 + Math.cos(ny * 3.8) * 16).toFixed(2);
      const dx = nx - 0.22;
      const dy = 0.72 - ny;
      let rad = Math.atan2(dx, dy);
      if (rad < 0) rad += Math.PI * 2;
      const gon = ((rad / (Math.PI * 2)) * 400).toFixed(3);
      const dh = Math.hypot(dx * 640, dy * 480).toFixed(2);

      if (elUtm) elUtm.textContent = `E ${east} · N ${north}`;
      if (elAlt) elAlt.textContent = `+${z} m NGA`;
      if (elAzimuth) elAzimuth.textContent = `${gon} gon`;
      if (elDist) elDist.textContent = `${dh} m`;
    };

    const handlePointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = Math.max(0.06, Math.min(0.94, (e.clientX - rect.left) / rect.width));
      pointer.y = Math.max(0.08, Math.min(0.92, (e.clientY - rect.top) / rect.height));
      updateTelemetry(pointer.x, pointer.y);
    };

    canvas.parentElement.addEventListener('pointermove', handlePointer, { passive: true });
    canvas.parentElement.addEventListener('pointerdown', handlePointer, { passive: true });

    const elevationAt = (u, v, time) => {
      const d1 = Math.hypot(u - 0.35, v - 0.42);
      const d2 = Math.hypot(u - 0.7, v - 0.58);
      const peak1 = Math.exp(-d1 * d1 * 9) * 38;
      const peak2 = Math.exp(-d2 * d2 * 11) * 30;
      const wave = Math.sin(u * 6 + time) * 3.5 + Math.cos(v * 5 - time * 0.8) * 3.5;
      return peak1 + peak2 + wave;
    };

    const drawMillimetricGrid = () => {
      ctx.fillStyle = '#faf9f5';
      ctx.fillRect(0, 0, width, height);

      const step = 22;
      ctx.beginPath();
      for (let x = step; x < width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.strokeStyle = 'rgba(213, 208, 195, 0.55)';
      ctx.lineWidth = 0.75;
      ctx.stroke();
    };

    const drawMNT3D = () => {
      const cols = 20;
      const rows = 14;
      const tiltX = (pointer.x - 0.5) * 0.36;
      const tiltY = (pointer.y - 0.5) * 0.24;

      const project = (u, v, z) => {
        const cx = u - 0.5;
        const cy = v - 0.5;
        const rx = cx * Math.cos(tiltX) - cy * Math.sin(tiltX);
        const ry = cx * Math.sin(tiltX) + cy * Math.cos(tiltX);
        const isoX = width * 0.5 + (rx - ry * 0.52) * (width * 0.74);
        const isoY = height * 0.66 + (rx * 0.34 + ry * 0.56) * (height * 0.64) - z * (1.08 + tiltY * 0.25);
        return { x: isoX, y: isoY, z };
      };

      const pts = [];
      for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        const v = r / rows;
        for (let c = 0; c <= cols; c++) {
          const u = c / cols;
          const z = elevationAt(u, v, t);
          pts[r][c] = project(u, v, z);
        }
      }

      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const p = pts[r][c];
          if (c === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = r % 4 === 0 ? 'rgba(13, 122, 95, 0.55)' : 'rgba(13, 122, 95, 0.2)';
        ctx.lineWidth = r % 4 === 0 ? 1.25 : 0.75;
        ctx.stroke();
      }

      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          const p = pts[r][c];
          if (r === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = c % 4 === 0 ? 'rgba(200, 75, 40, 0.42)' : 'rgba(20, 26, 33, 0.1)';
        ctx.lineWidth = c % 4 === 0 ? 1.15 : 0.65;
        ctx.stroke();
      }

      const benchmarks = [
        { r: 5, c: 7, label: 'BN-01 AKID LOTFI (+118.4m)', color: '#c84b28' },
        { r: 9, c: 14, label: 'ST-02 TAFRAOUI (+164.2m)', color: '#0d7a5f' },
        { r: 3, c: 15, label: 'ST-03 PÔLE ARZEW', color: '#0369a1' }
      ];

      benchmarks.forEach((bm) => {
        const p = pts[bm.r][bm.c];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 22);
        ctx.strokeStyle = bm.color;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = bm.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 22, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#141a21';
        ctx.fillText(bm.label, p.x + 6, p.y - 19);
      });
    };

    const drawCADContours = () => {
      const centers = [
        { x: width * 0.35, y: height * 0.48, maxR: width * 0.38, rings: 7 },
        { x: width * 0.72, y: height * 0.54, maxR: width * 0.32, rings: 6 }
      ];

      centers.forEach((c, idx) => {
        for (let i = 1; i <= c.rings; i++) {
          const rBase = (c.maxR / c.rings) * i;
          const isMaster = i % 3 === 0;
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.12) {
            const mod = Math.sin(a * 3 + t + idx) * 8 + Math.cos(a * 2 - t) * 5;
            const px = c.x + Math.cos(a) * (rBase + mod) * 1.12;
            const py = c.y + Math.sin(a) * (rBase + mod) * 0.72;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = isMaster ? 'rgba(200, 75, 40, 0.65)' : 'rgba(13, 122, 95, 0.28)';
          ctx.lineWidth = isMaster ? 1.4 : 0.85;
          ctx.stroke();
        }
      });

      const poly = [
        { x: width * 0.16, y: height * 0.74, id: 'P101 (BASE)' },
        { x: width * 0.34, y: height * 0.26, id: 'P102' },
        { x: width * 0.66, y: height * 0.24, id: 'P103' },
        { x: width * 0.84, y: height * 0.66, id: 'P104' }
      ];

      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      ctx.lineTo(pointer.x * width, pointer.y * height);
      ctx.strokeStyle = 'rgba(3, 105, 161, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();

      ctx.beginPath();
      poly.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = '#141a21';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      poly.forEach((p) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#c84b28';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#141a21';
        ctx.fillText(p.id, p.x + 7, p.y - 5);
      });
    };

    const drawLiDAR = () => {
      const cols = 30;
      const rows = 18;
      const sweepX = ((Math.sin(t * 1.4) + 1) * 0.5) * width;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) / cols;
          const v = (r + 0.5) / rows;
          const z = elevationAt(u, v, t * 0.6);
          const px = u * width + Math.sin(v * 8 + t) * 3.5;
          const py = v * height - (z - 18) * 0.5;
          const distToSweep = Math.abs(px - sweepX);
          const glow = Math.max(0, 1 - distToSweep / 65);

          ctx.fillStyle =
            z > 28
              ? `rgba(200, 75, 40, ${0.48 + glow * 0.48})`
              : `rgba(13, 122, 95, ${0.42 + glow * 0.52})`;
          const radius = 1.3 + (z / 42) * 1.3 + glow * 1.2;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const grad = ctx.createLinearGradient(sweepX - 28, 0, sweepX + 28, 0);
      grad.addColorStop(0, 'rgba(13, 122, 95, 0)');
      grad.addColorStop(0.5, 'rgba(13, 122, 95, 0.24)');
      grad.addColorStop(1, 'rgba(13, 122, 95, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 28, 0, 56, height);

      ctx.beginPath();
      ctx.moveTo(sweepX, 0);
      ctx.lineTo(sweepX, height);
      ctx.strokeStyle = 'rgba(13, 122, 95, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    const drawOpticalReticle = () => {
      const tx = pointer.x * width;
      const ty = pointer.y * height;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.strokeStyle = '#c84b28';
      ctx.lineWidth = 1.3;

      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-21, 0);
      ctx.lineTo(-6, 0);
      ctx.moveTo(6, 0);
      ctx.lineTo(21, 0);
      ctx.moveTo(0, -21);
      ctx.lineTo(0, -6);
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 21);
      ctx.stroke();

      ctx.fillStyle = '#0d7a5f';
      ctx.beginPath();
      ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      t += 0.012;
      drawMillimetricGrid();

      if (mode === 'mnt3d') drawMNT3D();
      else if (mode === 'cad') drawCADContours();
      else drawLiDAR();

      drawOpticalReticle();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  /* ------------------------------------------------------------------------
     5. CARTE GÉODÉSIQUE INTERACTIVE MULTI-WILAYAS + ZOOM CADRAGE FLUIDE
     ------------------------------------------------------------------------ */
  const initInteractiveMap = () => {
    const svg = document.getElementById('geomed-algeria-map');
    const zoomBtns = document.querySelectorAll('[data-map-view]');
    const wilayaTriggers = document.querySelectorAll('[data-wilaya]');
    const readoutTitle = document.getElementById('wilaya-readout-title');
    const readoutMeta = document.getElementById('wilaya-readout-meta');
    const readoutBtn = document.getElementById('wilaya-readout-cta');

    if (!svg) return;

    const viewBoxes = {
      all: [0, 0, 750, 320],
      nord: [4, 4, 444, 312],
      sud: [450, 4, 296, 312]
    };

    let currentVB = [0, 0, 750, 320];
    let animFrame = null;

    const animateViewBox = (targetVB) => {
      if (animFrame) cancelAnimationFrame(animFrame);
      const startVB = [...currentVB];
      const startTime = performance.now();
      const duration = 320;

      const step = (now) => {
        const p = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - p, 3);
        currentVB = startVB.map((v, i) => v + (targetVB[i] - v) * ease);
        svg.setAttribute('viewBox', currentVB.map((n) => n.toFixed(1)).join(' '));
        if (p < 1) animFrame = requestAnimationFrame(step);
      };
      animFrame = requestAnimationFrame(step);
    };

    zoomBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        zoomBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.getAttribute('data-map-view') || 'all';
        animateViewBox(viewBoxes[key] || viewBoxes.all);
      });
    });

    if (window.innerWidth <= 680) {
      const nordBtn = document.querySelector('[data-map-view="nord"]');
      if (nordBtn) {
        zoomBtns.forEach((b) => b.classList.remove('active'));
        nordBtn.classList.add('active');
        currentVB = [...viewBoxes.nord];
        svg.setAttribute('viewBox', currentVB.join(' '));
      }
    }

    const wilayaData = {
      oran: {
        name: 'Oran · Siège Haï Akid Lotfi',
        coords: 'UTM 30N · 35°43\'27"N, 0°35\'28"W · Mobilisation immédiate',
        desc: 'Interventions en collaboration sur les pôles industriels de Tafraoui, Oued Tlélat, Arzew, Aéroport d’Oran, hôtels et promotions.',
        view: 'nord'
      },
      alger: {
        name: 'Alger · Déploiement Brigade Centre',
        coords: 'UTM 31N · 36°45\'14"N, 3°03\'32"E · Liaison Autoroute Est-Ouest',
        desc: 'Relevés LiDAR 3D, dossiers EDD de grands ensembles, récolement et auscultation d’ouvrages.',
        view: 'nord'
      },
      blida: {
        name: 'Blida · Mitidja & Zones Industrielles',
        coords: 'UTM 31N · 36°28\'12"N, 2°49\'40"E · Brigade Mobile',
        desc: 'Implantation d’unités industrielles, bornage foncier, études VRD et nivellement de précision.',
        view: 'nord'
      },
      tlemcen: {
        name: 'Tlemcen · Axe Frontière Ouest',
        coords: 'UTM 30N · 34°52\'42"N, 1°18\'54"W · Mobilisation < 1h30',
        desc: 'Travaux topographiques, morcellements, lotissements, profils routiers et suivi de génie civil.',
        view: 'nord'
      },
      temouchent: {
        name: 'Aïn Témouchent · Littoral & Zones d’Activités',
        coords: 'UTM 30N · 35°17\'51"N, 1°08\'25"W · Mobilisation < 1h00',
        desc: 'Bornage contradictoire, aménagement foncier, relevés d’état des lieux et réseaux VRD.',
        view: 'nord'
      },
      relizane: {
        name: 'Relizane · Corridor Industriel & Agricole',
        coords: 'UTM 31N · 35°44\'14"N, 0°33\'21"E · Mobilisation < 1h15',
        desc: 'Levés GNSS RTK grand rendement, couloirs énergétiques HT/MT et plateformes logistiques.',
        view: 'nord'
      },
      tiaret: {
        name: 'Tiaret · Hauts-Plateaux Ouest',
        coords: 'UTM 31N · 35°22\'15"N, 1°19\'01"E · Brigade Géodésie',
        desc: 'Grands linéaires HT/MT, études VRD, morcellement parcellaire et rattachement géodésique.',
        view: 'nord'
      },
      sahara: {
        name: 'Sud Algérien · Hassi Messaoud, Hassi R’Mel, Adrar, In Salah',
        coords: 'UTM 30N/31N/32N · Brigades Sahariennes Autonomes GNSS RTK/PPK',
        desc: 'Interventions en collaboration sur sites pétroliers et gaziers, pipelines, bases vie et corridors désertiques.',
        view: 'sud'
      }
    };

    let selectedWilayaName = 'Oran';

    wilayaTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const key = trigger.getAttribute('data-wilaya') || 'oran';
        const info = wilayaData[key] || wilayaData.oran;
        selectedWilayaName = info.name.split('·')[0].trim();

        document.querySelectorAll('.wilaya-pill').forEach((p) => {
          p.classList.toggle('active', p.getAttribute('data-wilaya') === key);
        });

        if (readoutTitle) readoutTitle.textContent = `${info.name} (${info.coords})`;
        if (readoutMeta) readoutMeta.textContent = info.desc;
        if (readoutBtn) {
          readoutBtn.textContent = `Qualifier un dossier (${selectedWilayaName}) →`;
        }

        if (window.innerWidth <= 680) {
          const targetView = info.view;
          const tabBtn = document.querySelector(`[data-map-view="${targetView}"]`);
          if (tabBtn && !tabBtn.classList.contains('active')) {
            zoomBtns.forEach((b) => b.classList.remove('active'));
            tabBtn.classList.add('active');
            animateViewBox(viewBoxes[targetView]);
          }
        }
      });
    });

    if (readoutBtn) {
      readoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const locInput = document.getElementById('consult-location');
        if (locInput) locInput.value = selectedWilayaName;
        document.getElementById('qualifier')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  };

  /* ------------------------------------------------------------------------
     6. FILTRAGE FLUIDE DES COLLABORATIONS & RÉFÉRENCES CHANTIERS
     ------------------------------------------------------------------------ */
  const initReferenceFilters = () => {
    const buttons = document.querySelectorAll('[data-filter]');
    const cards = document.querySelectorAll('.ref-card');
    if (!buttons.length || !cards.length) return;

    const applyFilter = (category) => {
      buttons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-filter') === category));
      cards.forEach((card) => {
        const cat = card.getAttribute('data-category');
        const show = category === 'all' || cat === category;
        card.classList.toggle('hidden', !show);
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-filter') || 'all';
        applyFilter(category);
      });
    });

    // Connect collaboration chips in Hero to filter and scroll to #references
    document.querySelectorAll('[data-collab-filter]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const cat = chip.getAttribute('data-collab-filter') || 'all';
        applyFilter(cat);
        const refSec = document.getElementById('references');
        if (refSec) {
          e.preventDefault();
          refSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  };

  /* ------------------------------------------------------------------------
     7. QUALIFICATEUR DE DOSSIER INTERACTIF + LIAISON CARTES PRESTATIONS
     ------------------------------------------------------------------------ */
  const initMissionSimulator = () => {
    const missionBtns = document.querySelectorAll('[data-sim-mission]');
    const terrainBtns = document.querySelectorAll('[data-sim-terrain]');
    const presetBtns = document.querySelectorAll('[data-sim-preset]');
    const areaInput = document.getElementById('sim-area-range');
    const areaDisplay = document.getElementById('sim-area-display');
    const simBento = document.querySelector('.simulator-bento');

    const outTitle = document.getElementById('sim-out-title');
    const outInst = document.getElementById('sim-out-instrument');
    const outPrecision = document.getElementById('sim-out-precision');
    const outDelay = document.getElementById('sim-out-delay');
    const outTeam = document.getElementById('sim-out-team');
    const outDeliverables = document.getElementById('sim-out-deliverables');
    const applyBtn = document.getElementById('sim-apply-to-form');
    const whatsappSimBtn = document.getElementById('sim-whatsapp-btn');

    if (!missionBtns.length || !areaInput) return;

    const protocols = {
      bornage: {
        title: 'Bornage & Délimitation Foncière',
        instrument: 'GNSS RTK Bi-Fréquence + Station Totale 1"',
        precision: '± 1.0 cm (Rattachement Géodésique)',
        baseDays: 2,
        deliverables:
          'Plan de bornage contradictoire, Procès-Verbal (PV) officiel, Piquetage et implantation des bornes, Fichiers DWG & PDF certifiés.'
      },
      topo: {
        title: 'Travaux Topographiques, LiDAR 3D & Implantation',
        instrument: 'Scanner LiDAR 3D + GNSS RTK + Station Robotisée 1"',
        precision: '± 1.5 mm (Implantation industrielle & axes)',
        baseDays: 3,
        deliverables:
          'Nuage de points LiDAR 3D, Plan coté (MNT 3D / Courbes), Calculs de cubatures, Fichiers DWG AutoCAD/Covadis.'
      },
      edd: {
        title: 'EDD (État Descriptif de Division)',
        instrument: 'Relevé Laser Haute Précision + Chaîne DAO Architecture',
        precision: 'Conforme Cadastre, Domaines & Conservation Foncière',
        baseDays: 3,
        deliverables:
          'Dossier EDD complet, Plans de niveaux cotés, Tableau des quotes-parts de copropriété, Attestation de surfaces.'
      },
      etat: {
        title: 'État des Lieux & Récolement d’Ouvrages',
        instrument: 'Station Laser Sans Prisme + Niveau Numérique',
        precision: '± 1.5 mm (Contrôle géométrique As-Built)',
        baseDays: 2,
        deliverables:
          'Plan d’état des lieux contradictoire, Relevé d’intérieurs et façades, Dossier de récolement Tel Que Construit.'
      },
      morcellement: {
        title: 'Morcellement, Partage & Lotissement',
        instrument: 'GNSS RTK + Station Totale + Conception Parcellaire CAO',
        precision: 'Normes Urbanisme (DUAC / APC / Cadastre)',
        baseDays: 4,
        deliverables:
          'Plan de morcellement ou partage, Tableau d’équilibrage des lots, Implantation sur terrain, Dossier technique réglementaire.'
      },
      vrd: {
        title: 'Études & Suivis VRD (Voirie & Réseaux Divers)',
        instrument: 'Station Totale + Niveau de Précision + Covadis / Mensura',
        precision: 'Nivellement ± 1.0 mm/km (Profils & Réseaux)',
        baseDays: 5,
        deliverables:
          'Profils en long et en travers, Tracé géométrique voirie, Plans d’assainissement & AEP, Bilan terrassements déblais/remblais.'
      }
    };

    let currentMission = 'topo';
    let currentTerrain = 'Site Industriel / Chantier';
    let currentArea = parseInt(areaInput.value, 10) || 5000;

    const selectMissionProgrammatically = (missionKey) => {
      if (!protocols[missionKey]) return;
      currentMission = missionKey;
      missionBtns.forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-sim-mission') === missionKey);
      });
      updateSim();
    };

    const updateSim = () => {
      const p = protocols[currentMission] || protocols.topo;
      const areaHa = (currentArea / 10000).toFixed(2);
      if (areaDisplay) {
        areaDisplay.textContent =
          currentArea >= 10000
            ? `${currentArea.toLocaleString('fr-FR')} m² (${areaHa} ha)`
            : `${currentArea.toLocaleString('fr-FR')} m²`;
      }

      const extra = Math.floor(currentArea / 12000);
      const minD = p.baseDays + extra;
      const maxD = minD + 2;

      if (outTitle) outTitle.textContent = p.title;
      if (outInst) outInst.textContent = p.instrument;
      if (outPrecision) outPrecision.textContent = p.precision;
      if (outDelay) outDelay.textContent = `${minD} à ${maxD} jours ouvrés (Terrain + Bureau)`;
      if (outTeam) {
        outTeam.textContent =
          currentArea > 12000
            ? '2 Brigades Complètes (5 Topographes)'
            : '1 Brigade Active (Équipe de 5 Topographes)';
      }
      if (outDeliverables) outDeliverables.textContent = p.deliverables;

      presetBtns.forEach((chip) => {
        const val = parseInt(chip.getAttribute('data-sim-preset') || '0', 10);
        chip.classList.toggle('active', val === currentArea);
      });

      if (whatsappSimBtn) {
        const msg = encodeURIComponent(
          `Bonjour M. Mohamed Amine Belarbia (Cabinet GeoMed),\n` +
            `Je souhaite un devis pour :\n` +
            `• Prestation : ${p.title}\n` +
            `• Typologie du site : ${currentTerrain}\n` +
            `• Superficie estimée : ${currentArea.toLocaleString('fr-FR')} m²\n` +
            `Merci de me recontacter.`
        );
        whatsappSimBtn.href = `https://wa.me/213661431174?text=${msg}`;
      }
    };

    missionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        missionBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentMission = btn.getAttribute('data-sim-mission') || 'topo';
        updateSim();
      });
    });

    terrainBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        terrainBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTerrain = btn.getAttribute('data-sim-terrain') || 'Site Industriel / Chantier';
        updateSim();
      });
    });

    areaInput.addEventListener('input', () => {
      currentArea = parseInt(areaInput.value, 10);
      updateSim();
    });

    presetBtns.forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = parseInt(chip.getAttribute('data-sim-preset') || '5000', 10);
        areaInput.value = String(val);
        currentArea = val;
        updateSim();
      });
    });

    document.querySelectorAll('[data-select-mission]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const mKey = link.getAttribute('data-select-mission') || 'topo';
        selectMissionProgrammatically(mKey);
        document.getElementById('qualifier')?.scrollIntoView({ behavior: 'smooth' });
        if (simBento) {
          simBento.classList.remove('flash-highlight');
          void simBento.offsetWidth;
          simBento.classList.add('flash-highlight');
          setTimeout(() => simBento.classList.remove('flash-highlight'), 1400);
        }
      });
    });

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const selectService = document.getElementById('consult-service');
        const msgBox = document.getElementById('consult-message');
        const p = protocols[currentMission] || protocols.topo;
        if (selectService) selectService.value = currentMission;
        if (msgBox) {
          msgBox.value =
            `Configuration issue du Simulateur GeoMed :\n` +
            `• Prestation : ${p.title}\n` +
            `• Typologie du site : ${currentTerrain}\n` +
            `• Superficie estimée : ${currentArea.toLocaleString('fr-FR')} m²\n` +
            `• Livrables attendus : DWG + PDF Certifié\n\n` +
            `Détails complémentaires : `;
          msgBox.focus();
        }
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    updateSim();
  };

  /* ------------------------------------------------------------------------
     8. GÉNÉRATEUR QR CODE VECTORIEL ISO/IEC 18004 (ZÉRO DÉPENDANCE)
     ------------------------------------------------------------------------ */
  const QRGenerator = (() => {
    const EXP = new Uint8Array(512);
    const LOG = new Uint8Array(256);
    (() => {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
      }
      for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    })();

    const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

    const polyMul = (p, q) => {
      const out = new Uint8Array(p.length + q.length - 1);
      for (let i = 0; i < p.length; i++) {
        for (let j = 0; j < q.length; j++) {
          out[i + j] ^= gfMul(p[i], q[j]);
        }
      }
      return out;
    };

    const rsGeneratorPoly = (degree) => {
      let g = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        g = polyMul(g, new Uint8Array([1, EXP[i]]));
      }
      return g;
    };

    const rsEncode = (data, ecLen) => {
      const gen = rsGeneratorPoly(ecLen);
      const msg = new Uint8Array(data.length + ecLen);
      msg.set(data, 0);
      for (let i = 0; i < data.length; i++) {
        const coef = msg[i];
        if (coef !== 0) {
          for (let j = 0; j < gen.length; j++) {
            msg[i + j] ^= gfMul(gen[j], coef);
          }
        }
      }
      return msg.slice(data.length);
    };

    const VERSION = 8;
    const SIZE = 17 + VERSION * 4;
    const ALIGN_POS = [6, 24, 42];

    const createMatrix = (text) => {
      const utf8 = new TextEncoder().encode(text);
      const totalDataBytes = 152;
      const bits = [];
      const pushBits = (val, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
      };

      pushBits(0b0100, 4);
      pushBits(utf8.length, 8);
      for (const b of utf8) pushBits(b, 8);
      for (let i = 0; i < 4 && bits.length < totalDataBytes * 8; i++) bits.push(0);
      while (bits.length % 8 !== 0) bits.push(0);

      const dataBytes = new Uint8Array(totalDataBytes);
      for (let i = 0; i < bits.length / 8; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
        dataBytes[i] = byte;
      }
      let padToggle = true;
      for (let i = bits.length / 8; i < totalDataBytes; i++) {
        dataBytes[i] = padToggle ? 0xec : 0x11;
        padToggle = !padToggle;
      }

      const b1 = dataBytes.slice(0, 76);
      const b2 = dataBytes.slice(76, 152);
      const ec1 = rsEncode(b1, 22);
      const ec2 = rsEncode(b2, 22);

      const finalBytes = [];
      for (let i = 0; i < 76; i++) finalBytes.push(b1[i], b2[i]);
      for (let i = 0; i < 22; i++) finalBytes.push(ec1[i], ec2[i]);

      const finalBits = [];
      for (const byte of finalBytes) {
        for (let i = 7; i >= 0; i--) finalBits.push((byte >> i) & 1);
      }

      const grid = Array.from({ length: SIZE }, () => new Int8Array(SIZE).fill(-1));
      const reserved = Array.from({ length: SIZE }, () => new Uint8Array(SIZE));

      const setMod = (r, c, val, res = true) => {
        if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
          grid[r][c] = val ? 1 : 0;
          if (res) reserved[r][c] = 1;
        }
      };

      const placeFinder = (row, col) => {
        for (let r = -1; r <= 7; r++) {
          for (let c = -1; c <= 7; c++) {
            const isBorder =
              (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
              (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setMod(row + r, col + c, isBorder ? 1 : 0, true);
          }
        }
      };
      placeFinder(0, 0);
      placeFinder(0, SIZE - 7);
      placeFinder(SIZE - 7, 0);

      for (const r of ALIGN_POS) {
        for (const c of ALIGN_POS) {
          if ((r === 6 && c === 6) || (r === 6 && c === 42) || (r === 42 && c === 6)) continue;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const v = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
              setMod(r + dr, c + dc, v ? 1 : 0, true);
            }
          }
        }
      }

      for (let i = 8; i < SIZE - 8; i++) {
        if (!reserved[6][i]) setMod(6, i, i % 2 === 0, true);
        if (!reserved[i][6]) setMod(i, 6, i % 2 === 0, true);
      }

      setMod(4 * VERSION + 9, 8, 1, true);
      for (let i = 0; i < 9; i++) {
        if (!reserved[8][i]) reserved[8][i] = 1;
        if (!reserved[i][8]) reserved[i][8] = 1;
      }
      for (let i = 0; i < 8; i++) {
        reserved[8][SIZE - 1 - i] = 1;
        reserved[SIZE - 1 - i][8] = 1;
      }

      let bitIdx = 0;
      let up = true;
      for (let right = SIZE - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < SIZE; vert++) {
          const r = up ? SIZE - 1 - vert : vert;
          for (let j = 0; j < 2; j++) {
            const c = right - j;
            if (!reserved[r][c]) {
              const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
              grid[r][c] = bit ^ ((r + c) % 2 === 0 ? 1 : 0);
            }
          }
        }
        up = !up;
      }

      const fmtBits = 0x77c4;
      const fmtCoords1 = [
        [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
        [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
      ];
      const fmtCoords2 = [
        [SIZE - 1, 8], [SIZE - 2, 8], [SIZE - 3, 8], [SIZE - 4, 8], [SIZE - 5, 8], [SIZE - 6, 8], [SIZE - 7, 8],
        [8, SIZE - 8], [8, SIZE - 7], [8, SIZE - 6], [8, SIZE - 5], [8, SIZE - 4], [8, SIZE - 3], [8, SIZE - 2], [8, SIZE - 1]
      ];
      for (let i = 0; i < 15; i++) {
        const b = (fmtBits >> i) & 1;
        grid[fmtCoords1[i][0]][fmtCoords1[i][1]] = b;
        grid[fmtCoords2[i][0]][fmtCoords2[i][1]] = b;
      }

      return grid;
    };

    const toSVG = (text, darkColor = '#141a21') => {
      const matrix = createMatrix(text);
      const n = matrix.length;
      let path = '';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c] === 1) path += `M${c},${r}h1v1h-1z`;
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-label="QR Code Contact Mohamed Amine Belarbia - GeoMed">
        <rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#ffffff"/>
        <path d="${path}" fill="${darkColor}"/>
      </svg>`;
    };

    return { toSVG };
  })();

  /* ------------------------------------------------------------------------
     9. STUDIO CARTE DE VISITE & PARTAGE MOBILE NATIF (WEB SHARE API)
     ------------------------------------------------------------------------ */
  const initBusinessCardStudio = () => {
    const mecardPayload =
      'MECARD:N:Belarbia,Mohamed Amine;ORG:Cabinet GeoMed;TEL:+213661431174;TEL:+213558426257;EMAIL:belarbia.85@gmail.com;URL:https://geomedz.com;ADR:AKID LOTFI Oran;;';

    const qrContainers = document.querySelectorAll('.js-geomed-qr');
    const svgMarkup = QRGenerator.toSVG(mecardPayload, '#141a21');
    qrContainers.forEach((box) => {
      box.innerHTML = svgMarkup;
    });

    const shareBtn = document.getElementById('btn-share-geomed');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const shareData = {
          title: 'Cabinet GeoMed · M. Mohamed Amine Belarbia',
          text: 'Bureau d’Études Topographiques, LiDAR 3D & Géodésie GNSS à Oran (Haï Akid Lotfi) · Tél : +213 661 43 11 74',
          url: window.location.href
        };
        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch (_) {}
        } else if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(`${shareData.title} - ${shareData.url}`);
            const span = shareBtn.querySelector('span');
            if (span) {
              const orig = span.textContent;
              span.textContent = 'Lien copié !';
              setTimeout(() => {
                span.textContent = orig;
              }, 2000);
            }
          } catch (_) {}
        }
      });
    }

    document.querySelectorAll('[data-bcard-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-bcard-theme]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.getAttribute('data-bcard-theme');
        document.querySelectorAll('.business-card-sheet').forEach((sheet) => {
          sheet.classList.remove('theme-ivory', 'theme-emerald');
          if (theme === 'ivory') sheet.classList.add('theme-ivory');
          if (theme === 'emerald') sheet.classList.add('theme-emerald');
        });
      });
    });
  };

  /* ------------------------------------------------------------------------
     10. FORMULAIRE DE CONSULTATION (WHATSAPP + MAILTO)
     ------------------------------------------------------------------------ */
  const initContactForm = () => {
    const form = document.getElementById('geomed-consult-form');
    const feedback = document.getElementById('form-status-feedback');
    if (!form) return;

    UserInvalidFallback.init(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
          firstInvalid.classList.add('user-invalid-fallback');
          firstInvalid.setAttribute('aria-invalid', 'true');
          firstInvalid.focus();
        }
        return;
      }

      const name = document.getElementById('consult-name')?.value.trim() || '';
      const org = document.getElementById('consult-org')?.value.trim() || 'Particulier';
      const phone = document.getElementById('consult-phone')?.value.trim() || '';
      const email = document.getElementById('consult-email')?.value.trim() || '';
      const serviceSelect = document.getElementById('consult-service');
      const serviceText = serviceSelect?.options[serviceSelect.selectedIndex]?.text || '';
      const location = document.getElementById('consult-location')?.value.trim() || 'Oran';
      const message = document.getElementById('consult-message')?.value.trim() || '';

      const subject = encodeURIComponent(`[Consultation GeoMed] ${serviceText} · ${name} (${org})`);
      const body = encodeURIComponent(
        `Bonjour M. Mohamed Amine Belarbia (Cabinet GeoMed),\n\n` +
          `Demande d'intervention topographique :\n` +
          `----------------------------------------------------\n` +
          `• Nom / Responsable : ${name}\n` +
          `• Entreprise / Organisme : ${org}\n` +
          `• Téléphone : ${phone}\n` +
          `• Email : ${email}\n` +
          `• Prestation demandée : ${serviceText}\n` +
          `• Localisation du site : ${location}\n` +
          `----------------------------------------------------\n` +
          `Détails du besoin :\n${message}\n`
      );

      if (feedback) {
        feedback.style.display = 'block';
        feedback.innerHTML = `
          <div style="padding:1.05rem;border-radius:8px;background:var(--leica-green-soft);border:1px solid var(--leica-green);color:var(--ink-primary);margin-top:1rem;">
            <strong>✓ Dossier technique prêt à transmettre !</strong><br>
            <span style="font-size:0.82rem;color:var(--ink-secondary);">Sélectionnez votre canal direct vers M. Mohamed Amine Belarbia :</span>
            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.7rem;">
              <a class="btn btn-primary" href="mailto:belarbia.85@gmail.com?subject=${subject}&body=${body}">
                Envoyer par Email (belarbia.85@gmail.com)
              </a>
              <a class="btn btn-leica" target="_blank" rel="noopener" href="https://wa.me/213661431174?text=${body}">
                Envoyer via WhatsApp (+213 661 43 11 74)
              </a>
            </div>
          </div>
        `;
      }
    });
  };

  /* ------------------------------------------------------------------------
     11. VISIONNEUSE PHOTO INTERACTIVE (SWIPE TACTILE + PRÉCÉDENT / SUIVANT)
     ------------------------------------------------------------------------ */
  const initPhotoLightbox = () => {
    const dialog = document.getElementById('photo-lightbox');
    const imgEl = document.getElementById('lightbox-img');
    const titleEl = document.getElementById('lightbox-title');
    const metaEl = document.getElementById('lightbox-meta');
    const counterEl = document.getElementById('lightbox-counter');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const closeBtn = document.getElementById('lightbox-close');
    if (!dialog || !imgEl) return;

    const triggers = Array.from(document.querySelectorAll('[data-lightbox-src]'));
    const gallery = [];
    const seen = new Set();
    triggers.forEach((el) => {
      const src = el.getAttribute('data-lightbox-src');
      if (src && !seen.has(src)) {
        seen.add(src);
        gallery.push({
          src,
          title: el.getAttribute('data-lightbox-title') || 'Chantier GeoMed',
          meta: el.getAttribute('data-lightbox-meta') || 'INSTRUMENTATION LEICA · GEOMED'
        });
      }
    });

    let currentIndex = 0;

    const showIndex = (idx) => {
      if (!gallery.length) return;
      currentIndex = (idx + gallery.length) % gallery.length;
      const item = gallery[currentIndex];
      imgEl.src = item.src;
      imgEl.alt = item.title;
      if (titleEl) titleEl.textContent = item.title;
      if (metaEl) metaEl.textContent = item.meta;
      if (counterEl) {
        const cur = String(currentIndex + 1).padStart(2, '0');
        const tot = String(gallery.length).padStart(2, '0');
        counterEl.textContent = `PHOTO ${cur} / ${tot} · SWIPE GAUCHE / DROITE`;
      }
    };

    triggers.forEach((item) => {
      item.addEventListener('click', () => {
        const src = item.getAttribute('data-lightbox-src');
        const foundIdx = gallery.findIndex((g) => g.src === src);
        showIndex(foundIdx >= 0 ? foundIdx : 0);
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        }
      });
    });

    if (prevBtn) prevBtn.addEventListener('click', () => showIndex(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showIndex(currentIndex + 1));
    if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });

    document.addEventListener('keydown', (e) => {
      if (!dialog.open) return;
      if (e.key === 'ArrowLeft') showIndex(currentIndex - 1);
      if (e.key === 'ArrowRight') showIndex(currentIndex + 1);
    });

    let touchStartX = 0;
    dialog.addEventListener(
      'touchstart',
      (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          touchStartX = e.changedTouches[0].screenX;
        }
      },
      { passive: true }
    );

    dialog.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          const dx = e.changedTouches[0].screenX - touchStartX;
          if (Math.abs(dx) > 42) {
            if (dx < 0) showIndex(currentIndex + 1);
            else showIndex(currentIndex - 1);
          }
        }
      },
      { passive: true }
    );
  };

  document.addEventListener('DOMContentLoaded', () => {
    initNavigationDrawer();
    initScrollSpy();
    initGeodeticConsole();
    initInteractiveMap();
    initReferenceFilters();
    initMissionSimulator();
    initBusinessCardStudio();
    initContactForm();
    initPhotoLightbox();
  });
})();
