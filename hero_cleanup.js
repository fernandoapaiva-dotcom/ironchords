const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// The main ternary starts around line 2850:
// `{true ? (`
// It has the `) : activeTab === 'presentation' ? (` branch and the `) : (` branch.
// We want to remove all of the `else` branches of `true ?` down to the final `)}` wrapping the `return` statement.
// Since it's huge, string replacement is unsafe unless very specific.

// Let's find `) : activeTab === 'presentation' ? (`
let searchStr = ") : activeTab === 'presentation' ? (";
let startIndex = content.indexOf(searchStr);

if (startIndex !== -1) {
    // Determine where it ends. We are in the main <main> element.
    // The `<main>` ends at `</main>`.
    let mainEndIndex = content.indexOf('</main>', startIndex);
    if (mainEndIndex !== -1) {
        // We want to delete from `startIndex` up to the last `)}` BEFORE `</main>`
        let section = content.substring(startIndex, mainEndIndex);

        // Find the `)}` that closes the ternary just before `</main>`
        // Using string match or split.
        // It's probably `                )}`
        let lines = section.split('\n');

        // A safer way is parsing the `{true ? (` out completely.
        // Let's just find the closing tags and strip the `{true ? (` completely.

        content = content.replace('{true ? (', '');

        // Now find the `) : activeTab === 'presentation' ? (`
        // We know where it starts. Let's find the closing `)}` before `</main>`
        let newStartIndex = content.indexOf(searchStr);
        let newMainEndIndex = content.indexOf('</main>', newStartIndex);

        if (newStartIndex !== -1 && newMainEndIndex !== -1) {
            let sectionToRemove = content.substring(newStartIndex, newMainEndIndex);

            // Wait, there's a `)}` at the end of `sectionToRemove` that belongs to `{true ? (`
            // Let's just remove the whole sectionToRemove up to the last line before `</main>`.
            let textToReplace = sectionToRemove.substring(0, sectionToRemove.lastIndexOf(')}'));

            content = content.replace(textToReplace + ')}', '');
            console.log('✅ Removed dead presentation and selection branches');
            fs.writeFileSync(path, content, 'utf8');
        } else {
            console.log('❌ Could not find boundaries after stripping true ?');
        }
    } else {
        console.log('❌ Could not find </main>');
    }
} else {
    console.log('❌ Could not find activeTab branch');
}

