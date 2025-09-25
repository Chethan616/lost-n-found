const Database = require('better-sqlite3');
const db = new Database('database.sqlite', { readonly: false });

function safeRun(sql, params = []) {
  try {
    return db.prepare(sql).all(params);
  } catch (e) {
    return { error: String(e) };
  }
}

console.log('database path:', require('path').resolve('database.sqlite'));

const counts = {
  users: safeRun("SELECT COUNT(*) AS cnt FROM users;").map(r => r.cnt)[0] || 0,
  items: safeRun("SELECT COUNT(*) AS cnt FROM items;").map(r => r.cnt)[0] || 0,
  claims: safeRun("SELECT COUNT(*) AS cnt FROM claims;").map(r => r.cnt)[0] || 0,
};

console.log('counts:', counts);

console.log('\nsample users (limit 5):');
console.log(JSON.stringify(safeRun("SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;"), null, 2));

console.log('\nsample items (limit 5):');
console.log(JSON.stringify(safeRun("SELECT id, item_name, type, status, user_id, created_at FROM items ORDER BY created_at DESC LIMIT 5;"), null, 2));

console.log('\nsample claims (limit 5):');
console.log(JSON.stringify(safeRun("SELECT id, item_id, claimer_id, status, ai_score, text_similarity, image_similarity, created_at FROM claims ORDER BY created_at DESC LIMIT 5;"), null, 2));

db.close();
