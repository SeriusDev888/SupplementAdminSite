(() => {
  const preview = new URLSearchParams(location.search).has('editor-preview') && parent !== window;
  const main = document.querySelector('main');
  if (!main) return;
  let documentState = {
      schema: 1,
      theme: {},
      pages: {},
      global: { nodes: {}, additions: [], order: {} },
    },
    base = '',
    applying = false,
    selection = null,
    interactive = false;
  const originals = new Map(),
    elements = new Map();
  let observer, toolbar;
  const route = () => {
    const raw = location.hash.slice(1) || 'home';
    if (raw === 'origins/0') return 'origins';
    if (/^(story|ingredients|wellness)\//.test(raw)) return raw.split('/')[0];
    return raw;
  };
  const post = (type, data = {}) =>
    preview && parent.postMessage({ source: 'chashitsu-preview', type, ...data }, location.origin);
  const ignored = (e) =>
    e.matches(
      'script,style,svg,svg *,option,.motion-atmosphere,.motion-atmosphere *,.motion-ripple,[data-editor-ui],[data-ig4-prev]',
    );
  const scopes = () => [
    ['main', main],
    ['header', document.querySelector('.header')],
    ['footer', document.querySelector('footer')],
  ];
  function indexTree(root, prefix, keep = false) {
    if (!root) return;
    if (prefix === 'main' && (route() === 'contact' || SiteDefaults.isProductRoute(route()))) return;
    let index = 0;
    function walk(el, id) {
      if (ignored(el)) return;
      if (el.dataset.productRoot) id = 'main/product-v2-' + el.dataset.productRoot;
      if (el.dataset.pdKey) id = id.substring(0, id.lastIndexOf('/')) + '/' + el.dataset.pdKey;
      if (el.matches('.product-card')) {
        const product = el
          .querySelector('a[href^="#product/"]')
          ?.getAttribute('href')
          ?.split('/')[1];
        if (product) id = id.substring(0, id.lastIndexOf('/')) + '/product-' + product;
      }
      el.dataset.veId = id;
      elements.set(id, el);
      if (keep && !originals.has(id))
        originals.set(id, {
          html: el.innerHTML,
          style: el.getAttribute('style'),
          href: el.getAttribute('href'),
          src: el.getAttribute('src'),
          alt: el.getAttribute('alt'),
        });
      let n = 0,
        icon = 0;
      for (const child of el.children) {
        if (child.tagName.toLowerCase() === 'svg') {
          const iconId = id + '/icon-' + icon++;
          child.dataset.veId = iconId;
          elements.set(iconId, child);
          if (keep && !originals.has(iconId))
            originals.set(iconId, {
              html: child.innerHTML,
              style: child.getAttribute('style'),
              href: null,
              src: null,
              alt: null,
            });
        } else if (!ignored(child)) walk(child, id + '/' + n++);
      }
    }
    walk(root, prefix);
  }
  function resetGlobal() {
    for (const [id, original] of originals) {
      const el = elements.get(id);
      if (!el) continue;
      delete el.dataset.veEmptyText;
      delete el.dataset.veEmptyLabel;
      if (el.dataset.veTextApplied) {
        el.innerHTML = original.html;
        delete el.dataset.veTextApplied;
      }
      if (el.dataset.vePatched) {
        for (const [key, value] of Object.entries({
          style: original.style,
          href: original.href,
          src: original.src,
          alt: original.alt,
        }))
          value === null ? el.removeAttribute(key) : el.setAttribute(key, value);
        delete el.dataset.vePatched;
        delete el.dataset.veAnimation;
        delete el.dataset.veHidden;
        delete el.dataset.veDeleted;
        el.hidden = false;
      }
    }
  }
  const groupFor = (id) =>
    id?.startsWith('main') || id?.startsWith('custom-') ? 'page' : 'global';
  const escapeCSS = (value) => String(value).replace(/["\\\n\r]/g, '');
  const nodePatch = (id) =>
    (groupFor(id) === 'global' ? documentState.global : documentState.pages?.[route()])?.nodes?.[
      id
    ] || {};
  function setText(el, text) {
    if (preview && !String(text).trim()) {
      el.dataset.veEmptyText = 'true';
      el.dataset.veEmptyLabel = (el.innerText || el.textContent || el.tagName)
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 70);
    }
    const icons = [...el.children]
      .filter((child) => child.tagName.toLowerCase() === 'svg')
      .map((e) => e.cloneNode(true));
    el.replaceChildren();
    String(text)
      .split('\n')
      .forEach((line, index) => {
        if (index) el.append(document.createElement('br'));
        el.append(document.createTextNode(line));
      });
    icons.forEach((e) => el.append(e));
    el.dataset.veTextApplied = 'true';
  }
  function makeBlock(block) {
    let el;
    if (block.type === 'clone') {
      const source = elements.get(block.source);
      if (!source) return;
      el = source.cloneNode(true);
      el.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      el.removeAttribute('id');
    } else {
      el = document.createElement('section');
      el.className = 've-custom-block';
      if (block.type === 'image')
        el.innerHTML = '<img src="assets/ingredients-oranges-v4.png" alt="รูปภาพของคุณ">';
      else if (block.type === 'banner')
        el.innerHTML =
          '<h2>หัวข้อใหม่ของคุณ</h2><p>คลิกเพื่อแก้ไขข้อความและเพิ่มเรื่องราวของคุณ</p><a href="#catalog" class="btn">ดูเพิ่มเติม</a>';
      else el.innerHTML = '<h2>หัวข้อใหม่ของคุณ</h2><p>เริ่มต้นเขียนข้อความของคุณที่นี่</p>';
    }
    el.dataset.veCustom = block.id;
    indexTree(el, block.id);
    return el;
  }
  function applyGroup(group = {}) {
    for (const block of group.additions || []) {
      const el = makeBlock(block),
        parentEl = elements.get(block.parent) || main;
      if (!el) continue;
      const after = elements.get(block.after);
      after && after.parentElement === parentEl ? after.after(el) : parentEl.append(el);
    }
    for (const [id, ids] of Object.entries(group.order || {})) {
      const parentEl = elements.get(id);
      if (!parentEl || !main.contains(parentEl) || !Array.isArray(ids)) continue;
      const children = [...parentEl.children].filter(
        (el) => el.matches('section,article') && el.dataset.veId,
      );
      if (children.length < 2) continue;
      const lookup = new Map(children.map((el) => [el.dataset.veId, el]));
      const ordered = [...new Set(ids)].map((key) => lookup.get(key)).filter(Boolean);
      for (const child of children) if (!ordered.includes(child)) ordered.push(child);
      const slots = children.map((child) => {
        const marker = document.createComment('section');
        child.replaceWith(marker);
        return marker;
      });
      slots.forEach((slot, index) => slot.replaceWith(ordered[index]));
    }
    for (const [id, patch] of Object.entries(group.nodes || {})) {
      const el = elements.get(id);
      if (!el) continue;
      el.dataset.vePatched = 'true';
      if (patch.text !== undefined) setText(el, patch.text);
      for (const [property, value] of Object.entries({
        ...patch.styles,
        ...(innerWidth <= 760 ? patch.mobileStyles : {}),
      }))
        el.style.setProperty(
          property.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()),
          value,
          'important',
        );
      if (patch.image !== undefined) {
        if (el.matches('.v2-bottle')) {
          el.classList.toggle('cms-product-replaced', !!patch.image);
          el.style.setProperty('--cms-product-image', `url("${escapeCSS(patch.image)}")`);
        } else if (el.tagName === 'IMG') {
          el.src = patch.image;
          el.srcset = '';
        } else {
          el.style.setProperty(
            'background-image',
            patch.image ? `url("${escapeCSS(patch.image)}")` : 'none',
            'important',
          );
          if (!patch.styles?.backgroundSize)
            el.style.setProperty('background-size', 'cover', 'important');
        }
      }
      if (patch.alt !== undefined)
        el.tagName === 'IMG' ? (el.alt = patch.alt) : el.setAttribute('aria-label', patch.alt);
      if (patch.href !== undefined && el.tagName === 'A') el.href = patch.href;
      if (patch.hidden) {
        el.dataset.veHidden = 'true';
        if (!preview || interactive) el.style.setProperty('display', 'none', 'important');
      }
      if (patch.deleted) {
        el.dataset.veDeleted = 'true';
        el.style.setProperty('display', 'none', 'important');
      }
      if (patch.sticker) SiteCMS.sticker(el, patch.sticker);
      if (patch.effect) SiteCMS.effect(el, patch.effect);
    }
  }
  function applyTheme() {
    const theme = documentState.theme || {};
    let style = document.getElementById('ve-theme');
    if (!style) {
      style = document.createElement('style');
      style.id = 've-theme';
      document.head.append(style);
    }
    let css = '';
    const fonts = {
      thai: '"Noto Sans Thai",sans-serif',
      sans: '"DM Sans","Noto Sans Thai",sans-serif',
      serif: 'Georgia,"Noto Sans Thai",serif',
    };
    if (theme.text)
      css += `body{--ink:${theme.text};--muted:${theme.text}}body main :is(h1,h2,h3,h4,p,small,strong,li,dt,dd),body footer{color:${theme.text}!important}`;
    if (theme.background)
      css += `body,main,main>div,main section{background-color:${theme.background}!important}`;
    if (theme.surface)
      css += `main article,main [class$="-facts"],header{background-color:${theme.surface}!important}`;
    if (theme.accent)
      css += `.btn:not(.secondary),.line-btn{background:${theme.accent}!important;border-color:${theme.accent}!important}.ig4-nav-track button.is-active{background:${theme.accent}!important}`;
    if (fonts[theme.font])
      css += `main :is(h1,h2,h3,h4,p,a,button,small,span),header,footer{font-family:${fonts[theme.font]}!important}`;
    style.textContent = css;
    const stop = preview && !interactive;
    document.documentElement.classList.toggle('ve-no-motion', stop);
    document.documentElement.dataset.motionPaused = String(stop);
    if (stop)
      document.getAnimations().forEach((animation) => {
        // Finish entrance transitions so editing never freezes content at opacity: 0.
        const end = animation.effect?.getComputedTiming().endTime;
        if (Number.isFinite(end) && animation.playbackRate !== 0) animation.finish();
        else animation.cancel();
      });
  }
  function apply() {
    if (applying || !base) return;
    applying = true;
    observer?.disconnect();
    const y = scrollY;
    resetGlobal();
    if (SiteCMS.sync(documentState)) {
      const scroll = scrollY;
      render();
      base = main.innerHTML;
      window.scrollTo(0, scroll);
    }
    main.innerHTML = base;
    elements.clear();
    for (const [key, root] of scopes()) indexTree(root, key, key !== 'main');
    const firstSection = main.querySelector('section,article');
    applyTheme();
    SiteCMS.productImages();
    applyGroup(documentState.global);
    if (route() !== 'contact' && !SiteDefaults.isProductRoute(route())) applyGroup(documentState.pages?.[route()]);
    SiteCMS.applyBrand();
    const header = document.querySelector('.header'),
      needsHeaderSpace =
        firstSection !== main.querySelector('section,article') &&
        getComputedStyle(header).position === 'absolute';
    main.classList.toggle('ve-reordered-top', needsHeaderSpace);
    if (needsHeaderSpace)
      main.style.setProperty(
        '--ve-header-space',
        header.offsetHeight + (parseFloat(getComputedStyle(header).marginTop) || 0) + 24 + 'px',
      );
    document.body.classList.toggle('ve-editable', preview && !interactive);
    document.body.classList.toggle('ve-interactive', interactive);
    if (selection) {
      const el = elements.get(selection);
      if (el && !interactive) el.classList.add('ve-selected');
    }
    window.scrollTo(0, y);
    observer?.observe(main, { childList: true });
    applying = false;
    postOutline();
    placeToolbar();
    if (elements.get(selection)?.closest('[data-ve-deleted="true"]')) post('selectionRemoved');
  }
  function capture() {
    if (applying) return;
    base = main.innerHTML;
    selection = null;
    apply();
    post('ready', { route: route() });
  }
  function label(el) {
    if (el.dataset.veEmptyText) return 'ข้อความว่าง · ' + el.dataset.veEmptyLabel;
    const heading = el.querySelector('h1,h2,h3');
    return (
      el.getAttribute('aria-label') ||
      heading?.innerText ||
      el.innerText ||
      el.textContent ||
      el.tagName
    )
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 65);
  }
  function describe(el) {
    const computed = getComputedStyle(el),
      id = el.dataset.veId;
    const patch =
      (groupFor(id) === 'global' ? documentState.global : documentState.pages?.[route()])?.nodes?.[
        id
      ] || {};
    const textOK =
      /^(H[1-6]|P|A|BUTTON|SPAN|SMALL|STRONG|EM|LI|DT|DD|SUMMARY|LABEL|FIGCAPTION)$/.test(
        el.tagName,
      ) && el.children.length < 9;
    const siblings = el.parentElement
      ? [...el.parentElement.children].filter((e) => e.dataset.veId)
      : [];
    const productId =
        el.dataset.productId || el.querySelector?.(':scope > [data-product-id]')?.dataset.productId,
      effectTarget = el.closest('section') || null;
    return {
      id,
      productId,
      isSticker: el.tagName.toLowerCase() === 'svg',
      isBrand: !!el.closest('.brand'),
      effectTarget: effectTarget?.dataset.veId,
      effectLabel: effectTarget ? label(effectTarget) : '',
      scope: groupFor(id),
      tag: el.tagName,
      label: label(el),
      text: textOK ? (el.innerText || el.textContent).trim() : null,
      image: productId
        ? SiteCMS.product(productId)?.image || ''
        : el.tagName === 'IMG'
          ? el.getAttribute('src')
          : computed.backgroundImage !== 'none'
            ? computed.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] || ''
            : '',
      imageKind: productId ? 'product' : el.tagName === 'IMG' ? 'img' : 'background',
      alt: el.getAttribute('alt') || el.getAttribute('aria-label') || '',
      href: el.tagName === 'A' ? el.getAttribute('href') : null,
      styles: Object.fromEntries(
        [
          'color',
          'backgroundColor',
          'fontSize',
          'fontFamily',
          'fontWeight',
          'textAlign',
          'padding',
          'borderRadius',
          'opacity',
          'backgroundPosition',
          'backgroundSize',
          'objectFit',
          'objectPosition',
          'minHeight',
          'gap',
          'boxShadow',
          'width',
          'height',
        ].map((k) => [k, computed[k]]),
      ),
      parent: el.parentElement?.dataset.veId,
      siblings: siblings.map((e) => e.dataset.veId),
      index: siblings.indexOf(el),
      patch,
    };
  }
  function postOutline() {
    if (!preview) return;
    const rows = [];
    const nodes = [
      document.querySelector('.header'),
      ...main.querySelectorAll('section,article'),
      document.querySelector('footer'),
    ].filter(Boolean);
    for (const el of nodes) {
      const id = el.dataset.veId;
      if (
        !id ||
        el.closest('[data-ve-deleted="true"],.or-map') ||
        getComputedStyle(el).display === 'none'
      )
        continue;
      const ancestor = el.parentElement?.closest('section,article'),
        depth = ancestor && main.contains(ancestor) ? 1 : 0,
        scope = groupFor(id),
        siblings =
          scope === 'page'
            ? [...el.parentElement.children]
                .filter(
                  (e) =>
                    e.matches('section,article') &&
                    e.dataset.veId &&
                    !e.closest('[data-ve-deleted="true"]'),
                )
                .map((e) => e.dataset.veId)
            : [];
      rows.push({
        id,
        label: el.matches('header')
          ? 'ส่วนหัวเว็บไซต์'
          : el.matches('footer')
            ? 'ส่วนท้ายเว็บไซต์'
            : label(el),
        depth,
        scope,
        parent: el.parentElement?.dataset.veId,
        siblings,
        reorderable: scope === 'page' && siblings.length > 1,
      });
    }
    post('outline', { items: rows, route: route() });
    post('hiddenElements', {
      items: [...elements.values()]
        .filter((el) => el.isConnected && el.dataset.veHidden === 'true')
        .map((el) => ({ id: el.dataset.veId, label: label(el) })),
      route: route(),
    });
    post('emptyTexts', {
      items: [...elements.values()]
        .filter(
          (el) =>
            el.isConnected && el.dataset.veEmptyText && !el.closest('[data-ve-deleted="true"]'),
        )
        .map((el) => ({ id: el.dataset.veId, label: el.dataset.veEmptyLabel || 'ข้อความว่าง' })),
      route: route(),
    });
  }
  function select(el) {
    if (!el?.dataset.veId || el.closest('[data-ve-deleted="true"]')) return;
    if ((route() === 'contact' || SiteDefaults.isProductRoute(route())) && main.contains(el)) return;
    document.querySelectorAll('.ve-selected').forEach((e) => e.classList.remove('ve-selected'));
    selection = el.dataset.veId;
    el.classList.add('ve-selected');
    post('selected', { element: describe(el), route: route() });
    placeToolbar();
  }
  function placeToolbar() {
    if (!toolbar) return;
    const el = elements.get(selection);
    toolbar.hidden =
      interactive ||
      !el ||
      describe(el).text === null ||
      el.isContentEditable ||
      !el.getClientRects().length;
    if (toolbar.hidden) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) {
      toolbar.hidden = true;
      return;
    }
    toolbar.querySelector('[data-ve-edit]').hidden = describe(el).text === null;
    toolbar.style.left =
      Math.max(6, Math.min(rect.left, innerWidth - toolbar.offsetWidth - 6)) + 'px';
    toolbar.style.top =
      Math.max(
        6,
        Math.min(rect.top - toolbar.offsetHeight - 7, innerHeight - toolbar.offsetHeight - 6),
      ) + 'px';
  }
  function beginTextEdit(el) {
    if (!el || describe(el).text === null || el.isContentEditable) return;
    if ((route() === 'contact' || SiteDefaults.isProductRoute(route())) && main.contains(el)) return;
    el.contentEditable = 'plaintext-only';
    el.focus();
    placeToolbar();
    const finish = () => {
      el.removeAttribute('contenteditable');
      post('inlineText', {
        id: el.dataset.veId,
        scope: groupFor(el.dataset.veId),
        text: el.innerText,
        route: route(),
      });
      el.removeEventListener('blur', finish);
      placeToolbar();
    };
    el.addEventListener('blur', finish);
  }
  if (preview) {
    toolbar = document.createElement('div');
    toolbar.dataset.editorUi = 'true';
    toolbar.className = 've-selection-tools';
    toolbar.hidden = true;
    toolbar.innerHTML = '<button type="button" data-ve-edit>แก้ข้อความ</button>';
    document.body.append(toolbar);
    toolbar.querySelector('[data-ve-edit]').onclick = () => beginTextEdit(elements.get(selection));
    addEventListener('scroll', placeToolbar, true);
    addEventListener('resize', placeToolbar);
    document.addEventListener(
      'keydown',
      (event) => {
        const typing =
          event.target.isContentEditable || event.target.matches('input,textarea,select');
        if (!(event.ctrlKey || event.metaKey) || event.altKey || event.isComposing) return;
        const key = event.code?.startsWith('Key')
            ? event.code.slice(3).toLowerCase()
            : event.key.toLowerCase(),
          action =
            key === 's'
              ? 'save'
              : key === 'y' || (key === 'z' && event.shiftKey)
                ? 'redo'
                : key === 'z'
                  ? 'undo'
                  : null;
        if (!action) return;
        // Preserve native text undo while typing directly on the page or trying a form.
        if (typing && action !== 'save') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typing) event.target.blur();
        post('shortcut', { action });
      },
      true,
    );
    document.addEventListener(
      'click',
      (event) => {
        if (interactive || event.target.closest('[data-editor-ui],[contenteditable]')) return;
        const el = event.target.closest('[data-ve-id]');
        if (!el) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        select(el);
      },
      true,
    );
    document.addEventListener(
      'submit',
      (event) => {
        if (!interactive) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    document.addEventListener(
      'dblclick',
      (event) => {
        if (interactive) return;
        const el = event.target.closest('[data-ve-id]');
        if (!el || describe(el).text === null) return;
        event.preventDefault();
        beginTextEdit(el);
      },
      true,
    );
    window.addEventListener('message', (event) => {
      if (
        event.origin !== location.origin ||
        event.source !== parent ||
        event.data?.source !== 'chashitsu-editor'
      )
        return;
      const m = event.data;
      if (m.type === 'state') {
        if (m.document?.schema !== 1 || !m.document.pages || typeof m.document.pages !== 'object')
          return;
        documentState = m.document;
        apply();
      }
      if (m.type === 'select') {
        const el = elements.get(m.id);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          select(el);
        }
      }
      if (m.type === 'interactive') {
        interactive = m.value;
        apply();
      }
      if (m.type === 'parent') {
        const el = elements.get(selection)?.parentElement;
        select(el);
      }
      if (m.type === 'refresh') select(elements.get(selection));
    });
  } else {
    fetch('/api/content')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        documentState = data.document;
        apply();
      })
      .catch(() => {});
  }
  observer = new MutationObserver(capture);
  observer.observe(main, { childList: true });
  capture();
  let mobile = innerWidth <= 760;
  addEventListener('resize', () => {
    clearTimeout(window.veResize);
    window.veResize = setTimeout(() => {
      const changed = mobile !== innerWidth <= 760;
      mobile = innerWidth <= 760;
      if (preview || (changed && JSON.stringify(documentState).includes('mobileStyles'))) {
        apply();
        if (preview && selection) select(elements.get(selection));
      }
    }, 180);
  });
})();
