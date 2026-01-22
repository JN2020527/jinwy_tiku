
import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import QuestionSidebar from './components/QuestionSidebar';
import QuestionDetailView from './components/QuestionDetailView';
import KnowledgeSidebar from './components/KnowledgeSidebar';
import BatchDetailView from './components/BatchDetailView';
import BatchOperationsSidebar from './components/BatchOperationsSidebar';
import { MOCK_QUESTIONS } from './constants';
import { ViewMode } from './types';

const App: React.FC = () => {
  const [activeQuestionId, setActiveQuestionId] = useState<string>(MOCK_QUESTIONS[2].id);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const activeQuestion = useMemo(() => 
    MOCK_QUESTIONS.find(q => q.id === activeQuestionId) || MOCK_QUESTIONS[0]
  , [activeQuestionId]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedQuestionIds(next);
    
    if (next.size > 0) {
      setViewMode('batch');
    } else {
      setViewMode('single');
    }
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.size === MOCK_QUESTIONS.length) {
      setSelectedQuestionIds(new Set());
      setViewMode('single');
    } else {
      setSelectedQuestionIds(new Set(MOCK_QUESTIONS.map(q => q.id)));
      setViewMode('batch');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background-light">
      <Header progress={5} total={100} batchMode={viewMode === 'batch'} />
      
      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <QuestionSidebar 
          questions={MOCK_QUESTIONS}
          activeId={activeQuestionId}
          selectedIds={selectedQuestionIds}
          onSelectQuestion={setActiveQuestionId}
          onToggleSelection={toggleSelection}
          batchMode={viewMode === 'batch'}
        />

        {/* Center Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-border-light relative overflow-y-auto">
          {viewMode === 'single' ? (
            <QuestionDetailView question={activeQuestion} />
          ) : (
            <BatchDetailView selectedCount={selectedQuestionIds.size} />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-[400px] shrink-0 bg-slate-50 flex flex-col shadow-xl z-20">
          {viewMode === 'single' ? (
            <KnowledgeSidebar question={activeQuestion} />
          ) : (
            <BatchOperationsSidebar selectedCount={selectedQuestionIds.size} onSelectAll={handleSelectAll} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
