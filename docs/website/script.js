/* PLIN v0.1.7 — Documentation Website JS */

/* ── Copy buttons ────────────────────────────────────────────────────────── */
function initCopyButtons() {
  document.querySelectorAll('.code-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.code-block');
      const pre   = block ? block.querySelector('pre') : null;
      if (!pre) return;

      const text = pre.innerText.trim();
      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });

  /* install-strip copy buttons */
  document.querySelectorAll('.install-cmd button').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.closest('.install-cmd');
      const text = cmd ? cmd.querySelector('code').innerText.trim() : '';
      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

/* ── Mobile menu ─────────────────────────────────────────────────────────── */
function initMobileMenu() {
  const toggle = document.getElementById('nav-hamburger');
  const menu   = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  const setOpen = open => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.querySelector('i').className = open
      ? 'fa-solid fa-xmark'
      : 'fa-solid fa-bars';
    document.body.classList.toggle('menu-open', open);
  };
  const isOpen = () => menu.classList.contains('open');

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  /* close on link click */
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setOpen(false));
  });

  /* close with Escape */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });

  /* close if the viewport grows past the breakpoint */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 800 && isOpen()) setOpen(false);
  });
}

/* ── FAQ accordion ───────────────────────────────────────────────────────── */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item    = btn.closest('.faq-item');
      const isOpen  = item.classList.contains('open');

      /* close all others */
      document.querySelectorAll('.faq-item.open').forEach(o => {
        if (o !== item) o.classList.remove('open');
      });

      item.classList.toggle('open', !isOpen);
    });
  });
}

/* ── Active nav link on scroll ───────────────────────────────────────────── */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a[href^="#"]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      links.forEach(a => {
        const active = a.getAttribute('href') === `#${id}`;
        a.classList.toggle('active', active);
        a.style.color = active ? 'var(--text)' : '';
      });
    });
  }, { rootMargin: '-50% 0px -45% 0px' });

  sections.forEach(s => observer.observe(s));
}

/* ── Scroll progress bar ─────────────────────────────────────────────────── */
function initScrollProgress() {
  let bar = document.getElementById('scroll-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
  }
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    bar.style.width = max > 0 ? `${(doc.scrollTop / max) * 100}%` : '0';
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ── Back to top button ──────────────────────────────────────────────────── */
function initBackToTop() {
  let btn = document.getElementById('to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'to-top';
    btn.className = 'to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    document.body.appendChild(btn);
  }
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const toggle = () => {
    btn.classList.toggle('visible', window.scrollY > 480);
  };
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
}

/* ── Reveal on scroll ────────────────────────────────────────────────────── */
function initReveal() {
  /* Skip entirely if the user prefers reduced motion (CSS also guards). */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll(
    '.section > .container > .section-tag, .section > .container > .section-title, .section > .container > .section-lead'
  );
  targets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(el => observer.observe(el));
}

/* ── Smooth scroll nav highlight on click ────────────────────────────────── */
function initNavLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ── Boot ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initMobileMenu();
  initFAQ();
  initScrollSpy();
  initNavLinks();
  initScrollProgress();
  initBackToTop();
  initReveal();
});
