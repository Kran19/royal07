const fs = require('fs');
const path = require('path');

function walkDir(dir, filter, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, filter, callback) : callback(path.join(dir, f));
    });
}

walkDir('src/modules', function(filePath) {
    if (filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/'\.\.\/prisma\/prisma\.service'/g, "'../../prisma/prisma.service'");
        content = content.replace(/'\.\.\/common\/guards\/auth\.guard'/g, "'../../common/guards/auth.guard'");
        fs.writeFileSync(filePath, content);
    }
});
