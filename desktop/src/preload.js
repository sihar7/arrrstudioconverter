// Jembatan aman web ↔ app (contextIsolation + sandbox). Hanya diekspos ke halaman ARRR sendiri.
const { contextBridge, ipcRenderer } = require("electron");

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";
const origin = arg("arrr-origin");

if (origin && location.origin === origin) {
  contextBridge.exposeInMainWorld("arrDesktop", {
    isDesktop: true,
    version: arg("arrr-version"),
    platform: process.platform,
    /** cb({ id, type: started|progress|done|cancelled|failed, name?, received?, total? }) → fungsi unsubscribe */
    onDownload(cb) {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on("download:event", listener);
      return () => ipcRenderer.removeListener("download:event", listener);
    },
    showDownload: (id) => ipcRenderer.invoke("download:show", id),
    openDownloadsFolder: () => ipcRenderer.invoke("download:openFolder"),
    getDownloadsFolder: () => ipcRenderer.invoke("download:getFolder"),
    chooseDownloadsFolder: () => ipcRenderer.invoke("download:chooseFolder"),
  });
}
