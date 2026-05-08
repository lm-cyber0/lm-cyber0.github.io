    // Skill constellation + mobile pills interaction
    const skillNodes = document.querySelectorAll('.skill-node');
    const skillPills = document.querySelectorAll('.skill-pill');
    const skillPanels = document.querySelectorAll('.skill-panel-content');
    const skillEmpty = document.getElementById('skill-empty');
    const skillSheet = document.getElementById('skill-sheet');
    const skillSheetBody = document.getElementById('skill-sheet-body');
    const skillSheetBackdrop = document.getElementById('skill-sheet-backdrop');

    function isMobile() {
      return window.innerWidth <= 900;
    }

    function openSheet(skillId) {
      const panel = document.getElementById(`panel-${skillId}`);
      if (!panel) return;
      skillSheetBody.innerHTML = panel.innerHTML;
      skillSheet.classList.add('open');
      skillSheetBackdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeSheet() {
      skillSheet.classList.remove('open');
      skillSheetBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    skillSheetBackdrop.addEventListener('click', closeSheet);
    skillSheet.querySelector('.skill-sheet-handle').addEventListener('click', closeSheet);

    function activateSkill(skillId) {
      skillPanels.forEach(p => p.classList.remove('active'));
      skillEmpty.style.display = 'none';
      const panel = document.getElementById(`panel-${skillId}`);
      if (panel) panel.classList.add('active');
    }

    skillPills.forEach(pill => {
      pill.addEventListener('click', () => {
        skillPills.forEach(p => p.classList.remove('active'));
        skillNodes.forEach(n => n.classList.remove('active'));
        pill.classList.add('active');
        if (isMobile()) {
          openSheet(pill.dataset.skill);
        } else {
          activateSkill(pill.dataset.skill);
        }
      });
    });

    // ── Projects: file-tree explorer ──
    const treeFiles = document.querySelectorAll('.tree-file');
    const treeExpands = document.querySelectorAll('.tree-expand');

    function activateProject(projectId) {
      treeFiles.forEach(f => f.classList.toggle('active', f.dataset.project === projectId));
      treeExpands.forEach(exp => {
        const isTarget = exp.id === 'expand-' + projectId;
        if (isTarget) {
          exp.classList.add('open');
          exp.querySelectorAll('[class*="-demo"], .whisperlink-pipeline').forEach(d => d.classList.remove('sp-paused'));
        } else {
          exp.classList.remove('open');
          exp.querySelectorAll('[class*="-demo"], .whisperlink-pipeline').forEach(d => d.classList.add('sp-paused'));
        }
      });
    }

    const treeClickHint = document.getElementById('tree-click-hint');
    treeFiles.forEach(file => {
      file.addEventListener('click', () => {
        const pid = file.dataset.project;
        const expandEl = document.getElementById('expand-' + pid);
        if (treeClickHint) treeClickHint.classList.add('hidden');
        if (expandEl && expandEl.classList.contains('open')) {
          file.classList.remove('active');
          expandEl.classList.remove('open');
          expandEl.querySelectorAll('[class*="-demo"], .whisperlink-pipeline').forEach(d => d.classList.add('sp-paused'));
        } else {
          activateProject(pid);
        }
      });
    });

    // Folder collapse/expand
    document.querySelectorAll('.tree-folder-header').forEach(header => {
      header.addEventListener('click', () => {
        const folder = document.getElementById(header.dataset.folder);
        if (folder) folder.classList.toggle('collapsed');
      });
    });


    // Smooth scroll - also activates correct project entry for deep links
    const allProjectIds = [
      'project-zero-touch', 'project-fedramp-container', 'project-access-lifecycle',
      'project-scanner-migration', 'project-slack-jira', 'project-christel',
      'project-whisperlink', 'project-flippertwo', 'project-tama'
    ];

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        const id = href.slice(1);

        // If linking directly to a project, switch to it in the viewer
        if (allProjectIds.includes(id)) {
          activateProject(id);
          document.getElementById('projects').scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        const target = document.getElementById(id) || document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Constellation: autonomous drift + click subgraph
    (function() {
      const nodes = document.querySelectorAll('.skill-node');
      if (!nodes.length) return;

      // --- Autonomous drift ---
      // Each node gets a unique sine wave params so they all move independently
      const driftParams = Array.from(nodes).map(() => ({
        xAmp:    1.5 + Math.random() * 2,    // px amplitude x
        yAmp:    1.5 + Math.random() * 2,    // px amplitude y
        xPeriod: 7000 + Math.random() * 6000, // ms period x
        yPeriod: 8000 + Math.random() * 6000, // ms period y
        xPhase:  Math.random() * Math.PI * 2,
        yPhase:  Math.random() * Math.PI * 2,
      }));

      // Store each node's original CSS left/top so we offset from them
      const origins = Array.from(nodes).map(n => ({
        left: n.style.left,
        top:  n.style.top,
      }));

      let driftActive = true;
      function driftTick(ts) {
        if (!driftActive) return;
        nodes.forEach((node, i) => {
          const p = driftParams[i];
          const dx = Math.sin(ts / p.xPeriod * Math.PI * 2 + p.xPhase) * p.xAmp;
          const dy = Math.sin(ts / p.yPeriod * Math.PI * 2 + p.yPhase) * p.yAmp;
          node.style.transform = `translate(calc(-50% + ${dx.toFixed(2)}px), calc(-50% + ${dy.toFixed(2)}px))`;
        });
        requestAnimationFrame(driftTick);
      }
      requestAnimationFrame(driftTick);

      // --- Click subgraph highlight ---
      // Build adjacency from the SVG lines (x1/y1 -> x2/y2 positions map to nodes)
      // Simpler: derive connections from existing skillNodes click logic -
      // on click, dim all nodes/lines, highlight clicked + its neighbours by
      // checking which SVG lines share close coordinates with the clicked node.
      const linesSvg = document.querySelector('.constellation-lines svg');
      const svgLines = linesSvg ? Array.from(linesSvg.querySelectorAll('line')) : [];

      // Map node % positions to 0-500 viewBox coords
      function nodeCoords(node) {
        const l = parseFloat(node.style.left);  // e.g. 50 from "50%"
        const t = parseFloat(node.style.top);
        return { x: l / 100 * 500, y: t / 100 * 500 };
      }

      const SNAP = 18; // px tolerance in viewBox space
      function near(a, b) { return Math.abs(a.x - b.x) < SNAP && Math.abs(a.y - b.y) < SNAP; }

      function getNeighbours(node) {
        const c = nodeCoords(node);
        const neighbours = new Set();
        svgLines.forEach(line => {
          const p1 = { x: parseFloat(line.getAttribute('x1')), y: parseFloat(line.getAttribute('y1')) };
          const p2 = { x: parseFloat(line.getAttribute('x2')), y: parseFloat(line.getAttribute('y2')) };
          if (near(c, p1)) {
            // find the node near p2
            nodes.forEach(n => { if (n !== node && near(nodeCoords(n), p2)) neighbours.add(n); });
          } else if (near(c, p2)) {
            nodes.forEach(n => { if (n !== node && near(nodeCoords(n), p1)) neighbours.add(n); });
          }
        });
        return neighbours;
      }

      function getConnectedLines(node, neighbours) {
        const c = nodeCoords(node);
        return svgLines.filter(line => {
          const p1 = { x: parseFloat(line.getAttribute('x1')), y: parseFloat(line.getAttribute('y1')) };
          const p2 = { x: parseFloat(line.getAttribute('x2')), y: parseFloat(line.getAttribute('y2')) };
          return near(c, p1) || near(c, p2);
        });
      }

      let activeNode = null;

      function applySubgraph(node) {
        activeNode = node;
        const neighbours = getNeighbours(node);
        const connectedLines = getConnectedLines(node, neighbours);

        nodes.forEach(n => {
          const dot = n.querySelector('.skill-dot');
          const label = n.querySelector('.skill-label');
          if (n === node) {
            n.style.opacity = '1';
            dot.style.opacity = '1';
            label.style.opacity = '1';
          } else if (neighbours.has(n)) {
            n.style.opacity = '0.85';
            dot.style.opacity = '1';
            label.style.opacity = '1';
          } else {
            n.style.opacity = '0.82';
            dot.style.opacity = '0.82';
            label.style.opacity = '0.82';
          }
        });

        svgLines.forEach(line => {
          if (connectedLines.includes(line)) {
            line.style.opacity = '0.9';
            line.style.stroke = 'rgba(0,212,170,0.6)';
          } else {
            line.style.opacity = '0.35';
            line.style.stroke = '';
          }
        });
      }

      // Auto-select vuln-mgmt on load
      const defaultNode = Array.from(nodes).find(n => n.dataset.skill === 'vuln-mgmt');
      if (defaultNode) {
        // Also sync the panel + node .active class
        skillNodes.forEach(n => n.classList.remove('active'));
        defaultNode.classList.add('active');
        activateSkill('vuln-mgmt');
        // Delay slightly so drift has initialised positions
        setTimeout(() => applySubgraph(defaultNode), 50);
      }

      nodes.forEach(node => {
        node.addEventListener('click', (e) => {
          // If already active, reset to default (vuln-mgmt)
          if (activeNode === node) {
            if (defaultNode && node !== defaultNode) {
              skillNodes.forEach(n => n.classList.remove('active'));
              defaultNode.classList.add('active');
              activateSkill('vuln-mgmt');
              applySubgraph(defaultNode);
            } else {
              activeNode = null;
              nodes.forEach(n => {
                n.style.opacity = '';
                n.querySelector('.skill-dot').style.opacity = '';
                n.querySelector('.skill-label').style.opacity = '';
              });
              svgLines.forEach(l => { l.style.opacity = ''; l.style.stroke = ''; });
            }
            return;
          }

          skillNodes.forEach(n => n.classList.remove('active'));
          skillPills.forEach(p => p.classList.remove('active'));
          node.classList.add('active');
          activateSkill(node.dataset.skill);
          applySubgraph(node);
        });
      });

      // Click outside constellation: revert to default node (desktop only)
      document.addEventListener('click', (e) => {
        const constellationVisible = window.getComputedStyle(document.querySelector('.constellation')).display !== 'none';
        if (!constellationVisible) return;
        if (activeNode && !e.target.closest('.constellation') && !e.target.closest('.skill-pills')) {
          if (defaultNode) {
            skillNodes.forEach(n => n.classList.remove('active'));
            defaultNode.classList.add('active');
            activateSkill('vuln-mgmt');
            applySubgraph(defaultNode);
          }
        }
      });
    })();

    // Hamburger menu
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');

    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      navLinks.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close mobile menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close mobile menu on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // Hide hero scroll cue after 40px of scroll
    const heroScrollCue = document.getElementById('hero-scroll-cue');
    if (heroScrollCue) {
      window.addEventListener('scroll', function checkCue() {
        if (window.scrollY > 40) {
          heroScrollCue.classList.add('hidden');
          window.removeEventListener('scroll', checkCue);
        }
      }, { passive: true });
    }

    // Active section highlighting via IntersectionObserver
    const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
    const sectionMap = {};
    navAnchors.forEach(a => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id) || document.querySelector(`[id="${id}"]`);
      if (el) sectionMap[id] = a;
    });

    // Also map footer#contact
    const contactEl = document.getElementById('contact');

    const observerOptions = {
      rootMargin: '-40% 0px -55% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navAnchors.forEach(a => a.classList.remove('active'));
          if (sectionMap[id]) {
            sectionMap[id].classList.add('active');
          }
        }
      });
    }, observerOptions);

    Object.keys(sectionMap).forEach(id => {
      const el = document.getElementById(id) || document.querySelector(`footer[id="${id}"]`);
      if (el) sectionObserver.observe(el);
    });

    // Observe footer separately (it's not a <section>)
    if (contactEl && !sectionMap['contact']) {
      sectionObserver.observe(contactEl);
    }

    // ── Scroll entrance animations ──
    const fadeTargets = [
      ...document.querySelectorAll('.exp-card, .company-block, .projects-tree, .cert-card, .featured-post-card')
    ];

    // Stagger items that share a grid parent
    const grids = document.querySelectorAll('.certs-grid, .origin-grid');
    grids.forEach(grid => {
      grid.querySelectorAll('.fade-in').forEach((el, i) => {
        el.style.setProperty('--fade-delay', `${i * 65}ms`);
      });
    });

    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    fadeTargets.forEach(el => {
      el.classList.add('fade-in');
      fadeObserver.observe(el);
    });

    // ── Stat counter animation ──
    const statEls = document.querySelectorAll('.stat-value[data-target]');
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const duration = 1400;
        const startTime = performance.now();

        function tick(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        statObserver.unobserve(el);
      });
    }, { threshold: 0.6 });
    statEls.forEach(el => statObserver.observe(el));

    // ── Copy email ──
    const copyBtn = document.getElementById('copy-email-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const email = document.getElementById('footer-email').textContent;
        navigator.clipboard.writeText(email).then(() => {
          copyBtn.classList.add('copied');
          setTimeout(() => copyBtn.classList.remove('copied'), 2000);
        });
      });
    }

    // ── WhisperLink Pipeline Visualizer ────────────────────────
    (function () {
      const pipeline = document.getElementById('whisperlink-pipeline');
      if (!pipeline) return;

      const stages = {
        stt: document.getElementById('sp-stt'),
        llm: document.getElementById('sp-llm'),
        tts: document.getElementById('sp-tts'),
      };
      const dot1      = document.getElementById('sp-dot-1');
      const dot2      = document.getElementById('sp-dot-2');
      const statusEl  = document.getElementById('sp-status');
      const waveform  = document.getElementById('sp-waveform');
      const thinking  = document.getElementById('sp-thinking');

      // Colour lookup matching per-stage CSS vars
      const stageColors = { stt: '#60a5fa', llm: '#a78bfa', tts: '#34d399' };

      let cycleTimer = null;
      let dotAnim1   = null;
      let dotAnim2   = null;

      function setActive(stageId) {
        Object.values(stages).forEach(el => el && el.classList.remove('sp-active'));
        if (stageId && stages[stageId]) stages[stageId].classList.add('sp-active');
      }

      function setStatus(text, color) {
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.style.color = color || '';
      }

      // Animate a travelling dot along a connector line
      // dot: SVG <circle> element, duration ms, color
      function animateDot(dotEl, duration, color) {
        if (!dotEl) return Promise.resolve();
        return new Promise(resolve => {
          dotEl.setAttribute('fill', color);
          dotEl.style.opacity = '1';
          const start = performance.now();
          function tick(now) {
            if (pipeline.classList.contains('sp-paused')) {
              requestAnimationFrame(tick);
              return;
            }
            const t = Math.min((now - start) / duration, 1);
            // ease in-out cubic
            const e = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
            dotEl.setAttribute('cx', e * 36);
            if (t >= 1) {
              dotEl.style.opacity = '0';
              resolve();
            } else {
              requestAnimationFrame(tick);
            }
          }
          requestAnimationFrame(tick);
        });
      }

      // One full pipeline cycle
      async function runCycle() {
        // --- STT phase ---
        setActive('stt');
        setStatus('▶ listening…', stageColors.stt);
        waveform.classList.add('sp-visible');
        thinking.classList.remove('sp-visible');
        await sleep(1400);

        setStatus('transcribing audio', stageColors.stt);
        await sleep(800);

        waveform.classList.remove('sp-visible');
        setStatus('sending to LLM', '#5c6370');
        await animateDot(dot1, 500, stageColors.stt);

        // --- LLM phase ---
        setActive('llm');
        setStatus('⟳ inferring…', stageColors.llm);
        thinking.classList.add('sp-visible');
        await sleep(1800);

        thinking.classList.remove('sp-visible');
        setStatus('streaming tokens', stageColors.llm);
        await sleep(600);

        setStatus('sending to TTS', '#5c6370');
        await animateDot(dot2, 500, stageColors.llm);

        // --- TTS phase ---
        setActive('tts');
        setStatus('◉ synthesizing', stageColors.tts);
        await sleep(900);

        setStatus('▶▶ speaking', stageColors.tts);
        await sleep(1200);

        // --- Cool-down ---
        setActive(null);
        setStatus('idle', '');
        await sleep(1600);
      }

      function sleep(ms) {
        return new Promise(resolve => {
          let start = null;
          function tick(now) {
            if (pipeline.classList.contains('sp-paused')) {
              // Re-check in 100ms while paused - cheap
              setTimeout(() => requestAnimationFrame(tick), 100);
              return;
            }
            if (!start) start = now;
            if (now - start >= ms) resolve();
            else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }

      async function loop() {
        while (true) {
          await runCycle();
        }
      }

      // Pause CSS animations + JS loop when off-screen (saves CPU on Pi)
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            pipeline.classList.remove('sp-paused');
          } else {
            pipeline.classList.add('sp-paused');
          }
        });
      }, { threshold: 0.1 });

      observer.observe(pipeline);

      // Kick off the loop
      loop();
    })();

    // ── Zero Touch Timeline Demo ──────────────────────────────
    (function () {
      const demo      = document.getElementById('zt-demo');
      if (!demo) return;

      const pulsesEl  = document.getElementById('zt-pulses');
      const accountsEl= document.getElementById('zt-accounts');
      const statusEl  = document.getElementById('zt-status');
      const opsEl     = document.getElementById('zt-ops');
      const covEl     = document.getElementById('zt-cov');
      const dividerEl = document.getElementById('zt-era-divider');
      const labelManual = document.getElementById('zt-label-manual');
      const labelAuto   = document.getElementById('zt-label-auto');
      const opsCounter  = document.querySelector('.zt-ops-counter');

      const TILE_COUNT = 12;
      // timeline x positions (0..1) for manual-era pulses — sparse, evenly spaced
      const MANUAL_POS = [0.05, 0.16, 0.27]; // 3 slow scheduled pulses — brief manual era
      const DIVIDER_POS = 0.36;
      // automated era pulses — dense
      const AUTO_POSITIONS = [];
      for (let x = 0.40; x <= 0.98; x += 0.048) AUTO_POSITIONS.push(parseFloat(x.toFixed(3)));

      function sleep(ms) {
        return new Promise(resolve => {
          const start = performance.now();
          function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            if (now - start >= ms) resolve(); else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }

      function setStatus(t) { if (statusEl) statusEl.textContent = t; }
      function setOps(v)    { if (opsEl) opsEl.textContent = v; }
      function setCov(v)    { if (covEl) covEl.textContent = v; }

      function buildTiles() {
        accountsEl.innerHTML = '';
        const tiles = [];
        for (let i = 0; i < TILE_COUNT; i++) {
          const d = document.createElement('div');
          d.className = 'zt-acct';
          accountsEl.appendChild(d);
          tiles.push(d);
        }
        return tiles;
      }

      function placePulse(x, manual) {
        const dot = document.createElement('div');
        dot.className = 'zt-pulse' + (manual ? ' zt-pulse-manual' : '');
        dot.style.left = (x * 100) + '%';
        pulsesEl.appendChild(dot);
        return dot;
      }

      function flashTiles(tiles, cls, duration) {
        tiles.forEach(t => { t.classList.remove('zt-scanning','zt-covered','zt-new'); t.classList.add(cls); });
        return sleep(duration).then(() => {
          tiles.forEach(t => { t.classList.remove(cls); t.classList.add('zt-covered'); });
        });
      }

      async function runCycle() {
        // --- reset ---
        pulsesEl.innerHTML = '';
        dividerEl.classList.remove('zt-visible');
        labelManual.classList.remove('zt-era-active');
        labelAuto.classList.remove('zt-era-active');
        labelManual.classList.add('zt-era-active');
        if (opsCounter) opsCounter.classList.remove('zt-ops-zero');
        setOps('manual');
        setCov('partial');
        setStatus('scheduled scan running…');

        const tiles = buildTiles();

        // --- manual era: slow scheduled pulses, partial tile coverage ---
        const manualCovered = tiles.slice(0, 7); // only ~half covered in manual era
        for (let i = 0; i < MANUAL_POS.length; i++) {
          const dot = placePulse(MANUAL_POS[i], true);
          await sleep(60);
          dot.classList.add('zt-pulse-visible');
          manualCovered.forEach(t => t.classList.add('zt-scanning'));
          await sleep(280);
          manualCovered.forEach(t => { t.classList.remove('zt-scanning'); t.classList.add('zt-covered'); });
          dot.classList.remove('zt-pulse-visible');
          dot.classList.add('zt-pulse-dim');
          await sleep(300);
        }

        // --- transition ---
        await sleep(150);
        dividerEl.classList.add('zt-visible');
        labelManual.classList.remove('zt-era-active');
        labelAuto.classList.add('zt-era-active');
        if (opsCounter) opsCounter.classList.add('zt-ops-zero');
        setOps('0');
        setStatus('zero touch active — full coverage');
        await sleep(1800);

        // full coverage lights up
        tiles.forEach(t => { t.classList.remove('zt-covered'); t.classList.add('zt-scanning'); });
        await sleep(500);
        tiles.forEach(t => { t.classList.remove('zt-scanning'); t.classList.add('zt-covered'); });
        setCov('full');
        await sleep(600);

        // --- automated era: dense pulses, self-healing event mid-way ---
        let healDone = false;
        const healAt = Math.floor(AUTO_POSITIONS.length * 0.45); // trigger self-heal partway through
        let removedTile = null;
        let newTile = null;

        for (let i = 0; i < AUTO_POSITIONS.length; i++) {
          const dot = placePulse(AUTO_POSITIONS[i], false);
          dot.classList.add('zt-pulse-visible');

          // self-healing sequence
          if (i === healAt && !healDone) {
            healDone = true;
            // pick a tile to "decommission"
            removedTile = tiles[Math.floor(tiles.length * 0.6)];
            setStatus('account decommissioned — removing from coverage');
            removedTile.classList.remove('zt-covered');
            removedTile.classList.add('zt-gone');
            await sleep(1800);
            setStatus('coverage restored automatically');
            newTile = document.createElement('div');
            newTile.className = 'zt-acct zt-new';
            removedTile.replaceWith(newTile);
            await sleep(1600);
            newTile.classList.remove('zt-new');
            newTile.classList.add('zt-covered');
            setStatus('self-healing complete — 0 manual ops');
            await sleep(1800);
          } else {
            // normal pulse: flash all covered tiles
            const activeTiles = Array.from(accountsEl.querySelectorAll('.zt-acct'));
            activeTiles.forEach(t => t.classList.add('zt-scanning'));
            await sleep(200);
            activeTiles.forEach(t => { t.classList.remove('zt-scanning'); t.classList.add('zt-covered'); });
          }

          dot.classList.remove('zt-pulse-visible');
          dot.classList.add('zt-pulse-dim');
          await sleep(i < 2 ? 110 : 80);
        }

        setStatus('continuous coverage — 0 manual ops');
        await sleep(2800);
      }

      async function loop() { while (true) { await runCycle(); } }

      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);

      loop();
    })();

    // ── Access Lifecycle State Machine ───────────────────────
    (function () {
      const demo = document.getElementById('al-demo');
      if (!demo) return;

      const nodes   = [0,1,2,3].map(i => document.getElementById('al-node-' + i));
      const badges  = [0,1,2].map(i => document.getElementById('al-badge-' + i));
      const bars    = [0,1,2].map(i => document.getElementById('al-bar-' + i));
      const srcs    = [0,1,2].map(i => document.getElementById('al-src-' + i));
      const statusEl = document.getElementById('al-status');

      const BADGE_CLASSES = ['al-badge-active','al-badge-warn','al-badge-disabled','al-badge-new'];
      const BAR_CLASSES   = ['al-warn','al-full','al-new'];
      const NODE_CLASSES  = ['al-active','al-past','al-disabled-node'];
      const SRC_CLASSES   = ['al-src-api'];

      function sleep(ms) {
        return new Promise(resolve => {
          const start = performance.now();
          function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            if (now - start >= ms) resolve(); else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }

      function setNodeState(idx, state) {
        nodes.forEach((n, i) => {
          NODE_CLASSES.forEach(c => n.classList.remove(c));
          if (i < idx)  n.classList.add('al-past');
          if (i === idx) n.classList.add(state === 'disabled' ? 'al-disabled-node' : 'al-active');
        });
      }

      function setBadge(idx, cls, text) {
        BADGE_CLASSES.forEach(c => badges[idx].classList.remove(c));
        if (cls) badges[idx].classList.add(cls);
        if (text !== undefined) badges[idx].textContent = text;
      }

      function setBar(idx, pct, cls) {
        BAR_CLASSES.forEach(c => bars[idx].classList.remove(c));
        if (cls) bars[idx].classList.add(cls);
        bars[idx].style.width = pct + '%';
      }

      function setSrc(idx, cls, text) {
        SRC_CLASSES.forEach(c => srcs[idx].classList.remove(c));
        if (cls) srcs[idx].classList.add(cls);
        srcs[idx].textContent = text;
      }

      function setStatus(t) { if (statusEl) statusEl.textContent = t; }

      async function runCycle() {
        // ── Phase 1: Normal active state ──
        setNodeState(1, 'active');
        setBadge(0, 'al-badge-active', 'security-eng'); setBar(0, 30, '');        setSrc(0, 'al-src-api', 'API');
        setBadge(1, 'al-badge-warn',   'analyst');      setBar(1, 72, 'al-warn'); setSrc(1, '', 'SCM');
        setBadge(2, 'al-badge-active', 'ops-eng');      setBar(2, 18, '');        setSrc(2, 'al-src-api', 'API');
        setStatus('monitoring lifecycle…');
        await sleep(1800);

        // ── Phase 2: analyst approaches 90d ──
        setStatus('analyst approaching 90d inactivity');
        setBar(1, 90, 'al-warn');
        await sleep(900);

        // ── Phase 3: analyst hits 180d - disable ──
        setNodeState(2, 'active');
        setStatus('analyst inactive 180d - auto-disabling');
        await sleep(600);
        setNodeState(3, 'disabled');
        setBadge(1, 'al-badge-disabled', 'analyst');
        setBar(1, 100, 'al-full');
        setStatus('access revoked · audit log written');
        await sleep(1200);

        // ── Phase 4: new user provisioned via API ──
        setNodeState(0, 'active');
        setStatus('provisioning new user via API…');
        setBadge(1, 'al-badge-new', 'analyst');
        setBar(1, 0, 'al-new');
        setSrc(1, 'al-src-api', 'API');
        await sleep(600);
        setBar(1, 12, 'al-new');
        await sleep(400);

        // ── Phase 5: security-eng counter advances ──
        setStatus('security-eng activity detected - timer reset');
        setBar(0, 5, '');
        await sleep(900);

        // ── Phase 6: back to steady state ──
        setNodeState(1, 'active');
        setBadge(1, 'al-badge-active', 'analyst');
        setBar(1, 12, '');
        setSrc(1, 'al-src-api', 'API');
        setStatus('monitoring lifecycle…');
        await sleep(1600);
      }

      async function loop() { while (true) { await runCycle(); } }

      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);

      loop();
    })();

    // ── Virtual Scanner Upgrade ──────────────────────────────
    (function () {
      const demo = document.getElementById('cs-demo');
      if (!demo) return;

      const virts  = [0,1,2].map(i => document.getElementById('cs-virt-'  + i));
      const vspecs = [0,1,2].map(i => document.getElementById('cs-vspec-' + i));
      const vbadge = [0,1,2].map(i => document.getElementById('cs-vbadge-'+ i));
      const deltas = [0,1,2].map(i => document.getElementById('cs-delta-' + i));
      const capBar = document.getElementById('cs-cap-bar');
      const covEl  = document.getElementById('cs-coverage');

      const azLabels = ['az-1', 'az-2', 'az-3'];
      const capSteps = ['50%', '67%', '83%', '100%'];

      function sleep(ms) {
        return new Promise(resolve => {
          const start = performance.now();
          function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            if (now - start >= ms) resolve(); else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }

      function setVirt(i, state) {
        virts[i].classList.remove('cs-virt-under', 'cs-virt-upgrading', 'cs-virt-upgraded');
        virts[i].classList.add(state);
      }

      function setCoverage(text, accent) {
        if (covEl) { covEl.textContent = text; covEl.style.color = accent ? 'var(--accent)' : ''; }
      }

      function setCapBar(pct, accent) {
        if (capBar) { capBar.style.width = pct; capBar.style.background = accent ? 'var(--accent)' : 'var(--orange)'; }
      }

      async function upgradeScanner(i) {
        setVirt(i, 'cs-virt-upgrading');
        if (vbadge[i]) vbadge[i].textContent = 'upgrading…';
        await sleep(700);

        if (vspecs[i]) vspecs[i].textContent = '4vCPU · 8 GB';
        if (vbadge[i]) vbadge[i].textContent = azLabels[i];
        setVirt(i, 'cs-virt-upgraded');

        if (deltas[i]) deltas[i].classList.add('cs-delta-visible');
        await sleep(900);
        if (deltas[i]) deltas[i].classList.remove('cs-delta-visible');
      }

      async function runCycle() {
        virts.forEach((_, i) => {
          setVirt(i, 'cs-virt-under');
          if (vspecs[i]) vspecs[i].textContent = '2vCPU · 4 GB';
          if (vbadge[i]) vbadge[i].textContent = 'under-spec';
          if (deltas[i]) deltas[i].classList.remove('cs-delta-visible');
        });
        setCapBar(capSteps[0], false);
        setCoverage('capacity: 1×  (baseline)', false);
        await sleep(1000);

        for (let i = 0; i < 3; i++) {
          await upgradeScanner(i);
          setCapBar(capSteps[i + 1], i === 2);
          if (i < 2) {
            setCoverage('upgrading… (' + (i + 1) + '/3 complete)', false);
          } else {
            setCoverage('✓ 2× capacity · AZ-distributed · 99.5%+ coverage', true);
          }
          await sleep(500);
        }

        await sleep(2400);
      }

      async function loop() { while (true) { await runCycle(); } }

      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);

      loop();
    })();

    // ── FedRAMP Container Pipeline ───────────────────────────
    (function () {
      const demo = document.getElementById('fp-demo');
      if (!demo) return;

      const envEls    = [0,1,2,3,4].map(i => document.getElementById('fp-env-' + i));
      const enriched  = document.getElementById('fp-enriched');
      const enrCve    = document.getElementById('fp-enr-cve');
      const enrTag    = document.getElementById('fp-enr-tag');
      const poam      = document.getElementById('fp-poam');
      const statusEl  = document.getElementById('fp-status');

      // Pill pairs: [qualys-id, qualys-sev, supp-label, supp-sev, enriched-cve, enriched-tag, enriched-sev]
      const pairs = [
        ['fp-q0','fp-crit', 'fp-s0','fp-high', 'CVE-2024-XXXX','persists: 3 cycles','fp-crit'],
        ['fp-q1','fp-high', 'fp-s1','fp-med',  'CVE-2023-YYYY','new this cycle','fp-high'],
      ];
      let pairIdx = 0;

      function sleep(ms) {
        return new Promise(resolve => {
          const start = performance.now();
          function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            if (now - start >= ms) resolve(); else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }

      function setStatus(t) { if (statusEl) statusEl.textContent = t; }

      function showPill(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('fp-visible');
      }
      function hidePill(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('fp-visible');
      }

      // Activate envs up to index n (0-based), highlight n as new if fresh
      function activateEnvs(upTo, highlightNew) {
        envEls.forEach((el, i) => {
          el.classList.remove('fp-env-active', 'fp-env-new');
          if (i < upTo)       el.classList.add('fp-env-active');
          if (i === upTo - 1 && highlightNew) el.classList.add('fp-env-new');
        });
        if (upTo >= 2 && poam) poam.classList.add('fp-visible');
      }

      async function runCycle() {
        // Reset pills, enriched, envs
        ['fp-q0','fp-q1','fp-s0','fp-s1'].forEach(hidePill);
        if (enriched) enriched.classList.remove('fp-visible');
        if (poam)     poam.classList.remove('fp-visible');
        envEls.forEach(el => { el.classList.remove('fp-env-active','fp-env-new'); });
        setStatus('initializing pipeline…');
        activateEnvs(2, false); // start at 2 envs (pre-scale)
        await sleep(700);

        // Cycle through both finding pairs
        for (let p = 0; p < pairs.length; p++) {
          const [qId, , sId, , cve, tag, sev] = pairs[p];

          setStatus('ingesting findings…');
          showPill(qId);
          await sleep(350);
          showPill(sId);
          await sleep(500);

          setStatus('enriching · joining scan cycles');
          if (enriched) {
            enriched.classList.remove('fp-visible');
            // Update content before showing
            if (enrCve) enrCve.textContent = cve;
            if (enrTag) enrTag.textContent = tag;
            // Update severity dot
            const sevDot = enriched.querySelector('.fp-sev');
            if (sevDot) { sevDot.className = 'fp-sev ' + sev; }
            await sleep(150);
            enriched.classList.add('fp-visible');
          }
          await sleep(900);

          hidePill(qId);
          hidePill(sId);
          if (enriched) enriched.classList.remove('fp-visible');
          await sleep(300);
        }

        // Scale out envs 3 -> 4 -> 5
        setStatus('scaling to new environments…');
        await sleep(400);
        activateEnvs(3, true);
        await sleep(600);
        activateEnvs(4, true);
        await sleep(600);
        activateEnvs(5, true);
        setStatus('✓ POAM reporting active · numerous environments');
        await sleep(2000);
      }

      async function loop() { while (true) { await runCycle(); } }

      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);

      loop();
    })();

    // #2 - Glow orb breath: single slow pulse on load
    (function() {
      const orb = document.querySelector('.glow-orb');
      if (!orb) return;
      const duration = 5800;
      const delay = 800;
      let startTime = null;
      function animate(ts) {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        // one sine arch: 0 -> 1 -> 0
        const wave = Math.sin(progress * Math.PI);
        const scale = 1 + wave * 0.14;
        const opacity = 1 + wave * 0.55;
        orb.style.transform = `scale(${scale.toFixed(4)})`;
        orb.style.opacity = opacity.toFixed(4);
        if (progress < 1) requestAnimationFrame(animate);
        else { orb.style.transform = ''; orb.style.opacity = ''; }
      }
      setTimeout(() => requestAnimationFrame(animate), delay);
    })();

    // #4 - Nav logo cursor blink: pulses for ~4s then stops
    (function() {
      const logo = document.querySelector('.nav-logo');
      if (!logo) return;
      const cursor = document.createElement('span');
      cursor.textContent = '_';
      cursor.style.cssText = 'color:var(--accent);opacity:1;margin-left:1px;';
      // replace the trailing _ in the logo text with our animated one
      logo.innerHTML = '&gt; LEV.MALININ';
      logo.appendChild(cursor);
      let visible = true;
      const interval = setInterval(() => {
        visible = !visible;
        cursor.style.opacity = visible ? '1' : '0';
      }, 530);
      setTimeout(() => {
        clearInterval(interval);
        cursor.style.opacity = '1'; // leave it solid after blinking stops
      }, 4200);
    })();

    // ── Slack-Jira Pipeline ──────────────────────────────────
    (function () {
      const demo = document.getElementById('sj-demo');
      if (!demo) return;
      const typing   = document.getElementById('sj-typing');
      const msg0     = document.getElementById('sj-msg-0');
      const msg1     = document.getElementById('sj-msg-1');
      const badge0   = document.getElementById('sj-badge-0');
      const body0    = document.getElementById('sj-body-0');
      const ticket   = document.getElementById('sj-ticket');
      const ticketId = document.getElementById('sj-ticket-id');
      const ticketTitle = document.getElementById('sj-ticket-title');
      const ticketStatus = document.getElementById('sj-ticket-status');
      const statusEl = document.getElementById('sj-status');

      function sleep(ms) {
        return new Promise(resolve => {
          const s = performance.now();
          (function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            now - s >= ms ? resolve() : requestAnimationFrame(tick);
          })(performance.now());
        });
      }
      function setStatus(t) { if (statusEl) statusEl.textContent = t; }

      async function runCycle() {
        // Reset
        [msg0, msg1].forEach(el => el && el.classList.remove('sj-visible'));
        if (typing) typing.classList.remove('sj-visible');
        if (ticket) ticket.className = 'sj-ticket';
        if (ticketId) ticketId.textContent = 'VUL-1847';
        if (ticketTitle) ticketTitle.textContent = 'Patch critical hosts · prod-cluster';
        if (ticketStatus) { ticketStatus.className = 'sj-ticket-status sj-st-progress'; ticketStatus.textContent = 'In Progress'; }
        if (badge0) { badge0.className = 'sj-badge sj-resolved'; badge0.textContent = 'RESOLVED'; }
        if (body0) body0.textContent = 'VUL-1847 · assigned: engineer';
        setStatus('listening for events…');
        await sleep(900);

        // ── Cycle 1: VUL-1847 resolved ──
        setStatus('event received: VUL-1847 status changed');
        if (ticketStatus) { ticketStatus.className = 'sj-ticket-status sj-st-resolved'; ticketStatus.textContent = 'Done'; }
        if (ticket) ticket.classList.add('sj-ticket-resolved');
        await sleep(400);
        // Bot types then posts
        if (typing) typing.classList.add('sj-visible');
        await sleep(750);
        if (typing) typing.classList.remove('sj-visible');
        if (msg0) msg0.classList.add('sj-visible');
        setStatus('notification dispatched to #sec-alerts');
        await sleep(1600);

        // ── Cycle 2: VUL-1902 critical opened ──
        setStatus('event received: VUL-1902 opened · CRITICAL');
        if (ticketId) ticketId.textContent = 'VUL-1902';
        if (ticketTitle) ticketTitle.textContent = 'CVE-2024-XXXX · prod-cluster';
        if (ticketStatus) { ticketStatus.className = 'sj-ticket-status sj-st-critical'; ticketStatus.textContent = 'Critical'; }
        if (ticket) { ticket.classList.remove('sj-ticket-resolved'); ticket.classList.add('sj-ticket-critical'); }
        await sleep(350);
        if (typing) typing.classList.add('sj-visible');
        await sleep(700);
        if (typing) typing.classList.remove('sj-visible');
        if (msg1) msg1.classList.add('sj-visible');
        setStatus('notification dispatched to #sec-alerts');
        await sleep(1800);
      }

      async function loop() { while (true) { await runCycle(); } }
      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);
      loop();
    })();

    // ── Christel House Assessment ────────────────────────────
    (function () {
      const demo = document.getElementById('ch-demo');
      if (!demo) return;
      const phases   = [0,1,2].map(i => document.getElementById('ch-phase-' + i));
      const details  = [0,1,2].map(i => document.getElementById('ch-detail-' + i));
      const countEl  = document.getElementById('ch-count');
      const statusEl = document.getElementById('ch-status');

      function sleep(ms) {
        return new Promise(resolve => {
          const s = performance.now();
          (function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            now - s >= ms ? resolve() : requestAnimationFrame(tick);
          })(performance.now());
        });
      }
      function setStatus(t) { if (statusEl) statusEl.textContent = t; }
      function setCount(n)   { if (countEl) countEl.textContent = n; }

      function activatePhase(i) {
        phases.forEach((p, idx) => {
          if (!p) return;
          p.classList.remove('ch-active', 'ch-done');
          if (idx < i)  p.classList.add('ch-done');
          if (idx === i) p.classList.add('ch-active');
        });
      }

      async function runCycle() {
        phases.forEach(p => p && p.classList.remove('ch-active','ch-done'));
        setCount(0);
        setStatus('initializing assessment…');
        await sleep(700);

        // Phase 0: Recon
        activatePhase(0);
        if (details[0]) details[0].innerHTML = 'web app<br>OWASP scan';
        setStatus('▶ recon · probing web application');
        await sleep(600);
        // Count up findings
        for (let n = 1; n <= 7; n++) { setCount(n); await sleep(120); }
        if (details[0]) details[0].innerHTML = '7 findings<br>catalogued';
        setStatus('recon complete · 7 findings');
        await sleep(700);

        // Phase 1: Phishing
        activatePhase(1);
        if (details[1]) details[1].innerHTML = 'campaign<br>sent';
        setStatus('▶ phishing campaign launched');
        await sleep(800);
        if (details[1]) details[1].innerHTML = 'click rate<br>23%';
        setStatus('phishing complete · 23% click rate');
        await sleep(700);

        // Phase 2: Report
        activatePhase(2);
        if (details[2]) details[2].innerHTML = 'executive<br>board deck';
        setStatus('▶ compiling executive report');
        await sleep(600);
        if (details[2]) details[2].innerHTML = 'Crit:2 Hi:3<br>Med:2 · 10pg';
        setStatus('✓ delivered to board · 10-page report');
        // Mark all done
        phases.forEach(p => p && (p.classList.remove('ch-active'), p.classList.add('ch-done')));
        await sleep(2000);
      }

      async function loop() { while (true) { await runCycle(); } }
      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);
      loop();
    })();

    // ── FlipperTwo TFT Display ───────────────────────────────
    (function () {
      const demo = document.getElementById('ft-demo');
      if (!demo) return;
      const body     = document.getElementById('ft-body');
      const htitle   = document.getElementById('ft-htitle');
      const hicon    = document.getElementById('ft-hicon');
      const modeEl   = document.getElementById('ft-mode');
      const statusEl = document.getElementById('ft-status');

      function sleep(ms) {
        return new Promise(resolve => {
          const s = performance.now();
          (function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            now - s >= ms ? resolve() : requestAnimationFrame(tick);
          })(performance.now());
        });
      }
      const fileIconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      function setHeader(icon, title) {
        if (hicon) hicon.innerHTML = fileIconSVG;
        if (htitle) htitle.textContent = title;
      }
      function setMode(t) { if (modeEl) modeEl.textContent = t; }
      function setStatus(t) { if (statusEl) statusEl.textContent = t; }
      function setBody(html) { if (body) body.innerHTML = html; }

      // Wi-Fi rows data
      const wifiNets = [
        { ssid: 'Corp-Guest',   enc: 'WPA2', sig: 4, open: false },
        { ssid: 'DIRECT-7F',    enc: 'WPA2', sig: 2, open: false },
        { ssid: 'FreeWifi',     enc: 'OPEN', sig: 3, open: true  },
        { ssid: 'Workday-Sec',  enc: 'WPA3', sig: 5, open: false },
      ];
      function wifiRow(n, selected) {
        const sigBar = '▪'.repeat(n.sig) + '▫'.repeat(5 - n.sig);
        const col = n.open ? '#ef4444' : '#4ade80';
        return `<div class="ft-row ${selected ? 'ft-selected' : 'ft-item'}">
          <span style="color:${col};font-size:7px">${n.enc}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${n.ssid}</span>
          <span style="color:#555;letter-spacing:-1px;font-size:7px">${sigBar}</span>
        </div>`;
      }

      // BLE devices
      const bleDevs = [
        { name: 'iPhone-LM',   vendor: 'Apple'   },
        { name: 'Galaxy-S24',  vendor: 'Samsung' },
        { name: 'WH-1000XM5', vendor: 'Sony'    },
      ];
      function bleRow(d, selected) {
        return `<div class="ft-row ${selected ? 'ft-selected' : 'ft-item'}">
          <span class="ft-dot" style="background:#a78bfa"></span>
          <span style="flex:1">${d.name}</span>
          <span style="color:#555;font-size:7px">${d.vendor}</span>
        </div>`;
      }

      // BadUSB payloads
      const payloads = ['RickRoll.txt', 'RevShell.dd', 'InfoDump.dd', 'PwnBox.dd'];

      async function runCycle() {
        // ── Wi-Fi mode ──
        setHeader(null, 'Wi-Fi Scanner');
        setMode('wifi');
        setStatus('scanning 2.4 / 5 GHz…');
        setBody('');
        // Populate networks one by one
        let html = '';
        for (let i = 0; i < wifiNets.length; i++) {
          html += wifiRow(wifiNets[i], i === 0);
          setBody(html);
          await sleep(320);
        }
        await sleep(900);
        // Move selection down
        for (let sel = 1; sel < wifiNets.length; sel++) {
          setBody(wifiNets.map((n, i) => wifiRow(n, i === sel)).join(''));
          await sleep(350);
        }
        await sleep(600);

        // ── BLE mode ──
        setHeader(null, 'BLE Scanner');
        setMode('ble');
        setStatus('scanning nearby devices…');
        setBody('');
        let bhtml = '';
        for (let i = 0; i < bleDevs.length; i++) {
          bhtml += bleRow(bleDevs[i], i === 0);
          setBody(bhtml);
          await sleep(380);
        }
        await sleep(1000);

        // ── BadUSB mode ──
        setHeader(null, 'BadUSB');
        setMode('badusb');
        setStatus('Ducky interpreter ready');
        setBody(payloads.map((p, i) =>
          `<div class="ft-row ${i === 0 ? 'ft-selected' : 'ft-item'}">
            <span style="color:#fb923c;font-size:7px">▶</span>
            <span>${p}</span>
          </div>`
        ).join(''));
        await sleep(800);
        // Cycle selection through payloads
        for (let sel = 1; sel < payloads.length; sel++) {
          setBody(payloads.map((p, i) =>
            `<div class="ft-row ${i === sel ? 'ft-selected' : 'ft-item'}">
              <span style="color:#fb923c;font-size:7px">▶</span>
              <span>${p}</span>
            </div>`
          ).join(''));
          await sleep(380);
        }
        await sleep(700);
      }

      async function loop() { while (true) { await runCycle(); } }
      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);
      loop();
    })();

    // ── Tama-Server OLED ────────────────────────────────────
    (function () {
      const demo = document.getElementById('tm-demo');
      if (!demo) return;
      const topText   = document.getElementById('tm-top-text');
      const dot       = document.getElementById('tm-dot');
      const bot       = document.getElementById('tm-bot');
      const screenLbl = document.getElementById('tm-screen-label');
      const statusEl  = document.getElementById('tm-status');

      function sleep(ms) {
        return new Promise(resolve => {
          const s = performance.now();
          (function tick(now) {
            if (demo.classList.contains('sp-paused')) { setTimeout(() => requestAnimationFrame(tick), 100); return; }
            now - s >= ms ? resolve() : requestAnimationFrame(tick);
          })(performance.now());
        });
      }
      function setTop(txt) { if (topText) topText.textContent = txt; }
      function setBot(html) { if (bot) bot.innerHTML = html; }
      function setScreen(t) { if (screenLbl) screenLbl.textContent = t; }
      function setStatus(t) { if (statusEl) statusEl.textContent = t; }
      function line(txt, dim) {
        return `<div class="tm-text-b${dim ? ' tm-text-dim' : ''}">${txt}</div>`;
      }

      const players = ['Lev_M', 'crafty99', 'NightOwl'];
      let playerIdx = 0;

      // Fake uptime counter (seconds since page load relative start)
      let uptimeSec = 3600 * 4 + 22 * 60 + 14; // starts at 4h22m14s

      async function runCycle() {
        uptimeSec += Math.floor(Math.random() * 8) + 3;
        const h = Math.floor(uptimeSec / 3600);
        const m = Math.floor((uptimeSec % 3600) / 60);
        const s = uptimeSec % 60;
        const upStr = `${h}h${String(m).padStart(2,'0')}m${String(s).padStart(2,'0')}s`;

        // ── Screen 0: Home ──
        setScreen('home');
        setTop('mc.server  ONLINE');
        if (dot) { dot.className = 'tm-dot tm-on'; }
        setBot(
          line(`uptime: ${upStr}`) +
          line('cpu:    38°C') +
          line('host:   orange-pi') +
          line('mqtt:   connected', true)
        );
        setStatus('home screen · server telemetry');
        await sleep(1800);

        // ── Screen 1: Dino (players) ──
        setScreen('dino');
        const online = (playerIdx % 3) + 1;
        setTop(`players: ${online}/20`);
        let phtml = '';
        for (let i = 0; i < online; i++) {
          phtml += line(`▸ ${players[i % players.length]}`);
        }
        phtml += line('', true); // spacer
        setBot(phtml);
        setStatus('dino screen · player list');
        await sleep(1600);

        // Player joins mid-screen
        if (online < 3) {
          const newPlayer = players[(online) % players.length];
          setTop(`players: ${online + 1}/20`);
          phtml += line(`▸ ${newPlayer}`);
          setBot(phtml);
          setStatus(`${newPlayer} joined`);
          await sleep(900);
        }
        playerIdx++;

        // ── Screen 2: Logs ──
        setScreen('logs');
        setTop('server logs');
        if (dot) dot.className = 'tm-dot tm-on';
        const ts = () => {
          const d = new Date();
          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        };
        setBot(
          line(`${ts()} INFO  world saved`, true) +
          line(`${ts()} INFO  chunk loaded`) +
          line(`${ts()} WARN  lag spike 210ms`) +
          line(`${ts()} INFO  autosave ok`, true)
        );
        setStatus('log screen · tailing output');
        await sleep(1600);

        // Scroll one new log line in
        setBot(
          line(`${ts()} INFO  chunk loaded`, true) +
          line(`${ts()} WARN  lag spike 210ms`, true) +
          line(`${ts()} INFO  autosave ok`, true) +
          line(`${ts()} INFO  player ping 42ms`)
        );
        await sleep(800);
      }

      async function loop() { while (true) { await runCycle(); } }
      new IntersectionObserver(entries => {
        entries.forEach(e => demo.classList.toggle('sp-paused', !e.isIntersecting));
      }, { threshold: 0.1 }).observe(demo);
      loop();
    })();


    window.addEventListener('load', function () {
      const VISIBLE_COUNT = 3;

      document.querySelectorAll('.exp-show-more').forEach(btn => {
        const highlights = btn.previousElementSibling;
        if (!highlights || !highlights.classList.contains('exp-highlights')) return;

        const items = Array.from(highlights.querySelectorAll('.exp-highlight'));
        if (items.length <= VISIBLE_COUNT) return;

        const hidden = items.slice(VISIBLE_COUNT);
        hidden.forEach(el => el.classList.add('exp-hidden'));
        btn.classList.add('visible');

        btn.addEventListener('click', () => {
          const isHidden = hidden[0].classList.contains('exp-hidden');
          if (isHidden) {
            hidden.forEach(el => el.classList.remove('exp-hidden'));
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Show less';
            btn.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
          } else {
            hidden.forEach(el => el.classList.add('exp-hidden'));
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Show more';
            btn.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
          }
        });
      });
    });

    (function () {
      const bubble = document.getElementById('contact-bubble');
      const footer = document.getElementById('contact');
      if (!bubble || !footer) return;
      const observer = new IntersectionObserver(
        ([entry]) => bubble.classList.toggle('hidden', entry.isIntersecting),
        { threshold: 0.1 }
      );
      observer.observe(footer);
    })();

    // Theme toggle
    const root = document.documentElement;
    const themeBtn = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'light') root.classList.add('light');
    themeBtn.addEventListener('click', () => {
      const isLight = root.classList.toggle('light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
    (function () {
      const phrases = [
        'that keeps audits boring',
        'before threats become incidents',
        'that scales without hand-holding',
      ];
      let idx = 0;
      const el = document.getElementById('hero-cycling-phrase');
      if (!el) return;
      // first child is the text node, second is the period span
      const textNode = el.firstChild;
      setInterval(() => {
        // slide current phrase out to the left
        el.classList.add('slide-out');
        setTimeout(() => {
          idx = (idx + 1) % phrases.length;
          textNode.textContent = phrases[idx];
          // snap to right offset with no transition, then animate in
          el.classList.remove('slide-out');
          el.classList.add('slide-in-prepare');
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.classList.remove('slide-in-prepare');
            });
          });
        }, 500);
      }, 6000);
    })();
