import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Zap,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Terminal,
  Layers,
  Smartphone,
  Copy,
  Check,
  X,
  ShieldCheck,
  Info
} from 'lucide-react';
import libmjolnir, { OdinDevice, libpit } from '@lineageos-infra/libmjolnir';
import axios from 'axios';

interface PartitionInfo {
  partition: string;
  filename: string;
  relativeUrl: string;
  size: number;
  slot: string;
  selected?: boolean;
}

interface WebUsbOdinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebUsbOdinModal: React.FC<WebUsbOdinModalProps> = ({ isOpen, onClose }) => {
  const [device, setDevice] = useState<OdinDevice | null>(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceConnecting, setDeviceConnecting] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Firmware partitions
  const [partitions, setPartitions] = useState<PartitionInfo[]>([]);
  const [loadingPartitions, setLoadingPartitions] = useState(false);
  const [pitUrl, setPitUrl] = useState<string | null>(null);
  const [flashPit, setFlashPit] = useState(false);
  const [autoReboot, setAutoReboot] = useState(true);

  // Flashing State
  const [isFlashing, setIsFlashing] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentPartName, setCurrentPartName] = useState<string>('');
  const [subProgressText, setSubProgressText] = useState<string>('');
  const [partPercent, setPartPercent] = useState<number>(0);
  const [totalPercent, setTotalPercent] = useState<number>(0);
  const [flashLogs, setFlashLogs] = useState<string[]>([]);
  const [flashSuccess, setFlashSuccess] = useState<boolean | null>(null);

  // Copied indicator
  const [copiedLog, setCopiedLog] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setFlashLogs((prev) => {
      const next = [...prev, `[${time}] ${msg}`];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [flashLogs]);

  // Load partitions when opened
  const loadPartitions = async () => {
    setLoadingPartitions(true);
    try {
      const res = await axios.get('http://localhost:3001/api/odin/session-partitions');
      if (res.data.success && res.data.partitions) {
        setPitUrl(res.data.pitUrl);
        setPartitions(
          res.data.partitions.map((p: any) => ({
            ...p,
            selected: true
          }))
        );
      }
    } catch (err: any) {
      addLog(`Error cargando lista de particiones: ${err.message}`);
    } finally {
      setLoadingPartitions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPartitions();
    } else {
      // Disconnect if closing
      if (device && !isFlashing) {
        try {
          device.close();
        } catch {}
        setDevice(null);
        setDeviceConnected(false);
      }
    }
  }, [isOpen]);

  const toggleSelectPartition = (index: number) => {
    if (isFlashing) return;
    setPartitions((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (selected: boolean) => {
    if (isFlashing) return;
    setPartitions((prev) => prev.map((p) => ({ ...p, selected })));
  };

  // Connect Web Serial or WebUSB
  const handleConnectDevice = async (transportType: 'serial' | 'usb' = 'serial') => {
    setDeviceConnecting(true);
    setDeviceError(null);
    const transportLabel = transportType === 'serial' ? 'Web Serial (CDC ACM)' : 'WebUSB';
    addLog(`Solicitando dispositivo Samsung por ${transportLabel} al navegador...`);

    try {
      if (transportType === 'serial' && !('serial' in navigator)) {
        throw new Error('Tu navegador no soporta Web Serial API. Usa Google Chrome o Microsoft Edge.');
      }
      if (transportType === 'usb' && !('usb' in navigator)) {
        throw new Error('Tu navegador no soporta WebUSB. Usa Google Chrome o Microsoft Edge.');
      }

      const options = {
        logging: true,
        timeout: 60000,
        resetOnInit: false,
        logger: (level: string, ...args: any[]) => {
          const text = args
            .map((a) => (typeof a === 'string' ? a : ''))
            .filter(Boolean)
            .join(' ');
          if (!text) return;

          // Capture progress messages
          if (text.includes('sending part')) {
            const match = text.match(/sending part (\d+) of (\d+)/);
            if (match) {
              const current = parseInt(match[1], 10);
              const total = parseInt(match[2], 10);
              const pct = Math.round((current / total) * 100);
              setPartPercent(pct);
              setSubProgressText(`Parte ${current} de ${total} (${pct}%)`);
            }
          } else if (text.includes('sending sequence')) {
            setSubProgressText(text);
          } else if (level === 'info') {
            addLog(`[Odin] ${text}`);
          }
        }
      };

      // Request device from browser via selected transport
      const odin = transportType === 'serial'
        ? await libmjolnir.requestSerialDevice(options)
        : await libmjolnir.requestDevice(options);

      // Increase internal packet timeout to 120s for large blobs
      (odin as any)._flashTimeout = 120000;

      addLog(`Dispositivo seleccionado por usuario. Iniciando protocolo Odin vía ${transportLabel}...`);
      await odin.initialize();
      addLog('✓ Handshake Odin completado con éxito (LOKE handshake OK)');

      // Pre-load official PIT table into device object without starting a premature flash session
      let pitLoaded = false;
      if (pitUrl) {
        try {
          addLog('Cargando tabla de particiones (PIT) oficial del firmware...');
          const pitResp = await fetch(`http://localhost:3001${pitUrl}`);
          const pitBuffer = await pitResp.arrayBuffer();
          const pitData = new libpit.PitData();
          if (pitData.unpack(new Uint8Array(pitBuffer))) {
            (odin as any)._devicePit = pitData;
            addLog(`✓ Tabla PIT verificada: ${pitData.entries.length} particiones listas para flasheo`);
            pitLoaded = true;
          }
        } catch (e: any) {
          console.warn('Could not load PIT from server:', e);
        }
      }

      if (!pitLoaded) {
        addLog('Leyendo tabla de particiones (PIT) directamente del dispositivo...');
        await odin.beginSession();
        const pit = await odin.getPitData();
        await odin.endSession(false);
        addLog(`✓ Tabla PIT leída del dispositivo: ${pit.entries.length} particiones reconocidas`);
      }

      odin.onDisconnect(() => {
        addLog('Dispositivo desconectado por el usuario.');
        setDeviceConnected(false);
        setDevice(null);
      });

      setDevice(odin);
      setDeviceConnected(true);
      addLog(`✓ Dispositivo Samsung listo (${transportLabel}). Selecciona las particiones y pulsa INICIAR FLASHEO.`);
    } catch (err: any) {
      console.error('Connection error:', err);
      const msg = err.message || 'Error de conexión';
      setDeviceError(msg);
      addLog(`[ERROR] Conexión fallida: ${msg}`);
      if (msg.includes('No device selected') || msg.includes('Failed to open serial port') || msg.includes('No port selected')) {
        addLog('Nota: Debes seleccionar el dispositivo Samsung en el diálogo emergente del navegador.');
      }
    } finally {
      setDeviceConnecting(false);
    }
  };

  // Execute Flashing
  const handleStartFlashing = async () => {
    if (!device) {
      alert('Conecta el dispositivo primero por Web Serial o WebUSB.');
      return;
    }

    const selectedParts = partitions.filter((p) => p.selected);
    if (selectedParts.length === 0) {
      alert('Selecciona al menos una partición para flashear.');
      return;
    }

    const totalBytesToFlash = selectedParts.reduce((acc, p) => acc + p.size, 0);
    let flashedBytes = 0;

    setIsFlashing(true);
    setFlashSuccess(null);
    setTotalPercent(0);
    setCurrentPartIndex(0);
    addLog('=============================================');
    addLog(`INICIANDO FLASHEO DE ${selectedParts.length} PARTICIONES (${(totalBytesToFlash / (1024 * 1024)).toFixed(1)} MB)`);
    addLog('=============================================');

    try {
      addLog('Iniciando sesión Odin en el dispositivo...');
      await device.beginSession();
      addLog('✓ Sesión Odin iniciada exitosamente.');

      // 1. Flash PIT if explicitly requested
      if (flashPit && pitUrl) {
        addLog('Descargando archivo PIT oficial...');
        const pitResp = await fetch(`http://localhost:3001${pitUrl}`);
        const pitBlob = await pitResp.blob();
        addLog('Flasheando y re-particionando dispositivo con PIT oficial...');
        await device.flashPit(pitBlob);
        addLog('✓ Re-particionado completado exitosamente.');
        // Re-begin session since flashPit terminates it
        await device.beginSession();
      }

      // Ensure device PIT is unpacked in session
      if (!device._devicePit && pitUrl) {
        const pitResp = await fetch(`http://localhost:3001${pitUrl}`);
        const pitBuffer = await pitResp.arrayBuffer();
        const pitData = new libpit.PitData();
        pitData.unpack(new Uint8Array(pitBuffer));
        (device as any)._devicePit = pitData;
      }

      // 2. Flash each selected partition in a single uninterrupted Odin session
      for (let i = 0; i < selectedParts.length; i++) {
        const part = selectedParts[i];
        setCurrentPartIndex(i + 1);
        setCurrentPartName(part.partition);
        setPartPercent(0);
        setSubProgressText(`Descargando ${part.filename} (${(part.size / (1024 * 1024)).toFixed(1)} MB)...`);
        addLog(`[${i + 1}/${selectedParts.length}] Flasheando partición: ${part.partition} (${part.filename})`);

        // Fetch blob from localhost
        const tStart = Date.now();
        const resp = await fetch(`http://localhost:3001${part.relativeUrl}`);
        if (!resp.ok) {
          throw new Error(`Error descargando blob de ${part.filename} desde el servidor`);
        }
        const blob = await resp.blob();

        const entry = device._devicePit?.findEntryByName(part.partition);
        if (!entry) {
          throw new Error(`Partición ${part.partition} no encontrada en la tabla PIT`);
        }

        // Send file to Samsung device within the current session
        setSubProgressText(`Transmitiendo a Samsung (${(part.size / (1024 * 1024)).toFixed(1)} MB)...`);
        await (device as any).setFlashTotalSize(blob.size);
        await (device as any).sendFile(blob, entry.binaryType, entry.deviceType, entry.identifier);

        const duration = ((Date.now() - tStart) / 1000).toFixed(1);
        flashedBytes += part.size;
        const totalPct = Math.min(100, Math.round((flashedBytes / totalBytesToFlash) * 100));
        setTotalPercent(totalPct);
        addLog(`✓ ${part.partition} completada en ${duration}s.`);
      }

      // 3. Finalize
      addLog('=============================================');
      addLog('✓ ¡TODAS LAS PARTICIONES HAN SIDO FLASHEADAS CON ÉXITO!');
      addLog('=============================================');
      setFlashSuccess(true);

      if (autoReboot) {
        addLog('Reiniciando dispositivo Samsung...');
        await device.reboot();
        addLog('Dispositivo reiniciado. Se desconectará de modo Odin.');
        setDeviceConnected(false);
        setDevice(null);
      } else {
        await (device as any).endSession(false);
      }
    } catch (err: any) {
      console.error('Flashing error:', err);
      const msg = err.message || 'Error durante el flasheo';
      addLog(`[CRÍTICO] Falló el flasheo en partición ${currentPartName || 'inicial'}: ${msg}`);
      setFlashSuccess(false);
      try {
        await (device as any).endSession(false);
      } catch {}
    } finally {
      setIsFlashing(false);
    }
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(flashLogs.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  if (!isOpen) return null;

  const selectedCount = partitions.filter((p) => p.selected).length;
  const totalMb = (partitions.filter((p) => p.selected).reduce((acc, p) => acc + p.size, 0) / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-sky-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(14,165,233,0.25)] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-500/40 rounded-xl text-sky-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-white tracking-wide">
                  Flasheador WebUSB Odin Moderno
                </h3>
                <span className="bg-sky-500/20 text-sky-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-sky-500/30 font-bold uppercase">
                  LibMjolnir (LineageOS Engine)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Comunicación nativa USB directa con el bootloader Samsung (One UI 6 / Bit B) sin drivers ni emuladores
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isFlashing}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: CONEXIÓN USB */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl border ${deviceConnected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-white">Dispositivo Samsung:</span>
                  {deviceConnected ? (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      CONECTADO EN MODO ODIN
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                      NO CONECTADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {deviceConnected
                    ? 'Handshake ODIN/LOKE completado y sesión de flasheo lista.'
                    : 'Asegúrate de que la pantalla del teléfono muestre "Downloading...".'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!deviceConnected ? (
                <>
                  <button
                    onClick={() => handleConnectDevice('serial')}
                    disabled={deviceConnecting || isFlashing}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
                    title="Utiliza la interfaz CDC ACM Serial de macOS/Chrome. Evita errores de transferIn."
                  >
                    <Zap className={`w-4 h-4 ${deviceConnecting ? 'animate-spin' : ''}`} />
                    <span>{deviceConnecting ? 'Conectando...' : 'Conectar Web Serial (Recomendado Mac)'}</span>
                  </button>

                  <button
                    onClick={() => handleConnectDevice('usb')}
                    disabled={deviceConnecting || isFlashing}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <span>WebUSB</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    try { device?.close(); } catch {}
                    setDevice(null);
                    setDeviceConnected(false);
                    addLog('Dispositivo desconectado por el usuario.');
                  }}
                  disabled={isFlashing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>

          {deviceError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{deviceError}</span>
            </div>
          )}

          {/* STEP 2: PARTICIONES EXTRAÍDAS LISTAS PARA FLASHEO */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-sm text-white">Particiones del Firmware (Extraídas y Auditadas)</h4>
                </div>
                <p className="text-xs text-slate-400">
                  {loadingPartitions
                    ? 'Cargando particiones...'
                    : `${selectedCount} de ${partitions.length} seleccionadas (${totalMb} MB total)`}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => selectAll(true)}
                  disabled={isFlashing}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                >
                  Todas
                </button>
                <button
                  onClick={() => selectAll(false)}
                  disabled={isFlashing}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                >
                  Ninguna
                </button>
              </div>
            </div>

            {/* PARTITION CHIPS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {partitions.map((part, idx) => (
                <button
                  key={`${part.slot}-${part.partition}`}
                  onClick={() => toggleSelectPartition(idx)}
                  disabled={isFlashing}
                  className={`p-2 rounded-xl border text-left transition-all font-mono text-[11px] flex flex-col justify-between ${
                    part.selected
                      ? 'bg-sky-950/40 border-sky-500/50 text-sky-200'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs truncate">{part.partition}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-sans">
                      {part.slot}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] opacity-75 mt-1">
                    <span className="truncate max-w-[80px]">{part.filename}</span>
                    <span>{(part.size / (1024 * 1024)).toFixed(0)}MB</span>
                  </div>
                </button>
              ))}
            </div>

            {/* OPTIONS */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReboot}
                  onChange={(e) => setAutoReboot(e.target.checked)}
                  disabled={isFlashing}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500"
                />
                <span>Auto-Reboot al terminar con éxito</span>
              </label>

              {pitUrl && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flashPit}
                    onChange={(e) => setFlashPit(e.target.checked)}
                    disabled={isFlashing}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500"
                  />
                  <span className="text-amber-300">Re-partition con PIT ({pitUrl.split('/').pop()})</span>
                </label>
              )}
            </div>
          </div>

          {/* PROGRESS BARS (WHEN FLASHING) */}
          {isFlashing && (
            <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Flasheando Partición [{currentPartIndex}/{selectedCount}]: <strong className="text-sky-300">{currentPartName}</strong></span>
                </span>
                <span className="font-mono text-sky-300">{subProgressText}</span>
              </div>

              {/* Sub Progress */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-400 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${partPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Progreso Total del Firmware</span>
                <span className="font-mono font-bold text-white">{totalPercent}%</span>
              </div>

              {/* Total Progress */}
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${totalPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* FLASH SUCCESS BANNER */}
          {flashSuccess === true && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-sm flex items-center space-x-3">
              <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
              <div>
                <h5 className="font-bold text-white">¡Flasheo Completado Exitosamente!</h5>
                <p className="text-xs text-emerald-200 mt-0.5">
                  El firmware oficial One UI 6 ha sido escrito en el chip UFS. El dispositivo se está reiniciando con el sistema operativo de fábrica limpio.
                </p>
              </div>
            </div>
          )}

          {/* FLASH FAILURE BANNER */}
          {flashSuccess === false && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-sm flex items-center space-x-3">
              <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
              <div>
                <h5 className="font-bold text-white">Error Durante el Flasheo</h5>
                <p className="text-xs text-rose-200 mt-0.5">
                  Revisa la consola inferior para ver el detalle de la partición rechazada o el mensaje del bootloader.
                </p>
              </div>
            </div>
          )}

          {/* CONSOLA DE LOGS ODIN */}
          <div className="bg-black/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span>Consola Odin Live (WebUSB Protocol)</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyLogs}
                  className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center space-x-1"
                >
                  {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLog ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  onClick={() => setFlashLogs([])}
                  className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="font-mono text-xs text-sky-300/90 h-44 overflow-y-auto custom-scrollbar whitespace-pre-wrap space-y-0.5">
              {flashLogs.length === 0 ? (
                <span className="text-slate-600">// Esperando conexión WebUSB... Haz clic en "Conectar Samsung (WebUSB)".</span>
              ) : (
                flashLogs.map((log, i) => <div key={i}>{log}</div>)
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              {deviceConnected
                ? `Listo para flashear ${selectedCount} particiones (${totalMb} MB)`
                : 'Debes conectar el dispositivo por WebUSB antes de iniciar el flasheo'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isFlashing}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30"
            >
              Cerrar
            </button>

            <button
              onClick={handleStartFlashing}
              disabled={!deviceConnected || isFlashing || selectedCount === 0}
              className={`px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center space-x-2.5 ${
                !deviceConnected || isFlashing || selectedCount === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-600 via-sky-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white shadow-[0_0_30px_rgba(14,165,233,0.4)]'
              }`}
            >
              {isFlashing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Flasheando en Proceso...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>INICIAR FLASHEO ODIN WEBUSB</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
