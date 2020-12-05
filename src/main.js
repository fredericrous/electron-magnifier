const os = require('os');
const path = require('path')
var mainWindow;

const { app, screen, BrowserWindow, ipcRenderer, Menu, Tray, clipboard, ipcMain } = require('electron');
const availableDisplays = {};

const appIcon = path.resolve('assets', 'rulerblade2Template.png');
const appIconLarge =  path.resolve('assets', 'rulerblade2Template@2x.png');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const makeKey = (x, y) => `${x} ${y}`
const addDisplayToStore = ({bounds: {x, y}}, id) => {
  availableDisplays[makeKey(x,y)] = id;
}
const deleteDisplayFromStore = ({bounds: {x, y}}) => {
  const key = makeKey(x,y);
  const id = availableDisplays[key];
  delete availableDisplays[key];
  return id;
}

const createWindow = display => {
  const {bounds, workAreaSize} = display;

  const videoWindow = new BrowserWindow({
    ...bounds,
    ...workAreaSize,
    transparent: true,
    frame: false,
    simpleFullscreen: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    thickFrame: false,
    enableLargerThanScreen: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  videoWindow.setContentProtection(true);
  videoWindow.setVisibleOnAllWorkspaces(true);
  videoWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY + '#video');

  mainWindow = new BrowserWindow({
    ...bounds,
    ...workAreaSize,
    transparent: true,
    frame: false,
    simpleFullscreen: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    thickFrame: false,
    enableLargerThanScreen: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  mainWindow.setContentProtection(true);
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.addListener('blur', () => {
    //ipcRenderer.send('loseFocus', mainWindow.)
  });
  addDisplayToStore(display, mainWindow.id);
  // Open the DevTools.
  videoWindow.webContents.openDevTools({mode: 'detach'});
};

const deleteWindow = (newDisplay) => {
  const id = deleteDisplayFromStore(newDisplay)
  if (id) {
    const win = BrowserWindow.fromId(id);
    win.destroy();
  }
}

const hideMenu = () => os.platform() === 'darwin' ? app.dock.hide() : Menu.setApplicationMenu(null)

const createWindows = _ => screen.getAllDisplays().forEach(createWindow);
let tray = null;
const handleReady = () => {
  // Create the browser window.
  createWindows();
  // this might be achieved instead with screen.getDisplayNearestPoint({x: winBounds.x, y: winBounds.y})
  //
  // screen.addListener('display-added', (event, newDisplay) => {
  //   const {bounds} = newDisplay;
  //   if (availableDisplays[makeKey(bounds.x, bounds.y)]) {
  //     console.log('display already has a window')
  //
  //   } else {
  //     createWindow(newDisplay);
  //   }
  // })
  screen.addListener('display-removed', (event, newDisplay) => {
    deleteWindow(newDisplay);
  })

  hideMenu();

  tray = new Tray(appIcon);
  const contextMenu = Menu.buildFromTemplate([
    // { label: 'Take a measure', },
    { label: 'Add a ruler', click() {
      clipboard.writeText('Example String')
    }},
    { type: 'separator' },
    { label: 'Recently measured', enabled: false },
    { label: '40px' },
    { type: 'separator' },
    {
      label: 'Measurement Unit',
      submenu: [
        { label: 'px', type: 'checkbox', checked: true },
        { label: 'cm', type: 'checkbox', checked: false },
        { label: 'mm', type: 'checkbox', checked: false },
        { label: 'in', type: 'checkbox', checked: false }
      ]
    },
    // { label: 'About', click: async () => {
    //     openAboutWindow({
    //       icon_path: 'path/to/icon.png'
    //     })
    //   }},
    { type: 'separator' },
    { label: 'About', role: 'about'},
    { label: 'Quit RulerBlade 2', role: 'quit' },
  ])
  tray.setToolTip('RulerBlade 2')
  tray.setContextMenu(contextMenu)
};

app.on('ready', handleReady);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindows();
  }
});

app.setAboutPanelOptions({
  applicationName: 'Ruler Blade 2',
  applicationVersion: '2.0.0',
  copyright: 'Copyright 2020 Frederic Rousseau',
  authors: 'fredericrous',
  iconPath: appIconLarge,
});

ipcMain.on('get-mouse-position', (event) => {
  const cursor = screen.getCursorScreenPoint();
  const distScreen = screen.getDisplayNearestPoint({x: cursor.x, y: cursor.y});
  event.reply('get-mouse-position-complete', { distScreen, cursor });
});

ipcMain.on('update-canvas', (event, data) => {
  mainWindow.webContents.send('updated-canvas', data);
});
