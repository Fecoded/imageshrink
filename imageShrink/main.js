const path = require("path");
const os = require("os");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const slash = require("slash");
const log = require("electron-log");

// SET ENV
process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;

const isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let aboutWindow;

function createMainWindow() {
  // Instantiate new Browserwindow
  mainWindow = new BrowserWindow({
    webPreferences: {
      // preload: path.join(__dirname, "./preload.js"),
      nodeIntegration: true,
      // worldSafeExecuteJavaScript: true,
    },
    title: "ImageShrink",
    width: isDev ? 700 : 500,
    height: 600,
    icon: "./assets/icons/Icon_256x256.png",
    resizable: isDev,
    backgroundColor: "white",
  });

  //Opens the dev tools by default in development mode.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // load external url
  //   mainWindow.loadURL(`file://${__dirname}/app/index.html`);
  // load external file
  mainWindow.loadFile("./app/index.html");
}

// About
function createAboutWindow() {
  // Instantiate new Browserwindow
  aboutWindow = new BrowserWindow({
    webPreferences: {
      worldSafeExecuteJavaScript: true,
      contextIsolation: true,
    },
    title: "About ImageShrink",
    width: 300,
    height: 300,
    icon: "./assets/icons/Icon_256x256.png",
    resizable: false,
    backgroundColor: "white",
  });

  // load external url
  //   mainWindow.loadURL(`file://${__dirname}/app/index.html`);
  // load external file
  aboutWindow.loadFile("./app/about.html");
}

app.on("ready", () => {
  createMainWindow();

  // Initiate Menu
  const mainMenu = Menu.buildFromTemplate(menu);
  // Disable the default Menu Bar
  Menu.setApplicationMenu(mainMenu);

  // globalShortcut.register("CmdorCtrl+R", () => mainWindow.reload());
  // globalShortcut.register(isMac ? "Command+Alt+I" : "Ctrl+Shift+I", () =>
  //   mainWindow.toggleDevTools()
  // );

  mainWindow.on("closed", () => (mainWindow = null));
});

// Define a Menu
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "toggledevtools" },
          ],
        },
      ]
    : []),
];

ipcMain.on("image:minimize", (e, options) => {
  options.dest = path.join(os.homedir(), "imageshrink");
  shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100;

    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    });
    log.info(files);

    shell.openPath(dest);

    // send to renderer
    mainWindow.webContents.send("image:done");
  } catch (err) {
    console.log(err);
    log.error(err);
  }
}

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
