# supplement-admin-site

CHASHITSU Website Studio และ CMS API แยกจากเว็บหลัก `supplement`

- โฟลเดอร์: `C:\Godenray_Project\supplement-admin-site`
- หลังบ้าน: http://127.0.0.1:4320/ (ใช้ `/editor.html#home` ได้ด้วย)
- เว็บหลัก: http://127.0.0.1:4319/

## ประวัติการใช้งาน

เมนู **ประวัติการใช้งาน** (`/logs`) สำหรับทุก role ที่ล็อกอิน แสดงผู้ทำรายการ เวลา การแก้ไข/เผยแพร่ อัปโหลด และการจัดการสมาชิก
ค้นหาผู้ทำรายการ กรองประเภท เปิดรายละเอียด และดูรายการก่อนหน้าได้ ไม่เก็บรหัสผ่านหรือข้อมูลเซสชัน และไม่ลบ log เมื่อสมาชิกถูกลบ

ถ้าใช้ Supabase เดิม ให้รัน `supabase/migrations/20261015_google_membership.sql` ใน SQL Editor ของโปรเจกต์ Supplement ซึ่งรวมระบบ log และสมาชิกแล้ว
ไม่ต้องแก้ `.env` ตารางใหม่ชื่อ `studio_audit_logs`; SQL ไม่ลบหรือเปลี่ยนเนื้อหา/บัญชีเดิม และไม่มีประวัติย้อนหลัง
ถ้าตั้งฐานข้อมูลใหม่ ให้รัน `supabase/schema.sql` ซึ่งรวม log แล้ว ส่วน local ให้รัน `npm run db:local`

## Google Login และหน้ารออนุมัติ

รองรับอีเมล/รหัสผ่านและ Google ผู้สมัครใหม่เข้าสู่หน้ารออนุมัติ `/pending` ก่อนเข้าแก้ไข เมื่อถูกนำออกจะกลับหน้านี้และกดขอใหม่ได้โดยไม่รับสิทธิ์เดิมกลับอัตโนมัติ
ใช้ SQL รุ่นล่าสุด `supabase/migrations/20261015_google_membership.sql` ซึ่งรวม log แล้ว และตั้ง `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` ใน `.env` ของหลังบ้าน
ดูคู่มือตั้งค่าและ callback URL ของทั้งสองแบรนด์ใน `C:\Godenray_Project\GOOGLE_LOGIN_SETUP.md`

## เข้าสู่ระบบหลังบ้าน

เปิด `/login` หรือเปิดหน้าหลังบ้านตามปกติ ระบบจะพาไปหน้าล็อกอินก่อนเสมอ
หากเป็นการใช้งานครั้งแรกในเครื่อง ให้สร้างบัญชีแอดมินด้วยอีเมลและรหัสผ่านอย่างน้อย 12 ตัวอักษร
บัญชีแรกเป็น superadmin ของโปรเจกต์นั้น สมาชิกเพิ่มเติมสมัครผ่าน `/register` และต้องรอ superadmin อนุมัติ

- รัน `npm run build` และ `npm run db:local` เพื่อเพิ่มตารางบัญชีและเซสชัน โดยไม่แก้เนื้อหาเดิม
- จากนั้นรัน `npm run dev` และตั้งบัญชีของคุณในหน้าแรกที่เปิดขึ้นมา ไม่มีรหัสผ่านเริ่มต้น
- เข้าครั้งถัดไปด้วยบัญชีที่ตั้งไว้ ออกจากระบบด้วยปุ่ม **ออกจากระบบ** บนแถบด้านบน
- รหัสผ่านเก็บเป็น PBKDF2-SHA256 พร้อม salt; เซสชันเก็บในฐานข้อมูลที่เลือกและ cookie แบบ HttpOnly มีอายุ 8 ชั่วโมง (Strict สำหรับรหัสผ่าน, Lax สำหรับ Google เพื่อรองรับ callback)
- การออกจากระบบยกเลิกเซสชันบนเซิร์ฟเวอร์ทันที ทั้งสอง Studio ใช้ชื่อ cookie ต่างกัน จึงล็อกอินแยกกันแม้อยู่บน localhost เดียวกัน
- หากเซสชันหมดอายุขณะแก้ไข จะมีลิงก์ **เข้าสู่ระบบอีกครั้ง** เปิดในแท็บใหม่ กลับมาแท็บเดิมแล้วบันทึกต่อได้
- ไม่ใช้ `LOCAL_ADMIN_ACCESS` หรือ identity headers เพื่อข้ามหน้าล็อกอินอีกต่อไป

`LOCAL_AUTH_SETUP=true` ใน dev launcher อนุญาตให้ตั้งบัญชีครั้งแรกเฉพาะ HTTP loopback เท่านั้น
การเปิดใช้งานบน HTTPS hosting ต้อง apply migrations กับ D1 ของระบบจริงก่อน และตั้ง secret `ADMIN_SETUP_TOKEN`
เป็นค่าสุ่มยาวอย่างน้อย 32 ตัวอักษรผ่านผู้ให้บริการ จากนั้นใช้ค่านั้นในช่องรหัสตั้งค่าบนหน้าแรก
เมื่อตั้งบัญชี superadmin สำเร็จ สามารถนำ secret นี้ออกได้ การตั้งค่าบัญชีเจ้าของครั้งแรกจะถูกปิดเมื่อมี superadmin อยู่แล้ว

บัญชีในเครื่องเก็บที่ `.wrangler/state` อย่าลบโฟลเดอร์นี้ เพราะมีทั้งข้อมูล CMS และบัญชีที่ตั้งไว้

### ทดสอบระบบล็อกอิน

ใช้ Node.js 22.13 ขึ้นไปสำหรับชุดทดสอบ SQLite

```sh
npm run test:unit
npm run build
npm run test:login
```

`test:login` เปิด Wrangler และ Chrome ด้วยฐานข้อมูลทดสอบชั่วคราวใน `output/` จึงไม่สร้างบัญชีในข้อมูลจริง
ครอบคลุมการตั้งบัญชี ล็อกอิน ล็อกเอาต์ เดสก์ท็อป มือถือ และรัน API integration suite ด้วยบัญชีทดสอบ
ภาพตรวจหน้าจออยู่ใน `output/login-*.png`

หากรัน `npm test` หรือ browser tests เดิมกับ dev server ให้ตั้ง `STUDIO_TEST_EMAIL` และ `STUDIO_TEST_PASSWORD`
เป็นบัญชีของระบบทดสอบก่อน และเปิดเว็บหลักตามปกติ ห้ามใช้บัญชี production เพราะชุดทดสอบแก้ฉบับร่างและทดลองเผยแพร่

## เริ่มใช้งาน

ใช้ Node.js 22 หรือใหม่กว่า และเปิดเว็บหลักอีก terminal หนึ่งด้วย
บน PowerShell ที่ปิดการรัน `.ps1` ใช้ `npm.cmd` แทน `npm`

```sh
cd C:\Godenray_Project\supplement-admin-site
npm ci
npm run build
npm run db:local
npm run dev
```

ตั้งค่า `SITE_ORIGIN` ผ่าน `.env` หากต้องการเปลี่ยน URL เว็บหลัก
(`http://127.0.0.1:4319`)
หลังแก้ source ให้รัน `npm run build` อีกครั้ง

เมื่อรัน `npm run dev` ให้ตั้งบัญชีครั้งแรกหรือเข้าสู่ระบบที่หน้า `/login` ตามขั้นตอนด้านบน

## โครงสร้างและการเชื่อมต่อ

- `src/editor/`, `src/templates/editor.html`, `src/styles/editor/`: หลังบ้าน
- `worker/`, `db/`, `drizzle/`: API, authentication, D1 schema/migrations และ R2 uploads
- `src/shared/`: ข้อมูลเริ่มต้นและ schema ที่ใช้กับตัวจัดการ
- `src/preview/`, `src/styles/preview/`: runtime และ CSS สำหรับเลือกองค์ประกอบ แก้ข้อความ และสื่อสารกับ Studio อยู่เฉพาะหลังบ้าน
- `worker/preview.js`: proxy หน้าพรีวิวจากเว็บหลักผ่าน `/preview/` และรูปเดิมผ่าน `/assets/`
- `scripts/build.mjs`, `scripts/dev.mjs`, `wrangler.json`: build และ dev แยกอิสระ

หลังบ้านไม่ build หรือ import source จากโฟลเดอร์ `supplement` การพรีวิวใช้ HTTP ไปยัง `SITE_ORIGIN`
หรือ service binding `SITE_SERVICE` และคง origin เดียวกับหลังบ้านเพื่อให้ editor ใช้งานต่อได้
รูปเดิมอยู่ในเว็บหลัก ไฟล์อัปโหลดใหม่อยู่ใน R2 ของหลังบ้าน
API อ่าน `/api/content` เปิดเฉพาะข้อมูลที่เผยแพร่ ส่วน `/api/editor/*` ยังตรวจสิทธิ์เจ้าของ
เว็บหลักเข้าถึงข้อมูลผ่าน proxy ของตัวเอง ผู้เข้าชมไม่ต้องเรียก admin APIs

ฐานข้อมูล local และ R2 เดิมถูกคัดลอกมาที่ `.wrangler/state` ของโปรเจกต์นี้ โดยเก็บชื่อฐานข้อมูลและ bucket เดิมไว้
โค้ดรวมชุดเดิมเก็บสำรองที่ `migration-backup/` ในโปรเจกต์หลังบ้าน
`src/shared/` เป็นสำเนาอิสระ หากแก้ schema/defaults ให้ปรับทั้งสองโปรเจกต์ให้ตรงกัน

## ทดสอบ

```sh
npm run test:unit
# เปิดทั้งสอง dev servers ก่อน integration tests
npm test
node tests/editor-browser.cjs
```

API tests ใช้หลังบ้านพอร์ต 4320; browser tests ตรวจหน้าเผยแพร่ที่เว็บหลักพอร์ต 4319
Browser tests ใช้ Chromium ของ Playwright หรือกำหนด `CHROME_PATH` เป็น Chrome ที่ติดตั้งอยู่

## Hosting

โปรเจกต์นี้ยังไม่ได้สร้างหรือ deploy เป็น Site ใหม่ และไม่มี project ID ของเว็บหลักปะปนมา
เมื่อนำขึ้นระบบจริงให้สร้าง Site ของหลังบ้าน ตั้ง `SITE_ORIGIN`, D1 `DB`, R2 `BUCKET` และ secret `ADMIN_SETUP_TOKEN` สำหรับตั้งบัญชีครั้งแรก
ต้องย้ายข้อมูล production จาก Site เดิมก่อนใช้งาน ส่วนการย้ายครั้งนี้คัดลอกเฉพาะ local state
อย่าใช้ URL แบบ private ที่ต้องล็อกอินสำหรับ proxy ระหว่างบริการ; ใช้ Worker service binding ที่อนุญาตให้เข้าถึงได้

## ผู้ใช้ สิทธิ์ และ Supabase

เพิ่มหน้าสมัคร `/register` และหน้าจัดการ **ผู้ใช้และสิทธิ์** `/users`
ผู้สมัครต้องรออนุมัติและไม่มีสิทธิ์แก้ไขจนกว่า superadmin จะกดรับเป็น admin
superadmin กำหนดสิทธิ์แก้หน้าเว็บ สินค้า แบรนด์ Contact อัปโหลด เผยแพร่ และคืนเวอร์ชันแยกกันได้
การอนุมัติ ระงับ เปิดใช้ใหม่ ลบผู้ใช้ และเปลี่ยนสิทธิ์ทำได้เฉพาะ superadmin และตรวจที่ API ทุกครั้ง
บัญชีเจ้าของเดิมใน local ย้ายเป็น superadmin โดย `0002_user_permissions.sql`

เลือกใช้ฐานข้อมูลด้วย `STUDIO_DATABASE=local` หรือ `supabase`
ตัวอย่างค่าฐานข้อมูลจริงอยู่ที่ `.env.supabase.example`; schema สำหรับ SQL Editor อยู่ที่ `supabase/schema.sql`
คู่มือตั้งค่าแยกสองแบรนด์และรายการ keys อยู่ที่ [ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md)
เมื่อสลับฐานข้อมูลใหม่ ต้องย้ายข้อมูล local แยกต่างหาก ระบบไม่สลับหรือย้ายข้อมูลให้อัตโนมัติ
# Vercel deployment

รองรับ Vercel Functions บน Node.js 24.x แล้ว ตั้ง Framework เป็น **Other**, Build Command `npm run build`, Output Directory `dist/vercel-public` โดยมี `vercel.json` ให้แล้ว
เมื่อ import repository `SeriusDev888/SupplementAdminSite` ให้ใช้ Root Directory `./`
ตั้งค่า Environment Variables ตาม `.env.production.example` ใช้ `STUDIO_DATABASE=supabase`; ไม่ต้องผูก D1/R2 บน Vercel
`SITE_ORIGIN` ต้องเป็น URL หน้าบ้าน Supplement และ Google callback ต้องเป็น URL หลังบ้านนี้ + `/api/auth/google/callback`
HTML ของ editor/ผู้ใช้/log ผ่านระบบตรวจสิทธิ์ก่อนเสิร์ฟเสมอ รูป/PDF อัปโหลดตรงเข้า private Supabase Storage สูงสุด 10 MB และตรวจไฟล์ตอนยืนยัน
ตรวจ adapter และ signed upload ด้วย `npm run test:vercel`; ตรวจ Chrome ขณะเปิดเว็บหน้าบ้าน port 4319 ด้วย `npm run test:vercel:browser`
