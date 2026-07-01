/* ============================================================
   Ivyfy — front-end
   1. Particle wordmark:
        0 – 2s   green light-particles drift on a white field
        2 – 2.7s they converge into a solid "Ivyfy"
        then     gentle idle shimmer
   2. Infinite "scroll wheel" marquee
   3. Scroll reveal + stat count-up
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     1 — PARTICLE WORDMARK
     ========================================================= */
  (function particleWordmark() {
    var canvas = document.getElementById('particles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var wrap = canvas.parentElement;

    var W = 0, H = 0, dpr = 1;
    var particles = [];
    var mouse = { x: -9999, y: -9999, active: false };
    var startTime = 0, accum = 0, running = false, rafId = null, started = false;

    var ASSEMBLE_AT = 2000;   // hold the drifting field this long, then form the word
    var RAMP = 650;           // ease-in of the pull toward the letters

    // soft green glow sprite → cheap "light particle"
    var sprite = (function () {
      var s = document.createElement('canvas'); var S = 26; s.width = s.height = S;
      var g = s.getContext('2d');
      var grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, 'rgba(70,220,145,0.72)');
      grd.addColorStop(0.4, 'rgba(30,180,105,0.34)');
      grd.addColorStop(1, 'rgba(23,165,90,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
      return s;
    })();

    function setSize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // sample the glyphs of "Ivyfy" → dense target points, in CSS px
    function sampleTargets() {
      if (W < 2 || H < 2) return [];
      var off = document.createElement('canvas');
      off.width = W; off.height = H;
      var octx = off.getContext('2d');

      var word = 'Ivyfy';
      octx.font = '900 100px "Fraunces", Georgia, serif';
      var base = octx.measureText(word).width || 100;
      var fontSize = Math.min((W * 0.82) / base * 100, H * 0.80);
      fontSize = Math.max(60, fontSize);

      octx.font = '900 ' + fontSize + 'px "Fraunces", Georgia, serif';
      octx.fillStyle = '#000';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText(word, W / 2, H / 2 - fontSize * 0.03);

      var img;
      try { img = octx.getImageData(0, 0, W, H).data; }
      catch (e) { return []; }

      var small = W < 700;
      var step = small ? 4 : 3;                 // denser sampling → solid word
      var pts = [];
      for (var y = 0; y < H; y += step) {
        for (var x = 0; x < W; x += step) {
          if (img[(y * W + x) * 4 + 3] > 130) pts.push({ x: x, y: y });
        }
      }
      var CAP = small ? 2800 : 5200;
      if (pts.length > CAP) {
        var keep = [], k = pts.length / CAP;
        for (var i = 0; i < CAP; i++) keep.push(pts[Math.floor(i * k)]);
        pts = keep;
      }
      return pts;
    }

    function build() {
      var pts = sampleTargets();
      particles = pts.map(function (t) {
        var a = Math.random() * Math.PI * 2, sp = 0.15 + Math.random() * 0.5;
        return {
          x: Math.random() * W, y: Math.random() * H,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          tx: t.x, ty: t.y,
          size: 1.15 + Math.random() * 1.0,
          ang: Math.random() * Math.PI * 2,
          osp: 0.5 + Math.random() * 0.9,
          amp: 0.3 + Math.random() * 0.7
        };
      });
      startTime = performance.now(); accum = 0;
    }

    var K = 0.024, DAMP = 0.82, R = 88, R2 = R * R, FORCE = 2.0, PI2 = Math.PI * 2;

    function frame(now) {
      var t = now - startTime;
      var assembling = t >= ASSEMBLE_AT;
      var kk = assembling ? Math.min((t - ASSEMBLE_AT) / RAMP, 1) * K : 0;
      var fade = Math.min(t / 480, 1);

      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        if (assembling) {
          var wob = t * 0.001 * p.osp + p.ang;
          var gx = p.tx + Math.sin(wob) * p.amp;
          var gy = p.ty + Math.cos(wob) * p.amp;
          p.vx = (p.vx + (gx - p.x) * kk) * DAMP;
          p.vy = (p.vy + (gy - p.y) * kk) * DAMP;
        } else {
          // drifting field — gentle random walk, softly bounded to the box
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy += (Math.random() - 0.5) * 0.05;
          p.vx *= 0.985; p.vy *= 0.985;
          if (p.x < 22) p.vx += 0.03; else if (p.x > W - 22) p.vx -= 0.03;
          if (p.y < 22) p.vy += 0.03; else if (p.y > H - 22) p.vy -= 0.03;
          var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > 0.85) { p.vx *= 0.85 / spd; p.vy *= 0.85 / spd; }
        }

        if (mouse.active) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            var d = Math.sqrt(d2);
            var f = (R - d) / R * FORCE;
            p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          }
        }
        p.x += p.vx; p.y += p.vy;

        // soft halo
        ctx.globalAlpha = fade * 0.5;
        var hr = p.size * 2.3;
        ctx.drawImage(sprite, p.x - hr, p.y - hr, hr * 2, hr * 2);
        // solid ivy core → the word reads crisp, not washed out
        ctx.globalAlpha = fade;
        ctx.fillStyle = 'rgba(12,104,63,0.96)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, PI2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(frame);
    }

    function renderStatic() {
      var pts = sampleTargets();
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        ctx.globalAlpha = 0.5;
        ctx.drawImage(sprite, p.x - 4, p.y - 4, 8, 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(12,104,63,0.96)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, PI2);
        ctx.fill();
      }
    }

    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
    });
    canvas.addEventListener('pointerleave', function () { mouse.active = false; });

    var rt;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        setSize();
        if (reduce) renderStatic(); else build();
      }, 180);
    }
    window.addEventListener('resize', onResize);

    function boot() {
      setSize();
      if (reduce) { renderStatic(); return; }
      build();
      if (!running) { running = true; rafId = requestAnimationFrame(frame); }
    }

    function once() { if (started) return; started = true; boot(); }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(once);
      setTimeout(once, 1200); // fallback if the webfont hangs
    } else { once(); }

    // pause RAF when the hero scrolls away; preserve the timeline so the word stays formed
    if ('IntersectionObserver' in window && !reduce) {
      var vis = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (en.isIntersecting) {
            if (started && !running) {
              running = true;
              startTime = performance.now() - accum;
              rafId = requestAnimationFrame(frame);
            }
          } else if (running) {
            running = false;
            accum = performance.now() - startTime;
            cancelAnimationFrame(rafId);
          }
        });
      }, { threshold: 0.02 });
      vis.observe(wrap);
    }
  })();

  /* =========================================================
     2 — MARQUEE ("scroll wheel")
     ========================================================= */
  (function marquee() {
    var track = document.getElementById('marqueeTrack');
    if (!track) return;
    track.innerHTML += track.innerHTML;              // duplicate for a seamless loop
    var half = track.scrollWidth / 2;
    var x = 0, paused = false, last = null;
    var speed = 42;                                   // px per second

    var host = track.closest('.marquee');
    if (host) {
      host.addEventListener('pointerenter', function () { paused = true; });
      host.addEventListener('pointerleave', function () { paused = false; });
    }
    window.addEventListener('resize', function () { half = track.scrollWidth / 2; });

    if (reduce) return;                               // leave it static

    function step(t) {
      if (last === null) last = t;
      var dt = (t - last) / 1000; last = t;
      if (!paused) {
        x -= speed * dt;
        if (-x >= half) x += half;
        track.style.transform = 'translateX(' + x + 'px)';
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  })();

  /* =========================================================
     3 — SCROLL REVEAL + STAT COUNT-UP
     ========================================================= */
  (function reveals() {
    function finalizeStats() {
      document.querySelectorAll('.stat-num[data-count]').forEach(function (el) {
        el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
      });
    }

    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      finalizeStats();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });

    var nums = document.querySelectorAll('.stat-num[data-count]');
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; sio.unobserve(el);
        var end = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var dur = 1200, t0 = performance.now();
        (function tick(now) {
          var k = Math.min((now - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(end * eased) + suffix;
          if (k < 1) requestAnimationFrame(tick); else el.textContent = end + suffix;
        })(t0);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { sio.observe(n); });
  })();

})();
