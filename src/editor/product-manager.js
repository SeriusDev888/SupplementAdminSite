(() => {
  const api = EditorAPI,
    cms = CMSAdmin,
    $ = (id) => document.getElementById(id),
    panel = document.createElement('div');
  panel.id = 'product-detail-manager';
  $('tab-products').append(panel);
  const names = {
    leaf: 'ใบไม้',
    flower: 'ดอกไม้',
    shield: 'โล่',
    heart: 'หัวใจ',
    bolt: 'พลังงาน',
    moon: 'พระจันทร์',
    face: 'ผิวพรรณ',
    sun: 'แสงแดด',
    hand: 'มือ',
    star: 'ดาว',
    drop: 'หยดน้ำ',
    sparkles: 'ประกาย',
    check: 'เครื่องหมายถูก',
    flask: 'งานวิจัย',
    mountain: 'ภูเขา',
    lotus: 'ดอกบัว',
    award: 'คุณภาพ',
    bed: 'การพักผ่อน',
    globe: 'โลก',
    mail: 'เอกสาร',
    chat: 'แชต',
    pin: 'สถานที่',
    arrow: 'ลูกศร',
  };
  let renderedProduct = '';
  const current = () => cms.getProduct(),
    details = () => ProductDetails.get(current());
  function update(values, id = current().id) {
    const p = cms.getCatalog().find((x) => x.id === id);
    if (p) cms.updateProduct(id, { details: { ...ProductDetails.get(p), ...values } });
  }
  const element = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  function field(label, value, change, { type = 'text', options, id, placeholder = '' } = {}) {
    const wrap = element('label', 'field', label);
    let input;
    if (options) {
      input = document.createElement('select');
      options.forEach(([v, t]) => input.add(new Option(t, v)));
    } else input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    if (!options && type !== 'textarea') input.type = type;
    input.value = value ?? '';
    if (id) input.id = id;
    if (placeholder) input.placeholder = placeholder;
    if (type === 'textarea') input.rows = 3;
    input.onchange = () => change(input.value);
    wrap.append(input);
    return wrap;
  }
  function section(title, subtitle, open = false) {
    const el = document.createElement('details');
    el.className = 'product-manager-section';
    el.open = open;
    el.append(element('summary', '', title));
    if (subtitle) el.append(element('p', 'hint', subtitle));
    const body = element('div', 'product-manager-section-body');
    el.append(body);
    panel.append(el);
    return body;
  }
  function input(body, key, label, options = {}) {
    const value = details()[key];
    body.append(
      field(label, value, (v) => update({ [key]: v }), { id: 'pd-edit-' + key, ...options }),
    );
  }
  function rows(body, key, fields, blank, max) {
    const add = element('button', 'manager-add-row', '＋ เพิ่มรายการ');
    add.type = 'button';
    add.dataset.addRow = key;
    const list = element('div', 'manager-row-list');
    list.dataset.list = key;
    body.append(list, add);
    const draw = () => {
      list.replaceChildren();
      const values = details()[key] || [];
      add.disabled = values.length >= max;
      values.forEach((value, index) => {
        const row = element('div', 'manager-data-row');
        row.dataset.row = index;
        row.append(element('span', 'manager-row-number', String(index + 1).padStart(2, '0')));
        const fieldsWrap = element('div', 'manager-row-fields');
        for (const [k, label, type] of fields) {
          fieldsWrap.append(
            field(
              label,
              value[k],
              (v) => {
                const items = structuredClone(details()[key]);
                if (!items[index]) return;
                items[index][k] = v;
                update({ [key]: items });
              },
              {
                type: type || 'text',
                options: k === 'icon' ? Object.entries(names) : undefined,
                id: 'pd-' + key + '-' + index + '-' + k,
              },
            ),
          );
        }
        row.append(fieldsWrap);
        const actions = element('div', 'manager-row-actions');
        for (const [step, text] of [
          [-1, '↑'],
          [1, '↓'],
          [0, 'นำออก'],
        ]) {
          const b = element('button', '', text);
          b.type = 'button';
          b.setAttribute(
            'aria-label',
            step
              ? (step < 0 ? 'เลื่อนขึ้น' : 'เลื่อนลง') + ' รายการ ' + (index + 1)
              : 'นำรายการ ' + (index + 1) + ' ออก',
          );
          b.disabled = step < 0 ? index === 0 : step > 0 ? index === values.length - 1 : false;
          b.onclick = () => {
            const items = structuredClone(details()[key]);
            if (step) [items[index], items[index + step]] = [items[index + step], items[index]];
            else items.splice(index, 1);
            update({ [key]: items });
            draw();
          };
          actions.append(b);
        }
        row.append(actions);
        if (key === 'gallery') {
          const img = element('img', 'manager-gallery-preview');
          img.src = value.url || '';
          img.alt = value.alt || 'รูปแกลเลอรี';
          img.hidden = !value.url;
          row.prepend(img);
          for (const [method, label] of [
            ['chooseMedia', 'เลือกจากคลัง'],
            ['uploadMedia', 'อัปโหลดรูป'],
          ]) {
            const b = element('button', '', label);
            b.type = 'button';
            b.onclick = () => {
              const id = current().id;
              api[method]((url) => {
                const p = cms.getCatalog().find((x) => x.id === id);
                if (!p) return;
                const items = structuredClone(ProductDetails.get(p).gallery);
                if (!items[index]) return;
                items[index].url = url;
                update({ gallery: items }, id);
                api.tab('products');
                render(true);
              });
            };
            actions.append(b);
          }
        }
        if (key === 'certificates') {
          const b = element('button', '', value.filename ? 'เปลี่ยนไฟล์ PDF' : 'อัปโหลด PDF');
          b.type = 'button';
          b.dataset.pdfUpload = index;
          b.onclick = () => uploadPDF(current().id, value.id, index, b);
          actions.append(b);
          if (value.filename) fieldsWrap.append(element('p', 'hint', 'ไฟล์: ' + value.filename));
        }
        list.append(row);
      });
    };
    add.onclick = () => {
      const items = structuredClone(details()[key] || []);
      if (items.length >= max) return;
      items.push(typeof blank === 'function' ? blank() : structuredClone(blank));
      update({ [key]: items });
      draw();
    };
    draw();
  }
  async function uploadPDF(productId, certificateId, index, button) {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'application/pdf,.pdf';
    picker.hidden = true;
    picker.id = 'certificate-file-input';
    document.body.append(picker);
    picker.oncancel = () => picker.remove();
    picker.onchange = async () => {
      const file = picker.files[0];
      if (!file) {
        picker.remove();
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        api.toast('ไฟล์ PDF ต้องมีขนาดไม่เกิน 10 MB');
        picker.remove();
        return;
      }
      button.disabled = true;
      button.textContent = 'กำลังอัปโหลด…';
      try {
        const data = await StudioUpload(file, 'pdf');
        const p = cms.getCatalog().find((v) => v.id === productId);
        if (!p) return;
        const items = structuredClone(ProductDetails.get(p).certificates);
        const target = certificateId ? items.find((v) => v.id === certificateId) : items[index];
        if (!target) return;
        target.url = data.url;
        target.filename = data.filename;
        update({ certificates: items }, productId);
        api.toast('อัปโหลด PDF แล้ว บันทึกฉบับร่างเพื่อเก็บการเปลี่ยนแปลง');
        render(true);
      } catch (e) {
        api.toast(e.message);
        button.disabled = false;
        button.textContent = 'ลองอัปโหลด PDF อีกครั้ง';
      } finally {
        picker.remove();
      }
    };
    picker.click();
  }
  function render(force = false) {
    const p = current();
    panel.hidden = !p;
    if (!p) {
      panel.replaceChildren();
      renderedProduct = '';
      return;
    }
    if (!force && renderedProduct === p.id && panel.contains(document.activeElement)) return;
    const opened = [...panel.querySelectorAll('details[open] summary')].map((x) => x.textContent);
    renderedProduct = p.id;
    panel.replaceChildren();
    let body = section(
      'รูปแกลเลอรี',
      'รูปสินค้าหลักใช้จากด้านบน เพิ่มรูปมุมอื่นหรือรายละเอียดสินค้าได้อีก 12 รูป',
      true,
    );
    rows(
      body,
      'gallery',
      [
        ['url', 'URL รูปภาพ'],
        ['alt', 'คำอธิบายรูป'],
      ],
      { url: '', alt: '' },
      12,
    );
    body = section(
      'ราคา สถานะสินค้า และรีวิว',
      'ราคาและลิงก์สั่งซื้อใช้ช่องด้านบน กรอกคะแนนและจำนวนรีวิวเมื่อมีข้อมูลจริง',
    );
    const sample = element('label', 'related-product-choice'),
      sampleToggle = document.createElement('input');
    sampleToggle.type = 'checkbox';
    sampleToggle.id = 'pd-edit-sampleInfo';
    sampleToggle.checked = !!details().sampleInfo;
    sampleToggle.onchange = () => update({ sampleInfo: sampleToggle.checked });
    sample.append(
      sampleToggle,
      document.createTextNode('แสดงป้ายว่าเป็นข้อมูลตัวอย่าง (เปิดไว้จนกว่าจะยืนยันข้อมูลสินค้า)'),
    );
    body.append(sample);
    input(body, 'samplePrice', 'ราคาตัวอย่างบนหน้าสินค้า (ราคาจริงกรอกช่องราคาด้านบน)');
    input(body, 'stockStatus', 'สถานะสินค้า', {
      options: [
        ['unconfirmed', 'สอบถามสถานะสินค้า'],
        ['in_stock', 'มีสินค้า'],
        ['out_of_stock', 'สินค้าหมด'],
        ['preorder', 'พรีออเดอร์'],
      ],
    });
    input(body, 'rating', 'คะแนนรีวิว (0–5)', { type: 'number' });
    input(body, 'reviewCount', 'จำนวนรีวิว', { type: 'number' });
    input(body, 'reviewUrl', 'ลิงก์อ่านรีวิว');
    input(body, 'orderLabel', 'ข้อความปุ่มสั่งซื้อ');
    input(body, 'askLabel', 'ข้อความปุ่มสอบถาม');
    input(body, 'askUrl', 'ลิงก์สอบถาม / LINE');
    body = section('ข้อความบริการใต้ปุ่มสั่งซื้อ', 'แก้ไอคอนและข้อความแต่ละรายการ');
    rows(
      body,
      'trust',
      [
        ['icon', 'ไอคอน'],
        ['title', 'หัวข้อ'],
        ['text', 'ข้อความรอง'],
      ],
      { icon: 'shield', title: '', text: '' },
      6,
    );
    body = section(
      'ข้อมูลสรุปสินค้า',
      'เช่น ปริมาณต่อครั้ง จำนวนหน่วย รสชาติ ประเภทสินค้า และข้อมูลอาหาร',
    );
    rows(
      body,
      'summary',
      [
        ['icon', 'ไอคอน'],
        ['label', 'หัวข้อ'],
        ['value', 'ข้อมูล'],
      ],
      { icon: 'leaf', label: '', value: '' },
      12,
    );
    body = section('Overview · รายละเอียดสินค้า', 'คำอธิบาย จุดเด่น และข้อความเพิ่มเติม');
    input(body, 'overview', 'รายละเอียดโดยรวม', { type: 'textarea' });
    body.append(
      field(
        'จุดเด่น (หนึ่งข้อต่อบรรทัด)',
        details().overviewBullets.join('\n'),
        (v) =>
          update({
            overviewBullets: v
              .split('\n')
              .map((x) => x.trim())
              .filter(Boolean),
          }),
        { type: 'textarea', id: 'pd-edit-overviewBullets' },
      ),
    );
    input(body, 'overviewClosing', 'ข้อความปิดท้าย', { type: 'textarea' });
    body = section(
      'Supplement Facts · ตารางส่วนประกอบ',
      'กรอกข้อมูลตามฉลากที่ยืนยันแล้ว ช่องที่ยังไม่มีข้อมูลเว้นว่างได้',
    );
    input(body, 'servingSize', 'Serving size');
    input(body, 'servingsPerContainer', 'Servings per container');
    rows(
      body,
      'nutrition',
      [
        ['name', 'ชื่อสารอาหาร'],
        ['amount', 'ปริมาณต่อหน่วย'],
        ['dailyValue', '% Daily Value'],
      ],
      { name: '', amount: '', dailyValue: '' },
      80,
    );
    input(body, 'nutritionFootnote', 'หมายเหตุใต้ตาราง', { type: 'textarea' });
    body = section(
      'วิธีใช้ ส่วนผสม และข้อมูลเพิ่มเติม',
      'จัดการ Suggested Use, Other Ingredients, Free From, Specifications, Warnings และ Storage',
    );
    rows(
      body,
      'information',
      [
        ['icon', 'ไอคอน'],
        ['title', 'หัวข้อ'],
        ['body', 'รายละเอียด', 'textarea'],
      ],
      { icon: 'leaf', title: '', body: '' },
      12,
    );
    body = section(
      'Certifications & Quality · เอกสาร PDF',
      'อัปโหลดไฟล์ PDF ไม่เกิน 10 MB ต่อไฟล์ หรือวางลิงก์ PDF พร้อมชื่อและคำอธิบายเอกสาร',
    );
    rows(
      body,
      'certificates',
      [
        ['title', 'ชื่อเอกสาร'],
        ['description', 'รายละเอียด', 'textarea'],
        ['url', 'ลิงก์ PDF'],
      ],
      () => ({
        id: crypto.randomUUID(),
        title: 'เอกสารผลิตภัณฑ์',
        description: '',
        url: '',
        filename: '',
      }),
      20,
    );
    body = section(
      'Questions and answers · คำถาม–คำตอบ',
      'เพิ่ม แก้ไข หรือนำคำถามของสินค้านี้ออกได้',
    );
    rows(
      body,
      'faq',
      [
        ['question', 'คำถาม'],
        ['answer', 'คำตอบ', 'textarea'],
      ],
      { question: '', answer: '' },
      30,
    );
    body = section(
      'You may also like · สินค้าที่เกี่ยวข้อง',
      'หากไม่เลือก ระบบจะแสดงสินค้าอื่นที่เปิดใช้งาน สูงสุด 4 รายการ',
    );
    for (const other of cms.getCatalog().filter((x) => x.id !== p.id)) {
      const label = element('label', 'related-product-choice'),
        checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = details().relatedIds.includes(other.id);
      checkbox.onchange = () => {
        const ids = new Set(details().relatedIds);
        checkbox.checked ? ids.add(other.id) : ids.delete(other.id);
        update({ relatedIds: [...ids] });
      };
      label.append(checkbox, document.createTextNode(other.name));
      body.append(label);
    }
    if (opened.length)
      panel
        .querySelectorAll('details')
        .forEach((el) => (el.open = opened.includes(el.querySelector('summary').textContent)));
  }
  addEventListener('cms:product', () => render());
  addEventListener('editor:document', () => render());
  render();
})();
