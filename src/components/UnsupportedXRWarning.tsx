import React, { useState } from 'react';
import {
  AlertTriangle,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  X,
  Play,
  Share2,
} from 'lucide-react';
import { WebXRSupportInfo } from '../three/sceneManager';

interface UnsupportedXRWarningProps {
  isOpen: boolean;
  onClose: () => void;
  supportInfo: WebXRSupportInfo;
  onRecheck: () => Promise<void>;
  onStartSimulation?: () => void;
  onOpenQRGuide?: () => void;
}

export function UnsupportedXRWarning({
  isOpen,
  onClose,
  supportInfo,
  onRecheck,
  onStartSimulation,
  onOpenQRGuide,
}: UnsupportedXRWarningProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleRecheck = async () => {
    setIsChecking(true);
    try {
      await onRecheck();
    } finally {
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="webxr-unsupported-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#181B20] border-2 border-amber-500/70 text-gray-100 shadow-2xl p-4 sm:p-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Close X Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C323C] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Badge & Header */}
        <div className="flex items-start gap-3.5 pb-4 border-b border-[#2C323C] pr-8">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
              AR Mode Notice
            </div>
            <h2
              id="webxr-unsupported-title"
              className="text-lg sm:text-xl font-bold tracking-tight text-white"
            >
              Device Does Not Support WebXR
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
              This browser or device does not support WebXR Augmented Reality (`immersive-ar`).
              The 3D chair cannot be projected in AR on this device.
            </p>
          </div>
        </div>

        {/* Diagnostics & Guidance */}
        <div className="py-3.5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* Diagnostic Info Card */}
          <div className="p-3 rounded-xl bg-[#20252D] border border-[#2F3642] space-y-2">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Compatibility Diagnostics
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#15181E] border border-[#282E39]">
                <span className="text-gray-400">WebXR API (`navigator.xr`):</span>
                {supportInfo.hasXRAPI ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400 font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Missing
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#15181E] border border-[#282E39]">
                <span className="text-gray-400">AR Session Support:</span>
                {supportInfo.isARSupported ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400 font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Unsupported
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#15181E] border border-[#282E39]">
                <span className="text-gray-400">Secure Context (HTTPS):</span>
                {supportInfo.isSecureContext ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> Insecure
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#15181E] border border-[#282E39]">
                <span className="text-gray-400">AR Status:</span>
                <span className="flex items-center gap-1 text-amber-300 font-semibold">
                  Unavailable on this device
                </span>
              </div>
            </div>

            {supportInfo.reason && (
              <p className="text-[11px] text-amber-300/90 pt-1 border-t border-[#2F3642]">
                <span className="font-semibold">Reason:</span> {supportInfo.reason}
              </p>
            )}
          </div>

          {/* Quick Mobile Scan QR */}
          <div className="p-3.5 rounded-xl bg-[#1C2027] border border-[#2C3340] flex flex-col sm:flex-row items-center gap-3.5">
            <div className="bg-white p-1.5 rounded-lg shrink-0 shadow">
              <img
                src={qrCodeUrl}
                alt="QR Code to open in WebXR compatible device"
                className="w-20 h-20 block"
              />
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-200 font-semibold text-xs">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Open on an AR-ready Phone</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Scan with your Android phone (Google Chrome with ARCore) or an XR headset (Meta Quest / Vision Pro) to experience true AR surface tracking.
              </p>
              <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#272D36] hover:bg-[#323945] text-gray-200 text-[11px] font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-gray-400" />
                      <span>Copy App Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleRecheck}
                  disabled={isChecking}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#272D36] hover:bg-[#323945] text-gray-300 text-[11px] font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-sky-400' : ''}`} />
                  <span>Re-check</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#2C323C] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {onStartSimulation && (
            <button
              onClick={() => {
                onClose();
                onStartSimulation();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#262B35] hover:bg-[#303743] text-sky-300 border border-sky-500/30 text-xs font-medium transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
              <span>Test Flat Surface Scan in Simulator</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-colors ml-auto"
          >
            <span>Return to 3D Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
