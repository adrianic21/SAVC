import { AppPreset } from '../types';

export const SYSTEM_PRESETS: AppPreset[] = [
  {
    id: 'sys-neon-synth',
    name: 'Neon Synthwave 🌌',
    aspectRatio: '16:9',
    wave: {
      type: 'circle_bars',
      color: '#00f2fe',
      maxHeight: 180,
      thickness: 5,
      gap: 3,
      yPosition: 50,
      glow: true
    },
    logo: {
      show: true,
      size: 140,
      borderWidth: 6,
      borderColor: '#f35588',
      borderRadius: 70
    },
    text: {
      content: 'SYNTH EPISODIO #04\nBajo las estrellas nocturnas',
      color: '#ffffff',
      fontSize: 24,
      yPosition: 85,
      fontFamily: 'monospace',
      showBg: true,
      bgColor: '#020617',
      bgOpacity: 0.7,
      padding: 16
    }
  },
  {
    id: 'sys-minimal-forest',
    name: 'Minimalist Forest 🌲',
    aspectRatio: '9:16',
    wave: {
      type: 'line',
      color: '#10b981',
      maxHeight: 120,
      thickness: 4,
      gap: 4,
      yPosition: 65,
      glow: false
    },
    logo: {
      show: false,
      size: 100,
      borderWidth: 0,
      borderColor: '#ffffff',
      borderRadius: 50
    },
    text: {
      content: 'Naturaleza Profunda\nSonido y Calma',
      color: '#f8fafc',
      fontSize: 32,
      yPosition: 25,
      fontFamily: 'sans-serif',
      showBg: true,
      bgColor: '#064e3b',
      bgOpacity: 0.45,
      padding: 24
    }
  },
  {
    id: 'sys-warm-podcast',
    name: 'Retro Podcast🎙️',
    aspectRatio: '1:1',
    wave: {
      type: 'bars',
      color: '#f59e0b',
      maxHeight: 160,
      thickness: 10,
      gap: 6,
      yPosition: 55,
      glow: true
    },
    logo: {
      show: true,
      size: 110,
      borderWidth: 4,
      borderColor: '#f59e0b',
      borderRadius: 55
    },
    text: {
      content: 'CHARLAS DE CAFE\nEp. 42: Inteligencia Local',
      color: '#fef3c7',
      fontSize: 26,
      yPosition: 82,
      fontFamily: 'serif',
      showBg: true,
      bgColor: '#1e1b4b',
      bgOpacity: 0.85,
      padding: 15
    }
  }
];
