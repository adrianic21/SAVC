import React, { useRef, useEffect, useState } from 'react';
import { WaveConfig, LogoConfig, TextConfig, SocialConfig } from '../types';
import { Play, Pause } from 'lucide-react';

// Helper to draw Facebook brand vector icon on canvas
function drawFacebookIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  // Facebook Blue
  ctx.fillStyle = '#1877f2';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // White lowercase 'f' in gorgeous precise geometry
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.72)}px "Inter", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Shift 'f' slightly rights/downs for ideal optical centering
  ctx.fillText('f', x + size / 2 + size * 0.05, y + size / 2 + size * 0.04);
  ctx.restore();
}

// Helper to draw YouTube brand vector play button on canvas
function drawYoutubeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  // YouTube Red
  ctx.fillStyle = '#ff0000';
  const radius = size * 0.22;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y + size * 0.05, size, size * 0.9, radius);
  } else {
    ctx.rect(x, y + size * 0.05, size, size * 0.9);
  }
  ctx.fill();

  // White triangular play icon
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.38, y + size * 0.32);
  ctx.lineTo(x + size * 0.38, y + size * 0.68);
  ctx.lineTo(x + size * 0.69, y + size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Helper to draw TikTok brand vector musical note offset shadows icon on canvas
function drawTiktokIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  // Solid black background circle for high contrast overlay
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const cx = x + size * 0.45;
  const cy = y + size * 0.45;
  const strokeW = size * 0.11;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Cyan color accent offset shadow
  ctx.save();
  ctx.strokeStyle = '#25f4ee';
  ctx.lineWidth = strokeW;
  ctx.translate(-size * 0.04, -size * 0.02);
  // Stem
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.2);
  ctx.lineTo(cx, cy + size * 0.15);
  ctx.stroke();
  // Bottom circle arc
  ctx.beginPath();
  ctx.arc(cx - size * 0.15, cy + size * 0.15, size * 0.15, 0, Math.PI, false);
  ctx.stroke();
  // Top hook flag arc
  ctx.beginPath();
  ctx.arc(cx + size * 0.15, cy - size * 0.2, size * 0.15, Math.PI, Math.PI * 1.5, true);
  ctx.stroke();
  ctx.restore();

  // 2. Red / Magenta color accent offset shadow
  ctx.save();
  ctx.strokeStyle = '#fe0948';
  ctx.lineWidth = strokeW;
  ctx.translate(size * 0.04, size * 0.02);
  // Stem
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.2);
  ctx.lineTo(cx, cy + size * 0.15);
  ctx.stroke();
  // Bottom circle arc
  ctx.beginPath();
  ctx.arc(cx - size * 0.15, cy + size * 0.15, size * 0.15, 0, Math.PI, false);
  ctx.stroke();
  // Top hook flag arc
  ctx.beginPath();
  ctx.arc(cx + size * 0.15, cy - size * 0.2, size * 0.15, Math.PI, Math.PI * 1.5, true);
  ctx.stroke();
  ctx.restore();

  // 3. Crisp white main foreground layer
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = strokeW;
  // Stem
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.2);
  ctx.lineTo(cx, cy + size * 0.15);
  ctx.stroke();
  // Bottom circle arc
  ctx.beginPath();
  ctx.arc(cx - size * 0.15, cy + size * 0.15, size * 0.15, 0, Math.PI, false);
  ctx.stroke();
  // Top hook flag arc
  ctx.beginPath();
  ctx.arc(cx + size * 0.15, cy - size * 0.2, size * 0.15, Math.PI, Math.PI * 1.5, true);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

interface CanvasPreviewProps {
  // Audio state
  audioFile: File | null;
  audioElement: HTMLAudioElement | null;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  onPlayToggle: () => void;
  currentTime: number;
  duration: number;
  
  // Customization configurations
  waveConfig: WaveConfig;
  logoConfig: LogoConfig;
  textConfig: TextConfig;
  socialConfig: SocialConfig;
  aspectRatio: '16:9' | '9:16' | '1:1';
  
  // Assets loaded
  bgImage: HTMLImageElement | null;
  bgVideo: HTMLVideoElement | null;
  logoImage: HTMLImageElement | null;
  
  // Custom ref to allow external recording
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // Saving Mode options
  isSavingMode?: boolean;
  isExporting?: boolean;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  audioFile,
  audioElement,
  analyserNode,
  isPlaying,
  onPlayToggle,
  currentTime,
  duration,
  waveConfig,
  logoConfig,
  textConfig,
  socialConfig,
  aspectRatio,
  bgImage,
  bgVideo,
  logoImage,
  canvasRef,
  isSavingMode = false,
  isExporting = false
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep an active ref of currentTime to feed the animation loop without restarting it
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  const getCanvasDimensions = () => {
    switch (aspectRatio) {
      case '9:16':
        return { width: 720, height: 1280 };
      case '1:1':
        return { width: 720, height: 720 };
      case '16:9':
      default:
        return { width: 1280, height: 720 };
    }
  };

  const { width, height } = getCanvasDimensions();

  // Draw frame helper function
  const drawFrame = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    // 0. Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background
    if (bgVideo) {
      const vWidth = bgVideo.videoWidth || 1280;
      const vHeight = bgVideo.videoHeight || 720;
      const vAspect = vWidth / vHeight;
      const cAspect = width / height;
      
      let renderW, renderH, renderX, renderY;
      if (vAspect > cAspect) {
        renderH = height;
        renderW = height * vAspect;
        renderX = (width - renderW) / 2;
        renderY = 0;
      } else {
        renderW = width;
        renderH = width / vAspect;
        renderX = 0;
        renderY = (height - renderH) / 2;
      }
      ctx.drawImage(bgVideo, renderX, renderY, renderW, renderH);

      // Dark overlay slightly transparent
      ctx.fillStyle = 'rgba(2, 6, 23, 0.2)';
      ctx.fillRect(0, 0, width, height);
    } else if (bgImage) {
      const imgAspect = bgImage.width / bgImage.height;
      const cAspect = width / height;
      
      let renderW, renderH, renderX, renderY;
      if (imgAspect > cAspect) {
        renderH = height;
        renderW = height * imgAspect;
        renderX = (width - renderW) / 2;
        renderY = 0;
      } else {
        renderW = width;
        renderH = width / imgAspect;
        renderX = 0;
        renderY = (height - renderH) / 2;
      }
      ctx.drawImage(bgImage, renderX, renderY, renderW, renderH);

      // Dark overlay slightly transparent
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
      ctx.fillRect(0, 0, width, height);
    } else {
      // Elegant futuristic dark gradient background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#020617');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric circular ambient light
      const radialGrad = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, Math.max(width, height) / 1.5
      );
      radialGrad.addColorStop(0, 'rgba(14, 165, 233, 0.08)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Convert % positioning to exact pixels
    const waveY = (waveConfig.yPosition / 100) * height;
    const waveXCenter = width / 2;

    // 2. Draw Soundwave
    if (waveConfig.type === 'circle_bars') {
      const centerX = waveXCenter;
      const centerY = waveY;
      const radius = logoConfig.show ? (logoConfig.size / 2) + 20 : 100;
      const totalPoints = Math.min(dataArray.length, 120);
      
      let localSum = 0;
      for (let i = 0; i < totalPoints; i++) {
        localSum += dataArray[i];
      }
      const activeAvg = localSum / totalPoints;
      const pulseRate = 1 + (activeAvg / 255) * 0.15;

      ctx.save();

      for (let i = 0; i < totalPoints; i++) {
        const value = dataArray[i];
        const rawBarHeight = (value / 255) * waveConfig.maxHeight;
        const barHeight = Math.max(rawBarHeight, 4);

        const angle = (i / totalPoints) * Math.PI * 2;
        const outerRad = radius * pulseRate;
        const startX = centerX + Math.cos(angle) * outerRad;
        const startY = centerY + Math.sin(angle) * outerRad;
        
        const endX = centerX + Math.cos(angle) * (outerRad + barHeight);
        const endY = centerY + Math.sin(angle) * (outerRad + barHeight);

        ctx.beginPath();
        ctx.strokeStyle = waveConfig.color;
        ctx.lineWidth = waveConfig.thickness;
        ctx.lineCap = 'round';
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.restore();

    } else if (waveConfig.type === 'spiral') {
      const centerX = waveXCenter;
      const centerY = waveY;
      const maxRadius = Math.min(width, height) * 0.42;
      const totalPoints = Math.min(dataArray.length, 160);
      
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = waveConfig.color;
      ctx.lineWidth = waveConfig.thickness;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < totalPoints; i++) {
        const val = dataArray[i] || 0;
        const amp = (val / 255) * waveConfig.maxHeight * 0.35;
        const angle = (i / 12) * Math.PI;
        const baseRadius = (i / totalPoints) * maxRadius;
        const currentRadius = baseRadius + amp;
        
        const x = centerX + Math.cos(angle) * currentRadius;
        const y = centerY + Math.sin(angle) * currentRadius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

    } else if (waveConfig.type === 'oscilloscope') {
      const barSpanWidth = width * 0.95;
      const totalPoints = Math.min(dataArray.length, 120);
      const step = barSpanWidth / (totalPoints - 1);
      const startX = (width - barSpanWidth) / 2;
      
      ctx.save();
      ctx.strokeStyle = waveConfig.color;
      ctx.lineWidth = waveConfig.thickness + 0.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      
      for (let i = 0; i < totalPoints; i++) {
        const val = dataArray[i] || 0;
        const offset = (val / 255) * waveConfig.maxHeight * 0.75 * Math.sin(i * 0.28);
        const px = startX + i * step;
        const py = waveY + offset;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.restore();

    } else if (waveConfig.type === 'retro_blocks') {
      const barSpanWidth = width * 0.85;
      const totalBars = Math.min(dataArray.length, 42);
      const gap = 3;
      const barWidth = (barSpanWidth / totalBars) - gap;
      const startX = (width - barSpanWidth) / 2;
      const blockHeight = 6;
      const blockGap = 2;
      
      ctx.save();
      ctx.fillStyle = waveConfig.color;
      
      for (let i = 0; i < totalBars; i++) {
        const dataIndex = i < totalBars / 2 
          ? Math.round((i / (totalBars / 2)) * (dataArray.length * 0.5))
          : Math.round(((totalBars - i) / (totalBars / 2)) * (dataArray.length * 0.5));
           
        const val = dataArray[dataIndex] || 0;
        const barHeight = (val / 255) * waveConfig.maxHeight;
        const numBlocks = Math.max(1, Math.floor(barHeight / (blockHeight + blockGap)));
        const currentX = startX + i * (barWidth + gap);
        
        for (let b = 0; b < numBlocks; b++) {
          const blockY = waveY - b * (blockHeight + blockGap) - blockHeight / 2;
          ctx.fillRect(currentX, blockY, barWidth, blockHeight);
          
          const blockBottomY = waveY + b * (blockHeight + blockGap) - blockHeight / 2;
          ctx.fillRect(currentX, blockBottomY, barWidth, blockHeight);
        }
      }
      ctx.restore();

    } else if (waveConfig.type === 'bars') {
      const barSpanWidth = width * 0.85;
      const totalBars = Math.min(dataArray.length, 72);
      const barWidth = (barSpanWidth / totalBars) - waveConfig.gap;
      const startX = (width - barSpanWidth) / 2 + waveConfig.gap / 2;

      ctx.save();

      for (let i = 0; i < totalBars; i++) {
        const dataIndex = i < totalBars / 2 
          ? Math.round((i / (totalBars / 2)) * (dataArray.length * 0.6))
          : Math.round(((totalBars - i) / (totalBars / 2)) * (dataArray.length * 0.6));

        const val = dataArray[dataIndex] || 0;
        const barHeight = Math.max((val / 255) * waveConfig.maxHeight, 6);
        const currentBarX = startX + i * (barWidth + waveConfig.gap);

        ctx.fillStyle = waveConfig.color;
        ctx.beginPath();
        const rY = waveY - barHeight / 2;
        
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(currentBarX, rY, barWidth, barHeight, barWidth / 2);
          ctx.fill();
        } else {
          ctx.fillRect(currentBarX, rY, barWidth, barHeight);
        }
      }
      ctx.restore();

    } else if (waveConfig.type === 'line') {
      const barSpanWidth = width * 0.9;
      const totalPoints = Math.min(dataArray.length, 64);
      const step = barSpanWidth / (totalPoints - 1);
      const startX = (width - barSpanWidth) / 2;

      ctx.save();

      ctx.beginPath();
      ctx.lineWidth = waveConfig.thickness;
      ctx.strokeStyle = waveConfig.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < totalPoints; i++) {
        const dataIndex = i < totalPoints / 2 
          ? Math.floor((i / (totalPoints / 2)) * (dataArray.length * 0.5))
          : Math.floor(((totalPoints - i) / (totalPoints / 2)) * (dataArray.length * 0.5));

        const val = dataArray[dataIndex] || 0;
        const waveAmp = (val / 255) * waveConfig.maxHeight * 0.65;
        const ptX = startX + i * step;
        
        const ptY = waveY + (i % 2 === 0 ? waveAmp : -waveAmp);

        if (i === 0) {
          ctx.moveTo(ptX, waveY);
        } else {
          const prevX = startX + (i - 1) * step;
          const prevVal = dataArray[i - 1 < totalPoints / 2 ? i - 1 : totalPoints - (i - 1)] || 0;
          const prevAmp = (prevVal / 255) * waveConfig.maxHeight * 0.65;
          const prevY = waveY + ((i - 1) % 2 === 0 ? prevAmp : -prevAmp);
          
          const midX = (prevX + ptX) / 2;
          const midY = (prevY + ptY) / 2;
          ctx.quadraticCurveTo(prevX, prevY, midX, midY);
        }
      }
      ctx.lineTo(startX + barSpanWidth, waveY);
      ctx.stroke();
      ctx.restore();

    } else if (waveConfig.type === 'dots') {
      const barSpanWidth = width * 0.85;
      const totalDots = Math.min(dataArray.length, 48);
      const step = barSpanWidth / (totalDots - 1);
      const startX = (width - barSpanWidth) / 2;

      ctx.save();

      ctx.fillStyle = waveConfig.color;
      for (let i = 0; i < totalDots; i++) {
        const dataIndex = i < totalDots / 2 
          ? Math.floor((i / (totalDots / 2)) * (dataArray.length * 0.4))
          : Math.floor(((totalDots - i) / (totalDots / 2)) * (dataArray.length * 0.4));

        const val = dataArray[dataIndex] || 0;
        const barHeight = (val / 255) * waveConfig.maxHeight * 0.5;
        const ptX = startX + i * step;

        ctx.beginPath();
        ctx.arc(ptX, waveY - barHeight, waveConfig.thickness, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ptX, waveY + barHeight, waveConfig.thickness, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.strokeStyle = `${waveConfig.color}40`;
        ctx.lineWidth = 1;
        ctx.moveTo(ptX, waveY - barHeight);
        ctx.lineTo(ptX, waveY + barHeight);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Draw Central Circular Logo
    if (logoConfig.show && logoImage) {
      const size = logoConfig.size;
      const lX = waveXCenter - size / 2;
      const lY = waveY - size / 2;

      ctx.save();
      
      if (logoConfig.borderWidth > 0) {
        ctx.beginPath();
        ctx.arc(waveXCenter, waveY, (size / 2) + logoConfig.borderWidth / 2, 0, Math.PI * 2);
        ctx.lineWidth = logoConfig.borderWidth;
        ctx.strokeStyle = logoConfig.borderColor;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(waveXCenter, waveY, size / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(logoImage, lX, lY, size, size);
      ctx.restore();
    }

    // 4. Draw Overlay Custom Text
    if (textConfig.content.trim() !== '') {
      const textY = (textConfig.yPosition / 100) * height;

      ctx.save();
      ctx.font = `${textConfig.fontSize}px "${textConfig.fontFamily}", system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = textConfig.content.split('\n');
      const lineHeight = textConfig.fontSize * (textConfig.lineHeight !== undefined ? textConfig.lineHeight : 1.35);
      const totalTextHeight = lines.length * lineHeight;

      // Draw background rectangular badge card with custom width & height stretch padding
      if (textConfig.showBg) {
        let maxW = 0;
        lines.forEach(line => {
          const metrics = ctx.measureText(line);
          if (metrics.width > maxW) maxW = metrics.width;
        });

        const padX = textConfig.paddingX !== undefined ? textConfig.paddingX : textConfig.padding;
        const padY = textConfig.paddingY !== undefined ? textConfig.paddingY : textConfig.padding;
        
        const bgW = maxW + padX * 2;
        const bgH = totalTextHeight + padY * 2;
        const bgX = waveXCenter - bgW / 2;
        const bgY = textY - bgH / 2;

        ctx.save();
        ctx.globalAlpha = textConfig.bgOpacity;
        ctx.fillStyle = textConfig.bgColor;
        
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, 12);
          ctx.fill();
        } else {
          ctx.fillRect(bgX, bgY, bgW, bgH);
        }
        ctx.restore();
      }

      // Draw text text line by line
      ctx.fillStyle = textConfig.color;
      let startDrawY = textY - (totalTextHeight / 2) + (lineHeight / 2);
      
      lines.forEach((line, index) => {
        ctx.fillText(line, waveXCenter, startDrawY + index * lineHeight);
      });

      ctx.restore();
    }

    // 5. Draw Social Networks at the bottom
    if (socialConfig && socialConfig.show) {
      const activePlatforms: { type: 'facebook' | 'youtube' | 'tiktok'; username: string }[] = [];
      if (socialConfig.facebook && socialConfig.facebook.trim() !== '') {
        activePlatforms.push({ type: 'facebook', username: socialConfig.facebook.trim() });
      }
      if (socialConfig.youtube && socialConfig.youtube.trim() !== '') {
        activePlatforms.push({ type: 'youtube', username: socialConfig.youtube.trim() });
      }
      if (socialConfig.tiktok && socialConfig.tiktok.trim() !== '') {
        activePlatforms.push({ type: 'tiktok', username: socialConfig.tiktok.trim() });
      }

      if (activePlatforms.length > 0) {
        ctx.save();
        
        const fSize = socialConfig.fontSize;
        ctx.font = `600 ${fSize}px "Inter", system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = 'middle';
        
        const iconSize = Math.round(fSize * 1.3);
        const gapIconText = 8;
        const gapBetweenItems = 28;
        
        // Measure each item width
        const itemWidths = activePlatforms.map(platform => {
          const textWidth = ctx.measureText(platform.username).width;
          return iconSize + gapIconText + textWidth;
        });
        
        const totalItemsWidth = itemWidths.reduce((acc, w) => acc + w, 0) + (activePlatforms.length - 1) * gapBetweenItems;
        
        // Social section Y position
        const socialY = (socialConfig.yPosition / 100) * height;
        
        // Social X position based on alignment
        let startX = 0;
        if (socialConfig.alignment === 'left') {
          startX = 60; // Left margin
        } else if (socialConfig.alignment === 'right') {
          startX = width - 60 - totalItemsWidth; // Right margin
        } else {
          startX = width / 2 - totalItemsWidth / 2; // Centered
        }

        // Optional Background Plate Badge behind social media row (highly professional)
        if (socialConfig.showBg) {
          const padX = 18;
          const padY = 10;
          const bgW = totalItemsWidth + padX * 2;
          const bgH = Math.max(iconSize, fSize) + padY * 2;
          const bgX = startX - padX;
          const bgY = socialY - bgH / 2;

          ctx.save();
          ctx.globalAlpha = socialConfig.bgOpacity;
          ctx.fillStyle = socialConfig.bgColor;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, bgW, bgH, 10);
            ctx.fill();
          } else {
            ctx.fillRect(bgX, bgY, bgW, bgH);
          }
          ctx.restore();
        }

        // Draw each social item
        let currentX = startX;
        activePlatforms.forEach((platform, idx) => {
          // Draw icon
          const iconY = socialY - iconSize / 2;
          if (platform.type === 'facebook') {
            drawFacebookIcon(ctx, currentX, iconY, iconSize);
          } else if (platform.type === 'youtube') {
            drawYoutubeIcon(ctx, currentX, iconY, iconSize);
          } else if (platform.type === 'tiktok') {
            drawTiktokIcon(ctx, currentX, iconY, iconSize);
          }

          // Draw username text next to icon
          ctx.fillStyle = socialConfig.color;
          ctx.textAlign = 'left';
          ctx.fillText(platform.username, currentX + iconSize + gapIconText, socialY);

          currentX += itemWidths[idx] + gapBetweenItems;
        });

        ctx.restore();
      }
    }
  };

  // Main drawing controller effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    
    let animationId: number;
    let ambientPhase = 0;

    const renderLoop = () => {
      if (isPlaying && analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        ambientPhase += 0.05;
        for (let i = 0; i < bufferLength; i++) {
          const sineSeed = Math.sin(i * 0.12 - ambientPhase) * Math.cos(i * 0.05 + ambientPhase * 0.5);
          const scaledSine = Math.max(0, (sineSeed + 1.0) / 2.0);
          
          let amplitude = 22;
          if (i > 10 && i < 30) {
            amplitude = 48;
          } else if (i >= 30 && i < 60) {
            amplitude = 35;
          }
          dataArray[i] = scaledSine * amplitude + 3;
        }
      }

      drawFrame(ctx, dataArray);
      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    waveConfig,
    logoConfig,
    textConfig,
    socialConfig,
    aspectRatio,
    bgImage,
    bgVideo,
    logoImage,
    isPlaying,
    analyserNode,
    width,
    height
  ]);

  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return '0:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div id="canvas-container" className="flex flex-col items-center justify-center w-full p-2 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden shrink-0">
      
      {/* Header section of the preview */}
      <div className="flex items-center justify-between w-full mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse animate-duration-1000"></div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Vista Previa</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <span className="text-cyan-400">{width}x{height} px</span>
          <span className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]">{aspectRatio}</span>
        </div>
      </div>

      {/* Canvas Element with dynamic responsiveness in size */}
      <div className="relative w-full flex items-center justify-center h-[280px] bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner group shrink-0">
        <canvas
          id="video-render-canvas"
          ref={canvasRef}
          width={width}
          height={height}
          className={`max-w-full max-h-[260px] object-contain transition-all duration-300 ${
            isSavingMode && isExporting
              ? 'absolute pointer-events-none opacity-[0.001] left-1/2 -translate-x-1/2 top-4 scale-50'
              : aspectRatio === '16:9' ? 'aspect-video w-full' :
                aspectRatio === '9:16' ? 'aspect-[9/16] h-full shadow-2xl' :
                'aspect-square'
          }`}
        />
        
        {isSavingMode && isExporting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center select-none animate-fade-in z-10">
            <div className="relative mb-3 flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-emerald-550/10 rounded-full animate-ping animate-duration-[1500ms]"></div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-widest">Modo Ahorro Activo</span>
            <p className="text-[9px] text-slate-500 max-w-xs mt-1 leading-relaxed">
              La vista previa en pantalla se ha desactivado. El video se está compilando con un consumo mínimo de CPU y batería.
            </p>
          </div>
        )}
        
        {!isSavingMode && !audioFile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 p-4 text-center select-none">
            <p className="text-[11px] font-medium text-slate-300 max-w-sm mb-1">
              Sube un audio para empezar la simulación reactiva.
            </p>
            <p className="text-[9px] text-slate-500 max-w-xs">
              Moviéndose en modo demo interactivo local.
            </p>
          </div>
        )}
      </div>

      {/* Audio progress bar and controllers */}
      <div className="w-full mt-2 bg-slate-950/40 border border-slate-850 p-2 rounded-xl flex items-center gap-3 shrink-0">
        <button
          onClick={onPlayToggle}
          disabled={!audioFile}
          className={`p-2 rounded-full flex items-center justify-center transition-all shrink-0 ${
            !audioFile 
              ? 'bg-slate-800 text-slate-650 cursor-not-allowed' 
              : isPlaying 
                ? 'bg-sky-500 hover:bg-sky-600 text-slate-950 shadow-md shadow-sky-500/10' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md shadow-emerald-500/10'
          }`}
          id="toggle-preview-playback"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="flex-grow flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="truncate pr-2 font-medium">{audioFile ? audioFile.name : 'Ejemplo_Sin_Audio.mp3'}</span>
            <span className="text-cyan-400 shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="relative w-full h-1 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
               onClick={(e) => {
                 if (!audioElement || !duration) return;
                 const rect = e.currentTarget.getBoundingClientRect();
                 const pct = (e.clientX - rect.left) / rect.width;
                 audioElement.currentTime = pct * duration;
               }}>
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
