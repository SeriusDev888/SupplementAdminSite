// Contact content shares the editor's draft, undo, save and publish lifecycle.
(() => {
  const api = window.EditorAPI;
  const defaults = window.SiteDefaults?.contact || {};
  const host = document.getElementById('tab-contact');

  if (!api || !host) return;

  const clone = (value) => structuredClone(value);

  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const isObject = (value) =>
    value && typeof value === 'object' && !Array.isArray(value);

  function merge(base, custom) {
    if (Array.isArray(base)) {
      if (!Array.isArray(custom)) return clone(base);

      return base.map((item, index) => {
        if (custom[index] === undefined) return clone(item);

        if (isObject(item) && isObject(custom[index]))
          return merge(item, custom[index]);

        return clone(custom[index]);
      });
    }

    if (!isObject(base))
      return custom === undefined ? clone(base) : clone(custom);

    const result = clone(base);

    if (!isObject(custom)) return result;

    for (const [key, value] of Object.entries(custom)) {
      if (isObject(result[key]) && isObject(value))
        result[key] = merge(result[key], value);
      else if (Array.isArray(result[key]) && Array.isArray(value))
        result[key] = merge(result[key], value);
      else
        result[key] = clone(value);
    }

    return result;
  }

  function contact() {
    return merge(defaults, api.document()?.contact || {});
  }

  function read(path) {
    let value = contact();

    for (const key of path) {
      if (value === undefined || value === null) return '';
      value = value[key];
    }

    return value ?? '';
  }

  function write(path, value) {
    api.mutate(() => {
      const doc = api.document();
      if (!doc) return;

      const next = contact();
      let target = next;

      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        const nextKey = path[i + 1];

        if (target[key] === undefined || target[key] === null) {
          target[key] = typeof nextKey === 'number' ? [] : {};
        }

        target = target[key];
      }

      target[path[path.length - 1]] = value;

      /*
       * contact.details จาก draft รุ่นเก่าอาจยังติดมาด้วย
       * merge() จะรักษาค่านั้นไว้ เพื่อไม่ทำ draft เก่าพัง
       */
      doc.contact = next;
    });
  }

  /*
   * เก็บ reference ของ input ทั้งหมดไว้
   * เวลา Draft เปลี่ยน เราจะ sync ค่าโดยไม่ render panel ใหม่
   * เพื่อไม่ให้ cursor เด้งระหว่างพิมพ์
   */
  const controls = [];

  function register(input, path) {
    controls.push({ input, path });
    return input;
  }

  function section(title, description, open = false) {
    const details = make('details', 'product-manager-section');
    details.open = open;

    details.append(make('summary', '', title));

    if (description)
      details.append(make('p', 'hint', description));

    const body = make('div', 'product-manager-section-body');
    details.append(body);
    panel.append(details);

    return body;
  }

  function field(
    body,
    label,
    path,
    {
      type = 'text',
      rows = 3,
      placeholder = '',
      maxLength,
    } = {},
  ) {
    const wrap = make('label', 'field', label);

    const input =
      type === 'textarea'
        ? document.createElement('textarea')
        : document.createElement('input');

    if (type === 'textarea') {
      input.rows = rows;
    } else {
      input.type = type;
    }

    if (placeholder) input.placeholder = placeholder;
    if (maxLength) input.maxLength = maxLength;

    input.value = read(path);

    input.onchange = () => {
      write(path, input.value);
    };

    register(input, path);
    wrap.append(input);
    body.append(wrap);

    return input;
  }

  function localizedFields(
    body,
    title,
    path,
    options = {},
  ) {
    const group = make('div', 'contact-language-group');

    const heading = make('h3', 'contact-field-heading', title);
    group.append(heading);

    const grid = make('div', 'field-grid');

    const thWrap = make('label', 'field', 'ภาษาไทย');
    const enWrap = make('label', 'field', 'English');

    const createInput = (lang, wrap) => {
      const input =
        options.type === 'textarea'
          ? document.createElement('textarea')
          : document.createElement('input');

      if (options.type === 'textarea') {
        input.rows = options.rows || 3;
      } else {
        input.type = options.type || 'text';
      }

      if (options.maxLength)
        input.maxLength = options.maxLength;

      input.value = read([...path, lang]);

      input.onchange = () => {
        write([...path, lang], input.value);
      };

      register(input, [...path, lang]);

      wrap.append(input);
    };

    createInput('th', thWrap);
    createInput('en', enWrap);

    grid.append(thWrap, enWrap);
    group.append(grid);
    body.append(group);
  }

  function mediaField(body, title, path, alt = '') {
    const block = make('div', 'contact-media-field');

    const label = make('h3', 'contact-field-heading', title);
    block.append(label);

    const preview = make('img', 'admin-image-preview');
    preview.alt = alt || title;

    const url = read(path);
    preview.src = url;
    preview.hidden = !url;

    const urlField = make('label', 'field', 'URL รูปภาพ');

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'assets/... หรือเลือกจากคลังรูป';
    input.value = url;

    input.onchange = () => {
      write(path, input.value);
      updatePreview();
    };

    register(input, path);
    urlField.append(input);

    const buttons = make('div', 'button-grid');

    const choose = make('button', '', 'เลือกจากคลัง');
    const upload = make('button', '', 'อัปโหลดรูป');
    const clear = make('button', 'quiet', 'เอารูปออก');

    choose.type = 'button';
    upload.type = 'button';
    clear.type = 'button';

    const updatePreview = () => {
      const value = read(path);
      input.value = value;
      preview.src = value || '';
      preview.hidden = !value;
    };

    const picker = (method) => {
      api[method]((selectedUrl) => {
        write(path, selectedUrl);
        updatePreview();
        api.tab('contact');
      });
    };

    choose.onclick = () => picker('chooseMedia');
    upload.onclick = () => picker('uploadMedia');

    clear.onclick = () => {
      write(path, '');
      updatePreview();
    };

    buttons.append(choose, upload, clear);
    block.append(preview, urlField, buttons);

    /*
     * preview ไม่ใช่ input จึง sync แยก
     */
    controls.push({
      input: preview,
      path,
      image: true,
    });

    body.append(block);
  }

  /*
   * ล้าง contact-details รุ่นเก่า
   * แล้วใช้ #tab-contact เดิมเป็น host ของ Contact Manager ใหม่
   */
  host.replaceChildren();

  const intro = make('div', 'panel-intro');
  intro.append(
    make('span', 'tiny', 'CONTACT MANAGEMENT'),
    make('h2', '', 'จัดการ Contact'),
    make(
      'p',
      '',
      'แก้ข้อมูลหน้า Contact ทั้งภาษาไทยและอังกฤษ รวมถึง LINE OA รูปภาพ และข้อมูลสำนักงาน',
    ),
  );

  host.append(intro);

  const panel = make('div', 'contact-manager');
  panel.id = 'contact-manager';
  host.append(panel);

  /*
   * HERO
   */
  let body = section(
    'Contact Heading',
    'ข้อความส่วนบนของหน้า Contact',
    true,
  );

  localizedFields(body, 'ข้อความกำกับ', ['hero', 'tag'], {
    maxLength: 300,
  });

  localizedFields(body, 'หัวข้อหลัก', ['hero', 'title'], {
    type: 'textarea',
    rows: 2,
    maxLength: 1500,
  });

  localizedFields(body, 'คำอธิบาย', ['hero', 'subtitle'], {
    type: 'textarea',
    rows: 3,
    maxLength: 5000,
  });
  /*
   * LINE OA
   */
  body = section(
    'LINE OA',
    'ข้อมูลสำหรับปุ่มเพิ่มเพื่อน การสั่งซื้อ และ QR Code',
  );

  field(
    body,
    'LINE URL',
    ['line', 'url'],
    {
      placeholder: 'https://lin.ee/...',
      maxLength: 2000,
    },
  );

  field(
    body,
    'LINE ID',
    ['line', 'lineId'],
    {
      placeholder: '@goldenraysupplement',
      maxLength: 200,
    },
  );

  mediaField(
    body,
    'QR Code',
    ['line', 'qrImage'],
    'LINE OA QR Code',
  );

  localizedFields(
    body,
    'ป้ายแนะนำ',
    ['line', 'badge'],
    { maxLength: 300 },
  );

  localizedFields(
    body,
    'หัวข้อ LINE OA',
    ['line', 'title'],
    {
      type: 'textarea',
      rows: 2,
      maxLength: 1500,
    },
  );

  localizedFields(
    body,
    'คำอธิบาย LINE OA',
    ['line', 'description'],
    {
      type: 'textarea',
      rows: 3,
      maxLength: 5000,
    },
  );

  localizedFields(
    body,
    'ข้อความบนปุ่ม',
    ['line', 'buttonText'],
    { maxLength: 500 },
  );

  localizedFields(
    body,
    'ข้อความข้าง QR Code',
    ['line', 'scanText'],
    {
      type: 'textarea',
      rows: 2,
      maxLength: 1000,
    },
  );

  /*
   * CONTACT FORM
   */
  body = section(
    'Contact Form',
    'ข้อความของฟอร์มเท่านั้น ตอนนี้ฟอร์มเป็น UI และยังไม่ได้เชื่อมระบบส่งข้อมูล',
  );

  localizedFields(
    body,
    'ข้อความกำกับ',
    ['form', 'tag'],
    { maxLength: 300 },
  );

  localizedFields(
    body,
    'หัวข้อฟอร์ม',
    ['form', 'title'],
    { maxLength: 1500 },
  );

  localizedFields(
    body,
    'คำอธิบายฟอร์ม',
    ['form', 'description'],
    {
      type: 'textarea',
      rows: 3,
      maxLength: 5000,
    },
  );

  for (const [key, title] of [
    ['name', 'ชื่อ-นามสกุล'],
    ['email', 'อีเมล'],
    ['phone', 'เบอร์โทรศัพท์'],
    ['message', 'รายละเอียดเพิ่มเติม'],
  ]) {
    localizedFields(
      body,
      `Label · ${title}`,
      ['form', 'labels', key],
      { maxLength: 500 },
    );

    localizedFields(
      body,
      `Placeholder · ${title}`,
      ['form', 'placeholders', key],
      {
        type: key === 'message' ? 'textarea' : 'text',
        rows: 2,
        maxLength: 1500,
      },
    );
  }

  localizedFields(
    body,
    'ข้อความปุ่ม',
    ['form', 'buttonText'],
    { maxLength: 500 },
  );

  /*
   * เตรียมไว้สำหรับวันที่เชื่อม backend จริง
   * ตอนนี้ Contact Page จะยังไม่แสดง success ปลอม
   */
  const future = make('details', 'contact-future-fields');
  future.append(
    make(
      'summary',
      '',
      'ข้อความสำหรับตอนเชื่อมระบบส่งข้อความในอนาคต',
    ),
  );

  const futureBody = make('div', 'product-manager-section-body');

  localizedFields(
    futureBody,
    'ข้อความขณะกำลังส่ง',
    ['form', 'sendingText'],
    { maxLength: 500 },
  );

  localizedFields(
    futureBody,
    'หัวข้อเมื่อส่งสำเร็จ',
    ['form', 'successTitle'],
    { maxLength: 1000 },
  );

  localizedFields(
    futureBody,
    'รายละเอียดเมื่อส่งสำเร็จ',
    ['form', 'successDescription'],
    {
      type: 'textarea',
      rows: 2,
      maxLength: 3000,
    },
  );

  future.append(futureBody);
  body.append(future);

     /*
   * LOCATION
   */
  body = section(
    'Location & Office',
    'ข้อมูลสำนักงาน ช่องทางติดต่อ และ Google Maps',
  );

  /*
   * 1. PHONE
   */
  const phoneHeading = make(
    'h3',
    'contact-field-heading',
    'โทรศัพท์',
  );
  body.append(phoneHeading);

  field(
    body,
    'เบอร์โทรศัพท์',
    ['location', 'phone'],
    {
      type: 'tel',
      maxLength: 500,
    },
  );

  localizedFields(
    body,
    'เวลาทำการ',
    ['location', 'officeHours'],
    { maxLength: 1000 },
  );

  /*
   * 2. EMAIL
   */
  const emailHeading = make(
    'h3',
    'contact-field-heading',
    'อีเมล',
  );
  body.append(emailHeading);

  field(
    body,
    'อีเมล',
    ['location', 'email'],
    {
      type: 'email',
      maxLength: 500,
    },
  );

  localizedFields(
    body,
    'ข้อความใต้ Email',
    ['location', 'emailNote'],
    { maxLength: 1000 },
  );

  /*
   * 3. ADDRESS
   */
  const addressHeading = make(
    'h3',
    'contact-field-heading',
    'ที่อยู่',
  );
  body.append(addressHeading);

  localizedFields(
    body,
    'ชื่อบริษัท',
    ['location', 'company'],
    { maxLength: 1000 },
  );

  localizedFields(
    body,
    'ที่อยู่',
    ['location', 'address'],
    {
      type: 'textarea',
      rows: 3,
      maxLength: 5000,
    },
  );

  /*
   * 4. GOOGLE MAPS
   */
  const mapHeading = make(
    'h3',
    'contact-field-heading',
    'Google Maps',
  );
  body.append(mapHeading);

  field(
    body,
    'Google Maps URL',
    ['location', 'mapUrl'],
    {
      placeholder: 'https://maps.google.com/...',
      maxLength: 2000,
    },
  );

  field(
    body,
    'Google Maps Embed URL',
    ['location', 'mapEmbedUrl'],
    {
      placeholder: 'https://www.google.com/maps/embed?...',
      maxLength: 2000,
    },
  );

  /*
   * Sync ค่าเมื่อ Draft ถูกโหลดใหม่, Undo/Redo
   * หรือ document เปลี่ยนจากส่วนอื่นของ Studio
   */
  function sync() {
    if (!api.document()) return;

    for (const control of controls) {
      const value = read(control.path);

      if (control.image) {
        control.input.src = value || '';
        control.input.hidden = !value;
        continue;
      }

      if (document.activeElement !== control.input)
        control.input.value = value;
    }
  }

  addEventListener('editor:document', sync);

  sync();
})();
