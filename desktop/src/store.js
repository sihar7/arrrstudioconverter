// Penyimpanan kecil berbasis JSON di userData (posisi jendela, folder download)
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

const file = () => path.join(app.getPath("userData"), "settings.json");
let cache = null;

function read() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    cache = {};
  }
  return cache;
}

function get(key, fallback) {
  const v = read()[key];
  return v === undefined ? fallback : v;
}

function set(key, value) {
  read()[key] = value;
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(cache, null, 2));
  } catch (e) {
    console.warn("[store] gagal menyimpan:", e.message);
  }
}

module.exports = { get, set };
