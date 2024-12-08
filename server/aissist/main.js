const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isPaused = false;

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true, // Enable Node.js integration
            contextIsolation: false, // Allow direct access to Node.js modules
            nodeIntegrationInWorker: true,
            devTools:true
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', (event) => {
        // Hide the window instead of closing it
        event.preventDefault();
        mainWindow.hide();
    });
}

// Create the system tray
function createTray() {
    const trayIconPath = path.join('/home/me/d/doom.png'); // Ensure this file exists

    tray = new Tray(trayIconPath);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            click: () => {
                mainWindow.show();
            }
        },
        {
            label: 'Pause Analysis',
            click: () => {
                isPaused = !isPaused;
                updateTrayMenu();
                mainWindow.webContents.send('update-status', isPaused ? 'Paused' : 'Running');
            }
        },
        {
            label: 'Exit',
            click: () => {
                app.quit();
                app.exit(0);
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('Screenshot Analyzer');
}

// Update the tray menu dynamically
function updateTrayMenu() {
    tray.setContextMenu(
        Menu.buildFromTemplate([
            {
                label: 'Open',
                click: () => {
                    mainWindow.show();
                }
            },
            {
                label: isPaused ? 'Resume Analysis' : 'Pause Analysis',
                click: () => {
                    isPaused = !isPaused;
                    updateTrayMenu();
                    mainWindow.webContents.send('update-status', isPaused ? 'Paused' : 'Running');
                }
            },
            {
                label: 'Exit',
                click: () => {
                    app.quit();
                }
            }
        ])
    );
}

// Application lifecycle
app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {

        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
