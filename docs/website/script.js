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

var LIBRARY = [
  {cat:"variables",name:"Declare Variable",desc:"Store a value in a named variable",ps:'remember name as "Ayokunle"\nremember age as 25\nremember pi as 3.14',js:'let name = "Ayokunle";\nlet age = 25;\nlet pi = 3.14;'},
  {cat:"variables",name:"Reassign Variable",desc:"Change the value of an existing variable",ps:'remember count as 0\ncount becomes 10',js:'let count = 0;\ncount = 10;'},
  {cat:"variables",name:"Type Coercion",desc:"Convert values between types",ps:'remember num as number("42")\nremember str as text(100)',js:'let num = Number("42");\nlet str = String(100);'},
  {cat:"strings",name:"String Literals",desc:"Create string values with double or single quotes",ps:'remember greeting as "Hello, World!"\nremember name as \'Ayokunle\'',js:'let greeting = "Hello, World!";\nlet name = \'Ayokunle\';'},
  {cat:"strings",name:"String Interpolation",desc:"Embed variables inside template literals",ps:'remember name as "Ayokunle"\nshow `Hello ${name}!`',js:'let name = "Ayokunle";\nconsole.log(`Hello ${name}!`);'},
  {cat:"strings",name:"Uppercase / Lowercase",desc:"Change the case of a string",ps:'show uppercase("hello")\nshow lowercase("WORLD")',js:'console.log("hello".toUpperCase());\nconsole.log("WORLD".toLowerCase());'},
  {cat:"strings",name:"String Length",desc:"Get the number of characters in a string",ps:'remember len as length("abc")\nshow len',js:'let len = "abc".length;\nconsole.log(len);'},
  {cat:"strings",name:"Trim Whitespace",desc:"Remove leading and trailing whitespace",ps:'remember clean as trim("  hello  ")',js:'let clean = "  hello  ".trim();'},
  {cat:"strings",name:"Replace Text",desc:"Replace occurrences in a string",ps:'remember result as replace("hello world", "world", "JS")',js:'let result = "hello world".split("world").join("JS");'},
  {cat:"strings",name:"Split String",desc:"Split a string into an array by delimiter",ps:'remember parts as split("a,b,c", ",")',js:'let parts = "a,b,c".split(",");'},
  {cat:"strings",name:"Join Array",desc:"Join array elements into a string",ps:'remember text as join(["a","b","c"], ",")',js:'let text = ["a","b","c"].join(",");'},
  {cat:"numbers",name:"Arithmetic",desc:"Basic math operations",ps:'remember a as 10 + 5\nremember b as 20 - 3\nremember c as 4 * 7\nremember d as 15 / 3\nremember e as 17 % 5',js:'let a = 10 + 5;\nlet b = 20 - 3;\nlet c = 4 * 7;\nlet d = 15 / 3;\nlet e = 17 % 5;'},
  {cat:"numbers",name:"Rounding",desc:"Round, floor, or ceiling a number",ps:'show round(3.7)\nshow floor(3.7)\nshow ceiling(3.2)',js:'console.log(Math.round(3.7));\nconsole.log(Math.floor(3.7));\nconsole.log(Math.ceil(3.2));'},
  {cat:"numbers",name:"Random Number",desc:"Generate a random number between 0 and 1",ps:'remember roll as random()',js:'let roll = Math.random();'},
  {cat:"numbers",name:"Array Math",desc:"Sum, min, and max of arrays",ps:'remember nums as [1, 2, 3, 4, 5]\nshow sum(nums)\nshow smallest(nums)\nshow largest(nums)',js:'let nums = [1, 2, 3, 4, 5];\nconsole.log(nums.reduce((a, b) => a + b, 0));\nconsole.log(Math.min(...nums));\nconsole.log(Math.max(...nums));'},
  {cat:"booleans",name:"Comparisons",desc:"Compare values with natural English operators",ps:'if 5 is 5\n  show "equal"\ndone\n\nif 5 is not 3\n  show "not equal"\ndone\n\nif 10 is greater than 5\n  show "bigger"\ndone\n\nif 3 is less than 7\n  show "smaller"\ndone',js:'if (5 === 5) {\n  console.log("equal");\n}\n\nif (5 !== 3) {\n  console.log("not equal");\n}\n\nif (10 > 5) {\n  console.log("bigger");\n}\n\nif (3 < 7) {\n  console.log("smaller");\n}'},
  {cat:"booleans",name:"Range Checks",desc:"Check if a value is between, at least, or at most",ps:'remember age as 25\nif age between 18 and 65\n  show "working age"\ndone\n\nif age is at least 18\n  show "adult"\ndone',js:'let age = 25;\nif (age >= 18 && age <= 65) {\n  console.log("working age");\n}\n\nif (age >= 18) {\n  console.log("adult");\n}'},
  {cat:"booleans",name:"String Checks",desc:"Check if a string contains, starts with, or ends with",ps:'remember msg as "Hello World"\nif msg contains "World"\n  show "found"\ndone\n\nif msg starts with "Hello"\n  show "greeting"\ndone\n\nif msg ends with "World"\n  show "ending"\ndone',js:'let msg = "Hello World";\nif (msg.includes("World")) {\n  console.log("found");\n}\n\nif (msg.startsWith("Hello")) {\n  console.log("greeting");\n}\n\nif (msg.endsWith("World")) {\n  console.log("ending");\n}'},
  {cat:"booleans",name:"Empty Checks",desc:"Check if a value is empty or not empty",ps:'remember items as []\nif items is empty\n  show "no items"\ndone\n\nif items is not empty\n  show "has items"\ndone',js:'let items = [];\nif (items.length === 0) {\n  console.log("no items");\n}\n\nif (items.length > 0) {\n  console.log("has items");\n}'},
  {cat:"booleans",name:"Logical Operators",desc:"Combine conditions with and, or, not",ps:'remember age as 25\nremember name as "Ayo"\n\nif age is 25 and name is "Ayo"\n  show "match"\ndone\n\nif age is 10 or age is 25\n  show "found"\ndone\n\nif not (age is empty)\n  show "has value"\ndone',js:'let age = 25;\nlet name = "Ayo";\n\nif (age === 25 && name === "Ayo") {\n  console.log("match");\n}\n\nif (age === 10 || age === 25) {\n  console.log("found");\n}\n\nif (!(age.length === 0)) {\n  console.log("has value");\n}'},
  {cat:"conditionals",name:"If / Otherwise",desc:"Branch logic based on conditions",ps:'remember score as 85\n\nif score is greater than 80\n  show "grade A"\notherwise if score is greater than 60\n  show "grade B"\notherwise\n  show "grade C"\ndone',js:'let score = 85;\n\nif (score > 80) {\n  console.log("grade A");\n} else if (score > 60) {\n  console.log("grade B");\n} else {\n  console.log("grade C");\n}'},
  {cat:"loops",name:"For Each Loop",desc:"Iterate over every item in a collection",ps:'remember fruits as ["apple", "banana", "cherry"]\n\nfor each fruit in fruits\n  show fruit\ndone',js:'let fruits = ["apple", "banana", "cherry"];\n\nfor (const fruit of fruits) {\n  console.log(fruit);\n}'},
  {cat:"loops",name:"While Loop",desc:"Repeat while a condition is true",ps:'remember count as 0\n\nwhile count is less than 5\n  show count\n  count becomes count + 1\ndone',js:'let count = 0;\n\nwhile (count < 5) {\n  console.log(count);\n  count = count + 1;\n}'},
  {cat:"functions",name:"Define Function",desc:"Create a reusable block of code",ps:'make greet(name)\n  show `Hello ${name}!`\ndone\n\ngreet("Ayokunle")',js:'function greet(name) {\n  console.log(`Hello ${name}!`);\n}\n\ngreet("Ayokunle");'},
  {cat:"functions",name:"Return Value",desc:"Return a value from a function",ps:'make add(a, b)\n  give a + b\ndone\n\nremember result as add(5, 7)\nshow result',js:'function add(a, b) {\n  return a + b;\n}\n\nlet result = add(5, 7);\nconsole.log(result);'},
  {cat:"arrays",name:"Array Literal",desc:"Create an array of values",ps:'remember colors as ["red", "green", "blue"]\nremember nums as [1, 2, 3, 4, 5]',js:'let colors = ["red", "green", "blue"];\nlet nums = [1, 2, 3, 4, 5];'},
  {cat:"arrays",name:"Access Elements",desc:"Get items by index (one-based English syntax)",ps:'remember items as ["a", "b", "c"]\nshow first item from items\nshow last item from items\nshow items[0]',js:'let items = ["a", "b", "c"];\nconsole.log(items[0]);\nconsole.log(items[items.length - 1]);\nconsole.log(items[0]);'},
  {cat:"arrays",name:"Add / Remove Items",desc:"Push to or splice from an array",ps:'remember list as [1, 2, 3]\nadd(4 to list)\nremove(2 from list)',js:'let list = [1, 2, 3];\nlist.push(4);\nlist.splice(list.indexOf(2), 1);'},
  {cat:"arrays",name:"Sort / Reverse / Unique",desc:"Transform arrays with built-in operations",ps:'remember nums as [3, 1, 4, 1, 5]\nshow sort(nums)\nshow reverse(nums)\nshow unique(nums)',js:'let nums = [3, 1, 4, 1, 5];\nconsole.log([...nums].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));\nconsole.log([...nums].reverse());\nconsole.log([...new Set(nums)]);'},
  {cat:"objects",name:"Object Literal",desc:"Create an object with key-value pairs",ps:'remember user as\n  name is "Ayokunle"\n  age is 25\n  role is "Developer"\ndone',js:'let user = {\n  "name": "Ayokunle",\n  "age": 25,\n  "role": "Developer"\n};'},
  {cat:"objects",name:"Access Properties",desc:"Read and write object properties",ps:'remember user as\n  name is "Ayokunle"\n  age is 25\ndone\n\nshow user.name\nshow name of user\nuser.age becomes 26',js:'let user = {\n  "name": "Ayokunle",\n  "age": 25\n};\n\nconsole.log(user.name);\nconsole.log(user.name);\nuser.age = 26;'},
  {cat:"objects",name:"Object Utilities",desc:"Get keys, values, check properties, merge objects",ps:'remember user as\n  name is "Ayo"\n  age is 25\ndone\n\nshow keys(user)\nshow values(user)\nshow hasKey(user, "name")\n\nremember merged as merge(user, { city: "Lagos" })',js:'let user = {\n  "name": "Ayo",\n  "age": 25\n};\n\nconsole.log(Object.keys(user));\nconsole.log(Object.values(user));\nconsole.log(Object.prototype.hasOwnProperty.call(user, "name"));\n\nlet merged = { ...user, ...{ "city": "Lagos" } };'},
  {cat:"imports",name:"Use npm Package",desc:"Import any npm package with the use keyword",ps:'use express\nuse axios\nuse dotenv\nuse chalk',js:'const express = require(\'express\');\nconst axios = require(\'axios\');\nrequire(\'dotenv\').config();\nconst chalk = require(\'chalk\');'},
  {cat:"imports",name:"Use with Alias",desc:"Import a package under a different name",ps:'use node-fetch as fetch',js:'const fetch = require(\'node-fetch\');'},
  {cat:"imports",name:"Import .ps File",desc:"Import another PlainScript file",ps:'import "./utils.ps"\nimport "./database.ps"',js:'// Bundled in dependency order at compile time'},
  {cat:"server",name:"Web App",desc:"Create an Express server with one line",ps:'web app',js:'const express = require(\'express\');\nconst app = express();\napp.use(express.json());'},
  {cat:"server",name:"Define Route",desc:"Handle HTTP requests with route blocks",ps:'web app\n\nroute "/"\n  reply "Hello, World!"\ndone\n\nroute post "/users"\n  reply json\n    name is "Ayokunle"\n  done\ndone',js:'const express = require(\'express\');\nconst app = express();\napp.use(express.json());\n\napp.get("/", (req, res) => {\n  res.send("Hello, World!");\n});\n\napp.post("/users", (req, res) => {\n  res.json({ "name": "Ayokunle" });\n});'},
  {cat:"server",name:"Route Groups",desc:"Prefix multiple routes with a common path",ps:'group "/api"\n  route "/users"\n    reply "users list"\n  done\n\n  route "/posts"\n    reply "posts list"\n  done\ndone',js:'app.get("/api/users", (req, res) => {\n  res.send("users list");\n});\n\napp.get("/api/posts", (req, res) => {\n  res.send("posts list");\n});'},
  {cat:"server",name:"Request Data",desc:"Access params, query, headers, and body",ps:'route "/users/:id"\n  remember id as param("id")\n  remember page as query("page")\n  remember token as header("x-token")\n  remember data as body of request\n  show id\ndone',js:'app.get("/users/:id", (req, res) => {\n  let id = req.params["id"];\n  let page = req.query["page"];\n  let token = req.headers["x-token"];\n  let data = req.body;\n  console.log(id);\n});'},
  {cat:"server",name:"Static Files & CORS",desc:"Serve static files and enable CORS",ps:'web app\nserve folder "public"\nallow cors\nstart 3000',js:'const express = require(\'express\');\nconst app = express();\napp.use(express.json());\napp.use(express.static("public"));\n// CORS middleware added\napp.listen(3000);'},
  {cat:"server",name:"Status Codes",desc:"Set HTTP response status codes",ps:'route "/not-found"\n  status 404\n  reply "Not found"\ndone',js:'app.get("/not-found", (req, res) => {\n  res.status(404);\n  res.send("Not found");\n});'},
  {cat:"database",name:"Connect SQLite",desc:"Open a SQLite database connection",ps:'database "app.db"',js:'const db = await __dbOpen("app.db", null);'},
  {cat:"database",name:"Query Data",desc:"Run a SELECT query and get results",ps:'remember rows as query\n  SELECT * FROM users WHERE active = 1\ndone\n\nfor each row in rows\n  show row.name\ndone',js:'let rows = db.prepare(\n  "SELECT * FROM users WHERE active = 1"\n).all();\n\nfor (const row of rows) {\n  console.log(row.name);\n}'},
  {cat:"database",name:"Insert Data",desc:"Insert new rows into a table",ps:'insert\n  INSERT INTO users (name, email)\n  VALUES ("Ayokunle", "ayo@test.com")\ndone',js:'db.prepare(\n  "INSERT INTO users (name, email) VALUES (?, ?)"\n).run("Ayokunle", "ayo@test.com");'},
  {cat:"database",name:"Update Data",desc:"Update existing rows",ps:'update\n  UPDATE users SET active = 0 WHERE id = 1\ndone',js:'db.prepare(\n  "UPDATE users SET active = 0 WHERE id = 1"\n).run();'},
  {cat:"database",name:"Create Tables",desc:"Execute DDL statements",ps:'execute\n  CREATE TABLE IF NOT EXISTS users (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL,\n    email TEXT UNIQUE\n  )\ndone',js:'db.exec(\n  "CREATE TABLE IF NOT EXISTS users (\\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\\n    name TEXT NOT NULL,\\n    email TEXT UNIQUE\\n  )"\n);'},
  {cat:"database",name:"Transactions",desc:"Wrap multiple operations in a transaction",ps:'transaction\n  insert\n    INSERT INTO accounts (name, balance) VALUES ("Ayo", 1000)\n  done\n  insert\n    INSERT INTO accounts (name, balance) VALUES ("Dayo", 500)\n  done\ndone',js:'db.transaction(() => {\n  db.prepare("INSERT INTO accounts (name, balance) VALUES (?, ?)").run("Ayo", 1000);\n  db.prepare("INSERT INTO accounts (name, balance) VALUES (?, ?)").run("Dayo", 500);\n})();'},
  {cat:"database",name:"PostgreSQL",desc:"Connect to a PostgreSQL database",ps:'postgres env("DATABASE_URL")\n\nremember rows as query\n  SELECT * FROM users LIMIT 10\ndone',js:'const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });\nlet result = await pool.query("SELECT * FROM users LIMIT 10");\nlet rows = result.rows;'},
  {cat:"cache",name:"Redis Cache",desc:"Connect to Redis for key-value caching",ps:'cache "redis://localhost:6379"',js:'// Creates Redis client and connects'},
  {cat:"cache",name:"Get / Set Cache",desc:"Read and write cached values",ps:'cacheSet("user:1", "Ayokunle")\ncacheSet("token:abc", data, 3600)\n\nremember name as cacheGet("user:1")\nshow name',js:'await __cacheClient().set("user:1", "Ayokunle");\nawait __cacheClient().set("token:abc", data, { EX: 3600 });\n\nlet name = await __cacheClient().get("user:1");\nconsole.log(name);'},
  {cat:"cache",name:"Delete Cache",desc:"Remove a cached key",ps:'cacheDelete("user:1")',js:'await __cacheClient().del("user:1");'},
  {cat:"http",name:"GET Request",desc:"Fetch data from an API",ps:'remember response as get "https://api.example.com/users"\nshow data of response',js:'let response = await __httpRequest(\'GET\', "https://api.example.com/users", {});\nconsole.log(response.data);'},
  {cat:"http",name:"POST Request",desc:"Send data to an API",ps:'remember body as\n  name is "Ayokunle"\n  email is "ayo@test.com"\ndone\n\nremember result as post "https://api.example.com/users" with body',js:'let body = {\n  "name": "Ayokunle",\n  "email": "ayo@test.com"\n};\n\nlet result = await __httpRequest(\'POST\', "https://api.example.com/users", { body });'},
  {cat:"http",name:"PUT / PATCH / DELETE",desc:"Update or remove resources via API",ps:'put "https://api.example.com/users/1" with body\npatch "https://api.example.com/users/1" with body\ndelete "https://api.example.com/users/1"',js:'await __httpRequest(\'PUT\', url, { body });\nawait __httpRequest(\'PATCH\', url, { body });\nawait __httpRequest(\'DELETE\', "https://api.example.com/users/1", {});'},
  {cat:"filesystem",name:"Read File",desc:"Read a file from disk",ps:'remember content as readFile("data.txt")\nshow content',js:'let content = fs.readFileSync("data.txt", \'utf8\');\nconsole.log(content);'},
  {cat:"filesystem",name:"Write File",desc:"Write content to a file",ps:'writeFile("output.txt", "Hello World")\nwrite("data" to "output.txt")',js:'fs.writeFileSync("output.txt", "Hello World", \'utf8\');\nfs.writeFileSync("data", "output.txt", \'utf8\');'},
  {cat:"filesystem",name:"File Operations",desc:"Check, copy, move, and delete files",ps:'show fileExists("data.txt")\ncopyFile("data.txt", "backup.txt")\nmoveFile("old.txt", "new.txt")\ndeleteFile("temp.txt")\nappendFile("log.txt", "new line\\n")',js:'console.log(fs.existsSync("data.txt"));\nfs.copyFileSync("data.txt", "backup.txt");\nfs.renameSync("old.txt", "new.txt");\nfs.unlinkSync("temp.txt");\nfs.appendFileSync("log.txt", "new line\\n", \'utf8\');'},
  {cat:"filesystem",name:"Folder Operations",desc:"Create, list, and delete folders",ps:'makeFolder("src/components")\nshow listFolder("src")\ndeleteFolder("temp")',js:'fs.mkdirSync("src/components", { recursive: true });\nconsole.log(fs.readdirSync("src"));\nfs.rmSync("temp", { recursive: true, force: true });'},
  {cat:"logging",name:"Show / Print",desc:"Output values to the console",ps:'show "Hello, World!"\nshow 42\nshow true\nprint("Debug info")',js:'console.log("Hello, World!");\nconsole.log(42);\nconsole.log(true);\nconsole.log("Debug info");'},
  {cat:"datetime",name:"Timestamps",desc:"Get current time and create ISO dates",ps:'remember now as time()\nremember iso as date()\nshow now\nshow iso',js:'let now = Date.now();\nlet iso = new Date().toISOString();\nconsole.log(now);\nconsole.log(iso);'},
  {cat:"datetime",name:"Sleep",desc:"Pause execution for a duration",ps:'show "waiting..."\nsleep(2000)\nshow "done"',js:'console.log("waiting...");\nAtomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);\nconsole.log("done");'},
  {cat:"datetime",name:"UUID & Environment",desc:"Generate UUIDs and read env vars",ps:'remember id as uuid()\nremember key as env("API_KEY")\nshow id\nshow key',js:'let id = crypto.randomUUID();\nlet key = process.env["API_KEY"];\nconsole.log(id);\nconsole.log(key);'},
  {cat:"errors",name:"Try / Recover",desc:"Handle errors gracefully",ps:'try\n  remember data as readFile("missing.txt")\nrecover as err\n  show `Error: ${err}`\ndone',js:'try {\n  let data = fs.readFileSync("missing.txt", \'utf8\');\n} catch (err) {\n  console.log(`Error: ${err}`);\n}'},
  {cat:"errors",name:"Retry",desc:"Automatically retry a failing operation",ps:'retry 3 times\n  remember result as get "https://api.flaky.com/data"\ndone\n\nretry 5 times every 2 seconds\n  remember result as get "https://api.flaky.com/data"\ndone',js:'for (let __attempt = 0; __attempt < 3; __attempt++) {\n  try {\n    let result = await __httpRequest(\'GET\', "https://api.flaky.com/data", {});\n    break;\n  } catch (__e) {}\n}'},
  {cat:"async",name:"Wait For (Await)",desc:"Wait for an asynchronous operation to complete",ps:'remember data as wait for fetch("https://api.example.com/data")\nshow data',js:'let data = await fetch("https://api.example.com/data");\nconsole.log(data);'},
  {cat:"async",name:"Run Background",desc:"Fire and forget an async operation",ps:'run background resizeImage("photo.png")\nrun background sendEmail(to, subject, body)',js:'setImmediate(() => { Promise.resolve(resizeImage("photo.png")).catch(() => {}); });\nsetImmediate(() => { Promise.resolve(sendEmail(to, subject, body)).catch(() => {}); });'},
  {cat:"auth",name:"Password Hashing",desc:"Hash and verify passwords securely",ps:'remember hash as hashPassword("my-secret-pw")\nshow checkPassword("my-secret-pw", hash)',js:'let hash = hashPassword("my-secret-pw");\nconsole.log(checkPassword("my-secret-pw", hash));'},
  {cat:"auth",name:"JWT Tokens",desc:"Create and verify JSON Web Tokens",ps:'remember token as createToken({ id: 1 }, "secret-key")\nshow readToken(token, "secret-key")',js:'let token = createToken({ "id": 1 }, "secret-key");\nconsole.log(readToken(token, "secret-key"));'},
  {cat:"auth",name:"Sessions",desc:"Enable server-side sessions",ps:'web app\nenable sessions "my-secret-key"\n\nroute "/login"\n  user of session of request becomes "Ayokunle"\n  reply "Logged in"\ndone',js:'app.use(__enableSessions("my-secret-key"));\n\napp.get("/login", (req, res) => {\n  __sessionOf(req).user = "Ayokunle";\n  res.send("Logged in");\n});'},
  {cat:"auth",name:"Cookies",desc:"Set, read, and clear cookies",ps:'route "/pref"\n  set cookie "theme" to "dark"\n  set cookie "lang" to "en" expires in 7 days\n  remember theme as cookie("theme")\n  clear cookie "theme"\ndone',js:'app.get("/pref", (req, res) => {\n  res.cookie("theme", "dark", { httpOnly: true, path: \'/\' });\n  res.cookie("lang", "en", { httpOnly: true, path: \'/\', maxAge: 604800000 });\n  let theme = __cookieValue(req, "theme");\n  res.clearCookie("theme", { path: \'/\' });\n});'},
  {cat:"auth",name:"Rate Limiting",desc:"Protect endpoints from abuse",ps:'web app\nlimit requests to 100 per minute',js:'app.use(__rateLimit({ "max": 100, "windowMs": 60000 }));'},
  {cat:"auth",name:"API Key Protection",desc:"Require an API key for access",ps:'web app\nrequire api key from env("API_KEY")',js:'// Middleware checks x-api-key header against process.env["API_KEY"]'},
  {cat:"telegram",name:"Telegram Bot",desc:"Create a Telegram bot with command handlers",ps:'bot env("BOT_TOKEN")\n\nwhen someone sends "/start"\n  reply "Welcome to PlainScript!"\ndone\n\nwhen someone sends matching "/echo (.+)"\n  reply match\ndone\n\nstart telegram bot',js:'BOT = await Telegram.createTelegramBot(process.env["BOT_TOKEN"]);\n\nBOT.onCommand("/start", async (ctx) => {\n  await Telegram.sendMessage(ctx.chatId, "Welcome to PlainScript!");\n});\n\nBOT.onPattern(/echo (.+)/i, async (ctx) => {\n  await Telegram.sendMessage(ctx.chatId, ctx.match[1]);\n});\n\nawait BOT.start();'},
  {cat:"whatsapp",name:"WhatsApp Bot",desc:"Create a WhatsApp bot with message handlers",ps:'whatsapp bot\n  on message\n    reply "You said: ${message.text}"\n  done\ndone',js:'await __whatsappStart({ "folder": "plainscript-whatsapp-auth", "login": "qr" });\n__whatsappOnMessage(async (__waCtx) => {\n  await __whatsappReply(__waCtx.chat, `You said: ${__waCtx.message.text}`);\n});'},
  {cat:"websocket",name:"WebSocket Server",desc:"Create a real-time WebSocket server",ps:'websocket server on 8080\n  when socket connects\n    send socket "Welcome!"\n  done\n\n  when socket sends message\n    broadcast message\n  done\n\ndone',js:'__wsServerCreate(8080, {\n  connect: async (socket) => {\n    __wsSend(socket, "Welcome!");\n  },\n  message: async (socket, message) => {\n    __wsBroadcast(__wsServer, message);\n  }\n});'},
  {cat:"email",name:"Send Email",desc:"Configure SMTP and send emails",ps:'mail transport\n  host is "smtp.gmail.com"\n  port is 587\n  user is env("EMAIL_USER")\n  pass is env("EMAIL_PASS")\ndone\n\nsend mail\n  from is "me@example.com"\n  to is "friend@example.com"\n  subject is "Hello"\n  text is "PlainScript sends email!"\ndone',js:'__mailCreate({ "host": "smtp.gmail.com", "port": 587, "auth": { "user": process.env["EMAIL_USER"], "pass": process.env["EMAIL_PASS"] } });\n\nawait __mailSend({ "from": "me@example.com", "to": "friend@example.com", "subject": "Hello", "text": "PlainScript sends email!" });'},
  {cat:"upload",name:"File Uploads",desc:"Accept and process file uploads",ps:'web app\naccept uploads limit "10 MB"\nallow ["image/png", "image/jpeg"]\nfolder "uploads"\n\nroute "/upload"\n  remember file as upload("document")\n  show file.name\n  show file.size\ndone',js:'app.use(__uploads({ "limitBytes": 10485760, "mimes": ["image/png", "image/jpeg"], "folder": "uploads" }));\n\napp.get("/upload", (req, res) => {\n  let file = __uploadedFile(req, "document");\n  console.log(file.name);\n  console.log(file.size);\n});'},
  {cat:"cli",name:"CLI: new",desc:"Scaffold a new PlainScript project",ps:'plainscript new my-app',js:'// Creates my-app/ with src/app.ps and package.json'},
  {cat:"cli",name:"CLI: run",desc:"Compile and execute a PlainScript file",ps:'plainscript run src/app.ps',js:'// Compiles src/app.ps and runs the output'},
  {cat:"cli",name:"CLI: build",desc:"Compile .ps files to JavaScript",ps:'plainscript build',js:'// Compiles src/app.ps to dist/app.js'},
  {cat:"cli",name:"CLI: fmt",desc:"Auto-format PlainScript code",ps:'plainscript fmt src/app.ps',js:'// Formats src/app.ps in place'},
  {cat:"cli",name:"CLI: doctor",desc:"Diagnose project issues",ps:'plainscript doctor',js:'// Checks Node version, dependencies, config'},
  {cat:"cli",name:"CLI: check",desc:"Type-check without emitting output",ps:'plainscript check src/app.ps',js:'// Validates syntax without compiling'},
  {cat:"cli",name:"CLI: watch",desc:"Watch files and recompile on change",ps:'plainscript watch',js:'// Starts file watcher for .ps files'},
  {cat:"cli",name:"CLI: install / add / remove",desc:"Manage project dependencies",ps:'plainscript install\nplainscript add express\nplainscript remove lodash',js:'// npm install / npm install express / npm uninstall lodash'},
  {cat:"logging",name:"JavaScript Gateway",desc:"Embed raw JavaScript when you need full control",ps:'remember result as javascript\n  return fetch("https://api.example.com/data")\n    .then(r => r.json())\ndone\n\nshow result',js:'let result = await (async () => {\n  return fetch("https://api.example.com/data")\n    .then(r => r.json());\n})();\n\nconsole.log(result);'},
  {cat:"booleans",name:"Ternary / Inline If",desc:"Use if expressions inline (via javascript gateway)",ps:'remember label as javascript\n  return age >= 18 ? "adult" : "minor"\ndone',js:'let label = await (async () => {\n  return age >= 18 ? "adult" : "minor";\n})();'},
  {cat:"server",name:"404 Catch-All",desc:"Handle unmatched routes",ps:'when nothing matches\n  status 404\n  reply "Page not found"\ndone',js:'app.use((req, res) => {\n  res.status(404);\n  res.send("Page not found");\n});'},
  {cat:"server",name:"Validate Request Body",desc:"Require specific fields in the request body",ps:'route post "/users"\n  validate(body of request, ["name", "email"])\n  reply "Created"\ndone',js:'app.post("/users", (req, res) => {\n  __validate(req.body, ["name", "email"]);\n  res.send("Created");\n});'},
  {cat:"auth",name:"Google OAuth",desc:"Add Google login to your app",ps:'web app\ngoogle oauth\n  id is env("GOOGLE_CLIENT_ID")\n  secret is env("GOOGLE_CLIENT_SECRET")\n  callback is "/auth/google/callback"\n  landing is "/dashboard"\ndone',js:'__googleOAuth(app, {\n  clientId: process.env["GOOGLE_CLIENT_ID"],\n  clientSecret: process.env["GOOGLE_CLIENT_SECRET"],\n  callbackUrl: "/auth/google/callback",\n  afterLogin: "/dashboard"\n});'},
  {cat:"cli",name:"CLI: version",desc:"Print the PlainScript version",ps:'plainscript version',js:'// Prints v0.1.7'},
  {cat:"cli",name:"CLI: help",desc:"Show available commands",ps:'plainscript help',js:'// Lists all CLI commands'},
  {cat:"cli",name:"CLI: info",desc:"Display platform and runtime info",ps:'plainscript info',js:'// Shows version, Node version, OS'},
  {cat:"cli",name:"CLI: clean",desc:"Remove compiled output",ps:'plainscript clean',js:'// Deletes dist/ folder'},
  {cat:"cli",name:"CLI: repl",desc:"Launch interactive REPL shell",ps:'plainscript repl',js:'// Opens interactive PlainScript REPL'},
  {cat:"cli",name:"CLI: init",desc:"Initialize config file",ps:'plainscript init',js:'// Creates plainscript.config.json'},
  {cat:"cli",name:"CLI: test",desc:"Run the test suite",ps:'plainscript test',js:'// Runs test files in tests/'},
  {cat:"filesystem",name:"Binary File I/O",desc:"Read and write raw bytes",ps:'remember buf as readBytes("image.png")\nwriteBytes("copy.png", buf)',js:'let buf = fs.readFileSync("image.png");\nfs.writeFileSync("copy.png", buf);'},
  {cat:"upload",name:"Multiple Uploads",desc:"Handle multiple file uploads at once",ps:'route "/upload-many"\n  remember files as uploads("documents")\n  for each f in files\n    show f.name\n  done\ndone',js:'app.get("/upload-many", (req, res) => {\n  let files = __uploadedFiles(req, "documents");\n  for (const f of files) {\n    console.log(f.name);\n  }\n});'},
  {cat:"server",name:"Cron Jobs",desc:"Schedule recurring tasks",ps:'every 5 minutes\n  show "running cleanup"\n  // cleanup code here\ndone\n\nschedule "0 2 * * *"\n  show "daily backup"\n  // backup code here\ndone',js:'setInterval(async () => {\n  console.log("running cleanup");\n}, 300000);\n\ncron.schedule("0 2 * * *", async () => {\n  console.log("daily backup");\n});'},
];

function initLibrary() {
  var grid = document.getElementById('lib-grid');
  var searchInput = document.getElementById('lib-search');
  var countEl = document.getElementById('lib-count');
  var emptyEl = document.getElementById('lib-empty');
  var filterBtns = document.querySelectorAll('.lib-filter');
  if (!grid || !searchInput) return;

  var activeCat = 'all';

  function renderCards(features) {
    grid.innerHTML = '';
    if (features.length === 0) {
      emptyEl.style.display = 'block';
      countEl.textContent = '0 results';
      return;
    }
    emptyEl.style.display = 'none';
    countEl.textContent = features.length + ' feature' + (features.length !== 1 ? 's' : '');

    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      var card = document.createElement('div');
      card.className = 'lib-card';
      card.setAttribute('data-cat', f.cat);

      var header = '<div class="lib-card-header"><span class="lib-card-title">' + f.name + '</span><span class="lib-card-cat">' + f.cat + '</span></div>';
      var body = '<div class="lib-card-body"><pre><code>' + escapeHtml(f.ps) + '</code></pre></div>';
      var footer = '<div class="lib-card-footer"><div class="lib-card-js"><span>JS:</span> ' + escapeHtml(f.desc) + '</div></div>';
      card.innerHTML = header + body + footer;
      grid.appendChild(card);
    }

    if (typeof initSyntaxHighlighting === 'function') {
      var codeEls = grid.querySelectorAll('code');
      for (var j = 0; j < codeEls.length; j++) {
        var text = codeEls[j].textContent;
        codeEls[j].innerHTML = tokenize(text, 'plainscript');
      }
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function filterFeatures() {
    var query = searchInput.value.toLowerCase().trim();
    var results = [];

    for (var i = 0; i < LIBRARY.length; i++) {
      var f = LIBRARY[i];
      var catMatch = activeCat === 'all' || f.cat === activeCat;
      if (!catMatch) continue;

      if (!query) {
        results.push(f);
        continue;
      }

      var searchable = (f.name + ' ' + f.desc + ' ' + f.cat + ' ' + f.ps).toLowerCase();
      if (searchable.indexOf(query) !== -1) {
        results.push(f);
      }
    }

    renderCards(results);
  }

  searchInput.addEventListener('input', filterFeatures);

  for (var i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener('click', function() {
      for (var j = 0; j < filterBtns.length; j++) {
        filterBtns[j].classList.remove('active');
      }
      this.classList.add('active');
      activeCat = this.getAttribute('data-cat');
      filterFeatures();
    });
  }

  renderCards(LIBRARY);
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
  initLibrary();
});
