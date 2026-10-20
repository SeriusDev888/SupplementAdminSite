import { fail } from './http.js';
import additionalStickers from '../src/shared/sticker-library.json' with { type: 'json' };
const STYLES = new Set([
  'color',
  'backgroundColor',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'margin',
  'marginTop',
  'marginBottom',
  'borderRadius',
  'borderWidth',
  'borderStyle',
  'borderColor',
  'boxShadow',
  'opacity',
  'width',
  'maxWidth',
  'minHeight',
  'height',
  'gap',
  'objectFit',
  'objectPosition',
  'backgroundSize',
  'backgroundPosition',
  'backgroundRepeat',
  'display',
  'gridTemplateColumns',
  'alignItems',
  'justifyContent',
]);
const ANIMATIONS = new Set(['default', 'none', 'fade', 'slide', 'zoom', 'float', 'pulse']);
const STICKERS = new Set([
  ...Object.keys(additionalStickers),
  'arrow',
  'leaf',
  'flower',
  'shield',
  'heart',
  'bolt',
  'moon',
  'face',
  'sun',
  'hand',
  'mail',
  'chat',
  'pin',
  'star',
  'drop',
  'sparkles',
  'check',
  'flask',
  'mountain',
  'lotus',
  'award',
  'bed',
  'globe',
]);
const safeString = (value, max = 200) =>
  typeof value === 'string' && value.length <= max && !/[\u0000-\u0008]/.test(value);
export function safeURL(value, image = false) {
  if (typeof value !== 'string' || value.length > 2000) return false;
  if (value === '') return true;
  if (value.startsWith('#')) return !image;
  if (/^\/(assets|media)\/[a-zA-Z0-9_.\/-]+$/.test(value) && !value.includes('..')) return true;
  if (/^assets\/[a-zA-Z0-9_.\/-]+$/.test(value) && !value.includes('..')) return true;
  if (!image && /^mailto:[^\s<>]+$/.test(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}
function validateGroup(group) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) fail('Invalid page');
  const nodes = group.nodes || {},
    additions = group.additions || [],
    order = group.order || {};
  if (
    typeof nodes !== 'object' ||
    Array.isArray(nodes) ||
    Object.keys(nodes).length > 2500 ||
    !Array.isArray(additions) ||
    additions.length > 150 ||
    typeof order !== 'object' ||
    Array.isArray(order)
  )
    fail('Too many changes');
  for (const [id, node] of Object.entries(nodes)) {
    if (!/^[a-zA-Z0-9_:/.\-]{1,250}$/.test(id) || !node || typeof node !== 'object')
      fail('Invalid element');
    if (node.text !== undefined && !safeString(node.text, 20000)) fail('Text is too long');
    if (node.lastText !== undefined && !safeString(node.lastText, 20000))
      fail('Previous text is too long');
    if (node.image !== undefined && !safeURL(node.image, true)) fail('Invalid image URL');
    if (node.href !== undefined && !safeURL(node.href)) fail('Invalid link');
    if (node.alt !== undefined && !safeString(node.alt, 500)) fail('Invalid image description');
    if (node.hidden !== undefined && typeof node.hidden !== 'boolean') fail('Invalid visibility');
    if (node.sticker !== undefined && node.sticker !== '' && !STICKERS.has(node.sticker))
      fail('Invalid sticker');
    if (node.effect !== undefined) {
      const fx = node.effect;
      if (
        !fx ||
        !['original', 'none', 'sakura', 'leaves', 'sparkles', 'snow', 'custom'].includes(fx.type)
      )
        fail('Invalid effect');
      if (fx.image !== undefined && !safeURL(fx.image, true)) fail('Invalid effect image');
      for (const [key, min, max] of [
        ['opacity', 0, 1],
        ['size', 8, 100],
        ['density', 4, 24],
      ])
        if (fx[key] !== undefined && (!Number.isFinite(fx[key]) || fx[key] < min || fx[key] > max))
          fail('Invalid effect setting');
      if (fx.color !== undefined && !/^#[a-fA-F0-9]{6}$/.test(fx.color))
        fail('Invalid effect color');
    }
    if (
      node.deleted !== undefined &&
      (typeof node.deleted !== 'boolean' ||
        (node.deleted && ['main', 'header', 'footer'].includes(id)))
    )
      fail('Invalid deletion');
    for (const key of ['offset', 'mobileOffset'])
      if (node[key] !== undefined) {
        const point = node[key];
        if (
          !point ||
          typeof point !== 'object' ||
          !Number.isFinite(point.x) ||
          !Number.isFinite(point.y) ||
          Math.abs(point.x) > 1000 ||
          Math.abs(point.y) > 1000
        )
          fail('Invalid position');
      }
    if (node.animation !== undefined && !ANIMATIONS.has(node.animation)) fail('Invalid animation');
    for (const key of ['duration', 'delay'])
      if (
        node[key] !== undefined &&
        (!Number.isFinite(node[key]) || node[key] < 0 || node[key] > 20)
      )
        fail('Invalid animation timing');
    for (const styles of [node.styles, node.mobileStyles])
      if (styles !== undefined) {
        if (!styles || typeof styles !== 'object' || Array.isArray(styles)) fail('Invalid styles');
        for (const [key, value] of Object.entries(styles))
          if (
            !STYLES.has(key) ||
            !safeString(value, 180) ||
            /[{};<>\\]/.test(value) ||
            /url\s*\(|expression|@import/i.test(value)
          )
            fail('Unsupported style');
      }
  }
  for (const block of additions) {
    if (
      !block ||
      !/^custom-[a-f0-9-]{10,60}$/.test(block.id) ||
      !['text', 'image', 'banner', 'clone'].includes(block.type) ||
      !safeString(block.parent, 250) ||
      !safeString(block.after || '', 250) ||
      !safeString(block.source || '', 250)
    )
      fail('Invalid block');
  }
  for (const [key, value] of Object.entries(order))
    if (
      !safeString(key, 250) ||
      !Array.isArray(value) ||
      value.length > 500 ||
      value.some((x) => !safeString(x, 250))
    )
      fail('Invalid order');
}
function validateProductDetails(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) fail('Invalid product details');
  if (d.sampleInfo !== undefined && typeof d.sampleInfo !== 'boolean') fail('Invalid sample label');
  const texts = [
    'samplePrice',
    'priceNote',
    'orderLabel',
    'askLabel',
    'overview',
    'overviewClosing',
    'servingSize',
    'servingsPerContainer',
    'nutritionFootnote',
  ];
  for (const k of texts)
    if (
      d[k] !== undefined &&
      !safeString(d[k], ['overview', 'overviewClosing'].includes(k) ? 10000 : 1500)
    )
      fail('Invalid product detail text');
  if (
    d.stockStatus !== undefined &&
    !['unconfirmed', 'in_stock', 'out_of_stock', 'preorder'].includes(d.stockStatus)
  )
    fail('Invalid stock status');
  if (
    d.rating !== undefined &&
    d.rating !== '' &&
    (!Number.isFinite(Number(d.rating)) || Number(d.rating) < 0 || Number(d.rating) > 5)
  )
    fail('Invalid rating');
  if (
    d.reviewCount !== undefined &&
    d.reviewCount !== '' &&
    (!Number.isInteger(Number(d.reviewCount)) ||
      Number(d.reviewCount) < 0 ||
      Number(d.reviewCount) > 10000000)
  )
    fail('Invalid review count');
  for (const k of ['reviewUrl', 'askUrl'])
    if (d[k] !== undefined && !safeURL(d[k])) fail('Invalid product link');
  const definitions = {
    gallery: [12, ['url', 'alt']],
    trust: [6, ['icon', 'title', 'text']],
    summary: [12, ['icon', 'label', 'value']],
    nutrition: [80, ['name', 'amount', 'dailyValue']],
    information: [12, ['icon', 'title', 'body']],
    certificates: [20, ['id', 'title', 'description', 'url', 'filename']],
    faq: [30, ['question', 'answer']],
  };
  for (const [key, [max, fields]] of Object.entries(definitions)) {
    if (d[key] === undefined) continue;
    if (!Array.isArray(d[key]) || d[key].length > max) fail('Too many product items');
    for (const item of d[key]) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) fail('Invalid product item');
      for (const field of fields) {
        if (item[field] === undefined) continue;
        if (field === 'url') {
          if (!safeURL(item[field], true)) fail('Invalid product asset');
        } else if (field === 'icon') {
          if (!STICKERS.has(item[field])) fail('Invalid product icon');
        } else if (
          !safeString(item[field], ['body', 'answer', 'description'].includes(field) ? 5000 : 500)
        )
          fail('Invalid product item text');
      }
    }
  }
  if (
    d.overviewBullets !== undefined &&
    (!Array.isArray(d.overviewBullets) ||
      d.overviewBullets.length > 30 ||
      d.overviewBullets.some((x) => !safeString(x, 1000)))
  )
    fail('Invalid overview bullets');
  if (
    d.relatedIds !== undefined &&
    (!Array.isArray(d.relatedIds) ||
      d.relatedIds.length > 12 ||
      d.relatedIds.some((x) => typeof x !== 'string' || !/^[a-z][a-z0-9-]{0,49}$/.test(x)))
  )
    fail('Invalid related products');
}
function validateLocalizedText(value, max = 1500) {
  if (value === undefined) return;

  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('Invalid localized text');

  const allowed = new Set(['th', 'en']);

  for (const [key, text] of Object.entries(value)) {
    if (!allowed.has(key) || !safeString(text, max))
      fail('Invalid localized text');
  }
}

function validateContact(contact) {
  if (!contact || typeof contact !== 'object' || Array.isArray(contact))
    fail('Invalid contact');

  const allowedSections = new Set([
    'details',
    'hero',
    'line',
    'form',
    'location',
  ]);

  for (const key of Object.keys(contact))
    if (!allowedSections.has(key))
      fail('Invalid contact field');

  // รองรับ draft เก่าที่ยังมี contact.details
  if (
    contact.details !== undefined &&
    !safeString(contact.details, 20000)
  )
    fail('Invalid contact details');

  if (contact.hero !== undefined) {
    const hero = contact.hero;

    if (!hero || typeof hero !== 'object' || Array.isArray(hero))
      fail('Invalid contact hero');

    const allowed = new Set([
      'image',
      'tag',
      'title',
      'subtitle',
      'features',
    ]);

    for (const key of Object.keys(hero))
      if (!allowed.has(key))
        fail('Invalid contact hero field');

    if (hero.image !== undefined && !safeURL(hero.image, true))
      fail('Invalid contact hero image');

    validateLocalizedText(hero.tag, 300);
    validateLocalizedText(hero.title, 1500);
    validateLocalizedText(hero.subtitle, 5000);

    if (hero.features !== undefined) {
      if (
        !Array.isArray(hero.features) ||
        hero.features.length > 3
      )
        fail('Invalid contact features');

      for (const feature of hero.features)
        validateLocalizedText(feature, 1000);
    }
  }

  if (contact.line !== undefined) {
    const line = contact.line;

    if (!line || typeof line !== 'object' || Array.isArray(line))
      fail('Invalid contact LINE');

    const allowed = new Set([
      'url',
      'lineId',
      'qrImage',
      'badge',
      'title',
      'description',
      'buttonText',
      'scanText',
    ]);

    for (const key of Object.keys(line))
      if (!allowed.has(key))
        fail('Invalid contact LINE field');

    if (line.url !== undefined && !safeURL(line.url))
      fail('Invalid LINE URL');

    if (line.qrImage !== undefined && !safeURL(line.qrImage, true))
      fail('Invalid LINE QR image');

    if (
      line.lineId !== undefined &&
      !safeString(line.lineId, 200)
    )
      fail('Invalid LINE ID');

    validateLocalizedText(line.badge, 300);
    validateLocalizedText(line.title, 1500);
    validateLocalizedText(line.description, 5000);
    validateLocalizedText(line.buttonText, 500);
    validateLocalizedText(line.scanText, 1000);
  }

  if (contact.form !== undefined) {
    const form = contact.form;

    if (!form || typeof form !== 'object' || Array.isArray(form))
      fail('Invalid contact form');

    const allowed = new Set([
      'tag',
      'title',
      'description',
      'labels',
      'placeholders',
      'buttonText',
      'sendingText',
      'successTitle',
      'successDescription',
    ]);

    for (const key of Object.keys(form))
      if (!allowed.has(key))
        fail('Invalid contact form field');

    validateLocalizedText(form.tag, 300);
    validateLocalizedText(form.title, 1500);
    validateLocalizedText(form.description, 5000);
    validateLocalizedText(form.buttonText, 500);
    validateLocalizedText(form.sendingText, 500);
    validateLocalizedText(form.successTitle, 1000);
    validateLocalizedText(form.successDescription, 3000);

    for (const groupName of ['labels', 'placeholders']) {
      const group = form[groupName];

      if (group === undefined) continue;

      if (!group || typeof group !== 'object' || Array.isArray(group))
        fail('Invalid contact form fields');

      const allowedFields = new Set([
        'name',
        'email',
        'phone',
        'message',
      ]);

      for (const [key, value] of Object.entries(group)) {
        if (!allowedFields.has(key))
          fail('Invalid contact form field');

        validateLocalizedText(
          value,
          groupName === 'placeholders' ? 1500 : 500,
        );
      }
    }
  }

  if (contact.location !== undefined) {
    const location = contact.location;

    if (
      !location ||
      typeof location !== 'object' ||
      Array.isArray(location)
    )
      fail('Invalid contact location');

    const allowed = new Set([
      'tag',
      'title',
      'company',
      'address',
      'phone',
      'email',
      'officeHours',
      'emailNote',
      'standard',
      'standardNote',
      'mapButtonText',
      'mapUrl',
      'mapEmbedUrl',
    ]);

    for (const key of Object.keys(location))
      if (!allowed.has(key))
        fail('Invalid contact location field');

    validateLocalizedText(location.tag, 300);
    validateLocalizedText(location.title, 1500);
    validateLocalizedText(location.company, 1000);
    validateLocalizedText(location.address, 5000);
    validateLocalizedText(location.officeHours, 1000);
    validateLocalizedText(location.emailNote, 1000);
    validateLocalizedText(location.standard, 1000);
    validateLocalizedText(location.standardNote, 1000);
    validateLocalizedText(location.mapButtonText, 1000);

    if (
      location.phone !== undefined &&
      !safeString(location.phone, 500)
    )
      fail('Invalid contact phone');

    if (
      location.email !== undefined &&
      !safeString(location.email, 500)
    )
      fail('Invalid contact email');

    if (
      location.mapUrl !== undefined &&
      !safeURL(location.mapUrl)
    )
      fail('Invalid contact map URL');

    if (
      location.mapEmbedUrl !== undefined &&
      !safeURL(location.mapEmbedUrl)
    )
      fail('Invalid contact map embed URL');
  }
}
export function validateDocument(document) {
  if (
    !document ||
    document.schema !== 1 ||
    !document.pages ||
    typeof document.pages !== 'object' ||
    Array.isArray(document.pages) ||
    Object.keys(document.pages).length > 60
  )
    fail('Invalid document');
  if (JSON.stringify(document).length > 1800000) fail('Document exceeds limit');
  for (const [route, group] of Object.entries(document.pages)) {
    if (!/^[a-zA-Z0-9/_-]{1,100}$/.test(route)) fail('Invalid page route');
    validateGroup(group);
  }
  validateGroup(document.global || {});
  if (Array.isArray(document.catalog))
    for (const p of document.catalog)
      if (p?.details !== undefined) validateProductDetails(p.details);
  if (document.brand !== undefined) {
    const brand = document.brand;
    if (!brand || typeof brand !== 'object' || Array.isArray(brand)) fail('Invalid brand');
    for (const key of ['name', 'mark', 'tagline'])
      if (brand[key] !== undefined && !safeString(brand[key], key === 'mark' ? 8 : 200))
        fail('Invalid brand text');
    if (brand.logo !== undefined && !safeURL(brand.logo, true)) fail('Invalid logo');
  }
  if (Array.isArray(document.catalog))
    for (const p of document.catalog)
      if (
        p?.modifiedFields !== undefined &&
        (!Array.isArray(p.modifiedFields) ||
          p.modifiedFields.length > 30 ||
          p.modifiedFields.some(
            (v) =>
              ![
                'name',
                'title',
                'subtitle',
                'description',
                'cardSubtitle',
                'cardDescription',
                'tag',
                'sku',
                'price',
                'buyUrl',
                'image',
                'category',
                'color',
                'active',
                'deleted',
                'ingredients',
                'benefits',
                'details',
              ].includes(v),
          ))
      )
        fail('Invalid product fields');
  if (document.catalog !== undefined) {
    const catalog = document.catalog;
    if (!Array.isArray(catalog) || catalog.length < 3 || catalog.length > 60)
      fail('Invalid catalog');
    const ids = new Set();
    for (const p of catalog) {
      if (!p || !/^[a-z][a-z0-9-]{0,49}$/.test(p.id) || ids.has(p.id)) fail('Invalid product');
      ids.add(p.id);
      for (const key of [
        'name',
        'title',
        'subtitle',
        'description',
        'tag',
        'mood',
        'cardSubtitle',
        'cardDescription',
        'sku',
        'price',
      ])
        if (
          p[key] !== undefined &&
          !safeString(p[key], ['description', 'cardDescription'].includes(key) ? 5000 : 250)
        )
          fail('Invalid product text');
      if (
        !p.name?.trim() ||
        !['daily', 'beauty', 'balance'].includes(p.category) ||
        !/^#[a-fA-F0-9]{6}$/.test(p.color) ||
        typeof p.active !== 'boolean' ||
        (p.deleted !== undefined && typeof p.deleted !== 'boolean') ||
        (p.deleted === true && p.active !== false) ||
        !safeURL(p.image || '', true) ||
        !safeURL(p.buyUrl || '')
      )
        fail('Invalid product settings');
      if (
        !Array.isArray(p.ingredients) ||
        p.ingredients.length > 20 ||
        p.ingredients.some(
          (a) => !Array.isArray(a) || a.length !== 3 || a.some((v) => !safeString(v, 1500)),
        )
      )
        fail('Invalid ingredients');
      if (
        !Array.isArray(p.benefits) ||
        p.benefits.length > 6 ||
        p.benefits.some(
          (a) =>
            !Array.isArray(a) || a.length !== 2 || !STICKERS.has(a[0]) || !safeString(a[1], 250),
        )
      )
        fail('Invalid product benefits');
    }
    if (!['daily', 'glow', 'calm'].every((id) => ids.has(id)))
      fail('Keep the existing product records');
  }
  if (document.contact !== undefined)
  validateContact(document.contact);

  const theme = document.theme || {};
  for (const key of ['background', 'text', 'accent', 'surface'])
    if (theme[key] !== undefined && !/^#[a-fA-F0-9]{6}$/.test(theme[key]))
      fail('Invalid theme color');
  if (theme.font !== undefined && !['original', 'thai', 'sans', 'serif'].includes(theme.font))
    fail('Invalid font');
  if (theme.motion !== undefined && !['original', 'off'].includes(theme.motion))
    fail('Invalid motion setting');
  return document;
}
