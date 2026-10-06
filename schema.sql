CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, emoji TEXT DEFAULT '', description TEXT DEFAULT '', sort INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, excerpt TEXT DEFAULT '', content TEXT DEFAULT '', cover TEXT DEFAULT '', category_id INTEGER, tags TEXT DEFAULT '', status TEXT DEFAULT 'draft', featured INTEGER DEFAULT 0, views INTEGER DEFAULT 0, seo_title TEXT DEFAULT '', seo_desc TEXT DEFAULT '', published_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS views (post_id INTEGER, ip_hash TEXT, day TEXT, PRIMARY KEY (post_id, ip_hash));
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, content TEXT DEFAULT '', in_footer INTEGER DEFAULT 1);
CREATE INDEX IF NOT EXISTS idx_posts_pub ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_views_day ON views(day);
INSERT OR IGNORE INTO categories (name, slug, emoji, description, sort) VALUES
('Dark Psychology','dark-psychology','🧠','Manipulation, persuasion and the hidden side of the human mind.',1),
('Billionaire Financial Leak','billionaire-financial-leak','💰','Money moves and secrets the ultra-rich rarely talk about.',2),
('Secret AI Side-Hustle Tool','secret-ai-side-hustle-tool','🤖','AI tools and side hustles that actually make money.',3);
INSERT OR IGNORE INTO pages (title, slug, content) VALUES
('About','about','<p>Write about your website here.</p>'),
('Privacy Policy','privacy-policy','<p>Write your privacy policy here. Mention cookies, Google AdSense / ad networks and analytics.</p>'),
('Contact','contact','<p>Contact us at: your@email.com</p>'),
('Disclaimer','disclaimer','<p>The content on this website is for educational and informational purposes only.</p>');
