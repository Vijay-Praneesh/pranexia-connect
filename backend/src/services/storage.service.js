const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const mediaConfig = require("../config/media");
const AppError = require("../utils/appError");

class LocalStorageProvider {
  constructor(rootPath) { this.rootPath = rootPath; }
  resolve(storageKey) {
    const target = path.resolve(this.rootPath, storageKey);
    if (target !== this.rootPath && !target.startsWith(`${this.rootPath}${path.sep}`)) throw new AppError("Invalid storage key", 400);
    return target;
  }
  async save(storageKey, buffer) {
    const target = this.resolve(storageKey);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, buffer, { flag: "wx" });
    return storageKey;
  }
  async get(storageKey) { return fs.createReadStream(this.resolve(storageKey)); }
  async readBuffer(storageKey) { return fsp.readFile(this.resolve(storageKey)); }
  async delete(storageKey) {
    try { await fsp.unlink(this.resolve(storageKey)); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  async exists(storageKey) {
    try { await fsp.access(this.resolve(storageKey)); return true; }
    catch { return false; }
  }
}

class StorageService {
  constructor() {
    if (mediaConfig.storageProvider !== "local") {
      throw new Error(`MEDIA_STORAGE_PROVIDER=${mediaConfig.storageProvider} is not configured. Add an object-storage provider implementation before selecting it.`);
    }
    this.provider = new LocalStorageProvider(mediaConfig.localStoragePath);
  }
  save(key, buffer) { return this.provider.save(key, buffer); }
  get(key) { return this.provider.get(key); }
  readBuffer(key) { return this.provider.readBuffer(key); }
  delete(key) { return this.provider.delete(key); }
  exists(key) { return this.provider.exists(key); }
}

module.exports = new StorageService();
