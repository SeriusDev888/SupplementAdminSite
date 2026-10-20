window.SiteDefaults = {
  isProductRoute: (route) => route === 'catalog' || /^product(?:\/|$)/.test(route),
  products: [
    {
      name: 'DAILY',
      title: 'Daily care',
      category: 'daily',
      tag: 'EVERYDAY CARE',
      mood: 'Care',
      subtitle: 'A little boost. A lovely day.',
      description:
        'Make a little room for yourself. A thoughtful addition to your everyday routine, inspired by the fresh mornings and green landscapes of Japan.',
      color: '#e6ecf7',
      ingredients: [
        ['V', 'Vitamins', 'A daily vitamin concept for your everyday ritual.'],
        ['C', 'Citrus', 'A bright, fresh inspiration from nature.'],
        ['葉', 'Botanicals', 'Inspired by the green landscapes of Japan.'],
      ],
      id: 'daily',
      image: '',
      active: true,
      cardSubtitle: 'Daily Vitamin / 毎日の健に',
      cardDescription: 'วิตามินรวมและสารอาหารที่จำเป็น\nสำหรับร่างกายในทุกวัน',
      benefits: [
        ['shield', 'เสริมภูมิคุ้มกัน'],
        ['heart', 'ดูแลสุขภาพโดยรวม'],
        ['bolt', 'เพิ่มพลังในแต่ละวัน'],
      ],
    },
    {
      name: 'GLOW',
      title: 'Glow collagen',
      category: 'beauty',
      tag: 'YOUR BEAUTY RITUAL',
      mood: 'Glow',
      subtitle: 'from the little things.',
      description:
        'Beauty care for your everyday life. A lovely pause in a busy day, inspired by soft peach blossoms and the simple pleasure of looking after yourself.',
      color: '#fbdce7',
      ingredients: [
        ['C', 'Collagen', 'At the heart of the GLOW collection concept.'],
        ['C⁺', 'Vitamin C', 'A bright addition to this daily beauty story.'],
        ['桃', 'Peach extract', 'A gentle botanical inspiration.'],
      ],
      id: 'glow',
      image: '',
      active: true,
      cardSubtitle: 'Collagen / 輝く毎日に',
      cardDescription: 'คอลลาเจนเพื่อผิวกระจ่างใส\nและดูสุขภาพดีจากภายใน',
      benefits: [
        ['face', 'ผิวกระจ่างใส'],
        ['hand', 'ยืดหยุ่น'],
        ['sun', 'ลดริ้วรอย'],
      ],
    },
    {
      name: 'CALM',
      title: 'Calm magnesium',
      category: 'balance',
      tag: 'A MOMENT FOR YOU',
      mood: 'Balance',
      subtitle: 'Make room for a softer moment.',
      description:
        'Turn down the pace and find a little space for yourself. A quiet daily ritual inspired by the stillness of a Japanese tea garden.',
      color: '#e9eddf',
      ingredients: [
        ['Mg', 'Magnesium', 'The mineral at the heart of the CALM concept.'],
        ['葉', 'Botanicals', 'A story inspired by peaceful green gardens.'],
        ['間', 'A little pause', 'An invitation to make time for yourself.'],
      ],
      id: 'calm',
      image: '',
      active: true,
      cardSubtitle: 'Magnesium / やさしい休息',
      cardDescription: 'แมกนีเซียมเพื่อการพักผ่อน\nและสมดุลของระบบประสาท',
      benefits: [
        ['leaf', 'ผ่อนคลาย'],
        ['moon', 'นอนหลับสบาย'],
        ['heart', 'ลดความเครียด'],
      ],
    },
  ],
  contact: {
    hero: {
      image: 'assets/contact-hero-bg.jpg',

      tag: {
        th: 'CONTACT US',
        en: 'CONTACT US',
      },

      title: {
        th: 'สอบถาม / สั่งซื้อสินค้า\nผ่าน LINE OA',
        en: 'Inquire & Order\nvia LINE OA',
      },

      subtitle: {
        th: 'พูดคุยกับทีมงานของเรา เพื่อสอบถามข้อมูลสินค้า รับคำแนะนำ\nหรือสั่งซื้อผ่าน LINE OA ได้ง่าย และรวดเร็ว',
        en: 'Talk with our team for product information, recommendations,\nor quick and easy ordering through LINE OA.',
      },

      features: [
        {
          th: 'สอบถามสินค้า\nได้ทันที',
          en: 'Ask about products\ninstantly',
        },
        {
          th: 'สั่งซื้อสะดวก\nผ่าน LINE OA',
          en: 'Order easily\nvia LINE OA',
        },
        {
          th: 'ทีมงานดูแล\nคุณอย่างใกล้ชิด',
          en: 'Friendly support\nfrom our team',
        },
      ],
    },

    line: {
      url: 'https://lin.ee/SVyOMJG',
      lineId: '',
      qrImage: 'assets/line-oa-qr.png',

      badge: {
        th: 'แนะนำ',
        en: 'RECOMMENDED',
      },

      title: {
        th: 'เพิ่มเพื่อน LINE OA\nเพื่อสั่งซื้อสินค้า',
        en: 'Add LINE OA\nfor Quick Ordering',
      },

      description: {
        th: 'รับข้อมูลสินค้า โปรโมชั่น และสั่งซื้อสินค้าผ่าน LINE OA\nได้ง่ายที่สุด ทีมงานตอบกลับอย่างรวดเร็ว',
        en: 'Get product information, promotions, and place orders easily through LINE OA.\nOur team will get back to you as soon as possible.',
      },

      buttonText: {
        th: 'เพิ่มเพื่อน LINE OA',
        en: 'Add LINE OA',
      },

      scanText: {
        th: 'สแกน QR Code\nเพื่อเพิ่มเพื่อน',
        en: 'Scan the QR Code\nto add us on LINE',
      },
    },

    form: {
      tag: {
        th: 'SEND US A MESSAGE',
        en: 'SEND US A MESSAGE',
      },

      title: {
        th: 'ส่งข้อความถึงเรา',
        en: 'Send us a message',
      },

      description: {
        th: 'หากมีคำถามเพิ่มเติม สามารถกรอกข้อมูลด้านล่างได้เลย ทีมงานของเราจะติดต่อกลับโดยเร็วที่สุด',
        en: 'Have a question? Fill in the form below and our team will get back to you as soon as possible.',
      },

      labels: {
        name: {
          th: 'ชื่อ-นามสกุล *',
          en: 'Name *',
        },
        email: {
          th: 'อีเมล *',
          en: 'Email *',
        },
        phone: {
          th: 'เบอร์โทรศัพท์',
          en: 'Phone number',
        },
        message: {
          th: 'รายละเอียดเพิ่มเติม',
          en: 'Message',
        },
      },

      placeholders: {
        name: {
          th: 'เช่น คุณสมชาย ใจดี',
          en: 'e.g. John Smith',
        },
        email: {
          th: 'เช่น name@example.com',
          en: 'e.g. name@example.com',
        },
        phone: {
          th: 'เช่น 081 234 5678',
          en: 'e.g. +66 81 234 5678',
        },
        message: {
          th: 'เช่น สอบถามสินค้า / สั่งซื้อจำนวนมาก / สนใจเป็นตัวแทนจำหน่าย ฯลฯ',
          en: 'e.g. Product enquiry / bulk order / distribution partnership',
        },
      },

      buttonText: {
        th: 'ส่งข้อความ',
        en: 'Send message',
      },

      sendingText: {
        th: 'กำลังส่งข้อความ...',
        en: 'Sending...',
      },

      successTitle: {
        th: 'ส่งข้อความเรียบร้อยแล้ว!',
        en: 'Message sent!',
      },

      successDescription: {
        th: 'ทีมงานได้รับข้อความของคุณแล้ว และจะติดต่อกลับโดยเร็วที่สุด',
        en: 'Our team has received your message and will get back to you as soon as possible.',
      },
    },

    location: {
      tag: {
        th: 'OUR LOCATION',
        en: 'OUR LOCATION',
      },

      title: {
        th: 'สถานที่ตั้งสำนักงาน',
        en: 'Our office location',
      },

      company: {
        th: 'Golden Ray Cellular Nutrition Co., Ltd.',
        en: 'Golden Ray Cellular Nutrition Co., Ltd.',
      },

      address: {
        th: '123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110',
        en: '123 Sukhumvit Road, Khlong Toei, Bangkok 10110, Thailand',
      },

      phone: '+66 (0) 2-123-4567',
      email: 'clinical@goldenray.com',

      officeHours: {
        th: 'จันทร์ - ศุกร์, 9:00 - 18:00 น.',
        en: 'Mon-Fri, 9:00 - 18:00',
      },

      emailNote: {
        th: 'ตอบกลับภายใน 24 ชั่วโมง',
        en: 'Replies within 24 hours',
      },

      standard: {
        th: 'GMP & ISO 22000',
        en: 'GMP & ISO 22000',
      },

      standardNote: {
        th: 'มาตรฐานการผลิต',
        en: 'Manufacturing standards',
      },

      mapButtonText: {
        th: 'ดูเส้นทางบน Google Maps',
        en: 'View on Google Maps',
      },

      mapUrl: 'https://maps.google.com/?q=13.736717,100.560449',

      mapEmbedUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3875.8821956100236!2d100.56044937589998!3d13.736717397268804!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e29ed8e5b8719f%3A0x6b8b0e8b1b2c3d4e!2sSukhumvit%20Rd%2C%20Khlong%20Toei%2C%20Bangkok!5e0!3m2!1sen!2sth!4v1700000000000!5m2!1sen!2sth',
    },
  },
  icons: {
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    leaf: 'M20 4C9 2 2 9 6 16c7 5 15-1 14-12ZM6 18 17 7M4 21l4-7',
    flower: 'M12 8c-5-9-10 0-5 3-9 3-2 11 3 6 1 9 10 5 7-1 8 1 7-8 1-8 3-7-6-9-6 0Z',
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
    heart: 'M12 20S2 14 3 8c1-6 8-5 9 0 2-5 9-6 10 0 1 6-10 12-10 12Z',
    bolt: 'm13 2-9 12h7l-1 8 10-13h-7l1-7Z',
    moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
    face: 'M7 5c0-4 10-4 10 0M5 7c0-4 14-4 14 0v7c0 9-14 9-14 0V7Zm3 5h1m6 0h1m-6 4q2 2 4 0',
    sun: 'M12 3V1m0 22v-2M3 12H1m22 0h-2M5 5 3 3m16 16 2 2M5 19l-2 2M19 5l2-2M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12',
    hand: 'M7 13V6c0-3 3-3 3 0v5-7c0-3 3-3 3 0v7-6c0-3 3-3 3 0v7-4c0-3 3-3 3 0v7c0 9-11 9-13 4l-3-5c-1-3 2-4 4-1Z',
    mail: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
    chat: 'M4 4h16v13H9l-5 4V4Zm4 5h8m-8 4h6',
    pin: 'M12 22S4 13 4 9a8 8 0 1 1 16 0c0 4-8 13-8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
    drop: 'M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13Z',
    sparkles: 'm12 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM20 16v6m-3-3h6',
    check: 'm4 12 5 5L20 5',
    flask: 'M8 2h8m-6 0v7L4 20q0 2 2 2h12q2 0 2-2l-6-11V2M7 16h10',
    mountain: 'm2 21 8-16 4 8 3-5 5 13H2Zm5-10 3 3 2-3',
    lotus:
      'M12 3c-6 6-5 11 0 16 5-5 6-10 0-16ZM5 8c-5 8-1 13 7 13 8 0 12-5 7-13M2 14c-2 6 2 9 10 7 8 2 12-1 10-7',
    award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM8 14l-2 8 6-3 6 3-2-8',
    bed: 'M3 18V8m0 6h18v7m0-7V9H9v5M3 18h18M3 21v-3M5 9h2v3H5Z',
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c-6 5-6 15 0 20 6-5 6-15 0-20Z',
  },
};
