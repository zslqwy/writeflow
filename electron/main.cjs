const { app, BrowserWindow, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const isDevelopment = !app.isPackaged;
const APP_PROTOCOL = 'writeflow';

protocol.registerSchemesAsPrivileged([
    {
        scheme: APP_PROTOCOL,
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
        },
    },
]);

function getAppRoot() {
    return isDevelopment
        ? path.join(__dirname, '..')
        : path.join(process.resourcesPath, 'app');
}

function getDistFilePath(requestUrl) {
    const distRoot = path.join(getAppRoot(), 'dist');
    const url = new URL(requestUrl);
    const decodedPath = decodeURIComponent(url.pathname);
    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
    const normalizedRelativePath = path.normalize(relativePath);

    if (normalizedRelativePath.startsWith('..') || path.isAbsolute(normalizedRelativePath)) {
        return null;
    }

    const filePath = path.join(distRoot, normalizedRelativePath);
    const relativeToDist = path.relative(distRoot, filePath);
    if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
        return null;
    }

    return filePath;
}

function registerAppProtocol() {
    protocol.handle(APP_PROTOCOL, (request) => {
        const filePath = getDistFilePath(request.url);
        if (!filePath) {
            return new Response('Not found', { status: 404 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
    });
}

function createWindow() {
    const window = new BrowserWindow({
        width: 1280,
        height: 840,
        minWidth: 960,
        minHeight: 640,
        title: 'WriteFlow',
        backgroundColor: '#111317',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            void shell.openExternal(url);
        }

        return { action: 'deny' };
    });

    window.webContents.on('will-navigate', (event, url) => {
        const currentUrl = window.webContents.getURL();
        if (currentUrl && url !== currentUrl && /^https?:\/\//.test(url)) {
            event.preventDefault();
            void shell.openExternal(url);
        }
    });

    if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
        void window.loadURL(process.env.VITE_DEV_SERVER_URL);
        return;
    }

    void window.loadURL(`${APP_PROTOCOL}://app/index.html`);
}

app.whenReady().then(() => {
    registerAppProtocol();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
