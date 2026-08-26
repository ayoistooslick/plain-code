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
