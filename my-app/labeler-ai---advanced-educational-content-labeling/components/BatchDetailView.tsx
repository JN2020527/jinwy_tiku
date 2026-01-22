
import React from 'react';

interface BatchDetailViewProps {
  selectedCount: number;
}

const BatchDetailView: React.FC<BatchDetailViewProps> = ({ selectedCount }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
      <div className="size-48 bg-blue-50 rounded-full flex items-center justify-center mb-8 shadow-sm border border-blue-100">
        <span className="material-symbols-outlined text-6xl text-primary/80">layers</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-3">{selectedCount} Questions Selected</h2>
      <p className="text-slate-500 text-lg">Use the right panel to apply batch updates.</p>
      
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border-light p-3 px-6 flex justify-between items-center z-10 pointer-events-none opacity-50 grayscale">
        <button className="px-3 py-1.5 rounded-md text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Prev
        </button>
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-slate-300"></span>
          <span className="size-1.5 rounded-full bg-slate-300"></span>
          <span className="size-1.5 rounded-full bg-slate-300"></span>
        </div>
        <button className="px-3 py-1.5 rounded-md text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          Next
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default BatchDetailView;
