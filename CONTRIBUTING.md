# Guía de Contribución

¡Gracias por tu interés en mejorar Android Diagnostic Platform! Como proyecto técnico avanzado, valoramos las contribuciones que mantengan la estabilidad y la seguridad.

## 🛠️ Proceso de Desarrollo

1. **Fork del Repositorio:** Crea tu propia copia del proyecto.
2. **Crear una Rama:** `git checkout -b feature/nueva-funcionalidad`.
3. **Estándares de Código:**
   - Usa TypeScript para el backend.
   - Mantén el estilo "Scifi HUD" en el frontend usando Tailwind CSS.
   - Documenta cualquier nuevo endpoint en `API_REFERENCE.md`.
4. **Pruebas:** Asegúrate de probar tus cambios con al menos un dispositivo físico.
5. **Pull Request:** Describe claramente tus cambios y el problema que resuelven.

## 🎨 Guía de Estilo UI

Si vas a modificar el frontend:
- Usa la paleta de colores definida en `tailwind.config.js` (Indigo, Cyan, Slate).
- Las animaciones deben ser fluidas y no obstructivas (usa `framer-motion`).
- Todos los iconos deben provenir de `lucide-react`.

## 🐛 Reporte de Bugs

Si encuentras un error:
1. Revisa si ya ha sido reportado.
2. Abre un "Issue" detallando:
   - Modelo del dispositivo Android.
   - Versión de Android.
   - Pasos para reproducir.
   - Logs del backend (si aplica).

---
*Tu ayuda hace que esta herramienta sea mejor para todos.*
