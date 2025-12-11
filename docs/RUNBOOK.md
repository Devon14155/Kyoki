
# Developer Runbook

## 🚑 Emergency Recovery

**Issue: Application stuck / White screen**
1. Clear Browser Data (Application -> Storage -> Clear Site Data).
2. **Warning**: This deletes all local blueprints. Use Export regularly.

**Issue: API Keys lost**
1. Keys are device-bound in `IndexedDB`. If you clear cache, you must re-enter keys.

**Issue: "Decryption Failed" on Export**
1. Ensure you are using the correct passphrase.
2. Exports use `PBKDF2` (100k iterations) + `AES-GCM`.

## 🐛 Debugging

**Enable Developer Mode:**
1. Go to Settings.
2. Toggle "Developer Mode".
3. Click "Open DevTools".

**Event Tracing:**
1. Open DevTools.
2. Look at the "Live Events" log.
3. Trace ID correlates all events for a single generation job.

## 📦 Backup & Restore

**Backup (Export)**
1. Settings -> Data Management -> Export.
2. Enter Passphrase.
3. Result: JSON file containing all Projects + Blueprints + Context (Encrypted).

**Restore (Import)**
1. Settings -> Data Management -> Import.
2. Select file.
3. Enter Passphrase.
4. App will reload with restored data.
