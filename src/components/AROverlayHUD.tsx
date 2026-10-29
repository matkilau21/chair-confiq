import { useState } from 'react';
import { Smartphone, RefreshCw, X, Hand, Check, Sparkles, Tag } from 'lucide-react';
import { ARPlacementStatus } from '../three/sceneManager';
import { FabricColorKey, FABRIC_OPTIONS } from '../three/chairBuilder';

interface AROverlayHUDProps {
  status: ARPlacementStatus;
  isSimulation: boolean;
  onSpawnClick: () => void;
  onResetPlacement: () => void;
  onExit: () => void;
  fabricKey: FabricColorKey;
  onFabricChange: (key: FabricColorKey) => void;
  showLabels?: boolean;
  onToggleLabels?: () => void;
}

export function AROverlayHUD({
  status,
  isSimulation,
  onSpawnClick,
  onResetPlacement,
  onExit,
  fabricKey,
  onFabricChange,
  showLabels = true,
  onToggleLabels,
}: AROverlayHUDProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Fullscreen touch layer to spawn/reposition chair on any screen tap */}
      <div 
        className="absolute inset-0 pointer-events-auto cursor-pointer"
        onClick={(e) => {
          // If click was not on a button, trigger spawn/reposition
          if ((e.target as HTMLElement).tagName !== 'BUTTON') {
            onSpawnClick();
          }
        }}
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).tagName !== 'BUTTON') {
            onSpawnClick();
          }
        }}
      />

      {/* Top Banner with mode indicator & exit button */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-lg mx-auto">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 border border-white/20 text-white text-xs font-medium backdrop-blur-md shadow-lg">
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isSimulation ? 'AR Floor Tap Preview' : 'AR Mode (iOS & Android)'}</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {onToggleLabels && (
            <button
              onClick={onToggleLabels}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border shadow-lg transition-colors ${
                showLabels
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                  : 'bg-black/75 border-white/20 text-gray-300 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Label</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white text-xs font-medium shadow-lg transition-colors"
            aria-label="Exit AR"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit AR</span>
          </button>
        </div>
      </div>

      {/* Center Guidance Prompt */}
      <div className="flex flex-col items-center justify-center my-auto">
        {status === 'scanning' && (
          <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-black/80 border border-white/20 text-white text-center shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in duration-300">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sky-400">
              <Smartphone className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-xs font-semibold">Scanning for Flat Surface</div>
            <p className="text-[11px] text-gray-300 leading-tight">
              {isSimulation
                ? 'Hover your mouse over the floor to locate a placement spot'
                : 'Point your camera at the floor and move your phone slowly'}
            </p>
          </div>
        )}

        {status === 'ready' && (
          <div 
            onClick={onSpawnClick}
            className="pointer-events-auto cursor-pointer group flex flex-col items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-400/60 text-white text-center shadow-2xl backdrop-blur-md max-w-xs transition-all hover:scale-105 active:scale-95 animate-in zoom-in-95 duration-200"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 border border-emerald-400/80 flex items-center justify-center text-emerald-300 shadow-lg">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                <span>Circle Indicator Ready!</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <p className="text-xs text-emerald-200 font-medium mt-0.5">
                Tap anywhere on screen to spawn chair
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar (when chair is placed or ready) */}
      <div className="relative z-10 pointer-events-auto flex flex-col items-center gap-3 w-full max-w-md mx-auto mb-2">
        {status === 'placed' && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-black/85 border border-white/20 text-white text-[11px] sm:text-xs font-medium backdrop-blur-md shadow-lg max-w-full">
            <div className="flex items-center gap-1.5 min-w-0">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate sm:hidden">Chair Placed • Tap to move</span>
              <span className="hidden sm:inline">Chair Placed! Tap screen to reposition</span>
            </div>
            <button
              onClick={onResetPlacement}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] sm:text-[11px] font-semibold text-gray-200 flex items-center gap-1 shrink-0 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* Quick Fabric Swatches in AR */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/85 border border-white/20 shadow-2xl backdrop-blur-md">
          <span className="text-[11px] text-gray-300 font-medium pl-2 pr-1">Fabric:</span>
          {(Object.keys(FABRIC_OPTIONS) as FabricColorKey[]).map(key => {
            const opt = FABRIC_OPTIONS[key];
            const isSelected = fabricKey === key;
            return (
              <button
                key={key}
                onClick={() => onFabricChange(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-white/25 text-white ring-1 ring-white/60'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-white/40"
                  style={{ backgroundColor: opt.hex }}
                />
                <span className="hidden sm:inline">{opt.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
