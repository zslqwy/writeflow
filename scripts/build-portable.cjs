const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const distDir = path.join(rootDir, 'dist');
const electronMainDir = path.join(rootDir, 'electron');
const releaseDir = path.join(rootDir, 'release');
const portableDir = path.join(releaseDir, 'WriteFlow-portable');
const appDir = path.join(portableDir, 'resources', 'app');

function assertPathExists(targetPath, message) {
    if (!fs.existsSync(targetPath)) {
        throw new Error(message);
    }
}

function copyDirectory(source, target) {
    fs.cpSync(source, target, {
        recursive: true,
        force: true,
        dereference: true,
    });
}

assertPathExists(path.join(electronDistDir, 'electron.exe'), 'Electron runtime is missing. Run "npm rebuild electron" first.');
assertPathExists(path.join(distDir, 'index.html'), 'Vite build output is missing. Run "npm run build" first.');
assertPathExists(path.join(electronMainDir, 'main.cjs'), 'Electron main process file is missing.');

fs.rmSync(portableDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });

copyDirectory(electronDistDir, portableDir);

fs.rmSync(appDir, { recursive: true, force: true });
fs.mkdirSync(appDir, { recursive: true });

copyDirectory(distDir, path.join(appDir, 'dist'));
copyDirectory(electronMainDir, path.join(appDir, 'electron'));

fs.writeFileSync(
    path.join(appDir, 'package.json'),
    JSON.stringify({
        name: 'writeflow',
        version: '0.0.0',
        private: true,
        main: 'electron/main.cjs',
    }, null, 2)
);

const originalExe = path.join(portableDir, 'electron.exe');
const appExe = path.join(portableDir, 'WriteFlow.exe');
if (fs.existsSync(originalExe)) {
    fs.renameSync(originalExe, appExe);
}

console.log(`Portable desktop app created at: ${portableDir}`);
console.log(`Run: ${appExe}`);
