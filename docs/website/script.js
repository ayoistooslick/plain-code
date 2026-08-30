function initSyntaxHighlighting() {
  var codeBlocks = document.querySelectorAll('.code-window-body code, .code-block code, .code-block--wide code');

  var PS_KEYWORDS = {
    'let':1,'is':1,'print':1,'define':1,'function':1,'give':1,'back':1,'return':1,
    'if':1,'else':1,'end':1,'done':1,'database':1,'query':1,'insert':1,'into':1,'values':1,'each':1,
    'in':1,'while':1,'not':1,'and':1,'or':1,'greater':1,'less':1,'than':1,
    'true':1,'false':1,'null':1,'none':1,
    'import':1,'from':1,'export':1,'class':1,'new':1,'this':1,'with':1,'do':1,
    'try':1,'catch':1,'throw':1,'async':1,'await':1,
    'use':1,'server':1,'when':1,'someone':1,'visits':1,'for':1,'send':1,'log':1,
    'save':1,'as':1,'if':1,'else':1,'then':1,'end':1,'function':1,'returns':1,
    'return':1,'database':1,'query':1,'insert':1,'into':1,'values':1,'each':1,
    'in':1,'while':1,'not':1,'and':1,'or':1,'equals':1,'greater':1,
    'less':1,'than':1,'true':1,'false':1,'null':1,'none':1,'javascript':1,
    'import':1,'from':1,'export':1,'class':1,'new':1,'this':1,'with':1,'do':1,
    'try':1,'catch':1,'throw':1,'async':1,'await':1,
    'is':1,'now':1,'now':1,'contains':1,'starts':1,'ends':1,'with':1,
    'between':1,'above':1,'below':1,'at':1,'least':1,'most':1,'empty':1,
    'not':1,'and':1,'or':1,'is':1,'equal':1,'to':1,
    'route':1,'group':1,'start':1,'run':1,'on':1,'listen':1,'reply':1,'serve':1,'folder':1,
    'web':1,'app':1,'allow':1,'cors':1,'status':1,'redirect':1,'to':1,
    'json':1,'show':1,'ask':1,'ocr':1,'using':1,'yield':1,'symbol':1,
    'debugger':1,'import':1,'meta':1,'include':1,'load':1,
    'define':1,'kind':1,'called':1,'extends':1,'export':1,'test':1,'check':1,
    'raises':1,'equals':1,'contains':1,'spread':1,'of':1,'all':1,'any':1,'settled':1,
    'wait':1,'for':1,'retry':1,'times':1,'every':1,'seconds':1,
    'accept':1,'uploads':1,'limit':1,'allow':1,'folder':1,'require':1,'api':1,'key':1,
    'enable':1,'sessions':1,'destroy':1,'session':1,'cookie':1,'expires':1,'in':1,'days':1,
    'clear':1,'rate':1,'limit':1,'requests':1,'per':1,'minute':1,'google':1,'oauth':1,
    'id':1,'secret':1,'callback':1,'landing':1,'postgres':1,'env':1,
    'execute':1,'update':1,'delete':1,'transaction':1,'connect':1,'database':1,
    'cache':1,'get':1,'set':1,'delete':1,'mail':1,'transport':1,'send':1,'mail':1,
    'from':1,'to':1,'subject':1,'text':1,'every':1,'minutes':1,'schedule':1,
    'run':1,'background':1,'websocket':1,'server':1,'on':1,'socket':1,'connects':1,
    'sends':1,'message':1,'disconnects':1,'send':1,'broadcast':1,
    'cache':1,'env':1,'redis':1,'chat':1,'embed':1,'text':1,'similarity':1,
    'tags':1,'post':1,'paginate':1,'items':1,'count':1,'page':1,'pages':1,'per':1,'hasNext':1,'hasPrev':1,
    'import':1,'include':1,'load':1,'define':1,'kind':1,'called':1,'extends':1,
    'create':1,'a':1,'with':1,'test':1,'name':1,'check':1,'equals':1,'contains':1,
    'is':1,'raises':1,'spread':1,'of':1,'all':1,'any':1,'settled':1,'withTimeout':1,
    'loadModule':1,'args':1,'runCommand':1,'withTimeout':1,'typeOf':1,'fieldsOf':1,
    'hasField':1,'valueOf':1,'sizeOf':1,'base64Encode':1,'base64Decode':1,'textToBytes':1,
    'bytesToText':1,'sha256':1,'sha1':1,'md5':1,'yamlDecode':1,'yamlEncode':1,
    'loadEnvFile':1,'args':1,'runCommand':1,'withTimeout':1,'spread':1,'keyMap':1,
    'mapSet':1,'mapGet':1,'mapHas':1,'mapDelete':1,'newSet':1,'addToSet':1,'removeFromSet':1,'setHas':1,
    'fileSize':1,'fileType':1,'lastModified':1,'walkFolder':1,'joinPath':1,'baseName':1,'folderOf':1,'extensionOf':1,
    'writeLine':1,'appendLine':1,'abs':1,'min':1,'max':1,'sqrt':1,'pow':1,'floor':1,'ceil':1,'round':1,
    'trunc':1,'sign':1,'random':1,'randomInt':1,'clamp':1,'lerp':1,'PI':1,'E':1,'ln2':1,'ln10':1,
    'log2e':1,'log10e':1,'sin':1,'cos':1,'tan':1,'asin':1,'acos':1,'atan':1,'atan2':1,
    'sinh':1,'cosh':1,'tanh':1,'exp':1,'expm1':1,'log':1,'log1p':1,'log2':1,'log10':1,
    'hypot':1,'cbrt':1,'trim':1,'trimStart':1,'trimEnd':1,'toUpperCase':1,'toLowerCase':1,
    'charAt':1,'charCodeAt':1,'codePointAt':1,'slice':1,'substring':1,'substr':1,
    'indexOf':1,'lastIndexOf':1,'includes':1,'startsWith':1,'endsWith':1,'repeat':1,
    'padStart':1,'padEnd':1,'split':1,'join':1,'replace':1,'replaceAll':1,'match':1,'matchAll':1,
    'search':1,'toString':1,'valueOf':1,'push':1,'pop':1,'shift':1,'unshift':1,'splice':1,
    'concat':1,'slice':1,'copyWithin':1,'fill':1,'find':1,'findIndex':1,'findLast':1,'findLastIndex':1,
    'indexOf':1,'lastIndexOf':1,'includes':1,'join':1,'reverse':1,'sort':1,'flat':1,'flatMap':1,
    'map':1,'filter':1,'reduce':1,'reduceRight':1,'forEach':1,'some':1,'every':1,'at':1,'with':1,
    'toSorted':1,'toReversed':1,'toSpliced':1,'keys':1,'values':1,'entries':1,
    'assign':1,'create':1,'defineProperty':1,'defineProperties':1,'getOwnPropertyDescriptor':1,
    'getOwnPropertyDescriptors':1,'getOwnPropertyNames':1,'getOwnPropertySymbols':1,
    'getPrototypeOf':1,'setPrototypeOf':1,'objectIs':1,'isExtensible':1,'isFrozen':1,'isSealed':1,
    'preventExtensions':1,'freeze':1,'seal':1,'hasOwn':1,'Promise':1,'resolve':1,'reject':1,'all':1,
    'allSettled':1,'race':1,'any':1,'await':1,'sleep':1,'timeout':1,'jsonParse':1,'stringify':1,
    'isArray':1,'isInteger':1,'isNaN':1,'isFinite':1,'isSafeInteger':1,'parseInt':1,'parseFloat':1,
    'arrayFrom':1,'arrayOf':1,'arrayIsArray':1,'objectFromEntries':1,'objectGetOwnPropertySymbols':1,
    'objectGetOwnPropertyDescriptors':1,'objectGetPrototypeOf':1,'objectSetPrototypeOf':1,
    'objectIs':1,'objectCreate':1,'objectAssign':1,'objectKeys':1,'objectValues':1,'objectEntries':1,
    'objectHasOwn':1,'objectDefineProperty':1,'objectDefineProperties':1,'objectGetOwnPropertyDescriptor':1,
    'objectGetOwnPropertyNames':1,'objectIsExtensible':1,'objectIsFrozen':1,'objectIsSealed':1,
    'objectPreventExtensions':1,'objectFreeze':1,'objectSeal':1,'symbol':1,'symbolFor':1,'symbolKeyFor':1,
    'symbolIterator':1
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
  {cat:"strings",name:"String Literals",desc:"Create string values with double quotes or backticks",ps:'remember greeting as "Hello, World!"\nremember name as "Ayokunle"',js:'let greeting = "Hello, World!";\nlet name = "Ayokunle";'},
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
  {cat:"booleans",name:"Logical Operators",desc:"Combine conditions with and, or, not",ps:'remember age as 25\nremember name as "Ayo"\n\nif age is 25 and name is "Ayo"\n  show "match"\ndone\n\nif age is 10 or age is 25\n  show "found"\ndone\n\nif age is not empty\n  show "has value"\ndone',js:'let age = 25;\nlet name = "Ayo";\n\nif (age === 25 && name === "Ayo") {\n  console.log("match");\n}\n\nif (age === 10 || age === 25) {\n  console.log("found");\n}\n\nif (!(age.length === 0)) {\n  console.log("has value");\n}'},
  {cat:"conditionals",name:"If / Otherwise",desc:"Branch logic based on conditions",ps:'remember score as 85\n\nif score is greater than 80\n  show "grade A"\notherwise if score is greater than 60\n  show "grade B"\notherwise\n  show "grade C"\ndone',js:'let score = 85;\n\nif (score > 80) {\n  console.log("grade A");\n} else if (score > 60) {\n  console.log("grade B");\n} else {\n  console.log("grade C");\n}'},
  {cat:"loops",name:"For Each Loop",desc:"Iterate over every item in a collection",ps:'remember fruits as ["apple", "banana", "cherry"]\n\nfor each fruit in fruits\n  show fruit\ndone',js:'let fruits = ["apple", "banana", "cherry"];\n\nfor (const fruit of fruits) {\n  console.log(fruit);\n}'},
  {cat:"loops",name:"While Loop",desc:"Repeat while a condition is true",ps:'remember count as 0\n\nwhile count is less than 5\n  show count\n  count becomes count + 1\ndone',js:'let count = 0;\n\nwhile (count < 5) {\n  console.log(count);\n  count = count + 1;\n}'},
  {cat:"functions",name:"Define Function",desc:"Create a reusable block of code",ps:'to greet(name)\n  show `Hello ${name}!`\ndone\n\ngreet("Ayokunle")',js:'function greet(name) {\n  console.log(`Hello ${name}!`);\n}\n\ngreet("Ayokunle");'},
  {cat:"functions",name:"Return Value",desc:"Return a value from a function",ps:'to add(a, b)\n  give a + b\ndone\n\nremember result as add(5, 7)\nshow result',js:'function add(a, b) {\n  return a + b;\n}\n\nlet result = add(5, 7);\nconsole.log(result);'},
  {cat:"arrays",name:"Array Literal",desc:"Create an array of values",ps:'remember colors as ["red", "green", "blue"]\nremember nums as [1, 2, 3, 4, 5]',js:'let colors = ["red", "green", "blue"];\nlet nums = [1, 2, 3, 4, 5];'},
  {cat:"arrays",name:"Access Elements",desc:"Get items by index (one-based English syntax)",ps:'remember items as ["a", "b", "c"]\nshow first item from items\nshow last item from items\nshow items[0]',js:'let items = ["a", "b", "c"];\nconsole.log(items[0]);\nconsole.log(items[items.length - 1]);\nconsole.log(items[0]);'},
  {cat:"arrays",name:"Add / Remove Items",desc:"Push to or splice from an array",ps:'remember list as [1, 2, 3]\nadd(4 to list)\nremove(2 from list)',js:'let list = [1, 2, 3];\nlist.push(4);\nlist.splice(list.indexOf(2), 1);'},
  {cat:"arrays",name:"Sort / Reverse / Unique",desc:"Transform arrays with built-in operations",ps:'remember nums as [3, 1, 4, 1, 5]\nshow sort(nums)\nshow reverse(nums)\nshow unique(nums)',js:'let nums = [3, 1, 4, 1, 5];\nconsole.log([...nums].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));\nconsole.log([...nums].reverse());\nconsole.log([...new Set(nums)]);'},
  {cat:"objects",name:"Object Literal",desc:"Create an object with key-value pairs",ps:'remember user as\n  name is "Ayokunle"\n  age is 25\n  role is "Developer"\ndone',js:'let user = {\n  "name": "Ayokunle",\n  "age": 25,\n  "role": "Developer"\n};'},
  {cat:"objects",name:"Access Properties",desc:"Read and write object properties",ps:'remember user as\n  name is "Ayokunle"\n  age is 25\ndone\n\nshow user.name\nshow name of user\nuser.age becomes 26',js:'let user = {\n  "name": "Ayokunle",\n  "age": 25\n};\n\nconsole.log(user.name);\nconsole.log(user.name);\nuser.age = 26;'},
  {cat:"objects",name:"Object Utilities",desc:"Get keys, values, check properties, merge objects",ps:'remember user as\n  name is "Ayo"\n  age is 25\ndone\n\nshow keys(user)\nshow values(user)\nshow hasKey(user, "name")\n\nremember merged as merge(user, { city: "Lagos" })',js:'let user = {\n  "name": "Ayo",\n  "age": 25\n};\n\nconsole.log(Object.keys(user));\nconsole.log(Object.values(user));\nconsole.log(Object.prototype.hasOwnProperty.call(user, "name"));\n\nlet merged = { ...user, ...{ "city": "Lagos" } };'},
  {cat:"imports",name:"Use npm Package",desc:"Import any npm package with the use keyword",ps:'use express\nuse axios\nuse dotenv\nuse chalk',js:'const express = require(\'express\');\nconst axios = require(\'axios\');\nrequire(\'dotenv\').config();\nconst chalk = require(\'chalk\');'},
  {cat:"imports",name:"Use with Alias",desc:"Import a package under a different name",ps:'use node-fetch as fetch',js:'const fetch = require(\'node-fetch\');'},
  {cat:"imports",name:"Import .pln File",desc:"Import another PlainScript file",ps:'import "./utils.pln"\nimport "./database.pln"',js:'// Bundled in dependency order at compile time'},
  {cat:"server",name:"Web App",desc:"Create an Express server with one line",ps:'web app',js:'const express = require(\'express\');\nconst app = express();\napp.use(express.json());'},
  {cat:"server",name:"Define Route",desc:"Handle HTTP requests with route blocks",ps:'web app\n\nroute "/"\n  reply "Hello, World!"\ndone\n\nroute post "/users"\n  reply json\n    name is "Ayokunle"\n  done\ndone',js:'const express = require(\'express\');\nconst app = express();\napp.use(express.json());\n\napp.get("/", (req, res) => {\n  res.send("Hello, World!");\n});\n\napp.post("/users", (req, res) => {\n  res.json({ "name": "Ayokunle" });\n});'},
  {cat:"server",name:"Route Groups",desc:"Prefix multiple routes with a common path",ps:'group "/api"\n  route "/users"\n    reply "users list"\n  done\n\n  route "/posts"\n    reply "posts list"\n  done\ndone',js:'app.get("/api/users", (req, res) => {\n  res.send("users list");\n});\n\napp.get("/api/posts", (req, res) => {\n  res.send("posts list");\n});',skipRun:true},
  {cat:"server",name:"Request Data",desc:"Access params, query, headers, and body",ps:'route "/users/:id"\n  remember id as param("id")\n  remember page as query("page")\n  remember token as header("x-token")\n  remember data as body of request\n  show id\ndone',js:'app.get("/users/:id", (req, res) => {\n  let id = req.params["id"];\n  let page = req.query["page"];\n  let token = req.headers["x-token"];\n  let data = req.body;\n  console.log(id);\n});',skipRun:true},
  {cat:"server",name:"Static Files & CORS",desc:"Serve static files and enable CORS",ps:'web app\nserve folder "public"\nallow cors\nstart 3000',js:'const express = require(\'express\');\nconst app = express();\napp.use(express.json());\napp.use(express.static("public"));\n// CORS middleware added\napp.listen(3000);'},
  {cat:"server",name:"Status Codes",desc:"Set HTTP response status codes",ps:'route "/not-found"\n  status 404\n  reply "Not found"\ndone',js:'app.get("/not-found", (req, res) => {\n  res.status(404);\n  res.send("Not found");\n});',skipRun:true},
  {cat:"database",name:"Connect SQLite",desc:"Open a SQLite database connection",ps:'database "app.db"',js:'const db = await __dbOpen("app.db", null);'},
  {cat:"database",name:"Query Data",desc:"Run a SELECT query and get results",ps:'remember rows as query\n  SELECT * FROM users WHERE active = 1\ndone\n\nfor each row in rows\n  show row.name\ndone',js:'let rows = db.prepare(\n  "SELECT * FROM users WHERE active = 1"\n).all();\n\nfor (const row of rows) {\n  console.log(row.name);\n}',skipRun:true},
  {cat:"database",name:"Insert Data",desc:"Insert new rows into a table",ps:'insert\n  INSERT INTO users (name, email)\n  VALUES ("Ayokunle", "ayo@test.com")\ndone',js:'db.prepare(\n  "INSERT INTO users (name, email) VALUES (?, ?)"\n).run("Ayokunle", "ayo@test.com");',skipRun:true},
  {cat:"database",name:"Update Data",desc:"Update existing rows",ps:'update\n  UPDATE users SET active = 0 WHERE id = 1\ndone',js:'db.prepare(\n  "UPDATE users SET active = 0 WHERE id = 1"\n).run();',skipRun:true},
  {cat:"database",name:"Create Tables",desc:"Execute DDL statements",ps:'execute\n  CREATE TABLE IF NOT EXISTS users (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL,\n    email TEXT UNIQUE\n  )\ndone',js:'db.exec(\n  "CREATE TABLE IF NOT EXISTS users (\\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\\n    name TEXT NOT NULL,\\n    email TEXT UNIQUE\\n  )"\n);',skipRun:true},
  {cat:"database",name:"Transactions",desc:"Wrap multiple operations in a transaction",ps:'transaction\n  insert\n    INSERT INTO accounts (name, balance) VALUES ("Ayo", 1000)\n  done\n  insert\n    INSERT INTO accounts (name, balance) VALUES ("Dayo", 500)\n  done\ndone',js:'db.transaction(() => {\n  db.prepare("INSERT INTO accounts (name, balance) VALUES (?, ?)").run("Ayo", 1000);\n  db.prepare("INSERT INTO accounts (name, balance) VALUES (?, ?)").run("Dayo", 500);\n})();',skipRun:true},
  {cat:"database",name:"PostgreSQL",desc:"Connect to a PostgreSQL database",ps:'postgres env("DATABASE_URL")\n\nremember rows as query\n  SELECT * FROM users LIMIT 10\ndone',js:'const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });\nlet result = await pool.query("SELECT * FROM users LIMIT 10");\nlet rows = result.rows;'},
  {cat:"cache",name:"Redis Cache",desc:"Connect to Redis for key-value caching",ps:'cache "redis://localhost:6379"',js:'// Creates Redis client and connects'},
  {cat:"cache",name:"Get / Set Cache",desc:"Read and write cached values",ps:'cacheSet("user:1", "Ayokunle")\ncacheSet("token:abc", data, 3600)\n\nremember name as cacheGet("user:1")\nshow name',js:'await __cacheClient().set("user:1", "Ayokunle");\nawait __cacheClient().set("token:abc", data, { EX: 3600 });\n\nlet name = await __cacheClient().get("user:1");\nconsole.log(name);',skipRun:true},
  {cat:"cache",name:"Delete Cache",desc:"Remove a cached key",ps:'cacheDelete("user:1")',js:'await __cacheClient().del("user:1");',skipRun:true},
  {cat:"http",name:"GET Request",desc:"Fetch data from an API",ps:'remember response as get "https://api.example.com/users"\nshow data of response',js:'let response = await __httpRequest(\'GET\', "https://api.example.com/users", {});\nconsole.log(response.data);',skipRun:true},
  {cat:"http",name:"POST Request",desc:"Send data to an API",ps:'remember body as\n  name is "Ayokunle"\n  email is "ayo@test.com"\ndone\n\nremember result as post "https://api.example.com/users" with body',js:'let body = {\n  "name": "Ayokunle",\n  "email": "ayo@test.com"\n};\n\nlet result = await __httpRequest(\'POST\', "https://api.example.com/users", { body });',skipRun:true},
  {cat:"http",name:"PUT / PATCH / DELETE",desc:"Update or remove resources via API",ps:'put "https://api.example.com/users/1" with body\npatch "https://api.example.com/users/1" with body\ndelete "https://api.example.com/users/1"',js:'await __httpRequest(\'PUT\', url, { body });\nawait __httpRequest(\'PATCH\', url, { body });\nawait __httpRequest(\'DELETE\', "https://api.example.com/users/1", {});',skipRun:true},
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
  {cat:"auth",name:"Cookies",desc:"Set, read, and clear cookies",ps:'route "/pref"\n  set cookie "theme" to "dark"\n  set cookie "lang" to "en" expires in 7 days\n  remember theme as cookie("theme")\n  clear cookie "theme"\ndone',js:'app.get("/pref", (req, res) => {\n  res.cookie("theme", "dark", { httpOnly: true, path: \'/\' });\n  res.cookie("lang", "en", { httpOnly: true, path: \'/\', maxAge: 604800000 });\n  let theme = __cookieValue(req, "theme");\n  res.clearCookie("theme", { path: \'/\' });\n});',skipRun:true},
  {cat:"auth",name:"Rate Limiting",desc:"Protect endpoints from abuse",ps:'web app\nlimit requests to 100 per minute',js:'app.use(__rateLimit({ "max": 100, "windowMs": 60000 }));'},
  {cat:"auth",name:"API Key Protection",desc:"Require an API key for access",ps:'web app\nrequire api key from env("API_KEY")',js:'// Middleware checks x-api-key header against process.env["API_KEY"]'},
  {cat:"telegram",name:"Telegram Bot",desc:"Create a Telegram bot with command handlers",ps:'bot env("BOT_TOKEN")\n\nwhen someone sends "/start"\n  reply "Welcome to PlainScript!"\ndone\n\nwhen someone sends matching "/echo (.+)"\n  reply "echo"\ndone\n\nstart telegram bot',js:'BOT = await Telegram.createTelegramBot(process.env["BOT_TOKEN"]);\n\nBOT.onCommand("/start", async (ctx) => {\n  await Telegram.sendMessage(ctx.chatId, "Welcome to PlainScript!");\n});\n\nBOT.onPattern(/echo (.+)/i, async (ctx) => {\n  await Telegram.sendMessage(ctx.chatId, ctx.match[1]);\n});\n\nawait BOT.start();',skipRun:true},
  {cat:"whatsapp",name:"WhatsApp Bot",desc:"Create a WhatsApp bot with message handlers",ps:'whatsapp bot\n  on message\n    reply "You said: ${message.text}"\n  done\ndone',js:'await __whatsappStart({ "folder": "plainscript-whatsapp-auth", "login": "qr" });\n__whatsappOnMessage(async (__waCtx) => {\n  await __whatsappReply(__waCtx.chat, `You said: ${__waCtx.message.text}`);\n});'},
  {cat:"websocket",name:"WebSocket Server",desc:"Create a real-time WebSocket server",ps:'websocket server on 8080\n  when socket connects\n    send socket "Welcome!"\n  done\n\n  when socket sends message\n    broadcast message\n  done\n\ndone',js:'__wsServerCreate(8080, {\n  connect: async (socket) => {\n    __wsSend(socket, "Welcome!");\n  },\n  message: async (socket, message) => {\n    __wsBroadcast(__wsServer, message);\n  }\n});'},
  {cat:"email",name:"Send Email",desc:"Configure SMTP and send emails",ps:'mail transport\n  host is "smtp.gmail.com"\n  port is 587\n  user is env("EMAIL_USER")\n  pass is env("EMAIL_PASS")\ndone\n\nsend mail\n  from is "me@example.com"\n  to is "friend@example.com"\n  subject is "Hello"\n  text is "PlainScript sends email!"\ndone',js:'__mailCreate({ "host": "smtp.gmail.com", "port": 587, "auth": { "user": process.env["EMAIL_USER"], "pass": process.env["EMAIL_PASS"] } });\n\nawait __mailSend({ "from": "me@example.com", "to": "friend@example.com", "subject": "Hello", "text": "PlainScript sends email!" });'},
  {cat:"upload",name:"File Uploads",desc:"Accept and process file uploads",ps:'web app\naccept uploads limit "10 MB"\nallow ["image/png", "image/jpeg"]\nfolder "uploads"\n\nroute "/upload"\n  remember file as upload("document")\n  show file.name\n  show file.size\ndone',js:'app.use(__uploads({ "limitBytes": 10485760, "mimes": ["image/png", "image/jpeg"], "folder": "uploads" }));\n\napp.get("/upload", (req, res) => {\n  let file = __uploadedFile(req, "document");\n  console.log(file.name);\n  console.log(file.size);\n});'},
  {cat:"cli",name:"CLI: new",desc:"Scaffold a new PlainScript project",ps:'plainscript new my-app',js:'// Creates my-app/ with src/app.pln and package.json',skipRun:true},
  {cat:"cli",name:"CLI: run",desc:"Compile and execute a PlainScript file",ps:'plainscript run src/app.pln',js:'// Compiles src/app.pln and runs the output',skipRun:true},
  {cat:"cli",name:"CLI: build",desc:"Compile .pln files to JavaScript",ps:'plainscript build',js:'// Compiles src/app.pln to dist/app.js',skipRun:true},
  {cat:"cli",name:"CLI: fmt",desc:"Auto-format PlainScript code",ps:'plainscript fmt src/app.pln',js:'// Formats src/app.pln in place',skipRun:true},
  {cat:"cli",name:"CLI: doctor",desc:"Diagnose project issues",ps:'plainscript doctor',js:'// Checks Node version, dependencies, config',skipRun:true},
  {cat:"cli",name:"CLI: check",desc:"Type-check without emitting output",ps:'plainscript check src/app.pln',js:'// Validates syntax without compiling',skipRun:true},
  {cat:"cli",name:"CLI: watch",desc:"Watch files and recompile on change",ps:'plainscript watch',js:'// Starts file watcher for .pln files',skipRun:true},
  {cat:"cli",name:"CLI: install / add / remove",desc:"Manage project dependencies",ps:'plainscript install\nplainscript add express\nplainscript remove lodash',js:'// npm install / npm install express / npm uninstall lodash',skipRun:true},
  {cat:"server",name:"404 Catch-All",desc:"Handle unmatched routes",ps:'when nothing matches\n  status 404\n  reply "Page not found"\ndone',js:'app.use((req, res) => {\n  res.status(404);\n  res.send("Page not found");\n});',skipRun:true},
  {cat:"server",name:"Validate Request Body",desc:"Require specific fields in the request body",ps:'route post "/users"\n  validate(body of request, ["name", "email"])\n  reply "Created"\ndone',js:'app.post("/users", (req, res) => {\n  __validate(req.body, ["name", "email"]);\n  res.send("Created");\n});',skipRun:true},
  {cat:"auth",name:"Google OAuth",desc:"Add Google login to your app",ps:'web app\ngoogle oauth\n  id is env("GOOGLE_CLIENT_ID")\n  secret is env("GOOGLE_CLIENT_SECRET")\n  callback is "/auth/google/callback"\n  landing is "/dashboard"\ndone',js:'__googleOAuth(app, {\n  clientId: process.env["GOOGLE_CLIENT_ID"],\n  clientSecret: process.env["GOOGLE_CLIENT_SECRET"],\n  callbackUrl: "/auth/google/callback",\n  afterLogin: "/dashboard"\n});'},
  {cat:"cli",name:"CLI: version",desc:"Print the PlainScript version",ps:'plainscript version',js:'// Prints v1.0.2',skipRun:true},
  {cat:"datetime",name:"Create Date",desc:"Create a new Date object from ISO string, timestamp, or components",ps:'remember d as newDate()\nremember d2 as newDate("2026-08-28")\nremember d3 as newDate(2026, 8, 28, 12, 0, 0)',js:'let d = new Date();\nlet d2 = new Date("2026-08-28");\nlet d3 = new Date(2026, 7, 28, 12, 0, 0);'},
  {cat:"datetime",name:"Current Time",desc:"Get current timestamp in milliseconds or seconds",ps:'remember ms as now()\nremember sec as nowSec()',js:'let ms = Date.now();\nlet sec = Math.floor(Date.now() / 1000);'},
  {cat:"datetime",name:"Date Components",desc:"Extract year, month, day, hour, minute, second from a Date",ps:'remember d as newDate()\nshow year(d)\nshow month(d)\nshow day(d)\nshow hours(d)\nshow minutes(d)\nshow seconds(d)',js:'let d = new Date();\nconsole.log(d.getFullYear());\nconsole.log(d.getMonth() + 1);\nconsole.log(d.getDate());\nconsole.log(d.getHours());\nconsole.log(d.getMinutes());\nconsole.log(d.getSeconds());'},
  {cat:"datetime",name:"Date Formatting",desc:"Format dates as ISO, locale, UTC, or custom patterns",ps:'remember d as newDate()\nshow toISO(d)\nshow toLocaleDate(d)\nshow toLocaleTime(d)\nshow toUTC(d)\nshow format(d, "YYYY-MM-DD HH:mm:ss")',js:'let d = new Date();\nconsole.log(d.toISOString());\nconsole.log(d.toLocaleDateString());\nconsole.log(d.toLocaleTimeString());\nconsole.log(d.toUTCString());\n// Custom format via __formatDate helper'},
  {cat:"datetime",name:"Date Arithmetic",desc:"Add, subtract, and diff dates with units (ms, s, m, h, d, w, mo, y)",ps:'remember d as newDate()\nremember tomorrow as addTime(d, 1, "d")\nremember yesterday as subTime(d, 1, "d")\nshow diffTime(tomorrow, d, "h")',js:'let d = new Date();\nlet tomorrow = new Date(d.getTime() + 86400000);\nlet yesterday = new Date(d.getTime() - 86400000);\nconsole.log((tomorrow - d) / 3600000);'},
  {cat:"datetime",name:"Date Boundaries",desc:"Get start/end of day, month, year for a Date",ps:'remember d as newDate()\nshow startOfDay(d)\nshow endOfDay(d)\nshow startOfMonth(d)\nshow endOfMonth(d)\nshow startOfYear(d)\nshow endOfYear(d)',js:'let d = new Date();\nlet startOfDay = new Date(d); startOfDay.setHours(0,0,0,0);\nlet endOfDay = new Date(d); endOfDay.setHours(23,59,59,999);\n// Similar for month/year boundaries'},
  {cat:"regex",name:"Create Regex",desc:"Create a RegExp from a pattern string with optional flags",ps:'remember r as regex("\\d+", "g")',js:'let r = new RegExp("\\d+", "g");'},
  {cat:"regex",name:"Test Match",desc:"Check if a string matches a regex pattern",ps:'show matches("abc123", "\\d+")',js:'console.log(new RegExp("\\d+").test("abc123"));'},
  {cat:"regex",name:"Extract Match",desc:"Get the first match of a regex in a string",ps:'remember m as regexMatch("abc123", "\\d+")',js:'let m = "abc123".match(new RegExp("\\d+"));'},
  {cat:"regex",name:"Extract All Matches",desc:"Get all matches of a regex in a string",ps:'remember all as regexMatchAll("a1b2c3", "\\d+")',js:'let all = Array.from("a1b2c3".matchAll(new RegExp("\\d+", "g")));'},
  {cat:"regex",name:"Replace with Regex",desc:"Replace using regex with capture group support",ps:'remember replaced as replaceRegex("abc123", "\\d+", "X")',js:'let replaced = "abc123".replace(new RegExp("\\d+"), "X");'},
  {cat:"regex",name:"Split by Regex",desc:"Split a string using a regex pattern",ps:'remember parts as splitRegex("a,b;c", "[,;]")',js:'let parts = "a,b;c".split(new RegExp("[,;]"));'},
  {cat:"numbers",name:"Math Constants",desc:"Access PI, E, LN2, LN10, LOG2E, LOG10E",ps:'show PI()\nshow E()\nshow ln2()',js:'console.log(Math.PI);\nconsole.log(Math.E);\nconsole.log(Math.LN2);'},
  {cat:"numbers",name:"Trigonometry",desc:"sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh",ps:'show sin(0)\nshow cos(0)\nshow atan2(1, 1)',js:'console.log(Math.sin(0));\nconsole.log(Math.cos(0));\nconsole.log(Math.atan2(1, 1));'},
  {cat:"numbers",name:"Exponential & Logarithmic",desc:"exp, expm1, log, log1p, log2, log10, pow, sqrt, cbrt, hypot",ps:'show exp(1)\nshow log(10)\nshow log2(8)\nshow sqrt(16)\nshow pow(2, 3)',js:'console.log(Math.exp(1));\nconsole.log(Math.log(10));\nconsole.log(Math.log2(8));\nconsole.log(Math.sqrt(16));\nconsole.log(Math.pow(2, 3));'},
  {cat:"numbers",name:"Random Integers",desc:"Generate random integers in a range",ps:'show randomInt(1, 100)',js:'console.log(Math.floor(Math.random() * 100) + 1);'},
  {cat:"numbers",name:"Clamp & Lerp",desc:"Clamp a value between min/max, linear interpolation",ps:'show clamp(5, 0, 10)\nshow lerp(0, 100, 0.5)',js:'console.log(Math.min(Math.max(5, 0), 10));\nconsole.log(0 + (100 - 0) * 0.5);'},
  {cat:"strings",name:"Extended String Methods",desc:"slice, substring, indexOf, lastIndexOf, startsWith, endsWith, includes, repeat, padStart, padEnd",ps:'show slice("hello", 1, 4)\nshow indexOf("hello", "l")\nshow startsWith("hello", "he")\nshow repeat("ha", 3)\nshow padStart("5", 3, "0")',js:'console.log("hello".slice(1, 4));\nconsole.log("hello".indexOf("l"));\nconsole.log("hello".startsWith("he"));\nconsole.log("ha".repeat(3));\nconsole.log("5".padStart(3, "0"));'},
  {cat:"arrays",name:"Array Methods",desc:"push, pop, shift, unshift, splice, concat, slice, find, filter, map, reduce, some, every, flat, flatMap, at, with, toSorted, toReversed",ps:'remember arr as [3, 1, 4]\nshow push(arr, 9)\nshow filter(arr, x => x > 2)\nshow map(arr, x => x * 2)\nshow reduce(arr, (a, b) => a + b, 0)',js:'let arr = [3, 1, 4];\narr.push(9);\nconsole.log(arr.filter(x => x > 2));\nconsole.log(arr.map(x => x * 2));\nconsole.log(arr.reduce((a, b) => a + b, 0));'},
  {cat:"objects",name:"Object Methods",desc:"assign, create, defineProperty, getOwnPropertyNames, getPrototypeOf, setPrototypeOf, is, isExtensible, freeze, seal, hasOwn",ps:'show assign({}, {a: 1}, {b: 2})\nshow hasOwn({a: 1}, "a")\nshow objectIs({}, {})\nshow freeze({})',js:'console.log(Object.assign({}, {a: 1}, {b: 2}));\nconsole.log(Object.hasOwn({a: 1}, "a"));\nconsole.log(Object.is({}, {}));\nconsole.log(Object.freeze({}));'},
  {cat:"async",name:"Promise Utilities",desc:"Promise.resolve, Promise.all, Promise.race, Promise.any, Promise.allSettled",ps:'remember p as promiseAll([1, 2, 3])\nremember r as promiseRace([1, 2, 3])',js:'let p = Promise.all([1, 2, 3]);\nlet r = Promise.race([1, 2, 3]);'},
  {cat:"async",name:"Async Sleep & Timeout",desc:"Sleep for milliseconds, wrap promises with timeout",ps:'sleep(1000)\nremember result as timeout(fetchData(), 5000)',js:'await new Promise(r => setTimeout(r, 1000));\nlet result = await Promise.race([fetchData(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 5000))]);'},
  {cat:"async",name:"Await Helper",desc:"Explicitly await a promise in any context",ps:'remember data as await fetch("https://api.example.com")',js:'let data = await fetch("https://api.example.com");'},
  {cat:"json",name:"JSON Parse / Stringify",desc:"Parse JSON strings and stringify values with options",ps:'remember obj as jsonParse("{\"a\": 1}")\nshow stringify(obj)\nshow stringify(obj, null, 2)',js:'let obj = JSON.parse("{\\"a\\": 1}");\nconsole.log(JSON.stringify(obj));\nconsole.log(JSON.stringify(obj, null, 2));'},
  {cat:"types",name:"Type Checks",desc:"isArray, isInteger, isNaN, isFinite, isSafeInteger, parseInt, parseFloat",ps:'show isArray([1,2,3])\nshow isInteger(5)\nshow isNaN(NaN)\nshow parseInt("42")',js:'console.log(Array.isArray([1,2,3]));\nconsole.log(Number.isInteger(5));\nconsole.log(Number.isNaN(NaN));\nconsole.log(parseInt("42"));'},
  {cat:"globals",name:"Global Objects",desc:"Access globalThis, console, process, Buffer directly",ps:'show globalThis()\nshow console()\nshow process()\nshow Buffer()',js:'console.log(globalThis);\nconsole.log(console);\nconsole.log(process);\nconsole.log(Buffer);'},
  {cat:"cli",name:"CLI: help",desc:"Show available commands",ps:'plainscript help',js:'// Lists all CLI commands',skipRun:true},
  {cat:"cli",name:"CLI: info",desc:"Display platform and runtime info",ps:'plainscript info',js:'// Shows version, Node version, OS',skipRun:true},
  {cat:"cli",name:"CLI: clean",desc:"Remove compiled output",ps:'plainscript clean',js:'// Deletes dist/ folder',skipRun:true},
  {cat:"cli",name:"CLI: repl",desc:"Launch interactive REPL shell",ps:'plainscript repl',js:'// Opens interactive PlainScript REPL',skipRun:true},
  {cat:"cli",name:"CLI: init",desc:"Initialize config file",ps:'plainscript init',js:'// Creates plainscript.config.json',skipRun:true},
  {cat:"cli",name:"CLI: test",desc:"Run the test suite",ps:'plainscript test',js:'// Runs test files in tests/',skipRun:true},
  {cat:"filesystem",name:"Binary File I/O",desc:"Read and write raw bytes",ps:'remember buf as readBytes("image.png")\nwriteBytes("copy.png", buf)',js:'let buf = fs.readFileSync("image.png");\nfs.writeFileSync("copy.png", buf);'},
  {cat:"upload",name:"Multiple Uploads",desc:"Handle multiple file uploads at once",ps:'route "/upload-many"\n  remember files as uploads("documents")\n  for each f in files\n    show f.name\n  done\ndone',js:'app.get("/upload-many", (req, res) => {\n  let files = __uploadedFiles(req, "documents");\n  for (const f of files) {\n    console.log(f.name);\n  }\n});',skipRun:true},
  {cat:"server",name:"Cron Jobs",desc:"Schedule recurring tasks",ps:'every 5 minutes\n  show "running cleanup"\n  // cleanup code here\ndone\n\nschedule "0 2 * * *"\n  show "daily backup"\n  // backup code here\ndone',js:'setInterval(async () => {\n  console.log("running cleanup");\n}, 300000);\n\ncron.schedule("0 2 * * *", async () => {\n  console.log("daily backup");\n});'},
  {cat:"ai",name:"OCR (Optical Character Recognition)",desc:"Extract text from images using Tesseract OCR",ps:'ocr "screenshot.png" as extractedText\nshow extractedText\n\nocr "receipt.jpg" as receiptText using "eng+fra"',js:'let extractedText = await ocrImage("screenshot.png", "eng");\nconsole.log(extractedText);\n\nlet receiptText = await ocrImage("receipt.jpg", "eng+fra");'},
  {cat:"data",name:"Gather (Map)",desc:"Transform every item in a collection",ps:'remember numbers as [1, 2, 3, 4, 5]\ngather each num in numbers giving num * 2\nshow numbers',js:'let numbers = [1, 2, 3, 4, 5];\nnumbers = numbers.map(num => num * 2);\nconsole.log(numbers);'},
  {cat:"data",name:"Filter",desc:"Keep only items that match a condition",ps:'remember people as [{name: "Ayo", age: 25}, {name: "Tunde", age: 15}]\nfilter each person in people when person.age is above 17\nshow people',js:'let people = [{"name": "Ayo", "age": 25}, {"name": "Tunde", "age": 15}];\npeople = people.filter(person => person.age > 17);\nconsole.log(people);'},
  {cat:"data",name:"Total (Reduce)",desc:"Combine all items into a single value",ps:'remember numbers as [1, 2, 3, 4, 5]\ntotal each num in numbers giving num\nshow numbers',js:'let numbers = [1, 2, 3, 4, 5];\nnumbers = numbers.reduce((__sum, num) => __sum + num, 0);\nconsole.log(numbers);'},
  {cat:"data",name:"Pattern Matching",desc:"Match a value against multiple cases",ps:'remember command as "start"\nmatch command against\n  "start" -> show "starting"\n  "stop" -> show "stopping"\n  otherwise -> show "unknown"\ndone',js:'let command = "start";\nswitch (command) {\n  case "start":\n    console.log("starting");\n    break;\n  case "stop":\n    console.log("stopping");\n    break;\n  default:\n    console.log("unknown");\n    break;\n}'},
  {cat:"data",name:"Regular Expressions",desc:"Match text patterns with regex",ps:'remember email as "ayo@test.com"\nmatch pattern "(\\w+)@(\\w+)" in email as parts\nshow parts',js:'let email = "ayo@test.com";\nlet parts = email.match(new RegExp("(\\\\w+)@(\\\\w+)"));\nconsole.log(parts);'},
  {cat:"data",name:"Dynamic Property Access",desc:"Use a variable as an object key",ps:'remember key as "name"\nremember user as {name: "Ayo", age: 25}\nremember value as user[key]\nshow value',js:'let key = "name";\nlet user = { "name": "Ayo", "age": 25 };\nlet value = user[key];\nconsole.log(value);'},
  {cat:"async",name:"Parallel Async",desc:"Run multiple async operations concurrently",ps:'to slowJob()\n  sleep(10)\n  give "slow"\ndone\nto fastJob()\n  sleep(5)\n  give "fast"\ndone\nremember results as all of [slowJob(), fastJob()]\nshow results',js:'const results = await Promise.all([slowJob(), fastJob()]);\nconsole.log(results);'},
  {cat:"async",name:"Event Emitter",desc:"Create decoupled publish/subscribe systems",ps:'emit "user.login" with user\n\nwhen "user.login" happens as data\n  show `User logged in: ${data}`\ndone',js:'__emitter.emit("user.login", user);\n\n__emitter.on("user.login", (data) => {\n  console.log(`User logged in: ${data}`);\n});',skipRun:true},
  {cat:"async",name:"Stream Processing",desc:"Process large files line by line without loading into memory",ps:'stream "data.csv" as line\n  show line\ndone',js:'await __streamFile("data.csv", async (line) => {\n  console.log(line);\n});'},
  {cat:"async",name:"Worker Threads",desc:"Run operations in parallel for faster execution",ps:'run in parallel\n  remember a as wait for slowJob()\n  remember b as wait for fastJob()\ndone as results',js:'const results = await Promise.all([(async () => {\n  let a = (await slowJob());\n  let b = (await fastJob());\n})()]);',skipRun:true},
  {cat:"errors",name:"Typed Error Recovery",desc:"Catch specific error types separately",ps:'try\n  riskyOperation()\nrecover when err catches "TypeError"\n  show "type error"\nrecover when err catches "NetworkError"\n  show "network error"\nrecover\n  show "other error"\ndone',js:'try {\n  riskyOperation();\n} catch (err) {\n  if (err instanceof TypeError) {\n    console.log("type error");\n  }\n  else if (err instanceof NetworkError) {\n    console.log("network error");\n  }\n  else {\n    console.log("other error");\n  }\n}',skipRun:true},
  {cat:"functions",name:"Default Parameters",desc:"Provide fallback values for function arguments",ps:'to greet(name, greeting as "Hello")\n  show `${greeting}, ${name}!`\ndone\n\ngreet("Ayo")\ngreet("Ayo", "Hey")',js:'function greet(name, greeting = "Hello") {\n  console.log(`${greeting}, ${name}!`);\n}\n\ngreet("Ayo");\ngreet("Ayo", "Hey");'},
  {cat:"conditionals",name:"Else-If Chain",desc:"Test several conditions in order with otherwise if",ps:'remember score as 85\n\nif score is above 80\n  show "grade A"\notherwise if score is above 60\n  show "grade B"\notherwise\n  show "grade C"\ndone',js:'let score = 85;\nif (score > 80) {\n  console.log("grade A");\n} else if (score > 60) {\n  console.log("grade B");\n} else {\n  console.log("grade C");\n}'},
  {cat:"conditionals",name:"Nested If",desc:"Nest an if inside another branch",ps:'remember a as 2\nif a is 1\n  show "one"\notherwise\n  if a is 2\n    show "two"\n  done\ndone',js:'let a = 2;\nif (a === 1) {\n  console.log("one");\n} else {\n  if (a === 2) console.log("two");\n}'},
  {cat:"pattern",name:"Match Against Cases",desc:"Switch on a value against string, number, or boolean cases",ps:'remember color as "green"\n\nmatch color against\n  "red" -> show "stop"\n  "green" -> show "go"\n  otherwise -> show "hold"\ndone',js:'let color = "green";\nswitch (color) {\n  case "red": console.log("stop"); break;\n  case "green": console.log("go"); break;\n  default: console.log("hold");\n}'},
  {cat:"pattern",name:"Match Numbers",desc:"Switch on numeric cases",ps:'remember n as 2\nmatch n against\n  1 -> show "one"\n  2 -> show "two"\n  otherwise -> show "many"\ndone',js:'let n = 2;\nswitch (n) {\n  case 1: console.log("one"); break;\n  case 2: console.log("two"); break;\n  default: console.log("many");\n}'},
  {cat:"pattern",name:"Match Booleans",desc:"Switch on boolean cases",ps:'remember flag as true\nmatch flag against\n  true -> show "switched on"\n  false -> show "off"\ndone',js:'let flag = true;\nswitch (flag) {\n  case true: console.log("switched on"); break;\n  case false: console.log("off");\n}'},
  {cat:"regex",name:"Regex Match",desc:"Capture regex groups from text",ps:'match pattern "(\\\\d+)-(\\\\d+)" in "order 12-34" as m\nshow m[1]\nshow m[2]',js:'const m = "order 12-34".match(new RegExp("(\\\\d+)-(\\\\d+)"));\nconsole.log(m[1]);\nconsole.log(m[2]);'},
  {cat:"regex",name:"Regex Replace",desc:"Replace every regex match in a string",ps:'show regexReplace("a1b2c3", "\\\\d", "#")',js:'console.log("a1b2c3".replace(new RegExp("\\\\d", "g"), "#"));'},
  {cat:"regex",name:"Regex Split",desc:"Split on a regex pattern",ps:'remember parts as split("a1b2", "\\\\d")\nshow parts',js:'let parts = "a1b2".split(/\\d/);\nconsole.log(parts);'},
  {cat:"concurrency",name:"All Of (Promise.all)",desc:"Await every promise and collect results",ps:'to fetchA()\n  give "a"\ndone\nto fetchB()\n  give "b"\ndone\nremember both as all of [fetchA(), fetchB()]\nshow both',js:'let both = await Promise.all([fetchA(), fetchB()]);\nconsole.log(both);'},
  {cat:"concurrency",name:"Any Of (Promise.race)",desc:"Resolve with the first promise to settle",ps:'to slow()\n  give "slow"\ndone\nto fast()\n  give "fast"\ndone\nremember winner as any of [slow(), fast()]\nshow winner',js:'let winner = await Promise.race([slow(), fast()]);\nconsole.log(winner);'},
  {cat:"concurrency",name:"Settled Of (Promise.allSettled)",desc:"Await all promises; each yields status/value/reason",ps:'to ok(x)\n  give x\ndone\nremember s as settled of [ok(1), ok(2)]\nshow s[0].status\nshow s[1].value',js:'let s = await Promise.allSettled([ok(1), ok(2)]);\nconsole.log(s[0].status);\nconsole.log(s[1].value);'},
  {cat:"concurrency",name:"With Timeout",desc:"Reject a promise if it does not settle in time",ps:'to job()\n  sleep(500)\n  give "done"\ndone\nremember r as withTimeout(job(), 100)\nshow "finished"',js:'let r = await __withTimeout(job(), 100);\nconsole.log("finished");'},
  {cat:"async",name:"Await (wait for)",desc:"Await a promise to get its resolved value",ps:'to fetchData()\n  give 42\ndone\nremember value as wait for fetchData()\nshow value',js:'let value = (await fetchData());\nconsole.log(value);'},
  {cat:"async",name:"Run in Parallel",desc:"Run blocks concurrently and collect results",ps:'run in parallel\n  show "task1"\n  show "task2"\ndone as results',js:'const results = await Promise.all([(async () => { console.log("task1"); console.log("task2"); })()]);'},
  {cat:"async",name:"Stream File",desc:"Process a file line by line without loading it whole",ps:'stream "data.csv" as line\n  show line\ndone',js:'await __streamFile("data.csv", async (line) => { console.log(line); });'},
  {cat:"generators",name:"Yield Generator",desc:"yield inside make makes a generator",ps:'to countUp(n)\n  remember i as 0\n  while i is less than n\n    i becomes i + 1\n    yield i\n  done\ndone\nshow spread of countUp(3)',js:'function* countUp(n) {\n  let i = 0;\n  while (i < n) { i = i + 1; yield i; }\n}\nconsole.log([...countUp(3)]);'},
  {cat:"generators",name:"Spread Of",desc:"Materialize any iterable into a fresh array",ps:'show spread of "abc"\nshow spread of [1, 2, 3]',js:'console.log([..."abc"]);\nconsole.log([...[1, 2, 3]]);'},
  {cat:"reflection",name:"Type Of",desc:"Classify a value by its PlainScript type",ps:'show typeOf("hi")\nshow typeOf(42)\nshow typeOf(true)\nshow typeOf([])\nshow typeOf({})\nshow typeOf(null)',js:'show typeOf -> text, number, boolean, array, record, null'},
  {cat:"reflection",name:"Fields Of",desc:"List the keys of a record",ps:'remember u as {name: "A", age: 2}\nshow fieldsOf(u)',js:'show Object.keys(u)'},
  {cat:"reflection",name:"Has Field",desc:"Check a record has a key without tripping on prototypes",ps:'remember u as {name: "A"}\nshow hasField(u, "name")\nshow hasField(u, "age")',js:'console.log(hasField(u, "name"));\nconsole.log(hasField(u, "age"));'},
  {cat:"reflection",name:"Value Of",desc:"Read a field with a fallback if missing",ps:'remember u as {name: "A"}\nshow valueOf(u, "age", 0)',js:'show valueOf(u, "age", 0) // -> 0'},
  {cat:"reflection",name:"Size Of",desc:"Length of a string/array, key count of a record",ps:'show sizeOf([1, 2, 3])\nshow sizeOf("abc")\nshow sizeOf({a: 1, b: 2})',js:'show 3, 3, 2'},
  {cat:"binary",name:"Base64 Encode / Decode",desc:"Round-trip text with base64",ps:'show base64Encode("hello")\nshow base64Decode("aGVsbG8=")',js:'show Buffer "aGVsbG8="'},
  {cat:"binary",name:"Bytes <-> Text",desc:"Convert text to a UTF-8 buffer and back",ps:'remember buf as textToBytes("hi")\nshow bytesToText(buf)',js:'show Buffer.from("hi","utf8") -> "hi"'},
  {cat:"binary",name:"Hashing",desc:"Compute sha256 / sha1 / md5 hex digests",ps:'show sha256("abc")\nshow sha1("abc")\nshow md5("abc")',js:'show crypto digests (hex)'},
  {cat:"binary",name:"Read / Write Bytes",desc:"Read and write raw binary files",ps:'writeBytes("out.bin", textToBytes("hi"))\nremember buf as readBytes("out.bin")\nshow bytesToText(buf)',js:'fs.writeFileSync("out.bin", Buffer.from("hi"));\nlet buf = fs.readFileSync("out.bin");\nconsole.log(buf.toString())'},
  {cat:"booleans",name:"Null Coalesce",desc:"Pick the first value that is not null or undefined",ps:'remember config as {theme: null}\nremember theme as coalesce(theme of config, "light")\nshow theme',js:'let theme = (config.theme ?? "light");\nconsole.log(theme);'},
  {cat:"datetime",name:"Parse Date",desc:"Turn a date string into milliseconds since the epoch",ps:'remember ms as parseDate("2020-01-02")\nshow ms',js:'show Date.parse("2020-01-02")'},
  {cat:"datetime",name:"Format Date",desc:"Format milliseconds/Date with a pattern",ps:'remember ms as parseDate("2020-01-02")\nshow formatDate(ms, "DD/MM/YYYY")',js:'show formatDate -> "02/01/2020"'},
  {cat:"config",name:"Load Env File",desc:"Apply KEY=VALUE pairs from a .env file",ps:'load env file ".env"\nshow env("PORT")',js:'__loadEnvFile(".env");\nconsole.log(process.env["PORT"]);'},
  {cat:"config",name:"YAML Decode",desc:"Parse a YAML subset into a record",ps:'remember cfg as yamlDecode("name: Ada\\nport: 3000\\n")\nshow cfg.name',js:'show __yamlParse text -> record'},
  {cat:"config",name:"YAML Encode",desc:"Serialize a record to YAML lines",ps:'remember text as yamlEncode({name: "Ada", port: 3000})\nshow text',js:'show __yamlStringify record -> text'},
  {cat:"process",name:"Command-Line Args",desc:"Read command-line arguments after the script name",ps:'show args()',js:'show process.argv.slice(2)'},
  {cat:"process",name:"Run Command",desc:"Run an external command and capture its output",ps:'remember r as runCommand("node", ["-e", "console.log(2+2)"])\nshow r.ok\nshow r.stdout',js:'let r = await __runCommand("node", ["-e", "console.log(2+2)"]);\nconsole.log(r.ok);\nconsole.log(r.stdout);'},
  {cat:"process",name:"Load Module",desc:"Dynamically require a module at runtime",ps:'remember m as loadModule("./my-module")\nshow "loaded"',js:'let m = __loadModule("./my-module");\nconsole.log("loaded");'},
  {cat:"filesystem",name:"File Metadata",desc:"Get size, type, and modified time of a file",ps:'show fileSize("data.txt")\nshow fileType("data.txt")\nshow lastModified("data.txt")',js:'show fs.statSync("data.txt").size / isDirectory / mtime'},
  {cat:"filesystem",name:"Walk Folder",desc:"Recursively list every file path under a folder",ps:'for each f in walkFolder("src")\n  show f\ndone',js:'for (const f of __walkFolder("src")) console.log(f);'},
  {cat:"filesystem",name:"Append Line",desc:"Append a line terminated by a newline",ps:'writeLine("log.txt", "first")\nappendLine("log.txt", "second")',js:'fs.appendFileSync("log.txt", "first\\n", "utf8");\nfs.appendFileSync("log.txt", "second\\n", "utf8");'},
  {cat:"paths",name:"Join Path",desc:"Join path segments for the current OS",ps:'show joinPath("a", "b", "c")',js:'show path.join("a", "b", "c")'},
  {cat:"paths",name:"Base Name",desc:"Get the file name from a path",ps:'show baseName("/a/b.txt")',js:'show path.basename("/a/b.txt")'},
  {cat:"paths",name:"Folder Of",desc:"Get the directory part of a path",ps:'show folderOf("/a/b.txt")',js:'show path.dirname("/a/b.txt")'},
  {cat:"paths",name:"Extension Of",desc:"Get the extension of a path",ps:'show extensionOf("/a/b.txt")',js:'show path.extname("/a/b.txt")'},
  {cat:"data",name:"Map Helpers",desc:"A keyed collection via keyMap and friends",ps:'remember m as keyMap()\nmapSet(m, "user", "Ada")\nshow mapGet(m, "user")\nshow mapHas(m, "user")\nmapDelete(m, "user")',js:'let m = new Map();\n__mapSet(m, "user", "Ada");\nconsole.log(m.get("user"));\nconsole.log(m.has("user"));\nm.delete("user");'},
  {cat:"data",name:"Set Helpers",desc:"A de-duplicating collection via newSet and friends",ps:'remember s as newSet()\naddToSet(s, 1)\naddToSet(s, 1)\nshow setHas(s, 1) // true (dedup)',js:'let s = new Set();\ns.add(1);\ns.add(1);\nconsole.log(s.has(1));'},
  {cat:"testing",name:"Native Test Suite",desc:"Declare a test block with check assertions",ps:'test "addition"\n  check add(2, 3) equals 5\n  check "hello" contains "ell"\n  check 1 is 1\ndone\n\nto add(a, b)\n  give a + b\ndone',js:'const __tests = [];\n__tests.push(() => __check("equals", add(2,3), 5));\n__tests.push(() => __check("contains", "hello", "ell"));\n__tests.push(() => __check("is", 1, 1));\n__runTests();'},
  {cat:"testing",name:"Check Raises",desc:"Assert that an expression throws",ps:'test "invalid json"\n  check jsonDecode("not json") raises "JSON"\ndone',js:'__check("raises", () => JSON.parse("not json"), "JSON");'},
  {cat:"imports",name:"Export Symbol",desc:"Mark a top-level symbol for module.exports",ps:'remember version as 3\nexport version',js:'module.exports.version = 3;'},
  {cat:"ai",name:"OCR Image",desc:"Extract text from an image with tesseract.js",ps:'ocr "scan.png" as text\nshow text',js:'let text = await __ocr("scan.png", "eng");\nconsole.log(text);'},
  {cat:"ai",name:"OCR Language",desc:"Choose a language pack for OCR",ps:'ocr "scan.png" as text using "deu"\nshow text',js:'let text = await __ocr("scan.png", "deu");\nconsole.log(text);'},
  {cat:"logging",name:"Ask Input",desc:"Prompt for a line of terminal input",ps:'ask "Your name?" as name\nshow `Hello, ${name}`',js:'let name = await __ask("Your name?");\nconsole.log(`Hello, ${name}`);'},
  {cat:"data",name:"Gather (Map)",desc:"Transform every item in a collection",ps:'remember nums as [1, 2, 3]\ngather each n in nums giving n * 2\nshow nums',js:'nums = nums.map(n => n * 2);\nconsole.log(nums);'},
  {cat:"data",name:"Filter Items",desc:"Keep only items that match a condition",ps:'remember nums as [1, 2, 3, 4]\nfilter each n in nums when n is above 2\nshow nums',js:'nums = nums.filter(n => n > 2);\nconsole.log(nums);'},
  {cat:"data",name:"Total (Reduce)",desc:"Combine all items into one value",ps:'remember nums as [1, 2, 3]\ntotal each n in nums giving n\nshow nums',js:'nums = nums.reduce((sum, n) => sum + n, 0);\nconsole.log(nums);'},
  {cat:"errors",name:"Try / Recover",desc:"Catch errors raised inside a block",ps:'try\n  jsonDecode("not json")\nrecover as err\n  show "caught"\ndone',js:'try {\n  JSON.parse("not json");\n} catch (err) {\n  console.log("caught");\n}'},
  {cat:"errors",name:"Recover by Type",desc:"Catch specific error types with catches",ps:'try\n  jsonDecode("x")\nrecover when err catches "SyntaxError"\n  show "bad json"\nrecover\n  show "other"\ndone',js:'try {\n  JSON.parse("x");\n} catch (err) {\n  if (err instanceof SyntaxError) console.log("bad json");\n  else console.log("other");\n}'},
  {cat:"errors",name:"Retry",desc:"Retry a block a number of times",ps:'retry 3 times\n  show "attempt"\ndone',js:'for (let __i = 0; __i < 3; __i++) {\n  console.log("attempt");\n}'},
  {cat:"errors",name:"Retry with Delay",desc:"Retry with a delay between attempts",ps:'retry 3 times every 2 seconds\n  show "retrying"\ndone',js:'for (let __i = 0; __i < 3; __i++) {\n  console.log("retrying");\n  if (__i < 2) await __retrySleep(2000);\n}'},
  {cat:"errors",name:"Event Emitter",desc:"Publish and subscribe to named events",ps:'emit "user.login" with "Ada"\nwhen "user.login" happens as user\n  show `welcome ${user}`\ndone',js:'__emitter.emit("user.login", "Ada");\n__emitter.on("user.login", (user) => { console.log(`welcome ${user}`); });'},
  {cat:"http",name:"HTTP Headers & Timeout",desc:"Send HTTP requests with custom headers and timeout",ps:'remember r as get "https://api.example.com" headers { "x-key": "abc" } timeout 5000\nshow r.status',js:'let r = await __httpRequest("GET", url, { headers: {...}, timeoutMs: 5000 });\nconsole.log(r.status);',skipRun:true},
  {cat:"server",name:"Typed Server Routes",desc:"Start a web app with typed route accessors",ps:'web app\nroute get "/u/:id"\n  remember who as param("id")\n  remember page as query("page")\n  reply `user=${who} page=${page}`\ndone\nroute post "/check"\n  remember missing as validate(body of request, ["name"])\n  reply missing\ndone\nstart 3000',js:'const app = express();\napp.get("/u/:id", (req, res) => {\n  const who = req.params["id"];\n  const page = req.query["page"];\n  res.send(`user=${who} page=${page}`);\n});\napp.post("/check", (req, res) => {\n  res.send(__validate(req.body, ["name"]));\n});\napp.listen(3000);'},
  {cat:"auth",name:"Password Hashing",desc:"Hash and verify passwords (scrypt)",ps:'remember hash as hashPassword("secret123")\nshow checkPassword("secret123", hash)',js:'let hash = hashPassword("secret123");\nconsole.log(checkPassword("secret123", hash));'},
  {cat:"auth",name:"Signed Tokens",desc:"Create and verify HS256 JWTs",ps:'remember token as createToken({ role: "admin" }, "secret", 3600)\nremember claims as readToken(token, "secret")\nshow claims.role',js:'let token = createToken({ role: "admin" }, "secret", 3600);\nlet claims = readToken(token, "secret");\nconsole.log(claims.role);'},
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
