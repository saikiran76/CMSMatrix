import { MemoryCryptoStore } from 'matrix-js-sdk';

export class NodeCryptoStore extends MemoryCryptoStore {
  constructor() {
    super();
    this.store = new Map();
  }

  async doTxn(mode, stores, func) {
    return await func(this);
  }

  getEndToEndDeviceData() {
    return this.store.get('deviceData') || null;
  }

  setEndToEndDeviceData(deviceData) {
    this.store.set('deviceData', deviceData);
  }

  getSessionBackupPrivateKey() {
    return this.store.get('backupKey') || null;
  }

  setSessionBackupPrivateKey(key) {
    this.store.set('backupKey', key);
  }
}