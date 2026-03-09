const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove TopNav component definition
let topNavStart = content.indexOf('const TopNav =');
if (topNavStart !== -1) {
    let topNavEnd = content.indexOf(';', topNavStart);
    // It might be a multi-line arrow function ending in `);`
    let nextComment = content.indexOf('// ---', topNavStart);
    if (nextComment !== -1) {
        let topNavContent = content.substring(topNavStart, nextComment);
        content = content.replace(topNavContent, '');
        console.log('✅ Removed TopNav definition');
    }
}

// 2. Remove <TopNav current={mainNav} onChange={setMainNav} /> or similar
// We know it's rendered as `<TopNav `
let topNavElement = content.match(/<TopNav[^>]+>/g);
if (topNavElement) {
    topNavElement.forEach(tag => {
        content = content.replace(tag, '');
    });
    console.log('✅ Removed <TopNav /> elements');
}

fs.writeFileSync(path, content, 'utf8');
