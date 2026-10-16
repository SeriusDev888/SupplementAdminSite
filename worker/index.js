import { json, fail, readJSON, readLimited } from './http.js';
import { owner, requireOwner, writeOrigin, authentication, membershipRedirect } from './auth.js';
import { state, unpack, seed, saveDraft } from './storage.js';
import { detectImage } from './media.js';
import { preview, siteOrigin } from './preview.js';
import { database, objects } from './database.js';
import { users } from './users.js';
import { requirePermission } from './permissions.js';
import { audit } from './audit.js';
import { logs } from './logs.js';
import { uploads } from './uploads.js';
export { validateDocument, safeURL } from './validation.js';
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url),
      path = url.pathname;
    try {
      const authResponse = await authentication(request, env);
      if (authResponse) return authResponse;
      const usersResponse = await users(request, env);
      if (usersResponse) return usersResponse;
      const logsResponse = await logs(request, env);
      if (logsResponse) return logsResponse;
      if (
        ['/', '/index', '/index.html', '/editor', '/editor.html', '/index/', '/editor/'].includes(
          path,
        )
      ) {
        if (!(await owner(request, env))) return membershipRedirect(request, env);
        const asset = await env.ASSETS.fetch(
          new Request(new URL('/index.html', request.url), request),
        );
        const response = new Response(asset.body, asset);
        response.headers.set('cache-control', 'no-store');
        return response;
      }
      if (path === '/preview' || path.startsWith('/preview/')) await requireOwner(request, env);
      if (path === '/site/' || path === '/site') return Response.redirect(siteOrigin(env), 302);
      if (path === '/preview' || path.startsWith('/preview/') || path.startsWith('/assets/')) {
        if (!['GET', 'HEAD'].includes(request.method))
          return new Response('Method not allowed', { status: 405 });
        return await preview(request, env);
      }
      if (path === '/api/editor/session') {
        const user = await owner(request, env);
        return json({ canEdit: Boolean(user), email: user?.email, user });
      }
      if (path === '/api/content' && request.method === 'GET')
        return json(unpack(await state(env, 'published')));
      if (path.startsWith('/media/') && request.method === 'GET') {
        const id = path.slice(7);
        if (!/^[a-f0-9-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
        const media = await database(env, 'media_get', { id });
        if (!media) return new Response('Not found', { status: 404 });
        if (env.VERCEL_RUNTIME === 'true')
          return new Response(null, {
            status: 302,
            headers: {
              location: await objects(env).signedRead(
                'editor/' + id,
                media.mime === 'application/pdf' ? media.filename : undefined,
              ),
              'cache-control': 'no-store',
              'referrer-policy': 'no-referrer',
            },
          });
        const object = await objects(env).get('editor/' + id);
        if (!object) return new Response('Not found', { status: 404 });
        return new Response(object.body, {
          headers: {
            'content-type': media.mime,
            'cache-control': 'public,max-age=31536000,immutable',
            'x-content-type-options': 'nosniff',
            ...(media.mime === 'application/pdf'
              ? {
                  'content-disposition': `attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(media.filename)}`,
                  'content-security-policy': "sandbox; default-src 'none'",
                }
              : {}),
          },
        });
      }
      if (path.startsWith('/api/editor/')) {
        const user = await requireOwner(request, env);
        if (request.method !== 'GET') writeOrigin(request);
        const uploadResponse = await uploads(request, env, user);
        if (uploadResponse) return uploadResponse;
        if (path === '/api/editor/draft' && request.method === 'GET') {
          const draft = await state(env, 'draft'),
            published = await state(env, 'published');
          return json({
            ...unpack(draft || published),
            publishedRevision: published?.revision || 0,
          });
        }
        if (path === '/api/editor/draft' && request.method === 'PUT') {
          const input = await readJSON(request);
          if (!Number.isInteger(input.revision) || input.revision < 0) fail('Invalid revision');
          return json(await saveDraft(env, user, input.document, input.revision));
        }
        if (path === '/api/editor/publish' && request.method === 'POST') {
          requirePermission(user, 'content.publish');
          const input = await readJSON(request);
          if (!Number.isInteger(input.revision) || !Number.isInteger(input.publishedRevision))
            fail('Invalid revision');
          await seed(env, user);
          const now = new Date().toISOString(),
            version = crypto.randomUUID(),
            next = input.publishedRevision + 1;
          const published = await database(env, 'publish', {
            now,
            user: user.id,
            publishedRevision: input.publishedRevision,
            revision: input.revision,
            version,
            audit: audit(user, 'content.publish', version, {
              draftRevision: input.revision,
              publishedRevision: next,
            }),
          });
          if (!published) fail('ฉบับร่างหรือหน้าเผยแพร่เปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด', 409);
          return json({ publishedRevision: next, versionId: version, updatedAt: now });
        }
        if (path === '/api/editor/versions' && request.method === 'GET') {
          return json({ versions: await database(env, 'versions') });
        }
        if (path === '/api/editor/restore' && request.method === 'POST') {
          requirePermission(user, 'versions.restore');
          const input = await readJSON(request);
          if (!Number.isInteger(input.revision)) fail('Invalid revision');
          const row = await database(env, 'version', { id: input.id });
          if (!row) fail('ไม่พบเวอร์ชันนี้', 404);
          return json(
            await saveDraft(env, user, JSON.parse(row.payload), input.revision, input.id),
          );
        }
        if (path === '/api/editor/media' && request.method === 'GET') {
          const rows = await database(env, 'media_list');
          return json({ media: rows.map((row) => ({ ...row, url: '/media/' + row.id })) });
        }
        if (
          ['/api/editor/media', '/api/editor/documents'].includes(path) &&
          request.method === 'POST'
        ) {
          requirePermission(user, 'media.upload');
          const bytes = await readLimited(request, 10 * 1024 * 1024),
            pdf = path.endsWith('/documents'),
            mime = pdf
              ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' &&
                new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF')
                ? 'application/pdf'
                : null
              : detectImage(bytes);
          if (!mime)
            fail(
              pdf ? 'กรุณาเลือกไฟล์ PDF ที่สมบูรณ์' : 'รองรับไฟล์ PNG, JPG, WebP และ GIF เท่านั้น',
            );
          const id = crypto.randomUUID();
          let name;
          try {
            name = decodeURIComponent(request.headers.get('x-file-name') || 'image');
          } catch {
            name = 'image';
          }
          name = name.slice(0, 180);
          await objects(env).put('editor/' + id, bytes, { httpMetadata: { contentType: mime } });
          try {
            await database(env, 'media_insert', {
              id,
              filename: name,
              mime,
              size: bytes.length,
              now: new Date().toISOString(),
              user: user.id,
              audit: audit(user, pdf ? 'media.document' : 'media.upload', id, {
                filename: name,
                mime,
                size: bytes.length,
              }),
            });
          } catch (error) {
            await objects(env).delete('editor/' + id);
            throw error;
          }
          return json({ id, url: '/media/' + id, filename: name, mime }, 201);
        }
        return json({ error: 'Not found' }, 404);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Editor request failed', path, error.message);
      return json(
        {
          error: error.status
            ? error.message
            : 'บันทึกไม่สำเร็จ กรุณาลองใหม่ ข้อมูลที่กำลังแก้ยังอยู่ในหน้านี้',
          ...(error.code ? { code: error.code } : {}),
          ...(error.redirect ? { redirect: error.redirect } : {}),
        },
        error.status || 503,
      );
    }
  },
};
