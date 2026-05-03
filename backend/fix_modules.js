const fs = require('fs');
const glob = require('glob');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
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
