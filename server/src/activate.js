const fs = require('fs');
const path = require('path');
const { installHardwareLicense, MASTER_ACTIVATION_KEY, getMachineHardwareIds } = require('./engines/hardwareLock');

function getAppRoot() {
  const candidates = [
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '..'),
    process.cwd()
  ];
  return candidates.find(c => fs.existsSync(c)) || process.cwd();
}

function writeLog(filename, content) {
  try {
    const root = getAppRoot();
    fs.writeFileSync(path.join(root, filename), content, 'utf8');
  } catch (_) {}
}

const rawArg = process.argv.slice(2).join(' ').trim();
// Normalize entered key: strip quotes, whitespace, dashes, underscores
const normalizedKey = rawArg.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/[-_\s]/g, '');

const VALID_NORMALIZED = [
  'zotech2026',
  'zotech',
  (MASTER_ACTIVATION_KEY || '').toLowerCase().replace(/[-_\s]/g, '')
];

console.log('\n================================================================================');
console.log('       ZO TECH - PS Lounge Management System Machine Activation');
console.log('================================================================================\n');

const isKeyValid = VALID_NORMALIZED.includes(normalizedKey) || 
                   rawArg.toLowerCase().trim() === 'zotech2026' ||
                   rawArg.toLowerCase().trim() === 'zo tech 2026';

if (isKeyValid) {
  try {
    console.log('[*] Reading machine hardware fingerprints...');
    const ids = getMachineHardwareIds ? getMachineHardwareIds() : [];
    console.log(`[*] Detected ${ids.length} hardware identifiers.`);

    console.log('[*] Binding and encrypting hardware license to system vault...');
    const licPath = installHardwareLicense('Authorized Machine (Manual Activation by ZO TECH)');

    const successMsg = 
`================================================================================
[SUCCESS] Machine Activated & Hardware Locked Successfully!
[NIZAM] Tam Taf'eel Al-Nizam Wa Qafloho Ala Haza Al-Jihaz Binajah!
================================================================================

- License File: ${licPath}
- Machine IDs Bound: ${ids.length}
- Time: ${new Date().toLocaleString()}

You can now start the system using:
  -> PS_Lounge_Manager.exe
  -> or start_system.bat

For Technical Support (ZO TECH):
- WhatsApp: 01275984405
- Instagram: @zo__tech
================================================================================
`;
    console.log(successMsg);

    // Save receipt file in app directory
    writeLog('ACTIVATION_SUCCESS.txt', successMsg);

    // Also remove any error log if previously existed
    try {
      const errLog = path.join(getAppRoot(), 'activation_error.log');
      if (fs.existsSync(errLog)) fs.unlinkSync(errLog);
    } catch (_) {}

    process.exit(0);
  } catch (err) {
    const errMsg = 
`================================================================================
[ERROR] License installation failed!
Reason: ${err.message}
${err.stack || ''}
================================================================================
`;
    console.error(errMsg);
    writeLog('activation_error.log', errMsg);
    process.exit(1);
  }
} else {
  const invalidMsg = 
`================================================================================
[ERROR] Invalid Activation Key!
Entered Key: "${rawArg}"
Expected Key: zotech2026

Please verify the master activation key from ZO TECH: zotech2026

Technical Support:
- WhatsApp: 01275984405
- Instagram: @zo__tech
================================================================================
`;
  console.error(invalidMsg);
  writeLog('activation_error.log', invalidMsg);
  process.exit(1);
}
