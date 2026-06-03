import { sanitizeHtml } from '@/utils/sanitize';
import React from 'react';
import styles from '../ParseReviewWorkspace.less';

interface QuestionContextProps {
  stem: string;
  options?: string[];
}

const QuestionContext: React.FC<QuestionContextProps> = ({ stem, options }) => (
  <div className={styles.contextPanel}>
    <div className={styles.sectionLabel}>题目</div>
    <div
      className={styles.stemBody}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(stem) }}
    />
    {options && options.length > 0 && (
      <>
        <div className={styles.sectionLabel}>选项</div>
        <div className={styles.optionsList}>
          {options.map((opt, i) => (
            <div key={i} className={styles.optionRow}>
              <span className={styles.optionLetter}>
                {String.fromCharCode(65 + i)}.
              </span>
              <span
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }}
              />
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

export default QuestionContext;
