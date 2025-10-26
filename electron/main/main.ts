import { app, BrowserWindow, dialog, ipcMain } from "electron"
import { join } from "path"
import { createApplicationMenu } from "./menu"
import { setupInstanceIPC } from "./ipc"
import { setupStorageIPC } from "./storage"

// Setup IPC handlers before creating windows
setupStorageIPC()

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  createApplicationMenu(mainWindow)
  setupInstanceIPC(mainWindow)

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
