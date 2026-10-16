import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { validateDocument } from '../worker/index.js';
import extraStickers from '../src/shared/sticker-library.json' with { type: 'json' };
const context = { window: {} };
vm.runInNewContext(
  readFileSync(new URL('../src/shared/site-config.js', import.meta.url), 'utf8'),
  context,
);
const fixture = () =>
  JSON.parse(
    JSON.stringify({
      schema: 1,
      theme: {},
      pages: {},
      global: { nodes: {} },
      catalog: context.window.SiteDefaults.products,
      brand: { name: 'SORA', logo: '/assets/story-question.png' },
    }),
  );
test('catalog, brand, stickers and effects validate without accepting unsafe or malformed content', () => {
  const good = fixture();
  good.catalog[0].modifiedFields = ['image'];
  good.global.nodes.header = {
    sticker: 'star',
    effect: { type: 'custom', image: '/media/test.png', density: 8, opacity: 0.5, size: 20 },
  };
  assert.equal(validateDocument(good), good);
  const invalid = [
    (d) => d.catalog.push(d.catalog[0]),
    (d) => d.catalog.pop(),
    (d) => (d.catalog[0].image = 'javascript:alert(1)'),
    (d) => (d.catalog[0].benefits = [['unknown', 'label']]),
    (d) => (d.catalog[0].modifiedFields = ['invalid']),
    (d) => (d.brand.logo = 'javascript:alert(1)'),
    (d) => (d.global.nodes.header = { sticker: 'unknown' }),
    (d) => (d.global.nodes.header = { effect: { type: 'custom', image: 'javascript:alert(1)' } }),
    (d) => (d.global.nodes.header = { effect: { type: 'snow', density: 1000 } }),
  ];
  for (const change of invalid) {
    const data = fixture();
    change(data);
    assert.throws(() => validateDocument(data));
  }
});
test('all 100 additional stickers can be saved through the document API', () => {
  assert.equal(Object.keys(extraStickers).length, 100);
  for (const sticker of Object.keys(extraStickers)) {
    const data = fixture();
    data.global.nodes.header = { sticker };
    assert.equal(validateDocument(data), data);
  }
});
test('product details accept optional legacy records and reject unsafe assets or invalid rows', () => {
  const details = {
    gallery: [{ url: '/assets/product.png', alt: 'Product' }],
    stockStatus: 'in_stock',
    rating: '4.8',
    reviewCount: '128',
    nutrition: [{ name: 'Vitamin C', amount: '100 mg', dailyValue: '111%' }],
    certificates: [
      {
        id: 'document-1',
        title: 'Specification',
        description: 'Label details',
        url: '/media/document.pdf',
        filename: 'spec.pdf',
      },
    ],
    faq: [{ question: 'Question?', answer: 'Answer.' }],
    relatedIds: ['glow'],
  };
  const data = fixture();
  data.catalog[0].details = details;
  data.catalog[0].modifiedFields = ['details'];
  assert.equal(validateDocument(data), data);
  for (const change of [
    (d) => (d.gallery[0].url = 'javascript:alert(1)'),
    (d) => (d.certificates[0].url = 'data:text/html,evil'),
    (d) => (d.stockStatus = 'unknown'),
    (d) => (d.rating = '6'),
    (d) => (d.reviewCount = '1.5'),
    (d) => (d.sampleInfo = 'false'),
    (d) => (d.faq = [null]),
    (d) => (d.nutrition = Array(81).fill({})),
    (d) => (d.trust = [{ icon: 'bad' }]),
    (d) => (d.relatedIds = ['../home']),
    (d) => (d.overviewBullets = [{}]),
  ]) {
    const bad = fixture();
    bad.catalog[0].details = structuredClone(details);
    change(bad.catalog[0].details);
    assert.throws(() => validateDocument(bad));
  }
});
test('deleted default products stay recoverable and cannot remain active', () => {
  const data = fixture();
  data.catalog[0].deleted = true;
  data.catalog[0].active = false;
  data.catalog[0].modifiedFields = ['deleted', 'active'];
  assert.equal(validateDocument(data), data);
  data.catalog[0].active = true;
  assert.throws(() => validateDocument(data));
  data.catalog[0].active = false;
  data.catalog[0].deleted = 'true';
  assert.throws(() => validateDocument(data));
});
test('sample product data fills legacy blanks but respects later edits and removal', () => {
  const scope = { window: {} };
  vm.runInNewContext(
    readFileSync(new URL('../src/shared/site-config.js', import.meta.url), 'utf8'),
    scope,
  );
  vm.runInNewContext(
    readFileSync(new URL('../src/shared/product-details.js', import.meta.url), 'utf8'),
    scope,
  );
  const product = scope.window.SiteDefaults.products[0],
    get = scope.window.ProductDetails.get;
  const sample = get(product);
  assert.equal(sample.sampleInfo, true);
  assert.equal(sample.samplePrice, '฿1,267.82');
  assert.equal(sample.nutrition.length, 8);
  assert.equal(sample.certificates.length, 1);
  const legacy = get({
    ...product,
    details: {
      nutrition: [],
      summary: sample.summary.map((row) => ({ ...row, value: '' })),
      certificates: [],
    },
  });
  assert.equal(legacy.nutrition.length, 8);
  assert.equal(legacy.summary[0].value, '1 capsule');
  assert.equal(legacy.certificates.length, 1);
  const edited = get({
    ...product,
    details: { sampleInfo: true, nutrition: [], certificates: [], summary: [] },
  });
  assert.equal(edited.nutrition.length, 0);
  assert.equal(edited.certificates.length, 0);
  assert.equal(edited.summary.length, 0);
  const confirmed = get({ ...product, details: { sampleInfo: false, servingSize: '2 gummies' } });
  assert.equal(confirmed.sampleInfo, false);
  assert.equal(confirmed.servingSize, '2 gummies');
  assert.equal(confirmed.nutrition.length, 0);
});
