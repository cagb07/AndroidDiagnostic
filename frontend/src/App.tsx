import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Smartphone, Battery, Info, Activity, RefreshCw, Power, Zap, PlaySquare, LayoutGrid, Trash2, TerminalSquare, Play, Square, HardDriveDownload, ShieldAlert, Unlock, UploadCloud, AlertCircle, Volume2, Sun, Moon, PowerOff, ShieldQuestion, Camera, MonitorPlay, Lock, Wrench, Cpu, Database, Wifi, Thermometer, MemoryStick, ServerCrash, Box, Upload, Terminal, FolderOpen, EyeOff, Eye, X, Maximize, LayoutDashboard, Globe, Radar, Bug, Flame, ChevronLeft, Circle, Film, FileText, Printer, Copy } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

interface Device {
  id: string;
  type: string;
}

interface DeviceInfo {
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkLevel: string;
  cpuAbi: string;
  board: string;
  serial?: string;
  securityPatch?: string;
  bootloader?: string;
  baseband?: string;
  hardware?: string;
  fingerprint?: string;
  resolution?: string;
  density?: string;
  imei?: string;
  rawProperties?: Record<string, string>;
}

interface AppItem {
  packageName: string;
  type: 'system' | 'user';
  category: string;
  importance: number;
}

const SENSOR_DESCRIPTIONS: Record<string, string> = {
  'accelerometer': 'Mide la aceleración física. Se usa para detectar la rotación de la pantalla, sacudidas y el movimiento del teléfono.',
  'gyroscope': 'Mide la velocidad de rotación. Es clave para juegos, realidad virtual, panorámicas y estabilización de la cámara.',
  'magnetic_field': 'Actúa como una brújula digital, midiendo el campo magnético de la Tierra para determinar hacia dónde apunta el dispositivo.',
  'light': 'Mide la intensidad de la luz ambiental. El sistema lo utiliza para ajustar automáticamente el brillo de la pantalla.',
  'proximity': 'Detecta si hay un objeto cerca. Es el responsable de apagar la pantalla cuando te acercas el teléfono a la oreja.',
  'pressure': 'Mide la presión atmosférica (barómetro). Ayuda a calcular la altitud o predecir cambios en el clima.',
  'gravity': 'Mide exclusivamente la dirección y magnitud de la gravedad aplicada al dispositivo.',
  'linear_acceleration': 'Mide la aceleración del dispositivo descontando la gravedad, útil para saber qué tan rápido arranca en un vehículo.',
  'rotation_vector': 'Calcula la orientación 3D completa usando una fusión de giroscopio, acelerómetro y magnetómetro.',
  'step_counter': 'Cuenta continuamente los pasos del usuario a nivel de hardware, consumiendo muy poca batería.',
  'step_detector': 'Dispara un evento específico cada vez que detecta el impacto de un paso al caminar.',
  'significant_motion': 'Detecta si el teléfono está en movimiento para encenderse o ahorrar batería cuando está quieto.'
};

function getSensorDescription(type: string) {
  const normalized = type.replace('android.sensor.', '').replace('_uncalibrated', '').toLowerCase();
  return SENSOR_DESCRIPTIONS[normalized] || 'Proporciona datos especializados de hardware o algoritmos avanzados de fusión (uso interno del sistema).';
}

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [batteryInfo, setBatteryInfo] = useState<Record<string, string> | null>(null);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'power' | 'hardware' | 'apps' | 'logs' | 'backup' | 'root' | 'bypass' | 'security' | 'maintenance' | 'terminal' | 'files' | 'screen' | 'privacy' | 'network' | 'taskmanager' | 'screentweaks' | 'deepscanner' | 'devtoggles' | 'thermal' | 'spoofing' | 'repair'>('dashboard');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerInput, setDisclaimerInput] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('pixel');
  const [bootFile, setBootFile] = useState<File | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [sensors, setSensors] = useState<any[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<any | null>(null);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [showRawProps, setShowRawProps] = useState(false);
  const [propSearch, setPropSearch] = useState('');
  const [advancedDiagnostics, setAdvancedDiagnostics] = useState<any>(null);
  const [appInfos, setAppInfos] = useState<Record<string, { title: string, icon: string, summary: string }>>({});
  const [uploadingApk, setUploadingApk] = useState(false);
  const [appViewMode, setAppViewMode] = useState<'user' | 'system'>('user');
  const [showBloatwareModal, setShowBloatwareModal] = useState(false);
  const [bloatwareSelection, setBloatwareSelection] = useState<string[]>([]);

  // Repair Tab States
  const [repairAppsList, setRepairAppsList] = useState<any[]>([]);
  const [repairCrashLogs, setRepairCrashLogs] = useState<string>('');
  const [repairPingResult, setRepairPingResult] = useState<string>('');

  // V3 States
  const [deepInfo, setDeepInfo] = useState<any>(null);

  // Malware Scanner States
  const [malwareScanResults, setMalwareScanResults] = useState<any[]>([]);
  const [isScanningMalware, setIsScanningMalware] = useState(false);

  // God Mode States
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string>('Esperando conexión ADB...\n');
  const [filesPath, setFilesPath] = useState('/sdcard');
  const [filesList, setFilesList] = useState<any[]>([]);
  const [selectedExplorerFiles, setSelectedExplorerFiles] = useState<string[]>([]);
  const [permissionsData, setPermissionsData] = useState<any>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [isLiveScreen, setIsLiveScreen] = useState(false);
  const [tapFeedback, setTapFeedback] = useState<{ x: number, y: number } | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, time: number } | null>(null);

  // V2.0 States
  const [networkData, setNetworkData] = useState<any>(null);
  const [pingResult, setPingResult] = useState<string>('');
  const [processesData, setProcessesData] = useState<any[]>([]);
  const [screenResolution, setScreenResolution] = useState('');
  const [screenDpi, setScreenDpi] = useState('');

  // PRO V3 States
  const [thermalData, setThermalData] = useState<any[]>([]);

  // Root States
  const [isInstallingMagisk, setIsInstallingMagisk] = useState(false);
  const [rootMode, setRootMode] = useState<'auto' | 'manual'>('auto');
  const [autoPatchFile, setAutoPatchFile] = useState<File | null>(null);
  const [isAutoPatching, setIsAutoPatching] = useState(false);
  const [autoPatchPartition, setAutoPatchPartition] = useState<'boot' | 'init_boot'>('boot');

  // Bypass States
  const [bruteForceStartPin, setBruteForceStartPin] = useState('0000');
  const [bruteForceEndPin, setBruteForceEndPin] = useState('9999');
  const [bruteForceStatus, setBruteForceStatus] = useState({ active: false, currentPin: '', lastLog: '' });

  // UI Dialog States
  const [activeBackupTask, setActiveBackupTask] = useState<{ active: boolean, type: 'backup' | 'restore', filename: string }>({ active: false, type: 'backup', filename: '' });
  const [mediaViewer, setMediaViewer] = useState<{ url: string, type: 'image' | 'video' | 'document', name: string } | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    device: true,
    battery: true,
    apps: true,
    thermal: true,
    network: true,
    malware: true,
    auditLog: true,
    rootRequirements: true
  });
  const [auditLog, setAuditLog] = useState<{ timestamp: string, module: string, action: string, result: string }[]>([]);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);

  const logAction = (module: string, action: string, result: string) => {
    setAuditLog(prev => [...prev, {
      timestamp: new Date().toISOString(),
      module,
      action,
      result
    }]);
  };

  const customAlert = (message: string, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const addToast = (message: string, type = 'info') => {
    customAlert(message, type);
  };

  const openReportBuilder = () => {
    if (!selectedDevice) return;
    setShowReportBuilder(true);
  };

  const generateReport = async () => {
    if (!selectedDevice) return;
    setShowReportBuilder(false);
    setIsGeneratingReport(true);
    addToast('Recopilando telemetría y generando reporte maestro...', 'info');
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/report`);
      if (res.data.success) {
        setReportData({ ...res.data.data, options: reportOptions, auditLog, malwareScanResults, networkData });
        logAction('Reportes', 'Generación de reporte', 'Éxito');
      } else {
        addToast('Error generando reporte', 'error');
        logAction('Reportes', 'Generación de reporte', 'Falló');
      }
    } catch (e) {
      addToast('Error en el servidor al generar reporte', 'error');
      logAction('Reportes', 'Generación de reporte', 'Error de Servidor');
    }
    setIsGeneratingReport(false);
  };

  const customConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/devices`);
      if (res.data.success) {
        setDevices(res.data.devices);
        if (res.data.devices.length > 0 && !selectedDevice) {
          setSelectedDevice(res.data.devices[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceInfo = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE}/device/${id}/info`);
      if (res.data.success) {
        setDeviceInfo(res.data.data);
        if (res.data.data.resolution && res.data.data.resolution !== 'Unknown') {
          setScreenResolution(res.data.data.resolution);
        }
      }
    } catch (err) { console.error('Failed to fetch device info', err); }
  };

  const fetchBatteryInfo = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE}/device/${id}/battery`);
      if (res.data.success) setBatteryInfo(res.data.data);
    } catch (err) { console.error('Failed to fetch battery info', err); }
  };

  const fetchApps = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE}/device/${id}/apps`);
      if (res.data.success) setApps(res.data.apps);
    } catch (err) { console.error('Failed to fetch apps', err); }
  };

  const runMalwareScan = async () => {
    if (!selectedDevice) return;
    setIsScanningMalware(true);
    setMalwareScanResults([]);
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/scan-malware`);
      if (res.data.success) {
        setMalwareScanResults(res.data.results);
        logAction('Malware Scanner', 'Escaneo completo', `Se encontraron ${res.data.results.length} resultados`);

        // Fetch app metadata automatically for threats
        const threats = res.data.results.filter((app: any) => app.threatScore >= 20);
        threats.forEach(async (app: any) => {
          try {
            const infoRes = await axios.get(`${API_BASE}/app-info/${app.packageName}`);
            if (infoRes.data.success) {
              setAppInfos(prev => ({ ...prev, [app.packageName]: infoRes.data.data }));
            }
          } catch (e) { }
        });
      }
    } catch (err) {
      console.error('Failed to scan malware', err);
      addToast('Error al escanear malware');
      logAction('Malware Scanner', 'Escaneo completo', 'Falló');
    } finally {
      setIsScanningMalware(false);
    }
  };

  const handleUninstallThreat = async (packageName: string) => {
    if (!selectedDevice) return;
    // We reuse customConfirm if it exists, but I'll use window.confirm if it's not customConfirm
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la amenaza ${packageName}?`)) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/apps/uninstall`, { packageName });
      if (res.data.success) {
        addToast('Amenaza eliminada exitosamente.');
        setMalwareScanResults(prev => prev.filter(app => app.packageName !== packageName));
        logAction('Malware Scanner', `Desinstalación de ${packageName}`, 'Éxito');
      }
    } catch (err: any) {
      addToast('Error al eliminar amenaza: ' + (err.response?.data?.error || err.message));
      logAction('Malware Scanner', `Desinstalación de ${packageName}`, 'Falló');
    }
  };

  const fetchSensors = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE}/device/${id}/sensors`);
      if (res.data.success) setSensors(res.data.sensors);
    } catch (err) { console.error('Failed to fetch sensors', err); }
  };

  const fetchBackupsList = async () => {
    try {
      const res = await axios.get(`${API_BASE}/backups`);
      if (res.data.success) setBackupsList(res.data.backups);
    } catch (err) { console.error('Failed to fetch backups', err); }
  };

  const fetchAdvancedDiagnostics = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE}/device/${id}/diagnostics/advanced`);
      if (res.data.success) setAdvancedDiagnostics(res.data.data);
    } catch (err) { console.error('Failed to fetch advanced diagnostics', err); }
  };

  const fetchThermalData = async () => {
    if (!selectedDevice || activeTab !== 'thermal') return;
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/thermal`);
      if (res.data.success) {
        setThermalData(prev => {
          const newData = [...prev, res.data.data];
          if (newData.length > 30) newData.shift(); // Keep last 30 data points
          return newData;
        });
      }
    } catch (err) { console.error('Failed to fetch thermal data', err); }
  };

  useEffect(() => {
    fetchDevices();
    fetchBackupsList();

    const eventSource = new EventSource(`${API_BASE}/devices/events`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setDevices(data);
        if (data.length > 0) {
          setSelectedDevice(prev => prev || data[0].id);
        } else {
          setSelectedDevice('');
        }
      } catch (e) {
        console.error('Error parsing SSE data', e);
      }
    };

    return () => eventSource.close();
  }, []);

  // Brute Force Polling
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (bruteForceStatus.active && selectedDevice) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/device/${selectedDevice}/bypass/bruteforce/status`);
          if (res.data.success) {
            setBruteForceStatus(res.data.status);
          }
        } catch (e) { }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [bruteForceStatus.active, selectedDevice]);

  // Backup Task Polling
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeTab === 'backup' && selectedDevice) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/device/${selectedDevice}/backup/status`);
          if (res.data.success) {
            setActiveBackupTask(res.data.status);
            if (!res.data.status.active && activeBackupTask.active) {
              // Status changed from active to inactive, refresh list
              fetchBackupsList();
            }
          }
        } catch (e) { }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab, selectedDevice, activeBackupTask.active]);

  // God Mode Fetches
  const fetchFiles = async (path: string = filesPath) => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/files`, { path });
      if (res.data.success) {
        setFilesList(res.data.files);
        setFilesPath(path);
        setSelectedExplorerFiles([]);
      }
    } catch (err) { customAlert('Error leyendo archivos'); }
  };

  const handleBulkDeleteFiles = async () => {
    if (selectedExplorerFiles.length === 0) return;
    if (await customConfirm(`¿Estás seguro de eliminar permanentemente ${selectedExplorerFiles.length} archivos/carpetas?`)) {
      try {
        const fullPaths = selectedExplorerFiles.map(name => filesPath + (filesPath.endsWith('/') ? '' : '/') + name);
        const res = await axios.post(`${API_BASE}/device/${selectedDevice}/files/delete-batch`, { paths: fullPaths });
        if (res.data.success) {
          customAlert(`Se eliminaron ${selectedExplorerFiles.length} elementos exitosamente`, 'success');
          logAction('Explorador de Archivos', 'Borrado en Lote', `Éxito: ${selectedExplorerFiles.length} items`);
          fetchFiles(filesPath);
        } else {
          customAlert('Error al eliminar en lote: ' + res.data.error, 'error');
          logAction('Explorador de Archivos', 'Borrado en Lote', 'Falló');
        }
      } catch (err: any) {
        customAlert('Error al ejecutar borrado en lote: ' + err.message);
        logAction('Explorador de Archivos', 'Borrado en Lote', 'Error de red');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDevice || !filesPath) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', filesPath);

    addToast(`Subiendo ${file.name} al dispositivo...`, 'info');
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        addToast('Archivo subido con éxito.', 'success');
        fetchFiles(filesPath);
      } else {
        customAlert('Error al subir: ' + res.data.error, 'error');
      }
    } catch (err: any) {
      customAlert('Error al subir el archivo al dispositivo.', 'error');
    }
    e.target.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    setDragStart({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, time: Date.now() });
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragStart) return;
    if (!screenResolution) {
      customAlert('Resolución del dispositivo desconocida. Ve a la pestaña Panel Principal para sincronizar.', 'error');
      setDragStart(null);
      return;
    }

    const endX = e.nativeEvent.offsetX;
    const endY = e.nativeEvent.offsetY;
    const distance = Math.hypot(endX - dragStart.x, endY - dragStart.y);
    const duration = Date.now() - dragStart.time;

    const rect = e.currentTarget.getBoundingClientRect();
    const match = screenResolution.match(/(\d+)x(\d+)/);
    if (!match) return;
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);

    const isSwipe = distance > 10;

    setTapFeedback({ x: endX, y: endY });
    setTimeout(() => setTapFeedback(null), 500);

    try {
      if (isSwipe) {
        const x1Ratio = dragStart.x / rect.width;
        const y1Ratio = dragStart.y / rect.height;
        const x2Ratio = endX / rect.width;
        const y2Ratio = endY / rect.height;

        await axios.post(`${API_BASE}/device/${selectedDevice}/input`, {
          action: 'swipe',
          x1: x1Ratio * w,
          y1: y1Ratio * h,
          x2: x2Ratio * w,
          y2: y2Ratio * h,
          duration: Math.min(duration, 2000) // cap duration at 2 seconds
        });
        logAction('Pantalla (Mirror)', 'Swipe', 'Enviado');
      } else {
        const xRatio = endX / rect.width;
        const yRatio = endY / rect.height;
        await axios.post(`${API_BASE}/device/${selectedDevice}/input`, {
          action: 'tap',
          x: xRatio * w,
          y: yRatio * h
        });
        logAction('Pantalla (Mirror)', 'Tap', 'Enviado');
      }
      if (!isLiveScreen) setTimeout(fetchScreenshot, 500);
    } catch (err) {
      console.error('Error sending input event', err);
      logAction('Pantalla (Mirror)', 'Input Event', 'Falló');
    }
    setDragStart(null);
  };

  const handleKeyEvent = async (keycode: number) => {
    if (!selectedDevice) return;
    try {
      await axios.post(`${API_BASE}/device/${selectedDevice}/input`, { action: 'keyevent', keycode });
      logAction('Pantalla (Mirror)', `Keycode: ${keycode}`, 'Enviado');
      if (!isLiveScreen) setTimeout(fetchScreenshot, 500);
    } catch (e) {
      console.error('Error sending keyevent', e);
      logAction('Pantalla (Mirror)', `Keycode: ${keycode}`, 'Falló');
    }
  };

  const handleScreenRecordToggle = async () => {
    if (!selectedDevice) return;

    if (isRecordingVideo) {
      // Detener y descargar
      setIsRecordingVideo(false);
      addToast('Finalizando grabación y descargando MP4...');
      triggerDownload(`${API_BASE}/device/${selectedDevice}/screenrecord/stop`);
      logAction('Pantalla (Mirror)', 'Grabación', 'Detenida');
    } else {
      // Iniciar grabación
      try {
        const res = await axios.post(`${API_BASE}/device/${selectedDevice}/screenrecord/start`);
        if (res.data.success) {
          setIsRecordingVideo(true);
          addToast(res.data.message);
          logAction('Pantalla (Mirror)', 'Grabación', 'Iniciada');
        }
      } catch (err: any) {
        customAlert('Error al iniciar grabación: ' + err.message);
        logAction('Pantalla (Mirror)', 'Grabación', 'Falló');
      }
    }
  };

  const fetchPermissions = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/permissions`);
      if (res.data.success) setPermissionsData(res.data.permissions);
    } catch (err) { console.error(err); }
  };

  const fetchScreenshot = async () => {
    if (!selectedDevice) return;
    setIsScreenshotLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/screenshot`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
      setScreenshotUrl(url);
    } catch (err) { customAlert('Error capturando pantalla'); }
    finally { setIsScreenshotLoading(false); }
  };

  const runTerminalCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !terminalCommand.trim()) return;
    setTerminalOutput(prev => prev + `\n$ ${terminalCommand}\nEjecutando...`);
    const cmd = terminalCommand;
    setTerminalCommand('');
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/terminal`, { command: cmd });
      if (res.data.success) {
        setTerminalOutput(prev => prev.replace('Ejecutando...', '') + res.data.output + '\n');
        logAction('Terminal ADB', `Comando: ${cmd}`, 'Éxito');
      } else {
        setTerminalOutput(prev => prev.replace('Ejecutando...', '') + `Error: ${res.data.error}\n`);
        logAction('Terminal ADB', `Comando: ${cmd}`, 'Error en comando');
      }
    } catch (err: any) {
      setTerminalOutput(prev => prev.replace('Ejecutando...', '') + `Error de Red: ${err.message}\n`);
      logAction('Terminal ADB', `Comando: ${cmd}`, 'Falló');
    }
  };

  const handleGodMode = async (action: string) => {
    if (!selectedDevice) return;
    if (action === 'adguard-dns' && !await customConfirm('¿Estás seguro de inyectar el DNS de AdGuard a nivel sistema? Bloqueará anuncios en todo el dispositivo.')) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/advanced-action`, { action });
      if (res.data.success) {
        customAlert('Acción ejecutada correctamente.');
        logAction('Modo Dios', action, 'Éxito');
      }
    } catch (err) {
      customAlert('Error ejecutando comando avanzado.');
      logAction('Modo Dios', action, 'Falló');
    }
  };

  // V2.0 Fetches
  const fetchNetwork = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/network`);
      if (res.data.success) setNetworkData(res.data.network);
    } catch (err) { console.error(err); }
  };

  const runPingTest = async () => {
    if (!selectedDevice) return;
    setPingResult('Haciendo ping a 8.8.8.8...');
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/network/ping`);
      setPingResult(res.data.output);
      logAction('Red', 'Ping test', 'Éxito');
    } catch (err) {
      setPingResult('Error en ping');
      logAction('Red', 'Ping test', 'Falló');
    }
  };

  const fetchProcesses = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/processes`);
      if (res.data.success) setProcessesData(res.data.processes);
    } catch (err) { console.error(err); }
  };

  const killProcess = async (pid: string, packageName?: string) => {
    if (!selectedDevice) return;
    if (!await customConfirm(`¿Estás seguro de forzar el cierre de ${packageName || pid}?`)) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/processes/kill`, { pid, packageName });
      if (res.data.success) {
        customAlert('Proceso terminado con éxito');
        logAction('Task Manager', `Cerrar ${packageName || pid}`, 'Éxito');
        fetchProcesses();
      }
    } catch (err) {
      customAlert('No se pudo matar el proceso. (Faltan permisos Root?)');
      logAction('Task Manager', `Cerrar ${packageName || pid}`, 'Falló');
    }
  };

  const handleStressTest = async (type: 'cpu' | 'gpu' | 'video', action: 'start' | 'stop') => {
    if (!selectedDevice) return;
    console.log(`[STRESS TEST] Iniciando petición - Dispositivo: ${selectedDevice}, Tipo: ${type}, Acción: ${action}`);
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/stress`, { type, action });
      if (res.data.success) {
        console.log(`[STRESS TEST] Éxito: ${res.data.message}`);
        addToast(res.data.message, 'success');
      }
    } catch (err) {
      console.error(`[STRESS TEST] Error:`, err);
      customAlert('Error ejecutando stress test');
    }
  };

  const applyScreenTweaks = async (action: string, value?: string) => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/screen/modifier`, { action, value });
      if (res.data.success) {
        customAlert(`Comando de pantalla (${action}) ejecutado.`);
        logAction('Modificador Pantalla', action, 'Éxito');
      }
    } catch (err) {
      customAlert('Error modificando la pantalla.');
      logAction('Modificador Pantalla', action, 'Falló');
    }
  };

  // V3 Fetches
  const fetchDeepInfo = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/deep-info`);
      if (res.data.success) setDeepInfo(res.data.data);
    } catch (err) { console.error(err); }
  };

  const setDevToggle = async (key: string, value: string) => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/developer-toggles`, { key, value });
      if (res.data.success) {
        customAlert(`Cambio aplicado exitosamente: ${key}=${value}`);
        logAction('Developer Toggles', `${key}=${value}`, 'Éxito');
      }
    } catch (err) {
      customAlert('Error al cambiar configuración de desarrollo.');
      logAction('Developer Toggles', `${key}=${value}`, 'Falló');
    }
  };

  useEffect(() => {
    let interval: any;
    if (activeTab === 'screen' && isLiveScreen && selectedDevice) {
      interval = setInterval(() => {
        fetchScreenshot();
      }, 1000); // 1 FPS to not overload USB
    }
    return () => clearInterval(interval);
  }, [activeTab, isLiveScreen, selectedDevice]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDeepInfo();
      fetchDevices();
    }
    if (activeTab === 'network') fetchNetwork();
    if (activeTab === 'taskmanager') fetchProcesses();
    if (activeTab === 'files') fetchFiles();
    if (activeTab === 'privacy') fetchPermissions();
    if (activeTab === 'screen' && !isLiveScreen) fetchScreenshot();
    if (activeTab === 'deepscanner') fetchDeepInfo();
  }, [activeTab, selectedDevice]);

  useEffect(() => {
    let thermalInterval: any;
    if (activeTab === 'thermal' && selectedDevice) {
      // Clear data on entry
      setThermalData([]);
      fetchThermalData(); // Initial fetch
      thermalInterval = setInterval(fetchThermalData, 1000);
    }
    return () => clearInterval(thermalInterval);
  }, [activeTab, selectedDevice]);

  useEffect(() => {
    if (selectedDevice) {
      fetchDeviceInfo(selectedDevice);
      fetchBatteryInfo(selectedDevice);
      fetchApps(selectedDevice);
      fetchSensors(selectedDevice);
      fetchAdvancedDiagnostics(selectedDevice);
    }
  }, [selectedDevice]);

  // App Info loader
  useEffect(() => {
    if (activeTab === 'apps' && apps.length > 0) {
      // 1. PRE-FILL INSTANTÁNEO: Evitar que el usuario vea "Cargando..."
      setAppInfos(prev => {
        let changed = false;
        const newInfos = { ...prev };
        for (const app of apps) {
          if (!newInfos[app.packageName]) {
            changed = true;
            const parts = app.packageName.split('.');
            const fallbackTitle = parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            newInfos[app.packageName] = {
              title: fallbackTitle,
              icon: '',
              summary: app.importance <= 3 ? 'Componente interno del sistema protegido.' : 'Cargando información comercial...'
            };
          }
        }
        return changed ? newInfos : prev;
      });

      // 2. CARGA EN SEGUNDO PLANO
      let isCancelled = false;
      const loadInfos = async () => {
        // Parallel batching for faster loading without completely killing the server
        const BATCH_SIZE = 5;
        for (let i = 0; i < apps.length; i += BATCH_SIZE) {
          if (isCancelled) break;

          const batch = apps.slice(i, i + BATCH_SIZE).filter(a => a.importance > 3);
          if (batch.length === 0) continue;

          await Promise.all(batch.map(async (app) => {
            try {
              const res = await axios.get(`${API_BASE}/app-info/${app.packageName}`);
              if (res.data.success && !isCancelled) {
                setAppInfos(prev => ({ ...prev, [app.packageName]: res.data.data }));
              }
            } catch (e) { }
          }));
        }
      }

      loadInfos();
      return () => { isCancelled = true; };
    }
  }, [activeTab, apps]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    if (selectedDevice && activeTab === 'logs' && isLogging) {
      eventSource = new EventSource(`${API_BASE}/device/${selectedDevice}/logcat`);
      eventSource.onmessage = (event) => {
        setLogs((prev) => {
          const newLogs = [...prev, JSON.parse(event.data)];
          return newLogs.slice(-100); // Keep only last 100 logs to prevent memory leak
        });
      };
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [selectedDevice, activeTab, isLogging]);

  const handleReboot = async (mode: string) => {
    if (!selectedDevice) return;
    if (!await customConfirm(`Are you sure you want to reboot to ${mode}?`)) return;
    try {
      await axios.post(`${API_BASE}/device/${selectedDevice}/reboot`, { mode });
      customAlert(`Rebooting to ${mode}...`);
      logAction('Energía', `Reinicio modo ${mode}`, 'Enviado');
    } catch (err) {
      customAlert('Failed to reboot');
      logAction('Energía', `Reinicio modo ${mode}`, 'Falló');
    }
  };

  const handleTest = async (type: string) => {
    if (!selectedDevice) return;
    try {
      await axios.post(`${API_BASE}/device/${selectedDevice}/test/${type}`);
      logAction('Hardware Test', `Prueba: ${type}`, 'Iniciada con éxito');
    } catch (err) {
      customAlert(`Failed to execute test ${type}`);
      logAction('Hardware Test', `Prueba: ${type}`, 'Falló');
    }
  };

  const handleUninstallApp = async (app: AppItem) => {
    if (!selectedDevice) return;
    if (!await customConfirm(`Are you sure you want to uninstall ${app.packageName}? This may break device functionality if it's a critical system app.`)) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/apps/uninstall`, { packageName: app.packageName });
      if (res.data.success) {
        customAlert('App uninstalled successfully.');
        logAction('Gestor de Apps', `Desinstalación de ${app.packageName}`, 'Éxito');
        setSelectedApp(null);
        fetchApps(selectedDevice);
      }
    } catch (err: any) {
      customAlert('Error: ' + (err.response?.data?.error || err.message));
      logAction('Gestor de Apps', `Desinstalación de ${app.packageName}`, 'Falló');
    }
  };

  const handleDestroyBloatware = async () => {
    if (!selectedDevice) return;

    const bloatware = apps.filter(a => a.importance === 4);
    if (bloatware.length === 0) {
      customAlert('No se detectó bloatware de fabricante en este dispositivo.');
      return;
    }

    setBloatwareSelection(bloatware.map(a => a.packageName));
    setShowBloatwareModal(true);
  };

  const confirmDestroyBloatware = async () => {
    if (!selectedDevice || bloatwareSelection.length === 0) return;

    if (!await customConfirm(`¡ADVERTENCIA! Se eliminarán ${bloatwareSelection.length} aplicaciones basura del fabricante. ¿Estás absolutamente seguro?`)) return;

    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/apps/uninstall-batch`, { packageNames: bloatwareSelection });
      if (res.data.success) {
        customAlert(`Operación completada. Se eliminaron ${res.data.results.filter((r: any) => r.success).length} aplicaciones.`);
        logAction('Gestor de Apps', 'Borrado de Bloatware', 'Éxito');
        setShowBloatwareModal(false);
        fetchApps(selectedDevice);
      }
    } catch (err: any) {
      customAlert('Error eliminando bloatware en lote: ' + err.message);
      logAction('Gestor de Apps', 'Borrado de Bloatware', 'Falló');
    }
  };

  const handleSpoof = async (type: string, value?: number) => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/spoof`, { type, value });
      if (res.data.success) {
        addToast(res.data.message);
        logAction('Spoofing', type, 'Éxito');
        fetchBatteryInfo(selectedDevice);
      }
    } catch (err: any) {
      customAlert('Error al inyectar spoofing: ' + err.message);
    }
  };

  const handleApkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDevice || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.name.endsWith('.apk')) {
      customAlert('Solo se permiten archivos con extensión .apk');
      return;
    }

    setUploadingApk(true);
    const formData = new FormData();
    formData.append('apk', file);

    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/install`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        customAlert('Aplicación instalada con éxito!');
        fetchApps(selectedDevice);
      }
    } catch (err: any) {
      customAlert('Error instalando APK: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingApk(false);
      e.target.value = ''; // Reset input
    }
  };

  const startBackup = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/backup/legacy`);
      if (res.data.success) {
        customAlert(res.data.message); // Instructs user to look at device
        // Poll for new backups after a delay
        setTimeout(fetchBackupsList, 15000);
      }
    } catch (err) {
      customAlert('Failed to start backup');
    }
  };

  const triggerDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadBackup = (filename: string) => {
    triggerDownload(`${API_BASE}/backups/download/${filename}`);
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!selectedDevice) return;
    if (!await customConfirm('¿Estás seguro de que deseas restaurar esta copia de seguridad? Se requerirá que confirmes la acción en la pantalla del celular.')) return;
    addToast('Restauración iniciada. Por favor, revisa la pantalla del celular y aprueba la restauración.', 'info');
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/backup/restore`, { filename });
      if (res.data.success) {
        customAlert('Comando de restauración enviado con éxito', 'success');
        logAction('Copias de Seguridad', 'Restaurar', 'Éxito');
      } else {
        customAlert('Error al restaurar: ' + res.data.error, 'error');
        logAction('Copias de Seguridad', 'Restaurar', 'Error');
      }
    } catch (err: any) {
      customAlert('Fallo al comunicarse con el servidor.', 'error');
      logAction('Copias de Seguridad', 'Restaurar', 'Falló');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!await customConfirm(`¿Estás seguro de que deseas eliminar permanentemente el respaldo "${filename}" del servidor?`)) return;
    try {
      const res = await axios.delete(`${API_BASE}/backups/${filename}`);
      if (res.data.success) {
        addToast('Respaldo eliminado con éxito', 'success');
        fetchBackupsList();
      }
    } catch (err: any) {
      customAlert('Error al eliminar respaldo: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleMaintenance = async (action: string) => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/maintenance/${action}`);
      if (res.data.success) {
        customAlert(res.data.message);
      }
    } catch (err) {
      customAlert('Error ejecutando la acción de mantenimiento.');
    }
  };

  const handleUnlockBootloader = async () => {
    if (!selectedDevice) return;
    if (!await customConfirm('WARNING: Unlocking the bootloader will completely WIPE/FACTORY RESET the device. Are you sure?')) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/fastboot/unlock`);
      if (res.data.success) customAlert(res.data.message);
    } catch (err) {
      customAlert('Failed to send unlock command. Make sure device is in Bootloader mode.');
    }
  };

  const handleInstallMagisk = async () => {
    if (!selectedDevice) return;
    setIsInstallingMagisk(true);
    addToast('Descargando e instalando Magisk... Esto puede tardar unos segundos.', 'info');
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/fastboot/install-magisk`);
      if (res.data.success) {
        customAlert(res.data.message, 'success');
        logAction('Asistente Root', 'Instalar Magisk App', 'Éxito');
      } else {
        customAlert('Error instalando Magisk: ' + res.data.error, 'error');
        logAction('Asistente Root', 'Instalar Magisk App', 'Error');
      }
    } catch (err: any) {
      customAlert('Error de red al instalar Magisk', 'error');
      logAction('Asistente Root', 'Instalar Magisk App', 'Falló');
    }
    setIsInstallingMagisk(false);
  };

  const handleAutoPatch = async () => {
    if (!selectedDevice || !autoPatchFile) return;
    if (selectedBrand === 'samsung') return customAlert('Samsung requiere Odin. AutoPatch no funciona en Samsung.');

    const formData = new FormData();
    formData.append('file', autoPatchFile);
    formData.append('partition', autoPatchPartition);

    setIsAutoPatching(true);
    addToast('Iniciando Motor AutoPatch. Esto tomará de 1 a 2 minutos...', 'info');
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/fastboot/autopatch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 mins timeout
      });
      if (res.data.success) {
        customAlert(res.data.message, 'success');
        setAutoPatchFile(null);
        logAction('Asistente Root', 'AutoPatch Server', 'Éxito');
      } else {
        customAlert('Error en AutoPatch: ' + res.data.error, 'error');
        logAction('Asistente Root', 'AutoPatch Server', 'Error');
      }
    } catch (err: any) {
      customAlert(err.response?.data?.error || err.message || 'Error de red en AutoPatch', 'error');
      logAction('Asistente Root', 'AutoPatch Server', 'Falló');
    }
    setIsAutoPatching(false);
  };

  // ==========================================
  // REPAIR & TEST TAB FUNCTIONS
  // ==========================================

  const fetchRepairApps = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/apps`);
      if (res.data.success) {
        setRepairAppsList(res.data.apps);
      }
    } catch (err: any) {
      customAlert(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleRepairAppAction = async (packageName: string, action: string) => {
    if (!selectedDevice) return;
    if (await customConfirm(`¿Seguro que deseas ejecutar '${action}' en ${packageName}?`)) {
      try {
        const res = await axios.post(`${API_BASE}/device/${selectedDevice}/apps/manage`, { packageName, action });
        if (res.data.success) {
          addToast(res.data.message, 'success');
          fetchRepairApps(); // Refresh the list
        }
      } catch (err: any) {
        customAlert(err.response?.data?.error || err.message, 'error');
      }
    }
  };

  const handlePointerLocationToggle = async (enable: boolean) => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/hardware/touch`, { enable });
      if (res.data.success) {
        addToast(res.data.message, 'success');
      }
    } catch (err: any) {
      customAlert(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleNetworkPing = async () => {
    if (!selectedDevice) return;
    setRepairPingResult('Ejecutando ping...');
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/network/ping`);
      if (res.data.success) {
        setRepairPingResult(res.data.output);
      }
    } catch (err: any) {
      setRepairPingResult(err.response?.data?.error || err.message);
    }
  };

  const handleNetworkReset = async () => {
    if (!selectedDevice) return;
    if (await customConfirm('¿Reiniciar componentes de red (activará y desactivará el modo avión)?')) {
      try {
        const res = await axios.post(`${API_BASE}/device/${selectedDevice}/network/reset`);
        if (res.data.success) {
          addToast(res.data.message, 'success');
        }
      } catch (err: any) {
        customAlert(err.response?.data?.error || err.message, 'error');
      }
    }
  };

  const fetchCrashLogs = async () => {
    if (!selectedDevice) return;
    setRepairCrashLogs('Extrayendo logs...');
    try {
      const res = await axios.get(`${API_BASE}/device/${selectedDevice}/logs/crash`);
      if (res.data.success) {
        setRepairCrashLogs(res.data.logs || 'No se encontraron errores recientes en el logcat.');
      }
    } catch (err: any) {
      setRepairCrashLogs(err.response?.data?.error || err.message);
    }
  };

  const handleHardwareVibrate = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/hardware/vibrate`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
      }
    } catch (err: any) {
      customAlert(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleRepairTabClick = () => {
    setActiveTab('repair');
    fetchRepairApps();
  };



  const handleTWRPBypass = async () => {
    if (!selectedDevice) return;
    if (await customConfirm('¿Estás seguro de que quieres eliminar las bases de datos de seguridad? Esto requiere que el dispositivo tenga acceso Root activo o que estés en TWRP.')) {
      try {
        const res = await axios.post(`${API_BASE}/device/${selectedDevice}/bypass/twrp`);
        if (res.data.success) {
          customAlert(res.data.message, 'success');
          logAction('Bypass', 'Bypass TWRP/Root', 'Éxito');
        }
      } catch (err: any) {
        customAlert(err.response?.data?.error || err.message, 'error');
        logAction('Bypass', 'Bypass TWRP/Root', 'Falló');
      }
    }
  };

  const handleBruteForceStart = async () => {
    if (!selectedDevice) return;
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/bypass/bruteforce/start`, {
        startPin: bruteForceStartPin,
        endPin: bruteForceEndPin
      });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setBruteForceStatus({ active: true, currentPin: '', lastLog: 'Iniciando...' });
        logAction('Bypass', 'Fuerza Bruta ADB', 'Iniciado');
      }
    } catch (err: any) {
      customAlert(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleBruteForceStop = async () => {
    if (!selectedDevice) return;
    try {
      await axios.post(`${API_BASE}/device/${selectedDevice}/bypass/bruteforce/stop`);
      addToast('Solicitud de detención enviada.', 'info');
      setBruteForceStatus(prev => ({ ...prev, active: false }));
      logAction('Bypass', 'Fuerza Bruta ADB', 'Detenido');
    } catch (err: any) {
      customAlert(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleFlashBoot = async () => {
    if (!selectedDevice || !bootFile) return;
    if (selectedBrand === 'samsung') return customAlert('Samsung requires Odin. Fastboot flash will not work.');

    const formData = new FormData();
    formData.append('file', bootFile);

    setIsFlashing(true);
    try {
      const res = await axios.post(`${API_BASE}/device/${selectedDevice}/fastboot/flash`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        customAlert(res.data.message);
        setBootFile(null); // reset
      }
    } catch (err: any) {
      customAlert('Failed to flash boot image: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsFlashing(false);
    }
  };

  return (
    <div className="min-h-screen scifi-bg text-slate-50 font-sans flex relative overflow-hidden">
      <div className="scanline"></div>

      {/* Sidebar Navigation */}
      <aside className="w-72 bg-[#080d1a]/80 backdrop-blur-2xl border-r border-cyan-900/40 p-6 flex flex-col z-10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none"></div>
        <div className="flex items-center space-x-3 mb-10 relative">
          <Activity className="w-8 h-8 neon-text-cyan" />
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest">
              DIAGNÓSTICO
            </h1>
            <p className="text-[10px] text-cyan-500 font-mono tracking-[0.2em] opacity-80">v3.0 TECH HUD</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 pb-6">
          
          <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em] mt-4 mb-2 px-4 opacity-70">General</div>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'dashboard' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Panel de Control</span>
          </button>
          <button onClick={() => setActiveTab('maintenance')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'maintenance' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Wrench className="w-4 h-4" />
            <span>Mantenimiento</span>
          </button>
          <button onClick={() => setActiveTab('files')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'files' ? 'bg-yellow-500/20 text-yellow-400 shadow-[inset_0_0_20px_rgba(234,179,8,0.1)] border border-yellow-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <FolderOpen className="w-4 h-4" />
            <span>Explorador de Archivos</span>
          </button>

          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-6 mb-2 px-4 opacity-70">Diagnóstico Físico</div>
          <button onClick={() => setActiveTab('deepscanner')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'deepscanner' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Info className="w-4 h-4" />
            <span>Información Profunda</span>
          </button>
          <button onClick={() => setActiveTab('hardware')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'hardware' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Zap className="w-4 h-4" />
            <span>Test de Componentes</span>
          </button>
          <button onClick={() => setActiveTab('thermal')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'thermal' ? 'bg-orange-500/20 text-orange-400 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)] border border-orange-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Flame className="w-4 h-4" />
            <span>Monitor Térmico</span>
          </button>
          <button onClick={handleRepairTabClick} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'repair' ? 'bg-blue-500/20 text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] border border-blue-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Wrench className="w-4 h-4" />
            <span>Reparación y Test</span>
          </button>

          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-6 mb-2 px-4 opacity-70">Software y Red</div>
          <button onClick={() => setActiveTab('apps')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'apps' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Smartphone className="w-4 h-4" />
            <span>Gestor de Apps</span>
          </button>
          <button onClick={() => setActiveTab('taskmanager')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'taskmanager' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Cpu className="w-4 h-4" />
            <span>Gestor RAM en Vivo</span>
          </button>
          <button onClick={() => setActiveTab('network')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'network' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Activity className="w-4 h-4" />
            <span>Escáner de Red</span>
          </button>

          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mt-6 mb-2 px-4 opacity-70">Modo Desarrollador</div>
          <button onClick={() => setActiveTab('devtoggles')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'devtoggles' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <TerminalSquare className="w-4 h-4" />
            <span>Opciones de Dev</span>
          </button>
          <button onClick={() => setActiveTab('terminal')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'terminal' ? 'bg-cyan-500/20 text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] border border-cyan-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Terminal className="w-4 h-4" />
            <span>Terminal ADB Directa</span>
          </button>
          <button onClick={() => setActiveTab('screentweaks')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'screentweaks' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Maximize className="w-4 h-4" />
            <span>Ajustes Visuales (DPI)</span>
          </button>
          <button onClick={() => setActiveTab('screen')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'screen' ? 'bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] border border-emerald-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <MonitorPlay className="w-4 h-4" />
            <span>Pantalla (Mirror)</span>
          </button>
          <button onClick={() => setActiveTab('power')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'power' ? 'glass-panel neon-border-cyan neon-text-cyan' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Power className="w-4 h-4" />
            <span>Energía y Reinicio</span>
          </button>

          <div className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mt-6 mb-2 px-4 opacity-70">Hacking & Seguridad</div>
          <button onClick={() => setActiveTab('security')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'security' ? 'bg-pink-600/20 text-pink-500 shadow-[inset_0_0_20px_rgba(219,39,119,0.1)] border border-pink-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Lock className="w-4 h-4" />
            <span>Diagnóstico Anti-Malware</span>
          </button>
          <button onClick={() => setActiveTab('privacy')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'privacy' ? 'bg-rose-500/20 text-rose-400 shadow-[inset_0_0_20px_rgba(244,63,94,0.1)] border border-rose-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <EyeOff className="w-4 h-4" />
            <span>Auditoría de Privacidad</span>
          </button>
          <button onClick={() => setActiveTab('backup')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'backup' ? 'bg-indigo-500/20 text-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)] border border-indigo-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <HardDriveDownload className="w-4 h-4" />
            <span>Copias de Seguridad</span>
          </button>
          <button onClick={() => setActiveTab('root')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'root' ? 'bg-red-600/20 text-red-500 shadow-[inset_0_0_20px_rgba(220,38,38,0.1)] border border-red-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <ShieldAlert className="w-4 h-4" />
            <span>Root y Flasheo</span>
          </button>
          <button onClick={() => setActiveTab('bypass')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'bypass' ? 'bg-violet-500/20 text-violet-400 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)] border border-violet-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Unlock className="w-4 h-4" />
            <span>Bypass y Fuerza Bruta</span>
          </button>
          <button onClick={() => setActiveTab('spoofing')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${activeTab === 'spoofing' ? 'bg-purple-500/20 text-purple-400 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] border border-purple-500/20' : 'hover:bg-[#0a0a0f] text-slate-400 hover:text-slate-200 border border-transparent'}`}>
            <Radar className="w-4 h-4" />
            <span>Spoofing & Sensores</span>
          </button>

        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto relative z-10 custom-scrollbar">
        <header className="flex justify-between items-center mb-8 bg-[#080d1a]/50 p-6 rounded-2xl border border-cyan-900/30 backdrop-blur-md">
          <h2 className="text-3xl font-bold capitalize text-white drop-shadow-md tracking-wide">
            {activeTab === 'dashboard' ? 'Panel Principal' :
              activeTab === 'power' ? 'Energía y Reinicio' :
                activeTab === 'hardware' ? 'Test de Hardware' :
                  activeTab === 'apps' ? 'Gestor de Apps' :
                    activeTab === 'logs' ? 'Consola Logcat' :
                      activeTab === 'backup' ? 'Copias de Seguridad' :
                        activeTab === 'root' ? 'Root y Flasheo' :
                          activeTab === 'terminal' ? 'Terminal ADB Directa' :
                            activeTab === 'files' ? 'Explorador de Archivos' :
                              activeTab === 'screen' ? 'Transmisión de Pantalla' :
                                activeTab === 'privacy' ? 'Gestor Extremo de Privacidad' :
                                  activeTab === 'network' ? 'Escáner de Red y Conectividad' :
                                    activeTab === 'taskmanager' ? 'Gestor de Tareas en Vivo' :
                                      activeTab === 'screentweaks' ? 'Ajustes Visuales (Resolución/DPI)' :
                                        activeTab === 'devtoggles' ? 'Opciones de Desarrollador' :
                                          activeTab === 'thermal' ? 'Perfilador Térmico y Estrés' :
                                            activeTab === 'spoofing' ? 'Spoofing de Hardware (Modo Dev)' :
                                              'Diagnóstico de Seguridad'}
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={openReportBuilder}
              disabled={isGeneratingReport || !selectedDevice}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] text-white font-medium border border-purple-400/30 disabled:opacity-50"
            >
              <Printer className={`w-4 h-4 ${isGeneratingReport ? 'animate-pulse' : ''}`} />
              <span>{isGeneratingReport ? 'Generando...' : 'Generar Reporte'}</span>
            </button>
            <button
              onClick={fetchDevices}
              disabled={loading}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] text-white font-medium border border-cyan-400/30"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar Dispositivos</span>
            </button>
          </div>
        </header>

        {devices.length === 0 ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl">
              <Smartphone className="w-16 h-16 text-slate-500 mb-4 animate-bounce" />
              <p className="text-slate-300 text-2xl font-bold">No hay dispositivos conectados</p>
              <p className="text-slate-500 mt-2 text-center max-w-md">Para utilizar MoniRemo, necesitas conectar tu dispositivo mediante un cable USB y habilitar la Depuración USB.</p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-xl">
              <h3 className="text-2xl font-bold text-slate-100 mb-6 flex items-center"><Unlock className="w-6 h-6 mr-3 text-blue-400" /> Cómo activar la Depuración USB (ADB)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col">
                  <h4 className="font-bold text-blue-400 mb-3 text-lg">🌐 Paso Universal</h4>
                  <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2 flex-1">
                    <li>Ve a <strong>Ajustes</strong> &gt; <strong>Acerca del teléfono</strong>.</li>
                    <li>Busca <strong>Número de compilación</strong> (Build Number).</li>
                    <li>Toca rápidamente ese texto <strong>7 veces</strong> seguidas.</li>
                    <li>El sistema te dirá "¡Ya eres desarrollador!".</li>
                    <li>Vuelve atrás, busca <strong>Opciones de desarrollador</strong> y activa <strong>Depuración USB</strong>.</li>
                  </ol>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col">
                  <h4 className="font-bold text-orange-400 mb-3 text-lg">📱 Xiaomi / POCO</h4>
                  <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2 flex-1">
                    <li>Ve a <strong>Ajustes</strong> &gt; <strong>Sobre el teléfono</strong>.</li>
                    <li>Toca 7 veces en <strong>Versión MIUI / HyperOS</strong>.</li>
                    <li>Ve a <strong>Ajustes adicionales</strong> &gt; <strong>Opciones de desarrollador</strong>.</li>
                    <li>Activa <strong>Depuración USB</strong>.</li>
                    <li className="text-orange-300 font-semibold mt-2 list-none">Importante: Activa también "Depuración USB (Ajustes de seguridad)" para poder borrar bloatware.</li>
                  </ol>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col">
                  <h4 className="font-bold text-indigo-400 mb-3 text-lg">✨ Samsung Galaxy</h4>
                  <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2 flex-1">
                    <li>Ve a <strong>Ajustes</strong> &gt; <strong>Acerca del teléfono</strong> &gt; <strong>Información de software</strong>.</li>
                    <li>Toca 7 veces en <strong>Número de compilación</strong>.</li>
                    <li>Vuelve a la pantalla principal de Ajustes, baja hasta el final y entra en <strong>Opciones de desarrollador</strong>.</li>
                    <li>Activa <strong>Depuración USB</strong>.</li>
                  </ol>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col">
                  <h4 className="font-bold text-teal-400 mb-3 text-lg">⚡ Motorola / Pixel</h4>
                  <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2 flex-1">
                    <li>Ve a <strong>Ajustes</strong> &gt; <strong>Acerca del teléfono</strong>.</li>
                    <li>Baja del todo y toca 7 veces en <strong>Número de compilación</strong>.</li>
                    <li>Ve a <strong>Sistema</strong> &gt; <strong>Opciones avanzadas</strong> &gt; <strong>Opciones de para desarrolladores</strong>.</li>
                    <li>Activa <strong>Depuración USB</strong>.</li>
                  </ol>
                </div>
              </div>

              <div className="mt-8 bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  <strong>Paso Final:</strong> Una vez activada la opción, conecta el teléfono por cable a la computadora. En la pantalla de tu celular aparecerá un mensaje preguntando: <em>"¿Permitir depuración USB desde esta computadora?"</em>. Selecciona <strong>"Permitir siempre"</strong> y presiona OK. Luego, haz clic en el botón "Actualizar Dispositivos".
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Device Selector Sidebar */}
            <div className="space-y-4 lg:col-span-1">
              <h3 className="text-xs font-bold mb-4 text-slate-500 uppercase tracking-widest">Dispositivos Conectados</h3>
              {devices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedDevice === device.id
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.02]'
                    : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <Smartphone className={selectedDevice === device.id ? 'text-blue-400' : 'text-slate-400'} />
                    <div>
                      <p className="font-semibold text-sm text-slate-200">{device.id}</p>
                      <p className="text-xs text-slate-500 capitalize">{device.type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Content */}
            {selectedDevice && (
              <div className="lg:col-span-3 space-y-6">

                {/* TAB RENDERING WITH FRAMER MOTION */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                    className="w-full"
                  >
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                      <>
                        <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                          <div className="flex items-center space-x-3 mb-8 relative z-10">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                              <Info className="text-blue-400 w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-100">Información del Sistema</h3>
                          </div>

                          {deviceInfo ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Fabricante</p>
                                <p className="text-xl font-bold text-white capitalize truncate" title={deviceInfo.manufacturer}>{deviceInfo.manufacturer || 'Desconocido'}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Modelo</p>
                                <p className="text-xl font-bold text-white uppercase truncate" title={deviceInfo.model}>{deviceInfo.model || 'Desconocido'}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Versión Android</p>
                                <p className="text-xl font-bold text-white truncate" title={deviceInfo.androidVersion}>{deviceInfo.androidVersion || 'Desconocida'} <span className="text-sm font-normal text-slate-400">(SDK {deviceInfo.sdkLevel})</span></p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Parche Seguridad</p>
                                <p className="text-xl font-bold text-white truncate" title={deviceInfo.securityPatch}>{deviceInfo.securityPatch || 'Desconocido'}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Número de Serie</p>
                                <p className="text-xl font-bold text-white font-mono truncate" title={deviceInfo.serial}>{deviceInfo.serial || 'Desconocido'}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Hardware / Placa</p>
                                <p className="text-xl font-bold text-white truncate" title={`${deviceInfo.hardware} / ${deviceInfo.board}`}>{deviceInfo.hardware} <span className="text-sm font-normal text-slate-400">/ {deviceInfo.board}</span></p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Resolución / DPI</p>
                                <p className="text-xl font-bold text-white truncate" title={`${deviceInfo.resolution} / ${deviceInfo.density}`}>{deviceInfo.resolution} <span className="text-sm font-normal text-slate-400">/ {deviceInfo.density}dpi</span></p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Arquitectura (ABI)</p>
                                <p className="text-xl font-bold text-white truncate" title={deviceInfo.cpuAbi}>{deviceInfo.cpuAbi || 'Desconocida'}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 md:col-span-2">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Bootloader</p>
                                <p className="text-xl font-bold text-white truncate" title={deviceInfo.bootloader}>{deviceInfo.bootloader || 'Desconocido'}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 md:col-span-2">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">IMEI (Identidad del Equipo)</p>
                                <p className="text-xl font-bold text-green-400 font-mono truncate" title={deviceInfo.imei}>{deviceInfo.imei}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 md:col-span-4">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Banda Base (Baseband)</p>
                                <p className="text-lg font-bold text-white truncate" title={deviceInfo.baseband}>{deviceInfo.baseband || 'Desconocida'}</p>
                              </div>
                              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 md:col-span-4">
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Huella de Compilación (Fingerprint)</p>
                                  <button
                                    onClick={() => setShowRawProps(true)}
                                    className="text-xs bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white px-3 py-1 rounded-lg transition-colors border border-indigo-500/30 font-medium"
                                  >
                                    Ver Todas las Propiedades (RAW)
                                  </button>
                                </div>
                                <p className="text-sm font-mono text-slate-300 break-all">{deviceInfo.fingerprint || 'Desconocida'}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="animate-pulse flex space-x-4"><div className="h-10 bg-slate-700 rounded w-full"></div></div>
                          )}
                        </div>

                        <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden mt-6">
                          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl"></div>
                          <div className="flex items-center space-x-3 mb-8 relative z-10">
                            <div className="p-3 bg-green-500/20 rounded-xl">
                              <Battery className="text-green-400 w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-100">Estado de Batería</h3>
                          </div>

                          {batteryInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Nivel de Carga</p>
                                <p className="text-4xl font-black text-green-400 drop-shadow-md">{batteryInfo['level']}%</p>
                              </div>
                              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Temperatura</p>
                                <p className="text-4xl font-black text-white drop-shadow-md">{(parseInt(batteryInfo['temperature'] || '0') / 10).toFixed(1)}°C</p>
                              </div>
                              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Salud</p>
                                <p className="text-3xl font-black text-white capitalize drop-shadow-md">
                                  {batteryInfo['health'] === '2' ? 'Buena' : 'Desconocida'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="animate-pulse flex space-x-4"><div className="h-10 bg-slate-700 rounded w-full"></div></div>
                          )}
                        </div>

                        {/* ADVANCED DIAGNOSTICS */}
                        <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden mt-6">
                          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>
                          <div className="flex items-center space-x-3 mb-8 relative z-10">
                            <div className="p-3 bg-orange-500/20 rounded-xl">
                              <Cpu className="text-orange-400 w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-100">Diagnóstico Avanzado en Vivo</h3>
                          </div>

                          {advancedDiagnostics ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                              {/* CPU */}
                              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                                <h4 className="font-bold text-orange-400 flex items-center mb-4"><Activity className="w-5 h-5 mr-2" /> Top Consumo de CPU</h4>
                                {advancedDiagnostics.cpu && advancedDiagnostics.cpu.length > 0 ? (
                                  <ul className="space-y-3">
                                    {advancedDiagnostics.cpu.map((c: any, i: number) => (
                                      <li key={i} className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2">
                                        <span className="text-slate-300 truncate max-w-[150px]" title={c.process}>{c.process}</span>
                                        <span className="font-bold text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded">{c.percent}%</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-slate-500 text-sm">No se pudo obtener la carga de CPU.</p>
                                )}
                              </div>

                              {/* Storage */}
                              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                                <h4 className="font-bold text-purple-400 flex items-center mb-4"><Database className="w-5 h-5 mr-2" /> Uso de Particiones</h4>
                                {advancedDiagnostics.storage && advancedDiagnostics.storage.length > 0 ? (
                                  <div className="space-y-4">
                                    {advancedDiagnostics.storage.map((s: any, i: number) => (
                                      <div key={i} className="text-sm">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-slate-300 font-mono text-xs">{s.mount}</span>
                                          <span className="text-purple-300 font-bold">{s.free} libres</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                          <div className={`h-2 rounded-full ${parseInt(s.percent) > 85 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: s.percent }}></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-500 text-sm">No se pudo obtener el uso de disco.</p>
                                )}
                              </div>

                              {/* Thermal */}
                              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col justify-center">
                                <h4 className="font-bold text-red-400 flex items-center mb-4"><Thermometer className="w-5 h-5 mr-2" /> Temperatura General</h4>
                                <div className="flex items-center justify-center space-x-4">
                                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 ${parseFloat(advancedDiagnostics.temperature) > 40 ? 'border-red-500 text-red-400 bg-red-500/20' : 'border-green-500 text-green-400 bg-green-500/20'}`}>
                                    {advancedDiagnostics.temperature}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-slate-300">
                                      {parseFloat(advancedDiagnostics.temperature) > 40 ? '¡Alerta! Temperatura alta detectada. Riesgo de estrangulamiento térmico (Throttling).' : 'Temperatura en rangos normales de operación.'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                            </div>
                          ) : (
                            <div className="animate-pulse flex space-x-4"><div className="h-24 bg-slate-700 rounded-2xl w-full"></div></div>
                          )}
                        </div>
                      </>
                    )}

                    {/* POWER TAB */}
                    {activeTab === 'power' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Power className="text-purple-400 w-6 h-6" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-100">Menú de Reinicio Avanzado</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                          <button onClick={() => handleReboot('normal')} className="p-8 bg-slate-800/60 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg">
                            <Power className="w-10 h-10 text-slate-400 group-hover:text-purple-400 transition-colors drop-shadow-md" />
                            <span className="font-bold text-xl text-white">Reinicio Normal</span>
                            <span className="text-sm text-slate-400 text-center">Reinicio estándar del sistema operativo</span>
                          </button>
                          <button onClick={() => handleReboot('recovery')} className="p-8 bg-slate-800/60 hover:bg-orange-900/40 border border-slate-700 hover:border-orange-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg">
                            <RefreshCw className="w-10 h-10 text-slate-400 group-hover:text-orange-400 transition-colors drop-shadow-md" />
                            <span className="font-bold text-xl text-white">Modo Recovery</span>
                            <span className="text-sm text-slate-400 text-center">Para Factory Reset o instalar OTAs</span>
                          </button>
                          <button onClick={() => handleReboot('safe_mode')} className="p-8 bg-slate-800/60 hover:bg-yellow-900/40 border border-slate-700 hover:border-yellow-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg">
                            <Activity className="w-10 h-10 text-slate-400 group-hover:text-yellow-400 transition-colors drop-shadow-md" />
                            <span className="font-bold text-xl text-white">Modo Seguro</span>
                            <span className="text-sm text-slate-400 text-center">Inicia sin apps de terceros (Para virus o bugs)</span>
                          </button>
                          <button onClick={() => handleReboot('bootloader')} className="p-8 bg-slate-800/60 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg">
                            <PlaySquare className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors drop-shadow-md" />
                            <span className="font-bold text-xl text-white">Modo Fastboot</span>
                            <span className="text-sm text-slate-400 text-center">Bootloader para flashear imágenes (.img)</span>
                          </button>
                          <button onClick={() => handleReboot('edl')} className="p-8 bg-slate-800/60 hover:bg-red-900/40 border border-slate-700 hover:border-red-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg">
                            <Zap className="w-10 h-10 text-slate-400 group-hover:text-red-400 transition-colors drop-shadow-md" />
                            <span className="font-bold text-xl text-white">Modo EDL</span>
                            <span className="text-sm text-slate-400 text-center">Modo de Emergencia (Solo Qualcomm)</span>
                          </button>
                        </div>
                      </div>
                    )}
                    {/* HARDWARE TEST TAB */}
                    {activeTab === 'hardware' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-green-500/20 rounded-xl">
                            <Zap className="text-green-400 w-6 h-6" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-100">Tests Interactivos de Hardware</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-10">
                          <button onClick={() => handleTest('vibrate')} className="p-5 bg-slate-800/60 hover:bg-green-900/40 border border-slate-700 hover:border-green-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <Activity className="w-8 h-8 text-slate-400 group-hover:text-green-400 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-white">Vibración</span>
                          </button>
                          <button onClick={() => handleTest('audio')} className="p-5 bg-slate-800/60 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <Volume2 className="w-8 h-8 text-slate-400 group-hover:text-blue-400 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-white">Test de Audio</span>
                          </button>
                          <button onClick={() => handleTest('camera')} className="p-5 bg-slate-800/60 hover:bg-pink-900/40 border border-slate-700 hover:border-pink-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <Camera className="w-8 h-8 text-slate-400 group-hover:text-pink-400 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-white">Test de Cámara</span>
                          </button>
                          <button onClick={() => handleTest('screen')} className="p-5 bg-slate-800/60 hover:bg-cyan-900/40 border border-slate-700 hover:border-cyan-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <MonitorPlay className="w-8 h-8 text-slate-400 group-hover:text-cyan-400 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-white">Test de Pantalla</span>
                          </button>
                          <button onClick={() => handleTest('brightness_max')} className="p-5 bg-slate-800/60 hover:bg-yellow-900/40 border border-slate-700 hover:border-yellow-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <Sun className="w-8 h-8 text-slate-400 group-hover:text-yellow-400 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-white text-center">Brillo Máximo</span>
                          </button>
                          <button onClick={() => handleTest('brightness_min')} className="p-5 bg-slate-800/60 hover:bg-slate-700/40 border border-slate-700 hover:border-slate-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <Moon className="w-8 h-8 text-slate-400 group-hover:text-slate-300 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-white text-center">Brillo Mínimo</span>
                          </button>
                          <button onClick={() => handleTest('power_btn')} className="p-5 bg-slate-800/60 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <PowerOff className="w-8 h-8 text-slate-400 group-hover:text-purple-400 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-white text-center">Bloquear Pantalla</span>
                          </button>
                          <button onClick={() => handleTest('hidden_menu')} className="p-5 bg-slate-800/60 hover:bg-red-900/40 border border-slate-700 hover:border-red-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 group shadow-lg">
                            <ShieldQuestion className="w-8 h-8 text-slate-400 group-hover:text-red-400 transition-colors drop-shadow-md" />
                            <span className="font-semibold text-sm text-center text-white">Menú Oculto<br /><span className="text-xs text-slate-400">(*#0*#)</span></span>
                          </button>
                        </div>

                        <div className="flex items-center space-x-3 mb-6 relative z-10">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Activity className="text-blue-400 w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-100">Sensores del Sistema</h3>
                        </div>
                        <div className="bg-slate-900/60 rounded-2xl border border-slate-700/50 p-5 max-h-96 overflow-y-auto custom-scrollbar relative z-10 shadow-inner">
                          {sensors.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {sensors.map((sensor, i) => (
                                <div
                                  key={i}
                                  onClick={() => setSelectedSensor(sensor)}
                                  className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 cursor-pointer transition-all group shadow-sm hover:shadow-md"
                                >
                                  <p className="font-bold text-sm text-slate-200 truncate group-hover:text-blue-400 transition-colors" title={sensor.name}>{sensor.name}</p>
                                  <div className="mt-3 space-y-2">
                                    <p className="text-xs text-slate-400 flex justify-between items-center">
                                      <span className="uppercase tracking-wider">Tipo:</span> <span className="text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded truncate max-w-[120px]" title={sensor.type}>{sensor.type.replace('android.sensor.', '')}</span>
                                    </p>
                                    <p className="text-xs text-slate-400 flex justify-between items-center">
                                      <span className="uppercase tracking-wider">Fab:</span> <span className="text-slate-300 truncate max-w-[120px]" title={sensor.vendor}>{sensor.vendor}</span>
                                    </p>
                                    <p className="text-xs text-green-400 flex justify-between items-center mt-2 pt-2 border-t border-slate-700/50 font-medium">
                                      <span>Estado:</span> <span>Detectado ✓</span>
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                              <RefreshCw className="w-10 h-10 mb-4 animate-spin text-blue-500/50" />
                              <p className="font-medium text-lg text-slate-400">Escaneando sensores de hardware...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}


                    {/* APP MANAGER TAB */}
                    {activeTab === 'apps' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="p-3 bg-orange-500/20 rounded-xl">
                              <LayoutGrid className="text-orange-400 w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-100">Paquetes Instalados</h3>
                            <span className="bg-orange-950 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{apps.length} Apps</span>
                          </div>
                          <div className="relative overflow-hidden group">
                            <input
                              type="file"
                              accept=".apk"
                              onChange={handleApkUpload}
                              disabled={uploadingApk}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            <button className="flex items-center space-x-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.4)] text-white font-medium">
                              {uploadingApk ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                              <span>{uploadingApk ? 'Instalando APK...' : 'Subir e Instalar APK'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex border-b border-slate-700/50 mb-6 relative z-10 justify-between items-center">
                          <div className="flex">
                            <button
                              onClick={() => setAppViewMode('user')}
                              className={`pb-3 px-6 text-sm font-bold transition-all border-b-2 ${appViewMode === 'user' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            >
                              Apps de Usuario ({apps.filter(a => a.type === 'user').length})
                            </button>
                            <button
                              onClick={() => setAppViewMode('system')}
                              className={`pb-3 px-6 text-sm font-bold transition-all border-b-2 ${appViewMode === 'system' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                            >
                              Componentes del Sistema ({apps.filter(a => a.type === 'system').length})
                            </button>
                          </div>
                          <button
                            onClick={handleDestroyBloatware}
                            className="mb-3 px-4 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
                            title="Elimina de golpe todas las aplicaciones del fabricante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Destruir Bloatware</span>
                          </button>
                        </div>

                        <div className="h-[480px] overflow-y-auto pr-4 custom-scrollbar relative z-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {apps.filter(a => a.type === appViewMode).length > 0 ? apps.filter(a => a.type === appViewMode).map((app) => (
                              <div
                                key={app.packageName}
                                onClick={() => setSelectedApp(app)}
                                className="flex flex-col bg-slate-800/60 p-5 rounded-2xl border border-slate-700/80 hover:border-orange-500/50 hover:bg-slate-800 transition-all shadow-sm cursor-pointer group"
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center space-x-3 w-full pr-2">
                                    <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-600/50">
                                      {appInfos[app.packageName]?.icon ? (
                                        <img src={appInfos[app.packageName].icon} alt={app.packageName} className="w-full h-full object-cover" />
                                      ) : (
                                        <Box className="w-6 h-6 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-bold text-slate-100 truncate text-sm group-hover:text-orange-400 transition-colors">
                                        {appInfos[app.packageName]?.title || (
                                          <span className="flex items-center text-slate-400"><RefreshCw className="w-3 h-3 animate-spin mr-2" /> Cargando...</span>
                                        )}
                                      </h4>
                                      <p className="font-mono text-xs text-slate-500 truncate mt-0.5">{app.packageName}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-auto pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${app.importance === 1 ? 'bg-red-500/20 text-red-400' :
                                    app.importance === 2 ? 'bg-blue-500/20 text-blue-400' :
                                      app.importance === 3 ? 'bg-purple-500/20 text-purple-400' :
                                        app.importance === 4 ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-green-500/20 text-green-400'
                                    }`}>
                                    {app.category}
                                  </span>
                                </div>
                              </div>
                            )) : (
                              <div className="col-span-full animate-pulse flex flex-col space-y-3">
                                <div className="h-24 bg-slate-800/50 rounded-2xl w-full"></div>
                                <div className="h-24 bg-slate-800/50 rounded-2xl w-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LOGCAT TAB */}
                    {activeTab === 'logs' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col h-[650px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-red-500/20 rounded-xl">
                              <TerminalSquare className="text-red-400 w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-100">Consola de Sistema (Logcat)</h3>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => setLogs([])}
                              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-sm transition-all border border-slate-700 hover:border-slate-500 shadow-sm font-medium"
                            >
                              Limpiar
                            </button>
                            <button
                              onClick={() => setIsLogging(!isLogging)}
                              className={`px-5 py-2 flex items-center space-x-2 rounded-lg font-bold transition-all shadow-md ${isLogging ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                }`}
                            >
                              {isLogging ? <><Square className="w-4 h-4 mr-1" /> Detener</> : <><Play className="w-4 h-4 mr-1" /> Iniciar</>}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 bg-black/80 rounded-2xl p-5 overflow-y-auto font-mono text-xs border border-slate-700 shadow-inner flex flex-col-reverse custom-scrollbar relative z-10">
                          <div className="space-y-1.5 tracking-wide">
                            {logs.length === 0 && !isLogging && (
                              <div className="text-slate-500 text-center mt-12 text-sm font-sans flex flex-col items-center">
                                <TerminalSquare className="w-12 h-12 mb-3 opacity-20" />
                                Haz clic en Iniciar para ver los registros del dispositivo en tiempo real...
                              </div>
                            )}
                            {logs.map((log, i) => {
                              let color = 'text-slate-300';
                              if (log.startsWith('E/')) color = 'text-red-400 font-bold';
                              if (log.startsWith('W/')) color = 'text-yellow-400';
                              if (log.startsWith('I/')) color = 'text-green-400';
                              if (log.startsWith('D/')) color = 'text-blue-400';
                              return <div key={i} className={`whitespace-pre-wrap ${color} break-words`}>{log}</div>;
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BACKUP TAB */}
                    {activeTab === 'backup' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-indigo-500/20 rounded-xl">
                            <HardDriveDownload className="text-indigo-400 w-6 h-6" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-100">Copias de Seguridad (Backup)</h3>
                        </div>

                        <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-2xl p-5 mb-8 relative z-10 flex space-x-4 shadow-sm">
                          <Info className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-indigo-300 mb-1 text-lg">Aviso Importante</h4>
                            <p className="text-sm text-indigo-200/80 leading-relaxed">Por razones de seguridad, los dispositivos Android modernos bloquean la extracción completa del sistema operativo sin acceso Root. La herramienta de <strong>ADB Backup</strong> intentará respaldar aplicaciones y sus datos compatibles, pero requerirá que desbloquees la pantalla del teléfono y autorices la copia manualmente.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-8">
                          <button onClick={startBackup} className="p-8 bg-slate-800/60 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500/50 rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg">
                            <HardDriveDownload className="w-10 h-10 text-slate-400 group-hover:text-indigo-400 transition-colors drop-shadow-md" />
                            <span className="font-bold text-xl text-white">Respaldo ADB Legacy</span>
                            <span className="text-sm text-slate-400 text-center">Crear copia de seguridad en el servidor local</span>
                          </button>
                          <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3 opacity-40 cursor-not-allowed">
                            <HardDriveDownload className="w-10 h-10 text-slate-600" />
                            <span className="font-bold text-xl text-slate-500">Extraer Archivos Multimedia</span>
                            <span className="text-sm text-slate-600 text-center">Próximamente...</span>
                          </div>
                        </div>

                        {activeBackupTask.active && (
                          <div className="bg-slate-900/80 border border-indigo-500/50 rounded-2xl p-6 mb-8 relative z-10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-indigo-400 font-bold flex items-center">
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                {activeBackupTask.type === 'backup' ? 'Generando Copia de Seguridad...' : 'Restaurando Copia de Seguridad...'}
                              </h4>
                              <span className="text-xs text-slate-400 font-mono">{activeBackupTask.filename}</span>
                            </div>
                            <p className="text-sm text-slate-300 mb-4">
                              Esta operación se está ejecutando en segundo plano. Por favor, mantén la pantalla del celular encendida y desbloqueada.
                            </p>
                            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                              <div className="bg-indigo-500 h-2.5 rounded-full w-full animate-pulse opacity-80" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                            </div>
                          </div>
                        )}

                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-bold text-slate-100 flex items-center"><HardDriveDownload className="w-5 h-5 mr-2 text-indigo-400" /> Archivos de Respaldo Locales</h4>
                            <button onClick={fetchBackupsList} className="p-2 hover:bg-slate-800 rounded-full transition-colors" title="Actualizar">
                              <RefreshCw className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>

                          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 overflow-y-auto max-h-64 custom-scrollbar shadow-inner">
                            {backupsList.length > 0 ? (
                              <div className="space-y-3">
                                {backupsList.map((backup, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700 hover:border-indigo-500/30 transition-all">
                                    <div>
                                      <p className="font-mono text-sm text-slate-200 font-medium mb-1">{backup.filename}</p>
                                      <p className="text-xs text-slate-400">
                                        {(backup.size / (1024 * 1024)).toFixed(2)} MB • {new Date(backup.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleDownloadBackup(backup.filename)}
                                        className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white text-indigo-300 rounded-lg text-sm transition-all border border-indigo-500/30 hover:border-indigo-500 font-medium shadow-sm flex items-center"
                                      >
                                        <HardDriveDownload className="w-4 h-4 mr-2" />
                                        Descargar al Equipo
                                      </button>
                                      <button
                                        onClick={() => handleRestoreBackup(backup.filename)}
                                        className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 rounded-lg text-sm transition-all border border-emerald-500/30 hover:border-emerald-500 font-medium shadow-sm flex items-center"
                                      >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Restaurar en Dispositivo
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBackup(backup.filename)}
                                        className="p-2 bg-rose-600/20 hover:bg-rose-600 hover:text-white text-rose-300 rounded-lg transition-all border border-rose-500/30 hover:border-rose-500 shadow-sm"
                                        title="Eliminar Respaldo"
                                      >
                                        <X className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500">
                                No hay copias de seguridad disponibles en el servidor local.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ROOT & FLASHING TAB */}
                    {activeTab === 'root' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
                        {!disclaimerAccepted ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center relative z-10">
                            <ShieldAlert className="w-24 h-24 text-red-500 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                            <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-wider">ADVERTENCIA CRÍTICA</h2>
                            <div className="bg-red-950/40 border border-red-500/50 p-8 rounded-2xl max-w-2xl mb-8 shadow-inner backdrop-blur-sm">
                              <p className="text-red-200 text-lg mb-4 font-medium leading-relaxed">
                                Rootear o modificar el gestor de arranque (bootloader) conlleva riesgos severos. Puedes "brickear" el dispositivo permanentemente, anular la garantía o exponerlo a vulnerabilidades críticas de seguridad.
                              </p>
                              <p className="text-red-400 text-lg font-black uppercase">
                                Esta herramienta se proporciona ESTRICTAMENTE para fines de investigación y diagnóstico.
                              </p>
                            </div>
                            <p className="mb-4 text-slate-300 text-lg">Para continuar, por favor escribe <strong className="text-white bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-600">ACEPTO</strong> a continuación.</p>
                            <input
                              type="text"
                              placeholder="Escribe ACEPTO"
                              className="px-6 py-4 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white mb-6 focus:outline-none focus:border-red-500 text-center text-2xl tracking-widest uppercase shadow-inner"
                              value={disclaimerInput}
                              onChange={(e) => setDisclaimerInput(e.target.value.toUpperCase())}
                            />
                            <button
                              disabled={disclaimerInput !== 'ACEPTO'}
                              onClick={() => setDisclaimerAccepted(true)}
                              className={`px-10 py-4 rounded-xl font-bold transition-all text-lg ${disclaimerInput === 'ACEPTO' ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_25px_rgba(220,38,38,0.5)] scale-105' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                            >
                              Entiendo los Riesgos
                            </button>
                          </div>
                        ) : (
                          <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-6">
                              <div className="p-3 bg-red-500/20 rounded-xl">
                                <ShieldAlert className="text-red-500 w-6 h-6" />
                              </div>
                              <h3 className="text-2xl font-bold text-slate-100">Asistente Root y Flasheo</h3>
                            </div>

                            <div className="flex bg-slate-800/80 p-1.5 rounded-xl mb-8 w-max border border-slate-700 shadow-inner">
                              <button onClick={() => setRootMode('auto')} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center space-x-2 ${rootMode === 'auto' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}>
                                <Zap className="w-4 h-4" />
                                <span>AutoPatch (Recomendado)</span>
                              </button>
                              <button onClick={() => setRootMode('manual')} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center space-x-2 ${rootMode === 'manual' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}>
                                <Wrench className="w-4 h-4" />
                                <span>Modo Manual</span>
                              </button>
                            </div>

                            {rootMode === 'auto' && (
                              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 mb-8 shadow-inner">
                                <div className="flex items-start space-x-4 mb-6">
                                  <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                                    <Cpu className="text-indigo-400 w-8 h-8" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-200 text-xl mb-1">Motor de Parcheo Automático</h4>
                                    <p className="text-sm text-slate-400">
                                      El servidor utilizará la CPU de tu dispositivo Android de forma invisible para inyectar los binarios de Magisk en el firmware original, parcheándolo y flasheándolo de manera 100% automática.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-start space-x-3 text-blue-200 bg-blue-950/40 p-4 rounded-xl border border-blue-500/30 mb-6">
                                  <Info className="w-6 h-6 flex-shrink-0 mt-0.5 text-blue-400" />
                                  <div className="text-sm">
                                    <strong className="text-base text-blue-300">Requisito Importante:</strong><br />
                                    Para que este motor funcione, el teléfono debe estar <strong>Encendido de forma normal con Depuración USB habilitada</strong>. El servidor se encargará de reiniciarlo a modo Fastboot automáticamente cuando sea necesario. Samsung no es compatible con el motor automático.
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                                    <h5 className="font-bold text-slate-300 mb-3">1. Sube tu imagen original</h5>
                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${selectedBrand === 'samsung' ? 'border-slate-700 bg-slate-900' : 'border-indigo-500/40 bg-indigo-900/20 hover:bg-indigo-900/40 hover:border-indigo-400'}`}>
                                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className={`w-8 h-8 mb-3 ${selectedBrand === 'samsung' ? 'text-slate-600' : 'text-indigo-400'}`} />
                                        <p className="text-sm text-slate-300 font-medium text-center px-4">{autoPatchFile ? autoPatchFile.name : 'Arrastra el boot.img, init_boot.img ORIGINAL o el .zip del firmware aquí'}</p>
                                      </div>
                                      <input type="file" className="hidden" accept=".img,.zip" onChange={(e) => e.target.files && setAutoPatchFile(e.target.files[0])} disabled={selectedBrand === 'samsung' || isAutoPatching} />
                                    </label>
                                  </div>

                                  <div className="flex flex-col justify-center space-y-4">
                                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                      <label className="block text-sm font-medium text-slate-400 mb-2">Partición de destino:</label>
                                      <select
                                        className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                        value={autoPatchPartition}
                                        onChange={(e: any) => setAutoPatchPartition(e.target.value)}
                                      >
                                        <option value="boot">boot (Android 12 y anterior)</option>
                                        <option value="init_boot">init_boot (Android 13 y superior)</option>
                                      </select>
                                    </div>

                                    <button
                                      onClick={handleAutoPatch}
                                      disabled={!autoPatchFile || selectedBrand === 'samsung' || isAutoPatching}
                                      className={`w-full py-4 rounded-xl font-bold transition-all text-lg shadow-lg flex items-center justify-center space-x-3 ${(!autoPatchFile || selectedBrand === 'samsung' || isAutoPatching) ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'}`}
                                    >
                                      {isAutoPatching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                      <span>{isAutoPatching ? 'Procesando AutoPatch...' : 'Iniciar AutoPatch & Flasheo'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {rootMode === 'manual' && (
                              <>
                                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 mb-8 shadow-inner">
                                  <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                                    <h4 className="font-bold text-slate-200 text-lg">Guía Específica por Marca</h4>
                                    <select
                                      className="bg-slate-800 text-white border border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none font-medium cursor-pointer hover:bg-slate-700 transition-colors"
                                      value={selectedBrand}
                                      onChange={(e) => setSelectedBrand(e.target.value)}
                                    >
                                      <option value="pixel">Google Pixel / Motorola / OnePlus</option>
                                      <option value="xiaomi">Xiaomi / POCO / Redmi</option>
                                      <option value="samsung">Samsung Galaxy</option>
                                    </select>
                                  </div>

                                  <div className="text-sm text-slate-300 space-y-2 leading-relaxed">
                                    {selectedBrand === 'pixel' && (
                                      <ol className="list-decimal list-inside space-y-2 bg-slate-800/40 p-4 rounded-xl">
                                        <li>Reinicia en modo Bootloader (Fastboot mode).</li>
                                        <li>Usa el botón de <strong className="text-slate-100 font-bold">Desbloquear Bootloader</strong> (Borrará todos los datos).</li>
                                        <li>Parchea tu archivo <code>boot.img</code> original usando Magisk Manager en el teléfono.</li>
                                        <li>Sube la imagen parcheada aquí abajo y haz clic en Flashear.</li>
                                      </ol>
                                    )}
                                    {selectedBrand === 'xiaomi' && (
                                      <ol className="list-decimal list-inside space-y-2 bg-slate-800/40 p-4 rounded-xl">
                                        <li>Vincula tu cuenta Mi en Opciones de Desarrollador -&gt; Mi Unlock Status.</li>
                                        <li>Usa la herramienta oficial <strong>Mi Unlock Tool</strong> en Windows (El botón de desbloqueo aquí fallará).</li>
                                        <li>Una vez desbloqueado, parchea el archivo <code>boot.img</code> con Magisk.</li>
                                        <li>Sube la imagen parcheada aquí abajo y haz clic en Flashear.</li>
                                      </ol>
                                    )}
                                    {selectedBrand === 'samsung' && (
                                      <div className="flex items-start space-x-3 text-orange-200 bg-orange-950/40 p-5 rounded-xl border border-orange-500/30">
                                        <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-orange-400" />
                                        <div>
                                          <strong className="text-lg">Samsung NO utiliza Fastboot.</strong><br /><br />
                                          Para rootear dispositivos Samsung, debes desbloquear el OEM en ajustes, entrar al Modo Descarga (Download Mode) y usar el programa ODIN en una PC para flashear un archivo <code>AP.tar</code> parcheado con Magisk. Esta herramienta web no puede flashear dispositivos Samsung.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {deviceInfo && (
                                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 mb-8 shadow-inner">
                                    <h4 className="font-bold text-slate-200 text-lg mb-4 flex items-center">
                                      <Globe className="w-5 h-5 mr-2 text-blue-400" />
                                      Buscar Firmware Original (Stock ROM)
                                    </h4>
                                    <p className="text-sm text-slate-400 mb-4">
                                      Para realizar el proceso de root necesitas extraer el archivo <code className="bg-slate-800 px-1 rounded text-slate-300">boot.img</code> o <code className="bg-slate-800 px-1 rounded text-slate-300">init_boot.img</code> del firmware exacto que tiene instalado tu dispositivo. Usa los siguientes enlaces generados para tu <strong className="text-white">{deviceInfo.manufacturer} {deviceInfo.model}</strong>:
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                      <a href={`https://www.google.com/search?q=Stock+ROM+Firmware+${deviceInfo.manufacturer}+${deviceInfo.model}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg border border-slate-700 transition-colors text-sm font-bold flex items-center">
                                        Google Search
                                      </a>
                                      <a href={`https://xdaforums.com/search/1/?q=${deviceInfo.model}+firmware`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-lg border border-slate-700 transition-colors text-sm font-bold flex items-center">
                                        Foros XDA
                                      </a>
                                      {deviceInfo.manufacturer?.toLowerCase().includes('samsung') && (
                                        <a href={`https://samfw.com/firmware/${deviceInfo.model}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg border border-slate-700 transition-colors text-sm font-bold flex items-center">
                                          SamFW (Samsung)
                                        </a>
                                      )}
                                      {(deviceInfo.manufacturer?.toLowerCase().includes('xiaomi') || deviceInfo.manufacturer?.toLowerCase().includes('poco') || deviceInfo.manufacturer?.toLowerCase().includes('redmi')) && (
                                        <a href={`https://mifirm.net/model/${deviceInfo.board || ''}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-500 rounded-lg border border-slate-700 transition-colors text-sm font-bold flex items-center">
                                          MiFirm (Xiaomi)
                                        </a>
                                      )}
                                      {deviceInfo.manufacturer?.toLowerCase().includes('google') && (
                                        <a href="https://developers.google.com/android/images" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-green-400 rounded-lg border border-slate-700 transition-colors text-sm font-bold flex items-center">
                                          Google Factory Images
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                  <button onClick={handleUnlockBootloader} disabled={selectedBrand === 'samsung'} className={`p-8 border rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg ${selectedBrand === 'samsung' ? 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-red-950/20 hover:bg-red-900/40 border-red-900/50 hover:border-red-500/50'}`}>
                                    <Unlock className={`w-10 h-10 transition-colors ${selectedBrand === 'samsung' ? 'text-slate-600' : 'text-slate-400 group-hover:text-red-400'}`} />
                                    <span className={`font-bold text-xl ${selectedBrand === 'samsung' ? 'text-slate-500' : 'text-red-100'}`}>Desbloquear Bootloader</span>
                                    <span className="text-sm text-slate-500 text-center">Desbloqueo estándar vía fastboot (Factory Reset)</span>
                                  </button>

                                  <button onClick={handleInstallMagisk} disabled={isInstallingMagisk} className={`p-8 border rounded-2xl transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg ${isInstallingMagisk ? 'bg-slate-900/50 border-slate-800 opacity-50 cursor-wait' : 'bg-green-950/20 hover:bg-green-900/40 border-green-900/50 hover:border-green-500/50'}`}>
                                    <Box className={`w-10 h-10 transition-colors ${isInstallingMagisk ? 'text-slate-600 animate-pulse' : 'text-slate-400 group-hover:text-green-400'}`} />
                                    <span className={`font-bold text-xl ${isInstallingMagisk ? 'text-slate-500' : 'text-green-100'}`}>{isInstallingMagisk ? 'Instalando...' : 'Instalar Magisk App'}</span>
                                    <span className="text-sm text-slate-500 text-center">Descarga e instala la app oficial para parchear el archivo boot.img</span>
                                  </button>

                                  <div className={`p-6 border rounded-2xl transition-all flex flex-col items-center justify-center space-y-4 shadow-lg ${selectedBrand === 'samsung' ? 'bg-slate-900/50 border-slate-800 opacity-50' : 'bg-blue-950/20 border-blue-900/50'}`}>
                                    <div className="flex flex-col items-center justify-center w-full">
                                      <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${selectedBrand === 'samsung' ? 'border-slate-700 bg-slate-900' : 'border-blue-500/40 bg-blue-900/20 hover:bg-blue-900/40 hover:border-blue-400'}`}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                          <UploadCloud className={`w-8 h-8 mb-3 ${selectedBrand === 'samsung' ? 'text-slate-600' : 'text-blue-400'}`} />
                                          <p className="text-sm text-slate-300 font-medium">{bootFile ? bootFile.name : 'Seleccionar archivo magisk_patched.img'}</p>
                                        </div>
                                        <input type="file" className="hidden" accept=".img" onChange={(e) => e.target.files && setBootFile(e.target.files[0])} disabled={selectedBrand === 'samsung' || isFlashing} />
                                      </label>
                                    </div>
                                    <button
                                      onClick={handleFlashBoot}
                                      disabled={!bootFile || selectedBrand === 'samsung' || isFlashing}
                                      className={`w-full py-3 rounded-xl font-bold transition-all text-lg shadow-md ${(!bootFile || selectedBrand === 'samsung' || isFlashing) ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}
                                    >
                                      {isFlashing ? 'Flasheando...' : 'Flashear Imagen Boot'}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* BYPASS AND UNLOCK TAB */}
                    {activeTab === 'bypass' && (
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-3 bg-violet-500/20 rounded-xl">
                            <Unlock className="w-8 h-8 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-100">Bypass y Desbloqueo</h3>
                            <p className="text-slate-400 text-sm mt-1">Herramientas avanzadas para recuperación de acceso</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* TWRP/Root Bypass Card */}
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl"></div>
                            <h4 className="text-xl font-bold text-slate-200 mb-2 flex items-center">
                              <ShieldAlert className="w-5 h-5 mr-2 text-green-400" />
                              Bypass por TWRP / Root
                            </h4>
                            <p className="text-sm text-slate-400 mb-6">
                              Elimina directamente los archivos de base de datos que controlan el PIN, patrón o contraseña. Requiere que el dispositivo tenga acceso Root o un Custom Recovery (TWRP) iniciado con la partición /data montada.
                            </p>

                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6">
                              <code className="text-xs text-green-400 font-mono break-all">
                                rm -f /data/system/locksettings.db* /data/system/password.key ...
                              </code>
                            </div>

                            <button
                              onClick={handleTWRPBypass}
                              disabled={!selectedDevice}
                              className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center space-x-2 ${!selectedDevice ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/30'}`}
                            >
                              <Unlock className="w-5 h-5" />
                              <span>Purgar Bases de Datos</span>
                            </button>
                          </div>

                          {/* Brute Force Card */}
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative flex flex-col h-full">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl"></div>
                            <h4 className="text-xl font-bold text-slate-200 mb-2 flex items-center">
                              <Zap className="w-5 h-5 mr-2 text-violet-400" />
                              Inyección por Fuerza Bruta
                            </h4>
                            <p className="text-sm text-slate-400 mb-6">
                              Automatiza la inyección de pines vía teclado ADB (`input text`). Solo funciona si la Depuración USB ya estaba activada en el equipo bloqueado. Maneja automáticamente los tiempos de espera de 30s de Android.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">PIN Inicial</label>
                                <input
                                  type="text"
                                  maxLength={4}
                                  className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg px-4 py-2 font-mono text-center focus:border-violet-500 focus:outline-none"
                                  value={bruteForceStartPin}
                                  onChange={(e) => setBruteForceStartPin(e.target.value.replace(/\D/g, ''))}
                                  disabled={bruteForceStatus.active}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">PIN Final</label>
                                <input
                                  type="text"
                                  maxLength={4}
                                  className="w-full bg-slate-950 text-white border border-slate-700 rounded-lg px-4 py-2 font-mono text-center focus:border-violet-500 focus:outline-none"
                                  value={bruteForceEndPin}
                                  onChange={(e) => setBruteForceEndPin(e.target.value.replace(/\D/g, ''))}
                                  disabled={bruteForceStatus.active}
                                />
                              </div>
                            </div>

                            {/* Status Console */}
                            <div className="flex-1 bg-black/50 border border-slate-800 rounded-lg p-4 mb-4 flex flex-col justify-center items-center min-h-[100px]">
                              {bruteForceStatus.active ? (
                                <>
                                  <RefreshCw className="w-6 h-6 text-violet-400 animate-spin mb-2" />
                                  <div className="text-3xl font-mono text-white mb-1 tracking-widest">{bruteForceStatus.currentPin || '----'}</div>
                                  <p className="text-xs text-violet-300 text-center">{bruteForceStatus.lastLog}</p>
                                </>
                              ) : (
                                <p className="text-sm text-slate-500 font-mono text-center">{bruteForceStatus.lastLog || 'Inactivo'}</p>
                              )}
                            </div>

                            {bruteForceStatus.active ? (
                              <button
                                onClick={handleBruteForceStop}
                                className="w-full py-3 rounded-xl font-bold transition-all bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 flex justify-center items-center"
                              >
                                <X className="w-5 h-5 mr-2" />
                                Detener Ataque
                              </button>
                            ) : (
                              <button
                                onClick={handleBruteForceStart}
                                disabled={!selectedDevice || !bruteForceStartPin || !bruteForceEndPin}
                                className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center space-x-2 ${(!selectedDevice || !bruteForceStartPin || !bruteForceEndPin) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'}`}
                              >
                                <Play className="w-5 h-5" />
                                <span>Iniciar Ataque</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}


                    {/* SECURITY DIAGNOSTICS TAB */}
                    {activeTab === 'security' && (
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-3 bg-pink-500/20 rounded-xl">
                            <Lock className="w-8 h-8 text-pink-400" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-100">Seguridad y Diagnóstico de Malware</h3>
                            <p className="text-slate-400 text-sm mt-1">Escáner heurístico y arquitectura de seguridad</p>
                          </div>
                        </div>

                        {/* MALWARE SCANNER MODULE */}
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl"></div>

                          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                            <div>
                              <h4 className="text-xl font-bold text-slate-200 flex items-center">
                                <Radar className={`w-6 h-6 mr-3 ${isScanningMalware ? 'text-red-400 animate-spin' : 'text-slate-400'}`} />
                                Escáner Heurístico Anti-Spyware
                              </h4>
                              <p className="text-sm text-slate-400 mt-2 max-w-xl">
                                Analiza los permisos profundos y comportamientos de las aplicaciones instaladas para detectar spyware, malware oculto y apps maliciosas basándose en heurística avanzada.
                              </p>
                            </div>
                            <button
                              onClick={runMalwareScan}
                              disabled={isScanningMalware || !selectedDevice}
                              className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap shadow-lg flex items-center space-x-2 ${isScanningMalware ? 'bg-red-900/50 text-red-300 cursor-wait border border-red-500/30' : 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500'}`}
                            >
                              {isScanningMalware ? (
                                <>
                                  <RefreshCw className="w-5 h-5 animate-spin" />
                                  <span>Escaneando sistema...</span>
                                </>
                              ) : (
                                <>
                                  <Bug className="w-5 h-5" />
                                  <span>Iniciar Escaneo Profundo</span>
                                </>
                              )}
                            </button>
                          </div>

                          {malwareScanResults.length > 0 && (
                            <div className="mt-6 space-y-3 relative z-10">
                              <h5 className="font-bold text-slate-300 mb-4 border-b border-slate-800 pb-2">Resultados del Escaneo</h5>

                              {malwareScanResults.filter(app => app.threatScore >= 20).length === 0 ? (
                                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-center text-emerald-400">
                                  <ShieldAlert className="w-6 h-6 mr-3" />
                                  <p className="font-medium">No se detectaron amenazas críticas ni patrones de spyware evidentes.</p>
                                </div>
                              ) : (
                                <div className="grid gap-3">
                                  {malwareScanResults.filter(app => app.threatScore >= 20).map((app, idx) => (
                                    <div key={idx} className={`bg-slate-800/80 rounded-xl p-4 border flex flex-col md:flex-row md:items-start justify-between gap-4 ${app.riskLevel === 'Crítico' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : app.riskLevel === 'Alto' ? 'border-orange-500/40' : 'border-yellow-500/30'}`}>
                                      <div className="flex items-start space-x-4 flex-1">
                                        <div className="w-12 h-12 mt-1 rounded-xl bg-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-600/50">
                                          {appInfos[app.packageName]?.icon ? (
                                            <img src={appInfos[app.packageName].icon} alt={app.packageName} className="w-full h-full object-cover" />
                                          ) : (
                                            <Box className="w-6 h-6 text-slate-400" />
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center flex-wrap gap-2 mb-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${app.riskLevel === 'Crítico' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : app.riskLevel === 'Alto' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                                              Riesgo {app.riskLevel}
                                            </span>
                                            <span className="font-bold text-slate-100 text-lg">{appInfos[app.packageName]?.title || app.packageName}</span>
                                            {appInfos[app.packageName]?.title && (
                                              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700/50">{app.packageName}</span>
                                            )}
                                            {app.isHidden && (
                                              <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-2 py-0.5 rounded-full text-xs font-bold flex items-center">
                                                <EyeOff className="w-3 h-3 mr-1" /> Oculta
                                              </span>
                                            )}
                                          </div>

                                          {appInfos[app.packageName]?.summary && (
                                            <p className="text-xs text-slate-400 line-clamp-2 mt-2 mb-3 bg-slate-900/50 p-2 rounded-lg border border-slate-700/30">
                                              {appInfos[app.packageName].summary}
                                            </p>
                                          )}

                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {app.flags.map((flag: string, i: number) => (
                                              <span key={i} className="text-xs bg-slate-900 text-slate-400 px-2 py-1 rounded-md border border-slate-700/50">
                                                {flag}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleUninstallThreat(app.packageName)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center shrink-0 shadow-lg"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar Amenaza
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                          <h4 className="text-lg font-semibold text-slate-200 mb-3 flex items-center"><ShieldAlert className="w-5 h-5 mr-2 text-yellow-500" /> ¿Por qué es imposible aplicar "Fuerza Bruta" a un PIN?</h4>
                          <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            En el pasado (Android 5 e inferiores), era posible usar herramientas ADB para borrar los archivos `gesture.key` o `password.key`. En la actualidad, **bypassear o forzar el código de bloqueo es física y matemáticamente inviable** sin borrar los datos del usuario. Esto se debe a 3 pilares de seguridad:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                              <h5 className="font-bold text-pink-400 mb-2">1. Hardware TEE y Gatekeeper</h5>
                              <p className="text-xs text-slate-400">El sistema operativo Android NO conoce tu PIN. La validación se hace dentro de un microchip físicamente aislado (Trusted Execution Environment). Si el SO fuera hackeado, aún así no podría extraer la clave original.</p>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                              <h5 className="font-bold text-pink-400 mb-2">2. Throttling Exponencial</h5>
                              <p className="text-xs text-slate-400">El hardware impone deliberadamente tiempos de espera obligatorios tras intentos fallidos (30 segundos, luego minutos, horas). Intentar las 10,000 combinaciones de un PIN de 4 dígitos tomaría literalmente años de espera forzada.</p>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                              <h5 className="font-bold text-pink-400 mb-2">3. FBE (File-Based Encryption)</h5>
                              <p className="text-xs text-slate-400">Desde Android 7.0, todos los archivos están cifrados individualmente (FBE). El PIN del usuario se usa como llave maestra para desencriptar el almacenamiento. Sin el PIN, los archivos son criptográficamente ilegibles e irrecuperables.</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-5">
                          <h4 className="text-lg font-semibold text-blue-200 mb-2">Solución Técnica Oficial</h4>
                          <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            Ante un dispositivo bloqueado permanentemente, el protocolo oficial estandarizado para recuperar la funcionalidad del hardware es el restablecimiento de fábrica desde el nivel de *Bootloader/Recovery*.
                          </p>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-100/70 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                            <li>Apaga el dispositivo por completo.</li>
                            <li>Mantén presionada la combinación de botones físicos de recuperación (usualmente <strong>Volumen Arriba + Encendido</strong>).</li>
                            <li>En el menú de Recovery, usa los botones de volumen para navegar hasta <strong>Wipe data/factory reset</strong> y confirma con el botón de encendido.</li>
                            <li>Una vez terminado, selecciona <strong>Reboot system now</strong>.</li>
                            <li className="mt-2 text-yellow-400 list-none font-semibold">Nota (FRP): Al reiniciar, Google requerirá el correo y contraseña originales configurados previamente en el equipo para demostrar la propiedad legítima (Factory Reset Protection).</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* MAINTENANCE TAB */}
                    {activeTab === 'maintenance' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-teal-500/20 rounded-xl">
                            <Wrench className="text-teal-400 w-6 h-6" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-100">Mantenimiento y Rendimiento</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><MemoryStick className="w-5 h-5 mr-2 text-indigo-400" /> Optimizador de Memoria RAM</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Termina forzosamente todos los procesos de aplicaciones que se estén ejecutando en segundo plano, liberando memoria RAM de inmediato para resolver teléfonos congelados o excesivamente lentos.
                            </p>
                            <button
                              onClick={() => handleMaintenance('ram')}
                              className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 hover:border-indigo-500 text-indigo-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Matar Procesos en Segundo Plano
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><ServerCrash className="w-5 h-5 mr-2 text-rose-400" /> Limpiador Profundo de Caché</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Obliga al sistema operativo a vaciar la caché temporal generada por absolutamente todas las aplicaciones, recuperando gigabytes de espacio inútil sin borrar tus fotos, videos o cuentas logueadas.
                            </p>
                            <button
                              onClick={() => handleMaintenance('cache')}
                              className="w-full py-3 bg-rose-600/20 hover:bg-rose-600 hover:text-white border border-rose-500/30 hover:border-rose-500 text-rose-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Ejecutar Limpieza de Caché
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><Battery className="w-5 h-5 mr-2 text-green-400" /> Calibración de Batería</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Android guarda estadísticas de uso de batería que a veces se corrompen, mostrando porcentajes incorrectos (ej. apagones súbitos al 20%). Reiniciar estas estadísticas fuerza al sistema a recalibrar.
                            </p>
                            <button
                              onClick={() => handleMaintenance('battery_reset')}
                              className="w-full py-3 bg-green-600/20 hover:bg-green-600 hover:text-white border border-green-500/30 hover:border-green-500 text-green-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Reiniciar Estadísticas de Batería
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><Zap className="w-5 h-5 mr-2 text-yellow-400" /> Acelerador de Interfaz</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Reduce el tiempo de transición de todas las animaciones del sistema a la mitad (0.5x). Esta es una técnica profesional para hacer que teléfonos antiguos o lentos se sientan instantáneos y mucho más rápidos.
                            </p>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleMaintenance('speed_up_animations')}
                                className="flex-1 py-3 bg-yellow-600/20 hover:bg-yellow-600 hover:text-white border border-yellow-500/30 hover:border-yellow-500 text-yellow-400 rounded-xl font-bold transition-all shadow-sm"
                              >
                                Acelerar (0.5x)
                              </button>
                              <button
                                onClick={() => handleMaintenance('restore_animations')}
                                className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-600 text-slate-300 border border-slate-600 rounded-xl font-bold transition-all"
                              >
                                Restaurar (1x)
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><Wifi className="w-5 h-5 mr-2 text-cyan-400" /> Reinicio Rápido de Redes</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Refresca las conexiones celulares y de Wi-Fi activando y desactivando el Modo Avión en milisegundos. Soluciona problemas comunes de conectividad ("Sin Señal" o "Solo Emergencias") sin reiniciar todo el teléfono.
                            </p>
                            <button
                              onClick={() => handleMaintenance('network')}
                              className="w-full py-3 bg-cyan-600/20 hover:bg-cyan-600 hover:text-white border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Forzar Reconexión de Antenas
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><HardDriveDownload className="w-5 h-5 mr-2 text-blue-400" /> Optimización de Memoria Flash (TRIM)</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Envía manualmente el comando TRIM a la memoria flash del teléfono. Le indica al controlador que limpie los bloques eliminados, acelerando brutalmente las velocidades de lectura y escritura. Ideal después de desinstalar apps.
                            </p>
                            <button
                              onClick={() => handleMaintenance('trim_caches')}
                              className="w-full py-3 bg-blue-600/20 hover:bg-blue-600 hover:text-white border border-blue-500/30 hover:border-blue-500 text-blue-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Lanzar Comando TRIM
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><MonitorPlay className="w-5 h-5 mr-2 text-fuchsia-400" /> Reparación de Interfaz</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Fuerza el reinicio inmediato del SystemUI. Repara barras de notificaciones congeladas, pantalla táctil invisible o errores de diseño sin tener que reiniciar todo el dispositivo.
                            </p>
                            <button
                              onClick={() => handleMaintenance('system_ui')}
                              className="w-full py-3 bg-fuchsia-600/20 hover:bg-fuchsia-600 hover:text-white border border-fuchsia-500/30 hover:border-fuchsia-500 text-fuchsia-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Reiniciar SystemUI
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><ShieldAlert className="w-5 h-5 mr-2 text-amber-400" /> Restablecer Permisos Generales</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Borra la base de datos de permisos de TODAS las aplicaciones. Útil cuando una app colapsa repetidamente porque sus permisos nativos se corrompieron. No borra fotos ni datos.
                            </p>
                            <button
                              onClick={() => handleMaintenance('permissions')}
                              className="w-full py-3 bg-amber-600/20 hover:bg-amber-600 hover:text-white border border-amber-500/30 hover:border-amber-500 text-amber-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Resetear Permisos
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><Globe className="w-5 h-5 mr-2 text-emerald-400" /> Vaciado de DNS (Network Flush)</h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed flex-1">
                              Pide al daemon de red de Android vaciar toda su caché de enrutamiento DNS. Resuelve el molesto problema de "Conectado a Wi-Fi, sin internet" en un instante.
                            </p>
                            <button
                              onClick={() => handleMaintenance('dns')}
                              className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 rounded-xl font-bold transition-all shadow-sm"
                            >
                              Vaciar Caché DNS
                            </button>
                          </div>

                          <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col md:col-span-2 mt-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                            <h4 className="text-xl font-bold text-amber-400 mb-4 flex items-center"><ShieldAlert className="w-5 h-5 mr-2" /> Opciones de "Modo Dios" (Avanzadas)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-900/30 flex flex-col">
                                <h5 className="font-bold text-slate-200 mb-2">Bloqueador de Anuncios DNS</h5>
                                <p className="text-xs text-slate-400 mb-4 flex-1">Inyecta un DNS Privado (AdGuard) a nivel del sistema operativo para bloquear anuncios en navegadores y apps sin necesitar Root.</p>
                                <div className="flex space-x-2">
                                  <button onClick={() => handleGodMode('adguard-dns')} className="flex-1 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-sm font-bold border border-amber-500/30 transition-all">Activar AdGuard</button>
                                  <button onClick={() => handleGodMode('disable-dns')} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-bold transition-all">Desactivar</button>
                                </div>
                              </div>
                              <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-900/30 flex flex-col">
                                <h5 className="font-bold text-slate-200 mb-2">Fingir Batería al 100%</h5>
                                <p className="text-xs text-slate-400 mb-4 flex-1">Engaña al sistema para que muestre que la batería está llena. Útil para grabar pantalla o tomar screenshots perfectos.</p>
                                <div className="flex space-x-2">
                                  <button onClick={() => handleGodMode('battery-100')} className="flex-1 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-sm font-bold border border-amber-500/30 transition-all">Forzar 100%</button>
                                  <button onClick={() => handleGodMode('battery-reset')} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-bold transition-all">Restaurar</button>
                                </div>
                              </div>
                              <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-900/30 flex flex-col">
                                <h5 className="font-bold text-slate-200 mb-2">Forzar Sueño Profundo (Doze)</h5>
                                <p className="text-xs text-slate-400 mb-4 flex-1">Obliga al procesador y sistema a entrar inmediatamente al estado de máximo ahorro de energía para evitar descargas nocturnas.</p>
                                <button onClick={() => handleGodMode('force-doze')} className="w-full py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-sm font-bold border border-amber-500/30 transition-all">Activar Doze Extremo</button>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                    {/* TERMINAL TAB */}
                    {activeTab === 'terminal' && (
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
                        <div className="bg-black/90 border border-slate-700/50 rounded-2xl p-4 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col lg:col-span-3">
                          <div className="flex items-center space-x-3 mb-4">
                            <Terminal className="text-cyan-400 w-6 h-6" />
                            <h3 className="text-xl font-bold text-slate-100 font-mono">Terminal ADB Directa</h3>
                          </div>
                          <div className="flex-1 bg-black rounded-xl p-4 font-mono text-sm overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
                            <pre className="text-green-400 whitespace-pre-wrap">{terminalOutput}</pre>
                          </div>
                          <form onSubmit={runTerminalCommand} className="mt-4 flex space-x-2">
                            <div className="bg-slate-800 flex items-center px-3 rounded-lg border border-slate-700 focus-within:border-cyan-500 flex-1">
                              <span className="text-cyan-500 font-mono mr-2">$</span>
                              <input
                                type="text"
                                value={terminalCommand}
                                onChange={e => setTerminalCommand(e.target.value)}
                                placeholder="Ej: pm list packages o dumpsys battery"
                                className="bg-transparent border-none outline-none text-green-300 font-mono w-full py-3"
                                autoComplete="off"
                              />
                            </div>
                            <button type="submit" className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white px-6 rounded-lg font-bold transition-colors border border-cyan-500/30">
                              Enviar
                            </button>
                          </form>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col overflow-y-auto custom-scrollbar shadow-xl">
                          <h4 className="text-cyan-400 font-bold mb-4 flex items-center border-b border-slate-700 pb-2">
                            <Info className="w-5 h-5 mr-2" /> Comandos Útiles
                          </h4>
                          <p className="text-xs text-slate-400 mb-4">Haz clic en un comando para prepararlo en la consola.</p>
                          <div className="space-y-3">
                            {[
                              { cmd: 'dumpsys battery', desc: 'Muestra estadísticas crudas y salud real de la batería.' },
                              { cmd: 'dumpsys deviceidle', desc: 'Comprueba el estado del ahorrador de energía (Doze).' },
                              { cmd: 'dumpsys window displays', desc: 'Muestra información detallada sobre las pantallas conectadas.' },
                              { cmd: 'dumpsys meminfo', desc: 'Desglosa la cantidad de memoria RAM libre y usada por proceso.' },
                              { cmd: 'dumpsys cpuinfo', desc: 'Imprime el estado detallado del consumo de CPU del sistema.' },
                              { cmd: 'pm list packages -3', desc: 'Lista solo las apps instaladas por el usuario (sin sistema).' },
                              { cmd: 'pm list packages -s', desc: 'Lista únicamente las aplicaciones del sistema.' },
                              { cmd: 'pm uninstall -k --user 0 <paquete>', desc: 'Desinstala bloatware o apps del sistema sin necesidad de Root.' },
                              { cmd: 'pm disable-user <paquete>', desc: 'Congela/Desactiva una aplicación sin eliminarla del sistema.' },
                              { cmd: 'pm install-existing <paquete>', desc: 'Restaura una aplicación del sistema que fue desinstalada previamente.' },
                              { cmd: 'top -m 10', desc: 'Muestra el top 10 de procesos consumiendo CPU en tiempo real.' },
                              { cmd: 'ifconfig wlan0', desc: 'Verifica la dirección IP y datos de la tarjeta Wi-Fi.' },
                              { cmd: 'ping -c 4 8.8.8.8', desc: 'Realiza un test de conexión a internet usando los servidores de Google.' },
                              { cmd: 'netstat -tulpn', desc: 'Muestra los puertos de red abiertos y conexiones activas.' },
                              { cmd: 'wm size', desc: 'Muestra la resolución actual de la pantalla en píxeles.' },
                              { cmd: 'wm density', desc: 'Muestra la densidad de píxeles (DPI) de la pantalla.' },
                              { cmd: 'getprop ro.build.version.release', desc: 'Muestra la versión exacta de Android instalada.' },
                              { cmd: 'getprop ro.product.cpu.abi', desc: 'Muestra la arquitectura del procesador (ej: arm64-v8a).' },
                              { cmd: 'settings get secure android_id', desc: 'Muestra el identificador único del hardware del dispositivo.' },
                              { cmd: 'settings put global window_animation_scale 0.5', desc: 'Acelera las animaciones de la interfaz del teléfono al doble.' },
                              { cmd: 'input keyevent 26', desc: 'Simula presionar el botón de Encendido (apagar/prender pantalla).' },
                              { cmd: 'cmd statusbar expand-notifications', desc: 'Despliega el panel de notificaciones remotamente.' },
                              { cmd: 'logcat -d', desc: 'Vuelca (dump) todo el registro del sistema hasta este instante.' },
                              { cmd: 'screencap -p /sdcard/screen.png', desc: 'Toma una captura de pantalla y la guarda en el teléfono.' },
                              { cmd: 'screenrecord --time-limit 10 /sdcard/video.mp4', desc: 'Graba 10 segundos de la pantalla en video y lo guarda en el teléfono.' },
                              { cmd: 'ls -la /sdcard/Download', desc: 'Lista los archivos en la carpeta de descargas del usuario.' }
                            ].map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => setTerminalCommand(item.cmd)}
                                className="bg-slate-800/80 hover:bg-slate-700/80 p-3 rounded-xl border border-slate-700 cursor-pointer transition-colors group"
                              >
                                <p className="text-cyan-300 font-mono text-sm font-bold mb-1 group-hover:text-cyan-200">{item.cmd}</p>
                                <p className="text-xs text-slate-400 leading-snug">{item.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FILES TAB */}
                    {activeTab === 'files' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-yellow-500/20 rounded-xl"><FolderOpen className="text-yellow-400 w-6 h-6" /></div>
                            <h3 className="text-2xl font-bold text-slate-100">Explorador de Archivos</h3>
                          </div>
                          <div className="flex space-x-2">
                            <label className="cursor-pointer px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-sm font-bold border border-blue-500/30 transition-colors flex items-center">
                              <UploadCloud className="w-4 h-4 mr-2" />
                              Subir Archivo
                              <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <button onClick={() => fetchFiles(filesPath.split('/').slice(0, -1).join('/') || '/')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-300 transition-colors">↑ Subir de Nivel</button>
                            <button onClick={() => fetchFiles(filesPath)} className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white rounded-lg text-sm font-bold border border-yellow-500/30 transition-colors">Actualizar</button>
                          </div>
                        </div>

                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 flex items-center space-x-3 mb-4">
                          <span className="text-slate-400 font-mono shrink-0">Ruta:</span>
                          <input
                            type="text"
                            value={filesPath}
                            onChange={(e) => setFilesPath(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchFiles(filesPath)}
                            className="bg-transparent border-none outline-none text-yellow-200 font-mono w-full"
                          />
                        </div>

                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50">
                          {selectedExplorerFiles.length > 0 && (
                            <div className="bg-slate-800 p-3 flex justify-between items-center border-b border-slate-700/50">
                              <span className="text-sm font-bold text-slate-300">{selectedExplorerFiles.length} seleccionados</span>
                              <button onClick={handleBulkDeleteFiles} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded text-sm font-bold border border-red-500/30 transition-colors flex items-center">
                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar Selección
                              </button>
                            </div>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-800 text-slate-400 font-mono text-xs">
                                <tr>
                                  <th className="px-4 py-3 w-10">
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-600 bg-slate-900 text-yellow-500 focus:ring-yellow-500"
                                      checked={filesList.length > 0 && selectedExplorerFiles.length === filesList.length}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedExplorerFiles(filesList.map(f => f.name));
                                        else setSelectedExplorerFiles([]);
                                      }}
                                    />
                                  </th>
                                  <th className="px-4 py-3">Tipo</th>
                                  <th className="px-4 py-3">Nombre</th>
                                  <th className="px-4 py-3">Tamaño</th>
                                  <th className="px-4 py-3">Fecha</th>
                                  <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 font-mono">
                                {filesList.map((f, i) => (
                                  <tr key={i} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-4 py-3">
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-600 bg-slate-900 text-yellow-500 focus:ring-yellow-500"
                                        checked={selectedExplorerFiles.includes(f.name)}
                                        onChange={(e) => {
                                          if (e.target.checked) setSelectedExplorerFiles(prev => [...prev, f.name]);
                                          else setSelectedExplorerFiles(prev => prev.filter(n => n !== f.name));
                                        }}
                                      />
                                    </td>
                                    <td className="px-4 py-3 cursor-pointer" onClick={() => f.isDir && fetchFiles(filesPath + (filesPath.endsWith('/') ? '' : '/') + f.name)}>
                                      {f.isDir ? <FolderOpen className="text-yellow-500 w-4 h-4" /> :
                                        /\.(jpe?g|png|gif|webp|bmp)$/i.test(f.name) ? (
                                          <img src={`${API_BASE}/device/${selectedDevice}/files/view?path=${encodeURIComponent(filesPath + (filesPath.endsWith('/') ? '' : '/') + f.name)}`} loading="lazy" className="w-16 h-16 object-cover rounded-md bg-slate-800 shadow-md" alt="thumb" />
                                        ) : /\.(mp4|mkv|webm|mov|avi)$/i.test(f.name) ? (
                                          <Film className="text-purple-400 w-4 h-4" />
                                        ) : /\.(pdf|txt|json|xml|log|csv)$/i.test(f.name) ? (
                                          <FileText className="text-blue-400 w-4 h-4" />
                                        ) : <Box className="text-slate-400 w-4 h-4" />}
                                    </td>
                                    <td className="px-4 py-3 cursor-pointer" onClick={() => f.isDir && fetchFiles(filesPath + (filesPath.endsWith('/') ? '' : '/') + f.name)}>
                                      <span className={`${f.isDir ? 'text-yellow-300 hover:underline' : 'text-slate-300'}`}>{f.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{f.isDir ? '-' : f.size}</td>
                                    <td className="px-4 py-3 text-slate-500">{f.date}</td>
                                    <td className="px-4 py-3 text-right">
                                      {!f.isDir && (
                                        <>
                                          {(/\.(jpe?g|png|gif|webp|bmp)$/i.test(f.name) || /\.(mp4|mkv|webm|mov|avi)$/i.test(f.name) || /\.(pdf|txt|json|xml|log|csv)$/i.test(f.name)) && (
                                            <button
                                              onClick={() => setMediaViewer({
                                                url: `${API_BASE}/device/${selectedDevice}/files/view?path=${encodeURIComponent(filesPath + (filesPath.endsWith('/') ? '' : '/') + f.name)}`,
                                                type: /\.(mp4|mkv|webm|mov|avi)$/i.test(f.name) ? 'video' : /\.(pdf|txt|json|xml|log|csv)$/i.test(f.name) ? 'document' : 'image',
                                                name: f.name
                                              })}
                                              className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded mr-2 opacity-0 group-hover:opacity-100 transition-all"
                                              title="Ver archivo"
                                            >
                                              <Eye className="w-4 h-4" />
                                            </button>
                                          )}
                                          <button onClick={() => triggerDownload(`${API_BASE}/device/${selectedDevice}/files/download?path=${encodeURIComponent(filesPath + (filesPath.endsWith('/') ? '' : '/') + f.name)}`)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded mr-2 opacity-0 group-hover:opacity-100 transition-all" title="Descargar archivo">
                                            <HardDriveDownload className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                      <button onClick={async () => {
                                        if (await customConfirm(`¿Eliminar ${f.name}?`)) {
                                          await axios.post(`${API_BASE}/device/${selectedDevice}/files/delete`, { path: filesPath + (filesPath.endsWith('/') ? '' : '/') + f.name });
                                          fetchFiles(filesPath);
                                        }
                                      }} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCREEN MIRROR TAB */}
                    {activeTab === 'screen' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-emerald-500/20 rounded-xl"><MonitorPlay className="text-emerald-400 w-6 h-6" /></div>
                            <h3 className="text-2xl font-bold text-slate-100">Transmisión & Control Remoto</h3>
                          </div>
                          <div className="flex space-x-4 items-center">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <span className={`font-bold ${isLiveScreen ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                                {isLiveScreen ? 'EN VIVO (REC)' : 'Video Pausado'}
                              </span>
                              <div className={`relative w-12 h-6 transition duration-200 ease-linear rounded-full ${isLiveScreen ? 'bg-red-500' : 'bg-slate-700'}`}>
                                <input type="checkbox" className="opacity-0 w-0 h-0" checked={isLiveScreen} onChange={(e) => setIsLiveScreen(e.target.checked)} />
                                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${isLiveScreen ? 'transform translate-x-6' : ''}`}></span>
                              </div>
                            </label>
                            <button onClick={handleScreenRecordToggle} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl transition-all font-bold border ${isRecordingVideo ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border-indigo-500/30'}`}>
                              <Camera className="w-5 h-5" />
                              <span>{isRecordingVideo ? 'DETENER GRABACIÓN' : 'Grabar MP4'}</span>
                            </button>
                            <button onClick={fetchScreenshot} disabled={isScreenshotLoading && !isLiveScreen} className="flex items-center space-x-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-5 py-2.5 rounded-xl transition-all font-bold border border-emerald-500/30">
                              <MonitorPlay className="w-5 h-5" />
                              <span>{isScreenshotLoading && !isLiveScreen ? 'Capturando...' : 'Foto Manual'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="relative bg-black rounded-3xl border-8 border-slate-800 shadow-2xl overflow-hidden" style={{ width: '350px', height: '700px' }}>
                          {isScreenshotLoading && !isLiveScreen && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"><RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" /></div>}
                          {screenshotUrl ? (
                            <>
                              <img
                                src={screenshotUrl}
                                alt="Device Screen"
                                className="w-full h-full object-contain cursor-crosshair relative z-0"
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onDragStart={(e) => e.preventDefault()}
                                title="Haz clic o arrastra para interactuar"
                              />
                              {tapFeedback && (
                                <div
                                  className="absolute z-20 w-8 h-8 rounded-full border-2 border-red-500 bg-red-500/30 animate-ping pointer-events-none"
                                  style={{
                                    left: tapFeedback.x - 16,
                                    top: tapFeedback.y - 16,
                                  }}
                                />
                              )}
                              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none z-10">
                                <span className="bg-black/60 text-emerald-400 text-xs font-mono px-3 py-1 rounded-full border border-emerald-500/30 backdrop-blur-md">
                                  Interactive Mode ON
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">Haz clic en Captura Manual o En Vivo</div>
                          )}
                        </div>

                        {/* HARDWARE NAVIGATION BUTTONS */}
                        <div className="mt-6 flex space-x-6 items-center justify-center bg-black/40 px-8 py-3 rounded-2xl border border-slate-700/50 backdrop-blur-md">
                          <button onClick={() => handleKeyEvent(4)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all" title="Atrás (Back)">
                            <ChevronLeft className="w-8 h-8" />
                          </button>
                          <button onClick={() => handleKeyEvent(3)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all" title="Inicio (Home)">
                            <Circle className="w-7 h-7" />
                          </button>
                          <button onClick={() => handleKeyEvent(187)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all" title="Aplicaciones Recientes">
                            <Square className="w-6 h-6" />
                          </button>
                          <div className="w-px h-8 bg-slate-700 mx-2"></div>
                          <button onClick={() => handleKeyEvent(26)} className="p-3 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-full transition-all" title="Botón de Encendido / Bloqueo">
                            <PowerOff className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PRIVACY TAB */}
                    {activeTab === 'privacy' && (
                      <div className="bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-rose-500/20 rounded-xl"><EyeOff className="text-rose-400 w-6 h-6" /></div>
                            <div>
                              <h3 className="text-2xl font-bold text-slate-100">Auditoría Extrema de Privacidad</h3>
                              <p className="text-slate-400 text-sm">Visualiza qué aplicaciones tienen permisos sensibles concedidos actualmente.</p>
                            </div>
                          </div>
                          <button onClick={fetchPermissions} className="flex items-center space-x-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-4 py-2 rounded-xl transition-all font-bold border border-rose-500/30">
                            <RefreshCw className="w-4 h-4" /> <span>Escanear</span>
                          </button>
                        </div>

                        {!permissionsData ? (
                          <div className="animate-pulse bg-slate-800 h-64 rounded-2xl w-full"></div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                            {['CAMERA', 'RECORD_AUDIO', 'FINE_LOCATION'].map(perm => (
                              <div key={perm} className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50">
                                <h4 className="font-bold text-rose-400 mb-4 flex items-center border-b border-slate-700 pb-3">
                                  {perm === 'CAMERA' ? <Camera className="w-5 h-5 mr-2" /> : perm === 'RECORD_AUDIO' ? <Volume2 className="w-5 h-5 mr-2" /> : <MonitorPlay className="w-5 h-5 mr-2" />}
                                  Acceso a {perm.replace('_', ' ')}
                                </h4>
                                <ul className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                  {(permissionsData[perm] || []).length === 0 ? <li className="text-sm text-slate-500">Ninguna app detectada</li> :
                                    permissionsData[perm].map((pkg: string) => (
                                      <li key={pkg} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex flex-col">
                                        <span className="text-sm font-bold text-slate-300 break-all mb-2">{pkg}</span>
                                        <button onClick={async () => {
                                          if (await customConfirm(`¿Revocar acceso de ${pkg} a ${perm}?`)) {
                                            await axios.post(`${API_BASE}/device/${selectedDevice}/permissions/revoke`, { packageName: pkg, permission: perm });
                                            fetchPermissions();
                                          }
                                        }} className="bg-red-900/40 hover:bg-red-600 text-red-300 hover:text-white text-xs font-bold py-2 rounded-lg transition-colors border border-red-900/50">Revocar Forzosamente</button>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* V2 - NETWORK TAB */}
                    {activeTab === 'network' && (
                      <div className="glass-panel rounded-3xl p-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="p-3 bg-teal-500/20 rounded-xl"><Activity className="text-teal-400 w-6 h-6" /></div>
                          <h3 className="text-2xl font-bold text-slate-100">Escáner de Red y Conectividad</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="bg-[#06060a] p-6 rounded-2xl border border-teal-500/30 shadow-[inset_0_0_20px_rgba(20,184,166,0.05)]">
                            <h4 className="text-teal-400 font-bold mb-4 flex items-center"><Activity className="w-5 h-5 mr-2" /> Información de IP y MAC</h4>
                            {networkData ? (
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Dirección IP (WLAN)</p>
                                  <p className="text-2xl font-mono text-white">{networkData.ip}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Dirección MAC</p>
                                  <p className="text-lg font-mono text-slate-300">{networkData.mac}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-500 animate-pulse font-mono">Cargando datos de red...</p>
                            )}
                          </div>

                          <div className="bg-[#06060a] p-6 rounded-2xl border border-teal-500/30">
                            <h4 className="text-teal-400 font-bold mb-4">Prueba de Conectividad (Ping)</h4>
                            <button onClick={runPingTest} className="w-full bg-teal-600/20 hover:bg-teal-600 text-teal-400 hover:text-white font-bold py-3 rounded-xl transition-all border border-teal-500/30 mb-4">Ejecutar Ping a Google DNS</button>
                            <pre className="bg-black p-3 rounded-lg text-green-400 text-xs font-mono overflow-x-auto min-h-[100px] border border-slate-800">{pingResult || 'Esperando acción...'}</pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V2 - TASK MANAGER TAB */}
                    {activeTab === 'taskmanager' && (
                      <div className="glass-panel rounded-3xl p-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="p-3 bg-fuchsia-500/20 rounded-xl"><Cpu className="text-fuchsia-400 w-6 h-6" /></div>
                          <h3 className="text-2xl font-bold text-slate-100">Gestor de Tareas en Vivo</h3>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-sm text-slate-400">Mostrando los 15 procesos principales por consumo de CPU/RAM.</p>
                          <button onClick={fetchProcesses} className="bg-fuchsia-600/20 text-fuchsia-400 px-4 py-2 rounded-lg text-sm font-bold border border-fuchsia-500/30 hover:bg-fuchsia-600 hover:text-white transition-all">Actualizar Lista</button>
                        </div>
                        <div className="bg-[#06060a] rounded-2xl border border-fuchsia-500/30 overflow-hidden shadow-[inset_0_0_20px_rgba(217,70,239,0.05)]">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-900 border-b border-fuchsia-500/30 text-fuchsia-400 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                  <th className="px-4 py-3">PID</th>
                                  <th className="px-4 py-3">Proceso</th>
                                  <th className="px-4 py-3">CPU / Memoria</th>
                                  <th className="px-4 py-3 text-right">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 font-mono">
                                {processesData.length === 0 ? (
                                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 animate-pulse">Obteniendo datos de procesos...</td></tr>
                                ) : (
                                  processesData.map((proc, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                      <td className="px-4 py-3 text-slate-400">{proc.pid}</td>
                                      <td className="px-4 py-3 text-slate-200 truncate max-w-[200px]" title={proc.command}>{proc.command}</td>
                                      <td className="px-4 py-3 text-yellow-400">{proc.cpu}% / {proc.mem}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button onClick={() => killProcess(proc.pid, proc.command.includes('.') ? proc.command : undefined)} className="bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1 rounded border border-red-500/30 transition-all font-bold text-xs">KILL</button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V2 - SCREEN TWEAKS TAB */}
                    {activeTab === 'screentweaks' && (
                      <div className="glass-panel rounded-3xl p-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="p-3 bg-blue-500/20 rounded-xl"><Maximize className="text-blue-400 w-6 h-6" /></div>
                          <h3 className="text-2xl font-bold text-slate-100">Ajustes Visuales (Resolución y DPI)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-[#06060a] p-6 rounded-2xl border border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]">
                            <h4 className="text-blue-400 font-bold mb-2">Resolución Forzada</h4>
                            <p className="text-xs text-slate-400 mb-4">Bajar la resolución mejora enormemente el rendimiento en juegos. (Ej: 1080x1920)</p>
                            <div className="flex space-x-2 mb-4">
                              <input type="text" placeholder="Ej: 720x1280" value={screenResolution} onChange={e => setScreenResolution(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 outline-none" />
                              <button onClick={() => applyScreenTweaks('size', screenResolution)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2 rounded-lg font-bold border border-blue-500/30 transition-all">Aplicar</button>
                            </div>
                            <div className="flex space-x-2">
                              <button onClick={() => applyScreenTweaks('size', '1080x1920')} className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 py-2 rounded">FHD (1080p)</button>
                              <button onClick={() => applyScreenTweaks('size', '720x1280')} className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 py-2 rounded">HD (720p)</button>
                            </div>
                          </div>

                          <div className="bg-[#06060a] p-6 rounded-2xl border border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]">
                            <h4 className="text-blue-400 font-bold mb-2">Densidad de Píxeles (DPI)</h4>
                            <p className="text-xs text-slate-400 mb-4">Hace que los elementos se vean más grandes o pequeños. Mayor DPI = Elementos más grandes.</p>
                            <div className="flex space-x-2 mb-4">
                              <input type="number" placeholder="Ej: 320" value={screenDpi} onChange={e => setScreenDpi(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 outline-none" />
                              <button onClick={() => applyScreenTweaks('density', screenDpi)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2 rounded-lg font-bold border border-blue-500/30 transition-all">Aplicar</button>
                            </div>
                            <div className="flex space-x-2">
                              <button onClick={() => applyScreenTweaks('density', '320')} className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 py-2 rounded">320 (Pequeño)</button>
                              <button onClick={() => applyScreenTweaks('density', '480')} className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 py-2 rounded">480 (Normal)</button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 text-center">
                          <button onClick={() => applyScreenTweaks('reset')} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-6 py-3 rounded-xl font-bold border border-red-500/30 transition-all w-full md:w-auto">⚠️ Restaurar Resolución y DPI de Fábrica</button>
                        </div>
                      </div>
                    )}
                    {/* V3 - DEEP SCANNER TAB */}
                    {activeTab === 'deepscanner' && (
                      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 bg-cyan-900/40 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]"><Activity className="text-cyan-400 w-6 h-6" /></div>
                            <div>
                              <h3 className="text-2xl font-bold text-slate-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Deep Scanner</h3>
                              <p className="text-cyan-400 text-sm font-mono tracking-widest">SYSTEM_DIAGNOSTICS_V3</p>
                            </div>
                          </div>
                          <button onClick={fetchDeepInfo} className="bg-slate-800 hover:bg-slate-700 text-cyan-400 px-4 py-2 rounded-lg font-bold border border-cyan-900/50 transition-all flex items-center">
                            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
                          </button>
                        </div>

                        {!deepInfo ? (
                          <div className="animate-pulse bg-slate-800/50 h-64 rounded-2xl w-full border border-slate-700/50"></div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                            {/* ALMACENAMIENTO */}
                            <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-cyan-900/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]">
                              <h4 className="text-cyan-300 font-bold mb-4 flex items-center uppercase tracking-widest text-sm border-b border-cyan-900/50 pb-2"><HardDriveDownload className="w-4 h-4 mr-2" /> Storage (/data)</h4>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Ocupado ({deepInfo.storage.used})</span>
                                    <span>Libre ({deepInfo.storage.free})</span>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden relative">
                                    <div className="bg-gradient-to-r from-cyan-600 to-blue-500 h-3 rounded-full" style={{ width: deepInfo.storage.percent }}></div>
                                  </div>
                                  <p className="text-center text-xs text-slate-500 mt-2 font-mono">Total: {deepInfo.storage.total}</p>
                                </div>
                              </div>
                            </div>

                            {/* RAM EXTREMA */}
                            <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-cyan-900/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]">
                              <h4 className="text-cyan-300 font-bold mb-4 flex items-center uppercase tracking-widest text-sm border-b border-cyan-900/50 pb-2"><Cpu className="w-4 h-4 mr-2" /> RAM Física Absoluta</h4>
                              <div className="space-y-4">
                                <div className="text-center">
                                  <p className="text-4xl font-bold text-white mb-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                    {((deepInfo.ram.total - deepInfo.ram.free) / 1024 / 1024).toFixed(1)} <span className="text-xl text-cyan-500">GB</span>
                                  </p>
                                  <p className="text-xs text-slate-400 uppercase tracking-wider">Memoria en Uso</p>
                                </div>
                                <div className="flex justify-between text-xs font-mono border-t border-slate-800 pt-3">
                                  <span className="text-slate-500">Total: {(deepInfo.ram.total / 1024 / 1024).toFixed(1)} GB</span>
                                  <span className="text-cyan-400">Libre: {(deepInfo.ram.free / 1024 / 1024).toFixed(1)} GB</span>
                                </div>
                              </div>
                            </div>

                            {/* CELULAR E IMEI */}
                            <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-cyan-900/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]">
                              <h4 className="text-cyan-300 font-bold mb-4 flex items-center uppercase tracking-widest text-sm border-b border-cyan-900/50 pb-2"><Activity className="w-4 h-4 mr-2" /> Celular & Identidad</h4>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Identificador IMEI</p>
                                  <p className="text-sm font-mono text-slate-200 bg-slate-900/50 p-2 rounded border border-slate-800 mt-1 break-all">
                                    {deepInfo.cellular.imei}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Estado SIM</p>
                                    <p className="text-sm font-bold text-cyan-400">{deepInfo.cellular.simState}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Red (Carrier)</p>
                                    <p className="text-sm font-bold text-cyan-400 truncate" title={deepInfo.cellular.network}>{deepInfo.cellular.network}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    )}

                    {/* V3 - DEV TOGGLES TAB */}
                    {activeTab === 'devtoggles' && (
                      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-fuchsia-900/40 rounded-xl border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.3)]"><Wrench className="text-fuchsia-400 w-6 h-6" /></div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Opciones de Desarrollador</h3>
                            <p className="text-fuchsia-400 text-sm font-mono tracking-widest">ADVANCED_SYSTEM_CONTROLS</p>
                          </div>
                        </div>

                        <div className="space-y-8 relative z-10">
                          {/* Section 1: Entrada y Visual */}
                          <div>
                            <h4 className="text-lg font-bold text-slate-300 border-b border-slate-700 pb-2 mb-4">Entrada y Visualización</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-fuchsia-300 font-bold mb-2 flex items-center"><Activity className="w-4 h-4 mr-2" /> Mostrar Toques</h4>
                                  <p className="text-xs text-slate-400 mb-6">Muestra un círculo blanco en la pantalla donde tocas.</p>
                                </div>
                                <div className="flex space-x-3">
                                  <button onClick={() => setDevToggle('show_touches', '1')} className="flex-1 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white py-2 rounded-xl font-bold border border-fuchsia-500/30 transition-all text-sm">ON</button>
                                  <button onClick={() => setDevToggle('show_touches', '0')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl font-bold border border-slate-700 transition-all text-sm">OFF</button>
                                </div>
                              </div>
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-fuchsia-300 font-bold mb-2 flex items-center"><Maximize className="w-4 h-4 mr-2" /> Límites de Diseño</h4>
                                  <p className="text-xs text-slate-400 mb-6">Muestra márgenes y bordes de todos los elementos visuales.</p>
                                </div>
                                <div className="flex space-x-3">
                                  <button onClick={() => setDevToggle('debug_layout', '1')} className="flex-1 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white py-2 rounded-xl font-bold border border-fuchsia-500/30 transition-all text-sm">ON</button>
                                  <button onClick={() => setDevToggle('debug_layout', '0')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl font-bold border border-slate-700 transition-all text-sm">OFF</button>
                                </div>
                              </div>
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-fuchsia-300 font-bold mb-2 flex items-center"><Activity className="w-4 h-4 mr-2" /> Coordenadas</h4>
                                  <p className="text-xs text-slate-400 mb-6">Muestra una barra con las coordenadas X/Y del puntero en vivo.</p>
                                </div>
                                <div className="flex space-x-3">
                                  <button onClick={() => setDevToggle('pointer_location', '1')} className="flex-1 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white py-2 rounded-xl font-bold border border-fuchsia-500/30 transition-all text-sm">ON</button>
                                  <button onClick={() => setDevToggle('pointer_location', '0')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl font-bold border border-slate-700 transition-all text-sm">OFF</button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Animaciones */}
                          <div>
                            <h4 className="text-lg font-bold text-slate-300 border-b border-slate-700 pb-2 mb-4">Escalas de Animación</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50">
                                <h4 className="text-fuchsia-300 font-bold mb-4">Escala de Ventana</h4>
                                <select onChange={(e) => setDevToggle('window_animation_scale', e.target.value)} className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700 focus:border-fuchsia-500 outline-none transition-all">
                                  <option value="1">1x (Normal)</option>
                                  <option value="0.5">0.5x (Rápido)</option>
                                  <option value="2">2x (Lento)</option>
                                  <option value="0">Desactivadas</option>
                                </select>
                              </div>
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50">
                                <h4 className="text-fuchsia-300 font-bold mb-4">Escala de Transición</h4>
                                <select onChange={(e) => setDevToggle('transition_animation_scale', e.target.value)} className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700 focus:border-fuchsia-500 outline-none transition-all">
                                  <option value="1">1x (Normal)</option>
                                  <option value="0.5">0.5x (Rápido)</option>
                                  <option value="2">2x (Lento)</option>
                                  <option value="0">Desactivadas</option>
                                </select>
                              </div>
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50">
                                <h4 className="text-fuchsia-300 font-bold mb-4">Escala de Duración</h4>
                                <select onChange={(e) => setDevToggle('animator_duration_scale', e.target.value)} className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700 focus:border-fuchsia-500 outline-none transition-all">
                                  <option value="1">1x (Normal)</option>
                                  <option value="0.5">0.5x (Rápido)</option>
                                  <option value="2">2x (Lento)</option>
                                  <option value="0">Desactivadas</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Section 3: Sistema y Depuración */}
                          <div>
                            <h4 className="text-lg font-bold text-slate-300 border-b border-slate-700 pb-2 mb-4">Aplicaciones y Depuración de Hardware</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-fuchsia-300 font-bold mb-2">Pantalla Activa</h4>
                                  <p className="text-xs text-slate-400 mb-6">Mantiene la pantalla encendida mientras el dispositivo carga o está conectado al USB.</p>
                                </div>
                                <div className="flex space-x-3">
                                  <button onClick={() => setDevToggle('stay_awake', '7')} className="flex-1 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white py-2 rounded-xl font-bold border border-fuchsia-500/30 transition-all text-sm">ON</button>
                                  <button onClick={() => setDevToggle('stay_awake', '0')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl font-bold border border-slate-700 transition-all text-sm">OFF</button>
                                </div>
                              </div>
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-fuchsia-300 font-bold mb-2">Destruir Actividades</h4>
                                  <p className="text-xs text-slate-400 mb-6">Fuerza a cerrar cada actividad tan pronto como el usuario la abandona.</p>
                                </div>
                                <div className="flex space-x-3">
                                  <button onClick={() => setDevToggle('dont_keep_activities', '1')} className="flex-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white py-2 rounded-xl font-bold border border-red-500/30 transition-all text-sm">ON</button>
                                  <button onClick={() => setDevToggle('dont_keep_activities', '0')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl font-bold border border-slate-700 transition-all text-sm">OFF</button>
                                </div>
                              </div>
                              <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-900/50 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-fuchsia-300 font-bold mb-2">Modo Estricto / Overdraw</h4>
                                  <p className="text-xs text-slate-400 mb-6">Parpadea la pantalla al usar mucho el hilo principal o muestra superposición de GPU.</p>
                                </div>
                                <div className="flex space-x-3">
                                  <button onClick={() => setDevToggle('strict_mode_visual', '1')} className="flex-1 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white py-2 rounded-xl font-bold border border-fuchsia-500/30 transition-all text-sm">Strict</button>
                                  <button onClick={() => setDevToggle('gpu_overdraw', 'show')} className="flex-1 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white py-2 rounded-xl font-bold border border-fuchsia-500/30 transition-all text-sm">Overdraw</button>
                                  <button onClick={() => { setDevToggle('strict_mode_visual', '0'); setDevToggle('gpu_overdraw', 'false'); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl font-bold border border-slate-700 transition-all text-sm">OFF</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V3 - THERMAL PROFILER TAB */}
                    {activeTab === 'thermal' && (
                      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden min-h-[500px]">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-orange-900/40 rounded-xl border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]"><Flame className="text-orange-400 w-6 h-6" /></div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Monitor Térmico y Estrés en Vivo</h3>
                            <p className="text-orange-400 text-sm font-mono tracking-widest">LIVE_HARDWARE_METRICS</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                          <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-orange-900/50 flex flex-col items-center justify-center h-48">
                            <Thermometer className={`w-8 h-8 mb-4 ${thermalData.length && thermalData[thermalData.length - 1].batteryTemp > 40 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`} />
                            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Temperatura Batería</h4>
                            <p className="text-4xl font-mono font-bold text-white">
                              {thermalData.length > 0 ? thermalData[thermalData.length - 1].batteryTemp.toFixed(1) : '--'}°C
                            </p>
                          </div>

                          <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-orange-900/50 flex flex-col items-center justify-center h-48">
                            <Cpu className="w-8 h-8 mb-4 text-orange-400" />
                            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Carga Estimada CPU</h4>
                            <p className="text-4xl font-mono font-bold text-white">
                              {thermalData.length > 0 ? thermalData[thermalData.length - 1].cpuLoadPercent : '--'}%
                            </p>
                          </div>

                          <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-orange-900/50 flex flex-col items-center justify-center h-48">
                            <MemoryStick className={`w-8 h-8 mb-4 ${thermalData.length && thermalData[thermalData.length - 1].ramUsagePercent > 85 ? 'text-red-500' : 'text-orange-400'}`} />
                            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Presión de RAM</h4>
                            <p className="text-4xl font-mono font-bold text-white">
                              {thermalData.length > 0 ? thermalData[thermalData.length - 1].ramUsagePercent : '--'}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 w-full">
                          <div className="lg:col-span-2 bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-orange-900/50 h-72">
                            <h4 className="text-orange-400 font-bold mb-4 flex items-center"><Activity className="w-4 h-4 mr-2" /> Historial de Temperatura (Batería)</h4>
                            {thermalData.length > 0 ? (
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={thermalData}>
                                    <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                                    <YAxis domain={['auto', 'auto']} stroke="#475569" />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                    <Line type="monotone" dataKey="batteryTemp" stroke="#f97316" strokeWidth={3} dot={false} isAnimationActive={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500">Esperando telemetría...</div>
                            )}
                          </div>

                          <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-orange-900/50 h-72 overflow-y-auto">
                            <h4 className="text-orange-400 font-bold mb-4 flex items-center"><Cpu className="w-4 h-4 mr-2" /> Procesos de Mayor Impacto</h4>
                            {thermalData.length > 0 && thermalData[thermalData.length - 1].topProcesses?.length > 0 ? (
                              <div className="space-y-4">
                                {thermalData[thermalData.length - 1].topProcesses.map((proc: any, i: number) => (
                                  <div key={i} className="flex flex-col">
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-slate-300 truncate max-w-[75%]" title={proc.process}>{proc.process}</span>
                                      <span className="text-orange-400 font-mono font-bold">{proc.percent}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-gradient-to-r from-orange-600 to-yellow-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, parseFloat(proc.percent))}%` }}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-sm pb-10">
                                <Activity className="w-6 h-6 mb-2 animate-spin" />
                                Escaneando procesos...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* STRESS TESTS COMPONENT */}
                        <div className="mt-8 bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-orange-900/50 relative z-10 w-full">
                          <h4 className="text-orange-400 font-bold mb-6 flex items-center"><Zap className="w-5 h-5 mr-2" /> Pruebas de Estrés de Hardware (Stress Tests)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* CPU Stress */}
                            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700/50">
                              <h5 className="font-bold text-slate-200 mb-2 flex items-center"><Cpu className="w-4 h-4 mr-2 text-orange-400"/> CPU (Procesador)</h5>
                              <p className="text-xs text-slate-400 mb-4 h-12">Satura los núcleos del procesador generando hashes criptográficos infinitos.</p>
                              <div className="flex space-x-2">
                                <button onClick={() => handleStressTest('cpu', 'start')} className="flex-1 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white py-2 rounded-lg font-bold border border-orange-500/30 transition-all text-xs">Iniciar</button>
                                <button onClick={() => handleStressTest('cpu', 'stop')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold border border-slate-600 transition-all text-xs">Detener</button>
                              </div>
                            </div>

                            {/* GPU Stress */}
                            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700/50">
                              <h5 className="font-bold text-slate-200 mb-2 flex items-center"><MonitorPlay className="w-4 h-4 mr-2 text-fuchsia-400"/> GPU (Gráficos)</h5>
                              <p className="text-xs text-slate-400 mb-4 h-12">Fuerza el renderizado masivo de WebGL mediante miles de polígonos simultáneos.</p>
                              <div className="flex space-x-2">
                                <button onClick={() => handleStressTest('gpu', 'start')} className="flex-1 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white py-2 rounded-lg font-bold border border-fuchsia-500/30 transition-all text-xs">Iniciar</button>
                                <button onClick={() => handleStressTest('gpu', 'stop')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold border border-slate-600 transition-all text-xs">Detener</button>
                              </div>
                            </div>

                            {/* Video Stress */}
                            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-700/50">
                              <h5 className="font-bold text-slate-200 mb-2 flex items-center"><Film className="w-4 h-4 mr-2 text-cyan-400"/> Acelerador de Video</h5>
                              <p className="text-xs text-slate-400 mb-4 h-12">Fuerza la decodificación de video en alta definición (H.264/HEVC) en pantalla.</p>
                              <div className="flex space-x-2">
                                <button onClick={() => handleStressTest('video', 'start')} className="flex-1 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white py-2 rounded-lg font-bold border border-cyan-500/30 transition-all text-xs">Iniciar</button>
                                <button onClick={() => handleStressTest('video', 'stop')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold border border-slate-600 transition-all text-xs">Detener</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V3 - SPOOFING & HARDWARE SIMULATION TAB */}
                    {activeTab === 'spoofing' && (
                      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-purple-900/40 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"><Radar className="text-purple-400 w-6 h-6" /></div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Inyección de Estados Falsos (Spoofing)</h3>
                            <p className="text-purple-400 text-sm font-mono tracking-widest">SYSTEM_HAL_BYPASS</p>
                          </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 flex items-start space-x-3">
                          <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-300">
                            <strong className="text-red-400">Peligro:</strong> Estas herramientas interceptan la comunicación entre el Kernel (HAL) y Android. El dispositivo creerá ciegamente la información proporcionada aquí. Asegúrate de restaurar los valores al terminar.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                          <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-purple-900/50">
                            <h4 className="text-purple-300 font-bold mb-4 flex items-center"><Battery className="w-5 h-5 mr-2" /> Engaño de Batería (Battery Bypass)</h4>
                            <p className="text-xs text-slate-400 mb-6">Fuerza a Android a creer que tiene un porcentaje de batería específico, útil para probar el ahorro de energía o alertas.</p>

                            <div className="space-y-4 mb-6">
                              <button onClick={() => handleSpoof('battery_level', 1)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold border border-slate-700 transition-all text-sm flex justify-center items-center">
                                Forzar al 1% (Modo Crítico)
                              </button>
                              <button onClick={() => handleSpoof('battery_level', 15)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold border border-slate-700 transition-all text-sm flex justify-center items-center">
                                Forzar al 15% (Ahorro de Energía)
                              </button>
                              <button onClick={() => handleSpoof('battery_level', 100)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold border border-slate-700 transition-all text-sm flex justify-center items-center">
                                Simular Carga Completa (100%)
                              </button>
                            </div>

                            <button onClick={() => handleSpoof('battery_unplug')} className="w-full bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white py-3 rounded-xl font-bold border border-purple-500/30 transition-all text-sm flex justify-center items-center">
                              Simular Cable Desconectado
                            </button>
                          </div>

                          <div className="bg-[#030712]/80 backdrop-blur-md p-6 rounded-2xl border border-purple-900/50 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-purple-900/20 rounded-full flex items-center justify-center border border-purple-500/30 mb-6">
                              <ShieldAlert className="w-12 h-12 text-purple-400" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-200 mb-2">Restauración del Sistema</h4>
                            <p className="text-slate-400 text-sm mb-8">Devuelve el control de los sensores de hardware al sistema operativo de Android de forma natural.</p>
                            <button onClick={() => handleSpoof('battery_reset')} className="w-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white py-4 rounded-xl font-bold border border-red-500/30 transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                              🔴 RESTAURAR HARDWARE ORIGINAL
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V3 - REPAIR AND TEST TOOLS TAB */}
                    {activeTab === 'repair' && (
                      <div className="bg-[#0f172a] border border-blue-900/50 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex items-center space-x-3 mb-8 relative z-10">
                          <div className="p-3 bg-blue-900/40 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"><Wrench className="text-blue-400 w-6 h-6" /></div>
                          <div>
                            <h3 className="text-2xl font-bold text-slate-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Reparación y Test de Hardware</h3>
                            <p className="text-blue-400 text-sm font-mono tracking-widest">DIAGNOSTIC_SUITE_V1</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                          
                          {/* Hardware Tests */}
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><Smartphone className="w-5 h-5 mr-2 text-blue-400"/> Pruebas Físicas</h4>
                            
                            <div className="space-y-4">
                              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <h5 className="font-bold text-slate-200 mb-1">Pantalla Táctil (Pointer Location)</h5>
                                <p className="text-xs text-slate-400 mb-3">Dibuja en la pantalla para encontrar zonas muertas del táctil.</p>
                                <div className="flex space-x-2">
                                  <button onClick={() => handlePointerLocationToggle(true)} className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded-lg font-bold border border-blue-500/30 transition-all text-sm">Activar Trazos</button>
                                  <button onClick={() => handlePointerLocationToggle(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold border border-slate-600 transition-all text-sm">Desactivar</button>
                                </div>
                              </div>

                              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <h5 className="font-bold text-slate-200 mb-1">Motor Haptico / Vibración</h5>
                                <p className="text-xs text-slate-400 mb-3">Fuerza una vibración de 1 segundo para probar el motor físico.</p>
                                <button onClick={handleHardwareVibrate} className="w-full bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white py-2 rounded-lg font-bold border border-indigo-500/30 transition-all text-sm">
                                  Probar Vibración
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Network Tests */}
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><Wifi className="w-5 h-5 mr-2 text-cyan-400"/> Red y Conectividad</h4>
                            
                            <div className="space-y-4">
                              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <h5 className="font-bold text-slate-200 mb-1">Ciclo de Redes (Airplane Toggle)</h5>
                                <p className="text-xs text-slate-400 mb-3">Reinicia el módem de radio, WiFi y Bluetooth forzando un ciclo de Modo Avión.</p>
                                <button onClick={handleNetworkReset} className="w-full bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white py-2 rounded-lg font-bold border border-cyan-500/30 transition-all text-sm">
                                  Reiniciar Antenas
                                </button>
                              </div>

                              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <h5 className="font-bold text-slate-200 mb-1">Prueba de Ping Global</h5>
                                <div className="flex space-x-2 mb-2">
                                  <button onClick={handleNetworkPing} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded-lg font-bold text-xs">Test 8.8.8.8</button>
                                </div>
                                <div className="bg-black/50 p-2 rounded border border-slate-800 font-mono text-[10px] text-green-400 h-20 overflow-y-auto whitespace-pre-wrap">
                                  {repairPingResult || 'Presiona test para verificar latencia...'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Error Logs */}
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 lg:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-xl font-bold text-slate-200 flex items-center"><ServerCrash className="w-5 h-5 mr-2 text-red-400"/> Extractor de Fallos (Logcat FATAL)</h4>
                              <button onClick={fetchCrashLogs} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-1.5 rounded-lg font-bold border border-red-500/30 transition-all text-sm flex items-center">
                                <RefreshCw className="w-4 h-4 mr-2" /> Extraer Errores
                              </button>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">Muestra únicamente los últimos cierres forzados (Force Close) y errores fatales del sistema, ideal para diagnosticar teléfonos inestables.</p>
                            <div className="bg-[#0a0a0f] p-4 rounded-xl border border-red-900/30 font-mono text-xs text-red-300 h-64 overflow-y-auto whitespace-pre-wrap shadow-inner">
                              {repairCrashLogs || 'Haz clic en "Extraer Errores" para leer el logcat.'}
                            </div>
                          </div>

                          {/* Bloatware & Cache */}
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 lg:col-span-2">
                            <h4 className="text-xl font-bold text-slate-200 mb-4 flex items-center"><Box className="w-5 h-5 mr-2 text-emerald-400"/> Limpieza Profunda y Bloatware</h4>
                            <p className="text-sm text-slate-400 mb-4">Deshabilita aplicaciones de fábrica o borra su caché para liberar espacio y RAM.</p>
                            
                            <div className="max-h-80 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                              {repairAppsList.length > 0 ? repairAppsList.map((app, idx) => (
                                <div key={idx} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center hover:bg-slate-800 transition-colors">
                                  <div className="flex flex-col truncate pr-4 w-1/2">
                                    <span className="font-mono text-sm text-slate-200 truncate">{app.packageName}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${app.isSystem ? 'text-red-400' : 'text-emerald-400'}`}>
                                      {app.isSystem ? 'Sistema' : 'Usuario'}
                                    </span>
                                  </div>
                                  <div className="flex space-x-2 shrink-0">
                                    <button onClick={() => handleRepairAppAction(app.packageName, 'clear')} title="Borrar Caché y Datos" className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded border border-emerald-500/30 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleRepairAppAction(app.packageName, 'disable')} title="Congelar (Deshabilitar)" className="p-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded border border-orange-500/30 transition-colors">
                                      <PowerOff className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleRepairAppAction(app.packageName, 'uninstall')} title="Desinstalar (User 0)" className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded border border-red-500/30 transition-colors">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )) : (
                                <div className="text-center py-8 text-slate-500">
                                  <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                                  <p>Cargando lista de aplicaciones...</p>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </main>


      {/* GLOBAL TOAST NOTIFICATIONS */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700/50 overflow-hidden shadow-lg shrink-0">
                    {appInfos[selectedApp.packageName]?.icon ? (
                      <img src={appInfos[selectedApp.packageName].icon} alt="Icon" className="w-full h-full object-cover" />
                    ) : (
                      <Box className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-white mb-1 truncate" title={appInfos[selectedApp.packageName]?.title}>
                      {appInfos[selectedApp.packageName]?.title || 'Cargando...'}
                    </h2>
                    <p className="font-mono text-xs text-orange-400 truncate">{selectedApp.packageName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Clasificación de Riesgo</h4>
                  <div className="flex items-center space-x-3">
                    <ShieldAlert className={`w-5 h-5 shrink-0 ${selectedApp.importance === 1 ? 'text-red-500' :
                      selectedApp.importance === 2 ? 'text-blue-500' :
                        selectedApp.importance === 3 ? 'text-purple-500' :
                          selectedApp.importance === 4 ? 'text-yellow-500' :
                            'text-green-500'
                      }`} />
                    <span className="font-bold text-slate-200">{selectedApp.category}</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Descripción Comercial</h4>
                  <p className="text-sm text-slate-300 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                    {appInfos[selectedApp.packageName]?.summary || (appInfos[selectedApp.packageName] ? 'Sin descripción detallada.' : 'Buscando metadatos...')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 border-t border-slate-700/50 pt-6">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => triggerDownload(`${API_BASE}/device/${selectedDevice}/apps/pull?package=${selectedApp.packageName}`)}
                  className="flex items-center space-x-2 px-5 py-3 rounded-xl font-bold bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/40 hover:text-cyan-300 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  title="Descargar el archivo instalador (.apk) directamente a tu computadora"
                >
                  <HardDriveDownload className="w-5 h-5" />
                  <span>Extraer APK Original</span>
                </button>
                <button
                  onClick={() => handleUninstallApp(selectedApp)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Desinstalar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAW PROPERTIES MODAL */}
      {showRawProps && deviceInfo?.rawProperties && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full h-[80vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <TerminalSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-100">Propiedades Completas del Dispositivo (getprop)</h3>
                <span className="ml-3 bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">{Object.keys(deviceInfo.rawProperties).length} props</span>
              </div>
              <button onClick={() => setShowRawProps(false)} className="text-slate-400 hover:text-white transition-colors">
                <Square className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-800 border-b border-slate-700">
              <input
                type="text"
                placeholder="Buscar propiedad o valor... (ej. ro.build.version)"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                value={propSearch}
                onChange={(e) => setPropSearch(e.target.value)}
              />
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-[#0f172a]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(deviceInfo.rawProperties)
                  .filter(([key, value]) => key.toLowerCase().includes(propSearch.toLowerCase()) || value.toLowerCase().includes(propSearch.toLowerCase()))
                  .map(([key, value]) => (
                  <div key={key} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 break-words flex flex-col justify-between group">
                    <div>
                      <p className="text-indigo-300 text-xs font-mono mb-1">{key}</p>
                      <p className="text-slate-200 text-sm font-mono">{value}</p>
                    </div>
                    <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { navigator.clipboard.writeText(value); addToast('Copiado al portapapeles', 'success'); }} className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded transition-colors" title="Copiar valor">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SENSOR INFO MODAL */}
      {selectedSensor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-slate-100">Información del Sensor</h3>
              </div>
              <button onClick={() => setSelectedSensor(null)} className="text-slate-400 hover:text-white transition-colors">
                <Square className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Nombre Físico del Hardware</p>
                <p className="text-lg font-semibold text-blue-300 bg-blue-950/30 px-3 py-2 rounded-lg border border-blue-900/50">{selectedSensor.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Fabricante (Vendor)</p>
                  <p className="text-sm font-medium text-slate-300">{selectedSensor.vendor}</p>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Categoría del Sistema</p>
                  <p className="text-sm font-medium text-slate-300 font-mono truncate" title={selectedSensor.type}>{selectedSensor.type.replace('android.sensor.', '')}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2 mt-4">¿Para qué sirve este chip?</p>
                <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  {getSensorDescription(selectedSensor.type)}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button onClick={() => setSelectedSensor(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOATWARE SELECTION MODAL */}
      {showBloatwareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Trash2 className="text-red-500 w-8 h-8" />
                <h3 className="text-2xl font-bold text-slate-100">Destruir Bloatware</h3>
              </div>
              <button onClick={() => setShowBloatwareModal(false)} className="text-slate-400 hover:text-white">
                <Square className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Selecciona el bloatware del fabricante que deseas desinstalar. Desmarca los que desees conservar.
            </p>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 space-y-2">
              {apps.filter(a => a.importance === 4).map(app => (
                <label key={app.packageName} className="flex items-center space-x-3 bg-slate-800/50 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-600 text-red-500 focus:ring-red-500/50 bg-slate-900"
                    checked={bloatwareSelection.includes(app.packageName)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBloatwareSelection(prev => [...prev, app.packageName]);
                      } else {
                        setBloatwareSelection(prev => prev.filter(p => p !== app.packageName));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{appInfos[app.packageName]?.title || app.packageName}</p>
                    {appInfos[app.packageName]?.title && <p className="text-xs text-slate-500 font-mono truncate">{app.packageName}</p>}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-slate-700/50 pt-4 relative z-10">
              <span className="text-sm text-slate-400 font-bold">{bloatwareSelection.length} seleccionadas</span>
              <div className="flex space-x-3">
                <button onClick={() => setShowBloatwareModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDestroyBloatware} disabled={bloatwareSelection.length === 0} className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600/80 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                  Destruir Seleccionadas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* GLOBAL TOAST NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto bg-[#0a1128]/90 backdrop-blur-xl border border-cyan-500/50 p-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center space-x-3 transform transition-all duration-300 animate-fade-in max-w-sm">
            <div className="w-2 h-full absolute left-0 top-0 bottom-0 bg-cyan-500 rounded-l-xl"></div>
            <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
            <p className="text-sm font-medium text-slate-200">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* GLOBAL CONFIRM MODAL */}
      {confirmState && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-md w-full rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] transform transition-all">
            <div className="p-6 border-b border-cyan-900/40 bg-[#080d1a]/50 flex items-center space-x-3">
              <ShieldAlert className="w-6 h-6 text-yellow-500 shrink-0" />
              <h3 className="text-xl font-bold text-white tracking-wide">Confirmación Requerida</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-300 mb-8">{confirmState.message}</p>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    confirmState.resolve(false);
                    setConfirmState(null);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmState.resolve(true);
                    setConfirmState(null);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MEDIA VIEWER MODAL */}
      <AnimatePresence>
        {mediaViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setMediaViewer(null)}
          >
            <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-12 right-0">
                <button onClick={() => setMediaViewer(null)} className="p-2 text-white bg-red-500/80 hover:bg-red-500 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="w-full flex justify-between items-center mb-4 px-4 py-2 bg-slate-900/80 rounded-xl border border-slate-700">
                <span className="text-slate-300 font-mono text-sm truncate">{mediaViewer.name}</span>
              </div>
              <div className="w-full flex-1 overflow-hidden flex items-center justify-center bg-black/50 rounded-xl border border-slate-700/50 min-h-[300px]">
                {mediaViewer.type === 'image' ? (
                  <img src={mediaViewer.url} alt={mediaViewer.name} className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl" />
                ) : mediaViewer.type === 'video' ? (
                  <video src={mediaViewer.url} controls autoPlay className="max-w-full max-h-[75vh] rounded-lg shadow-2xl" />
                ) : (
                  <iframe src={mediaViewer.url} className="w-full h-[75vh] bg-white rounded-lg shadow-2xl" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT BUILDER MODAL */}
      <AnimatePresence>
        {showReportBuilder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="bg-[#0f172a] border border-cyan-900/50 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              <div className="bg-[#080d1a] p-4 border-b border-cyan-900/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Printer className="w-5 h-5 mr-2 text-cyan-400" /> Constructor de Reporte
                </h3>
                <button onClick={() => setShowReportBuilder(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400 mb-4">Selecciona los módulos a incluir en tu reporte PDF forense.</p>

                {Object.keys(reportOptions).map((key) => (
                  <label key={key} className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-slate-700/50">
                    <input
                      type="checkbox"
                      checked={(reportOptions as any)[key]}
                      onChange={(e) => setReportOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 bg-slate-700"
                    />
                    <span className="text-slate-200 font-medium capitalize">
                      {key === 'device' ? 'Especificaciones del Equipo' :
                        key === 'battery' ? 'Estado de Batería' :
                          key === 'apps' ? 'Software y Aplicaciones' :
                            key === 'thermal' ? 'Perfil Térmico' :
                              key === 'network' ? 'Configuración de Red' :
                                key === 'malware' ? 'Resultados Deep Scanner' :
                                  key === 'rootRequirements' ? 'Requisitos de Root' :
                                    'Historial de Pruebas (Audit Log)'}
                    </span>
                  </label>
                ))}

                <button
                  onClick={generateReport}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg"
                >
                  <FileText className="w-5 h-5" />
                  <span>Construir y Previsualizar</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT MODAL */}
      <AnimatePresence>
        {reportData && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 print:bg-white print:p-0"
          >
            <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-y-auto print:max-h-none print:shadow-none print:rounded-none">

              <div className="sticky top-0 right-0 p-4 bg-slate-100 border-b border-slate-300 flex justify-end space-x-4 print:hidden z-10">
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center hover:bg-blue-700">
                  <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
                </button>
                <button onClick={() => setReportData(null)} className="px-4 py-2 bg-slate-300 text-slate-800 rounded-lg font-bold hover:bg-slate-400">
                  Cerrar
                </button>
              </div>

              <div className="p-10 text-slate-900 print:p-0">
                <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900">Reporte de Diagnóstico</h1>
                    <p className="text-slate-500 font-mono mt-1">ID: {selectedDevice}</p>
                  </div>
                  <div className="text-right text-sm font-mono text-slate-500">
                    <p>Fecha: {new Date(reportData.timestamp).toLocaleString()}</p>
                    <p>Antigravity Inspector</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  {reportData.options.device && (
                    <div>
                      <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">1. Dispositivo</h2>
                      <ul className="space-y-2 font-mono text-sm">
                        <li><span className="font-bold text-slate-500">Modelo:</span> {reportData.device.model || 'N/A'}</li>
                        <li><span className="font-bold text-slate-500">Fabricante:</span> {reportData.device.manufacturer || 'N/A'}</li>
                        <li><span className="font-bold text-slate-500">Android:</span> {reportData.device.androidVersion || 'N/A'} (SDK {reportData.device.sdk})</li>
                      </ul>
                    </div>
                  )}
                  {reportData.options.battery && (
                    <div>
                      <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">2. Batería</h2>
                      <ul className="space-y-2 font-mono text-sm">
                        <li><span className="font-bold text-slate-500">Nivel:</span> {reportData.battery.level}%</li>
                        <li><span className="font-bold text-slate-500">Salud:</span> {reportData.battery.health}</li>
                        <li><span className="font-bold text-slate-500">Temperatura:</span> {reportData.battery.temperature}°C</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  {reportData.options.apps && (
                    <div>
                      <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">3. Software & Apps</h2>
                      <ul className="space-y-2 font-mono text-sm">
                        <li><span className="font-bold text-slate-500">Total Instaladas:</span> {reportData.apps.installed}</li>
                        <li><span className="font-bold text-slate-500">De Sistema:</span> {reportData.apps.system}</li>
                        <li><span className="font-bold text-slate-500">De Terceros:</span> {reportData.apps.thirdParty}</li>
                      </ul>
                    </div>
                  )}
                  {reportData.options.thermal && reportData.options.network && (
                    <div>
                      <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">4. Telemetría y Red</h2>
                      <ul className="space-y-2 font-mono text-sm">
                        <li><span className="font-bold text-slate-500">Uso CPU Promedio:</span> {reportData.thermal.cpuLoad}%</li>
                        <li><span className="font-bold text-slate-500">Dirección IP (Ruta):</span> {reportData.network.ip}</li>
                      </ul>
                    </div>
                  )}
                </div>

                {reportData.options.apps && (
                  <div>
                    <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">5. Amenazas / Bloatware Encontrado ({reportData.apps.bloatwareFound?.length || 0})</h2>
                    {reportData.apps.bloatwareFound && reportData.apps.bloatwareFound.length > 0 ? (
                      <ul className="list-disc pl-5 font-mono text-sm space-y-1 text-red-700">
                        {reportData.apps.bloatwareFound.map((b: string, i: number) => <li key={i}>{b}</li>)}
                      </ul>
                    ) : (
                      <p className="font-mono text-sm text-green-700">No se encontraron amenazas conocidas en el escaneo rápido.</p>
                    )}
                  </div>
                )}

                {reportData.options.malware && reportData.malwareScanResults && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">Resultados Deep Scanner (Malware / Amenazas Avanzadas)</h2>
                    {reportData.malwareScanResults.length > 0 ? (
                      <ul className="list-disc pl-5 font-mono text-sm space-y-1 text-red-700">
                        {reportData.malwareScanResults.map((m: any, i: number) => (
                          <li key={i}>{m.packageName} <span className="font-bold">({m.riskLevel})</span> - {m.description}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="font-mono text-sm text-green-700">No se encontraron amenazas avanzadas o no se ejecutó el Deep Scanner en esta sesión.</p>
                    )}
                  </div>
                )}

                {reportData.options.rootRequirements && reportData.rootRequirements && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">Requisitos para Root</h2>
                    <ul className="space-y-2 font-mono text-sm mb-4">
                      <li><span className="font-bold text-slate-500">Método Sugerido:</span> {reportData.rootRequirements.method}</li>
                      <li><span className="font-bold text-slate-500">Firmware Actual:</span> {reportData.rootRequirements.currentBuildFirmware}</li>
                      <li><span className="font-bold text-slate-500">Archivos Necesarios:</span> {reportData.rootRequirements.requiredFiles.join(', ')}</li>
                      <li><span className="font-bold text-slate-500">Notas:</span> {reportData.rootRequirements.firmwareNotes}</li>
                    </ul>

                    {reportData.rootRequirements.instructions && reportData.rootRequirements.instructions.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-bold text-slate-700 text-sm mb-2">Instrucciones Exactas:</h3>
                        <ol className="list-decimal pl-5 font-mono text-xs space-y-1 text-slate-600">
                          {reportData.rootRequirements.instructions.map((inst: string, idx: number) => (
                            <li key={idx}>{inst.replace(/^\d+\.\s*/, '')}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {reportData.rootRequirements.links && reportData.rootRequirements.links.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-bold text-slate-700 text-sm mb-2">Herramientas Oficiales:</h3>
                        <div className="flex flex-wrap gap-2 font-mono text-xs">
                          {reportData.rootRequirements.links.map((link: any, idx: number) => (
                            <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                              {link.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {reportData.options.auditLog && (
                  <div className="mt-8 break-before-page">
                    <h2 className="text-xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase text-slate-800">Historial de Pruebas y Diagnósticos (Audit Log)</h2>
                    {reportData.auditLog && reportData.auditLog.length > 0 ? (
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-300">
                            <th className="py-2 text-slate-600">Hora</th>
                            <th className="py-2 text-slate-600">Módulo / Herramienta</th>
                            <th className="py-2 text-slate-600">Acción Registrada</th>
                            <th className="py-2 text-slate-600">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.auditLog.map((log: any, i: number) => (
                            <tr key={i} className="border-b border-slate-200 font-mono text-xs text-slate-700">
                              <td className="py-2 pr-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
                              <td className="py-2 pr-2 font-bold">{log.module}</td>
                              <td className="py-2 pr-2">{log.action}</td>
                              <td className="py-2">{log.result}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="font-mono text-sm text-slate-500">No se registraron pruebas durante esta sesión.</p>
                    )}
                  </div>
                )}

                <div className="mt-16 pt-8 border-t border-slate-300 text-center text-xs text-slate-500">
                  <p>Documento confidencial generado automáticamente por Android Diagnostic Tool.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;
