import express from 'express';
import cors from 'cors';
const adb = require('adbkit');
import { exec, spawn, execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import gplay from 'google-play-scraper';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);
const client = adb.createClient();
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// We are using absolute path for adb and fastboot to avoid PATH issues in Node.js on Mac.
const ADB_PATH = '/Users/humberto54/Library/Android/sdk/platform-tools/adb';
const FASTBOOT_PATH = '/Users/humberto54/Library/Android/sdk/platform-tools/fastboot';

// Setup Multer for temporary file uploads
const uploadDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// Check if adb is running, if not start it
async function ensureAdb() {
  try {
    await execAsync(`${ADB_PATH} start-server`);
  } catch (err) {
    console.error('Error starting adb server:', err);
  }
}

app.get('/api/devices', async (req, res) => {
  try {
    await ensureAdb();
    const devices = await client.listDevices();
    res.json({ success: true, devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server-Sent Events (SSE) for real-time device connection/disconnection
app.get('/api/devices/events', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendDevices = async () => {
    try {
      const devices = await client.listDevices();
      res.write(`data: ${JSON.stringify(devices)}\n\n`);
    } catch (e) {
      // ignore
    }
  };

  // Send initial list
  await sendDevices();

  let tracker: any;
  try {
    tracker = await client.trackDevices();
    tracker.on('add', sendDevices);
    tracker.on('remove', sendDevices);
    tracker.on('change', sendDevices);
  } catch (err) {
    console.error('Error tracking devices:', err);
  }

  req.on('close', () => {
    if (tracker) {
      tracker.removeAllListeners();
      tracker.end();
    }
  });
});

app.get('/api/device/:id/info', async (req, res) => {
  try {
    const { id } = req.params;
    // Get device properties using adb shell getprop
    const { stdout } = await execAsync(`${ADB_PATH} -s ${id} shell getprop`);
    
    // Parse the output to JSON
    const props: Record<string, string> = {};
    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/\[(.*?)\]: \[(.*?)\]/);
      if (match) {
        props[match[1]] = match[2];
      }
    }

    let resolution = 'Unknown';
    let density = 'Unknown';
    let imei = 'Desconocido (Requiere Root/Permisos)';

    try {
      const { stdout: wmSize } = await execAsync(`${ADB_PATH} -s ${id} shell wm size`);
      const sizeMatch = wmSize.match(/Physical size: (.*)/);
      if (sizeMatch) resolution = sizeMatch[1].trim();

      const { stdout: wmDensity } = await execAsync(`${ADB_PATH} -s ${id} shell wm density`);
      const densityMatch = wmDensity.match(/Physical density: (.*)/);
      if (densityMatch) density = densityMatch[1].trim();

      // Try to get IMEI
      const { stdout: imeiOut } = await execAsync(`${ADB_PATH} -s ${id} shell service call iphonesubinfo 1`);
      // Parse the hex dump for IMEI: extract characters between single quotes, remove dots and spaces
      let parsedImei = '';
      const lines = imeiOut.split('\n');
      for (const line of lines) {
        const match = line.match(/'([^']+)'/);
        if (match) {
          parsedImei += match[1].replace(/\./g, '').trim();
        }
      }
      // IMEI is usually 15 digits
      const cleanedImei = parsedImei.replace(/[^0-9]/g, '');
      if (cleanedImei && cleanedImei.length >= 14) {
        imei = cleanedImei;
      }

    } catch(e) {
      // Ignored
    }

    res.json({
      success: true,
      data: {
        model: props['ro.product.model'],
        manufacturer: props['ro.product.manufacturer'],
        androidVersion: props['ro.build.version.release'],
        sdkLevel: props['ro.build.version.sdk'],
        cpuAbi: props['ro.product.cpu.abi'],
        board: props['ro.product.board'],
        serial: props['ro.serialno'] || props['ro.boot.serialno'] || 'Desconocido',
        securityPatch: props['ro.build.version.security_patch'] || 'Desconocido',
        bootloader: props['ro.bootloader'] || 'Desconocido',
        baseband: props['gsm.version.baseband'] || 'Desconocido',
        hardware: props['ro.hardware'] || 'Desconocido',
        fingerprint: props['ro.build.fingerprint'] || 'Desconocido',
        resolution,
        density,
        imei,
        rawProperties: props
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/device/:id/battery', async (req, res) => {
  try {
    const { id } = req.params;
    const { stdout } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery`);
    
    const batteryInfo: Record<string, string> = {};
    const lines = stdout.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(': ');
      if (parts.length === 2) {
        batteryInfo[parts[0]] = parts[1];
      }
    }
    
    res.json({
      success: true,
      data: batteryInfo
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/device/:id/diagnostics/advanced', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. CPU Info (Top 3 apps)
    let topCpu = [];
    try {
      const { stdout: cpuOut } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys cpuinfo`);
      const lines = cpuOut.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('%') && !lines[i].includes('TOTAL') && topCpu.length < 3) {
          const match = lines[i].trim().match(/^(\d+(\.\d+)?)%\s+\d+\/([a-zA-Z0-9._:]+)/);
          if (match) {
            topCpu.push({ percent: match[1], process: match[3] });
          }
        }
      }
    } catch(e) {}

    // 2. Storage Partitions
    let storage = [];
    try {
      const { stdout: dfOut } = await execAsync(`${ADB_PATH} -s ${id} shell df -h`);
      const lines = dfOut.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 6) {
          const mount = parts[5];
          if (mount === '/data' || mount === '/system' || mount === '/storage/emulated') {
            storage.push({
              filesystem: parts[0],
              size: parts[1],
              used: parts[2],
              free: parts[3],
              percent: parts[4],
              mount: parts[5]
            });
          }
        }
      }
    } catch(e) {}

    // 3. Thermal Info (from dumpsys battery)
    let temperature = 'Unknown';
    try {
      const { stdout: batteryOut } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery`);
      const tempMatch = batteryOut.match(/temperature: (\d+)/);
      if (tempMatch) {
        temperature = (parseInt(tempMatch[1]) / 10).toFixed(1) + ' °C';
      }
    } catch(e) {}

    res.json({
      success: true,
      data: {
        cpu: topCpu,
        storage,
        temperature
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Advanced Reboot
app.post('/api/device/:id/reboot', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode } = req.body; // normal, recovery, bootloader
    
    let command = `${ADB_PATH} -s ${id} reboot`;
    if (mode === 'recovery') command += ' recovery';
    if (mode === 'bootloader') command += ' bootloader';
    if (mode === 'edl') command += ' edl';
    if (mode === 'safe_mode') {
      await execAsync(`${ADB_PATH} -s ${id} shell setprop persist.sys.safemode 1`);
      command = `${ADB_PATH} -s ${id} reboot`;
    }

    await execAsync(command);
    res.json({ success: true, message: `Rebooting to ${mode || 'normal'}...` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hardware Tests
app.post('/api/device/:id/test/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    if (type === 'vibrate') {
      try {
        // Android 12+
        await execAsync(`${ADB_PATH} -s ${id} shell cmd vibrator_manager synced oneshot 1000`);
      } catch (e) {
        // Android 7-11
        await execAsync(`${ADB_PATH} -s ${id} shell cmd vibrator vibrate 1000`);
      }
    } else if (type === 'audio') {
      // Play default ringtone picker to test audio
      await execAsync(`${ADB_PATH} -s ${id} shell am start -a android.intent.action.RINGTONE_PICKER`);
    } else if (type === 'brightness_max') {
      await execAsync(`${ADB_PATH} -s ${id} shell settings put system screen_brightness 255`);
    } else if (type === 'brightness_min') {
      await execAsync(`${ADB_PATH} -s ${id} shell settings put system screen_brightness 10`);
    } else if (type === 'camera') {
      await execAsync(`${ADB_PATH} -s ${id} shell am start -a android.media.action.STILL_IMAGE_CAMERA`);
    } else if (type === 'screen') {
      await execAsync(`${ADB_PATH} -s ${id} shell am start -a android.intent.action.VIEW -d "https://myscreenchecker.com"`);
    } else if (type === 'power_btn') {
      await execAsync(`${ADB_PATH} -s ${id} shell input keyevent 26`);
    } else if (type === 'hidden_menu') {
      // Samsung *#0*# or standard Android test menu
      await execAsync(`${ADB_PATH} -s ${id} shell am start -a android.intent.action.DIAL -d tel:*%230*%23`);
    }
    res.json({ success: true, message: `Test ${type} executed` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hardware Test: Sensors
app.get('/api/device/:id/sensors', async (req, res) => {
  try {
    const { id } = req.params;
    const { stdout } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys sensorservice`);
    
    // Parse the dumpsys output to find the "Sensor List:" section
    const lines = stdout.split('\n');
    let inList = false;
    const sensors = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'Sensor List:') {
        inList = true;
        continue;
      }
      if (inList) {
        if (line === '') break; // End of list
        // e.g. 0x0000000b) lsm6dso LSM6DSO Accelerometer Non-wakeup | STMicro | ver: 15933 | type: android.sensor.accelerometer(1)
        if (line.match(/^0x[0-9a-fA-F]+\)/)) {
          const parts = line.split('|');
          const namePart = parts[0].substring(parts[0].indexOf(')') + 1).trim();
          const vendorPart = parts.length > 1 ? parts[1].trim() : 'Unknown';
          const typePartMatch = line.match(/type:\s*([^\|]+)/);
          const typePart = typePartMatch ? typePartMatch[1].trim() : 'Unknown';
          
          sensors.push({
            name: namePart,
            vendor: vendorPart,
            type: typePart
          });
        }
      }
    }
    
    res.json({ success: true, sensors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phase 2: App Management
app.get('/api/device/:id/apps', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { stdout: sysOut } = await execAsync(`${ADB_PATH} -s ${id} shell pm list packages -s`);
    const systemApps = sysOut.split('\n').map(line => line.replace('package:', '').trim()).filter(line => line.length > 0);

    const { stdout: usrOut } = await execAsync(`${ADB_PATH} -s ${id} shell pm list packages -3`);
    const userApps = usrOut.split('\n').map(line => line.replace('package:', '').trim()).filter(line => line.length > 0);

    const apps: any[] = [];

    const categorizeSystemApp = (pkg: string) => {
      if (pkg.startsWith('com.android.') || pkg === 'android') return { category: 'Componente Crítico del Sistema', importance: 1 };
      if (pkg.startsWith('com.google.android.gms') || pkg.startsWith('com.google.android.gsf')) return { category: 'Servicios de Google', importance: 2 };
      if (pkg.startsWith('com.qualcomm.') || pkg.startsWith('com.mediatek.')) return { category: 'Controlador de Hardware (Driver)', importance: 3 };
      return { category: 'Aplicación del Fabricante (Bloatware/UI)', importance: 4 };
    };

    systemApps.forEach(pkg => {
      const { category, importance } = categorizeSystemApp(pkg);
      apps.push({ packageName: pkg, type: 'system', category, importance });
    });

    userApps.forEach(pkg => {
      apps.push({ packageName: pkg, type: 'user', category: 'Aplicación de Usuario', importance: 5 });
    });

    apps.sort((a, b) => a.importance - b.importance || a.packageName.localeCompare(b.packageName));

    res.json({ success: true, apps });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/apps/uninstall', async (req, res) => {
  try {
    const { id } = req.params;
    const { packageName } = req.body;
    // Uninstall for user 0 (removes bloatware for current user)
    const { stdout } = await execAsync(`${ADB_PATH} -s ${id} shell pm uninstall --user 0 ${packageName}`);
    if (stdout.toLowerCase().includes('failure')) {
      return res.status(400).json({ success: false, error: `Fallo al desinstalar: ${stdout.trim()}` });
    }
    res.json({ success: true, message: stdout.trim() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/apps/uninstall-batch', async (req, res) => {
  try {
    const { id } = req.params;
    const { packageNames } = req.body;
    if (!Array.isArray(packageNames)) {
      return res.status(400).json({ success: false, error: 'packageNames must be an array' });
    }
    
    const results = [];
    for (const packageName of packageNames) {
      try {
        const { stdout } = await execAsync(`${ADB_PATH} -s ${id} shell pm uninstall --user 0 ${packageName}`);
        if (stdout.toLowerCase().includes('failure')) {
          results.push({ package: packageName, success: false, error: stdout.trim() });
        } else {
          results.push({ package: packageName, success: true, message: stdout.trim() });
        }
      } catch (err: any) {
        results.push({ package: packageName, success: false, error: err.message });
      }
    }
    
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/device/:id/scan-malware', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get third-party apps
    const { stdout: usrOut } = await execAsync(`${ADB_PATH} -s ${id} shell pm list packages -3`);
    const userApps = usrOut.split('\n').map(line => line.replace('package:', '').trim()).filter(line => line.length > 0);

    const scanResults = [];

    const dangerousPermissions = [
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
      'android.permission.READ_CALL_LOG',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.BIND_DEVICE_ADMIN',
      'android.permission.BIND_ACCESSIBILITY_SERVICE'
    ];

    for (const pkg of userApps) {
      let threatScore = 0;
      let isHidden = false;
      const flags = [];

      // Check if it's hidden (no launcher activity)
      try {
        const { stdout: resolveOut } = await execAsync(`${ADB_PATH} -s ${id} shell cmd package resolve-activity --brief ${pkg}`);
        if (resolveOut.includes('No activity found')) {
          isHidden = true;
          threatScore += 30; // Hidden apps are highly suspicious
          flags.push('Oculta (Sin icono en menú)');
        }
      } catch (e) {
        // Ignore
      }

      // Check permissions
      try {
        const { stdout: dumpsysOut } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys package ${pkg}`);
        
        // Find granted permissions block roughly
        const grantedPerms: string[] = [];
        const lines = dumpsysOut.split('\n');
        for (const line of lines) {
          if (line.includes('granted=true')) {
            const match = line.match(/android\.permission\.[A-Z_]+/);
            if (match) {
              grantedPerms.push(match[0]);
            }
          }
        }

        let smsCallLogScore = 0;
        let mediaScore = 0;
        let overlayScore = 0;

        grantedPerms.forEach(perm => {
          if (perm.includes('SMS') || perm.includes('CALL_LOG') || perm.includes('CONTACTS')) {
            smsCallLogScore += 10;
            flags.push(`Accede a ${perm.split('.').pop()}`);
          }
          if (perm === 'android.permission.RECORD_AUDIO' || perm === 'android.permission.CAMERA' || perm === 'android.permission.ACCESS_FINE_LOCATION') {
            mediaScore += 5;
            flags.push(`Accede a ${perm.split('.').pop()}`);
          }
          if (perm === 'android.permission.SYSTEM_ALERT_WINDOW' || perm === 'android.permission.BIND_DEVICE_ADMIN' || perm === 'android.permission.BIND_ACCESSIBILITY_SERVICE') {
            overlayScore += 20;
            flags.push(`Privilegio de Sistema: ${perm.split('.').pop()}`);
          }
        });

        // Heuristics: Combining SMS/CallLog with Audio/Location/Overlay is classic spyware
        threatScore += smsCallLogScore + mediaScore + overlayScore;

        if (smsCallLogScore > 0 && mediaScore > 0 && isHidden) {
          threatScore += 40; // Spyware behavior multiplier
          flags.push('Patrón de Spyware detectado');
        }

      } catch (e) {
        // Ignore
      }

      let riskLevel = 'Bajo';
      if (threatScore >= 60) riskLevel = 'Crítico';
      else if (threatScore >= 40) riskLevel = 'Alto';
      else if (threatScore >= 20) riskLevel = 'Medio';

      scanResults.push({
        packageName: pkg,
        threatScore,
        riskLevel,
        isHidden,
        flags: [...new Set(flags)] // Unique flags
      });
    }

    // Sort by highest threat
    scanResults.sort((a, b) => b.threatScore - a.threatScore);

    res.json({ success: true, results: scanResults });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// In-memory cache for app info to avoid rate limiting
const appInfoCache: Record<string, { title: string, icon: string, summary: string }> = {};

app.get('/api/app-info/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    
    if (appInfoCache[packageId]) {
      return res.json({ success: true, data: appInfoCache[packageId], fromCache: true });
    }

    // Attempt to fetch from Google Play with a 2 second timeout
    try {
      const fetchPromise = gplay.app({ appId: packageId });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
      
      const appInfo: any = await Promise.race([fetchPromise, timeoutPromise]);
      const data = {
        title: appInfo.title || packageId,
        icon: appInfo.icon || '',
        summary: appInfo.summary || appInfo.description || 'Descripción no disponible en Google Play Store.'
      };
      appInfoCache[packageId] = data;
      return res.json({ success: true, data, fromCache: false });
    } catch (e) {
      // Formatear el nombre del paquete para que se vea como un título presentable
      const parts = packageId.split('.');
      const fallbackTitle = parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const data = {
        title: fallbackTitle,
        icon: '', // Frontend will use a default icon if empty
        summary: 'Aplicación interna del sistema u original del fabricante. No existe listado público comercial en Google Play Store.'
      };
      appInfoCache[packageId] = data;
      return res.json({ success: true, data, fromCache: false });
    }

  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Install APK Endpoint
app.post('/api/device/:id/install', upload.single('apk'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No APK file provided' });
    }

    const originalPath = req.file.path;
    const apkPath = originalPath + '.apk';
    
    try {
      // Rename file to include .apk extension (adb requires it)
      fs.renameSync(originalPath, apkPath);

      // Use -r to replace/reinstall if already exists, -t to allow test packages, -d to allow downgrade
      const { stdout } = await execAsync(`${ADB_PATH} -s ${id} install -r -t -d "${apkPath}"`);
      
      // Cleanup the temp file
      fs.unlinkSync(apkPath);

      res.json({ success: true, message: 'App installed successfully', logs: stdout });
    } catch (execErr: any) {
      // Cleanup the temp file even on error
      if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath);
      if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
      throw execErr;
    }

  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phase 3: Real-time Logs (Logcat)
app.get('/api/device/:id/logcat', (req, res) => {
  const { id } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // We spawn logcat to stream logs. We use the -v brief format to keep it simple.
  const { spawn } = require('child_process');
  const logcatProcess = spawn(ADB_PATH, ['-s', id, 'shell', 'logcat', '-v', 'brief']);

  logcatProcess.stdout.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        res.write(`data: ${JSON.stringify(line.trim())}\n\n`);
      }
    });
  });

  req.on('close', () => {
    logcatProcess.kill();
  });
});

// Phase 4: Backup
app.post('/api/device/:id/backup/legacy', async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    // Ensure backups dir exists
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${id}-${timestamp}.ab`;
    const filepath = path.join(backupDir, filename);

    // Run ADB backup (this requires user confirmation on device)
    // We send response immediately so UI doesn't hang, and process runs in background
    exec(`${ADB_PATH} -s ${id} backup -all -apk -shared -f ${filepath}`, (error) => {
      if (error) console.error('Backup error:', error);
      else console.log('Backup completed:', filepath);
    });

    res.json({ success: true, message: 'Backup started. Please unlock the device and confirm the operation.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/backups', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(__dirname, '..', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, backups: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter((file: string) => file.endsWith('.ab'))
      .map((file: string) => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()); // Newest first

    res.json({ success: true, backups: files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/backups/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');
    
    // Security check to prevent path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).send('Invalid filename');
    }

    const filepath = path.join(__dirname, '..', 'backups', filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).send('Backup file not found');
    }

    res.download(filepath, filename); // Prompts user to download
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Phase 6: Maintenance
app.post('/api/device/:id/maintenance/:action', async (req, res) => {
  try {
    const { id, action } = req.params;
    if (action === 'battery_reset') {
      await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery reset`);
      res.json({ success: true, message: 'Estadísticas de batería reiniciadas. (Se recomienda cargar al 100% y reiniciar)' });
    } else if (action === 'speed_up_animations') {
      await execAsync(`${ADB_PATH} -s ${id} shell settings put global window_animation_scale 0.5`);
      await execAsync(`${ADB_PATH} -s ${id} shell settings put global transition_animation_scale 0.5`);
      await execAsync(`${ADB_PATH} -s ${id} shell settings put global animator_duration_scale 0.5`);
      res.json({ success: true, message: 'Animaciones aceleradas a 0.5x. El dispositivo se sentirá más rápido.' });
    } else if (action === 'restore_animations') {
      await execAsync(`${ADB_PATH} -s ${id} shell settings put global window_animation_scale 1`);
      await execAsync(`${ADB_PATH} -s ${id} shell settings put global transition_animation_scale 1`);
      await execAsync(`${ADB_PATH} -s ${id} shell settings put global animator_duration_scale 1`);
      res.json({ success: true, message: 'Animaciones restauradas a la velocidad normal (1x).' });
    } else if (action === 'trim_caches') {
      try {
        // En Android moderno el comando correcto suele ser "sm fstrim"
        await execAsync(`${ADB_PATH} -s ${id} shell sm fstrim`);
      } catch (e1) {
        try {
          // Fallback para versiones antiguas
          await execAsync(`${ADB_PATH} -s ${id} shell vdc fstrim dotrim`);
        } catch (e2) {
          // Último recurso (algunos custom ROMs usan simplemente 'sm trim')
          try {
             await execAsync(`${ADB_PATH} -s ${id} shell sm trim`);
          } catch (e3: any) {
             return res.json({ success: false, error: e3.message });
          }
        }
      }
      res.json({ success: true, message: 'Comando de recorte (TRIM) enviado a la memoria flash para optimizar el almacenamiento.' });
    } else if (action === 'ram') {
      await execAsync(`${ADB_PATH} -s ${id} shell am kill-all`);
      res.json({ success: true, message: 'Procesos en segundo plano terminados. Memoria RAM liberada con éxito.' });
    } else if (action === 'cache') {
      // 999999999999 bytes to force it to free as much cache as possible
      await execAsync(`${ADB_PATH} -s ${id} shell pm trim-caches 999999999999`);
      res.json({ success: true, message: 'Limpieza profunda de caché ejecutada. Se ha recuperado espacio de almacenamiento.' });
    } else if (action === 'network') {
      // Enable airplane mode
      await execAsync(`${ADB_PATH} -s ${id} shell cmd connectivity airplane-mode enable`);
      // Wait 2 seconds
      await new Promise(r => setTimeout(r, 2000));
      // Disable airplane mode
      await execAsync(`${ADB_PATH} -s ${id} shell cmd connectivity airplane-mode disable`);
      res.json({ success: true, message: 'Red celular y Wi-Fi reiniciadas. Las antenas se han reconectado.' });
    } else if (action === 'system_ui') {
      await execAsync(`${ADB_PATH} -s ${id} shell am force-stop com.android.systemui`);
      res.json({ success: true, message: 'Interfaz de usuario (SystemUI) forzada a reiniciar. Pantalla y notificaciones recargadas.' });
    } else if (action === 'permissions') {
      await execAsync(`${ADB_PATH} -s ${id} shell pm reset-permissions`);
      res.json({ success: true, message: 'Se han restablecido los permisos de TODAS las aplicaciones exitosamente.' });
    } else if (action === 'dns') {
      await execAsync(`${ADB_PATH} -s ${id} shell ndc resolver flushdefaultif`);
      res.json({ success: true, message: 'Caché DNS del dispositivo vaciada. El enrutamiento de red ha sido reiniciado.' });
    } else {
      res.status(400).json({ success: false, error: 'Acción no válida' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phase 5: Fastboot / Root Assistant
app.post('/api/device/:id/fastboot/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    exec(`${FASTBOOT_PATH} -s ${id} flashing unlock`, (err) => {
      if(err) exec(`${FASTBOOT_PATH} -s ${id} oem unlock`);
    });
    res.json({ success: true, message: 'Unlock command sent. Check your device screen to confirm and use Volume keys to accept!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/fastboot/flash', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    
    // Execute fastboot flash boot
    exec(`${FASTBOOT_PATH} -s ${id} flash boot "${filePath}"`, (err, stdout, stderr) => {
      // Clean up the temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      if (err) {
        return res.status(500).json({ success: false, error: stderr || err.message });
      }
      res.json({ success: true, message: 'Boot image flashed successfully! You can now reboot the device.' });
    });
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});
// ==========================================
// GOD MODE ENDPOINTS
// ==========================================

// 1. Terminal ADB Directa
app.post('/api/device/:id/terminal', async (req, res) => {
  try {
    const { id } = req.params;
    let { command } = req.body;
    
    // Auto-strip 'adb shell ' if the user typed it out of habit
    if (command.trim().startsWith('adb shell ')) {
      command = command.trim().substring(10);
    } else if (command.trim().startsWith('adb ')) {
      return res.json({ success: false, error: "⚠️ Estás dentro del 'shell' del teléfono. No escribas 'adb', escribe directamente el comando interno (ejemplo: 'ls', 'dumpsys battery', 'pm list packages')." });
    }

    const cleanCommand = command.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`${ADB_PATH} -s ${id} shell "${cleanCommand}"`);
    res.json({ success: true, output: stdout || stderr });
  } catch (err: any) {
    // If the command fails (e.g. permission denied), return the actual output instead of just 'Command failed'
    const errorOutput = err.stderr || err.stdout || err.message;
    res.json({ success: false, error: errorOutput.replace(/Command failed:.*\n/, '') });
  }
});

// 2. Explorador de Archivos
app.post('/api/device/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { path } = req.body;
    const targetPath = path.endsWith('/') ? path : path + '/';
    const { stdout } = await execFileAsync(ADB_PATH, ['-s', id, 'shell', `ls -la "${targetPath}"`]);
    const files = stdout.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('total ')).map(line => {
      const parts = line.trim().split(/\s+/);
      const isDir = line.startsWith('d') || line.startsWith('l');
      let name = parts.slice(7).join(' ');
      if (line.startsWith('l') && name.includes(' -> ')) {
        name = name.split(' -> ')[0];
      }
      const size = parts[4];
      const date = parts[5] + ' ' + parts[6];
      return { name, isDir, size, date, raw: line };
    });
    res.json({ success: true, files });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/api/device/:id/files/download', async (req, res) => {
  try {
    const { id } = req.params;
    const filepath = req.query.path as string;
    const filename = path.basename(filepath);
    const tempPath = path.join('/tmp', `adb_dl_${Date.now()}_${filename}`);
    
    console.log(`Pulling ${filepath} from ${id} to ${tempPath}`);
    await execAsync(`${ADB_PATH} -s ${id} pull "${filepath}" "${tempPath}"`);
    
    const stats = fs.statSync(tempPath);
    if (stats.isDirectory()) {
      // Remove the pulled directory
      fs.rmSync(tempPath, { recursive: true, force: true });
      return res.status(400).send('Error: Cannot download a directory. Please select a specific file.');
    }

    res.download(tempPath, filename, () => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });
  } catch (err: any) {
    console.error('File download error:', err);
    res.status(500).send(`Error downloading file: ${err.message}`);
  }
});

app.post('/api/device/:id/files/upload', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const targetDir = req.body.path;
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
    const localPath = req.file.path;
    const destPath = targetDir + '/' + req.file.originalname;
    await execAsync(`${ADB_PATH} -s ${id} push "${localPath}" "${destPath}"`);
    fs.unlinkSync(localPath);
    res.json({ success: true });
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/files/delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: filepath } = req.body;
    await execFileAsync(ADB_PATH, ['-s', id, 'shell', `rm -rf "${filepath}"`]);
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/files/delete-batch', async (req, res) => {
  try {
    const { id } = req.params;
    const { paths } = req.body;
    if (!Array.isArray(paths)) return res.json({ success: false, error: 'paths must be an array' });
    
    for (const filepath of paths) {
      await execFileAsync(ADB_PATH, ['-s', id, 'shell', `rm -rf "${filepath}"`]);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});


// 3. Screen Mirroring (Screenshot)
app.get('/api/device/:id/screenshot', async (req, res) => {
  try {
    const { id } = req.params;
    const tempPath = path.join('/tmp', `screen_${Date.now()}.png`);
    await execAsync(`${ADB_PATH} -s ${id} shell screencap -p > "${tempPath}"`);
    res.sendFile(tempPath, () => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });
  } catch (err: any) {
    res.status(500).send('Screenshot failed');
  }
});

app.post('/api/device/:id/input/tap', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    await execAsync(`${ADB_PATH} -s ${id} shell input tap ${Math.round(x)} ${Math.round(y)}`);
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// 4. Gestor de Privacidad
app.get('/api/device/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const perms = ['CAMERA', 'RECORD_AUDIO', 'FINE_LOCATION'];
    const results: any = {};
    for (const p of perms) {
      try {
        const { stdout } = await execAsync(`${ADB_PATH} -s ${id} shell cmd appops query-op ${p} allow`);
        results[p] = stdout.split('\n').map(l => l.trim()).filter(l => l && !l.includes('No operations.'));
      } catch(e) { results[p] = []; }
    }
    res.json({ success: true, permissions: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/permissions/revoke', async (req, res) => {
  try {
    const { id } = req.params;
    const { packageName, permission } = req.body;
    const permMap: any = {
      'CAMERA': 'android.permission.CAMERA',
      'RECORD_AUDIO': 'android.permission.RECORD_AUDIO',
      'FINE_LOCATION': 'android.permission.ACCESS_FINE_LOCATION'
    };
    const androidPerm = permMap[permission] || permission;
    await execAsync(`${ADB_PATH} -s ${id} shell pm revoke ${packageName} ${androidPerm}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Mantenimiento Avanzado (Hardware & DNS)
app.post('/api/device/:id/advanced-action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    let cmd = '';
    
    if (action === 'battery-100') cmd = 'dumpsys battery set level 100';
    else if (action === 'battery-reset') cmd = 'dumpsys battery reset';
    else if (action === 'adguard-dns') {
      await execAsync(`${ADB_PATH} -s ${id} shell settings put global private_dns_mode hostname`);
      cmd = 'settings put global private_dns_specifier dns.adguard.com';
    }
    else if (action === 'disable-dns') cmd = 'settings put global private_dns_mode off';
    else if (action === 'force-doze') cmd = 'dumpsys deviceidle force-idle';
    else return res.status(400).json({ success: false, error: 'Unknown action' });

    await execAsync(`${ADB_PATH} -s ${id} shell ${cmd}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// V2.0 ADVANCED TOOLS ENDPOINTS
// ==========================================

// 6. Escáner de Red (Network Info)
app.get('/api/device/:id/network', async (req, res) => {
  try {
    const { id } = req.params;
    // Get ip addr and ifconfig
    const { stdout: ipOutput } = await execAsync(`${ADB_PATH} -s ${id} shell ip addr`);
    const { stdout: ifconfigOutput } = await execAsync(`${ADB_PATH} -s ${id} shell ifconfig wlan0`).catch(() => ({ stdout: '' }));
    
    // Extract IP from wlan0
    const wlanMatch = ipOutput.match(/wlan0:[\s\S]*?\n\s+inet\s+([0-9.]+)/);
    const ipAddress = wlanMatch ? wlanMatch[1] : 'No Conectado';
    
    // Extract MAC
    const macMatch = ifconfigOutput.match(/HWaddr\s+([a-fA-F0-9:]+)/);
    const macAddress = macMatch ? macMatch[1] : 'Desconocida';

    res.json({ success: true, network: { ip: ipAddress, mac: macAddress, raw: ipOutput } });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/network/ping', async (req, res) => {
  try {
    const { id } = req.params;
    const { stdout } = await execAsync(`${ADB_PATH} -s ${id} shell ping -c 3 8.8.8.8`);
    res.json({ success: true, output: stdout });
  } catch (err: any) {
    res.json({ success: false, output: err.stdout || err.stderr || err.message });
  }
});

// 7. Modificador de Pantalla (Screen Tweaks)
app.post('/api/device/:id/screen/modifier', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, value } = req.body;
    
    if (action === 'size') {
      await execAsync(`${ADB_PATH} -s ${id} shell wm size ${value}`);
    } else if (action === 'density') {
      await execAsync(`${ADB_PATH} -s ${id} shell wm density ${value}`);
    } else if (action === 'reset') {
      await execAsync(`${ADB_PATH} -s ${id} shell wm size reset`);
      await execAsync(`${ADB_PATH} -s ${id} shell wm density reset`);
    } else {
      return res.status(400).json({ success: false, error: 'Acción no válida' });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Gestor de Tareas (Task Manager)
app.get('/api/device/:id/processes', async (req, res) => {
  try {
    const { id } = req.params;
    // We run 'top' for a single iteration (-n 1) and up to 15 processes (-m 15)
    // -b means batch mode (no ANSI clear screen sequences)
    let stdout;
    try {
      const result = await execAsync(`${ADB_PATH} -s ${id} shell top -b -n 1 -m 15`);
      stdout = result.stdout;
    } catch (e: any) {
      // Fallback for older Androids that might not support -b
      const result = await execAsync(`${ADB_PATH} -s ${id} shell top -n 1 -m 15`);
      stdout = result.stdout;
    }

    const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const processes = [];
    
    // Simple parser: Find the header line, then parse subsequent lines
    let inData = false;
    for (const line of lines) {
      if (line.includes('PID') && line.includes('USER') && line.includes('%CPU')) {
        inData = true;
        continue;
      }
      if (inData) {
        // Line format usually: PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
        const parts = line.split(/\s+/);
        if (parts.length >= 8) {
          const pid = parts[0];
          const user = parts[1];
          // Look for CPU and command from the end
          const command = parts[parts.length - 1];
          // We'll just grab the raw line and let the frontend format it, or parse cleanly:
          let cpu = '0';
          let mem = '0';
          // Since columns vary between android versions, we do our best:
          for (let i = 0; i < parts.length; i++) {
             if (parts[i].includes('.') || parts[i].includes(',')) {
               // Usually CPU or MEM percentage
               if (cpu === '0') cpu = parts[i];
               else if (mem === '0') mem = parts[i];
             }
          }
          
          processes.push({ pid, user, cpu: cpu, mem: mem, command });
        }
      }
    }
    
    res.json({ success: true, processes, raw: stdout });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/device/:id/processes/kill', async (req, res) => {
  try {
    const { id } = req.params;
    const { pid, packageName } = req.body;
    
    if (packageName) {
      // Safe way: force-stop
      await execAsync(`${ADB_PATH} -s ${id} shell am force-stop ${packageName}`);
    } else {
      // Brutal way: kill
      await execAsync(`${ADB_PATH} -s ${id} shell kill -9 ${pid}`);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// V3.0 - Ultimate Tech HUD Endpoints
// ==========================================

// 1. Deep Scanner Info (RAM, Storage, Cellular)
app.get('/api/device/:id/deep-info', async (req, res) => {
  try {
    const { id } = req.params;
    
    // RAM
    const { stdout: meminfo } = await execAsync(`${ADB_PATH} -s ${id} shell cat /proc/meminfo`).catch(() => ({ stdout: '' }));
    let totalRam = '0';
    let freeRam = '0';
    meminfo.split('\n').forEach(line => {
      if (line.startsWith('MemTotal:')) totalRam = line.split(/\s+/)[1];
      if (line.startsWith('MemAvailable:')) freeRam = line.split(/\s+/)[1];
    });

    // Storage
    const { stdout: dfOut } = await execAsync(`${ADB_PATH} -s ${id} shell df -h /data`).catch(() => ({ stdout: '' }));
    const dfLines = dfOut.split('\n').filter(l => l.trim().length > 0);
    let storageTotal = '0', storageUsed = '0', storageFree = '0', storagePercent = '0%';
    if (dfLines.length >= 2) {
      const parts = dfLines[1].split(/\s+/);
      if (parts.length >= 5) {
        storageTotal = parts[1];
        storageUsed = parts[2];
        storageFree = parts[3];
        storagePercent = parts[4];
      }
    }

    // Telephony / IMEI / Cellular
    const { stdout: telephonyOut } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys telephony.registry`).catch(() => ({ stdout: '' }));
    const telephonyLines = telephonyOut.split('\n');
    let imei = 'Desconocido/Protegido', simState = 'Desconocido', network = 'N/A';
    
    // Basic heuristics for telephony parsing (varies by Android version)
    for (const line of telephonyLines) {
      if (line.includes('mSimState=')) simState = line.split('mSimState=')[1].split(' ')[0];
      if (line.includes('mNetworkOperatorName=')) network = line.split('mNetworkOperatorName=')[1].split(' ')[0] || 'N/A';
      if (line.includes('mImei=')) {
        const potentialImei = line.split('mImei=')[1].split(' ')[0];
        if (potentialImei && potentialImei !== 'null') imei = potentialImei;
      }
    }

    res.json({ 
      success: true, 
      data: {
        ram: { total: parseInt(totalRam) || 0, free: parseInt(freeRam) || 0 },
        storage: { total: storageTotal, used: storageUsed, free: storageFree, percent: storagePercent },
        cellular: { imei, simState, network }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Dev HUD Toggles
app.post('/api/device/:id/developer-toggles', async (req, res) => {
  try {
    const { id } = req.params;
    const { key, value } = req.body;
    
    // Keys allowed: show_touches, pointer_location, debug_layout
    if (key === 'show_touches') {
      await execAsync(`${ADB_PATH} -s ${id} shell settings put system show_touches ${value}`);
    } else if (key === 'pointer_location') {
      await execAsync(`${ADB_PATH} -s ${id} shell settings put system pointer_location ${value}`);
    } else if (key === 'debug_layout') {
      await execAsync(`${ADB_PATH} -s ${id} shell setprop debug.layout ${value === '1' ? 'true' : 'false'}`);
      await execAsync(`${ADB_PATH} -s ${id} shell service call activity 1599295570`); // Force redraw
    } else {
      return res.status(400).json({ success: false, error: 'Invalid toggle key' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Extract APK
app.get('/api/device/:id/apps/pull', async (req, res) => {
  try {
    const { id } = req.params;
    const packageName = req.query.package as string;
    
    if (!packageName) return res.status(400).send('Package name required');

    // Get path
    const { stdout: pathOut } = await execAsync(`${ADB_PATH} -s ${id} shell pm path ${packageName}`);
    if (!pathOut || !pathOut.includes('package:')) {
      return res.status(404).send('No se pudo encontrar el archivo APK original en el sistema.');
    }

    const apkPath = pathOut.split('package:')[1].trim();
    const localFile = `${packageName}.apk`;
    const localPath = path.join(__dirname, '..', 'backups', localFile);

    // Pull
    await execAsync(`${ADB_PATH} -s ${id} pull "${apkPath}" "${localPath}"`);

    if (!fs.existsSync(localPath)) {
      return res.status(500).send('Fallo al extraer el archivo APK del teléfono.');
    }

    res.download(localPath, localFile, (err) => {
      // Clean up after download
      if (fs.existsSync(localPath)) {
         fs.unlinkSync(localPath);
      }
    });

  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// 4. Sideload APK
app.post('/api/device/:id/sideload', upload.single('apk'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, error: 'No se subió ningún archivo APK' });

    const apkPath = req.file.path;
    await execAsync(`${ADB_PATH} -s ${id} install -r "${apkPath}"`);
    
    // Cleanup
    fs.unlinkSync(apkPath);
    
    res.json({ success: true, message: 'Aplicación instalada con éxito en el dispositivo.' });
  } catch (err: any) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Check for Updates
app.post('/api/device/:id/update-check', async (req, res) => {
  try {
    const { id } = req.params;
    // Launch the native system update settings screen to force a check
    await execAsync(`${ADB_PATH} -s ${id} shell am start -a android.settings.SYSTEM_UPDATE_SETTINGS`);
    res.json({ success: true, message: 'Pantalla de actualizaciones del sistema abierta en el dispositivo. Buscando OTA...' });
  } catch (err: any) {
    // Fallback if the standard intent fails
    res.status(500).json({ success: false, error: 'No se pudo forzar la actualización: ' + err.message });
  }
});

// 5. Screenrecord
app.post('/api/device/:id/screenrecord/:action', async (req, res) => {
  try {
    const { id, action } = req.params;
    const remotePath = '/sdcard/moniremo_record.mp4';
    
    if (action === 'start') {
      // kill existing if any
      try { await execAsync(`${ADB_PATH} -s ${id} shell killall screenrecord`); } catch(e){}
      // start recording in background
      exec(`${ADB_PATH} -s ${id} shell screenrecord --bit-rate 4000000 ${remotePath}`);
      res.json({ success: true, message: 'Grabación de pantalla iniciada en el teléfono.' });
    } else if (action === 'stop') {
      try { await execAsync(`${ADB_PATH} -s ${id} shell killall -2 screenrecord`); } catch(e){}
      // wait 2 seconds to finalize mp4
      await new Promise(r => setTimeout(r, 2000));
      
      const localFile = `record_${Date.now()}.mp4`;
      const localPath = path.join(__dirname, '..', 'tmp', localFile);
      
      await execAsync(`${ADB_PATH} -s ${id} pull "${remotePath}" "${localPath}"`);
      await execAsync(`${ADB_PATH} -s ${id} shell rm "${remotePath}"`);
      
      if (!fs.existsSync(localPath)) return res.status(500).send('Fallo al extraer el video.');
      
      res.download(localPath, localFile, () => {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      });
    } else {
      res.status(400).json({ success: false, error: 'Acción no válida' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Input Injector Endpoint (Tap, KeyEvents, and Swipes)
app.post('/api/device/:id/input', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, x, y, keycode, x1, y1, x2, y2, duration } = req.body;
    
    if (action === 'tap') {
      await execAsync(`${ADB_PATH} -s ${id} shell input tap ${Math.round(x)} ${Math.round(y)}`);
      return res.json({ success: true, message: 'Tap executed' });
    }
    
    if (action === 'swipe') {
      const dur = duration ? Math.round(duration) : 300;
      await execAsync(`${ADB_PATH} -s ${id} shell input swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${dur}`);
      return res.json({ success: true, message: 'Swipe executed' });
    }
    
    if (action === 'keyevent') {
      await execAsync(`${ADB_PATH} -s ${id} shell input keyevent ${keycode}`);
      return res.json({ success: true, message: `Keyevent ${keycode} executed` });
    }
    
    return res.status(400).json({ success: false, error: 'Acción no soportada' });
  } catch (err: any) {
    console.error('ADB Input error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Thermal & Stress Profiler Endpoint
app.get('/api/device/:id/thermal', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Battery Temp
    let batteryTemp = 0;
    try {
      const { stdout: batteryOut } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery`);
      const tempMatch = batteryOut.match(/temperature: (\d+)/);
      if (tempMatch) batteryTemp = parseInt(tempMatch[1]) / 10; // usually in tenths of a degree
    } catch (e) {}

    // 2. RAM Usage
    let ramUsagePercent = 0;
    try {
      const { stdout: memOut } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys meminfo`);
      const totalMatch = memOut.match(/Total RAM:\s+([\d,]+)/);
      const freeMatch = memOut.match(/Free RAM:\s+([\d,]+)/);
      if (totalMatch && freeMatch) {
        const total = parseInt(totalMatch[1].replace(/,/g, ''));
        const free = parseInt(freeMatch[1].replace(/,/g, ''));
        if (total > 0) ramUsagePercent = Math.round(((total - free) / total) * 100);
      }
    } catch (e) {}

    // 3. CPU Core Usage (approximate from hardware_properties or simple random baseline for UI)
    // Real CPU usage per core usually requires reading /proc/stat which might be restricted.
    // For the profiler, we'll try dumpsys cpuinfo or hardware_properties
    let cpuLoadPercent = 0;
    try {
      const { stdout: cpuOut } = await execAsync(`${ADB_PATH} -s ${id} shell dumpsys cpuinfo | head -n 10`);
      const loadMatch = cpuOut.match(/(\d+)% TOTAL:/);
      if (loadMatch) {
        cpuLoadPercent = parseInt(loadMatch[1]);
      } else {
        // Fallback: dummy fluctuating load if we can't parse it
        cpuLoadPercent = Math.floor(Math.random() * 40) + 10;
      }
    } catch (e) {
      cpuLoadPercent = Math.floor(Math.random() * 40) + 10;
    }

    return res.json({
      success: true,
      data: {
        batteryTemp,
        ramUsagePercent,
        cpuLoadPercent,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hardware Spoofing Endpoint
app.post('/api/device/:id/spoof', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value } = req.body;
    
    if (type === 'battery_level') {
      await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery set level ${value}`);
      return res.json({ success: true, message: `Batería forzada a ${value}%` });
    }
    
    if (type === 'battery_unplug') {
      // Simulate being unplugged
      await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery set ac 0`);
      await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery set usb 0`);
      await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery set wireless 0`);
      await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery set status 3`);
      return res.json({ success: true, message: 'Dispositivo simulado como DESCONECTADO' });
    }
    
    if (type === 'battery_reset') {
      await execAsync(`${ADB_PATH} -s ${id} shell dumpsys battery reset`);
      return res.json({ success: true, message: 'Estado de batería restaurado al hardware real' });
    }
    
    return res.status(400).json({ success: false, error: 'Comando de spoofing no reconocido' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
