import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = util.promisify(exec);

export interface SamsungMtpInfo {
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

export class SamsungService {
  private static findSamsungModemPort(): Promise<string | null> {
    return new Promise(async (resolve) => {
      try {
        const ports = await SerialPort.list();
        // Priority 1: Match vendorId 04e8 (Samsung)
        const samsungPort = ports.find(
          (p) =>
            p.vendorId?.toLowerCase() === '04e8' ||
            p.manufacturer?.toLowerCase().includes('samsung') ||
            p.path.toLowerCase().includes('usbmodem')
        );

        if (samsungPort) {
          // On macOS, convert /dev/tty.* to /dev/cu.* for non-blocking serial communication
          const cuPath = samsungPort.path.replace('/dev/tty.', '/dev/cu.');
          resolve(cuPath);
          return;
        }

        // Priority 2: Look for any /dev/cu.usbmodem* device on macOS
        const cuModems = fs.readdirSync('/dev').filter((f) => f.startsWith('cu.usbmodem'));
        if (cuModems.length > 0) {
          resolve(`/dev/${cuModems[0]}`);
          return;
        }

        resolve(null);
      } catch (err) {
        console.error('[SAMSUNG] Error listing ports:', err);
        resolve(null);
      }
    });
  }

  /**
   * Send an AT command to the Samsung USB Modem and collect the response.
   */
  public static async sendAtCommand(
    command: string,
    timeoutMs = 4000,
    portPath?: string
  ): Promise<string> {
    const portToUse = portPath || (await this.findSamsungModemPort());
    if (!portToUse) {
      throw new Error('No se detectó el puerto módem USB de Samsung (/dev/cu.usbmodem*). Conecta el teléfono por USB encendido normalmente.');
    }

    return new Promise((resolve, reject) => {
      let resolved = false;
      let buffer = '';

      const port = new SerialPort({
        path: portToUse,
        baudRate: 115200,
        autoOpen: false,
      });

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { port.close(); } catch {}
          resolve(buffer.trim()); // Return whatever was received before timeout
        }
      }, timeoutMs);

      port.open((err) => {
        if (err) {
          clearTimeout(timer);
          reject(new Error(`No se pudo abrir el puerto ${portToUse}: ${err.message}`));
          return;
        }

        port.on('data', (data: Buffer) => {
          buffer += data.toString('utf-8');
          if (buffer.includes('OK') || buffer.includes('ERROR')) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              setTimeout(() => {
                try { port.close(); } catch {}
                resolve(buffer.trim());
              }, 150);
            }
          }
        });

        const formattedCmd = command.endsWith('\r\n') ? command : `${command}\r\n`;
        port.write(formattedCmd, (writeErr) => {
          if (writeErr) {
            clearTimeout(timer);
            try { port.close(); } catch {}
            reject(new Error(`Error al enviar comando AT: ${writeErr.message}`));
          }
        });
      });

      port.on('error', (portErr) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          try { port.close(); } catch {}
          reject(new Error(`Error en puerto serie: ${portErr.message}`));
        }
      });
    });
  }

  /**
   * Read detailed MTP device information from Samsung (Model, PDA, CSC, IMEI, etc.)
   */
  public static async readInfo(portPath?: string): Promise<SamsungMtpInfo> {
    const portToUse = portPath || (await this.findSamsungModemPort());
    if (!portToUse) {
      throw new Error('No se detectó el puerto módem de Samsung. Asegúrate de que el teléfono esté encendido en pantalla normal y conectado al USB.');
    }

    const info: SamsungMtpInfo = {};

    // 1. Basic AT ping
    try {
      await this.sendAtCommand('AT', 2000, portToUse);
    } catch {}

    // 2. Query DEVCONINFO
    try {
      const devCon = await this.sendAtCommand('AT+DEVCONINFO', 3000, portToUse);
      info.rawDevConInfo = devCon;

      // Parse MN(Model Name)
      const mnMatch = devCon.match(/MN\(([^)]+)\)/i);
      if (mnMatch) info.model = mnMatch[1].trim();

      // Parse PRD (Product code)
      const prdMatch = devCon.match(/PRD\(([^)]+)\)/i);
      if (prdMatch && !info.model) info.model = prdMatch[1].trim();

      // Parse SW Version / PDA
      const verMatch = devCon.match(/VER\(([^)]+)\)/i);
      if (verMatch) info.pda = verMatch[1].trim();

      // Parse IMEI
      const imeiMatch = devCon.match(/IMEI\(([^)]+)\)/i);
      if (imeiMatch) info.imei = imeiMatch[1].trim();

      // Parse Serial
      const snMatch = devCon.match(/SN\(([^)]+)\)/i);
      if (snMatch) info.serialNumber = snMatch[1].trim();
    } catch {}

    // 3. Query VERSNAME
    try {
      const versName = await this.sendAtCommand('AT+VERSNAME=1', 2500, portToUse);
      info.rawVersName = versName;
      const cleanVers = versName.replace(/AT\+VERSNAME=1/g, '').replace(/OK/g, '').trim();
      if (cleanVers && !info.pda) {
        info.pda = cleanVers;
      }
    } catch {}

    // 4. Query PRECONFG (CSC configuration)
    try {
      const preconfg = await this.sendAtCommand('AT+PRECONFG=1,0', 2500, portToUse);
      const cscMatch = preconfg.match(/\+PRECONFG:\s*1,([A-Z0-9]+)/i);
      if (cscMatch) {
        info.csc = cscMatch[1].trim();
      }
    } catch {}

    // 5. Query IMEI via GSN if missing
    if (!info.imei) {
      try {
        const gsn = await this.sendAtCommand('AT+GSN', 2000, portToUse);
        const imeiClean = gsn.replace(/\D/g, '');
        if (imeiClean.length >= 14) {
          info.imei = imeiClean.substring(0, 15);
        }
      } catch {}
    }

    // 6. Query Software version directly
    if (!info.swVer) {
      try {
        const sw = await this.sendAtCommand('AT+SWVER=1', 2000, portToUse);
        const clean = sw.replace(/AT\+SWVER=1/g, '').replace(/OK/g, '').trim();
        if (clean) info.swVer = clean;
      } catch {}
    }

    return info;
  }

  /**
   * Execute the SamFw Test-Mode FRP Exploit
   * @param adbPath Absolute path to adb binary
   * @param onLog Callback to stream progress logs
   */
  public static async executeFrpBypass(
    adbPath: string,
    onLog: (msg: string) => void,
    portPath?: string
  ): Promise<{ success: boolean; message: string }> {
    const portToUse = portPath || (await this.findSamsungModemPort());
    if (!portToUse) {
      throw new Error('Puerto módem USB de Samsung no encontrado. Conecta el teléfono por USB.');
    }

    onLog(`[SAMFW] Puerto módem detectado en: ${portToUse}`);
    onLog(`[SAMFW] Verificando comunicación AT con el dispositivo...`);

    const atCheck = await this.sendAtCommand('AT', 2000, portToUse).catch(() => '');
    onLog(`[SAMFW] Respuesta inicial: ${atCheck || 'OK'}`);

    onLog(`[SAMFW] Leyendo información previa del terminal...`);
    try {
      const info = await this.readInfo(portToUse);
      if (info.model) onLog(`[SAMFW] Modelo: ${info.model}`);
      if (info.pda) onLog(`[SAMFW] Versión PDA: ${info.pda}`);
      if (info.csc) onLog(`[SAMFW] CSC Actual: ${info.csc}`);
      if (info.imei) onLog(`[SAMFW] IMEI: ${info.imei}`);
    } catch (e: any) {
      onLog(`[SAMFW] Info parcial: ${e.message}`);
    }

    onLog(`-----------------------------------------------------`);
    onLog(`[SAMFW EXPLOIT] Enviando secuencia de activación de depuración USB...`);
    onLog(`[SAMFW EXPLOIT] Por favor, asegúrate de haber digitado *#0*# o #*#88#*# en la llamada de emergencia.`);

    const exploitCommands = [
      'AT+KSTRINGB=0,3',
      'AT+DUMPCTRL=1,0',
      'AT+SWATD=0',
      'AT+ACTIVATE=0,0,0',
      'AT+SWATD=1',
      'AT+KSTRINGB=0,3'
    ];

    for (const cmd of exploitCommands) {
      onLog(`[AT ENVIADO] >> ${cmd}`);
      try {
        const resp = await this.sendAtCommand(cmd, 2500, portToUse);
        onLog(`[AT RESPUESTA] << ${resp.replace(/\r?\n/g, ' ')}`);
      } catch (err: any) {
        onLog(`[AT ERROR] ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    onLog(`[SAMFW EXPLOIT] Comandos inyectados. Esperando autorización de ADB en la pantalla del teléfono...`);
    onLog(`[ATENCIÓN] Mira la pantalla de tu Samsung. Debe aparecer "¿Permitir depuración por USB?". Toca "Permitir siempre" y "Aceptar".`);

    // Poll ADB devices for up to 60 seconds
    const startPoll = Date.now();
    let authorized = false;

    while (Date.now() - startPoll < 60000) {
      try {
        const { stdout } = await execAsync(`"${adbPath}" devices`);
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('device') && !line.includes('devices attached') && !line.includes('unauthorized')) {
            authorized = true;
            break;
          }
        }
      } catch {}

      if (authorized) {
        onLog(`[SAMFW] ¡Dispositivo ADB autorizado y detectado con éxito!`);
        break;
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!authorized) {
      return {
        success: false,
        message: 'Tiempo de espera agotado. El diálogo de depuración USB no fue aceptado en el teléfono. Asegúrate de marcar *#0*# o #*#88#*# en Llamada de Emergencia antes de iniciar.'
      };
    }

    onLog(`[SAMFW] Ejecutando purga y finalización del Asistente de Configuración (FRP Bypass)...`);

    const adbCommands = [
      'settings put secure user_setup_complete 1',
      'settings put global device_provisioned 1',
      'settings put secure setup_wizard_has_run 1',
      'content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1',
      'content insert --uri content://settings/global --bind name:s:device_provisioned --bind value:s:1',
      'am broadcast -a com.google.android.c2dm.intent.RECEIVE -n com.google.android.gms/.chimera.GmsIntentOperationService',
      'am start -c android.intent.category.HOME -a android.intent.action.MAIN'
    ];

    for (const cmd of adbCommands) {
      try {
        onLog(`[ADB] >> ${cmd}`);
        await execAsync(`"${adbPath}" shell ${cmd}`);
      } catch (e: any) {
        onLog(`[ADB AVISO] ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    onLog(`[SAMFW] Desbloqueo FRP completado. Reiniciando teléfono para fijar los cambios...`);
    try {
      await execAsync(`"${adbPath}" reboot`);
    } catch {}

    return {
      success: true,
      message: '¡Bypass FRP ejecutado exitosamente! El teléfono se está reiniciando y entrará directamente al sistema sin solicitar la cuenta Google.'
    };
  }

  /**
   * Change Samsung CSC code
   */
  public static async changeCsc(newCsc: string, portPath?: string): Promise<{ success: boolean; message: string }> {
    const portToUse = portPath || (await this.findSamsungModemPort());
    if (!portToUse) {
      throw new Error('Puerto módem no encontrado.');
    }

    const csc = newCsc.trim().toUpperCase();
    if (!csc || csc.length !== 3) {
      throw new Error('El código CSC debe ser de 3 letras (ej. XAA, CHO, MXO, TMB).');
    }

    const cmd = `AT+PRECONFG=2,${csc}`;
    const resp = await this.sendAtCommand(cmd, 3000, portToUse);

    if (resp.includes('OK')) {
      // Reboot
      try {
        await this.sendAtCommand('AT+CFUN=1,1', 2000, portToUse);
      } catch {}
      return {
        success: true,
        message: `CSC cambiado a ${csc} correctamente. El teléfono se está reiniciando.`
      };
    } else {
      throw new Error(`Error devuelto por el dispositivo: ${resp}`);
    }
  }

  /**
   * Reboot device via AT command to Download Mode or Normal
   */
  public static async rebootMode(mode: 'download' | 'recovery' | 'reboot', adbPath: string, portPath?: string): Promise<{ success: boolean; message: string }> {
    // Try ADB first if device is online in ADB
    try {
      if (mode === 'download') {
        await execAsync(`"${adbPath}" reboot download`);
        return { success: true, message: 'Reiniciado a Modo Descarga vía ADB' };
      } else if (mode === 'recovery') {
        await execAsync(`"${adbPath}" reboot recovery`);
        return { success: true, message: 'Reiniciado a Modo Recovery vía ADB' };
      } else {
        await execAsync(`"${adbPath}" reboot`);
        return { success: true, message: 'Reiniciado vía ADB' };
      }
    } catch {}

    // Fallback to AT modem command
    const portToUse = portPath || (await this.findSamsungModemPort());
    if (!portToUse) {
      throw new Error('No se detectó dispositivo conectado por ADB ni por puerto módem.');
    }

    if (mode === 'download') {
      const resp = await this.sendAtCommand('AT+FUS?', 3000, portToUse).catch(() => '');
      return { success: true, message: `Comando de Modo Descarga enviado: ${resp || 'OK'}` };
    } else {
      const resp = await this.sendAtCommand('AT+CFUN=1,1', 3000, portToUse).catch(() => '');
      return { success: true, message: `Comando de reinicio enviado: ${resp || 'OK'}` };
    }
  }

  /**
   * List all available Samsung ports and status
   */
  public static async getPortStatus(): Promise<{ connected: boolean; port: string | null; allPorts: any[] }> {
    try {
      const allPorts = await SerialPort.list();
      const port = await this.findSamsungModemPort();
      return {
        connected: !!port,
        port,
        allPorts
      };
    } catch (e: any) {
      return { connected: false, port: null, allPorts: [] };
    }
  }
}
