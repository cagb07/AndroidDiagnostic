import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Wrench,
  Smartphone,
  RefreshCw,
  Zap,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  ExternalLink,
  Power,
  RotateCcw,
  Flame,
  Globe,
  Copy,
  Check
} from 'lucide-react';
import { WebUsbOdinModal } from './WebUsbOdinModal';

const API_BASE = 'http://localhost:3001/api';

interface SamsungMtpInfo {
  model?: string;
  pda?: string;
  csc?: string;
  swVer?: string;
  imei?: string;
  serialNumber?: string;
  carrierId?: string;
  rawDevConInfo?: string;
  rawVersName?: string;
}

export const SamsungToolTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'frp' | 'info' | 'csc' | 'reboot' | 'at'>('frp');
  const [isWebUsbModalOpen, setIsWebUsbModalOpen] = useState(false);
  const [portStatus, setPortStatus] = useState<{ connected: boolean; port: string | null }>({ connected: false, port: null });
  const [checkingPort, setCheckingPort] = useState(false);

  // MTP Info State
  const [mtpInfo, setMtpInfo] = useState<SamsungMtpInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // FRP Exploit State
  const [isExploiting, setIsExploiting] = useState(false);
  const [frpLogs, setFrpLogs] = useState<string[]>([]);
  const [frpResult, setFrpResult] = useState<{ success: boolean; message: string } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // CSC State
  const [selectedCsc, setSelectedCsc] = useState('XAA');
  const [customCsc, setCustomCsc] = useState('');
  const [changingCsc, setChangingCsc] = useState(false);
  const [cscResult, setCscResult] = useState<{ success: boolean; message: string } | null>(null);

  // AT Command State
  const [customAt, setCustomAt] = useState('AT+DEVCONINFO');
  const [atResponse, setAtResponse] = useState<string | null>(null);
  const [sendingAt, setSendingAt] = useState(false);

  // Reboot State
  const [rebooting, setRebooting] = useState(false);
  const [rebootResult, setRebootResult] = useState<string | null>(null);

  // Copied indicator
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const checkStatus = async () => {
    setCheckingPort(true);
    try {
      const res = await axios.get(`${API_BASE}/samsung/status`);
      setPortStatus({ connected: res.data.connected, port: res.data.port });
    } catch {
      setPortStatus({ connected: false, port: null });
    } finally {
      setCheckingPort(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [frpLogs]);

  // Read MTP Info
  const handleReadInfo = async () => {
    setLoadingInfo(true);
    setInfoError(null);
    try {
      const res = await axios.get(`${API_BASE}/samsung/read-info`);
      if (res.data.success) {
        setMtpInfo(res.data.info);
      } else {
        setInfoError(res.data.error || 'No se pudo leer la información');
      }
    } catch (err: any) {
      setInfoError(err.response?.data?.error || err.message || 'Error de comunicación');
    } finally {
      setLoadingInfo(false);
    }
  };

  // Start FRP Exploit via EventSource (SSE)
  const handleStartFrpExploit = () => {
    setIsExploiting(true);
    setFrpLogs(['[INICIO] Iniciando procedimiento de Bypass FRP Samsung...']);
    setFrpResult(null);

    const eventSource = new EventSource(`${API_BASE}/samsung/frp-exploit-stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.log) {
          setFrpLogs((prev) => [...prev, data.log]);
        }
        if (data.finished) {
          setIsExploiting(false);
          eventSource.close();
          if (data.success) {
            setFrpResult({ success: true, message: data.message });
          } else {
            setFrpResult({ success: false, message: data.error || data.message || 'Error desconocido' });
          }
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      setIsExploiting(false);
      eventSource.close();
      setFrpLogs((prev) => [...prev, '[ERROR] Conexión cerrada o error de servidor.']);
      setFrpResult({ success: false, message: 'La conexión se interrumpió.' });
    };
  };

  // Change CSC
  const handleChangeCsc = async () => {
    const targetCsc = customCsc.trim().toUpperCase() || selectedCsc;
    setChangingCsc(true);
    setCscResult(null);
    try {
      const res = await axios.post(`${API_BASE}/samsung/change-csc`, { csc: targetCsc });
      setCscResult({ success: true, message: res.data.message });
    } catch (err: any) {
      setCscResult({ success: false, message: err.response?.data?.error || err.message });
    } finally {
      setChangingCsc(false);
    }
  };

  // Send AT Command
  const handleSendAt = async () => {
    if (!customAt.trim()) return;
    setSendingAt(true);
    setAtResponse(null);
    try {
      const res = await axios.post(`${API_BASE}/samsung/at-command`, { command: customAt.trim() });
      setAtResponse(res.data.response || 'Sin respuesta');
    } catch (err: any) {
      setAtResponse(`ERROR: ${err.response?.data?.error || err.message}`);
    } finally {
      setSendingAt(false);
    }
  };

  // Reboot Mode
  const handleReboot = async (mode: 'download' | 'recovery' | 'reboot') => {
    setRebooting(true);
    setRebootResult(null);
    try {
      const res = await axios.post(`${API_BASE}/samsung/reboot-mode`, { mode });
      setRebootResult(res.data.message);
    } catch (err: any) {
      setRebootResult(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setRebooting(false);
    }
  };

  // Helper to extract binary from PDA version (5th character from end)
  const extractBinary = (pda?: string) => {
    if (!pda || pda.length < 5) return null;
    const clean = pda.trim();
    return clean.charAt(clean.length - 5);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-700/60 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-2xl font-bold text-slate-100">Samsung Service Tool</h3>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                SamFw Engine
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Bypass FRP por Test Mode (*#0*#), lectura MTP sin depuración, cambio de CSC y control de servicio
            </p>
          </div>
        </div>

        {/* CONNECTION STATUS BADGE */}
        <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-xl">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${portStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
            <div className="text-xs">
              <p className="text-slate-400 font-medium">Puerto Módem USB</p>
              <p className="font-mono text-slate-200 font-semibold truncate max-w-[160px]">
                {portStatus.connected ? portStatus.port : 'No detectado'}
              </p>
            </div>
          </div>
          <button
            onClick={checkStatus}
            disabled={checkingPort}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
            title="Escanear puertos USB"
          >
            <RefreshCw className={`w-4 h-4 ${checkingPort ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('frp')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'frp'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Bypass FRP (*#0*#)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('info')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'info'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Leer Info MTP</span>
        </button>

        <button
          onClick={() => setActiveSubTab('csc')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'csc'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Cambiar CSC</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reboot')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'reboot'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>Reinicio & Odin</span>
        </button>

        <button
          onClick={() => setActiveSubTab('at')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'at'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Terminal AT</span>
        </button>

        <button
          onClick={() => setIsWebUsbModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] ml-auto"
        >
          <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Flasheador WebUSB Odin</span>
        </button>
      </div>

      {/* TAB 1: FRP BYPASS TEST MODE */}
      {activeSubTab === 'frp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Instructions and Trigger */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-5 space-y-4">
              <h4 className="text-lg font-bold text-slate-100 flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-amber-400" />
                Instrucciones del Exploit FRP
              </h4>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    Con el teléfono en la pantalla de bienvenida o bloqueo, toca en <strong>Llamada de Emergencia</strong>.
                  </p>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="space-y-1.5 flex-1">
                    <p>Marca en el teclado numérico alguno de estos códigos:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => copyToClipboard('*#0*#')}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-700 font-mono text-cyan-400 px-2.5 py-1 rounded text-xs flex items-center space-x-1"
                      >
                        <span>*#0*#</span>
                        {copiedText === '*#0*# ' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard('#*#88#*#')}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-700 font-mono text-cyan-400 px-2.5 py-1 rounded text-xs flex items-center space-x-1"
                      >
                        <span>#*#88#*# (USA)</span>
                        {copiedText === '#*#88#*#' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard('*#0808#')}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-700 font-mono text-cyan-400 px-2.5 py-1 rounded text-xs flex items-center space-x-1"
                      >
                        <span>*#0808# (USB)</span>
                        {copiedText === '*#0808#' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    Una vez aparezca la pantalla de prueba con cuadros de colores o el menú de servicio, pulsa el botón <strong>Iniciar Bypass FRP</strong> abajo.
                  </p>
                </div>

                <div className="flex items-start space-x-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <p className="text-amber-300 font-semibold">
                    ¡Atento a la pantalla! Aparecerá "¿Permitir depuración por USB?". Marca "Permitir siempre" y toca "Aceptar".
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartFrpExploit}
                disabled={isExploiting}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg ${
                  isExploiting
                    ? 'bg-blue-800/50 text-blue-200 cursor-not-allowed border border-blue-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30'
                }`}
              >
                <Zap className={`w-5 h-5 ${isExploiting ? 'animate-bounce text-amber-300' : ''}`} />
                <span>{isExploiting ? 'Ejecutando Exploit & Esperando ADB...' : '⚡ Iniciar Bypass FRP Samsung'}</span>
              </button>
            </div>

            {/* Exploit Result Notification */}
            {frpResult && (
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  frpResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}
              >
                {frpResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-bold">{frpResult.success ? '¡Desbloqueo Exitoso!' : 'Error en Bypass'}</p>
                  <p className="mt-0.5">{frpResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Exploit Terminal Log */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col h-[420px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center space-x-2 text-slate-400">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-mono">samfw_exploit_console.log</span>
              </div>
              <div className="flex items-center space-x-2">
                {isExploiting && (
                  <span className="flex items-center space-x-1.5 text-blue-400 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span>En ejecución</span>
                  </span>
                )}
                <button
                  onClick={() => setFrpLogs([])}
                  className="text-slate-500 hover:text-slate-300 text-[11px]"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 py-3 space-y-1.5 custom-scrollbar">
              {frpLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                  <p>La consola de logs aparecerá aquí al iniciar el exploit.</p>
                </div>
              ) : (
                frpLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      log.includes('[ERROR]')
                        ? 'text-rose-400 font-semibold'
                        : log.includes('[ATENCIÓN]')
                        ? 'text-amber-300 font-bold bg-amber-950/30 px-2 py-0.5 rounded'
                        : log.includes('¡')
                        ? 'text-emerald-400 font-bold'
                        : log.includes('[AT ENVIADO]')
                        ? 'text-cyan-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: READ MTP INFO */}
      {activeSubTab === 'info' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-100">Lectura de Información MTP (Sin depuración)</h4>
              <p className="text-xs text-slate-400">
                Consulta los registros del terminal Samsung mediante el bus módem AT para obtener el modelo y binario exactos.
              </p>
            </div>
            <button
              onClick={handleReadInfo}
              disabled={loadingInfo}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              <RefreshCw className={`w-4 h-4 ${loadingInfo ? 'animate-spin' : ''}`} />
              <span>{loadingInfo ? 'Leyendo...' : 'Leer Info Ahora'}</span>
            </button>
          </div>

          {infoError && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{infoError}</span>
            </div>
          )}

          {mtpInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Model Card */}
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 relative overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modelo Exacto</span>
                <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">{mtpInfo.model || 'No detectado'}</p>
                {mtpInfo.model && (
                  <a
                    href={`https://samfw.com/firmware/${mtpInfo.model}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-[11px] text-blue-400 hover:text-blue-300 underline mt-2"
                  >
                    <span>Descargar ROM en SamFw</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* PDA & Binary Card */}
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Versión PDA / Software</span>
                <p className="text-sm font-bold font-mono text-slate-100 mt-1 truncate" title={mtpInfo.pda}>
                  {mtpInfo.pda || 'N/A'}
                </p>
                {extractBinary(mtpInfo.pda) && (
                  <span className="inline-block bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 mt-2">
                    BINARIO / BIT: {extractBinary(mtpInfo.pda)}
                  </span>
                )}
              </div>

              {/* CSC Card */}
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Código de Región (CSC)</span>
                <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{mtpInfo.csc || 'N/A'}</p>
                <p className="text-[11px] text-slate-400 mt-1">Configuración actual de operadora</p>
              </div>

              {/* IMEI & Serial */}
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identificadores</span>
                <p className="text-xs font-mono text-slate-300 mt-1 truncate">
                  IMEI: <span className="text-white font-semibold">{mtpInfo.imei || 'N/A'}</span>
                </p>
                <p className="text-xs font-mono text-slate-300 mt-1 truncate">
                  S/N: <span className="text-white font-semibold">{mtpInfo.serialNumber || 'N/A'}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-dashed border-slate-700/80 rounded-2xl p-8 text-center text-slate-400 space-y-3">
              <Smartphone className="w-12 h-12 mx-auto text-slate-600" />
              <div>
                <p className="text-base font-semibold text-slate-300">Sin datos cargados</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conecta tu Samsung encendido normalmente (Modo MTP) y haz clic en "Leer Info Ahora".
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHANGE CSC */}
      {activeSubTab === 'csc' && (
        <div className="max-w-2xl bg-slate-900/90 border border-slate-700/80 rounded-xl p-6 space-y-5">
          <div>
            <h4 className="text-lg font-bold text-slate-100 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-400" />
              Cambio de CSC Samsung (Región / Operadora)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Cambia el Sales Code del dispositivo a una versión libre de fábrica o de tu país sin formatear.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">CSCs Populares Sugeridos:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { code: 'XAA', name: 'USA Libre (Sin bloatware)' },
                  { code: 'CHO', name: 'Chile Libre' },
                  { code: 'MXO', name: 'México Libre' },
                  { code: 'ARO', name: 'Argentina Libre' },
                  { code: 'TMB', name: 'T-Mobile USA' },
                  { code: 'ATT', name: 'AT&T USA' },
                  { code: 'ZTO', name: 'Brasil Libre' },
                  { code: 'COO', name: 'Colombia Libre' }
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setSelectedCsc(item.code);
                      setCustomCsc('');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      selectedCsc === item.code && !customCsc
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <p className="font-mono font-bold text-sm text-white">{item.code}</p>
                    <p className="text-[10px] truncate">{item.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">O ingresa un código CSC manual (3 letras):</label>
              <input
                type="text"
                maxLength={3}
                placeholder="Ej: XAA"
                value={customCsc}
                onChange={(e) => setCustomCsc(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleChangeCsc}
              disabled={changingCsc}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center space-x-2"
            >
              <Globe className="w-4 h-4" />
              <span>{changingCsc ? 'Aplicando cambio...' : `Aplicar CSC (${customCsc || selectedCsc}) & Reiniciar`}</span>
            </button>

            {cscResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
                  cscResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {cscResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{cscResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REBOOT & ODIN CONTROLS */}
      {activeSubTab === 'reboot' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl w-fit mb-3">
                <Flame className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Reiniciar a Download (Odin)</h4>
              <p className="text-xs text-slate-400 mt-1">
                Pone el dispositivo en Modo Descarga directamente vía comando módem / ADB sin tocar botones físicos.
              </p>
            </div>
            <button
              onClick={() => handleReboot('download')}
              disabled={rebooting}
              className="mt-6 w-full py-2.5 bg-sky-600/20 hover:bg-sky-600 border border-sky-500/40 text-sky-300 hover:text-white rounded-xl font-bold text-xs transition-all"
            >
              Entrar a Download Mode
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl w-fit mb-3">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Reiniciar a Recovery</h4>
              <p className="text-xs text-slate-400 mt-1">
                Reinicia en el menú de Android Recovery para formatear caché, data o ver la compilación.
              </p>
            </div>
            <button
              onClick={() => handleReboot('recovery')}
              disabled={rebooting}
              className="mt-6 w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-xl font-bold text-xs transition-all"
            >
              Entrar a Recovery
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="p-3 bg-slate-800 text-slate-300 rounded-xl w-fit mb-3">
                <Power className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Reinicio Normal</h4>
              <p className="text-xs text-slate-400 mt-1">
                Envía la señal de apagado y arranque normal del sistema Android.
              </p>
            </div>
            <button
              onClick={() => handleReboot('reboot')}
              disabled={rebooting}
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl font-bold text-xs transition-all"
            >
              Reiniciar Sistema
            </button>
          </div>

          {/* Tarjeta Destacada: Flasheador WebUSB Odin */}
          <div className="md:col-span-3 bg-gradient-to-r from-sky-950/40 via-slate-900 to-blue-950/40 border border-sky-500/40 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Flasheador WebUSB Odin Moderno (One UI 6 / Bit B)</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Flashea el firmware oficial completo extraído (super.img, BL, AP, CP, CSC) directamente desde Chrome con el protocolo Odin v3.14+ sin Heimdall ni Windows.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsWebUsbModalOpen(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all flex items-center space-x-2 shrink-0"
            >
              <Zap className="w-4 h-4" />
              <span>Abrir Flasheador WebUSB</span>
            </button>
          </div>

          {rebootResult && (
            <div className="md:col-span-3 p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono">
              {rebootResult}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RAW AT TERMINAL */}
      {activeSubTab === 'at' && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 space-y-4">
          <div>
            <h4 className="text-lg font-bold text-slate-100 flex items-center">
              <Terminal className="w-5 h-5 mr-2 text-cyan-400" />
              Terminal de Comandos AT Samsung
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Envía instrucciones de módem de bajo nivel para diagnóstico directo del terminal.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: AT+DEVCONINFO, AT+VERSNAME=1, AT+GSN..."
              value={customAt}
              onChange={(e) => setCustomAt(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 text-white font-mono px-4 py-2.5 rounded-lg text-xs focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={handleSendAt}
              disabled={sendingAt || !customAt.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all flex items-center space-x-1.5"
            >
              <span>{sendingAt ? 'Enviando...' : 'Enviar AT'}</span>
            </button>
          </div>

          {atResponse && (
            <div className="bg-black/80 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
              {atResponse}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE FLASHEO WEBUSB ODIN */}
      <WebUsbOdinModal
        isOpen={isWebUsbModalOpen}
        onClose={() => setIsWebUsbModalOpen(false)}
      />
    </div>
  );
};
