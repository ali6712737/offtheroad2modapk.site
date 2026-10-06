const enc = new TextEncoder();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } });
const html = (b, s = 200, h = {}) => new Response(b, { status: s, headers: { 'content-type': 'text/html;charset=utf-8', ...h } });
const slugify = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '') || 'post-' + Date.now();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(secret, data) { const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', k, enc.encode(data))); }
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const secret = env => env.SESSION_SECRET || env.ADMIN_PASS || 'change-me';
async function makeToken(env) { const exp = Date.now() + 7 * 864e5; return exp + '.' + await hmac(secret(env), String(exp)); }
async function isAuth(req, env) {
  const m = (req.headers.get('cookie') || '').match(/(?:^|; )adm=([^;]+)/); if (!m) return false;
  const [exp, sig] = m[1].split('.'); if (!exp || Number(exp) < Date.now()) return false;
  return sig === await hmac(secret(env), exp);
}
const DEFAULTS = {
  site_name: 'Hidden Edge', tagline: 'Dark Psychology • Billionaire Money Secrets • AI Side Hustles', accent: '#a855f7', accent2: '#f5c451',
  site_url: '', footer_text: '© {year} All rights reserved.', home_title: '', home_desc: 'Dark psychology, billionaire financial leaks and secret AI side-hustle tools.',
  posts_per_page: '12', incontent_after: '2', between_every: '4', ads_enabled: '1', count_admin_views: '0', show_views: '1',
  head_code: '', body_end_code: '', ad_header: '', ad_below_title: '', ad_in_content: '', ad_after_content: '', ad_sidebar: '', ad_between: '', ad_footer: '', ad_sticky_bottom: '',
  robots_extra: '', ads_txt: '', twitter: '', facebook: '', instagram: '', youtube: '', tiktok: '', telegram: '', salt: 'x9'
};
async function getSettings(env) { const S = { ...DEFAULTS }; try { const { results } = await env.DB.prepare('SELECT key,value FROM settings').all(); for (const r of results) S[r.key] = r.value; } catch (e) { } return S; }
const nowISO = () => new Date().toISOString();
const readTime = c => Math.max(1, Math.round(String(c).replace(/<[^>]+>/g, ' ').split(/\s+/).length / 200));
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|headless|lighthouse/i;

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url); const p = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (p === '/admin' || p.startsWith('/admin/')) return next();
    if (p.startsWith('/api/')) return await api(request, env, url, p);
    if (/\.[a-z0-9]{2,5}$/i.test(p) && !['/sitemap.xml', '/robots.txt', '/ads.txt'].includes(p)) return next();
    return await site(request, env, url, p);
  } catch (e) { return new Response('Error: ' + e.message, { status: 500 }); }
}

/* ------------------------- PUBLIC SITE ------------------------- */
const adBox = (S, k) => (S.ads_enabled === '1' && S[k]) ? `<div class="ad ad-${k}">${S[k]}</div>` : '';
function layout(S, cats, pages, { title, desc, body, canonical, og = {}, jsonld = '', active = '' }) {
  const base = S.site_url.replace(/\/$/, '');
  const t = esc(title), d = esc(desc || S.home_desc);
  const socials = ['twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'telegram'].filter(k => S[k]).map(k => `<a href="${esc(S[k])}" rel="noopener" target="_blank">${k}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title><meta name="description" content="${d}">${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:title" content="${t}"><meta property="og:description" content="${d}"><meta property="og:type" content="${og.type || 'website'}">${og.image ? `<meta property="og:image" content="${esc(og.image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ''}
<style>:root{--a:${esc(S.accent)};--g:${esc(S.accent2)};--bg:#08080d;--c:#12121b;--b:#23233a;--t:#e8e8f0;--m:#8d8da6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:16px/1.7 system-ui,Segoe UI,Roboto,sans-serif}a{color:inherit;text-decoration:none}
.w{max-width:1120px;margin:auto;padding:0 18px}header{border-bottom:1px solid var(--b);background:#0b0b12cc;backdrop-filter:blur(10px);position:sticky;top:0;z-index:20}
.nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;flex-wrap:wrap}.logo{font-weight:800;font-size:22px;background:linear-gradient(90deg,var(--a),var(--g));-webkit-background-clip:text;color:transparent}
nav{display:flex;gap:6px;flex-wrap:wrap}nav a{padding:6px 12px;border-radius:99px;font-size:14px;color:var(--m)}nav a:hover,nav a.on{background:var(--c);color:var(--t)}
.hero{padding:46px 0 18px}.hero h1{font-size:clamp(28px,5vw,46px);line-height:1.15;margin:0 0 10px}.hero p{color:var(--m);margin:0}
form.s{display:flex;gap:8px;margin-top:18px}form.s input{flex:1;background:var(--c);border:1px solid var(--b);color:var(--t);padding:11px 14px;border-radius:10px}form.s button,.btn{background:linear-gradient(90deg,var(--a),#6d28d9);color:#fff;border:0;padding:11px 18px;border-radius:10px;cursor:pointer;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin:22px 0}.card{background:var(--c);border:1px solid var(--b);border-radius:16px;overflow:hidden;transition:.2s}.card:hover{transform:translateY(-3px);border-color:var(--a)}
.card .img{aspect-ratio:16/9;background:linear-gradient(135deg,#1c1033,#2a1a05) center/cover;display:flex;align-items:center;justify-content:center;font-size:42px}.card .in{padding:16px}.card h3{margin:6px 0;font-size:18px;line-height:1.35}
.badge{display:inline-block;font-size:12px;color:var(--g);border:1px solid #f5c45155;padding:2px 10px;border-radius:99px}.meta{color:var(--m);font-size:13px}.card p{color:var(--m);font-size:14px;margin:6px 0}
.feat{display:grid;grid-template-columns:1.2fr 1fr;gap:0}.feat .img{aspect-ratio:auto;min-height:260px}.feat h2{font-size:28px;margin:8px 0}@media(max-width:760px){.feat{grid-template-columns:1fr}}
.art{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:30px;margin:26px 0}@media(max-width:900px){.art{grid-template-columns:1fr}}
.art h1{font-size:clamp(26px,4.5vw,40px);line-height:1.2;margin:10px 0}.cover{width:100%;border-radius:16px;margin:16px 0}
.content{font-size:18px}.content h2,.content h3{margin-top:1.6em;line-height:1.3}.content img{max-width:100%;border-radius:12px}.content blockquote{border-left:4px solid var(--a);margin:1.2em 0;padding:4px 18px;color:var(--m);background:var(--c);border-radius:0 10px 10px 0}
.content a{color:var(--g);text-decoration:underline}.content pre{background:var(--c);padding:14px;border-radius:10px;overflow:auto}
.side .box{background:var(--c);border:1px solid var(--b);border-radius:14px;padding:16px;margin-bottom:18px}.side h4{margin:0 0 10px}.side a{display:block;padding:6px 0;border-bottom:1px solid var(--b);font-size:14px}
.ad{margin:20px auto;text-align:center;overflow:hidden;max-width:100%}.pager{display:flex;gap:10px;justify-content:center;margin:28px 0}.pager a{padding:8px 16px;background:var(--c);border:1px solid var(--b);border-radius:10px}
.share a{display:inline-block;margin:4px 6px 4px 0;padding:6px 14px;border-radius:99px;background:var(--c);border:1px solid var(--b);font-size:13px}
footer{border-top:1px solid var(--b);margin-top:50px;padding:30px 0;color:var(--m);font-size:14px;text-align:center}footer a{margin:0 8px}.sticky{position:fixed;bottom:0;left:0;right:0;z-index:30;background:#000d;text-align:center}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.chips a{padding:7px 14px;border-radius:99px;background:var(--c);border:1px solid var(--b);font-size:14px}.chips a:hover{border-color:var(--a)}</style>
${S.head_code}</head><body>
<header><div class="w nav"><a class="logo" href="/">${esc(S.site_name)}</a><nav><a href="/" class="${active === 'home' ? 'on' : ''}">Home</a>${cats.map(c => `<a href="/category/${c.slug}" class="${active === c.slug ? 'on' : ''}">${c.emoji} ${esc(c.name)}</a>`).join('')}</nav></div></header>
<div class="w">${adBox(S, 'ad_header')}${body}${adBox(S, 'ad_footer')}</div>
<footer><div class="w">${pages.map(pg => `<a href="/p/${pg.slug}">${esc(pg.title)}</a>`).join('')}<div style="margin:10px 0">${socials}</div>${esc(S.footer_text.replace('{year}', new Date().getFullYear()))}</div></footer>
${S.ads_enabled === '1' && S.ad_sticky_bottom ? `<div class="sticky">${S.ad_sticky_bottom}</div>` : ''}${S.ads_enabled === '1' ? S.body_end_code : ''}</body></html>`;
}
function card(p, cats) {
  const c = cats.find(x => x.id === p.category_id);
  return `<a class="card" href="/post/${p.slug}"><div class="img" style="${p.cover ? `background-image:url('${esc(p.cover)}')` : ''}">${p.cover ? '' : (c?.emoji || '📰')}</div><div class="in"><span class="badge">${esc(c?.name || 'General')}</span><h3>${esc(p.title)}</h3><p>${esc((p.excerpt || '').slice(0, 130))}</p><div class="meta">${fmtDate(p.published_at)} • ${readTime(p.content)} min${''}</div></div></a>`;
}
async function site(request, env, url, p) {
  const S = await getSettings(env); const now = nowISO();
  const { results: cats } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort,id').all();
  const { results: pages } = await env.DB.prepare('SELECT title,slug FROM pages WHERE in_footer=1').all();
  const base = (S.site_url || url.origin).replace(/\/$/, ''); const L = o => html(layout(S, cats, pages, o), 200, { 'cache-control': 'public, max-age=60' });
  const per = Math.max(1, parseInt(S.posts_per_page) || 12); const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const PUB = "status='published' AND published_at<=?";

  if (p === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n${S.robots_extra}\nSitemap: ${base}/sitemap.xml`, { headers: { 'content-type': 'text/plain' } });
  if (p === '/ads.txt') return new Response(S.ads_txt || '', { headers: { 'content-type': 'text/plain' } });
  if (p === '/sitemap.xml') {
    const { results: ps } = await env.DB.prepare(`SELECT slug,updated_at FROM posts WHERE ${PUB}`).bind(now).all();
    const u = [[base + '/', ''], ...cats.map(c => [`${base}/category/${c.slug}`, '']), ...pages.map(x => [`${base}/p/${x.slug}`, '']), ...ps.map(x => [`${base}/post/${x.slug}`, x.updated_at])];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${u.map(([l, m]) => `<url><loc>${esc(l)}</loc>${m ? `<lastmod>${m.slice(0, 10)}</lastmod>` : ''}</url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml' } });
  }
  const pager = (total, path) => { const pc = Math.ceil(total / per); if (pc <= 1) return ''; const j = path.includes('?') ? '&' : '?'; return `<div class="pager">${page > 1 ? `<a href="${path}${j}page=${page - 1}">← Newer</a>` : ''}<span class="meta">Page ${page} / ${pc}</span>${page < pc ? `<a href="${path}${j}page=${page + 1}">Older →</a>` : ''}</div>`; };
  const gridHTML = (list) => { const ev = Math.max(1, parseInt(S.between_every) || 4); return `<div class="grid">${list.map((x, i) => card(x, cats) + ((i + 1) % ev === 0 && S.ad_between && S.ads_enabled === '1' ? `<div style="grid-column:1/-1">${adBox(S, 'ad_between')}</div>` : '')).join('')}</div>`; };

  if (p === '/') {
    const tot = (await env.DB.prepare(`SELECT COUNT(*) n FROM posts WHERE ${PUB}`).bind(now).first()).n;
    const { results } = await env.DB.prepare(`SELECT * FROM posts WHERE ${PUB} ORDER BY featured DESC, published_at DESC LIMIT ? OFFSET ?`).bind(now, per, (page - 1) * per).all();
    let feat = '', list = results;
    if (page === 1 && results[0]) { const f = results[0], c = cats.find(x => x.id === f.category_id); feat = `<a class="card feat" href="/post/${f.slug}"><div class="img" style="${f.cover ? `background-image:url('${esc(f.cover)}')` : ''}">${f.cover ? '' : (c?.emoji || '📰')}</div><div class="in"><span class="badge">${esc(c?.name || '')}</span><h2>${esc(f.title)}</h2><p>${esc(f.excerpt)}</p><div class="meta">${fmtDate(f.published_at)} • ${readTime(f.content)} min read</div></div></a>`; list = results.slice(1); }
    const body = `<section class="hero"><h1>${esc(S.site_name)}</h1><p>${esc(S.tagline)}</p><form class="s" action="/search"><input name="q" placeholder="Search articles..."><button>Search</button></form><div class="chips">${cats.map(c => `<a href="/category/${c.slug}">${c.emoji} ${esc(c.name)}</a>`).join('')}</div></section>${feat}${gridHTML(list)}${!results.length ? '<p class="meta">No posts yet.</p>' : ''}${pager(tot, '/')}`;
    return L({ title: S.home_title || `${S.site_name} — ${S.tagline}`, desc: S.home_desc, body, canonical: base + '/', active: 'home' });
  }
  if (p === '/search') {
    const q = (url.searchParams.get('q') || '').trim(); const like = `%${q}%`;
    const { results } = q ? await env.DB.prepare(`SELECT * FROM posts WHERE ${PUB} AND (title LIKE ? OR excerpt LIKE ? OR tags LIKE ?) ORDER BY published_at DESC LIMIT 30`).bind(now, like, like, like).all() : { results: [] };
    return html(layout(S, cats, pages, { title: `Search: ${q} — ${S.site_name}`, desc: '', body: `<section class="hero"><h1>Search: ${esc(q)}</h1><form class="s" action="/search"><input name="q" value="${esc(q)}"><button>Search</button></form></section>${gridHTML(results)}${q && !results.length ? '<p class="meta">Nothing found.</p>' : ''}` }));
  }
  let m;
  if ((m = p.match(/^\/category\/([^/]+)$/))) {
    const c = cats.find(x => x.slug === m[1]); if (!c) return html(layout(S, cats, pages, { title: '404', body: '<h1>Category not found</h1>' }), 404);
    const tot = (await env.DB.prepare(`SELECT COUNT(*) n FROM posts WHERE category_id=? AND ${PUB}`).bind(c.id, now).first()).n;
    const { results } = await env.DB.prepare(`SELECT * FROM posts WHERE category_id=? AND ${PUB} ORDER BY published_at DESC LIMIT ? OFFSET ?`).bind(c.id, now, per, (page - 1) * per).all();
    return L({ title: `${c.name} — ${S.site_name}`, desc: c.description, canonical: `${base}/category/${c.slug}`, active: c.slug, body: `<section class="hero"><h1>${c.emoji} ${esc(c.name)}</h1><p>${esc(c.description)}</p></section>${gridHTML(results)}${!results.length ? '<p class="meta">No posts yet.</p>' : ''}${pager(tot, '/category/' + c.slug)}` });
  }
  if ((m = p.match(/^\/p\/([^/]+)$/))) {
    const pg = await env.DB.prepare('SELECT * FROM pages WHERE slug=?').bind(m[1]).first();
    if (!pg) return html(layout(S, cats, pages, { title: '404', body: '<h1>Page not found</h1>' }), 404);
    return L({ title: `${pg.title} — ${S.site_name}`, desc: '', canonical: `${base}/p/${pg.slug}`, body: `<article style="max-width:780px;margin:30px auto"><h1>${esc(pg.title)}</h1><div class="content">${pg.content}</div></article>` });
  }
  if ((m = p.match(/^\/post\/([^/]+)$/))) {
    const post = await env.DB.prepare(`SELECT * FROM posts WHERE slug=? AND ${PUB}`).bind(decodeURIComponent(m[1]), now).first();
    if (!post) return html(layout(S, cats, pages, { title: '404', body: '<h1>Post not found</h1>' }), 404);
    const c = cats.find(x => x.id === post.category_id);
    let content = post.content;
    if (S.ads_enabled === '1' && S.ad_in_content) { const n = Math.max(1, parseInt(S.incontent_after) || 2); const parts = content.split('</p>'); if (parts.length > n) { parts.splice(n, 0, `</p>${adBox(S, 'ad_in_content')}`); content = parts.join('</p>').replace('</p></p>', '</p>'); } }
    const { results: rel } = await env.DB.prepare(`SELECT * FROM posts WHERE ${PUB} AND id!=? AND category_id=? ORDER BY published_at DESC LIMIT 3`).bind(now, post.id, post.category_id || 0).all();
    const { results: pop } = await env.DB.prepare(`SELECT title,slug FROM posts WHERE ${PUB} ORDER BY views DESC LIMIT 5`).bind(now).all();
    const purl = `${base}/post/${post.slug}`, ttl = encodeURIComponent(post.title);
    const tags = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => `<a class="badge" href="/search?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join(' ') : '';
    const body = `<div class="art"><article><span class="badge">${c ? `<a href="/category/${c.slug}">${c.emoji} ${esc(c.name)}</a>` : 'General'}</span><h1>${esc(post.title)}</h1>
<div class="meta">${fmtDate(post.published_at)} • ${readTime(post.content)} min read${S.show_views === '1' ? ` • 👁 <span id="vc">${post.views}</span> views` : ''}</div>
${post.cover ? `<img class="cover" src="${esc(post.cover)}" alt="${esc(post.title)}">` : ''}${adBox(S, 'ad_below_title')}<div class="content">${content}</div>${adBox(S, 'ad_after_content')}
<div style="margin:20px 0">${tags}</div><div class="share"><a target="_blank" rel="noopener" href="https://wa.me/?text=${ttl}%20${encodeURIComponent(purl)}">WhatsApp</a><a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${ttl}&url=${encodeURIComponent(purl)}">X</a><a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(purl)}">Facebook</a><a target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(purl)}&text=${ttl}">Telegram</a></div>
${rel.length ? `<h3 style="margin-top:34px">Related</h3><div class="grid">${rel.map(x => card(x, cats)).join('')}</div>` : ''}</article>
<aside class="side">${adBox(S, 'ad_sidebar')}<div class="box"><h4>🔥 Popular</h4>${pop.map(x => `<a href="/post/${x.slug}">${esc(x.title)}</a>`).join('')}</div><div class="box"><h4>Categories</h4>${cats.map(x => `<a href="/category/${x.slug}">${x.emoji} ${esc(x.name)}</a>`).join('')}</div></aside></div>
<script>fetch('/api/view',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:${post.id}})}).then(r=>r.json()).then(d=>{var e=document.getElementById('vc');if(e&&d.views)e.textContent=d.views}).catch(()=>{})</script>`;
    const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: post.title, image: post.cover || undefined, datePublished: post.published_at, dateModified: post.updated_at, description: post.seo_desc || post.excerpt, mainEntityOfPage: purl });
    return html(layout(S, cats, pages, { title: post.seo_title || `${post.title} — ${S.site_name}`, desc: post.seo_desc || post.excerpt, body, canonical: purl, og: { type: 'article', image: post.cover }, jsonld: ld.replace(/</g, '\\u003c') }), 200, { 'cache-control': 'public, max-age=30' });
  }
  return html(layout(S, cats, pages, { title: '404', body: '<section class="hero"><h1>404</h1><p>Page not found.</p></section>' }), 404);
}

/* ------------------------- API ------------------------- */
async function api(req, env, url, p) {
  const method = req.method; const body = ['POST', 'PUT'].includes(method) ? await req.json().catch(() => ({})) : {};
  if (p === '/api/view' && method === 'POST') {
    const id = parseInt(body.id); if (!id) return json({ ok: false });
    const post = await env.DB.prepare('SELECT views FROM posts WHERE id=?').bind(id).first(); if (!post) return json({ ok: false });
    const S = await getSettings(env);
    if (BOT.test(req.headers.get('user-agent') || '')) return json({ views: post.views, counted: false });
    if (S.count_admin_views !== '1' && await isAuth(req, env)) return json({ views: post.views, counted: false });
    const ip = req.headers.get('cf-connecting-ip') || 'unknown'; const h = (await sha(ip + '|' + (env.SESSION_SECRET || S.salt))).slice(0, 32);
    const r = await env.DB.prepare('INSERT OR IGNORE INTO views (post_id,ip_hash,day) VALUES (?,?,?)').bind(id, h, nowISO().slice(0, 10)).run();
    if (r.meta.changes > 0) { await env.DB.prepare('UPDATE posts SET views=views+1 WHERE id=?').bind(id).run(); return json({ views: post.views + 1, counted: true }); }
    return json({ views: post.views, counted: false });
  }
  if (p === '/api/login' && method === 'POST') {
    if (body.user === env.ADMIN_USER && body.pass === env.ADMIN_PASS && env.ADMIN_PASS) return json({ ok: true }, 200, { 'set-cookie': `adm=${await makeToken(env)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 86400}` });
    return json({ ok: false, error: 'Wrong ID or password' }, 401);
  }
  if (p === '/api/logout') return json({ ok: true }, 200, { 'set-cookie': 'adm=; Path=/; Max-Age=0' });
  if (!(await isAuth(req, env))) return json({ error: 'unauthorized' }, 401);
  const DB = env.DB; let m;

  if (p === '/api/admin/me') return json({ ok: true });
  if (p === '/api/admin/stats') {
    const now = nowISO(), today = now.slice(0, 10);
    const one = async (q, ...b) => (await DB.prepare(q).bind(...b).first());
    const total = await one('SELECT COUNT(*) n, COALESCE(SUM(views),0) v, SUM(status="published") pub, SUM(status="draft") dr FROM posts');
    const td = await one('SELECT COUNT(*) n FROM views WHERE day=?', today);
    const since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    const { results: days } = await DB.prepare('SELECT day, COUNT(*) n FROM views WHERE day>=? GROUP BY day').bind(since).all();
    const series = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); series.push({ day: d, n: days.find(x => x.day === d)?.n || 0 }); }
    const { results: top } = await DB.prepare('SELECT id,title,views FROM posts ORDER BY views DESC LIMIT 5').all();
    const { results: bycat } = await DB.prepare('SELECT c.name, COUNT(p.id) posts, COALESCE(SUM(p.views),0) views FROM categories c LEFT JOIN posts p ON p.category_id=c.id GROUP BY c.id').all();
    const { results: recent } = await DB.prepare('SELECT id,title,status,published_at FROM posts ORDER BY id DESC LIMIT 5').all();
    const sched = await one("SELECT COUNT(*) n FROM posts WHERE status='published' AND published_at>?", now);
    return json({ total, today: td.n, series, top, bycat, recent, scheduled: sched.n });
  }
  if (p === '/api/admin/posts' && method === 'GET') {
    const q = url.searchParams.get('q') || '', st = url.searchParams.get('status') || '', cat = url.searchParams.get('cat') || '';
    let sql = 'SELECT p.id,p.title,p.slug,p.status,p.featured,p.views,p.published_at,p.category_id,c.name cname FROM posts p LEFT JOIN categories c ON c.id=p.category_id WHERE 1=1', b = [];
    if (q) { sql += ' AND p.title LIKE ?'; b.push(`%${q}%`); } if (st) { sql += ' AND p.status=?'; b.push(st); } if (cat) { sql += ' AND p.category_id=?'; b.push(cat); }
    const { results } = await DB.prepare(sql + ' ORDER BY p.id DESC LIMIT 300').bind(...b).all(); return json(results);
  }
  if (p === '/api/admin/posts' && method === 'POST') return json({ id: await savePost(DB, body) });
  if (p === '/api/admin/posts/bulk' && method === 'POST') {
    const ids = (body.ids || []).map(Number).filter(Boolean); if (!ids.length) return json({ ok: true }); const ph = ids.map(() => '?').join(',');
    if (body.action === 'delete') { await DB.prepare(`DELETE FROM posts WHERE id IN (${ph})`).bind(...ids).run(); await DB.prepare(`DELETE FROM views WHERE post_id IN (${ph})`).bind(...ids).run(); }
    else if (body.action === 'publish') await DB.prepare(`UPDATE posts SET status='published' WHERE id IN (${ph})`).bind(...ids).run();
    else if (body.action === 'draft') await DB.prepare(`UPDATE posts SET status='draft' WHERE id IN (${ph})`).bind(...ids).run();
    else if (body.action === 'feature') await DB.prepare(`UPDATE posts SET featured=1 WHERE id IN (${ph})`).bind(...ids).run();
    else if (body.action === 'unfeature') await DB.prepare(`UPDATE posts SET featured=0 WHERE id IN (${ph})`).bind(...ids).run();
    return json({ ok: true });
  }
  if ((m = p.match(/^\/api\/admin\/posts\/(\d+)(\/dup|\/reset-views)?$/))) {
    const id = +m[1];
    if (m[2] === '/dup') { const o = await DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first(); if (!o) return json({ error: 'nf' }, 404); return json({ id: await savePost(DB, { ...o, title: o.title + ' (copy)', slug: '', status: 'draft', featured: 0 }) }); }
    if (m[2] === '/reset-views') { await DB.prepare('DELETE FROM views WHERE post_id=?').bind(id).run(); await DB.prepare('UPDATE posts SET views=0 WHERE id=?').bind(id).run(); return json({ ok: true }); }
    if (method === 'GET') return json(await DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first());
    if (method === 'PUT') { await savePost(DB, body, id); return json({ ok: true }); }
    if (method === 'DELETE') { await DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run(); await DB.prepare('DELETE FROM views WHERE post_id=?').bind(id).run(); return json({ ok: true }); }
  }
  if (p === '/api/admin/categories') {
    if (method === 'GET') { const { results } = await DB.prepare('SELECT c.*, (SELECT COUNT(*) FROM posts WHERE category_id=c.id) posts FROM categories c ORDER BY sort,id').all(); return json(results); }
    if (method === 'POST') { await DB.prepare('INSERT INTO categories (name,slug,emoji,description,sort) VALUES (?,?,?,?,?)').bind(body.name, slugify(body.slug || body.name), body.emoji || '', body.description || '', +body.sort || 0).run(); return json({ ok: true }); }
  }
  if ((m = p.match(/^\/api\/admin\/categories\/(\d+)$/))) {
    if (method === 'PUT') { await DB.prepare('UPDATE categories SET name=?,slug=?,emoji=?,description=?,sort=? WHERE id=?').bind(body.name, slugify(body.slug || body.name), body.emoji || '', body.description || '', +body.sort || 0, +m[1]).run(); return json({ ok: true }); }
    if (method === 'DELETE') { await DB.prepare('UPDATE posts SET category_id=NULL WHERE category_id=?').bind(+m[1]).run(); await DB.prepare('DELETE FROM categories WHERE id=?').bind(+m[1]).run(); return json({ ok: true }); }
  }
  if (p === '/api/admin/pages') {
    if (method === 'GET') { const { results } = await DB.prepare('SELECT * FROM pages ORDER BY id').all(); return json(results); }
    if (method === 'POST') { await DB.prepare('INSERT INTO pages (title,slug,content,in_footer) VALUES (?,?,?,?)').bind(body.title, slugify(body.slug || body.title), body.content || '', body.in_footer ? 1 : 0).run(); return json({ ok: true }); }
  }
  if ((m = p.match(/^\/api\/admin\/pages\/(\d+)$/))) {
    if (method === 'PUT') { await DB.prepare('UPDATE pages SET title=?,slug=?,content=?,in_footer=? WHERE id=?').bind(body.title, slugify(body.slug || body.title), body.content || '', body.in_footer ? 1 : 0, +m[1]).run(); return json({ ok: true }); }
    if (method === 'DELETE') { await DB.prepare('DELETE FROM pages WHERE id=?').bind(+m[1]).run(); return json({ ok: true }); }
  }
  if (p === '/api/admin/settings') {
    if (method === 'GET') { const S = await getSettings(env); delete S.salt; return json(S); }
    if (method === 'PUT') { const keys = Object.keys(DEFAULTS).filter(k => k !== 'salt'); const st = []; for (const k of keys) if (k in body) st.push(DB.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, String(body[k] ?? ''))); if (st.length) await DB.batch(st); return json({ ok: true }); }
  }
  if (p === '/api/admin/export') {
    const t = async n => (await DB.prepare(`SELECT * FROM ${n}`).all()).results;
    return json({ categories: await t('categories'), posts: await t('posts'), pages: await t('pages'), settings: await t('settings') });
  }
  if (p === '/api/admin/reset-all-views' && method === 'POST') { await DB.prepare('DELETE FROM views').run(); await DB.prepare('UPDATE posts SET views=0').run(); return json({ ok: true }); }
  return json({ error: 'not found' }, 404);
}
async function savePost(DB, b, id = 0) {
  const now = nowISO(); let slug = slugify(b.slug || b.title), base = slug, n = 1;
  while (await DB.prepare('SELECT id FROM posts WHERE slug=? AND id!=?').bind(slug, id).first()) slug = base + '-' + (++n);
  const f = [b.title || 'Untitled', slug, b.excerpt || '', b.content || '', b.cover || '', b.category_id ? +b.category_id : null, b.tags || '', b.status === 'published' ? 'published' : 'draft', b.featured ? 1 : 0, b.seo_title || '', b.seo_desc || '', b.published_at || now];
  if (id) { await DB.prepare('UPDATE posts SET title=?,slug=?,excerpt=?,content=?,cover=?,category_id=?,tags=?,status=?,featured=?,seo_title=?,seo_desc=?,published_at=?,updated_at=? WHERE id=?').bind(...f, now, id).run(); return id; }
  const r = await DB.prepare('INSERT INTO posts (title,slug,excerpt,content,cover,category_id,tags,status,featured,seo_title,seo_desc,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...f, now, now).run();
  return r.meta.last_row_id;
}
