import React from 'react';
import { Question } from '../types';

interface QuestionSidebarProps {
  questions: Question[];
  activeId: string;
  selectedIds: Set<string>;
  onSelectQuestion: (id: string) => void;
  onToggleSelection: (id: string) => void;
  batchMode: boolean;
}

const QuestionSidebar: React.FC<QuestionSidebarProps> = ({
  questions,
  activeId,
  selectedIds,
  onSelectQuestion,
  onToggleSelection,
  batchMode,
}) => {
  return (
    <aside className="w-[320px] flex flex-col border-r border-border-light bg-white shrink-0 z-10 h-full">
      <div className="p-3 border-b border-border-light space-y-2 bg-gray-50/30">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
            placeholder="Search QID or content..."
            type="text"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select className="w-full appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-600 rounded px-2 py-1.5 pr-5 outline-none focus:border-primary cursor-pointer hover:bg-slate-50">
              <option>Subject</option>
              <option>Physics</option>
              <option>Math</option>
            </select>
            <span className="material-symbols-outlined absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">
              arrow_drop_down
            </span>
          </div>
          <div className="relative w-24">
            <select className="w-full appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-600 rounded px-2 py-1.5 pr-5 outline-none focus:border-primary cursor-pointer hover:bg-slate-50">
              <option>Status</option>
              <option>Done</option>
              <option>Pending</option>
            </select>
            <span className="material-symbols-outlined absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">
              arrow_drop_down
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        {questions.map((q) => {
          const isActive = q.id === activeId;
          const isSelected = selectedIds.has(q.id);

          return (
            <div
              key={q.id}
              onClick={() => onSelectQuestion(q.id)}
              className={`group p-3 border-b border-slate-100 flex gap-3 cursor-pointer transition-all ${
                isActive
                  ? 'bg-blue-50/60 border-l-[3px] border-l-primary'
                  : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className="pt-1 flex items-start"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection(q.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="rounded border-gray-300 text-primary focus:ring-primary size-4 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span
                    className={`font-mono text-[10px] tracking-wide ${
                      isActive
                        ? 'text-primary font-bold'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    {q.code}
                  </span>
                  {q.status === 'Completed' && (
                    <span className="material-symbols-outlined text-emerald-500 text-[16px]">
                      check_circle
                    </span>
                  )}
                  {q.status === 'AI Suggested' && (
                    <span className="material-symbols-outlined text-purple-500 text-[16px] animate-pulse">
                      auto_awesome
                    </span>
                  )}
                  {q.status === 'Active' && (
                    <div className="flex items-center gap-1 bg-white px-1.5 rounded-full shadow-sm border border-blue-100">
                      <div className="size-1.5 bg-primary rounded-full"></div>
                      <span className="text-[9px] font-bold text-primary uppercase">
                        Active
                      </span>
                    </div>
                  )}
                  {q.status === 'Pending' && (
                    <span className="material-symbols-outlined text-slate-300 text-[16px]">
                      schedule
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs line-clamp-2 mb-2 ${
                    isActive
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-600 font-medium'
                  }`}
                >
                  {q.title}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide border ${
                      isActive
                        ? 'bg-white text-primary border-primary/20'
                        : 'bg-slate-100 text-slate-500 border-transparent'
                    }`}
                  >
                    {q.tags[0]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-border-light bg-white text-center">
        <button className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary hover:bg-slate-50 py-2 w-full rounded transition-colors flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[14px]">
            {selectedIds.size > 0 ? 'checklist' : 'add'}
          </span>
          {selectedIds.size > 0
            ? `${selectedIds.size} Selected`
            : 'Load More Questions'}
        </button>
      </div>
    </aside>
  );
};

export default QuestionSidebar;
