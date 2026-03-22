import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { initClientDatabase, closeClientDatabase } from "@open-ogi/client";
import { registerIpcHandlers } from "./ipc-handlers.js";
import { createMainWindow } from "./window-manager.js";

let mainWindow: BrowserWindow | null = null;

async function bootstrap(): Promise<void> {
  // Initialize client database in user data directory
  const dbPath = join(app.getPath("userData"), "open-ogi.db");
  initClientDatabase(dbPath);

  mainWindow = createMainWindow();

  registerIpcHandlers(ipcMain);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  closeClientDatabase();
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    bootstrap();
  }
});
