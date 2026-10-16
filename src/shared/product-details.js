(() => {
  const summary = [
    ['hand', 'Serving size'],
    ['flask', 'Servings per container'],
    ['sun', 'Flavor'],
    ['leaf', 'Product type'],
    ['shield', 'Vitamin content'],
    ['flower', 'Dietary type'],
  ];
  const info = [
    ['hand', 'Suggested Use'],
    ['leaf', 'Other Ingredients'],
    ['flask', 'Free From'],
    ['mail', 'Specifications'],
    ['shield', 'Warnings'],
    ['globe', 'Storage'],
  ];
  const daily = {
    sampleInfo: true,
    samplePrice: '฿1,267.82',
    priceNote: 'ราคาตัวอย่าง · ฿63.39/serving',
    rating: '4.8',
    reviewCount: '128',
    trust: [
      { icon: 'shield', title: 'Authentic', text: 'CHASHITSU product' },
      { icon: 'chat', title: 'Easy ordering', text: 'via LINE OA' },
      { icon: 'heart', title: 'Support', text: 'from our team' },
    ],
    summary: [
      { icon: 'hand', label: 'Serving size', value: '1 capsule' },
      { icon: 'flask', label: 'Servings per container', value: '30' },
      { icon: 'sun', label: 'Flavor', value: 'Citrus (Natural orange)' },
      { icon: 'leaf', label: 'Product type', value: 'Dietary supplement' },
      { icon: 'shield', label: 'Vitamin content', value: 'Multi-vitamins' },
      { icon: 'flower', label: 'Dietary type', value: 'Gluten-free' },
    ],
    overview:
      'CHASHITSU DAILY is a daily vitamin concept inspired by the Japanese philosophy of balance and natural beauty. The sample formulation brings together vitamins, minerals and botanical ingredients for an everyday self-care ritual.',
    overviewBullets: [
      'Everyday vitamin and mineral concept',
      'Citrus-inspired addition to your daily routine',
      'Inspired by the harmony of nature and Japanese wellness',
      'A thoughtful moment to make room for yourself',
    ],
    overviewClosing:
      'Make a little room for yourself. DAILY is a simple, thoughtful addition to your everyday routine.',
    servingSize: '1 capsule',
    servingsPerContainer: '30',
    nutrition: [
      { name: 'Vitamin C (as Ascorbic Acid)', amount: '100 mg', dailyValue: '111%' },
      { name: 'Vitamin B1 (Thiamin)', amount: '1.2 mg', dailyValue: '100%' },
      { name: 'Vitamin B2 (Riboflavin)', amount: '1.3 mg', dailyValue: '100%' },
      { name: 'Vitamin B6 (Pyridoxine HCl)', amount: '1.7 mg', dailyValue: '100%' },
      { name: 'Vitamin B12 (Methylcobalamin)', amount: '2.4 mcg', dailyValue: '100%' },
      { name: 'Folate (Folic Acid)', amount: '400 mcg DFE', dailyValue: '100%' },
      { name: 'Vitamin D3 (Cholecalciferol)', amount: '10 mcg (400 IU)', dailyValue: '50%' },
      { name: 'Zinc (as Zinc Citrate)', amount: '10 mg', dailyValue: '91%' },
    ],
    nutritionFootnote: 'ตัวเลขตัวอย่างจากภาพอ้างอิง ยังไม่ใช่ฉลากสินค้าที่ยืนยันแล้ว',
    information: [
      {
        icon: 'hand',
        title: 'Suggested Use',
        body: 'ตัวอย่าง: Take 1 capsule daily with water, preferably with a meal, or as directed by a healthcare professional.',
      },
      {
        icon: 'leaf',
        title: 'Other Ingredients',
        body: 'ตัวอย่าง: Microcrystalline cellulose, citrus fruit powder, hypromellose (capsule), magnesium stearate (vegetable source), natural orange flavor.',
      },
      {
        icon: 'flask',
        title: 'Free From',
        body: 'ตัวอย่าง: No artificial colors, artificial flavors or preservatives. Please confirm all allergen and dietary details from the final label.',
      },
      {
        icon: 'mail',
        title: 'Specifications',
        body: 'ตัวอย่าง: 30 capsules per container · Net weight 18 g · Package dimensions 5.5 × 5.5 × 9.0 cm.',
      },
      {
        icon: 'shield',
        title: 'Warnings',
        body: 'ตัวอย่าง: For adults only. Consult a healthcare professional if pregnant, nursing, taking medication or managing a medical condition. Keep out of reach of children.',
      },
      {
        icon: 'globe',
        title: 'Storage',
        body: 'ตัวอย่าง: Store in a cool, dry place away from direct sunlight. Keep the bottle closed after use.',
      },
    ],
    certificates: [
      {
        id: 'daily-sample-sheet',
        title: 'Sample Product Information Sheet',
        description: 'เอกสารตัวอย่างสำหรับจัดหน้า ไม่ใช่ใบรับรองหรือฉลากสินค้าที่ผ่านการยืนยัน',
        url: '/assets/daily-product-information-sample.pdf',
        filename: 'daily-product-information-sample.pdf',
      },
    ],
    faq: [
      {
        question: 'What is CHASHITSU DAILY?',
        answer:
          'DAILY is the everyday care concept in the CHASHITSU collection, inspired by citrus and the green landscapes of Japan.',
      },
      {
        question: 'How should I take CHASHITSU DAILY?',
        answer:
          'The reference layout uses 1 capsule daily with water as sample copy. Confirm the directions on the final product label before use.',
      },
      {
        question: 'Is CHASHITSU DAILY suitable for vegetarians?',
        answer:
          'Please check the final capsule and ingredient list or ask our team for confirmed dietary information.',
      },
      {
        question: 'Does CHASHITSU DAILY contain allergens?',
        answer:
          'Please refer to the final product label for the full allergen statement before use.',
      },
      {
        question: 'Can I take CHASHITSU DAILY with other supplements?',
        answer:
          'Please discuss combinations with a qualified healthcare professional using the confirmed product label.',
      },
      {
        question: 'Where is CHASHITSU DAILY made?',
        answer:
          'Please contact CHASHITSU for the confirmed manufacturing origin of the final product.',
      },
    ],
  };
  function get(p) {
    const existing = p.details || {},
      base = {
        gallery: [],
        sampleInfo: false,
        samplePrice: '',
        priceNote: '',
        stockStatus: 'unconfirmed',
        rating: '',
        reviewCount: '',
        reviewUrl: '',
        askUrl: '',
        orderLabel: 'Order via LINE OA',
        askLabel: 'Ask on LINE',
        trust: [
          { icon: 'shield', title: 'Product information', text: 'From the brand' },
          { icon: 'chat', title: 'Ordering enquiries', text: 'Contact our team' },
          { icon: 'heart', title: 'We’re here to help', text: 'Ask us about this product' },
        ],
        summary: summary.map(([icon, label]) => ({ icon, label, value: '' })),
        overview: p.description || '',
        overviewBullets: [],
        overviewClosing: '',
        servingSize: '',
        servingsPerContainer: '',
        nutrition: [],
        nutritionFootnote: '',
        information: info.map(([icon, title]) => ({
          icon,
          title,
          body: title === 'Specifications' && p.sku ? 'Product code: ' + p.sku : '',
        })),
        certificates: [],
        faq: [
          {
            question: 'Where can I find the collection?',
            answer: 'Contact our team for current availability and ordering details.',
          },
          {
            question: 'Where can I see the final product details?',
            answer:
              'Please refer to the product label and the documents provided on this page for confirmed product information.',
          },
        ],
        relatedIds: [],
      };
    if (p.id !== 'daily' || existing.sampleInfo === false) return { ...base, ...existing };
    const result = { ...base, ...daily, ...existing };
    if (existing.sampleInfo !== undefined) return result;
    for (const key of [
      'samplePrice',
      'priceNote',
      'rating',
      'reviewCount',
      'overviewClosing',
      'servingSize',
      'servingsPerContainer',
      'nutritionFootnote',
    ])
      if (!existing[key]) result[key] = daily[key];
    if (!existing.overview || existing.overview === p.description) result.overview = daily.overview;
    if (!existing.nutrition?.length) result.nutrition = daily.nutrition;
    if (!existing.certificates?.length) result.certificates = daily.certificates;
    if (!existing.overviewBullets?.length) result.overviewBullets = daily.overviewBullets;
    if (
      existing.faq?.length === 2 &&
      existing.faq[0]?.question === 'Where can I find the collection?'
    )
      result.faq = daily.faq;
    if (existing.trust?.[0]?.title === 'Product information') result.trust = daily.trust;
    if (existing.summary?.length === 6)
      result.summary = existing.summary.map((row, i) => ({
        ...row,
        value: row.value || daily.summary[i].value,
      }));
    if (existing.information?.length === 6)
      result.information = existing.information.map((row, i) => ({
        ...row,
        body: row.body || daily.information[i].body,
      }));
    return result;
  }
  window.ProductDetails = {
    get,
    price: (p) => p?.price || (get(p).sampleInfo ? get(p).samplePrice : '') || '',
  };
})();
