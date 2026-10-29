import { X, Ruler, CheckCircle2, Shield, Layers } from 'lucide-react';
import { FabricColorKey, LegMaterialKey, FABRIC_OPTIONS, LEG_OPTIONS } from '../three/chairBuilder';

interface DimensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fabricKey: FabricColorKey;
  legKey: LegMaterialKey;
}

export function DimensionsModal({
  isOpen,
  onClose,
  fabricKey,
  legKey,
}: DimensionsModalProps) {
  if (!isOpen) return null;

  const currentFabric = FABRIC_OPTIONS[fabricKey];
  const currentLeg = LEG_OPTIONS[legKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-[2px]">
      <div 
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#1C1F24] border border-[#2F3540] text-gray-100 shadow-2xl p-4 sm:p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#2C323C] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[#272D36] text-amber-400 shrink-0">
              <Ruler className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="modal-title" className="text-base sm:text-lg font-semibold tracking-tight text-white truncate">
                Technical Specifications
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                Architectural Lounge Chair Model 01
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C323C] transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable on small mobile screens) */}
        <div className="py-4 sm:py-5 space-y-4 sm:space-y-6 text-sm overflow-y-auto flex-1">
          {/* Dimension Grid */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">
              Ergonomic Dimensions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl bg-[#23272F] border border-[#2F3540]">
                <div className="text-xs text-gray-400">Overall Width</div>
                <div className="text-base font-semibold text-white mt-1">78 cm</div>
                <div className="text-[10px] text-gray-500">30.7 in</div>
              </div>
              <div className="p-3 rounded-xl bg-[#23272F] border border-[#2F3540]">
                <div className="text-xs text-gray-400">Depth</div>
                <div className="text-base font-semibold text-white mt-1">82 cm</div>
                <div className="text-[10px] text-gray-500">32.3 in</div>
              </div>
              <div className="p-3 rounded-xl bg-[#23272F] border border-[#2F3540]">
                <div className="text-xs text-gray-400">Back Height</div>
                <div className="text-base font-semibold text-white mt-1">86 cm</div>
                <div className="text-[10px] text-gray-500">33.8 in</div>
              </div>
              <div className="p-3 rounded-xl bg-[#23272F] border border-[#2F3540]">
                <div className="text-xs text-gray-400">Seat Height</div>
                <div className="text-base font-semibold text-white mt-1">42 cm</div>
                <div className="text-[10px] text-gray-500">16.5 in</div>
              </div>
            </div>
          </div>

          {/* Current Selection Craftsmanship */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Selected Configuration Craft
            </h3>
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-[#23272F] border border-[#2F3540] flex items-start gap-3">
                <div 
                  className="w-5 h-5 rounded-md mt-0.5 shrink-0 border border-white/20 shadow-sm"
                  style={{ backgroundColor: currentFabric.hex }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{currentFabric.name} Upholstery</span>
                    <span className="text-xs text-amber-400 font-mono">OEKO-TEX® Standard</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {currentFabric.description}. High-resilience dual-density foam core with 45,000 Martindale rub count.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#23272F] border border-[#2F3540] flex items-start gap-3">
                <div className="p-1 rounded bg-[#2D333E] text-amber-400 mt-0.5 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{currentLeg.name} Leg Assembly</span>
                    <span className="text-xs text-gray-300 font-mono">{currentLeg.finish}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {currentLeg.description}. Outfitted with brass swivel glides and protective floor pads.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#23272F]/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Weight Capacity: 160 kg / 350 lbs</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#23272F]/60">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>10-Year Structural Warranty</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#2C323C] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-900 font-medium text-xs hover:bg-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
