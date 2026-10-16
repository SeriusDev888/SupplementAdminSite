// Keep the editor's own header in sync with the same saved brand as the website.
(() => {
  function syncStudioBrand() {
    const brand = EditorAPI.document()?.brand || {};
    const name = brand.name || 'CHASHITSU';
    document.getElementById('studio-brand-name').textContent = name;
    const symbol = document.querySelector('.studio-brand > b');
    symbol.replaceChildren();
    if (brand.logo) {
      const image = document.createElement('img');
      image.src = brand.logo;
      image.alt = name;
      symbol.append(image);
      symbol.classList.add('has-brand-logo');
    } else {
      symbol.textContent = brand.mark || 'C';
      symbol.classList.remove('has-brand-logo');
    }
    document.querySelector('.studio-brand').setAttribute('aria-label', name);
    document.title = name + ' · แก้ไขเว็บไซต์';
  }
  addEventListener('editor:document', syncStudioBrand);
  syncStudioBrand();
})();

(() => {
  const api = EditorAPI,
    $ = (id) => document.getElementById(id);
  function brand(values) {
    api.mutate(() => {
      api.document().brand = { ...api.document().brand, ...values };
    });
  }
  for (const key of ['name', 'mark', 'tagline', 'logo'])
    $('brand-' + key).onchange = () => brand({ [key]: $('brand-' + key).value });
  for (const [id, method] of [
    ['brand-pick', 'chooseMedia'],
    ['brand-upload', 'uploadMedia'],
  ])
    $(id).onclick = () =>
      api[method]((url) => {
        brand({ logo: url });
        $('brand-logo').value = url;
        api.tab('brand');
      });
  $('brand-reset-logo').onclick = () => {
    brand({ logo: '' });
    $('brand-logo').value = '';
  };
})();
