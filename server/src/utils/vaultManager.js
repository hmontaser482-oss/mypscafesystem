const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Secure System Vault Manager
 * Isolates critical files (Hardware License and Production Database)
 * into a hidden, operating-system-level protected directory outside
 * the project and distribution folders.
 * 
 * Windows: %PROGRAMDATA%\.sys_security_vault_ps or %LOCALAPPDATA%\.sys_security_vault_ps
 * macOS:   ~/Library/Application Support/.sys_security_vault_ps
 * Linux:   ~/.local/share/.sys_security_vault_ps
 */

function testDirWritable(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
    }
    const testFile = path.join(dirPath, '.perm_test_' + Date.now());
    fs.writeFileSync(testFile, 'ok', 'utf8');
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    return false;
  }
}

function getVaultDir() {
  const home = os.homedir();
  const candidateDirs = [];

  if (process.platform === 'win32') {
    // 1. User Local AppData (C:\Users\<User>\AppData\Local - Standard user writable, hidden)
    if (process.env.LOCALAPPDATA) candidateDirs.push(path.join(process.env.LOCALAPPDATA, '.sys_security_vault_ps'));
    // 2. User Roaming AppData (C:\Users\<User>\AppData\Roaming - Standard user writable, hidden)
    if (process.env.APPDATA) candidateDirs.push(path.join(process.env.APPDATA, '.sys_security_vault_ps'));
    // 3. User Home hidden folder (C:\Users\<User>\.sys_security_vault_ps)
    candidateDirs.push(path.join(home, '.sys_security_vault_ps'));
    // 4. ProgramData (C:\ProgramData - Fallback if running elevated)
    if (process.env.PROGRAMDATA) candidateDirs.push(path.join(process.env.PROGRAMDATA, '.sys_security_vault_ps'));
  } else if (process.platform === 'darwin') {
    candidateDirs.push(path.join(home, 'Library', 'Application Support', '.sys_security_vault_ps'));
    candidateDirs.push(path.join(home, '.sys_security_vault_ps'));
  } else {
    if (process.env.XDG_DATA_HOME) candidateDirs.push(path.join(process.env.XDG_DATA_HOME, '.sys_security_vault_ps'));
    candidateDirs.push(path.join(home, '.local', 'share', '.sys_security_vault_ps'));
    candidateDirs.push(path.join(home, '.sys_security_vault_ps'));
  }

  // Fallback to current working directory hidden folder if all system folders fail
  candidateDirs.push(path.join(process.cwd(), '.sys_security_vault_ps'));

  for (const candidate of candidateDirs) {
    if (testDirWritable(candidate)) {
      return candidate;
    }
  }

  // Ultimate fallback
  const lastResort = path.join(home, '.sys_security_vault_ps');
  try { fs.mkdirSync(lastResort, { recursive: true }); } catch (_) {}
  return lastResort;
}

function getDatabasePath() {
  if (process.env.CUSTOM_DB_PATH) {
    return path.resolve(process.env.CUSTOM_DB_PATH);
  }
  return path.join(getVaultDir(), '.ps_master_vault.db');
}

function getLicensePath() {
  if (process.env.CUSTOM_LICENSE_PATH) {
    return path.resolve(process.env.CUSTOM_LICENSE_PATH);
  }
  return path.join(getVaultDir(), '.sys_device_lic.dat');
}

module.exports = {
  getVaultDir,
  getDatabasePath,
  getLicensePath
};
