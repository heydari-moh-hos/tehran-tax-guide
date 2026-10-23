(() => {
  'use strict';
  const C = window.TAX_GUIDE_CONTENT;
  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalized = (value) => String(value).toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064B-\u065F]/g,'').replace(/[\u200c\s]+/g,' ').trim();
  const icons = {
    document:'<path d="M8 3h8l5 5v13H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M16 3v6h5M10 13h7M10 17h7"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/>',
    folder:'<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/><path d="M7 12h10M7 16h7"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6"/>',
    scale:'<path d="M12 3v18M5 7h14M3 19h18M5 7 2 13h6L5 7Zm14 0-3 6h6l-3-6Z"/>',
    id:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c0-2 6-2 6 0M15 10h3M15 14h3"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    check:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 10 2 2 4-4M8 16h8"/>'
  };
  const svg = (id) => `<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[id] || icons.document}</svg>`;
  let filter = 'all';
  let query = '';
  let toastTimer;
  let observer;

  const serviceById = (id) => C.services.find(s => s.id === id);
  const categories = Object.fromEntries(C.categories.map(cat => [cat.id, cat.title]));

  function notify(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function initRevealObserver() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }

  function revealElements(elements, step = 70) {
    if (!observer) return;
    elements.forEach((el, index) => {
      if (!el || el.classList.contains('in-view')) return;
      el.classList.add('reveal');
      el.style.setProperty('--delay', `${index * step}ms`);
      observer.observe(el);
    });
  }

  function revealStaticSections() {
    revealElements([
      $('.hero-main'), $('.hero-panel'), $('.notice'), $('.journey-section .section-head'), ...document.querySelectorAll('.journey-card'), $('.services-section .section-head'), $('.tools-line'), ...document.querySelectorAll('.spotlight-grid > *'),
      $('.wizard-intro'), $('.wizard-card'), $('.glossary-section .section-head'), ...document.querySelectorAll('.glossary-grid article'), $('.faq-aside'), $('.faq-content'), $('.contact-dark'), $('.contact-light'),
      $('.footer-content'), $('.footer-bottom')
    ].filter(Boolean), 55);
  }

  function renderFilters() {
    $('#filters').innerHTML = C.categories.map(cat =>
      `<button type="button" class="filter-btn ${cat.id === filter ? 'active' : ''}" data-filter="${cat.id}" aria-pressed="${cat.id === filter}">${cat.title}</button>`
    ).join('');
  }

  function renderServices() {
    const filtered = C.services.filter(s =>
      (filter === 'all' || s.category === filter) &&
      normalized([s.title, s.subtitle, s.tag, s.keywords, s.intro, ...s.docs].join(' ')).includes(normalized(query))
    );

    $('#service-grid').innerHTML = filtered.map(s =>
      `<article class="service-card">
        <div class="service-card-top"><span class="card-icon">${svg(s.icon)}</span><span class="card-number">${s.number} / ${C.services.length.toLocaleString('fa-IR').padStart(2,'۰')}</span></div>
        <h3>${escapeHTML(s.title)}</h3>
        <p>${escapeHTML(s.subtitle)}</p>
        <div class="card-bottom"><span class="card-tag">${escapeHTML(s.tag)}</span><button type="button" class="card-link" data-service="${s.id}" aria-label="نمایش مراحل ${escapeHTML(s.title)}">مشاهده مراحل <span aria-hidden="true">←</span></button></div>
      </article>`
    ).join('');

    $('#service-empty').hidden = filtered.length !== 0;
    revealElements([...document.querySelectorAll('.service-card')], 65);
  }

  function renderFaqs(term = '') {
    const items = C.faqs.filter(x => normalized(x.q + ' ' + x.a).includes(normalized(term)));
    $('#faq-list').innerHTML = items.map((x) => `<details><summary>${escapeHTML(x.q)}</summary><p>${escapeHTML(x.a)}</p></details>`).join('');
    $('#faq-empty').hidden = !!items.length;
    revealElements([...document.querySelectorAll('.faq-list details')], 50);
  }

  function setSearch(value) {
    query = value;
    $('#hero-search').value = value;
    $('#service-search').value = value;
    renderServices();
  }

  function navigateService(id) {
    if (serviceById(id)) window.location.hash = 'service/' + id;
  }

  function savedProgress(id) {
    try { return JSON.parse(sessionStorage.getItem('tax-guide-progress-' + id) || '[]'); } catch { return []; }
  }

  function storeProgress(id, checked) {
    try { sessionStorage.setItem('tax-guide-progress-' + id, JSON.stringify(checked)); } catch {}
  }

  function updateProgress(id) {
    const checks = [...document.querySelectorAll('#detail-steps .step-check')];
    const complete = checks.filter(c => c.checked).length;
    $('#detail-progress').textContent = `${complete.toLocaleString('fa-IR')} از ${checks.length.toLocaleString('fa-IR')} مرحله`;
    $('#detail-progress-bar').style.width = ((complete / checks.length) * 100) + '%';
    checks.forEach(c => c.closest('.step-item').classList.toggle('done', c.checked));
    storeProgress(id, checks.filter(c => c.checked).map(c => Number(c.value)));
  }

  function renderDetail(id) {
    const s = serviceById(id);
    if (!s) return false;

    $('#detail-crumb').textContent = s.title;
    $('#detail-category').textContent = categories[s.category] + ' • ' + s.tag;
    $('#detail-title').textContent = s.title;
    $('#detail-intro').textContent = s.intro;
    $('#detail-warning').innerHTML = '<strong>پیش از اقدام توجه کنید</strong>' + escapeHTML(s.warning);

    const saved = savedProgress(id);
    $('#detail-steps').innerHTML = s.steps.map(([title, desc], i) =>
      `<div class="step-item">
        <input type="checkbox" class="step-check" id="step-${id}-${i}" value="${i}" ${saved.includes(i) ? 'checked' : ''} aria-label="انجام شد: ${escapeHTML(title)}">
        <div class="step-body"><label for="step-${id}-${i}">مرحله ${(i + 1).toLocaleString('fa-IR')}: ${escapeHTML(title)}</label><p>${escapeHTML(desc)}</p></div>
      </div>`
    ).join('');

    $('#detail-docs').innerHTML = s.docs.map(d => `<li>${escapeHTML(d)}</li>`).join('');
    $('#detail-law').textContent = s.law + ' ↗';
    $('#detail-law').href = s.lawUrl;
    $('#detail-note').textContent = s.note;
    $('#detail-steps').onchange = (e) => { if (e.target.matches('.step-check')) updateProgress(id); };
    updateProgress(id);

    $('#detail-share').onclick = async () => {
      const url = window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: s.title, url });
          return;
        }
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          notify('پیوند این راهنما کپی شد.');
          return;
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
      window.prompt('پیوند راهنما را کپی کنید:', url);
    };
    $('#detail-print').onclick = () => window.print();

    revealElements([
      $('.breadcrumb'), $('.detail-top'), $('#detail-warning'), ...document.querySelectorAll('.detail-content-block'), ...document.querySelectorAll('.side-box'), $('.back-services')
    ].filter(Boolean), 55);

    return true;
  }

  function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    const match = hash.match(/^service\/([a-z-]+)$/);
    if (match && renderDetail(match[1])) {
      $('#home-view').hidden = true;
      $('#detail-view').hidden = false;
      document.title = $('#detail-title').textContent + ' | راهنمای دادرسی مالیاتی';
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      $('#home-view').hidden = false;
      $('#detail-view').hidden = true;
      document.title = 'راهنمای مراجعه‌کنندگان | دادرسی مالیاتی تهران';
      if (hash && hash !== 'home') {
        const target = document.getElementById(hash);
        if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } else if (hash === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      revealStaticSections();
      revealElements([...document.querySelectorAll('.service-card')], 65);
      revealElements([...document.querySelectorAll('.faq-list details')], 50);
    }
    closeMenu();
  }

  function closeMenu() {
    const nav = $('#mobile-nav');
    nav.hidden = true;
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
    $('#menu-toggle').setAttribute('aria-label', 'بازکردن فهرست');
  }

  document.addEventListener('click', (e) => {
    const service = e.target.closest('[data-service]');
    if (service) { navigateService(service.dataset.service); return; }

    const search = e.target.closest('[data-search]');
    if (search) {
      setSearch(search.dataset.search);
      location.hash = 'services';
      return;
    }

    const category = e.target.closest('[data-filter]');
    if (category) {
      filter = category.dataset.filter;
      renderFilters();
      renderServices();
      return;
    }

    const wizard = e.target.closest('[data-suggest]');
    if (wizard) {
      const s = serviceById(wizard.dataset.suggest);
      if (!s) return;
      $('#wizard-options').hidden = true;
      const target = $('#wizard-result');
      target.hidden = false;
      target.innerHTML = `<small>راهنمای پیشنهادی برای شما</small><h4>${escapeHTML(s.title)}</h4><p>${escapeHTML(s.subtitle)}</p><div class="result-actions"><button type="button" data-service="${s.id}">دیدن مراحل خدمت ←</button><button type="button" class="outline" id="wizard-reset">انتخاب دوباره</button></div>`;
      revealElements([target], 0);
      return;
    }

    if (e.target.closest('#wizard-reset')) {
      $('#wizard-options').hidden = false;
      $('#wizard-result').hidden = true;
      return;
    }

    if (e.target.closest('#reset-search')) {
      filter = 'all';
      setSearch('');
      renderFilters();
      return;
    }

    if (e.target.closest('#mobile-nav a')) closeMenu();
  });

  $('#hero-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    setSearch($('#hero-search').value);
    location.hash = 'services';
    if (location.hash === '#services') $('#services').scrollIntoView({ behavior: 'smooth' });
  });

  $('#service-search').addEventListener('input', (e) => setSearch(e.target.value));
  $('#faq-search').addEventListener('input', (e) => renderFaqs(e.target.value));
  $('#menu-toggle').addEventListener('click', () => {
    const nav = $('#mobile-nav');
    nav.hidden = !nav.hidden;
    $('#menu-toggle').setAttribute('aria-expanded', String(!nav.hidden));
    $('#menu-toggle').setAttribute('aria-label', nav.hidden ? 'بازکردن فهرست' : 'بستن فهرست');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('hashchange', route);
  const scrollUpdate = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const y = Math.max(window.scrollY, 0);
    $('#scroll-progress').style.width = Math.min(100, (y / max) * 100) + '%';
    $('.site-header').classList.toggle('scrolled', y > 24);
    $('#to-top').hidden = y < 680 || !!location.hash.match(/^#service\//);
    const sections = ['home','journey','services','wizard','faq'].map(id => document.getElementById(id)).filter(Boolean);
    const active = [...sections].reverse().find(el => el.getBoundingClientRect().top < 160);
    document.querySelectorAll('.mobile-dock a').forEach(a => a.classList.toggle('is-active', active && a.getAttribute('href') === '#'+active.id));
  };
  window.addEventListener('scroll', scrollUpdate, { passive:true });
  window.addEventListener('resize', scrollUpdate);
  window.addEventListener('hashchange', () => requestAnimationFrame(scrollUpdate));

  initRevealObserver();
  renderFilters();
  renderServices();
  renderFaqs();
  revealStaticSections();
  route();
  scrollUpdate();
})();
