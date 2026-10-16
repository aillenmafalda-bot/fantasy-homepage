(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let projects = [], heroIndex = 0, currentProject = null, imageIndex = 0, returnFocus = null, lastImageRequest = 0;
  const gallery = $('gallery');

  document.querySelector('.menu-toggle').addEventListener('click', e => {
    const button = e.currentTarget;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    $('mobile-nav').hidden = !open;
  });
  document.querySelectorAll('#mobile-nav a').forEach(link => link.addEventListener('click', () => {
    $('mobile-nav').hidden = true;
    document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
    document.querySelector('.menu-toggle').setAttribute('aria-label', '打开导航菜单');
  }));

  function makeProject(project) {
    const article = document.createElement('article');
    article.className = 'project-card';
    article.dataset.project = project.id;
    const button = document.createElement('button');
    button.className = 'project-button';
    button.setAttribute('aria-label', `查看${project.title}图集`);
    const imageWrap = document.createElement('div');
    imageWrap.className = 'project-image';
    if (project.coverWidth && project.coverHeight) imageWrap.style.aspectRatio = `${project.coverWidth} / ${project.coverHeight}`;
    const img = document.createElement('img');
    Object.assign(img, {src: project.cover, alt: `${project.title}现场`, loading: 'lazy', decoding: 'async'});
    img.width = project.coverWidth || 1100; img.height = project.coverHeight || 733;
    imageWrap.append(img);
    const open = document.createElement('span');
    open.className = 'project-open';
    open.innerHTML = '查看图集 ' + arrow;
    imageWrap.append(open);
    const meta = document.createElement('div');
    meta.className = 'project-meta';
    const title = document.createElement('h3'); title.textContent = project.title;
    const category = document.createElement('p'); category.textContent = project.category;
    meta.append(title, category);
    const line = document.createElement('p'); line.className = 'project-line'; line.textContent = project.line;
    button.append(imageWrap, meta, line);
    button.addEventListener('click', () => openProject(project, button));
    article.append(button);
    return article;
  }

  function renderProjects(filter = 'all') {
    const visible = filter === 'all' ? projects : projects.filter(p => p.category === filter);
    const fragment = document.createDocumentFragment();
    visible.forEach(p => fragment.append(makeProject(p)));
    $('projects-grid').replaceChildren(fragment);
    $('projects-grid').setAttribute('aria-busy', 'false');
    $('work-count').textContent = `${visible.length} 个现场`;
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    renderProjects(button.dataset.filter);
  }));

  async function loadProjects() {
    $('project-load-error').hidden = true;
    $('projects-grid').setAttribute('aria-busy', 'true');
    try {
      const embedded = $('project-data');
      if (embedded) {
        projects = JSON.parse(embedded.textContent);
      } else {
        const response = await fetch('assets/projects.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        projects = await response.json();
      }
      renderProjects(document.querySelector('[data-filter].active').dataset.filter);
      updateHero(0, false);
      if (location.hash.startsWith('#project=')) {
        const project = projects.find(p => p.id === location.hash.slice(9));
        if (project) openProject(project, $('hero-open'), false);
      }
    } catch (error) {
      $('projects-grid').replaceChildren();
      $('projects-grid').setAttribute('aria-busy', 'false');
      $('project-load-error').hidden = false;
    }
  }
  $('retry-projects').addEventListener('click', loadProjects);

  let heroUpdateRequest = 0;
  function updateHero(index, animate = true) {
    if (!projects.length) return;
    heroIndex = (index + 5) % 5;
    const project = projects[heroIndex];
    const request = ++heroUpdateRequest;
    const nextImage = new Image();
    const apply = () => {
      if (request !== heroUpdateRequest) return;
      $('hero-image').src = project.cover;
      $('hero-image').alt = `${project.title}活动现场`;
      $('hero-project').textContent = project.title;
      $('hero-kind').textContent = project.category;
      $('hero-counter').textContent = `${heroIndex + 1} / 5`;
      $('hero-open').setAttribute('aria-label', `打开${project.title}图集`);
      $('hero-open').classList.remove('is-changing');
    };
    nextImage.onload = nextImage.onerror = apply;
    if (animate && !reducedMotion.matches) $('hero-open').classList.add('is-changing');
    nextImage.src = project.cover;
    if (nextImage.complete) apply();
  }
  $('hero-prev').addEventListener('click', () => updateHero(heroIndex - 1));
  $('hero-next').addEventListener('click', () => updateHero(heroIndex + 1));
  $('hero-open').addEventListener('click', () => {
    if (projects.length) openProject(projects[heroIndex], $('hero-open'));
    else document.querySelector('#work').scrollIntoView();
  });

  function openProject(project, source, changeHash = true) {
    currentProject = project; imageIndex = 0; returnFocus = source;
    $('gallery-title').textContent = project.title;
    $('gallery-category').textContent = project.category;
    $('gallery-caption').textContent = project.scope;
    const thumbnails = document.createDocumentFragment();
    project.images.forEach((photo, index) => {
      const button = document.createElement('button');
      button.className = 'gallery-thumb';
      button.setAttribute('aria-label', `查看第 ${index + 1} 张照片`);
      const image = document.createElement('img');
      Object.assign(image, {src: photo.src, alt: '', loading: 'lazy', decoding: 'async'});
      button.append(image);
      button.addEventListener('click', () => showImage(index));
      thumbnails.append(button);
    });
    $('gallery-thumbnails').replaceChildren(thumbnails);
    document.body.classList.add('modal-open');
    gallery.showModal();
    showImage(0);
    $('gallery-close').focus({preventScroll: true});
    if (changeHash) history.replaceState(null, '', '#project=' + project.id);
  }
  function showImage(index) {
    if (!currentProject) return;
    imageIndex = (index + currentProject.images.length) % currentProject.images.length;
    const photo = currentProject.images[imageIndex];
    const request = ++lastImageRequest;
    const display = $('gallery-image');
    $('gallery-image-wrap').classList.remove('ready');
    $('gallery-loading').textContent = '加载现场…';
    display.onload = () => { if (request === lastImageRequest) $('gallery-image-wrap').classList.add('ready'); };
    display.onerror = () => { if (request === lastImageRequest) $('gallery-loading').textContent = '照片未能加载，可以切换下一张或打开大图。'; };
    display.alt = photo.alt;
    display.src = photo.src;
    $('gallery-original').href = photo.src;
    $('gallery-original').setAttribute('aria-label', `在新窗口查看${currentProject.title}第${imageIndex + 1}张大图`);
    $('gallery-counter').textContent = `${imageIndex + 1} / ${currentProject.images.length}`;
    [...$('gallery-thumbnails').children].forEach((button, index) => {
      button.classList.toggle('active', index === imageIndex);
      button.setAttribute('aria-pressed', String(index === imageIndex));
    });
    const active = $('gallery-thumbnails').children[imageIndex];
    if (active) {
      const strip = $('gallery-thumbnails');
      strip.scrollTo({left: active.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + active.offsetWidth / 2, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }
    const nextPhoto = currentProject.images[(imageIndex + 1) % currentProject.images.length];
    const preload = new Image(); preload.src = nextPhoto.src;
  }
  function closeGallery() { if (gallery.open) gallery.close(); }
  gallery.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    lastImageRequest++;
    $('gallery-image').removeAttribute('src');
    if (location.hash.startsWith('#project=')) history.replaceState(null, '', '#work');
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
  });
  $('gallery-close').addEventListener('click', closeGallery);
  $('gallery-prev').addEventListener('click', () => showImage(imageIndex - 1));
  $('gallery-next').addEventListener('click', () => showImage(imageIndex + 1));
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(imageIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showImage(imageIndex + 1); }
  });
  let touchStart = null;
  $('gallery-image-wrap').addEventListener('touchstart', e => { if (e.touches.length === 1) touchStart = [e.touches[0].clientX, e.touches[0].clientY]; }, {passive: true});
  $('gallery-image-wrap').addEventListener('touchend', e => {
    if (!touchStart || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStart[0], dy = e.changedTouches[0].clientY - touchStart[1];
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showImage(imageIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, {passive: true});
  window.addEventListener('hashchange', () => {
    if (gallery.open && !location.hash.startsWith('#project=')) closeGallery();
  });

  $('copy-phone').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText('16607314610');
      $('copy-label').textContent = '已复制';
      $('copy-status').textContent = '电话已复制，可联系游先生。';
      setTimeout(() => { $('copy-label').textContent = '复制电话'; }, 2500);
    } catch {
      $('copy-status').textContent = '请长按或选中上方电话复制，也可以直接点击拨打。';
    }
  });
  loadProjects();
})();
