const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../frontend/dist');

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*,\s*/g, ',')
    .replace(/;}/g, '}')
    .trim();
}

function minifyHTML(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function minifyJS(js) {
  let result = js
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:=<>+\-*/&|!])\s*/g, '$1')
    .replace(/\b(var|let|const|function|return|if|else|for|while|async|await|new|typeof|instanceof|void|delete|in|of)\b/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
  
  result = result
    .replace(/\bfunction\s+(\w+)\s*\(([^)]*)\)\s*\{/g, 'function $1($2){')
    .replace(/\bif\s*\(([^)]*)\)\s*\{/g, 'if($1){')
    .replace(/\belse\s*\{/g, 'else{')
    .replace(/\bfor\s*\(([^)]*)\)\s*\{/g, 'for($1){')
    .replace(/\bwhile\s*\(([^)]*)\)\s*\{/g, 'while($1){')
    .replace(/\breturn\s+/g, 'return')
    .replace(/\bvar\s+/g, 'var')
    .replace(/\blet\s+/g, 'let')
    .replace(/\bconst\s+/g, 'const')
    .replace(/\basync\s+/g, 'async')
    .replace(/\bawait\s+/g, 'await')
    .replace(/\bnew\s+/g, 'new');
  
  return result;
}

function obfuscateJS(js) {
  const varMap = {};
  let varCounter = 0;
  
  function generateVarName() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let name = '';
    let num = varCounter++;
    do {
      name = chars[num % 26] + name;
      num = Math.floor(num / 26);
    } while (num > 0);
    return '_' + name;
  }

  const localVarRegex = /\b(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;
  while ((match = localVarRegex.exec(js)) !== null) {
    const varName = match[1];
    if (!varMap[varName] && varName.length > 2) {
      varMap[varName] = generateVarName();
    }
  }

  const funcRegex = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  while ((match = funcRegex.exec(js)) !== null) {
    const funcName = match[1];
    if (!varMap[funcName] && funcName.length > 2 && !funcName.startsWith('on')) {
      varMap[funcName] = generateVarName();
    }
  }

  let result = js;
  for (const [original, obfuscated] of Object.entries(varMap)) {
    const regex = new RegExp(`\\b${original}\\b`, 'g');
    result = result.replace(regex, obfuscated);
  }

  return result;
}

console.log('Starting build process...\n');

try {
  const cssPath = path.join(distDir, 'style.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const minifiedCSS = minifyCSS(cssContent);
  fs.writeFileSync(cssPath, minifiedCSS);
  console.log(`✓ CSS minified: ${(cssContent.length / 1024).toFixed(2)}KB → ${(minifiedCSS.length / 1024).toFixed(2)}KB`);

  const jsPath = path.join(distDir, 'app.js');
  const jsContent = fs.readFileSync(jsPath, 'utf-8');
  let processedJS = minifyJS(jsContent);
  processedJS = obfuscateJS(processedJS);
  fs.writeFileSync(jsPath, processedJS);
  console.log(`✓ JS minified & obfuscated: ${(jsContent.length / 1024).toFixed(2)}KB → ${(processedJS.length / 1024).toFixed(2)}KB`);

  const htmlPath = path.join(distDir, 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  const minifiedHTML = minifyHTML(htmlContent);
  fs.writeFileSync(htmlPath, minifiedHTML);
  console.log(`✓ HTML minified: ${(htmlContent.length / 1024).toFixed(2)}KB → ${(minifiedHTML.length / 1024).toFixed(2)}KB`);

  const totalSize = minifiedHTML.length + minifiedCSS.length + processedJS.length;
  console.log(`\n=== Build Complete ===`);
  console.log(`Total file size: ${(totalSize / 1024).toFixed(2)}KB`);
  console.log(`Size limit: 100KB`);
  console.log(`Status: ${totalSize < 100 * 1024 ? 'PASS ✓' : 'FAIL ✗'}`);

  if (totalSize >= 100 * 1024) {
    process.exit(1);
  }
} catch (error) {
  console.error('\nBuild failed:', error.message);
  process.exit(1);
}
