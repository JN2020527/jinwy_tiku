import React from 'react';
import type { Question } from '../types';
import styles from './PaperQuestionNav.less';

interface PaperQuestionNavProps {
  questions: Question[];
  currentQuestionId: string;
  selectedQuestionIds: string[];
  onQuestionClick: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
}

const PaperQuestionNav: React.FC<PaperQuestionNavProps> = ({
  questions,
  currentQuestionId,
  selectedQuestionIds,
  onQuestionClick,
  onSelectionChange,
}) => {
  const handleBlockClick = (id: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+click: toggle multi-select
      if (selectedQuestionIds.includes(id)) {
        onSelectionChange(selectedQuestionIds.filter((qid) => qid !== id));
      } else {
        onSelectionChange([...selectedQuestionIds, id]);
      }
    } else {
      // Normal click: single select
      onQuestionClick(id);
    }
  };

  return (
    <div className={styles.paperQuestionNav}>
      <div className={styles.header}>
        <span className={styles.title}>试题导航</span>
      </div>
      <div className={styles.questionGrid}>
        {questions.map((question, index) => {
          const isTagged = question.tagStatus === 'complete';
          const isCurrent = question.id === currentQuestionId;
          const isSelected = selectedQuestionIds.includes(question.id);

          const classNames = [
            styles.questionBlock,
            isTagged ? styles.tagged : styles.untagged,
            isCurrent ? styles.current : '',
            isSelected ? styles.selected : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={question.id}
              className={classNames}
              onClick={(e) => handleBlockClick(question.id, e)}
              title={`第${index + 1}题 - ${isTagged ? '已打标' : '未打标'}`}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.tagged}`} />
          已打标
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.untagged}`} />
          未打标
        </span>
      </div>
    </div>
  );
};

export default PaperQuestionNav;
