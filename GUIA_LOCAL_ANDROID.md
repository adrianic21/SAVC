# Guía: OndaVideo 100% Local en Android

Esta es la versión modificada de la app original para funcionar completamente
sin APIs externas (sin Gemini, sin Firebase, sin Google Drive).

---

## Qué se cambió

| Archivo | Cambio |
|---|---|
| `package.json` | Eliminados: `@google/genai`, `firebase`, `express`, `dotenv`. Añadidos: `@capacitor/core`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share` |
| `src/lib/googleDrive.ts` | Convertido en stub vacío (no hace llamadas externas) |
| `src/lib/nativeSave.ts` | **NUEVO** — guarda el video localmente o comparte por Share Sheet de Android |
| `public/sw.js` | Service Worker reescrito con caché offline real (Cache-First + Network-First) |
| `public/manifest.json` | Actualizado para mejor experiencia de instalación en Android |
| `vite.config.ts` | `base: './'` para compatibilidad con Capacitor WebView |
| `capacitor.config.ts` | **NUEVO** — configuración de Capacitor para generar el APK |

> Nota: La UI del botón de Google Drive en `SidebarControls.tsx` sigue existiendo,
> pero al usar el stub de googleDrive.ts no hace ninguna llamada externa.
> Si quieres quitarla visualmente, busca `{/* Google Drive Integration */}` en ese archivo.

---

## OPCIÓN A — PWA instalable (sin compilar APK)

Ideal para uso rápido. No necesita Android Studio.

### Paso 1: Instalar dependencias y compilar
```bash
npm install
npm run build
```

### Paso 2: Servir la app en tu red local
```bash
npm run preview
# o con Python:
cd dist && python3 -m http.server 4173
```

### Paso 3: Instalar en Android
1. Conecta el móvil a la misma red WiFi
2. Abre Chrome en el móvil y ve a `http://[IP-de-tu-PC]:4173`
3. Menú (⋮) → **"Añadir a pantalla de inicio"** / **"Instalar app"**
4. La app queda instalada sin Play Store y funciona offline

> Guardar video: usa el botón de descarga → en Chrome Android abre el Share Sheet
> nativo de Android (enviar por WhatsApp, guardar en Archivos, etc.)

---

## OPCIÓN B — APK nativo con Capacitor (recomendado)

Acceso completo al sistema de archivos. Guarda el video directamente en la galería.

### Requisitos previos
- Node.js 18+
- Android Studio instalado con SDK Android 14+ (API 34)
- Java 17+
- En la terminal de Android Studio: `sdkmanager "build-tools;34.0.0"`

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Compilar la app web
```bash
npm run build
```

### Paso 3: Añadir plataforma Android
```bash
npx cap add android
```

### Paso 4: Sincronizar el build con Android
```bash
npx cap sync android
```

### Paso 5: Abrir en Android Studio y compilar el APK
```bash
npx cap open android
```
En Android Studio:
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`

### Paso 6 (opcional): Instalar directamente en el móvil conectado por USB
```bash
npx cap run android
```

### Permisos Android necesarios
Añade en `android/app/src/main/AndroidManifest.xml` dentro de `<manifest>`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29"/>
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO"/>
```

---

## Cómo integrar nativeSave en el botón de exportación

En `src/components/SidebarControls.tsx`, busca el botón que descarga el video
(probablemente con `URL.createObjectURL` o `a.download`) y reemplázalo por:

```tsx
import { saveVideoLocally } from '../lib/nativeSave';

// Donde antes descargabas:
await saveVideoLocally(exportedBlob, 'mi-video-ondavideo', (msg) => {
  showNotification(msg);
});
```

La función detecta automáticamente si está en APK (usa Share nativo de Android)
o en navegador/PWA (usa Web Share API → fallback a descarga).

---

## Compatibilidad

| Entorno | Guardar video | Offline |
|---|---|---|
| Chrome Android (PWA) | Web Share API / descarga | ✅ (tras primera visita) |
| APK Capacitor | Share Sheet nativo + galería | ✅ (completo) |
| MediaRecorder codecs | `video/webm;codecs=vp8` → fallback a `video/mp4` | ✅ ya implementado |

---

## Qué NO necesita esta app

- ❌ Gemini API
- ❌ Firebase / Google Auth
- ❌ Google Drive
- ❌ Ningún servidor backend
- ❌ Conexión a internet (una vez instalada)
