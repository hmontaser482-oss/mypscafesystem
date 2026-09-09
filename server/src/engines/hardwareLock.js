const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { execSync } = require('child_process');

const LICENSE_SECRET = 'ZO_TECH_PS_LOUNGE_HW_LOCK_SECURE_2026_@#!';

function getMachineMacs() {
  const ifaces = os.networkInterfaces();
  const macs = [];
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name]) {
      if (net.mac && net.mac !== '00:00:00:00:00:00' && !net.internal) {
        macs.push(net.mac.toLowerCase().trim());
      }
    }
  }
  return [...new Set(macs)];
}

function computeMacHash(mac) {
  return crypto.createHmac('sha256', LICENSE_SECRET).update(mac.toLowerCase().trim()).digest('hex');
}

function computeIdHash(id) {
  return crypto.createHmac('sha256', LICENSE_SECRET).update(String(id).toLowerCase().trim()).digest('hex');
}

function getMachineHardwareIds() {
  const ids = [];

  // 1. MAC addresses from networkInterfaces
  const macs = getMachineMacs();
  for (const m of macs) {
    ids.push(`MAC:${m}`);
  }

  // 2. Windows specific hardware identifiers
  if (process.platform === 'win32') {
    // 2a. Windows Registry Machine GUID (Unique permanent ID created when Windows is installed)
    try {
      const regOut = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const match = regOut.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9\-]+)/i);
      if (match && match[1]) {
        ids.push(`WINGUID:${match[1].toLowerCase().trim()}`);
      }
    } catch (_) {}

    // 2b. Motherboard / BIOS UUID
    try {
      const wmicOut = execSync('wmic csproduct get uuid', { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const lines = wmicOut.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/uuid/i.test(l));
      if (lines.length > 0 && lines[0] && !/^0+$/.test(lines[0].replace(/-/g, '')) && !/none/i.test(lines[0])) {
        ids.push(`BIOS:${lines[0].toLowerCase()}`);
      }
    } catch (_) {}

    // 2c. Additional MACs from getmac (even if adapter is disconnected or offline)
    try {
      const getmacOut = execSync('getmac /fo csv /nh', { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const macMatches = getmacOut.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g);
      if (macMatches) {
        for (const rawMac of macMatches) {
          const norm = rawMac.replace(/-/g, ':').toLowerCase().trim();
          if (norm !== '00:00:00:00:00:00') {
            ids.push(`MAC:${norm}`);
          }
        }
      }
    } catch (_) {}
  } else if (process.platform === 'darwin') {
    try {
      const ioregOut = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const match = ioregOut.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match && match[1]) {
        ids.push(`MACUUID:${match[1].toLowerCase().trim()}`);
      }
    } catch (_) {}
  }

  // 3. System Hostname & Computer name
  const host = (os.hostname() || process.env.COMPUTERNAME || '').toLowerCase().trim();
  if (host) {
    ids.push(`HOST:${host}`);
  }

  return [...new Set(ids)];
}

const { getLicensePath, getVaultDir } = require('../utils/vaultManager');

function signPayload(data) {
  return crypto.createHmac('sha256', LICENSE_SECRET).update(JSON.stringify(data)).digest('hex');
}

function installHardwareLicense(issuedTo = 'Authorized Customer Machine (Owner)') {
  const licenseFile = getLicensePath();
  const currentIds = getMachineHardwareIds();
  const currentMacs = getMachineMacs();

  if (currentIds.length === 0 && currentMacs.length === 0) {
    throw new Error('Unable to identify machine hardware. Ensure hardware is enabled.');
  }

  const hashes = [
    ...currentIds.map(id => computeIdHash(id)),
    ...currentMacs.map(m => computeMacHash(m))
  ];
  const uniqueHashes = [...new Set(hashes)];

  const signData = {
    hardware_hashes: uniqueHashes,
    issued_to: issuedTo,
    activated_at: new Date().toISOString()
  };
  const payload = {
    ...signData,
    signature: signPayload(signData)
  };

  const dir = path.dirname(licenseFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(licenseFile, JSON.stringify(payload, null, 2), 'utf8');
  return licenseFile;
}

const MASTER_ACTIVATION_KEY = 'zotech2026';

function verifyHardwareLock() {
  try {
    const licenseFile = getLicensePath();
    const currentIds = getMachineHardwareIds();
    const currentMacs = getMachineMacs();

    if (currentIds.length === 0 && currentMacs.length === 0) {
      console.error('[SECURITY ERROR]: Could not retrieve hardware identifiers for this device.');
      process.exit(1);
    }

    if (fs.existsSync(licenseFile)) {
      // License exists in hidden vault - Validate it strictly
      const rawContent = fs.readFileSync(licenseFile, 'utf8');
      let license;
      try {
        license = JSON.parse(rawContent);
      } catch (e) {
        console.error('================================================================================');
        console.error('[ERROR]: License file in security vault is corrupted or invalid.');
        console.error('================================================================================');
        process.exit(1);
      }

      const { hardware_hashes, issued_to, activated_at, signature } = license;
      const expectedSignature = signPayload({ hardware_hashes, issued_to, activated_at });

      if (signature !== expectedSignature) {
        console.error('================================================================================');
        console.error('[ERROR]: Digital signature verification failed for hardware license.');
        console.error('================================================================================');
        process.exit(1);
      }

      // Check if ANY of the current machine IDs matches the licensed hashes
      const isMatch = (hardware_hashes && Array.isArray(hardware_hashes)) && (
        currentIds.some(id => hardware_hashes.includes(computeIdHash(id))) ||
        currentMacs.some(m => hardware_hashes.includes(computeMacHash(m)) || hardware_hashes.includes(computeIdHash(`MAC:${m}`)))
      );

      if (!isMatch) {
        console.error('\n================================================================================');
        console.error('[SECURITY ERROR] Hardware Lock Violation!');
        console.error('Tam iktishaf mohawalat tashgheel al-nizam ala jihaz ghair morakhas laho!');
        console.error('================================================================================');
        console.error('This system is hardware-locked to the original licensed machine only.');
        console.error('To activate this new machine, please run: activate_system.bat');
        console.error('\nTechnical Support (ZO TECH):');
        console.error('WhatsApp: 01275984405 | Instagram: @zo__tech');
        console.error('================================================================================\n');
        process.exit(1);
      }

      console.log(`[License Guard] [OK] Machine Hardware Lock Verified.`);
      return true;
    } else {
      // License NOT in hidden vault

      // If in dev workspace, allow dev run
      const isDevWorkspace = fs.existsSync(path.resolve(__dirname, '../../../package.json')) && 
                             !fs.existsSync(path.resolve(__dirname, '../../../start_system.bat'));

      if (isDevWorkspace || process.env.AUTO_ACTIVATE === 'true') {
        console.log('[License Guard] [DEV] Installing dev license into local security vault...');
        installHardwareLicense('Development Workspace Machine');
        console.log('[License Guard] [DEV] Dev license installed successfully.');
        return true;
      } else {
        // In production release without vault license -> Strict manual activation required
        console.error('\n================================================================================');
        console.error('[SECURITY ERROR]: System is not activated on this machine! (Missing License)');
        console.error('[NIZAM]: Haza Al-Nizam Ghair Mofa\'al Ala Haza Al-Jihaz!');
        console.error('================================================================================');
        console.error('Haza al-nizam moqfal wa mahmy barmageyan wa la yumken tashgheeloho');
        console.error('Illa baad al-taf\'eel al-yadawy bi-miftah al-taf\'eel al-khas bi ZO TECH.');
        console.error('\nLi-taf\'eel al-nizam ala haza al-jihaz:');
        console.error('  1. Iftah al-milaf: 👉 activate_system.bat');
        console.error('  2. Odkhol miftah al-taf\'eel: zotech2026');
        console.error('\nLildaeem al-fanny wa al-istifsaar (ZO TECH):');
        console.error('WhatsApp: 01275984405 | Instagram: @zo__tech');
        console.error('================================================================================\n');
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('Security Check Fatal Error:', err.message);
    process.exit(1);
  }
}

module.exports = {
  verifyHardwareLock,
  installHardwareLicense,
  MASTER_ACTIVATION_KEY,
  getMachineMacs,
  computeMacHash,
  getMachineHardwareIds,
  computeIdHash
};
