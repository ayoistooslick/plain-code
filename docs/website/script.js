function initSyntaxHighlighting() {
  var codeBlocks = document.querySelectorAll('.code-window-body code, .code-block code, .code-block--wide code');

  var PS_KEYWORDS = {
    'use':1,'server':1,'when':1,'someone':1,'asks':1,'for':1,'send':1,'log':1,
    'save':1,'as':1,'if':1,'else':1,'then':1,'end':1,'function':1,'returns':1,
    'return':1,'database':1,'query':1,'insert':1,'into':1,'values':1,'each':1,
    'in':1,'while':1,'let':1,'be':1,'not':1,'and':1,'or':1,'equals':1,'greater':1,
    'less':1,'than':1,'true':1,'false':1,'null':1,'none':1,'javascript':1,
    'import':1,'from':1,'export':1,'class':1,'new':1,'this':1,'with':1,'do':1,
    'try':1,'catch':1,'throw':1,'async':1,'await':1
  };

  var JS_KEYWORDS = {
    'const':1,'let':1,'var':1,'function':1,'return':1,'if':1,'else':1,'for':1,
    'while':1,'do':1,'switch':1,'case':1,'break':1,'continue':1,'new':1,'this':1,
    'class':1,'extends':1,'import':1,'from':1,'export':1,'default':1,'try':1,
    'catch':1,'throw':1,'async':1,'await':1,'typeof':1,'instanceof':1,'in':1,
    'of':1,'true':1,'false':1,'null':1,'undefined':1,'void':1
  };

  var JS_BUILTINS = {
    'console':1,'require':1,'module':1,'exports':1,'Math':1,'JSON':1,'Promise':1,
    'Array':1,'Object':1,'String':1,'Number':1,'Boolean':1,'Date':1,'RegExp':1,
    'Error':1,'Map':1,'Set':1
  };

  var OPERATORS = [
    '===','!==','=>','>=','<=','&&','||','++','--',
    '=','>','<','+','-','*','/','%','!'
  ];

  function esc(ch) {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    if (ch === "'") return '&#39;';
    return ch;
  }

  function escStr(s) {
    var out = '';
    for (var k = 0; k < s.length; k++) {
      out += esc(s[k]);
    }
    return out;
  }

  function span(cls, text) {
    return '<span class="token ' + cls + '">' + text + '</span>';
  }

  function tokenize(code, lang) {
    var isPS = lang === 'plainscript';
    var keywords = isPS ? PS_KEYWORDS : JS_KEYWORDS;
    var builtins = isPS ? null : JS_BUILTINS;

    var i = 0;
    var len = code.length;
    var out = '';

    while (i < len) {
      var ch = code[i];

      // --- Template literals (JS only) ---
      if (!isPS && ch === '`') {
        var tplStart = i;
        i++;
        var tplContent = '`';
        while (i < len && code[i] !== '`') {
          if (code[i] === '\\') {
            tplContent += code[i];
            i++;
            if (i < len) {
              tplContent += code[i];
              i++;
            }
          } else {
            tplContent += code[i];
            i++;
          }
        }
        if (i < len) {
          tplContent += '`';
          i++;
        }
        out += span('string', escStr(tplContent));
        continue;
      }

      // --- Strings ---
      if (ch === '"' || ch === "'") {
        var q = ch;
        var strStart = i;
        i++;
        var strContent = q;
        while (i < len && code[i] !== q) {
          if (code[i] === '\\' && i + 1 < len) {
            strContent += code[i];
            i++;
            strContent += code[i];
            i++;
          } else if (code[i] === '\n') {
            break;
          } else {
            strContent += code[i];
            i++;
          }
        }
        if (i < len && code[i] === q) {
          strContent += code[i];
          i++;
        }
        out += span('string', escStr(strContent));
        continue;
      }

      // --- Single-line comments ---
      if (ch === '/' && i + 1 < len && code[i + 1] === '/') {
        var commentEnd = i;
        while (commentEnd < len && code[commentEnd] !== '\n') {
          commentEnd++;
        }
        var comment = code.substring(i, commentEnd);
        out += span('comment', escStr(comment));
        i = commentEnd;
        continue;
      }

      // --- Multi-line comments ---
      if (!isPS && ch === '/' && i + 1 < len && code[i + 1] === '*') {
        var mEnd = i + 2;
        while (mEnd < len) {
          if (mEnd < len - 1 && code[mEnd] === '*' && code[mEnd + 1] === '/') {
            mEnd += 2;
            break;
          }
          mEnd++;
        }
        var mComment = code.substring(i, mEnd);
        out += span('comment', escStr(mComment));
        i = mEnd;
        continue;
      }

      // --- Hex numbers (JS only) ---
      if (!isPS && ch === '0' && i + 1 < len && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
        var hexStart = i;
        i += 2;
        while (i < len && /[0-9a-fA-F]/.test(code[i])) {
          i++;
        }
        var hex = code.substring(hexStart, i);
        out += span('number', escStr(hex));
        continue;
      }

      // --- Numbers ---
      if (/[0-9]/.test(ch)) {
        var numStart = i;
        while (i < len && /[0-9]/.test(code[i])) {
          i++;
        }
        if (i < len && code[i] === '.' && i + 1 < len && /[0-9]/.test(code[i + 1])) {
          i++;
          while (i < len && /[0-9]/.test(code[i])) {
            i++;
          }
        }
        var num = code.substring(numStart, i);
        out += span('number', escStr(num));
        continue;
      }

      // --- Words (identifiers, keywords, builtins) ---
      if (/[a-zA-Z_$]/.test(ch)) {
        var wordStart = i;
        while (i < len && /[a-zA-Z0-9_$]/.test(code[i])) {
          i++;
        }
        var word = code.substring(wordStart, i);

        // Look ahead for function call
        var j = i;
        while (j < len && (code[j] === ' ' || code[j] === '\t')) {
          j++;
        }
        var isFuncCall = j < len && code[j] === '(';

        // Check for property access (preceded by a dot)
        var lookBehind = wordStart - 1;
        while (lookBehind >= 0 && (code[lookBehind] === ' ' || code[lookBehind] === '\t')) {
          lookBehind--;
        }
        var isProperty = lookBehind >= 0 && code[lookBehind] === '.';

        if (keywords[word]) {
          out += span('keyword', escStr(word));
        } else if (builtins && builtins[word]) {
          out += span('builtin', escStr(word));
        } else if (isProperty) {
          out += span('property', escStr(word));
        } else if (isFuncCall) {
          out += span('function', escStr(word));
        } else {
          out += span('default', escStr(word));
        }
        continue;
      }

      // --- Operators ---
      var matchedOp = '';
      for (var oi = 0; oi < OPERATORS.length; oi++) {
        var op = OPERATORS[oi];
        if (code.indexOf(op, i) === i && op.length > matchedOp.length) {
          matchedOp = op;
        }
      }
      if (matchedOp) {
        out += span('operator', escStr(matchedOp));
        i += matchedOp.length;
        continue;
      }

      // --- Punctuation ---
      if ('(){}[];,'.indexOf(ch) !== -1) {
        out += span('punctuation', esc(ch));
        i++;
        continue;
      }

      // --- Dot (JS property access) ---
      if (!isPS && ch === '.') {
        out += span('punctuation', '.');
        i++;
        continue;
      }

      // --- Anything else (whitespace, newlines, unknown) ---
      var wsStart = i;
      while (i < len) {
        var wc = code[i];
        if (/[a-zA-Z0-9_$'"`]/.test(wc)) break;
        if (wc === '/' && i + 1 < len && (code[i + 1] === '/' || code[i + 1] === '*')) break;
        if (wc === '\\' && !isPS) break;
        if ('(){}[];,'.indexOf(wc) !== -1) break;
        if ('=<>+-*/%!&|^~?'.indexOf(wc) !== -1) break;
        i++;
      }
      if (i > wsStart) {
        out += escStr(code.substring(wsStart, i));
      }
    }

    return out;
  }

  for (var i = 0; i < codeBlocks.length; i++) {
    var codeEl = codeBlocks[i];
    var text = codeEl.textContent;
    if (!text.trim()) continue;

    var win = codeEl.closest('.code-window');
    var lang = 'plainscript';
    if (win) {
      var title = win.querySelector('.code-window-title');
      if (title) {
        var titleText = title.textContent.toLowerCase();
        if (titleText.indexOf('plain') === -1) {
          lang = 'javascript';
        }
      }
    }

    if (!win) {
      lang = 'plainscript';
    }

    codeEl.innerHTML = tokenize(text, lang);
  }
}

function initThreeBackground() {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  camera.position.z = 30;

  var particleCount = 1500;
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(particleCount * 3);
  var sizes = new Float32Array(particleCount);

  for (var i = 0; i < particleCount; i++) {
    var i3 = i * 3;
    var radius = 50 + Math.random() * 50;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    sizes[i] = 0.5 + Math.random() * 1.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  var material = new THREE.PointsMaterial({
    color: 0x10b981,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  var particles = new THREE.Points(geometry, material);
  scene.add(particles);

  var mouse = { x: 0, y: 0 };
  var targetMouse = { x: 0, y: 0 };

  document.addEventListener('mousemove', function(e) {
    targetMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);

    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.0001;

    mouse.x += (targetMouse.x - mouse.x) * 0.02;
    mouse.y += (targetMouse.y - mouse.y) * 0.02;

    particles.rotation.y += mouse.x * 0.0005;
    particles.rotation.x += mouse.y * 0.0005;

    renderer.render(scene, camera);
  }

  animate();
}

function initMobileMenu() {
  var hamburger = document.getElementById('nav-hamburger');
  var menu = document.getElementById('mobile-menu');
  if (!hamburger || !menu) return;

  function openMenu() {
    hamburger.classList.add('open');
    menu.classList.add('open');
    document.body.classList.add('menu-open');
    hamburger.querySelector('i').classList.remove('fa-bars');
    hamburger.querySelector('i').classList.add('fa-xmark');
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    menu.classList.remove('open');
    document.body.classList.remove('menu-open');
    hamburger.querySelector('i').classList.remove('fa-xmark');
    hamburger.querySelector('i').classList.add('fa-bars');
  }

  function toggleMenu() {
    if (menu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  hamburger.addEventListener('click', toggleMenu);

  var mobileLinks = menu.querySelectorAll('a');
  for (var i = 0; i < mobileLinks.length; i++) {
    mobileLinks[i].addEventListener('click', closeMenu);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      closeMenu();
    }
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 800 && menu.classList.contains('open')) {
      closeMenu();
    }
  });
}

function initCopyButtons() {
  var buttons = document.querySelectorAll('.code-copy, .copy-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function() {
      var btn = this;
      var target = btn.closest('.code-window') || btn.closest('.code-block');
      if (!target) return;

      var codeEl = target.querySelector('pre code') || target.querySelector('code') || target.querySelector('pre');
      if (!codeEl) return;

      var text = codeEl.textContent;

      navigator.clipboard.writeText(text).then(function() {
        var originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied';
        btn.classList.add('copied');

        setTimeout(function() {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(function() {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        var originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied';
        btn.classList.add('copied');

        setTimeout(function() {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  }
}

function initFAQ() {
  var items = document.querySelectorAll('.faq-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('toggle', function() {
      if (this.open) {
        for (var j = 0; j < items.length; j++) {
          if (items[j] !== this && items[j].open) {
            items[j].open = false;
          }
        }
      }
    });
  }
}

function initScrollSpy() {
  var sections = document.querySelectorAll('section[id]');
  if (sections.length === 0) return;

  var navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

  var observer = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        var id = entries[i].target.getAttribute('id');

        for (var j = 0; j < navLinks.length; j++) {
          var link = navLinks[j];
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
            link.style.color = '#10b981';
          } else {
            link.classList.remove('active');
            link.style.color = '';
          }
        }
      }
    }
  }, {
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  });

  for (var i = 0; i < sections.length; i++) {
    observer.observe(sections[i]);
  }
}

function initGSAPAnimations() {
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  var heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });

  heroTimeline
    .from('.hero-badge', { opacity: 0, y: 30, duration: 0.6 })
    .from('.hero-title', { opacity: 0, y: 40, duration: 0.8 }, '-=0.4')
    .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.6 }, '-=0.4')
    .from('.hero-actions', { opacity: 0, y: 30, duration: 0.6 }, '-=0.3')
    .from('.hero-code', { opacity: 0, y: 40, scale: 0.95, duration: 0.8 }, '-=0.3');

  gsap.utils.toArray('.section-tag, .section-title, .section-lead').forEach(function(el, i) {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        end: 'top 60%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 40,
      duration: 0.7,
      ease: 'power3.out'
    });
  });

  gsap.utils.toArray('.feature-card').forEach(function(card, i) {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 50,
      duration: 0.7,
      delay: i * 0.1,
      ease: 'power3.out'
    });
  });

  gsap.utils.toArray('.stat-item').forEach(function(item, i) {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 30,
      duration: 0.6,
      delay: i * 0.15,
      ease: 'power3.out'
    });
  });

  gsap.utils.toArray('.code-window').forEach(function(win) {
    gsap.from(win, {
      scrollTrigger: {
        trigger: win,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 40,
      scale: 0.95,
      duration: 0.8,
      ease: 'power3.out'
    });
  });

  gsap.utils.toArray('.faq-item').forEach(function(item, i) {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 30,
      duration: 0.6,
      delay: i * 0.1,
      ease: 'power3.out'
    });
  });

  gsap.utils.toArray('.cli-item').forEach(function(item, i) {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      x: -30,
      duration: 0.6,
      delay: i * 0.12,
      ease: 'power3.out'
    });
  });
}

function initScrollProgress() {
  var bar = document.getElementById('scroll-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
  }

  bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0;z-index:9999;background:linear-gradient(90deg,#10b981,#059669);transition:width 0.1s linear;pointer-events:none;';

  window.addEventListener('scroll', function() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  });
}

function initBackToTop() {
  var btn = document.getElementById('to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'to-top';
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(btn);
  }

  btn.style.cssText = 'position:fixed;bottom:30px;right:30px;width:48px;height:48px;border-radius:50%;background:#10b981;color:#fff;border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transform:translateY(20px);transition:all 0.3s ease;z-index:9998;box-shadow:0 4px 15px rgba(16,185,129,0.4);';

  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 400) {
      btn.style.opacity = '1';
      btn.style.visibility = 'visible';
      btn.style.transform = 'translateY(0)';
    } else {
      btn.style.opacity = '0';
      btn.style.visibility = 'hidden';
      btn.style.transform = 'translateY(20px)';
    }
  });

  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function initSmoothScroll() {
  var links = document.querySelectorAll('a[href^="#"]');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function(e) {
      var href = this.getAttribute('href');
      if (href === '#' || href === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  initSyntaxHighlighting();
  initThreeBackground();
  initMobileMenu();
  initCopyButtons();
  initFAQ();
  initScrollSpy();
  initSmoothScroll();
  initScrollProgress();
  initBackToTop();
  initGSAPAnimations();
});
