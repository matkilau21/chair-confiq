import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Sun,
  Eye,
  Sliders,
  Glasses,
  Smartphone,
  Download,
  Info,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import {
  FabricColorKey,
  LegMaterialKey,
  FABRIC_OPTIONS,
  LEG_OPTIONS,
} from '../three/chairBuilder';
import { CameraPreset } from '../three/sceneManager';

interface ConfiguratorUIProps {
  fabricKey: FabricColorKey;
  onFabricChange: (key: FabricColorKey) => void;
  legKey: LegMaterialKey;
  onLegChange: (key: LegMaterialKey) => void;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  explodedFactor: number;
  onExplodedChange: (factor: number) => void;
  isBrightLighting: boolean;
  onToggleLighting: () => void;
  onTakeScreenshot: () => void;
  onLaunchAR: () => void;
  onLaunchVR: () => void;
  onOpenSpecs: () => void;
  onOpenXRGuide: () => void;
  onStartSimulation: () => void;
}

export function ConfiguratorUI({
  fabricKey,
  onFabricChange,
  legKey,
  onLegChange,
  cameraPreset,
  onCameraPresetChange,
  autoRotate,
  onToggleAutoRotate,
  explodedFactor,
  onExplodedChange,
  isBrightLighting,
  onToggleLighting,
  onTakeScreenshot,
  onLaunchAR,
  onLaunchVR,
  onOpenSpecs,
  onOpenXRGuide,
  onStartSimulation,
}: ConfiguratorUIProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'camera' | 'inspect'>('materials');

  // Dynamic pricing based on selections
  const basePrice = 1290;
  const legSurcharge = legKey === 'wood' ? 140 : 190;
  const totalPrice = basePrice + legSurcharge;

  const currentFabric = FABRIC_OPTIONS[fabricKey];
  const currentLeg = LEG_OPTIONS[legKey];

  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="pointer-events-auto flex items-center justify-between w-full max-w-5xl mx-auto z-10">
        <div className="flex items-center gap-3 bg-[#181B20]/90 border border-[#2B313C] rounded-2xl px-4 py-2.5 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-white">
                Oslo Lounge Chair
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2B313C] text-gray-300">
                Series 01
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
              <span>{currentFabric.name}</span>
              <span>•</span>
              <span>{currentLeg.name} Legs</span>
              <span>•</span>
              <span className="text-white font-medium">${totalPrice} USD</span>
            </div>
          </div>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2 bg-[#181B20]/90 border border-[#2B313C] rounded-2xl p-1.5 shadow-lg">
          <button
            onClick={onOpenSpecs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-[#262B35] transition-colors"
            title="View technical dimensions & specifications"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Specs</span>
          </button>

          <button
            onClick={onTakeScreenshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-[#262B35] transition-colors"
            title="Download high-resolution image"
          >
            <Download className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">Snapshot</span>
          </button>

          <div className="h-4 w-[1px] bg-[#2E3440] mx-0.5" />

          {/* WebXR Triggers */}
          <button
            onClick={onLaunchAR}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            title="View in your room with WebXR AR"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>AR Mode</span>
          </button>

          <button
            onClick={onLaunchVR}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-[#262B35] transition-colors"
            title="Enter WebXR VR Studio"
          >
            <Glasses className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">VR</span>
          </button>
        </div>
      </header>

      {/* Center 3D Viewport is completely clear and unobstructed */}
      <div className="flex-1" />

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="pointer-events-auto w-full max-w-3xl mx-auto z-20 flex flex-col items-center">
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#181B20]/90 border border-[#2B313C] text-xs font-medium text-gray-300 hover:text-white hover:bg-[#222731] transition-all shadow-md"
          aria-label={isCollapsed ? 'Show controls' : 'Hide controls'}
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Configurator Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Dock (Cinema Mode)</span>
            </>
          )}
        </button>

        {/* Main Dock Container */}
        <nav 
          aria-label="3D Chair Configurator Controls"
          className={`w-full bg-[#181B20]/95 border border-[#2B313C] rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
            isCollapsed ? 'translate-y-full opacity-0 pointer-events-none h-0 p-0 border-0' : 'translate-y-0 opacity-100 p-4'
          }`}
        >
          {/* Tab Navigation & Auxiliary Toggles */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262C36]">
            <div className="flex items-center gap-1 bg-[#121418] p-1 rounded-xl border border-[#232832]">
              <button
                onClick={() => setActiveTab('materials')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'materials'
                    ? 'bg-[#2A303C] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Materials & Finishes
              </button>
              <button
                onClick={() => setActiveTab('camera')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'camera'
                    ? 'bg-[#2A303C] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Camera Angles
              </button>
              <button
                onClick={() => setActiveTab('inspect')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'inspect'
                    ? 'bg-[#2A303C] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Inspect & Craft
              </button>
            </div>

            {/* Quick View Controls */}
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              <button
                onClick={onToggleAutoRotate}
                className={`p-1.5 rounded-lg border transition-colors ${
                  autoRotate
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-[#1C2027] border-[#2B313C] text-gray-400 hover:text-white'
                }`}
                title="Toggle 360° turntable auto-rotation"
                aria-label="Toggle auto rotation"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={onToggleLighting}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isBrightLighting
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                    : 'bg-[#1C2027] border-[#2B313C] text-gray-400 hover:text-white'
                }`}
                title="Toggle lighting mood (Warm Studio / Crisp Daylight)"
                aria-label="Toggle lighting"
              >
                <Sun className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB 1: MATERIALS & FINISHES (Primary prompt requirement) */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              {/* 1. Fabric Color Buttons (3 Colors) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-gray-200 tracking-wide">
                    Fabric Color (3 Choices)
                  </span>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {currentFabric.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(Object.keys(FABRIC_OPTIONS) as FabricColorKey[]).map(key => {
                    const opt = FABRIC_OPTIONS[key];
                    const isSelected = fabricKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => onFabricChange(key)}
                        className={`group relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#222732] border-white/60 shadow-md ring-1 ring-white/20'
                            : 'bg-[#1A1D23] border-[#292F3A] hover:bg-[#20242C] hover:border-gray-600'
                        }`}
                      >
                        {/* Color swatch circle with micro weave texture */}
                        <div
                          className="w-7 h-7 rounded-full shrink-0 border border-white/25 shadow-inner transition-transform group-hover:scale-105"
                          style={{ backgroundColor: opt.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {opt.name}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {key === 'terracotta' && 'Warm Terracotta'}
                            {key === 'sage' && 'Scandinavian Sage'}
                            {key === 'slate' && 'Midnight Indigo'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Leg Material Switcher (Wood vs Metal) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-gray-200 tracking-wide">
                    Leg Base Material
                  </span>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {currentLeg.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {(Object.keys(LEG_OPTIONS) as LegMaterialKey[]).map(key => {
                    const opt = LEG_OPTIONS[key];
                    const isSelected = legKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => onLegChange(key)}
                        className={`group flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#222732] border-white/60 shadow-md ring-1 ring-white/20'
                            : 'bg-[#1A1D23] border-[#292F3A] hover:bg-[#20242C] hover:border-gray-600'
                        }`}
                      >
                        {/* Material Swatch Indicator */}
                        <div
                          className={`w-7 h-7 rounded-lg shrink-0 border flex items-center justify-center text-[10px] font-bold ${
                            key === 'wood'
                              ? 'bg-gradient-to-br from-[#724832] to-[#452A1C] border-[#8A5B42] text-amber-200'
                              : 'bg-gradient-to-br from-[#383E48] to-[#1E2229] border-[#4E5664] text-gray-300'
                          }`}
                        >
                          {key === 'wood' ? 'WD' : 'MT'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {opt.name}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {key === 'wood' ? 'Solid Natural Walnut' : 'Brushed Anodized Metal'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAMERA VIEW PRESETS */}
          {activeTab === 'camera' && (
            <div>
              <div className="text-xs font-semibold text-gray-200 mb-2">
                Studio Camera Presets
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'studio', label: '3/4 Studio', desc: 'Perspective' },
                  { id: 'front', label: 'Front', desc: 'Elevation' },
                  { id: 'side', label: 'Profile', desc: 'Side View' },
                  { id: 'top', label: 'Top-Down', desc: 'Plan View' },
                  { id: 'detail', label: 'Fabric Macro', desc: 'Close-Up' },
                ].map(view => {
                  const isSelected = cameraPreset === view.id;
                  return (
                    <button
                      key={view.id}
                      onClick={() => onCameraPresetChange(view.id as CameraPreset)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-[#252C38] border-white/60 text-white shadow-sm'
                          : 'bg-[#1A1D23] border-[#292F3A] text-gray-400 hover:text-gray-200 hover:bg-[#20242C]'
                      }`}
                    >
                      <div className="text-xs font-medium">{view.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{view.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CRAFT & EXPLODED VIEW */}
          {activeTab === 'inspect' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-200">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Exploded Assembly Inspection</span>
                  </div>
                  <span className="font-mono text-gray-400">
                    {Math.round(explodedFactor * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2">
                  Separate the cushions, molded composite shell, and leg architecture to inspect the engineering joinery.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400">Assembled</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={explodedFactor}
                    onChange={e => onExplodedChange(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 h-1.5 bg-[#2A313C] rounded-lg cursor-pointer"
                    aria-label="Exploded view separation slider"
                  />
                  <span className="text-[11px] text-gray-400">Exploded</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#262C36] text-xs">
                <button
                  onClick={onStartSimulation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-medium transition-colors"
                  title="Simulate scanning a flat surface with circle indicator and click-to-spawn"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Preview AR Tap-to-Spawn</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onOpenXRGuide}
                    className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium"
                  >
                    <Glasses className="w-3.5 h-3.5" />
                    <span>WebXR Setup & QR</span>
                  </button>
                  <button
                    onClick={onOpenSpecs}
                    className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Specs</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
