import React, { useState } from 'react';
import { KNOWLEDGE_GRAPH } from '../constants';
import { KnowledgeNode, Question } from '../types';

interface KnowledgeSidebarProps {
  question: Question;
}

const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({ question }) => {
  const [difficulty, setDifficulty] = useState<string>(question.difficulty);

  const renderNode = (node: KnowledgeNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 cursor-pointer text-slate-700 font-medium`}
        >
          {isFolder ? (
            <span className="material-symbols-outlined text-slate-400 text-[20px]">
              {hasChildren ? 'arrow_drop_down' : 'arrow_right'}
            </span>
          ) : (
            <div className="w-5" />
          )}

          {node.icon && (
            <span className="material-symbols-outlined text-purple-500 text-[18px]">
              {node.icon}
            </span>
          )}

          {!isFolder && (
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={node.aiMatch}
                onChange={() => {}}
                className="peer size-4 appearance-none rounded border border-slate-300 bg-white checked:bg-primary focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
              />
              <span className="material-symbols-outlined absolute text-white text-xs opacity-0 peer-checked:opacity-100 pointer-events-none inset-0 flex items-center justify-center">
                check
              </span>
            </div>
          )}

          <span
            className={`text-sm ${
              !isFolder && node.aiMatch ? 'text-primary font-semibold' : ''
            }`}
          >
            {node.label}
          </span>

          {node.aiMatch && (
            <div className="ml-auto flex items-center gap-1 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
              <span className="material-symbols-outlined text-[10px]">
                auto_awesome
              </span>
              <span className="text-[9px] font-bold uppercase">AI Match</span>
            </div>
          )}
        </div>

        {hasChildren && (
          <div className="ml-2 border-l border-slate-200 pl-2 space-y-1 mt-1">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="p-4 border-b border-border-light bg-white">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800">Knowledge Graph</h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            AI Assisted
          </span>
        </div>
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]">
            search
          </span>
          <input
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
            placeholder="Search topics..."
            type="text"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-slate-50">
        <div className="space-y-1">
          {KNOWLEDGE_GRAPH.map((node) => renderNode(node))}
        </div>
      </div>

      <div className="p-5 border-t border-border-light bg-white space-y-5">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Difficulty Assessment
          </label>
          <div className="flex gap-2">
            {['Easy', 'Medium', 'Hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded border text-xs font-bold transition-all ${
                  difficulty === d
                    ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Year
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer">
                <option>2024</option>
                <option selected>2023</option>
                <option>2022</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Region
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer">
                <option selected>International</option>
                <option>North America</option>
                <option>Europe</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                public
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button className="w-full bg-primary hover:bg-blue-600 text-white font-bold h-11 rounded-lg shadow-lg shadow-blue-500/30 flex items-center justify-between px-6 transition-all transform active:scale-[0.99]">
            <span className="text-sm">Save & Next</span>
            <div className="flex items-center gap-2">
              <kbd className="hidden md:inline-block font-sans font-medium text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded border border-blue-400/50">
                ⌘ S
              </kbd>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </div>
          </button>
          <div className="text-center mt-3">
            <button className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1 mx-auto">
              <span className="material-symbols-outlined text-[14px]">
                flag
              </span>
              Flag for Review
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default KnowledgeSidebar;
