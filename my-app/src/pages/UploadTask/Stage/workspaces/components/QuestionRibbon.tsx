import React from 'react';
import type { TaskQuestion } from '../../../types';
import styles from '../ParseReviewWorkspace.less';

interface QuestionRibbonProps {
  questions: TaskQuestion[];
  currentId: string;
  reviewedCount: number;
  onNavigate: (questionId: string) => void;
}

const QuestionRibbon: React.FC<QuestionRibbonProps> = ({
  questions,
  currentId,
  reviewedCount,
  onNavigate,
}) => (
  <div className={styles.ribbon}>
    <div className={styles.ribbonPills}>
      {questions.map((q) => {
        const active = q.id === currentId;
        const reviewed = q.parseReviewed === true;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onNavigate(q.id)}
            className={`${styles.pill} ${active ? styles.pillActive : ''} ${
              reviewed ? styles.pillReviewed : ''
            }`}
          >
            <span className={styles.pillLabel}>Q{q.index + 1}</span>
            {reviewed && <span className={styles.pillCheck}>✓</span>}
          </button>
        );
      })}
    </div>
    <div className={styles.ribbonMeta}>
      <span className={styles.ribbonStats}>
        已审 {reviewedCount} / {questions.length}
      </span>
    </div>
  </div>
);

export default QuestionRibbon;
