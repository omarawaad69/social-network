// worker/index.js
// Cloudflare Worker - Social Network API
// تستخدم Web Crypto API لتشفير كلمات المرور وتوقيع JWT

// ---------- إعدادات ----------
const JWT_SECRET = 'K7f9$pL2wQ8zVb1xN5mR3cY6'; // غيرها في متغيرات البيئة لاحقاً
const SALT = 'Tg4$Hn0sWq9'; // استخدم قيمة فريدة

// ---------- دوال مساعدة: تشفير كلمة المرور (PBKDF2) ----------
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const salt = encoder.encode(SALT);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

// ---------- دوال JWT (يدوية) ----------
function base64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC', key, encoder.encode(`${encodedHeader}.${encodedPayload}`)
  );
  const encodedSignature = base64url(String.fromCharCode(...new Uint8Array(signature)));
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

async function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const signatureBytes = Uint8Array.from(atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC', key, signatureBytes, encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );
    if (!valid) return null;
    return JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) {
    return null;
  }
}

// ---------- راوتر بسيط ----------
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // استخراج JWT من الهيدر
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let user = null;
  if (token) {
    user = await verifyJWT(token);
  }

  // ---------- عام: تسجيل / دخول ----------
  if (path === '/api/register' && method === 'POST') {
    const { username, email, password } = await request.json();
    if (!username || !email || !password) return new Response('Missing fields', { status: 400 });
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?').bind(email, username).first();
    if (existing) return new Response('User exists', { status: 409 });
    const id = crypto.randomUUID();
    const hashed = await hashPassword(password);
    await env.DB.prepare('INSERT INTO users (id, username, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .bind(id, username, email, hashed, new Date().toISOString()).run();
    return new Response(JSON.stringify({ message: 'Registered' }), { status: 201 });
  }

  if (path === '/api/login' && method === 'POST') {
    const { email, password } = await request.json();
    const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!row) return new Response('Invalid credentials', { status: 401 });
    const valid = await verifyPassword(password, row.password_hash);
    if (!valid) return new Response('Invalid credentials', { status: 401 });
    const jwt = await signJWT({ userId: row.id, username: row.username, isAdmin: row.is_admin });
    return new Response(JSON.stringify({ token: jwt, user: { id: row.id, username: row.username, isAdmin: row.is_admin } }));
  }

  // ---------- محمي: جميع النقاط التالية تحتاج JWT ----------
  if (!user) return new Response('Unauthorized', { status: 401 });

  // معلومات المستخدم الحالي
  if (path === '/api/me' && method === 'GET') {
    const row = await env.DB.prepare('SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?').bind(user.userId).first();
    return new Response(JSON.stringify(row));
  }

  // المنشورات
  if (path === '/api/posts') {
    if (method === 'GET') {
      // جلب منشورات المستخدمين الذين أتابعهم + منشوراتي
      const posts = await env.DB.prepare(`
        SELECT p.id, p.content, p.image_url, p.created_at, u.username, u.id as user_id
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
        ORDER BY p.created_at DESC LIMIT 50
      `).bind(user.userId, user.userId).all();
      // جلب الإعجابات والتعليقات لكل منشور (مبسط)
      return new Response(JSON.stringify(posts.results));
    }
    if (method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';
      let content = '';
      let imageUrl = null;
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        content = formData.get('content') || '';
        const image = formData.get('image');
        if (image && image.size > 0) {
          const key = `${user.userId}/${Date.now()}-${image.name}`;
          await env.BUCKET.put(key, image.stream, { httpMetadata: { contentType: image.type } });
          imageUrl = `${url.origin}/images/${key}`; // سنضبط route للصور
        }
      } else {
        const body = await request.json();
        content = body.content;
      }
      if (!content && !imageUrl) return new Response('Empty post', { status: 400 });
      const postId = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO posts (id, user_id, content, image_url, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(postId, user.userId, content, imageUrl, new Date().toISOString()).run();
      return new Response(JSON.stringify({ id: postId }), { status: 201 });
    }
  }

  // متابعة / إلغاء متابعة
  if (path === '/api/follow' && method === 'POST') {
    const { targetUserId } = await request.json();
    if (!targetUserId) return new Response('Missing target', { status: 400 });
    const exists = await env.DB.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?')
      .bind(user.userId, targetUserId).first();
    if (exists) {
      await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
        .bind(user.userId, targetUserId).run();
      return new Response(JSON.stringify({ following: false }));
    } else {
      await env.DB.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)')
        .bind(user.userId, targetUserId).run();
      return new Response(JSON.stringify({ following: true }));
    }
  }

  // الإعجاب بمنشور
  if (path === '/api/like' && method === 'POST') {
    const { postId } = await request.json();
    const exists = await env.DB.prepare('SELECT * FROM likes WHERE user_id = ? AND post_id = ?')
      .bind(user.userId, postId).first();
    if (exists) {
      await env.DB.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').bind(user.userId, postId).run();
      return new Response(JSON.stringify({ liked: false }));
    } else {
      await env.DB.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').bind(user.userId, postId).run();
      return new Response(JSON.stringify({ liked: true }));
    }
  }

  // تعليق
  if (path === '/api/comments' && method === 'POST') {
    const { postId, text } = await request.json();
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO comments (id, post_id, user_id, text, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, postId, user.userId, text, new Date().toISOString()).run();
    return new Response(JSON.stringify({ id }), { status: 201 });
  }

  // جلب التعليقات لمنشور
  if (path.startsWith('/api/comments/') && method === 'GET') {
    const postId = path.split('/')[3];
    const comments = await env.DB.prepare(`
      SELECT c.id, c.text, c.created_at, u.username FROM comments c
      JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC
    `).bind(postId).all();
    return new Response(JSON.stringify(comments.results));
  }

  // لوحة الأدمن (تتطلب isAdmin)
  if (path.startsWith('/api/admin')) {
    if (!user.isAdmin) return new Response('Forbidden', { status: 403 });
    if (path === '/api/admin/users' && method === 'GET') {
      const users = await env.DB.prepare('SELECT id, username, email, is_admin, created_at FROM users').all();
      return new Response(JSON.stringify(users.results));
    }
    if (path === '/api/admin/posts' && method === 'GET') {
      const posts = await env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(posts.results));
    }
    if (path === '/api/admin/delete-user' && method === 'POST') {
      const { userId } = await request.json();
      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
      return new Response(JSON.stringify({ success: true }));
    }
    if (path === '/api/admin/delete-post' && method === 'POST') {
      const { postId } = await request.json();
      await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
      return new Response(JSON.stringify({ success: true }));
    }
  }

  // خدمة الصور من R2
  if (path.startsWith('/images/') && method === 'GET') {
    const key = path.slice(8); // يزيل '/images/'
    const object = await env.BUCKET.get(key);
    if (!object) return new Response('Not Found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    return new Response(object.body, { headers });
  }

  return new Response('Not found', { status: 404 });
}

// ---------- مُصدر Worker ----------
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
