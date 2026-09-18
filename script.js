(() => {
  'use strict';
  const languageKey = 'portfolioLang';
  let currentLang = 'en';
  try {
    const stored = localStorage.getItem(languageKey);
    if (stored === 'en' || stored === 'zh') currentLang = stored;
  } catch { /* The site also works when browser storage is unavailable. */ }

  const text = (en, zh) => currentLang === 'zh' ? zh : en;
  const translated = (element, field) => element.dataset[field + (currentLang === 'zh' ? 'Zh' : 'En')] || '';
  const navbar = document.querySelector('.navbar');
  const menu = document.querySelector('.menu-toggle');
  function closeMenu() {
    navbar?.classList.remove('menu-open');
    menu?.setAttribute('aria-expanded', 'false');
  }
  menu?.addEventListener('click', () => {
    const open = navbar.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if (!navbar?.contains(event.target)) closeMenu();
  });
  navbar?.addEventListener('focusout', event => {
    if (!navbar.contains(event.relatedTarget)) closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMenu();
  });

  // One controller preserves focus and background state for every dialog.
  let activeDialog = null;
  let returnFocus = null;
  let activeItem = null;
  let previousOverflow = '';
  let backgroundState = [];
  function openDialog(dialog, trigger, item) {
    if (!dialog) return;
    if (activeDialog) closeDialog();
    closeMenu();
    activeDialog = dialog;
    activeItem = item;
    returnFocus = trigger;
    previousOverflow = document.body.style.overflow;
    backgroundState = [...document.body.children]
      .filter(element => element !== dialog && !['SCRIPT', 'STYLE'].includes(element.tagName))
      .map(element => ({element, inert: element.inert}));
    backgroundState.forEach(({element}) => { element.inert = true; });
    dialog.classList.add('active');
    dialog.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.modal-box, .photo-modal-box')?.scrollTo(0, 0);
    dialog.querySelector('.modal-close')?.focus();
  }
  function closeDialog() {
    if (!activeDialog) return;
    const dialog = activeDialog;
    activeDialog = null;
    activeItem = null;
    dialog.classList.remove('active');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.querySelectorAll('video').forEach(video => video.pause());
    dialog.querySelectorAll('.media-list, .modal-cover').forEach(element => element.replaceChildren());
    dialog.querySelector('#photoModalImg')?.removeAttribute('src');
    document.body.style.overflow = previousOverflow;
    backgroundState.forEach(({element, inert}) => { element.inert = inert; });
    backgroundState = [];
    returnFocus?.focus();
    returnFocus = null;
  }
  document.querySelectorAll('.modal').forEach(dialog => {
    dialog.querySelector('.modal-close')?.addEventListener('click', closeDialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (activeDialog) { event.preventDefault(); closeDialog(); }
      else if (navbar?.classList.contains('menu-open')) { closeMenu(); menu.focus(); }
    }
    if (event.key !== 'Tab' || !activeDialog) return;
    const focusable = [...activeDialog.querySelectorAll('button, a[href], iframe, video[controls], [tabindex="0"]')]
      .filter(element => !element.disabled && element.getClientRects().length);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });

  function safeURL(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      if (['https:', 'http:'].includes(url.protocol) ||
          (location.protocol === 'file:' && url.protocol === 'file:')) return url.href;
    } catch { /* Invalid author-supplied path. */ }
    return null;
  }
  function parseMedia(value) {
    try {
      const items = JSON.parse(value || '[]');
      return Array.isArray(items) ? items.filter(item => item &&
        ['video', 'embed', 'image', 'pdf', 'link'].includes(item.type) && safeURL(item.src)) : [];
    } catch { return []; }
  }
  function bilingual(element, en, zh) {
    element.dataset.en = en;
    element.dataset.zh = zh;
    element.textContent = text(en, zh);
    return element;
  }
  function mediaLabel(item) {
    return currentLang === 'zh' ? item.labelZh || item.label || '作品材料' : item.labelEn || item.label || 'Work sample';
  }
  function addLink(wrapper, href, en, zh) {
    const link = bilingual(document.createElement('a'), en, zh);
    link.className = 'media-link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    wrapper.append(link);
  }
  function renderMediaList(container, items) {
    container.replaceChildren();
    if (!items.length) {
      container.append(bilingual(document.createElement('p'), 'No media available.', '暂无可展示的材料。'));
      return;
    }
    items.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.className = 'media-item media-item--' + item.type;
      const src = safeURL(item.src);
      const labelEn = item.labelEn || item.label || 'Work sample';
      const labelZh = item.labelZh || item.label || '作品材料';
      if (item.type === 'link') {
        addLink(wrapper, src, labelEn + ' ↗', labelZh + ' ↗');
      } else {
        let media;
        if (item.type === 'image') {
          media = document.createElement('img');
          media.alt = mediaLabel(item);
          media.loading = 'lazy';
          media.decoding = 'async';
        } else if (item.type === 'video') {
          media = document.createElement('video');
          media.controls = true;
          media.playsInline = true;
          media.preload = 'metadata';
        } else {
          media = document.createElement('iframe');
          media.title = mediaLabel(item);
          media.loading = 'lazy';
          if (item.type === 'embed') media.allowFullscreen = true;
        }
        media.dataset.titleEn = labelEn;
        media.dataset.titleZh = labelZh;
        media.src = src;
        if (item.type === 'embed') {
          const frame = document.createElement('div');
          frame.className = 'embed-wrap';
          frame.append(media);
          wrapper.append(frame);
        } else wrapper.append(media);
        const label = bilingual(document.createElement('div'), labelEn, labelZh);
        label.className = 'media-label';
        wrapper.append(label);
        if (item.type === 'pdf') addLink(wrapper, src, 'Open PDF ↗', '打开 PDF ↗');
        if (item.type === 'image') addLink(wrapper, src, 'View full-size image ↗', '查看原图 ↗');
        if (item.type === 'video') addLink(wrapper, src, 'Open video ↗', '打开视频 ↗');
        if (item.type === 'embed') {
          const url = new URL(src);
          const bvid = url.searchParams.get('bvid');
          if (url.hostname === 'player.bilibili.com' && /^BV[\w]+$/.test(bvid || '')) {
            addLink(wrapper, 'https://www.bilibili.com/video/' + bvid + '/', 'Watch on Bilibili ↗', '在哔哩哔哩观看 ↗');
          }
        }
      }
      container.append(wrapper);
    });
  }

  const cards = [...document.querySelectorAll('.project-card')];
  const filters = [...document.querySelectorAll('.filter-btn')];
  const filterStatus = document.querySelector('.filter-status');
  function updateFilterStatus() {
    if (filterStatus) {
      const count = cards.filter(card => !card.hidden).length;
      filterStatus.textContent = text(`${count} projects`, `${count} 个项目`);
    }
  }
  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(filter => {
      const selected = filter === button;
      filter.classList.toggle('active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    cards.forEach(card => {
      const categories = (card.dataset.category || '').split(/\s+/);
      card.hidden = button.dataset.filter !== 'all' && !categories.includes(button.dataset.filter);
    });
    updateFilterStatus();
  }));

  const projectDialog = document.getElementById('projectModal');
  cards.forEach(card => {
    const show = () => {
      if (!projectDialog) return;
      document.getElementById('modalTitle').textContent = translated(card, 'title');
      document.getElementById('modalDesc').textContent = translated(card, 'desc');
      const cover = document.createElement('img');
      const src = safeURL(card.dataset.cover);
      if (src) cover.src = src;
      cover.alt = translated(card, 'title');
      document.getElementById('modalCover').replaceChildren(cover);
      renderMediaList(document.getElementById('modalMediaList'), parseMedia(card.dataset.media));
      openDialog(projectDialog, card, card);
    };
    card.addEventListener('click', show);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(); }
    });
  });
  const workDialog = document.getElementById('workModal');
  document.querySelectorAll('.work-card').forEach(card => {
    const button = card.querySelector('.work-sample-btn');
    button?.addEventListener('click', () => {
      if (!workDialog) return;
      document.getElementById('workModalTitle').textContent = translated(card, 'title');
      renderMediaList(document.getElementById('workModalMediaList'), parseMedia(card.dataset.media));
      openDialog(workDialog, button, card);
    });
  });
  const photoDialog = document.getElementById('photoModal');
  document.querySelectorAll('.photo-open').forEach(button => {
    button.addEventListener('click', () => {
      if (!photoDialog) return;
      const image = document.getElementById('photoModalImg');
      const src = safeURL(button.dataset.src);
      if (src) image.src = src;
      image.alt = translated(button, 'title');
      document.getElementById('photoModalTitle').textContent = translated(button, 'title');
      document.getElementById('photoModalDesc').textContent = translated(button, 'desc');
      const original = document.getElementById('photoOriginal');
      if (original && src) original.href = src;
      openDialog(photoDialog, button, button);
    });
  });

  function setLanguage(language) {
    currentLang = language === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem(languageKey, currentLang); } catch { /* Optional preference. */ }
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach(element => {
      element.textContent = element.dataset[currentLang];
    });
    document.querySelectorAll('[data-aria-en][data-aria-zh]').forEach(element => {
      element.setAttribute('aria-label', element.dataset[currentLang === 'zh' ? 'ariaZh' : 'ariaEn']);
    });
    document.querySelectorAll('.lang-btn').forEach(button => {
      button.textContent = text('中文', 'EN');
      button.setAttribute('aria-label', text('切换到中文', 'Switch to English'));
    });
    document.title = 'WU Jiaqian | ' + text(document.body.dataset.pageEn, document.body.dataset.pageZh);
    if (activeDialog && activeItem) {
      activeDialog.querySelector('h2').textContent = translated(activeItem, 'title');
      const description = activeDialog.querySelector('#modalDesc, #photoModalDesc');
      if (description) description.textContent = translated(activeItem, 'desc');
      activeDialog.querySelectorAll('iframe[data-title-en], img[data-title-en]').forEach(media => {
        media.setAttribute(media.tagName === 'IMG' ? 'alt' : 'title', translated(media, 'title'));
      });
      activeDialog.querySelector('#photoModalImg, .modal-cover img')?.setAttribute('alt', translated(activeItem, 'title'));
    }
    updateFilterStatus();
  }
  document.querySelectorAll('.lang-btn').forEach(button => button.addEventListener('click', () => {
    setLanguage(currentLang === 'en' ? 'zh' : 'en');
  }));
  setLanguage(currentLang);
  // Content remains visible even if scripts or animation APIs fail.
  document.documentElement.classList.add('js-ready');
})();
