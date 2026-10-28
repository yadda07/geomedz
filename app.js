/* ==========================================================================
   BELARBIA MOHAMED AMINE · GEOMED (ORAN, ALGÉRIE)
   Moteur Interactif 2026 :
   - Console Géodésique 3 Modes (MNT 3D Isométrique, Courbes CAD, Nuage LiDAR)
   - Simulateur Technique de Mission Topographique
   - Studio Carte de Visite 3 Collections + Générateur QR Vectoriel ISO/IEC 18004
   - Fallbacks Modern Web Guidance (Scroll, ViewTimeline, Validation WeakMap + ARIA)
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
      const initialHeight = 90;
      const finalHeight = 64;
      const scrollDistance = 120;
      window.addEventListener('scroll', () => {
        const scrollPercent = Math.min(1, window.scrollY / scrollDistance);
        const newHeight = initialHeight - (initialHeight - finalHeight) * scrollPercent;
        header.style.height = `${newHeight}px`;
      }, { passive: true });
    }
  }

  // Fallback for scroll-entry-exit-effects
  if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.style.transform = 'translateY(0)';
          }
        }
      },
      { threshold: 0.08 }
    );

    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      el.style.transition = 'transform 0.35s ease';
      observer.observe(el);
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

  const consultForm = document.querySelector('#geomed-consult-form');
  if (consultForm) {
    UserInvalidFallback.init(consultForm);
  }

  /* ------------------------------------------------------------------------
     2. 3-MODE INTERACTIVE GEODETIC CONSOLE (#topo-canvas)
        Modes: 'mnt3d' (Isometric 3D MNT Mesh), 'cad' (Contours & Traverse), 'lidar' (Point Cloud)
     ------------------------------------------------------------------------ */
  const initGeodeticConsole = () => {
    const canvas = document.getElementById('topo-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let mode = 'mnt3d';
    let pointer = { x: 0.55, y: 0.45 };
    let t = 0;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resize);
    resize();

    // Mode switch buttons
    document.querySelectorAll('[data-console-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-console-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
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
      const dx = nx - 0.25;
      const dy = 0.7 - ny;
      let rad = Math.atan2(dx, dy);
      if (rad < 0) rad += Math.PI * 2;
      const gon = ((rad / (Math.PI * 2)) * 400).toFixed(3);
      const dh = Math.hypot(dx * 640, dy * 480).toFixed(2);

      if (elUtm) elUtm.textContent = `E ${east} · N ${north}`;
      if (elAlt) elAlt.textContent = `+${z} m NGA`;
      if (elAzimuth) elAzimuth.textContent = `${gon} gon`;
      if (elDist) elDist.textContent = `${dh} m`;
    };

    canvas.parentElement.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
      pointer.y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
      updateTelemetry(pointer.x, pointer.y);
    });

    // Elevation function z(u, v) for MNT 3D & LiDAR
    const elevationAt = (u, v, time) => {
      const d1 = Math.hypot(u - 0.35, v - 0.42);
      const d2 = Math.hypot(u - 0.7, v - 0.58);
      const peak1 = Math.exp(-d1 * d1 * 9) * 44;
      const peak2 = Math.exp(-d2 * d2 * 11) * 34;
      const wave = Math.sin(u * 6 + time) * 4 + Math.cos(v * 5 - time * 0.8) * 4;
      return peak1 + peak2 + wave;
    };

    // Draw Mode 1: Isometric 3D MNT Surface Wireframe + Survey Control Pins
    const drawMNT3D = () => {
      const cols = 22;
      const rows = 16;
      const tiltX = (pointer.x - 0.5) * 0.32;
      const tiltY = (pointer.y - 0.5) * 0.22;

      const project = (u, v, z) => {
        const cx = u - 0.5;
        const cy = v - 0.5;
        const rx = cx * Math.cos(tiltX) - cy * Math.sin(tiltX);
        const ry = cx * Math.sin(tiltX) + cy * Math.cos(tiltX);
        const isoX = width * 0.5 + (rx - ry * 0.55) * (width * 0.72);
        const isoY = height * 0.62 + (rx * 0.36 + ry * 0.58) * (height * 0.62) - z * (1.15 + tiltY * 0.3);
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

      // Draw longitudinal & transversal mesh lines
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const p = pts[r][c];
          if (c === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = r % 4 === 0 ? 'rgba(201, 162, 83, 0.45)' : 'rgba(201, 162, 83, 0.16)';
        ctx.lineWidth = r % 4 === 0 ? 1.2 : 0.75;
        ctx.stroke();
      }

      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          const p = pts[r][c];
          if (r === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = c % 4 === 0 ? 'rgba(45, 212, 191, 0.34)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = c % 4 === 0 ? 1.1 : 0.65;
        ctx.stroke();
      }

      // Draw Geodetic Control Benchmarks on the 3D surface
      const benchmarks = [
        { r: 6, c: 8, label: 'BN-01 AKID LOTFI (+118.4m)' },
        { r: 10, c: 15, label: 'ST-FIAT TAFRAOUI (+164.2m)' },
        { r: 4, c: 16, label: 'ST-ARZEW SONATRACH' }
      ];

      benchmarks.forEach((bm) => {
        const p = pts[bm.r][bm.c];
        // Vertical plumb line
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 26);
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Prism diamond
        ctx.fillStyle = '#e6c885';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 26, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(bm.label, p.x + 7, p.y - 23);
      });
    };

    // Draw Mode 2: CAD Contours & Polygonal Traverse
    const drawCADContours = () => {
      const centers = [
        { x: width * 0.36, y: height * 0.48, maxR: width * 0.42, rings: 8 },
        { x: width * 0.7, y: height * 0.54, maxR: width * 0.35, rings: 6 }
      ];

      centers.forEach((c, idx) => {
        for (let i = 1; i <= c.rings; i++) {
          const rBase = (c.maxR / c.rings) * i;
          const isMaster = i % 3 === 0;
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) {
            const mod = Math.sin(a * 3 + t + idx) * 10 + Math.cos(a * 2 - t) * 7;
            const px = c.x + Math.cos(a) * (rBase + mod) * 1.15;
            const py = c.y + Math.sin(a) * (rBase + mod) * 0.75;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = isMaster ? 'rgba(201, 162, 83, 0.52)' : 'rgba(45, 212, 191, 0.18)';
          ctx.lineWidth = isMaster ? 1.35 : 0.8;
          ctx.stroke();
        }
      });

      // Closed Polygonal Traverse Stations
      const poly = [
        { x: width * 0.18, y: height * 0.72, id: 'P101 (BASE)' },
        { x: width * 0.36, y: height * 0.28, id: 'P102' },
        { x: width * 0.66, y: height * 0.24, id: 'P103' },
        { x: width * 0.82, y: height * 0.64, id: 'P104' }
      ];

      ctx.beginPath();
      poly.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(224, 79, 51, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      poly.forEach((p) => {
        ctx.fillStyle = '#060a11';
        ctx.strokeStyle = '#e6c885';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#e6c885';
        ctx.fillText(p.id, p.x + 8, p.y - 6);
      });
    };

    // Draw Mode 3: High-Density LiDAR Point Cloud & Laser Sweep
    const drawLiDAR = () => {
      const cols = 34;
      const rows = 22;
      const sweepX = ((Math.sin(t * 1.4) + 1) * 0.5) * width;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) / cols;
          const v = (r + 0.5) / rows;
          const z = elevationAt(u, v, t * 0.6);
          const px = u * width + Math.sin(v * 8 + t) * 4;
          const py = v * height - (z - 20) * 0.55;
          const distToSweep = Math.abs(px - sweepX);
          const glow = Math.max(0, 1 - distToSweep / 70);

          ctx.fillStyle = z > 32
            ? `rgba(230, 200, 133, ${0.45 + glow * 0.5})`
            : `rgba(45, 212, 191, ${0.35 + glow * 0.55})`;
          const radius = 1.3 + (z / 45) * 1.4 + glow * 1.2;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Vertical laser scan beam
      const grad = ctx.createLinearGradient(sweepX - 30, 0, sweepX + 30, 0);
      grad.addColorStop(0, 'rgba(45, 212, 191, 0)');
      grad.addColorStop(0.5, 'rgba(45, 212, 191, 0.35)');
      grad.addColorStop(1, 'rgba(45, 212, 191, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 30, 0, 60, height);
    };

    // Draw Optical Target Reticle at Cursor
    const drawOpticalReticle = () => {
      const tx = pointer.x * width;
      const ty = pointer.y * height;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.strokeStyle = 'rgba(230, 200, 133, 0.8)';
      ctx.lineWidth = 1.1;

      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(-7, 0);
      ctx.moveTo(7, 0);
      ctx.lineTo(24, 0);
      ctx.moveTo(0, -24);
      ctx.lineTo(0, -7);
      ctx.moveTo(0, 7);
      ctx.lineTo(0, 24);
      ctx.stroke();

      ctx.fillStyle = '#2dd4bf';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      t += 0.012;
      ctx.clearRect(0, 0, width, height);

      if (mode === 'mnt3d') drawMNT3D();
      else if (mode === 'cad') drawCADContours();
      else drawLiDAR();

      drawOpticalReticle();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  /* ------------------------------------------------------------------------
     3. NATIONAL REFERENCES PORTFOLIO FILTER
     ------------------------------------------------------------------------ */
  const initReferenceFilters = () => {
    const buttons = document.querySelectorAll('[data-filter]');
    const cards = document.querySelectorAll('.ref-card');
    if (!buttons.length || !cards.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.getAttribute('data-filter');
        cards.forEach((card) => {
          const cat = card.getAttribute('data-category');
          card.classList.toggle('hidden', category !== 'all' && cat !== category);
        });
      });
    });
  };

  /* ------------------------------------------------------------------------
     4. INTERACTIVE MISSION SIMULATOR
     ------------------------------------------------------------------------ */
  const initMissionSimulator = () => {
    const missionBtns = document.querySelectorAll('[data-sim-mission]');
    const terrainBtns = document.querySelectorAll('[data-sim-terrain]');
    const areaInput = document.getElementById('sim-area-range');
    const areaDisplay = document.getElementById('sim-area-display');

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
        deliverables: 'Plan de bornage contradictoire, Procès-Verbal (PV) officiel, Piquetage et implantation des bornes, Fichiers DWG & PDF certifiés.'
      },
      topo: {
        title: 'Travaux Topographiques, LiDAR 3D & Implantation',
        instrument: 'Scanner LiDAR 3D + GNSS RTK + Station Robotisée 1"',
        precision: '± 1.5 mm (Implantation industrielle & axes)',
        baseDays: 3,
        deliverables: 'Nuage de points LiDAR 3D, Plan coté (MNT 3D / Courbes), Calculs de cubatures, Fichiers DWG AutoCAD/Covadis.'
      },
      edd: {
        title: 'EDD (État Descriptif de Division)',
        instrument: 'Relevé Laser Haute Précision + Chaîne DAO Architecture',
        precision: 'Conforme Cadastre, Domaines & Conservation Foncière',
        baseDays: 3,
        deliverables: 'Dossier EDD complet, Plans de niveaux cotés, Tableau des quotes-parts de copropriété, Attestation de surfaces.'
      },
      etat: {
        title: 'État des Lieux & Récolement d’Ouvrages',
        instrument: 'Station Laser Sans Prisme + Niveau Numérique',
        precision: '± 2.0 mm (Contrôle géométrique As-Built)',
        baseDays: 2,
        deliverables: 'Plan d’état des lieux contradictoire, Relevé d’intérieurs et façades, Dossier de récolement Tel Que Construit.'
      },
      morcellement: {
        title: 'Morcellement, Partage & Lotissement',
        instrument: 'GNSS RTK + Station Totale + Conception Parcellaire CAO',
        precision: 'Normes Urbanisme (DUAC / APC / Cadastre)',
        baseDays: 4,
        deliverables: 'Plan de morcellement ou partage, Tableau d’équilibrage des lots, Implantation sur terrain, Dossier technique réglementaire.'
      },
      vrd: {
        title: 'Études & Suivis VRD (Voirie & Réseaux Divers)',
        instrument: 'Station Totale + Niveau de Précision + Covadis / Mensura',
        precision: 'Nivellement ± 1.0 mm/km (Profils & Réseaux)',
        baseDays: 5,
        deliverables: 'Profils en long et en travers, Tracé géométrique voirie, Plans d’assainissement & AEP, Bilan terrassements déblais/remblais.'
      }
    };

    let currentMission = 'topo';
    let currentTerrain = 'Site Industriel / Grand Chantier';
    let currentArea = parseInt(areaInput.value, 10) || 5000;

    const updateSim = () => {
      const p = protocols[currentMission] || protocols.topo;
      const areaHa = (currentArea / 10000).toFixed(2);
      if (areaDisplay) {
        areaDisplay.textContent = currentArea >= 10000
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
      if (outTeam) outTeam.textContent = currentArea > 12000 ? '2 Brigades Complètes (5 Topographes)' : '1 Brigade Active (Équipe de 5 Topographes)';
      if (outDeliverables) outDeliverables.textContent = p.deliverables;

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
        currentMission = btn.getAttribute('data-sim-mission');
        updateSim();
      });
    });

    terrainBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        terrainBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTerrain = btn.getAttribute('data-sim-terrain');
        updateSim();
      });
    });

    areaInput.addEventListener('input', () => {
      currentArea = parseInt(areaInput.value, 10);
      updateSim();
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
     5. ISO/IEC 18004 QR CODE SVG GENERATOR (ZERO DEPENDENCIES)
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

    const toSVG = (text, darkColor = '#0b111e') => {
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
     6. HAUTE-COUTURE BUSINESS CARD STUDIO (3 EDITIONS + VIEW SWITCHER)
     ------------------------------------------------------------------------ */
  const initBusinessCardStudio = () => {
    const mecardPayload =
      'MECARD:N:Belarbia,Mohamed Amine;ORG:Cabinet GeoMed;TEL:+213661431174;TEL:+213558426257;EMAIL:belarbia.85@gmail.com;URL:https://geomedz.com;ADR:AKID LOTFI Oran;;';

    const qrContainers = document.querySelectorAll('.js-geomed-qr');
    const svgMarkup = QRGenerator.toSVG(mecardPayload, '#0b111e');
    qrContainers.forEach((box) => {
      box.innerHTML = svgMarkup;
    });

    const showcase = document.getElementById('bcard-showcase');
    const cardRecto = document.getElementById('bcard-recto-wrap');
    const cardVerso = document.getElementById('bcard-verso-wrap');

    document.querySelectorAll('[data-bcard-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-bcard-view]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-bcard-view');
        if (!showcase || !cardRecto || !cardVerso) return;

        if (mode === 'both') {
          showcase.classList.add('side-by-side');
          cardRecto.style.display = 'block';
          cardVerso.style.display = 'block';
        } else if (mode === 'recto') {
          showcase.classList.remove('side-by-side');
          cardRecto.style.display = 'block';
          cardVerso.style.display = 'none';
        } else if (mode === 'verso') {
          showcase.classList.remove('side-by-side');
          cardRecto.style.display = 'none';
          cardVerso.style.display = 'block';
        }
      });
    });

    // 3 Designer Editions: 'obsidian', 'ivory', 'emerald'
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
     7. CONSULTATION FORM SUBMISSION (WHATSAPP + MAILTO)
     ------------------------------------------------------------------------ */
  const initContactForm = () => {
    const form = document.getElementById('geomed-consult-form');
    const feedback = document.getElementById('form-status-feedback');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
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
          <div style="padding:1.1rem;border-radius:6px;background:rgba(20,184,166,0.12);border:1px solid #2dd4bf;color:#f8fafc;margin-top:1rem;">
            <strong>✓ Dossier technique prêt à transmettre !</strong><br>
            Sélectionnez votre canal direct vers M. Mohamed Amine Belarbia :
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:0.75rem;">
              <a class="btn btn-gold" href="mailto:belarbia.85@gmail.com?subject=${subject}&body=${body}">
                Envoyer par Email (belarbia.85@gmail.com)
              </a>
              <a class="btn btn-teal" target="_blank" rel="noopener" href="https://wa.me/213661431174?text=${body}">
                Envoyer via WhatsApp (+213 661 43 11 74)
              </a>
            </div>
          </div>
        `;
      }
    });
  };

  const initPhotoLightbox = () => {
    const dialog = document.getElementById('photo-lightbox');
    const imgEl = document.getElementById('lightbox-img');
    const titleEl = document.getElementById('lightbox-title');
    const metaEl = document.getElementById('lightbox-meta');
    const closeBtn = document.getElementById('lightbox-close');
    if (!dialog || !imgEl) return;

    document.querySelectorAll('[data-lightbox-src]').forEach((item) => {
      item.addEventListener('click', () => {
        const src = item.getAttribute('data-lightbox-src');
        const title = item.getAttribute('data-lightbox-title') || 'Chantier GeoMed';
        const meta = item.getAttribute('data-lightbox-meta') || 'INSTRUMENTATION LEICA · GEOMED';
        imgEl.src = src;
        imgEl.alt = title;
        if (titleEl) titleEl.textContent = title;
        if (metaEl) metaEl.textContent = meta;
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        }
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close());
    }
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initGeodeticConsole();
    initReferenceFilters();
    initMissionSimulator();
    initBusinessCardStudio();
    initContactForm();
    initPhotoLightbox();
  });
})();
