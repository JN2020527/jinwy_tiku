import React, { useState } from 'react';

interface BatchOperationsSidebarProps {
  selectedCount: number;
  onSelectAll: () => void;
}

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      enabled ? 'bg-primary' : 'bg-slate-200'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const BatchOperationsSidebar: React.FC<BatchOperationsSidebarProps> = ({
  selectedCount,
  onSelectAll,
}) => {
  const [activeToggles, setActiveToggles] = useState({
    difficulty: true,
    year: true,
    source: false,
    region: false,
  });

  const toggleField = (field: keyof typeof activeToggles) => {
    setActiveToggles((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <>
      <div className="p-4 border-b border-border-light bg-white flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Batch Operations</h3>
          <p className="text-xs text-slate-500">
            Apply changes to multiple items
          </p>
        </div>
        <button
          onClick={onSelectAll}
          className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          {selectedCount} Selected
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4">
        {/* Difficulty */}
        <div
          className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-opacity ${
            activeToggles.difficulty ? 'opacity-100' : 'opacity-70'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">
                signal_cellular_alt
              </span>
              <span className="font-bold text-sm text-slate-700">
                Difficulty
              </span>
            </div>
            <Toggle
              enabled={activeToggles.difficulty}
              onToggle={() => toggleField('difficulty')}
            />
          </div>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                activeToggles.difficulty
                  ? 'hover:bg-slate-100'
                  : 'cursor-not-allowed'
              } border-slate-200 bg-slate-50 text-slate-500`}
            >
              Easy
            </button>
            <button
              className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                activeToggles.difficulty
                  ? 'hover:bg-slate-100'
                  : 'cursor-not-allowed'
              } border-slate-200 bg-slate-50 text-slate-500`}
            >
              Medium
            </button>
            <button
              className={`flex-1 py-2.5 rounded-lg border text-xs font-bold shadow-md transition-all ${
                activeToggles.difficulty
                  ? 'bg-red-500 text-white border-red-500 ring-2 ring-red-500/30'
                  : 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed'
              }`}
            >
              Hard
            </button>
          </div>
        </div>

        {/* Year */}
        <div
          className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-opacity ${
            activeToggles.year ? 'opacity-100' : 'opacity-70'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">
                calendar_today
              </span>
              <span className="font-bold text-sm text-slate-700">Year</span>
            </div>
            <Toggle
              enabled={activeToggles.year}
              onToggle={() => toggleField('year')}
            />
          </div>
          <div className="relative">
            <select
              disabled={!activeToggles.year}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option selected>2023</option>
              <option>2024</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* Source */}
        <div
          className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-opacity ${
            activeToggles.source ? 'opacity-100' : 'opacity-70'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">
                menu_book
              </span>
              <span className="font-bold text-sm text-slate-700">Source</span>
            </div>
            <Toggle
              enabled={activeToggles.source}
              onToggle={() => toggleField('source')}
            />
          </div>
          <div className="relative">
            <select
              disabled={!activeToggles.source}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2.5 outline-none cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option>Select Source</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* Region */}
        <div
          className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 transition-opacity ${
            activeToggles.region ? 'opacity-100' : 'opacity-70'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">
                public
              </span>
              <span className="font-bold text-sm text-slate-700">Region</span>
            </div>
            <Toggle
              enabled={activeToggles.region}
              onToggle={() => toggleField('region')}
            />
          </div>
          <div className="relative">
            <select
              disabled={!activeToggles.region}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2.5 outline-none cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option selected>International</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
              public
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-border-light bg-white space-y-3">
        <button className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] text-base">
          <span className="material-symbols-outlined">update</span>
          <span>Update {selectedCount} Questions</span>
        </button>
        <p className="text-[10px] text-center text-slate-400">
          This action cannot be undone for bulk operations.
        </p>
      </div>
    </>
  );
};

export default BatchOperationsSidebar;
