<img width="1016" height="504" alt="image" src="https://github.com/user-attachments/assets/e10defbf-8c40-4237-9e8f-8f2145f89dce" />

# Android Diagnostic Platform V3.0 (TECH HUD)

Es una poderosa plataforma web de diagnóstico, control remoto y análisis avanzado para dispositivos Android, construida sobre ADB (Android Debug Bridge) y Fastboot. Está diseñada para ofrecer a desarrolladores, técnicos forenses y entusiastas un control sin precedentes sobre el hardware y el software del dispositivo desde una interfaz moderna e interactiva en el navegador, con un elegante diseño "Scifi UI".

## 🚀 Tecnologías Principales
* **Frontend:** React, Vite, Tailwind CSS, Framer Motion (animaciones fluidas HUD), Recharts (telemetría en tiempo real) y Lucide React.
* **Backend:** Node.js, Express, Axios.
* **Core:** Ejecución de comandos nativos de ADB y Fastboot para interactuar directamente a nivel de Kernel, HAL (Hardware Abstraction Layer) y sistema de archivos.

---

## 🔥 Características Destacadas (Funciones PRO)

### 1. Control Remoto y Transmisión Interactiva (Live Screen)
* **Screen Mirroring en Vivo:** Visualiza la pantalla de tu dispositivo Android directamente en tu navegador con latencia mínima.
* **Control Físico Absoluto:**
  * **Toques (Taps):** Haz clic en la pantalla transmitida y el evento será inyectado instantáneamente en el dispositivo. Las coordenadas se auto-escalan a la resolución nativa.
  * **Gestos (Swipes):** Arrastra el ratón en la imagen para simular desplazamientos por listas, páginas web o desbloquear pantallas mediante patrones.
  * **Botones Físicos:** Barra de navegación integrada que simula hardware físico (Botón Atrás, Inicio, Recientes y Encendido).
* **Grabación de Video Nativa (MP4):** Aprovecha la herramienta `screenrecord` interna de Android para grabar videos de alta calidad directamente y descargarlos a tu computadora de forma remota.

### 2. Bypass, Desbloqueo y Root (Módulo de Penetración)
* **Ataque de Fuerza Bruta de PIN:** Automatiza la inyección de toques virtuales para probar combinaciones numéricas de contraseñas de pantalla de bloqueo.
* **TWRP / Root Bypass:** Elimina las bases de datos de seguridad del sistema (Locksettings) de forma forzada si el equipo se encuentra en un entorno Recovery.
* **Flasheo de Magisk y AutoPatch:** Herramienta automatizada que descarga Magisk, parchea la imagen de Boot nativa (Motor AutoPatch) y la inyecta mediante Fastboot.

### 3. Monitor Térmico y de Estrés (Thermal Profiler)
* Monitoreo en tiempo real de los "signos vitales" del sistema usando gráficas animadas a 1 FPS.
* Pruebas de estrés y "Burn In" forzando carga en CPU, GPU y Video mediante inyección de cálculos intensivos.
* **Métricas Extraídas:** Temperatura de Batería, Carga de CPU y Presión de RAM (`dumpsys meminfo`).

### 4. Hardware Spoofing (Simulador de Estados)
* Herramienta avanzada para interceptar la comunicación entre el Kernel (HAL) y Android.
* Simula escenarios como batería en nivel crítico (1%) para probar modos de ahorro de energía.
* Engaña al teléfono simulando que el cable de carga fue desconectado mientras la plataforma sigue enviando comandos.

### 5. Escáner Heurístico Anti-Spyware (Módulo de Seguridad)
* Motor de análisis que audita silenciosamente los permisos de todas las aplicaciones de terceros.
* **Sistema de Threat Score (Niveles de Riesgo):** Evalúa combinaciones críticas de permisos (SMS, llamadas, cámara, ubicación, superposición en pantalla).
* **Detección de Apps Fantasmas:** Alerta inmediata si detecta aplicaciones operando en segundo plano que han ocultado su ícono del launcher.

### 6. Inspección de Hardware y Reparación de Sistema
* **Deep Scanner:** Analizador exhaustivo que extrae y visualiza más de 300 propiedades del sistema (`getprop`) con un modal de búsqueda dinámica inteligente y copiado rápido.
* **Testing Físico:** Evalúa y calibra digitalmente componentes como la Pantalla RGB, los sensores capacitivos (Pointer Location), motores de Vibración háptica, Modems de Red, Altavoces y más.

---

## 🛠️ Herramientas de Mantenimiento Adicionales

* **Explorador de Archivos y Gestor de Respaldos:** Navega, inspecciona, elimina masivamente y descarga o sube directorios completos. Soporte para copias de seguridad de aplicaciones enteras.
* **Gestor de Procesos en Vivo:** Visualiza cada hilo en ejecución (`top`) y finalízalo a nivel Kernel.
* **Gestor y Destructor de Bloatware:** Lista aplicaciones nativas, extrae sus archivos APK directamente a tu PC, inhabilítalas para liberar recursos o desinstálalas de raíz.
* **Consola ADB Integrada:** Abre un emulador de terminal dentro de la misma UI y ejecuta comandos nativos desde tu navegador.
* **Extraedor de Logs (Logcat):** Motor que extrae y parsea los errores críticos del sistema y kernel.

---

## ⚙️ Cómo Ejecutar el Proyecto

1. **Requisitos Previos:**
   - Node.js (v18 o superior) y npm instalados.
   - Herramientas ADB y Fastboot instaladas y configuradas en el PATH del sistema o referenciadas en el backend.
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
   El servidor de Vite se levantará y podrás acceder a la interfaz V3.0 (Tech HUD) desde tu navegador web.

---
*Hecho con tecnología ADB, Fastboot y automatización para diagnósticos técnicos avanzados e ingenieros forenses.*
