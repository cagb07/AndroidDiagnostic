# Referencia de API - Android Diagnostic Platform

Este documento describe los endpoints disponibles en el backend de la plataforma. La API base es `http://localhost:3001/api`.

## 📋 Tabla de Contenidos
- [Gestión de Dispositivos](#gestión-de-dispositivos)
- [Diagnóstico y Telemetría](#diagnóstico-y-telemetría)
- [Gestión de Aplicaciones](#gestión-de-aplicaciones)
- [Control y Multimedia](#control-y-multimedia)
- [Herramientas Avanzadas](#herramientas-avanzadas)

---

## 📱 Gestión de Dispositivos

### `GET /devices`
Lista todos los dispositivos conectados (ADB y Fastboot).
- **Respuesta:** `200 OK`
  ```json
  {
    "success": true,
    "devices": [
      { "id": "ZY22GZ9V6X", "type": "device" }
    ]
  }
  ```

### `GET /device-info/:id`
Obtiene información detallada del dispositivo (Modelo, Android, Kernel, etc.).
- **Parámetros:** `id` (Serial del dispositivo).

---

## 📊 Diagnóstico y Telemetría

### `GET /battery/:id`
Estado de la batería en tiempo real.
- **Respuesta:**
  ```json
  {
    "success": true,
    "level": 85,
    "status": "Discharging",
    "health": "Good",
    "temp": 32.5
  }
  ```

### `GET /sensors/:id`
Lista los sensores disponibles y sus valores actuales.

---

## 📦 Gestión de Aplicaciones

### `GET /apps/:id`
Lista todas las aplicaciones instaladas (Sistema y Usuario).

### `POST /install-apk/:id`
Sube e instala un archivo APK.
- **Body:** `multipart/form-data` con el campo `apk`.

---

## 🎮 Control y Multimedia

### `GET /screenshot/:id`
Captura la pantalla actual del dispositivo.
- **Respuesta:** Imagen en formato PNG.

### `POST /screenrecord/:id`
Inicia o detiene la grabación de pantalla.
- **Body:** `{ "action": "start" | "stop" }`

---

## 🛠️ Herramientas Avanzadas

### `POST /autopatch`
Automatiza el parcheo de `boot.img` usando Magisk.
- **Requerimiento:** Dispositivo en modo normal con depuración USB.

### `POST /bruteforce`
Inicia un ataque de fuerza bruta para el PIN de bloqueo (Uso educativo/forense).

---

## ⚠️ Códigos de Error Comunes

| Código | Descripción |
| :--- | :--- |
| `400` | Error en los parámetros o comando ADB fallido. |
| `404` | Dispositivo no encontrado o desconectado. |
| `500` | Error interno del servidor o fallo crítico de ADB. |

> 💡 **Tip:** Muchos endpoints requieren que el dispositivo esté autorizado. Si recibes un error de "Unauthorized", acepta el prompt en la pantalla del teléfono.

---
*Referencia actualizada para la versión 3.0.*
