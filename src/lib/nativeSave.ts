/**
 * nativeSave.ts
 * Guarda/comparte el video de forma local sin ninguna API externa.
 * Detecta automáticamente si está en Capacitor (APK) o en navegador (PWA).
 */

// Intentar importar Capacitor dinámicamente para no romper el build
// si se compila solo para web/PWA (sin Capacitor instalado)
let capacitorFilesystem: any = null;
let capacitorShare: any = null;

async function loadCapacitorPlugins() {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    capacitorFilesystem = { Filesystem, Directory, Encoding };
    capacitorShare = Share;
    return true;
  } catch {
    return false;
  }
}

/**
 * Detecta si la app está corriendo dentro de Capacitor (APK nativo)
 */
function isCapacitor(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform();
}

/**
 * Descarga / guarda el video.
 * - En Capacitor (APK): guarda en Documents y abre el Share Sheet de Android
 * - En navegador (PWA/Chrome): descarga estándar + Share API si está disponible
 */
export async function saveVideoLocally(
  blob: Blob,
  filename: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  const name = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;

  if (isCapacitor()) {
    // ── Modo APK nativo con Capacitor ──────────────────────────────────
    const loaded = await loadCapacitorPlugins();
    if (!loaded || !capacitorFilesystem) {
      throw new Error('Capacitor Filesystem no disponible');
    }

    onProgress?.('Convirtiendo a base64...');
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const binary = uint8.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    const base64 = btoa(binary);

    onProgress?.('Guardando en dispositivo...');
    const { Filesystem, Directory } = capacitorFilesystem;
    const result = await Filesystem.writeFile({
      path: `OndaVideo/${name}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });

    onProgress?.('Abriendo opciones para compartir...');
    const { Share } = capacitorShare;
    await Share.share({
      title: 'Video exportado por OndaVideo',
      text: name,
      url: result.uri,
      dialogTitle: 'Guardar o compartir tu video',
    });

  } else {
    // ── Modo PWA / navegador ───────────────────────────────────────────
    const url = URL.createObjectURL(blob);

    // Web Share API (disponible en Chrome Android ≥ 89)
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: 'video/mp4' })] })) {
      onProgress?.('Abriendo opciones nativas de Android...');
      try {
        await navigator.share({
          files: [new File([blob], name, { type: 'video/mp4' })],
          title: 'Video exportado',
        });
        URL.revokeObjectURL(url);
        return;
      } catch (err: any) {
        // Usuario canceló el share → fallback a descarga
        if (err.name !== 'AbortError') console.warn('Share falló, usando descarga:', err);
      }
    }

    // Fallback: descarga estándar
    onProgress?.('Descargando archivo...');
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
