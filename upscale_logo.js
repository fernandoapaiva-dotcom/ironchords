const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldCodeRegex = /<div className=\"flex items-center space-x-2 mb-2 px-1\">\s+<Flame className=\"w-6 h-6 text-\[#B87333\]\" \/>\s+<span className=\"text-\[18px\] font-black text-white italic uppercase tracking-tighter leading-none\">IRON<span className=\"text-\[#B87333\]\">CHORDS<\/span><\/span>\s+<\/div>/;

const newCode = `<div className="flex items-center space-x-3 mb-2.5 px-1">
                                        <Flame className="w-8 h-8 text-[#B87333]" />
                                        <span className="text-[32px] font-black text-white italic uppercase tracking-tighter leading-none">IRON<span className="text-[#B87333]">CHORDS</span></span>
                                    </div>`;

if (oldCodeRegex.test(content)) {
    content = content.replace(oldCodeRegex, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated logo size to 32px.');
} else {
    console.error('Could not find the 18px logo code to replace.');
    // Fallback: search for any logo pattern in that area
    const generalLogoRegex = /<div className=\"flex flex-col items-start shrink-0 mr-2\">\s+<div className=\"flex items-center space-x-\d+\.?\d* mb-\d+\.?\d* px-1\">\s+<Flame className=\"w-\d+ h-\d+ text-\[#B87333\]\" \/>\s+<span className=\"text-\[\d+px\] font-black text-white italic uppercase tracking-tighter leading-none\">IRON<span className=\"text-\[#B87333\]\">CHORDS<\/span><\/span>\s+<\/div>/;
    if (generalLogoRegex.test(content)) {
        content = content.replace(generalLogoRegex, `<div className="flex flex-col items-start shrink-0 mr-2">\n                                    ${newCode}`);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully updated logo size via general regex.');
    } else {
        console.error('STILL could not find logo code.');
    }
}
