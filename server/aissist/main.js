const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isPaused = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            nodeIntegrationInWorker: true,
            devTools: true
        }
    });
    mainWindow.loadFile('index.html');
    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });
}

function updateTrayMenu() {
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Open', click: () => mainWindow.show() },
        {
            label: isPaused ? 'Resume Analysis' : 'Pause Analysis',
            click: () => {
                isPaused = !isPaused;
                updateTrayMenu();
                mainWindow.webContents.send('update-status', isPaused ? 'Paused' : 'Running');
            }
        },
        { label: 'Exit', click: () => app.quit() }
    ]));
}

function createTray() {
    const trayIconPath = path.join(/*__dirname, 'assets', */'/home/me/d/doom.png');
    tray = new Tray(trayIconPath);
    updateTrayMenu();
    tray.setToolTip('Screenshot Analyzer');
}

app.whenReady().then(() => { createWindow(); createTray(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
