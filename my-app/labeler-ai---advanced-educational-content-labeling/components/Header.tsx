import React from 'react';

interface HeaderProps {
  progress: number;
  total: number;
  batchMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ progress, total, batchMode }) => {
  return (
    <header className="h-14 bg-white border-b border-border-light flex items-center justify-between px-4 shrink-0 z-20 shadow-sm relative">
      <div className="flex items-center gap-3 w-1/4">
        <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">school</span>
        </div>
        <h1 className="font-bold text-lg tracking-tight truncate">
          Labeler
          <span className="text-gray-400 font-normal text-sm ml-2">
            Batch #402 {batchMode && '(Batch Mode)'}
          </span>
        </h1>
      </div>

      <div className="flex flex-col items-center w-1/3 max-w-md">
        <div className="w-full flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          <span>Progress</span>
          <span>
            {progress}/{total}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 w-1/4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
          <span className="material-symbols-outlined text-[16px]">
            cloud_done
          </span>
          Auto-saved
        </div>
        <div className="h-6 w-[1px] bg-border-light mx-1"></div>
        <button className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded-full pr-2 transition-colors">
          <div className="size-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
            JD
          </div>
          <span className="material-symbols-outlined text-gray-400 text-[18px]">
            expand_more
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
