const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const { minify: minifyHtml } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

const srcDir = path.join(__dirname, 'frontend', 'src');
const distDir = path.join(__dirname, 'frontend', 'dist');

// 确保dist目录存在
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

async function build() {
    console.log('开始构建...');

    // 1. 压缩 JavaScript
    console.log('压缩 JavaScript...');
    const jsContent = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');
    const jsResult = await minify(jsContent, {
        compress: {
            drop_console: false,
        },
        mangle: {
            keep_fnames: false,
        },
        format: {
            comments: false,
        }
    });

    if (jsResult.error) {
        console.error('JS压缩错误:', jsResult.error);
        process.exit(1);
    }

    fs.writeFileSync(path.join(distDir, 'app.js'), jsResult.code);
    console.log('✓ app.js 压缩完成');

    // 验证JS语法
    try {
        const { execSync } = require('child_process');
        execSync(`node --check "${path.join(distDir, 'app.js')}"`);
        console.log('✓ JS语法检查通过');
    } catch (e) {
        console.error('✗ JS语法检查失败:', e.message);
        process.exit(1);
    }

    // 2. 压缩 HTML
    console.log('压缩 HTML...');
    const htmlContent = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
    const htmlResult = await minifyHtml(htmlContent, {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: false,
    });

    fs.writeFileSync(path.join(distDir, 'index.html'), htmlResult);
    console.log('✓ index.html 压缩完成');

    // 3. 压缩 CSS
    console.log('压缩 CSS...');
    const cssContent = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
    const cssResult = new CleanCSS().minify(cssContent);

    if (cssResult.errors && cssResult.errors.length > 0) {
        console.error('CSS压缩错误:', cssResult.errors);
        process.exit(1);
    }

    fs.writeFileSync(path.join(distDir, 'style.css'), cssResult.styles);
    console.log('✓ style.css 压缩完成');

    // 计算总大小
    const jsSize = (fs.statSync(path.join(distDir, 'app.js')).size / 1024).toFixed(2);
    const htmlSize = (fs.statSync(path.join(distDir, 'index.html')).size / 1024).toFixed(2);
    const cssSize = (fs.statSync(path.join(distDir, 'style.css')).size / 1024).toFixed(2);
    const totalSize = (parseFloat(jsSize) + parseFloat(htmlSize) + parseFloat(cssSize)).toFixed(2);

    console.log('\n构建完成!');
    console.log(`文件大小: app.js ${jsSize}KB, index.html ${htmlSize}KB, style.css ${cssSize}KB, 总计 ${totalSize}KB`);
    console.log(`< 100KB: ${parseFloat(totalSize) < 100 ? '✓ PASS' : '✗ FAIL'}`);
}

build().catch(err => {
    console.error('构建失败:', err);
    process.exit(1);
});
