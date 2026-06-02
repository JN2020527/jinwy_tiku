import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import React from 'react';
import { BUCKET_DEFS } from '../constants';
import type { BucketKey } from '../types';
import styles from './SummaryCards.less';

interface SummaryCardsProps {
  bucketCounts: Record<BucketKey, number>;
  active: BucketKey;
  onChange: (key: BucketKey) => void;
}

const ICONS: Record<BucketKey, React.ReactNode> = {
  all: <FolderOpenOutlined />,
  'pending-human': <ClockCircleOutlined />,
  processing: <SyncOutlined />,
  published: <CheckCircleOutlined />,
  rejected: <CloseCircleOutlined />,
};

const SummaryCards: React.FC<SummaryCardsProps> = ({
  bucketCounts,
  active,
  onChange,
}) => {
  return (
    <div className={styles.summaryCards}>
      {BUCKET_DEFS.map((bucket) => {
        const isActive = active === bucket.key;
        return (
          <div
            key={bucket.key}
            className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
            style={isActive ? { borderColor: bucket.color } : undefined}
            onClick={() => onChange(bucket.key)}
          >
            <div className={styles.cardContent}>
              <div className={styles.cardInfo}>
                <div
                  className={styles.cardCount}
                  style={{ color: bucket.color }}
                >
                  {bucketCounts[bucket.key] ?? 0}
                </div>
                <div className={styles.cardLabel}>{bucket.label}</div>
              </div>
              <div
                className={styles.cardIcon}
                style={{ color: bucket.color }}
              >
                {ICONS[bucket.key]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;
