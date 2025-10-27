import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const notFoundHtmlPath = path.join(distDir, '404.html');

// Copy index.html to 404.html for SPA routing on GitHub Pages
if (fs.existsSync(indexHtmlPath)) {
  fs.copyFileSync(indexHtmlPath, notFoundHtmlPath);
  console.log('✅ Created 404.html for SPA routing');
} else {
  console.error('❌ Error: index.html not found in dist folder');
  process.exit(1);
}

// Create .nojekyll file to prevent GitHub Pages from ignoring files starting with underscore
const nojekyllPath = path.join(distDir, '.nojekyll');
fs.writeFileSync(nojekyllPath, '');
console.log('✅ Created .nojekyll file');

console.log('\n🎉 GitHub Pages preparation complete!');
console.log('📦 Files in dist folder are ready for deployment');
console.log('\n📝 Next steps:');
console.log('   1. Run: npm run deploy');
console.log('   2. Or manually push the dist folder to gh-pages branch');
console.log('\n🌐 Your site will be available at:');
console.log('   https://chethan616.github.io/lost-n-found/');
