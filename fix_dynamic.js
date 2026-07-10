const fs = require('fs');
const glob = require('glob');
const path = require('path');

function processDirectory(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('route.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('export const dynamic')) {
        content = 'export const dynamic = \'force-dynamic\';\n' + content;
        fs.writeFileSync(fullPath, content);
        console.log('Updated: ' + fullPath);
      }
    }
  });
}

processDirectory(path.join(process.cwd(), 'app/api'));
