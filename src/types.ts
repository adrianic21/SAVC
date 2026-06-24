export type WaveType = 'bars' | 'line' | 'dots' | 'circle_bars' | 'spiral' | 'oscilloscope' | 'retro_blocks';

export interface WaveConfig {
  type: WaveType;
  color: string;
  maxHeight: number; // Max height in pixels / scale
  thickness: number; // Width of bars/dots or line stroke size
  gap: number; // Distance between bars
  yPosition: number; // Position in % from top (0-100)
  glow: boolean; // Add a nice outer glow/shadow to soundwave
}

export interface LogoConfig {
  size: number; // Diameter in pixels
  show: boolean;
  borderWidth: number;
  borderColor: string;
  borderRadius: number; // Allow rounded corners / circular
}

export interface TextConfig {
  content: string;
  color: string;
  fontSize: number;
  yPosition: number; // Position in % from top (0-100)
  fontFamily: string;
  showBg: boolean;
  bgColor: string;
  bgOpacity: number; // slider 0-1
  padding: number;
  paddingX?: number; // Horizontal background expansion
  paddingY?: number; // Vertical background expansion
  lineHeight?: number; // Text line separation ratio (e.g. 1.0 to 2.5)
}

export interface SocialConfig {
  show: boolean;
  alignment: 'left' | 'center' | 'right';
  facebook: string;
  youtube: string;
  tiktok: string;
  fontSize: number;
  color: string;
  yPosition: number; // e.g. 0-100 indicating percentage from top (defaults to bottom like 90%)
  showBg: boolean;
  bgColor: string;
  bgOpacity: number;
}

export interface AppPreset {
  id: string;
  name: string;
  wave: WaveConfig;
  logo: LogoConfig;
  text: TextConfig;
  social?: SocialConfig;
  aspectRatio: '16:9' | '9:16' | '1:1';
  isDefault?: boolean;
  hasBgFile?: boolean;
  bgFileName?: string | null;
  bgFileType?: 'image' | 'video' | null;
  hasLogoFile?: boolean;
  logoFileName?: string | null;
  isSavingMode?: boolean;
  exportTimerLimit?: '15' | '30' | 'full';
}
