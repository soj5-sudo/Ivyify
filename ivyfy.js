(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.15});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------- Ivy Wheel testimonial slider ---------- */
  var testimonials = [
    { name:'Priya S.', school:'Cornell University', quote:'Ivyfy helped me find the throughline I couldn\u2019t see myself \u2014 my essays finally sounded like me.' },
    { name:'Marcus T.', school:'University of Pennsylvania', quote:'They rebuilt my activities list from scratch, and it changed how every school read my application.' },
    { name:'Elena R.', school:'Yale University', quote:'The mock interviews were the single best hour of prep I did all year.' },
    { name:'Jordan K.', school:'Princeton University', quote:'I walked in with a strong transcript and no story. I walked out with both.' },
    { name:'Sofia M.', school:'Columbia University', quote:'Every draft got sharper. They never once let me settle for good enough.' },
    { name:'Daniel W.', school:'Brown University', quote:'Working with someone who got in themselves changed how I thought about my own application.' }
  ];

  var leafSVG = '<svg viewBox="0 0 32 32" class="leaf-icon"><path class="body" d="M16 2C9 8 4 14 4 20c0 6 5.5 10 12 10s12-4 12-10C28 14 23 8 16 2Z"/></svg>';

  var ring = document.getElementById('wheelRing');
  var wheel = document.getElementById('wheel');
  var quoteEl = document.getElementById('quoteText');
  var nameEl = document.getElementById('nameText');
  var schoolEl = document.getElementById('schoolText');
  var card = document.getElementById('testimonialCard');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');

  var slots = testimonials.length; // 6, 60deg apart
  var step = 360 / slots;
  var currentIndex = 0;
  var rotation = 0; // current applied rotation in degrees
  var dragging = false;
  var startAngle = 0;
  var startRotation = 0;
  var autoTimer = null;

  // Build ticks
  testimonials.forEach(function(t, i){
    var tick = document.createElement('button');
    tick.className = 'tick' + (i===0 ? ' active' : '');
    tick.style.setProperty('--i', i);
    tick.setAttribute('data-index', i);
    tick.setAttribute('aria-label', t.name + ', admitted to ' + t.school);
    tick.innerHTML = leafSVG;
    tick.addEventListener('click', function(){
      goTo(i);
      restartAuto();
    });
    ring.appendChild(tick);
  });

  function renderCard(){
    var t = testimonials[currentIndex];
    if(reduceMotion){
      quoteEl.textContent = '\u201C' + t.quote + '\u201D';
      nameEl.textContent = t.name;
      schoolEl.textContent = 'Admitted \u2014 ' + t.school;
      return;
    }
    card.classList.add('fade-out');
    setTimeout(function(){
      quoteEl.textContent = '\u201C' + t.quote + '\u201D';
      nameEl.textContent = t.name;
      schoolEl.textContent = 'Admitted \u2014 ' + t.school;
      card.classList.remove('fade-out');
    }, 220);
  }

  function renderTicks(){
    var ticks = ring.querySelectorAll('.tick');
    ticks.forEach(function(tk){
      tk.classList.toggle('active', Number(tk.getAttribute('data-index')) === currentIndex);
    });
  }

  function applyRotation(withTransition){
    ring.style.transition = withTransition ? '' : 'none';
    ring.style.transform = 'rotate(' + rotation + 'deg)';
    if(!withTransition){ ring.offsetHeight; ring.style.transition = ''; }
  }

  function goTo(index, fromDrag){
    currentIndex = ((index % slots) + slots) % slots;
    if(!fromDrag){ rotation = -currentIndex * step; applyRotation(true); }
    renderTicks();
    renderCard();
  }

  prevBtn.addEventListener('click', function(){ goTo(currentIndex - 1); restartAuto(); });
  nextBtn.addEventListener('click', function(){ goTo(currentIndex + 1); restartAuto(); });

  wheel.addEventListener('keydown', function(e){
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); goTo(currentIndex + 1); restartAuto(); }
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); goTo(currentIndex - 1); restartAuto(); }
  });

  function angleFromCenter(clientX, clientY){
    var rect = wheel.getBoundingClientRect();
    var cx = rect.left + rect.width/2;
    var cy = rect.top + rect.height/2;
    return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
  }

  wheel.addEventListener('pointerdown', function(e){
    dragging = true;
    startAngle = angleFromCenter(e.clientX, e.clientY);
    startRotation = rotation;
    wheel.setPointerCapture(e.pointerId);
    ring.style.transition = 'none';
  });

  wheel.addEventListener('pointermove', function(e){
    if(!dragging) return;
    var angle = angleFromCenter(e.clientX, e.clientY);
    var delta = angle - startAngle;
    rotation = startRotation + delta;
    ring.style.transform = 'rotate(' + rotation + 'deg)';
  });

  function endDrag(){
    if(!dragging) return;
    dragging = false;
    ring.style.transition = '';
    var snapped = Math.round(rotation / step) * step;
    rotation = snapped;
    var idx = Math.round((-snapped / step) % slots);
    idx = ((idx % slots) + slots) % slots;
    goTo(idx, true);
    ring.style.transform = 'rotate(' + rotation + 'deg)';
    restartAuto();
  }
  wheel.addEventListener('pointerup', endDrag);
  wheel.addEventListener('pointercancel', endDrag);

  // literal "scroll wheel" — mouse wheel over the dial browses admits
  var wheelLock = false;
  wheel.addEventListener('wheel', function(e){
    e.preventDefault();
    if(wheelLock) return;
    wheelLock = true;
    if(e.deltaY > 0){ goTo(currentIndex + 1); } else { goTo(currentIndex - 1); }
    restartAuto();
    setTimeout(function(){ wheelLock = false; }, 380);
  }, { passive:false });

  function restartAuto(){
    if(reduceMotion) return;
    if(autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(function(){
      if(!dragging){ goTo(currentIndex + 1); }
    }, 5200);
  }

  renderCard();
  renderTicks();
  restartAuto();

})();
