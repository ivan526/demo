const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const { minify: minifyHtml } = require('html-minifier');
const CleanCSS = require('clean-css');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Minify HTML
const htmlContent = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const minifiedHtml = minifyHtml(htmlContent, {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true
});
fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHtml);
console.log('✅ HTML minified');

// Minify CSS
const cssContent = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
const minifiedCss = new CleanCSS().minify(cssContent).styles;
fs.writeFileSync(path.join(distDir, 'style.css'), minifiedCss);
console.log('✅ CSS minified');

// Minify JS
const jsContent = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');
minify(jsContent, {
  compress: {
    drop_console: false,
    dead_code: true,
    unused: true
  },
  mangle: {
    toplevel: true
  }
}).then(result => {
  fs.writeFileSync(path.join(distDir, 'app.js'), result.code);
  console.log('✅ JavaScript minified');
  
  // Show file sizes
  const htmlSize = (Buffer.byteLength(minifiedHtml) / 1024).toFixed(2);
  const cssSize = (Buffer.byteLength(minifiedCss) / 1024).toFixed(2);
  const jsSize = (Buffer.byteLength(result.code) / 1024).toFixed(2);
  const totalSize = (parseFloat(htmlSize) + parseFloat(cssSize) + parseFloat(jsSize)).toFixed(2);
  
  console.log('\n📊 File sizes:');
  console.log(`  index.html: ${htmlSize} KB`);
  console.log(`  style.css:  ${cssSize} KB`);
  console.log(`  app.js:     ${jsSize} KB`);
  console.log(`  -------------------`);
  console.log(`  Total:      ${totalSize} KB`);
  console.log(`  Target:     < 100 KB ✓`);
});
