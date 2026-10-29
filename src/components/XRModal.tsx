import { X, Smartphone, Glasses, ExternalLink, HelpCircle, AlertCircle } from 'lucide-react';

interface XRModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string | null;
  onRetryAR?: () => void;
  onRetryVR?: () => void;
  appUrl: string;
}

export function XRModal({
  isOpen,
  onClose,
  errorMessage,
  onRetryAR,
  onRetryVR,
  appUrl,
}: XRModalProps) {
  if (!isOpen) return null;

  // Use current window location as URL fallback
  const shareUrl = appUrl || window.location.href;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-[#1C1F24] border border-[#2F3540] text-gray-100 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="xr-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2C323C]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#272D36] text-sky-400">
              <Glasses className="w-5 h-5" />
            </div>
            <div>
              <h2 id="xr-modal-title" className="text-lg font-semibold tracking-tight text-white">
                WebXR Spatial Experience
              </h2>
              <p className="text-xs text-gray-400">
                Augmented Reality & Virtual Reality Showroom
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C323C] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-5 text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <p className="font-medium text-amber-300">WebXR Device Check</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Device Options Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#23272F] border border-[#2F3540] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-medium mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>AR in Your Room</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Project the chair onto your actual floor at true 1:1 scale using ARCore or WebXR.
                </p>
              </div>
              {onRetryAR && (
                <button
                  onClick={onRetryAR}
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                >
                  Launch AR Session
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#23272F] border border-[#2F3540] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-medium mb-1">
                  <Glasses className="w-4 h-4 text-sky-400" />
                  <span>VR Headset Studio</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Step into the 3D studio on Meta Quest, Pico, or Vision Pro to inspect textures up close.
                </p>
              </div>
              {onRetryVR && (
                <button
                  onClick={onRetryVR}
                  className="mt-3 w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
                >
                  Enter VR Studio
                </button>
              )}
            </div>
          </div>

          {/* QR Code for Mobile scanning */}
          <div className="p-4 rounded-xl bg-[#23272F] border border-[#2F3540] flex items-center gap-4">
            <div className="w-24 h-24 bg-white rounded-lg p-1.5 shrink-0 flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="Scan to open on mobile"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-white">Scan with Mobile Phone</div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Open on Chrome for Android or WebXR-enabled mobile browser to see the chair right in your living room.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                >
                  <span>Open URL in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Requirements note */}
          <div className="flex items-start gap-2 text-[11px] text-gray-400">
            <HelpCircle className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
            <span>
              Supported devices: Android Chrome (ARCore), Meta Quest 2/3/Pro browser, Apple Vision Pro (Safari WebXR enabled), or WebXR API Emulator on desktop Chrome.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#2C323C] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-900 font-medium text-xs hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
