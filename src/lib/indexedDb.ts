let dbCache: Promise<IDBDatabase> | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (dbCache) return dbCache;
  dbCache = new Promise((resolve, reject) => {
    const request = indexedDB.open('OndaVideoDB', 3);
    request.onerror = () => {
      dbCache = null;
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets');
      }
      if (!db.objectStoreNames.contains('preset_assets_v2')) {
        db.createObjectStore('preset_assets_v2');
      }
    };
  });
  return dbCache;
}

export async function saveLastAudio(file: File): Promise<void> {
  try {
    const db = await initDB();
    const timestamp = Date.now();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('assets', 'readwrite');
      const store = transaction.objectStore('assets');
      
      // Save under 'last-audio' for default backward compatibility
      store.put({
        file: file,
        name: file.name,
        type: file.type,
        timestamp: timestamp
      }, 'last-audio');

      // Save under a unique key to keep a history of all uploaded audios in the user's local memory gallery
      const uniqueKey = `audio_history_${timestamp}`;
      const putRequest = store.put({
        file: file,
        name: file.name,
        type: file.type,
        timestamp: timestamp
      }, uniqueKey);
      
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('IndexedDB saveLastAudio failed:', err);
  }
}

export async function getLastAudio(): Promise<File | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('assets', 'readonly');
      const store = transaction.objectStore('assets');
      
      // Fetch all stored assets in memory to find the most recently created one
      const getRequest = store.getAll();
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const results = getRequest.result;
        if (!results || results.length === 0) {
          resolve(null);
          return;
        }

        // Filter items that actually contain a file object and a valid timestamp
        const validAudios = results.filter((item: any) => item && item.file && item.timestamp !== undefined);
        
        if (validAudios.length === 0) {
          // If no timestamped audios, fallback directly to last-audio
          const getLegacy = store.get('last-audio');
          getLegacy.onsuccess = () => {
            const legacyRes = getLegacy.result;
            if (legacyRes && legacyRes.file) {
              const recreatedFile = new File([legacyRes.file], legacyRes.name || 'audio_recuperado.mp3', {
                type: legacyRes.type || 'audio/mp3'
              });
              resolve(recreatedFile);
            } else {
              resolve(null);
            }
          };
          getLegacy.onerror = () => resolve(null);
          return;
        }

        // Sort items by timestamp descending to find the absolute newest saved audio file
        validAudios.sort((a: any, b: any) => b.timestamp - a.timestamp);
        const newest = validAudios[0];
        
        console.log('[IndexedDB] Cargando audio más reciente de la galería:', newest.name, 'guardado el:', new Date(newest.timestamp).toLocaleString());

        const recreatedFile = new File([newest.file], newest.name || 'audio_recuperado.mp3', {
          type: newest.type || 'audio/mp3'
        });
        resolve(recreatedFile);
      };
    });
  } catch (err) {
    console.error('IndexedDB getLastAudio failed:', err);
    return null;
  }
}

export function generateDemoAudioFile(): File {
  const sampleRate = 44100;
  const duration = 20; // 20 segundos de música ambiente sintetizada
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // Escribir cabecera WAV RIFF
  const writeString = (dv: DataView, offset: number, str: string) => {
    for (let j = 0; j < str.length; j++) {
      dv.setUint8(offset + j, str.charCodeAt(j));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM sin compresión
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byteRate
  view.setUint16(32, 2, true); // blockAlign
  view.setUint16(34, 16, true); // bitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Tempo 120 BPM
    const bpm = 120;
    const beatDuration = 60 / bpm; // 0.5s por pulso
    const beatIndex = Math.floor(t / beatDuration);
    const timeInBeat = t % beatDuration;

    // Bombo rítmico electrónico en negras (cuatro por compás)
    const kickPattern = [1, 0, 1, 0];
    const triggerKick = kickPattern[beatIndex % kickPattern.length];
    const kickStr = triggerKick * Math.exp(-12 * timeInBeat) * Math.sin(2 * Math.PI * 52 * timeInBeat);

    // Progresión de acordes hermosa de ambiente moderno (Cmaj7 -> Am7 -> Fmaj7 -> G7)
    const chordIndex = Math.floor(t / 4) % 4;
    let freqs = [261.63, 329.63, 392.00, 493.88]; // Cmaj7
    if (chordIndex === 1) {
      freqs = [220.00, 261.63, 329.63, 392.00]; // Am7
    } else if (chordIndex === 2) {
      freqs = [174.61, 220.00, 261.63, 349.23]; // Fmaj7
    } else if (chordIndex === 3) {
      freqs = [196.00, 246.94, 293.66, 349.23]; // G7
    }

    // Melodía tipo arpegio plucks sincopado (corcheas)
    const pluckPattern = [1, 0, 1, 1, 0, 1, 0, 1];
    const stepDuration = beatDuration / 2; // 0.25s por paso
    const stepIndex = Math.floor(t / stepDuration) % 8;
    const triggerPluck = pluckPattern[stepIndex];
    const timeInStep = t % stepDuration;

    // Elegir nota del acorde actual para el arpegio
    const baseFreq = freqs[stepIndex % freqs.length];
    const pluckFreq = baseFreq * (stepIndex % 3 === 0 ? 2 : 1); // sube octava ocasionalmente
    const pluckStr = triggerPluck * Math.exp(-7 * timeInStep) * Math.sin(2 * Math.PI * pluckFreq * t);

    // Almohadilla ambiental (pad) para rellenar frecuencias y dar hermosa forma
    const padStr = 0.18 * Math.sin(2 * Math.PI * freqs[0] * t) +
                   0.15 * Math.sin(2 * Math.PI * freqs[1] * t) +
                   0.12 * Math.sin(2 * Math.PI * (freqs[2] / 2) * t);

    // Modulador LFO para generar fluctuaciones visuales súper dinámicas en el osciloscopio
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.3 * t);

    // Sumar componentes y filtrar con clipping suave
    const mixed = 0.35 * kickStr + 0.25 * pluckStr + 0.18 * padStr * lfo;
    const sample = Math.max(-1, Math.min(1, mixed)) * 32767;

    view.setInt16(offset, sample, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return new File([blob], 'Musica_Ambiental_Automatica.wav', { type: 'audio/wav' });
}
