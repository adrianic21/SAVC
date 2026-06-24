import { useState, useEffect, useRef } from 'react';
import { WaveConfig, LogoConfig, TextConfig, AppPreset, SocialConfig } from './types';
import { CanvasPreview } from './components/CanvasPreview';
import { SidebarControls } from './components/SidebarControls';
import { 
  Music4, Zap, HardDrive, Smartphone, Heart, FolderOpen, Sliders, Type, Compass, Film,
  ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { SYSTEM_PRESETS } from './constants/presets';
import { savePresetAsset, getPresetAsset, clearAllAssetsForPreset } from './lib/presetStorage';
import { saveLastAudio, getLastAudio, generateDemoAudioFile } from './lib/indexedDb';

const appLogo = '/src/assets/images/logo_app_1782190901660.jpg';

export default function App() {
  // --- 1. Audio and Web Audio API States ---
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- 2. Custom App Configurations ---
  const [activeTab, setActiveTab] = useState<'files' | 'waves' | 'text' | 'logo' | 'export'>('files');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  
  const [waveConfig, setWaveConfig] = useState<WaveConfig>({
    type: 'bars',
    color: '#0284c7', // Sky-600
    maxHeight: 160,
    thickness: 6,
    gap: 4,
    yPosition: 50,
    glow: true
  });
  
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    show: true,
    size: 110,
    borderWidth: 4,
    borderColor: '#38bdf8', // Sky-400
    borderRadius: 55
  });

  const [textConfig, setTextConfig] = useState<TextConfig>({
    content: 'TÍTULO DEL EPISODIO\nSubtítulo o descripción de audio',
    color: '#ffffff',
    fontSize: 24,
    yPosition: 82,
    fontFamily: 'sans-serif',
    showBg: true,
    bgColor: '#0f172a',
    bgOpacity: 0.65,
    padding: 16,
    paddingX: 24,
    paddingY: 16,
    lineHeight: 1.35
  });

  const [socialConfig, setSocialConfig] = useState<SocialConfig>({
    show: false,
    alignment: 'center',
    facebook: '',
    youtube: '',
    tiktok: '',
    fontSize: 14,
    color: '#ffffff',
    yPosition: 94,
    showBg: true,
    bgColor: '#020617',
    bgOpacity: 0.6
  });

  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savedPresets, setSavedPresets] = useState<AppPreset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);
  const [videoVolume, setVideoVolume] = useState<number>(0.2);

  // --- 3. Graphics / Image States ---
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgVideo, setBgVideo] = useState<HTMLVideoElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  const [bgFileName, setBgFileName] = useState<string | null>(null);
  const [bgFileType, setBgFileType] = useState<'image' | 'video' | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);

  // --- 4. Video Recording / Exporting States ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportState, setExportState] = useState<'idle' | 'rendering' | 'finished' | 'error' | 'preparing'>('idle');
  const [exportTimerLimit, setExportTimerLimit] = useState<'15' | '30' | 'full'>('15');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [isSavingMode, setIsSavingMode] = useState<boolean>(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamAudioDestNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // --- 5. PWA Installation Event Support ---
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Parse custom beforeinstallprompt event for PWA download
  useEffect(() => {
    const handleInstallable = (e: any) => {
      setInstallPrompt(e.detail);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    if ((window as any).deferredInstallPrompt) {
      setInstallPrompt((window as any).deferredInstallPrompt);
    }

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const triggerPWAInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`[PWA] Elección de install: ${outcome}`);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  // Ensure canvas rendering updates even on resize
  useEffect(() => {
    if (audioElement) {
      const updateTime = () => {
        setCurrentTime(audioElement.currentTime);
        
        // Auto-stop recording if we hit our duration limits
        if (isExporting && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          let limit = duration;
          if (exportTimerLimit === '15') limit = Math.min(15, duration);
          if (exportTimerLimit === '30') limit = Math.min(30, duration);

          const progress = Math.min(99, Math.round((audioElement.currentTime / limit) * 100));
          setExportProgress(progress);

          if (audioElement.currentTime >= limit) {
            console.log('[MediaRecorder] Límite de tiempo alcanzado. Deteniendo grabación.');
            mediaRecorderRef.current.stop();
            audioElement.pause();
          }
        }
      };

      const setAudioDuration = () => {
        setDuration(audioElement.duration || 0);
      };

      const handleAudioEnded = () => {
        setIsPlaying(false);
        if (bgVideo) bgVideo.pause();
        if (isExporting && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      };

      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('loadedmetadata', setAudioDuration);
      audioElement.addEventListener('ended', handleAudioEnded);

      return () => {
        audioElement.removeEventListener('timeupdate', updateTime);
        audioElement.removeEventListener('loadedmetadata', setAudioDuration);
        audioElement.removeEventListener('ended', handleAudioEnded);
      };
    }
  }, [audioElement, isExporting, exportTimerLimit, duration, bgVideo]);

  // Handle uploaded audio file
  const handleAudioUpload = async (file: File) => {
    // Stop previous audio playback
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    
    setAudioFile(file);
    setAudioURL(url);
    setAudioElement(audio);
    setCurrentTime(0);
    setDuration(0);

    // Reset Audio Session hooks
    setAudioContext(null);
    setAnalyserNode(null);

    // Persist as last-audio copy in IndexedDB
    await saveLastAudio(file);
  };

  // Load the last saved audio file or trigger direct dynamic high-fidelity synthesis fallback
  const handleLoadLastAudio = async () => {
    try {
      const file = await getLastAudio();
      if (file) {
        console.log('[IndexedDB] Cargando audio recuperado:', file.name);
        await handleAudioUpload(file);
      } else {
        // Fallback: Synthesize on-the-fly and load a beautiful, clean, highly reactive ambient soundtrack
        console.log('[IndexedDB] No se detectó audio guardado. Generando sintetizador rítmico ambiente...');
        const demoAudio = generateDemoAudioFile();
        await handleAudioUpload(demoAudio);
      }
    } catch (err) {
      console.error('Error al recuperar el último audio guardado:', err);
      // Fallback: Synthesize on-the-fly to ensure the app never crashes or forces redirect to gallery
      try {
        const demoAudio = generateDemoAudioFile();
        await handleAudioUpload(demoAudio);
      } catch (innerErr) {
        console.error('Synthesis fallback also failed:', innerErr);
        document.getElementById('audio-file-input')?.click();
      }
    }
  };

  // Parse uploaded design assets
  const handleBgUpload = (file: File) => {
    setBgFile(file);
    const isVideo = file.type.startsWith('video/');
    setBgFileName(file.name);
    setBgFileType(isVideo ? 'video' : 'image');

    const url = URL.createObjectURL(file);

    if (isVideo) {
      if (bgVideo) {
        bgVideo.pause();
        bgVideo.src = '';
      }
      const video = document.createElement('video');
      video.src = url;
      video.volume = videoVolume;
      video.muted = videoVolume === 0;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      // Advanced fallback loop backup listener
      video.onended = () => {
        video.currentTime = 0;
        video.play().catch(e => console.log('El loop de video falló', e));
      };
      
      // Attempt loop start if user is currently playing music
      if (isPlaying) {
        video.play().catch(e => console.log('Espera interacción para autoplay del video', e));
      } else {
        video.currentTime = 0;
      }
      
      setBgImage(null);
      setBgVideo(video);
    } else {
      if (bgVideo) {
        bgVideo.pause();
        setBgVideo(null);
      }
      const img = new Image();
      img.src = url;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setBgImage(img);
      };
    }
  };

  const handleLogoUpload = (file: File) => {
    setLogoFile(file);
    setLogoFileName(file.name);
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.src = url;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLogoImage(img);
    };
  };

  // Apply configured presets
  const applyPreset = (preset: AppPreset) => {
    setCurrentPresetId(preset.id);
    setAspectRatio(preset.aspectRatio);
    setWaveConfig(preset.wave);
    setLogoConfig(preset.logo);
    setTextConfig(preset.text);
    if (preset.social) {
      setSocialConfig(preset.social);
    } else {
      setSocialConfig({
        show: false,
        alignment: 'center',
        facebook: '',
        youtube: '',
        tiktok: '',
        fontSize: 14,
        color: '#ffffff',
        yPosition: 94,
        showBg: true,
        bgColor: '#020617',
        bgOpacity: 0.6
      });
    }
    if (preset.isSavingMode !== undefined) {
      setIsSavingMode(preset.isSavingMode);
    }
    if (preset.exportTimerLimit !== undefined) {
      setExportTimerLimit(preset.exportTimerLimit);
    }
  };

  const applyPresetWithAssets = async (preset: AppPreset) => {
    applyPreset(preset);

    // Load background asset from IndexedDB
    if (preset.hasBgFile && preset.bgFileName) {
      try {
        const storedBgFile = await getPresetAsset(preset.id, 'bg');
        if (storedBgFile) {
          const reconstructedFile = new File([storedBgFile], preset.bgFileName, { type: storedBgFile.type });
          handleBgUpload(reconstructedFile);
        } else {
          if (bgVideo) bgVideo.pause();
          setBgImage(null);
          setBgVideo(null);
          setBgFile(null);
          setBgFileName(null);
          setBgFileType(null);
        }
      } catch (err) {
        console.error('Error recovering background from DB', err);
      }
    } else {
      if (bgVideo) bgVideo.pause();
      setBgImage(null);
      setBgVideo(null);
      setBgFile(null);
      setBgFileName(null);
      setBgFileType(null);
    }

    // Load logo asset from IndexedDB
    if (preset.hasLogoFile && preset.logoFileName) {
      try {
        const storedLogoFile = await getPresetAsset(preset.id, 'logo');
        if (storedLogoFile) {
          const reconstructedFile = new File([storedLogoFile], preset.logoFileName, { type: storedLogoFile.type });
          handleLogoUpload(reconstructedFile);
        } else {
          setLogoImage(null);
          setLogoFile(null);
          setLogoFileName(null);
        }
      } catch (err) {
        console.error('Error recovering logo from DB', err);
      }
    } else {
      setLogoImage(null);
      setLogoFile(null);
      setLogoFileName(null);
    }
  };

  // --- Preset Handlers with IndexedDB Fallbacks ---
  const handleSavePreset = async (name: string) => {
    const presetId = 'usr-' + Date.now().toString();

    const newPreset: AppPreset = {
      id: presetId,
      name: name.trim() + ' 💾',
      aspectRatio,
      wave: waveConfig,
      logo: logoConfig,
      text: textConfig,
      social: socialConfig,
      hasBgFile: !!bgFile,
      bgFileName: bgFile ? bgFileName : null,
      bgFileType: bgFile ? bgFileType : null,
      hasLogoFile: !!logoFile,
      logoFileName: logoFile ? logoFileName : null,
      isSavingMode,
      exportTimerLimit
    };

    // Save heavy binary items inside client IndexedDB safely
    if (bgFile) {
      await savePresetAsset(presetId, 'bg', bgFile);
    }
    if (logoFile) {
      await savePresetAsset(presetId, 'logo', logoFile);
    }

    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem('wave_generator_presets', JSON.stringify(updated));
  };

  const handleImportPreset = (preset: AppPreset) => {
    const updated = [...savedPresets, preset];
    setSavedPresets(updated);
    localStorage.setItem('wave_generator_presets', JSON.stringify(updated));
  };

  const handleDeletePreset = async (id: string) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('wave_generator_presets', JSON.stringify(updated));

    // Clear DB items
    await clearAllAssetsForPreset(id);

    // Clean default marker if match
    if (defaultPresetId === id) {
      setDefaultPresetId(null);
      localStorage.removeItem('wave_generator_default_preset_id');
    }
  };

  const handleSetDefaultPreset = (id: string | null) => {
    setDefaultPresetId(id);
    if (id) {
      localStorage.setItem('wave_generator_default_preset_id', id);
    } else {
      localStorage.removeItem('wave_generator_default_preset_id');
    }
  };

  // Load custom saved list and optional default design on mount
  useEffect(() => {
    try {
      const loaded = localStorage.getItem('wave_generator_presets');
      let parsedCustom: AppPreset[] = [];
      if (loaded) {
        parsedCustom = JSON.parse(loaded);
        setSavedPresets(parsedCustom);
      }

      // Read default preset marker
      const defId = localStorage.getItem('wave_generator_default_preset_id');
      if (defId) {
        setDefaultPresetId(defId);

        // Standard prebuilt preset
        const systemPreset = SYSTEM_PRESETS.find(p => p.id === defId);
        if (systemPreset) {
          applyPreset(systemPreset);
        } else {
          // Custom saved design
          const customs = parsedCustom;
          const foundCustom = customs.find(p => p.id === defId);
          if (foundCustom) {
            applyPresetWithAssets(foundCustom);
          }
        }
      }
    } catch (err) {
      console.error('Error recovering default start configs', err);
    }
  }, []);

  // Lazily initialize Web Audio API upon physical interaction
  const initAudioEngine = () => {
    if (!audioElement) return null;
    
    if (audioContext && analyserNode) {
      return { audioContext, analyzer: analyserNode };
    }

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; // 128 unique frequency bins
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      setAudioContext(ctx);
      setAnalyserNode(analyser);
      return { audioContext: ctx, analyzer: analyser };
    } catch (err) {
      console.error('Falla al iniciar la API Web Audio:', err);
      return null;
    }
  };

  // Play / Pause controls
  const handlePlayToggle = () => {
    if (!audioElement) return;

    // Start audio context on click
    const engine = initAudioEngine();
    if (engine && engine.audioContext.state === 'suspended') {
      engine.audioContext.resume();
    }

    if (isPlaying) {
      audioElement.pause();
      if (bgVideo) bgVideo.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      if (bgVideo) {
        bgVideo.volume = videoVolume;
        bgVideo.muted = videoVolume === 0;
        bgVideo.play().catch(e => console.log(e));
      }
      setIsPlaying(true);
    }
  };

  // Video background dynamic volume handler
  const handleVideoVolumeChange = (newVol: number) => {
    setVideoVolume(newVol);
    if (bgVideo) {
      bgVideo.volume = newVol;
      bgVideo.muted = newVol === 0;
    }
  };

  // --- 6. EXPORTING MEDIA RECORDER PIPELINE ---
  const handleStartExport = async () => {
    if (!audioElement || !canvasRef.current) return;

    try {
      // 1. Force state initialized
      setIsPlaying(false);
      audioElement.pause();
      audioElement.currentTime = 0;
      
      setExportState('preparing');
      setExportProgress(0);
      setIsExporting(true);

      const engine = initAudioEngine();
      if (!engine) throw new Error("No se pudo iniciar el AudioContext");
      
      const { audioContext: ctx, analyzer } = engine;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // 2. Play background loop video from beginning
      if (bgVideo) {
        bgVideo.currentTime = 0;
        await bgVideo.play().catch(e => console.log(e));
      }

      // 3. Connect audio stream digitally to destination
      if (!streamAudioDestNodeRef.current) {
        const destNode = ctx.createMediaStreamDestination();
        analyzer.connect(destNode);
        streamAudioDestNodeRef.current = destNode;
      }
      
      const audioDestTrack = streamAudioDestNodeRef.current.stream.getAudioTracks()[0];

      // 4. Capture canvas at smooth 30 FPS
      const canvasStream = canvasRef.current.captureStream(30);
      
      // Combine video and digital audio tracks
      const tracksToCombine = [...canvasStream.getVideoTracks()];
      if (audioDestTrack) {
        tracksToCombine.push(audioDestTrack);
      }
      
      const combinedStream = new MediaStream(tracksToCombine);

      // 5. Build MediaRecorder
      let options = { mimeType: 'video/mp4;codecs=h264,aac', videoBitsPerSecond: 3000000 };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', videoBitsPerSecond: 3000000 };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4', videoBitsPerSecond: 3000500 };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 3000000 };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 2500000 };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm', videoBitsPerSecond: 2000000 };
      }
      
      console.log(`[MediaRecorder] Utilizando codec: ${options.mimeType}`);
      const recorder = new MediaRecorder(combinedStream, options);
      
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Collect chunks and download
        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setExportedBlob(blob);
        setExportState('finished');
        setIsExporting(false);
        setExportProgress(100);

        if (bgVideo) bgVideo.pause();
        audioElement.pause();
      };

      // 6. Launch!
      recorder.start();
      setExportState('recording');
      setIsPlaying(true);
      await audioElement.play();

    } catch (err) {
      console.error('Error starting video recording:', err);
      setExportState('error');
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    if (bgVideo) {
      bgVideo.pause();
    }
    
    setIsPlaying(false);
    setIsExporting(false);
    setExportState('idle');
    setExportProgress(0);
    setDownloadUrl(null);
    setExportedBlob(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center">
      {/* Exclusively mobile-optimized smartphone layout representation - locks viewport height to avoid scrolling */}
      <div className="w-full max-w-[480px] min-h-screen bg-slate-950 border-x border-slate-900 flex flex-col shadow-2xl relative">
        
        {/* 1. Header Navigation and Install Banner */}
        <header className="sticky top-0 border-b border-slate-900 bg-slate-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center bg-slate-900 shadow-sm">
              <img 
                src={appLogo} 
                alt="Logo App" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-[12px] font-black text-white leading-none">Simple Audio Video Converter</h1>
            </div>
          </div>

          {/* Dynamic PWA installation triggers */}
          <div className="flex items-center gap-1.5">
            {installPrompt && (
              <button
                onClick={triggerPWAInstall}
                className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-400 hover:bg-sky-500 text-slate-950 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <Smartphone size={10} />
                <span>Instalar</span>
              </button>
            )}

            {isInstalled && (
              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-0.5">
                <Zap size={9} className="animate-pulse" /> PWA
              </span>
            )}

            <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              <HardDrive size={10} className="text-slate-500" />
              <span>Local</span>
            </div>
          </div>
        </header>

        {/* 2. Main Studio layout (Responsive & Free-Scrolling) */}
        <main className="flex-grow p-3 flex flex-col gap-3 pb-24">
          
          {/* Real-time Canvas preview at top */}
          <div className={`w-full flex flex-col shrink-0 ${isPreviewExpanded ? 'sticky top-[53px] z-30 bg-slate-950 pb-2.5 shadow-md' : ''}`}>
            {isPreviewExpanded ? (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Pantalla de Edición</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded(false)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-450 border border-slate-800 rounded-lg text-[9px] font-mono flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronUp size={10} />
                    <span>PLEGAR</span>
                  </button>
                </div>
                <CanvasPreview
                  audioFile={audioFile}
                  audioElement={audioElement}
                  analyserNode={analyserNode}
                  isPlaying={isPlaying}
                  onPlayToggle={handlePlayToggle}
                  currentTime={currentTime}
                  duration={duration}
                  waveConfig={waveConfig}
                  logoConfig={logoConfig}
                  textConfig={textConfig}
                  socialConfig={socialConfig}
                  aspectRatio={aspectRatio}
                  bgImage={bgImage}
                  bgVideo={bgVideo}
                  logoImage={logoImage}
                  canvasRef={canvasRef}
                  isSavingMode={isSavingMode}
                  isExporting={isExporting}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPreviewExpanded(true)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 hover:border-sky-500/30 transition-all text-left group active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 group-hover:text-sky-400 group-hover:border-sky-500/20 transition-all duration-300">
                    <Film size={15} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-sans font-medium text-slate-300 group-hover:text-slate-100 transition-colors">Vista Previa de Video</h4>
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Estado: Plegado (Toca para expandir)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-505 group-hover:text-sky-400 font-mono transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">Desplegar</span>
                  <ChevronDown size={14} />
                </div>
              </button>
            )}
          </div>

          {/* Categorized controls panel (Occupies all the remaining space naturally expanding) */}
          <div className="flex-grow flex">
            <SidebarControls
              activeTab={activeTab}
              onAudioUpload={handleAudioUpload}
              onLoadLastAudio={handleLoadLastAudio}
              audioFileName={audioFile ? audioFile.name : null}
              duration={duration}
              onBgUpload={handleBgUpload}
              bgFileName={bgFileName}
              bgFileType={bgFileType}
              onLogoUpload={handleLogoUpload}
              logoFileName={logoFileName}
              waveConfig={waveConfig}
              setWaveConfig={setWaveConfig}
              logoConfig={logoConfig}
              setLogoConfig={setLogoConfig}
              textConfig={textConfig}
              setTextConfig={setTextConfig}
              socialConfig={socialConfig}
              setSocialConfig={setSocialConfig}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              currentPresetId={currentPresetId}
              onApplyPreset={applyPresetWithAssets}
              savedPresets={savedPresets}
              defaultPresetId={defaultPresetId}
              onSavePreset={handleSavePreset}
              onDeletePreset={handleDeletePreset}
              onImportPreset={handleImportPreset}
              onSetDefaultPreset={handleSetDefaultPreset}
              bgFile={bgFile}
              logoFile={logoFile}
              videoVolume={videoVolume}
              onVideoVolumeChange={handleVideoVolumeChange}
              isExporting={isExporting}
              exportProgress={exportProgress}
              exportState={exportState}
              exportTimerLimit={exportTimerLimit}
              setExportTimerLimit={setExportTimerLimit}
              onStartExport={handleStartExport}
              onCancelExport={handleCancelExport}
              downloadUrl={downloadUrl}
              exportedBlob={exportedBlob}
              isSavingMode={isSavingMode}
              setIsSavingMode={setIsSavingMode}
            />
          </div>
        </main>

        {/* 3. Horizontal Navigation Menu Bar at the bottom for easy non-scrolling touch access */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto border-t border-slate-900 bg-slate-950/95 backdrop-blur-md px-1 py-1.5 flex items-center justify-around z-40">
          {[
            { id: 'files', label: 'Archivos', icon: FolderOpen, color: 'text-sky-400' },
            { id: 'waves', label: 'Ondas', icon: Sliders, color: 'text-pink-400' },
            { id: 'text', label: 'Texto', icon: Type, color: 'text-amber-400' },
            { id: 'logo', label: 'Logo', icon: Compass, color: 'text-teal-400' },
            { id: 'export', label: 'Captura', icon: Film, color: 'text-emerald-400' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                type="button"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-900 border border-slate-800 shadow-md scale-105' 
                    : 'hover:bg-slate-900/40'
                }`}
              >
                <Icon size={16} className={`${isSelected ? tab.color : 'text-slate-500'} transition-colors`} />
                <span className={`text-[9px] font-bold select-none ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
