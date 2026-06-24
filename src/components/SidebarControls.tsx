import React, { useState, useEffect } from 'react';
import { WaveConfig, LogoConfig, TextConfig, AppPreset, SocialConfig } from '../types';
import { 
  Music, Image, Video, Eye, EyeOff, Sliders, Type, Save, Trash, Download, 
  Settings, FolderOpen, Play, Check, AlertTriangle, Sparkles, Film, Compass, Asterisk, Volume2, Share2
} from 'lucide-react';
import { SYSTEM_PRESETS } from '../constants/presets';
import { googleSignIn, logoutDrive, uploadVideoToGoogleDrive, getCachedToken, initAuth } from '../lib/googleDrive';

interface SidebarControlsProps {
  activeTab: 'files' | 'waves' | 'logo' | 'text' | 'export';
  
  // Audio uploads
  onAudioUpload: (file: File) => void;
  onLoadLastAudio: () => void;
  audioFileName: string | null;
  duration: number;
  
  // Custom asset uploads
  onBgUpload: (file: File) => void;
  bgFileName: string | null;
  bgFileType: 'image' | 'video' | null;
  onLogoUpload: (file: File) => void;
  logoFileName: string | null;
  
  // Customization configurations are passed together with their setters
  waveConfig: WaveConfig;
  setWaveConfig: React.Dispatch<React.SetStateAction<WaveConfig>>;
  logoConfig: LogoConfig;
  setLogoConfig: React.Dispatch<React.SetStateAction<LogoConfig>>;
  textConfig: TextConfig;
  setTextConfig: React.Dispatch<React.SetStateAction<TextConfig>>;
  socialConfig: SocialConfig;
  setSocialConfig: React.Dispatch<React.SetStateAction<SocialConfig>>;
  aspectRatio: '16:9' | '9:16' | '1:1';
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => void;

  // Presets
  currentPresetId: string | null;
  onApplyPreset: (preset: AppPreset) => void;
  savedPresets: AppPreset[];
  defaultPresetId: string | null;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onImportPreset: (preset: AppPreset) => void;
  onSetDefaultPreset: (id: string | null) => void;
  bgFile: File | null;
  logoFile: File | null;
  
  // Video volume controls
  videoVolume: number;
  onVideoVolumeChange: (volume: number) => void;

  // Video Export trigger
  isExporting: boolean;
  exportProgress: number; // 0-100
  exportState: 'idle' | 'rendering' | 'finished' | 'error' | 'preparing';
  exportTimerLimit: '15' | '30' | 'full';
  setExportTimerLimit: (limit: '15' | '30' | 'full') => void;
  onStartExport: () => void;
  onCancelExport: () => void;
  downloadUrl: string | null;
  exportedBlob: Blob | null;
  isSavingMode: boolean;
  setIsSavingMode: (val: boolean) => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  activeTab,
  onAudioUpload,
  onLoadLastAudio,
  audioFileName,
  duration,
  onBgUpload,
  bgFileName,
  bgFileType,
  onLogoUpload,
  logoFileName,
  waveConfig,
  setWaveConfig,
  logoConfig,
  setLogoConfig,
  textConfig,
  setTextConfig,
  socialConfig,
  setSocialConfig,
  aspectRatio,
  setAspectRatio,
  currentPresetId,
  onApplyPreset,
  savedPresets,
  defaultPresetId,
  onSavePreset,
  onDeletePreset,
  onImportPreset,
  onSetDefaultPreset,
  bgFile,
  logoFile,
  videoVolume,
  onVideoVolumeChange,
  isExporting,
  exportProgress,
  exportState,
  exportTimerLimit,
  setExportTimerLimit,
  onStartExport,
  onCancelExport,
  downloadUrl,
  exportedBlob,
  isSavingMode,
  setIsSavingMode
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Export Timer States ---
  const [exportStartTime, setExportStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (exportState === 'rendering' || exportState === 'preparing') {
      if (exportStartTime === null) {
        setExportStartTime(Date.now());
      }
    } else {
      if (exportStartTime !== null) {
        setExportStartTime(null);
      }
    }
  }, [exportState, exportStartTime]);

  const getEstimatedRemainingTime = () => {
    if (!exportStartTime || exportProgress <= 1) {
      return 'Estimando...';
    }
    const elapsedMs = Date.now() - exportStartTime;
    // rule of three: elapsedMs -> exportProgress %, target is 100 %
    const estimatedTotalMs = (elapsedMs / exportProgress) * 100;
    const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
    
    const remainingSecs = Math.ceil(remainingMs / 1000);
    if (remainingSecs >= 60) {
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      return `~ ${mins} min ${secs} s`;
    }
    return `~ ${remainingSecs} s`;
  };

  // --- Google Drive States ---
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [driveUploadProgress, setDriveUploadProgress] = useState(0);
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveUser, setDriveUser] = useState<string | null>(null);

  // Initialize Auth state listener for Google Drive
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user.email || 'Usuario de Google');
      },
      () => {
        setDriveUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleDriveUpload = async () => {
    if (!exportedBlob) {
      showNotification('Por favor, compila el video antes de guardarlo en Google Drive');
      return;
    }

    setIsDriveUploading(true);
    setDriveUploadProgress(10);
    setDriveError(null);
    setDriveFileUrl(null);

    try {
      let token = getCachedToken();
      let userEmail = driveUser;

      if (!token) {
        setDriveUploadProgress(20);
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
          userEmail = result.user.email || 'Usuario de Google';
          setDriveUser(userEmail);
        } else {
          throw new Error('No se pudo completar la autenticación con tu cuenta de Google.');
        }
      }

      setDriveUploadProgress(40);
      const getExportFilename = () => {
        if (!textConfig || !textConfig.content) return 'OndaVideo';
        let base = textConfig.content.replace(/[\r\n]+/g, ' ').trim();
        base = base.replace(/[\\/:*?"<>|]/g, '');
        return base || 'OndaVideo';
      };
      const exportName = `${getExportFilename()}.mp4`;

      setDriveUploadProgress(60);
      const driveFile = await uploadVideoToGoogleDrive(
        exportedBlob,
        exportName,
        token,
        (percent) => {
          // Map to custom steps
          setDriveUploadProgress(60 + Math.round(percent * 0.35));
        }
      );

      setDriveUploadProgress(100);
      if (driveFile.webViewLink) {
        setDriveFileUrl(driveFile.webViewLink);
      } else {
        setDriveFileUrl(`https://drive.google.com/drive/my-drive`);
      }
      showNotification('¡Video guardado en Google Drive! 🎉');
    } catch (err: any) {
      console.error('Error saving to Google Drive:', err);
      setDriveError(err.message || 'Error al guardar en Google Drive');
      showNotification('Fallo al guardar en Google Drive');
    } finally {
      setIsDriveUploading(false);
    }
  };

  const handleDriveLogout = async () => {
    try {
      await logoutDrive();
      setDriveUser(null);
      setDriveFileUrl(null);
      showNotification('Sesión de Google Drive cerrada');
    } catch (err) {
      console.error('Error logging out from Drive:', err);
    }
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    onSavePreset(newPresetName);
    setNewPresetName('');
    showNotification('Plantilla guardada correctamente');
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  };

  const handleDownloadPreset = (preset: AppPreset) => {
    try {
      // Create a neat exportable preset without local user specific markers
      const exportPreset = {
        ...preset,
        id: undefined, // Let importing system re-generate this cleanly
        isDefault: undefined
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportPreset, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const cleanName = preset.name.replace(/ 💾$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
      downloadAnchor.setAttribute('download', `Plantilla_${cleanName}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification('Plantilla exportada correctamente (.json)');
    } catch (err) {
      console.error('Error exporting preset:', err);
      showNotification('Error al exportar la plantilla');
    }
  };

  const handleImportPresetFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Basic check to see if it's an AppPreset
        if (parsed && typeof parsed === 'object' && parsed.wave && parsed.logo && parsed.text) {
          const nameToUse = (parsed.name || 'Plantilla Importada').replace(/ 💾$/, '') + ' 💾';
          const newPreset: AppPreset = {
            ...parsed,
            id: 'usr-' + Date.now().toString(),
            name: nameToUse
          };
          
          onImportPreset(newPreset);
          showNotification('¡Plantilla importada con éxito! 🎉');
        } else {
          showNotification('Archivo de plantilla no válido');
        }
      } catch (err) {
        console.error('Error importing preset:', err);
        showNotification('Error: JSON corrupto o inválido');
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be imported again
    e.target.value = '';
  };

  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const pStateText = text.replace(/,\s*/g, ',\n');
        setTextConfig(prev => ({ ...prev, content: pStateText }));
        showNotification('Texto pegado del portapapeles');
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      showNotification('Usa Ctrl+V o da permisos de portapapeles');
    }
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formattedText = pastedText.replace(/,\s*/g, ',\n');
    
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const originalValue = textConfig.content || '';
    
    const newValue = originalValue.substring(0, start) + formattedText + originalValue.substring(end);
    
    setTextConfig(prev => ({ ...prev, content: newValue }));
    
    // Maintain cursor position at the end of the newly pasted text block
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const originalValue = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    let formatted = '';
    let cursorOffset = 0;

    for (let i = 0; i < originalValue.length; i++) {
      const char = originalValue[i];
      if (char === ',') {
        formatted += ',';
        
        let j = i + 1;
        let spacesCount = 0;
        let hasNewline = false;
        while (j < originalValue.length && (originalValue[j] === ' ' || originalValue[j] === '\n' || originalValue[j] === '\r')) {
          if (originalValue[j] === '\n' || originalValue[j] === '\r') {
            hasNewline = true;
          }
          spacesCount++;
          j++;
        }

        if (!hasNewline) {
          formatted += '\n';
          if (i < selectionStart) {
            cursorOffset += 1;
          }
          if (spacesCount > 0) {
            if (i + 1 < selectionStart) {
              cursorOffset -= Math.min(spacesCount, selectionStart - (i + 1));
            }
            i += spacesCount;
          }
        }
      } else {
        formatted += char;
      }
    }

    setTextConfig(prev => ({ ...prev, content: formatted }));

    const newCursorPos = Math.max(0, selectionStart + cursorOffset);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="w-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
      
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-xl shadow-xl border border-emerald-400 font-medium text-xs animate-slide-up">
          <Check size={14} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Editor Main Controls Sheet Container */}
      <div className="flex flex-col gap-3">
        
        {/* 1. TAB: FILES & MEDIA */}
        {activeTab === 'files' && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <FolderOpen size={13} className="text-sky-400" />
                <span>Archivos de medios</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500">Video y Audio base</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {/* Audio Upload Input section with recovery caching */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300 flex items-center gap-1">
                    <Music size={13} className="text-sky-400 animate-pulse" />
                    <span>Sonido / Audio de Fondo</span>
                  </span>
                  {duration > 0 && (
                    <span className="text-[9px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
                      {Math.floor(duration)}s
                    </span>
                  )}
                </div>
                
                <div className="relative group border border-dashed border-slate-850 hover:border-sky-500/50 rounded-xl p-3 bg-slate-950 transition-all text-center">
                  <input
                    id="audio-file-input"
                    type="file"
                    accept="*/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onAudioUpload(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Music size={20} className="mx-auto text-slate-500 group-hover:text-sky-400 mb-1 transition-all" />
                  <span className="block text-[11px] font-mono text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                    {audioFileName || 'Subir pista de audio'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLoadLastAudio}
                  className="mt-1.5 w-full py-2 bg-slate-950 hover:bg-slate-800/80 hover:text-sky-300 text-slate-450 rounded-xl text-[10px] font-semibold border border-slate-850 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Volume2 size={12} className="text-sky-400" />
                  <span>Cargar última pista de la memoria</span>
                </button>
              </div>

              {/* Background cover option */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-350 flex items-center gap-1">
                  <Image size={13} className="text-emerald-400" />
                  <span>Imagen o Video de fondo</span>
                </span>
                
                <div className="relative group border border-dashed border-slate-850 hover:border-emerald-500/50 rounded-xl p-3 bg-slate-950 transition-all text-center">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onBgUpload(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Film size={20} className="mx-auto text-slate-500 group-hover:text-emerald-400 mb-1 transition-all" />
                  <span className="block text-[11px] font-mono text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                    {bgFileName || 'Seleccionar Imagen/Video Cover'}
                  </span>
                </div>
                {bgFileType && (
                  <span className="text-[9px] text-emerald-400 uppercase font-mono tracking-wide px-1">
                    Modo: {bgFileType === 'image' ? '🖼️ Fondo de Imagen estática' : '🎥 Bucle de Clip de Video'}
                  </span>
                )}
              </div>

              {/* Video Volume mixing controls */}
              {bgFileType === 'video' && (
                <div className="flex flex-col gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1 font-medium select-none">
                      <Volume2 size={11} className="text-sky-400" />
                      Volumen de Clip (Mezcla)
                    </span>
                    <span className="font-mono font-bold text-sky-400">{Math.round(videoVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={videoVolume}
                    onChange={(e) => onVideoVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded"
                  />
                </div>
              )}

              {/* Central brand logo circular overlay option */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-350 flex items-center gap-1">
                  <Compass size={13} className="text-rose-400" />
                  <span>Logo de Marca (.png con fondo transparente)</span>
                </span>
                
                <div className="relative group border border-dashed border-slate-850 hover:border-rose-500/50 rounded-xl p-3 bg-slate-950 transition-all text-center">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onLogoUpload(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-5 h-5 rounded-full border border-slate-500 mx-auto group-hover:border-rose-450 flex items-center justify-center mb-1 text-slate-400 text-[9px] font-mono">T</div>
                  <span className="block text-[11px] font-mono text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                    {logoFileName || 'Subir archivo de logo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB: SOUNDWAVES */}
        {activeTab === 'waves' && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Sliders size={13} className="text-pink-400" />
                <span>Estilo de la Onda Reactiva</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500">7 Patrones Disponibles</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Grid selectors */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450">Geometría de oscilación</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['bars', 'line', 'dots', 'circle_bars', 'spiral', 'oscilloscope', 'retro_blocks'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWaveConfig(prev => ({ ...prev, type }))}
                      className={`p-2 rounded text-left text-[11px] font-medium transition-colors border select-none ${
                        waveConfig.type === type
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow'
                          : 'bg-slate-950 text-slate-450 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      {type === 'bars' && '📊 Barras Sémicas'}
                      {type === 'line' && '📈 Línea Continua'}
                      {type === 'dots' && '⚪ Círculos/Puntos'}
                      {type === 'circle_bars' && '⭕ Circular Radial'}
                      {type === 'spiral' && '🌀 Espiral Áurea'}
                      {type === 'oscilloscope' && '⚡ Osciloscopio Láser'}
                      {type === 'retro_blocks' && '🕹️ Retro Bloques'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selectors */}
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-850 mt-1">
                <span className="text-xs font-mono text-slate-400">Color Primario</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={waveConfig.color}
                    onChange={(e) => setWaveConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-7 rounded border-0 outline-none cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={waveConfig.color}
                    onChange={(e) => setWaveConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="w-20 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 uppercase"
                  />
                </div>
              </div>

              {/* Height scaling slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Amplitud Máxima:</span>
                  <span className="text-sky-400 font-bold">{waveConfig.maxHeight} px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="350"
                  value={waveConfig.maxHeight}
                  onChange={(e) => setWaveConfig(prev => ({ ...prev, maxHeight: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Width / Weight option */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Grosos / Ancho de onda:</span>
                  <span className="text-sky-400 font-bold">{waveConfig.thickness} px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={waveConfig.thickness}
                  onChange={(e) => setWaveConfig(prev => ({ ...prev, thickness: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Gap between bars */}
              {waveConfig.type === 'bars' && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Espaciado entre barras:</span>
                    <span className="text-sky-400 font-bold">{waveConfig.gap} px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={waveConfig.gap}
                    onChange={(e) => setWaveConfig(prev => ({ ...prev, gap: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Vertical Position */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Posición Vertical (Eje Y):</span>
                  <span className="text-sky-400 font-bold">{waveConfig.yPosition} %</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={waveConfig.yPosition}
                  onChange={(e) => setWaveConfig(prev => ({ ...prev, yPosition: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. TAB: LOGO CONFIGURATION */}
        {activeTab === 'logo' && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Compass size={13} className="text-teal-400" />
                <span>Formatos del Logo Central</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500">Medida y bordes</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Show toggle button */}
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                <span className="text-xs font-mono text-slate-400">Mostrar Logo</span>
                <button
                  type="button"
                  onClick={() => setLogoConfig(prev => ({ ...prev, show: !prev.show }))}
                  className={`py-1 px-3.5 rounded text-xs transition-all flex items-center gap-1.5 ${
                    logoConfig.show
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {logoConfig.show ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>{logoConfig.show ? 'Activado' : 'Desactivado'}</span>
                </button>
              </div>

              {/* Logo dimensions panel */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Medición del Diámetro:</span>
                  <span className="text-sky-400 font-bold">{logoConfig.size} px</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="260"
                  value={logoConfig.size}
                  disabled={!logoConfig.show}
                  onChange={(e) => setLogoConfig(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer disabled:opacity-30"
                />
              </div>

              {/* Rounded outline ring dimensions */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Grosor del Borde Circular:</span>
                  <span className="text-sky-400 font-bold">{logoConfig.borderWidth} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={logoConfig.borderWidth}
                  disabled={!logoConfig.show}
                  onChange={(e) => setLogoConfig(prev => ({ ...prev, borderWidth: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer disabled:opacity-30"
                />
              </div>

              {/* Rings Color overlay selection */}
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-850 mt-1">
                <span className="text-xs font-mono text-slate-400">Color de Borde</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={logoConfig.borderColor}
                    disabled={!logoConfig.show}
                    onChange={(e) => setLogoConfig(prev => ({ ...prev, borderColor: e.target.value }))}
                    className="w-8 h-7 rounded border-0 outline-none cursor-pointer bg-transparent disabled:opacity-30"
                  />
                  <input
                    type="text"
                    value={logoConfig.borderColor}
                    disabled={!logoConfig.show}
                    onChange={(e) => setLogoConfig(prev => ({ ...prev, borderColor: e.target.value }))}
                    className="w-20 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 uppercase disabled:opacity-30"
                  />
                </div>
              </div>

              {!logoFileName && logoConfig.show && (
                <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/25 p-2 rounded-xl flex items-start gap-1.5 mt-1 leading-normal">
                  <AlertTriangle size={13} className="shrink-0 text-amber-500 mt-0.5" />
                  <span>Sube primero un logo circular transparente (.png) en la pestaña 'Archivos' para proyectarlo aquí.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. TAB: TEXTS & LOG BOOK */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Type size={13} className="text-amber-400" />
                <span>Textos Superpuestos del Logo</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500">Cabeceras PWA</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Heading Text Input with Fast Clipboard Paste */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">Texto libre del video</span>
                  <button
                    type="button"
                    onClick={handlePasteText}
                    className="px-2 py-1 bg-amber-500/15 hover:bg-amber-550/20 active:scale-95 border border-amber-550/30 text-amber-400 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                  >
                    <span>📋 Pegar texto</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={textConfig.content}
                  onChange={handleTextareaChange}
                  onPaste={handleTextareaPaste}
                  placeholder="EPISODIO #01&#10;Mi Podcast en local"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-amber-500/50 transition-colors placeholder:text-slate-700 font-sans"
                />
              </div>

              {/* Typography family selection dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450">Familia Tipográfica</label>
                <select
                  value={textConfig.fontFamily}
                  onChange={(e) => setTextConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-slate-300 outline-none focus:border-amber-500/40"
                >
                  <option value="Inter">Inter (Sans-Serif Limpio Principal)</option>
                  <option value="Roboto">Roboto (Sans-Serif Neogrotesco)</option>
                  <option value="Open Sans">Open Sans (Sans-Serif Humanista)</option>
                  <option value="Lato">Lato (Sans-Serif Neutro y Suave)</option>
                  <option value="Montserrat">Montserrat (Sans-Serif Geométrico Elegante)</option>
                  <option value="Poppins">Poppins (Sans-Serif Redondeado)</option>
                  <option value="Nunito">Nunito (Sans-Serif Orgánico)</option>
                  <option value="Raleway">Raleway (Sans-Serif Estilizado)</option>
                  <option value="Fira Sans">Fira Sans (Sans-Serif Técnico)</option>
                  <option value="Work Sans">Work Sans (Sans-Serif Moderno)</option>
                  <option value="Quicksand">Quicksand (Sans-Serif Amigable)</option>
                  <option value="Barlow">Barlow (Sans-Serif de Bajo Contraste)</option>
                  <option value="Cabin">Cabin (Sans-Serif Humanista Cálido)</option>
                  <option value="DM Sans">DM Sans (Sans-Serif Minimalista)</option>
                  <option value="Albert Sans">Albert Sans (Sans-Serif Premium)</option>
                  <option value="Outfit">Outfit (Sans-Serif Ultra-Moderno)</option>
                  <option value="Kanit">Kanit (Sans-Seric Grotesco Firme)</option>
                  <option value="Rubik">Rubik (Sans-Serif Dinámico)</option>
                  <option value="Sora">Sora (Sans-Serif Industrial Tech)</option>
                  <option value="Heebo">Heebo (Sans-Serif de Precisión)</option>
                  <option value="Manrope">Manrope (Sans-Serif Suizo Geométrico)</option>
                </select>
              </div>

              {/* Font Size Boost limit to 180px */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Tamaño del Texto (Escala):</span>
                  <span className="text-sky-400 font-bold">{textConfig.fontSize} px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="180"
                  value={textConfig.fontSize}
                  onChange={(e) => setTextConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Line Height Separation - Positioned directly under Text Size slider as requested */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Separación de líneas (Interlineado):</span>
                  <span className="text-sky-400 font-bold">{(textConfig.lineHeight !== undefined ? textConfig.lineHeight : 1.35).toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="2.50"
                  step="0.05"
                  value={textConfig.lineHeight !== undefined ? textConfig.lineHeight : 1.35}
                  onChange={(e) => setTextConfig(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Text Color Selection */}
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-850 mt-1">
                <span className="text-xs font-mono text-slate-400">Color de Fuente</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={textConfig.color}
                    onChange={(e) => setTextConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-7 rounded border-0 outline-none cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={textConfig.color}
                    onChange={(e) => setTextConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="w-20 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 uppercase"
                  />
                </div>
              </div>

              {/* Text Position */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Posición Vertical Texto (Y):</span>
                  <span className="text-sky-400 font-bold">{textConfig.yPosition} %</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={textConfig.yPosition}
                  onChange={(e) => setTextConfig(prev => ({ ...prev, yPosition: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Box Card Background Custom controls (Padding X, Padding Y) */}
              <div className="border border-slate-850 p-2.5 rounded-xl flex flex-col gap-2.5 bg-slate-950">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">Añadir tarjeta de fondo</span>
                  <button
                    type="button"
                    onClick={() => setTextConfig(prev => ({ ...prev, showBg: !prev.showBg }))}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                      textConfig.showBg ? 'bg-sky-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full bg-slate-950 transition-transform ${
                      textConfig.showBg ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {textConfig.showBg && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-900/60 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">Color caja</span>
                      <input
                        type="color"
                        value={textConfig.bgColor}
                        onChange={(e) => setTextConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-450">
                        <span>Opacidad:</span>
                        <span>{Math.round(textConfig.bgOpacity * 100)} %</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={textConfig.bgOpacity}
                        onChange={(e) => setTextConfig(prev => ({ ...prev, bgOpacity: parseFloat(e.target.value) }))}
                        className="w-full h-1 accent-sky-550 bg-slate-900"
                      />
                    </div>

                    {/* Paddington Stretch controls requested */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-450">
                        <span>Ancho de Fondo (Horizontal):</span>
                        <span>{textConfig.paddingX !== undefined ? textConfig.paddingX : textConfig.padding} px</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="150"
                        value={textConfig.paddingX !== undefined ? textConfig.paddingX : textConfig.padding}
                        onChange={(e) => setTextConfig(prev => ({ ...prev, paddingX: parseInt(e.target.value) }))}
                        className="w-full h-1 accent-sky-550 bg-slate-900"
                      />
                    </div>

                     <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-450">
                        <span>Alto de Fondo (Vertical):</span>
                        <span>{textConfig.paddingY !== undefined ? textConfig.paddingY : textConfig.padding} px</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="150"
                        value={textConfig.paddingY !== undefined ? textConfig.paddingY : textConfig.padding}
                        onChange={(e) => setTextConfig(prev => ({ ...prev, paddingY: parseInt(e.target.value) }))}
                        className="w-full h-1 accent-sky-550 bg-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- SECCIÓN: REDES SOCIALES EN VIDEO --- */}
            <div className="flex flex-col gap-3.5 mt-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                  <Share2 size={13} className="text-sky-400" />
                  <span>Redes Sociales en Video</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">Video Overlays</span>
              </div>

              {/* Toggler showing / hiding socials in video */}
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">Mostrar Redes Sociales</span>
                  <span className="text-[9px] font-mono text-slate-550 lowercase">Mostrar logos + usuario en la inferior</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSocialConfig(prev => ({ ...prev, show: !prev.show }))}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                    socialConfig.show ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-slate-950 transition-all ${
                    socialConfig.show ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {socialConfig.show && (
                <div className="flex flex-col gap-3 transition-all duration-300">
                  {/* Text alignment selector matches centered, left, right */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450">Alineación en Pantalla</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-850">
                      {(['left', 'center', 'right'] as const).map(align => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => setSocialConfig(prev => ({ ...prev, alignment: align }))}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize ${
                            socialConfig.alignment === align
                              ? 'bg-sky-500/15 border border-sky-450/40 text-sky-450 font-extrabold'
                              : 'text-slate-500 hover:text-slate-300 border border-transparent'
                          }`}
                        >
                          {align === 'left' ? 'Izquierda' : align === 'center' ? 'Centro' : 'Derecha'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Facebook input field with brand logo icon indicator */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>Nombre de Usuario en Facebook</span>
                    </label>
                    <input
                      type="text"
                      value={socialConfig.facebook}
                      onChange={(e) => setSocialConfig(prev => ({ ...prev, facebook: e.target.value }))}
                      placeholder="e.g. MiPaginaFacebook"
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-sky-500/55 transition-colors placeholder:text-slate-705"
                    />
                  </div>

                  {/* YouTube input field with brand logo icon indicator */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span>Nombre de Usuario en YouTube</span>
                    </label>
                    <input
                      type="text"
                      value={socialConfig.youtube}
                      onChange={(e) => setSocialConfig(prev => ({ ...prev, youtube: e.target.value }))}
                      placeholder="e.g. @MiCanalYoutube"
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-sky-500/55 transition-colors placeholder:text-slate-705"
                    />
                  </div>

                  {/* TikTok input field with brand logo icon indicator */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-550 animate-pulse"></span>
                      <span>Nombre de Usuario en TikTok</span>
                    </label>
                    <input
                      type="text"
                      value={socialConfig.tiktok}
                      onChange={(e) => setSocialConfig(prev => ({ ...prev, tiktok: e.target.value }))}
                      placeholder="e.g. @MiPerfilTiktok"
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-sky-500/55 transition-colors placeholder:text-slate-705"
                    />
                  </div>

                  {/* Extras: font size / Position Y / Plate Background card toggler */}
                  <div className="border border-slate-850 p-2.5 rounded-xl flex flex-col gap-3 bg-slate-950 mt-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Estilización de Redes</span>

                    {/* Size and vertical position sliders */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-450">
                        <span>Tamaño de Redes:</span>
                        <span className="text-sky-400 font-bold">{socialConfig.fontSize} px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="32"
                        value={socialConfig.fontSize}
                        onChange={(e) => setSocialConfig(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                        className="w-full h-1 accent-sky-550 bg-slate-900 cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-450">
                        <span>Posición Vertical (Y %):</span>
                        <span className="text-sky-400 font-bold">{socialConfig.yPosition} %</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="98"
                        value={socialConfig.yPosition}
                        onChange={(e) => setSocialConfig(prev => ({ ...prev, yPosition: parseInt(e.target.value) }))}
                        className="w-full h-1 accent-sky-550 bg-slate-900 cursor-pointer"
                      />
                    </div>

                    {/* Color picker */}
                    <div className="flex items-center justify-between border-t border-slate-905 pt-2">
                      <span className="text-[11px] font-mono text-slate-450 font-medium">Color de Texto</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={socialConfig.color}
                          onChange={(e) => setSocialConfig(prev => ({ ...prev, color: e.target.value }))}
                          className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Plate Background checkbox toggler */}
                    <div className="flex items-center justify-between border-t border-slate-905 pt-2">
                      <span className="text-[11px] font-mono text-slate-450 font-medium font-medium">Fondo protector</span>
                      <button
                        type="button"
                        onClick={() => setSocialConfig(prev => ({ ...prev, showBg: !prev.showBg }))}
                        className={`w-10 h-5 transition-colors rounded-full p-0.5 ${
                          socialConfig.showBg ? 'bg-sky-500' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${
                          socialConfig.showBg ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {socialConfig.showBg && (
                      <div className="flex flex-col gap-2 pt-1.5 border-t border-slate-900/60">
                        <div className="flex justify-between text-[10px] font-mono text-slate-450">
                          <span>Opacidad de fondo:</span>
                          <span>{Math.round(socialConfig.bgOpacity * 100)} %</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={socialConfig.bgOpacity}
                          onChange={(e) => setSocialConfig(prev => ({ ...prev, bgOpacity: parseFloat(e.target.value) }))}
                          className="w-full h-1 accent-sky-550 bg-slate-900"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. TAB: FORMAT & EXPORT PIPELINE */}
        {activeTab === 'export' && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Film size={13} className="text-emerald-400" />
                <span>Exportar y Formatear Video</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500">Render Local</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Export Status and Triggers at the Top */}
              {exportState === 'idle' && (
                <div className="flex flex-col gap-2 p-3 bg-slate-950 rounded-xl border border-slate-850/50 mb-1">
                  <button
                    type="button"
                    onClick={onStartExport}
                    disabled={!audioFileName}
                    className={`w-full py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 bg-emerald-550 hover:bg-emerald-600 border border-emerald-500 active:scale-95 text-white shadow transition-all ${
                      !audioFileName ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    id="start-video-export"
                  >
                    <Film size={14} />
                    <span>Compilar Video Listo</span>
                  </button>
                  {!audioFileName && (
                    <span className="text-[9px] text-amber-500 text-center select-none block">
                      ⚠ Carga un archivo de audio (.mp3 o .wav) para proceder.
                    </span>
                  )}
                </div>
              )}

              {/* Progress screens with remaining estimated time and cancel button */}
              {(exportState === 'preparing' || exportState === 'rendering') && (
                <div className="flex flex-col gap-2 p-3 bg-slate-950 rounded-xl border border-sky-500/30 mb-1 shadow-md">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-sky-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping"></span>
                      {exportState === 'preparing' ? 'Preparando encoder...' : 'Procesando Render...'}
                    </span>
                    <span className="font-mono text-slate-300 font-bold">{exportProgress}%</span>
                  </div>
                  
                  {/* Styled Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 mt-1">
                    <div 
                      className="bg-transparent bg-gradient-to-r from-sky-500 to-emerald-400 h-full transition-all duration-300 ease-out" 
                      style={{ width: `${exportProgress}%` }}
                    ></div>
                  </div>

                  {/* Estimation & detailed statistics */}
                  <div className="flex justify-between items-center text-[9.5px] font-mono text-slate-450 mt-1">
                    <span>Progreso: {exportProgress}%</span>
                    <span className="text-emerald-450 font-medium">Restante: {getEstimatedRemainingTime()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={onCancelExport}
                    className="w-full mt-2 py-1.5 text-[10.5px] font-bold text-rose-450 hover:bg-rose-500/10 border border-rose-900/25 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Cancelar Compilación
                  </button>
                </div>
              )}

              {/* Complete & download at the Top */}
              {exportState === 'finished' && downloadUrl && (() => {
                const getExportFilename = () => {
                  if (!textConfig || !textConfig.content) return 'OndaVideo';
                  let base = textConfig.content.replace(/[\r\n]+/g, ' ').trim();
                  base = base.replace(/[\\/:*?"<>|]/g, '');
                  return base || 'OndaVideo';
                };
                const exportName = `${getExportFilename()}.mp4`;
                return (
                  <div className="flex flex-col gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 text-center animate-fade-in mb-1">
                    <Check size={28} className="mx-auto text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">¡Video compilado con éxito!</span>
                    
                    <div className="flex flex-col gap-1.5 mt-1">
                      <a
                        href={downloadUrl}
                        download={exportName}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow"
                      >
                        <Download size={13} />
                        <span>Descargar Video (.mp4)</span>
                      </a>

                      {/* Google Drive Integration Interface in top layout */}
                      <div className="mt-2 pt-2.5 border-t border-slate-900/40 flex flex-col gap-1.5">
                        {isDriveUploading ? (
                          <div className="flex flex-col gap-1 text-left p-2.5 bg-slate-950/40 rounded-lg">
                            <div className="flex items-center justify-between text-[10px] font-mono font-medium text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></span>
                                Subiendo a Google Drive...
                              </span>
                              <span>{driveUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800/40 mt-1">
                              <div className="bg-sky-400 h-full transition-all duration-300" style={{ width: `${driveUploadProgress}%` }}></div>
                            </div>
                          </div>
                        ) : driveFileUrl ? (
                          <div className="bg-sky-500/5 p-2 px-2.5 rounded-lg border border-sky-500/10 flex flex-col gap-1.5">
                            <span className="text-[10px] text-sky-450 font-medium text-left">¡Guardado en tu Google Drive!</span>
                            <a
                              href={driveFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1 px-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-slate-950 rounded-lg font-semibold text-[10px] flex items-center justify-center gap-1 shadow"
                            >
                              <FolderOpen size={11} className="text-slate-950" />
                              <span>Abrir en Google Drive</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={handleDriveUpload}
                              className="w-full py-1.5 bg-slate-900 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 active:scale-95 text-sky-450 hover:text-sky-350 rounded-lg font-semibold text-[10.5px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 fill-current text-sky-450" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19.43 12.98l1.8-3.11c.21-.36.21-.8 0-1.15l-3.37-5.83c-.22-.38-.63-.61-1.07-.61h-6.75c-.44 0-.85.23-1.07.61L5.62 8.72c-.21.36-.21.8 0 1.15l3.37 5.83c.22.38.63.61 1.07.61h6.75c.44 0 .85-.23 1.07-.61zm-10.4-2.83l2.97-5.15H12l-2.97 5.15zm8.34-5.15l2.97 5.15-2.97 5.15-2.97-5.15zm-2.02 8.65L12.38 8.5H12l2.97 5.15z"/>
                              </svg>
                              <span>Guardar en Google Drive</span>
                            </button>

                            {driveUser && (
                              <div className="flex items-center justify-between px-1 mt-0.5 text-[8.5px] font-mono text-slate-500">
                                <span className="truncate max-w-[120px]" title={driveUser}>G: {driveUser}</span>
                                <button
                                  type="button"
                                  onClick={handleDriveLogout}
                                  className="underline hover:text-slate-350 cursor-pointer"
                                >
                                  Cerrar sesión
                                </button>
                              </div>
                            )}

                            {driveError && (
                              <p className="text-[9px] text-rose-450 text-left px-1 mt-0.5 font-mono">{driveError}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={onCancelExport}
                        className="w-full mt-1.5 py-1 text-slate-500 hover:text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        Comenzar nuevo diseño
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Error state at the Top */}
              {exportState === 'error' && (
                <div className="flex flex-col gap-1.5 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-center mb-1">
                  <span className="text-xs font-bold text-rose-300">Fallo en la captura de lienzo</span>
                  <button
                    type="button"
                    onClick={onCancelExport}
                    className="mt-1 w-full py-1 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded text-[10px] cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Aspect ratio format selector */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450">Formato / Relación de Aspecto</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['16:9', '9:16', '1:1'] as const).map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-colors border select-none ${
                        aspectRatio === ratio
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/35'
                          : 'bg-slate-950 text-slate-450 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      {ratio === '16:9' ? '横 Horizontal (16:9)' : ratio === '9:16' ? '縦 Vertical (9:16)' : '⬛ Cuadrado (1:1)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length limit selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase tracking-wide text-slate-450">Duración del fragmento de video</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['15', '30', 'full'] as const).map(limit => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => setExportTimerLimit(limit)}
                      disabled={isExporting}
                      className={`py-1 rounded text-center text-[10px] font-semibold transition-all ${
                        exportTimerLimit === limit
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-950 text-slate-450 hover:bg-slate-900'
                      } disabled:opacity-40 select-none`}
                    >
                      {limit === '15' ? '15s (Corto)' : limit === '30' ? '30s (Social)' : 'Completo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Power Saving Mode Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-slate-1000/60 rounded-xl border border-slate-850/60">
                <div className="flex flex-col gap-0.5 text-left pr-2">
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                    🔋 Modo Ahorro de Energía
                  </span>
                  <p className="text-[8.5px] text-slate-500 leading-normal">
                    Desactiva la vista previa en pantalla durante la exportación para un menor consumo de batería/CPU en móviles.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={isSavingMode}
                    disabled={isExporting}
                    onChange={(e) => setIsSavingMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-emerald-400 after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-emerald-500/10 border border-slate-700 peer-checked:border-emerald-500/35"></div>
                </label>
              </div>

              {/* Direct Save template tool */}
              <div className="border border-slate-850 p-3 rounded-xl flex flex-col gap-2 bg-slate-950/40 mt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-450 flex items-center gap-1">
                  <Save size={11} className="text-sky-400" />
                  <span>Guardar plantilla personalizada</span>
                </span>
                <form onSubmit={handleSavePreset} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nombre del diseño..."
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[11px] outline-none text-slate-200 focus:border-sky-500/40"
                    maxLength={20}
                  />
                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-600 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-lg transition-all shrink-0 select-none flex items-center gap-0.5"
                  >
                    <Save size={10} />
                    <span>Guardar</span>
                  </button>
                </form>

                {/* Import tool */}
                <div className="flex items-center justify-between gap-1.5 border-t border-slate-900/60 pt-2.5 mt-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">¿Tienes un diseño exterior?</span>
                  <label className="cursor-pointer bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 py-1 px-2.5 rounded-lg text-[10px] text-sky-450 hover:text-sky-350 transition-all font-semibold flex items-center gap-1.5 select-none">
                    <Download size={10} className="rotate-180 text-sky-450" />
                    <span>Importar .json</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportPresetFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Templates user list */}
                {savedPresets.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 border-t border-slate-900/60 pt-2.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Tus Diseños:</span>
                    {savedPresets.map(preset => {
                      const isApplied = currentPresetId === preset.id;
                      const isDefault = defaultPresetId === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            onApplyPreset(preset);
                            showNotification(`Diseño: ${preset.name}`);
                          }}
                          className={`p-2 rounded-lg border flex items-center justify-between text-[11px] cursor-pointer transition-all ${
                            isApplied 
                              ? 'bg-slate-900 border-sky-500/30' 
                              : 'bg-slate-950 border-transparent hover:border-slate-855'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 truncate">
                            <span className="text-slate-200 font-semibold truncate pr-2">{preset.name}</span>
                            <span className="text-[8px] text-slate-500 uppercase font-mono">{preset.wave.type} • {preset.aspectRatio}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                onSetDefaultPreset(isDefault ? null : preset.id);
                                showNotification(isDefault ? 'Fijación por defecto quitada' : 'Inicio por defecto fijado ✅');
                              }}
                              className={`p-0.5 rounded ${isDefault ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                              title={isDefault ? "Quitar predeterminado" : "Fijar inicial predeterminado"}
                            >
                              ★
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDownloadPreset(preset);
                              }}
                              className="p-0.5 rounded text-slate-500 hover:text-sky-400"
                              title="Descargar plantilla (.json)"
                            >
                              <Download size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeletePreset(preset.id);
                                showNotification('Plantilla eliminada');
                              }}
                              className="p-0.5 rounded text-slate-500 hover:text-rose-400"
                              title="Eliminar plantilla"
                            >
                              <Trash size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Default system structures list */}
                <div className="flex flex-col gap-1 mt-1 border-t border-slate-900/60 pt-2.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Diseños Predeterminados:</span>
                  {SYSTEM_PRESETS.map(preset => {
                    const isApplied = currentPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          onApplyPreset(preset);
                          showNotification(`Aplicado: ${preset.name}`);
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between text-[10px] cursor-pointer transition-all ${
                          isApplied ? 'bg-slate-900 border-sky-500/20' : 'bg-slate-950 border-transparent'
                        }`}
                      >
                        <span className="text-slate-300 font-medium truncate">{preset.name}</span>
                        <span className="text-[8px] text-slate-500 font-mono">{preset.aspectRatio}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden network font preloaders */}
      <div className="absolute pointer-events-none opacity-0 select-none h-1 w-1" aria-hidden="true">
        <span style={{ fontFamily: 'Inter' }}>Preload</span>
        <span style={{ fontFamily: 'Roboto' }}>Preload</span>
        <span style={{ fontFamily: 'Open Sans' }}>Preload</span>
        <span style={{ fontFamily: 'Lato' }}>Preload</span>
        <span style={{ fontFamily: 'Montserrat' }}>Preload</span>
        <span style={{ fontFamily: 'Poppins' }}>Preload</span>
        <span style={{ fontFamily: 'Nunito' }}>Preload</span>
        <span style={{ fontFamily: 'Raleway' }}>Preload</span>
        <span style={{ fontFamily: 'Fira Sans' }}>Preload</span>
        <span style={{ fontFamily: 'Work Sans' }}>Preload</span>
        <span style={{ fontFamily: 'Quicksand' }}>Preload</span>
        <span style={{ fontFamily: 'Barlow' }}>Preload</span>
        <span style={{ fontFamily: 'Cabin' }}>Preload</span>
        <span style={{ fontFamily: 'DM Sans' }}>Preload</span>
        <span style={{ fontFamily: 'Albert Sans' }}>Preload</span>
        <span style={{ fontFamily: 'Outfit' }}>Preload</span>
        <span style={{ fontFamily: 'Kanit' }}>Preload</span>
        <span style={{ fontFamily: 'Rubik' }}>Preload</span>
        <span style={{ fontFamily: 'Sora' }}>Preload</span>
        <span style={{ fontFamily: 'Heebo' }}>Preload</span>
        <span style={{ fontFamily: 'Manrope' }}>Preload</span>
      </div>
    </div>
  );
};
