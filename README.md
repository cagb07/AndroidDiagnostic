<img width="1016" height="504" alt="image" src="https://github.com/user-attachments/assets/e10defbf-8c40-4237-9e8f-8f2145f89dce" />

Android Diagnostic Platform V3.0

Es una poderosa plataforma web de diagnóstico, control remoto y análisis avanzado para dispositivos Android, construida sobre ADB (Android Debug Bridge). Está diseñada para ofrecer a desarrolladores, técnicos y entusiastas un control sin precedentes sobre el hardware y el software del dispositivo desde una interfaz moderna e interactiva en el navegador.

## 🚀 Tecnologías Principales
* **Frontend:** React, Vite, Tailwind CSS, Framer Motion (para animaciones fluidas HUD), Recharts (para telemetría en tiempo real) y Lucide React.
* **Backend:** Node.js, Express, Axios.
* **Core:** Ejecución de comandos nativos de ADB para interactuar directamente a nivel de Kernel y HAL (Hardware Abstraction Layer).

---

## 🔥 Características Destacadas (Funciones PRO)

### 1. Control Remoto y Transmisión Interactiva (Live Screen)
* **Screen Mirroring en Vivo:** Visualiza la pantalla de tu dispositivo Android directamente en tu navegador con latencia mínima.
* **Control Físico Absoluto:**
  * **Toques (Taps):** Haz clic en la pantalla transmitida y el evento será inyectado instantáneamente en el dispositivo. Las coordenadas se auto-escalan a la resolución nativa.
  * **Gestos (Swipes):** Arrastra el ratón en la imagen para simular desplazamientos por listas, páginas web o desbloquear pantallas mediante patrones.
  * **Botones Físicos:** Barra de navegación integrada que simula hardware físico (Botón Atrás, Inicio, Recientes y Encendido).
* **Grabación de Video Nativa (MP4):** Aprovecha la herramienta `screenrecord` interna de Android para grabar videos de alta calidad directamente y descargarlos a tu computadora de forma remota.

### 2. Monitor Térmico y de Estrés (Thermal Profiler)
* Monitoreo en tiempo real de los "signos vitales" del sistema usando gráficas animadas a 1 FPS.
* **Métricas Extraídas:**
  * **Temperatura de Batería:** Extraída desde los sensores internos mediante `dumpsys battery`.
  * **Carga de CPU:** Monitoreo unificado de procesamiento.
  * **Presión de RAM:** Información extraída desde `dumpsys meminfo` para detectar fugas de memoria o cuellos de botella.

### 3. Escáner Heurístico Anti-Spyware (Módulo de Seguridad)
* Motor de análisis que audita silenciosamente los permisos de todas las aplicaciones de terceros.
* **Sistema de Threat Score (Niveles de Riesgo):** Evalúa combinaciones críticas de permisos (SMS, llamadas, cámara, ubicación, superposición en pantalla).
* **Detección de Apps Fantasmas:** Alerta inmediata si detecta aplicaciones operando en segundo plano que han ocultado su ícono del launcher (`resolve-activity`).
* Permite eliminar las amenazas detectadas con un solo clic (extirpación forzada vía ADB).

### 4. Hardware Spoofing (Simulador de Estados)
* Herramienta avanzada para interceptar la comunicación entre el Kernel (HAL) y Android.
* Simula escenarios como batería en nivel crítico (1%) para probar modos de ahorro de energía.
* Engaña al teléfono simulando que el cable de carga fue desconectado mientras MoniRemo sigue enviando comandos por ese mismo cable.
* Botón rojo de restauración total para devolver el control a los sensores reales del equipo.

---

## 🛠️ Herramientas de Mantenimiento Adicionales

* **Explorador de Archivos:** Navega, inspecciona, elimina masivamente y descarga cualquier archivo o directorio interno.
* **Gestor de Procesos en Vivo:** Visualiza cada hilo en ejecución junto con su consumo de CPU y RAM (`top`), y mátalos forzadamente si es necesario.
* **Destructor de Bloatware:** Lista aplicaciones nativas, extrae sus archivos APK directamente a tu PC, o desinstálalas en lote para limpiar el teléfono de basura del fabricante.

---

## ⚙️ Cómo Ejecutar el Proyecto

1. **Requisitos Previos:**
   - Node.js y npm instalados.
   - Herramientas ADB instaladas y configuradas en el PATH o referenciadas correctamente en el backend.
   - Un dispositivo Android conectado por USB o TCP/IP con la **Depuración USB habilitada** en Opciones de Desarrollador.

2. **Iniciar Backend:**
   ```bash
   cd AndroidDiagnostic/backend
   npm install
   npm run dev
   ```
   El servidor de Express levantará en el puerto `3001`.

3. **Iniciar Frontend:**
   ```bash
   cd AndroidDiagnostic/frontend
   npm install
   npm run dev
   ```
   El servidor de Vite se levantará y podrás acceder a la plataforma desde tu navegador web.

---
*Hecho con tecnología ADB y automatización de sistemas para diagnósticos técnicos avanzados.*
