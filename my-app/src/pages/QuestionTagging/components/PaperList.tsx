import React from 'react';
import { Pagination } from 'antd';
import type { Paper } from '../types';
import styles from './PaperList.less';

interface PaperListProps {
  papers: Paper[];
  currentPaperId: string;
  onPaperClick: (paperId: string) => void;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

const PaperList: React.FC<PaperListProps> = ({
  papers,
  currentPaperId,
  onPaperClick,
  pagination,
}) => {
  return (
    <div className={styles.paperList}>
      <div className={styles.listContainer}>
        {papers.map((paper) => {
          const progress = paper.questionCount > 0
            ? (paper.taggedCount / paper.questionCount) * 100
            : 0;

          return (
            <div
              key={paper.id}
              className={`${styles.paperItem} ${paper.id === currentPaperId ? styles.active : ''}`}
              onClick={() => onPaperClick(paper.id)}
            >
              <div className={styles.paperName} title={paper.name}>
                {paper.name}
              </div>
              <div className={styles.progressWrapper}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={styles.progressText}>
                  {paper.taggedCount}/{paper.questionCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.pagination}>
        <Pagination
          size="small"
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
          showSizeChanger={false}
        />
      </div>
    </div>
  );
};

export default PaperList;
