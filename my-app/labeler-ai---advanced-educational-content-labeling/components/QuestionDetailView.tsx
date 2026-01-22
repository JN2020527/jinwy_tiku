
import React from 'react';
import { Question } from '../types';

interface QuestionDetailViewProps {
  question: Question;
}

const QuestionDetailView: React.FC<QuestionDetailViewProps> = ({ question }) => {
  return (
    <div className="max-w-3xl mx-auto w-full p-6 pb-32">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#111418] flex items-center gap-2">
            Question 5 
            <span className="text-xs font-normal text-gray-400 px-2 py-0.5 border border-gray-200 rounded-md">Original</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors">
            <span className="material-symbols-outlined text-lg">flag</span>
          </button>
          <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors">
            <span className="material-symbols-outlined text-lg">edit_note</span>
          </button>
        </div>
      </div>

      <div className="prose max-w-none mb-8 text-base leading-relaxed text-slate-800">
        <p>
          A particle moves along the x-axis according to the equation 
          <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 math-tex text-primary font-serif mx-1">
            {question.equation}
          </span>, 
          where <span className="math-tex font-serif">x</span> is in meters and <span className="math-tex font-serif">t</span> is in seconds.
        </p>
        <p className="mt-4 font-medium">
          Determine the instantaneous velocity at <span className="math-tex font-serif">t = 3s</span>.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex justify-center items-center mb-8">
        <div className="relative w-full max-w-sm aspect-[16/9] rounded-lg overflow-hidden shadow-sm bg-white flex items-center justify-center border border-slate-100">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="text-primary opacity-90" fill="none" height="100%" viewBox="0 0 400 225" width="100%" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 200 H350" stroke="currentColor" strokeWidth="2"></path>
              <path d="M50 200 V25" stroke="currentColor" strokeWidth="2"></path>
              <path d="M50 150 Q200 220 350 50" fill="none" stroke="#137fec" strokeWidth="3"></path>
              <text fill="currentColor" fontFamily="serif" fontSize="14" x="360" y="205">t(s)</text>
              <text fill="currentColor" fontFamily="serif" fontSize="14" x="40" y="20">x(m)</text>
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <details className="group bg-white rounded-lg border border-slate-200 overflow-hidden transition-all duration-200 open:shadow-md">
          <summary className="flex items-center justify-between p-3 px-4 cursor-pointer select-none font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">key</span>
              Show Answer Key
            </div>
            <span className="material-symbols-outlined text-slate-400 transition-transform duration-200 group-open:rotate-180">expand_more</span>
          </summary>
          <div className="p-4 pt-2 border-t border-slate-100 text-slate-600 bg-slate-50/50">
            <p className="font-bold text-lg text-emerald-600 font-serif">7 m/s</p>
          </div>
        </details>

        <details className="group bg-white rounded-lg border border-slate-200 overflow-hidden transition-all duration-200 open:shadow-md" open>
          <summary className="flex items-center justify-between p-3 px-4 cursor-pointer select-none font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
              Detailed Analysis
            </div>
            <span className="material-symbols-outlined text-slate-400 transition-transform duration-200 group-open:rotate-180">expand_more</span>
          </summary>
          <div className="p-4 border-t border-slate-100 text-slate-600 leading-relaxed bg-slate-50/50">
            <p className="mb-2 text-sm">The velocity is the time derivative of position:</p>
            <div className="font-serif italic text-base bg-white border border-slate-100 p-3 rounded mb-2 text-center text-slate-800 shadow-sm">
              {question.analysis.formula}
            </div>
            <p className="mt-3 text-sm">At t = 3s:</p>
            <div className="font-serif italic text-base bg-white border border-slate-100 p-3 rounded text-center text-slate-800 shadow-sm">
              v(3) = 4(3) - 5 = 12 - 5 = {question.analysis.result}
            </div>
          </div>
        </details>
      </div>

      {/* Navigation Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border-light p-3 px-6 flex justify-between items-center z-10">
        <button className="px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Prev
        </button>
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-slate-300"></span>
          <span className="size-1.5 rounded-full bg-primary"></span>
          <span className="size-1.5 rounded-full bg-slate-300"></span>
        </div>
        <button className="px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
          Next
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default QuestionDetailView;
