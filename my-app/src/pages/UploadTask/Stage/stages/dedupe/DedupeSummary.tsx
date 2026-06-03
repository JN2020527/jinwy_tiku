import React from 'react';
import styles from './dedupe.less';

export interface DedupeSummaryProps {
  total: number;
  duplicateCount: number;
}

const DedupeSummary: React.FC<DedupeSummaryProps> = ({
  total,
  duplicateCount,
}) => {
  const independentCount = total - duplicateCount;

  return (
    <div className={styles.summary}>
      {duplicateCount === 0 ? (
        <span>共 {total} 题 · 未发现重复题</span>
      ) : (
        <span>
          共 {total} 题 ·{' '}
          <span className={styles.summaryIndependent}>
            {independentCount} 道独立
          </span>{' '}
          ·{' '}
          <span className={styles.summaryDuplicate}>
            {duplicateCount} 道重复
          </span>
        </span>
      )}
    </div>
  );
};

export default DedupeSummary;
