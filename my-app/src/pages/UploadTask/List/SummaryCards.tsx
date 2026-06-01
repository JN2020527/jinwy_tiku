import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Card, Col, Row } from 'antd';
import React from 'react';
import { BUCKET_DEFS } from '../constants';
import type { BucketKey } from '../types';

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
    <Row gutter={16} style={{ marginBottom: 16 }}>
      {BUCKET_DEFS.map((bucket) => {
        const isActive = active === bucket.key;
        return (
          <Col span={4} key={bucket.key}>
            <Card
              hoverable
              onClick={() => onChange(bucket.key)}
              styles={{ body: { padding: 16 } }}
              style={{
                border: isActive
                  ? `2px solid ${bucket.color}`
                  : '1px solid #f0f0f0',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      color: bucket.color,
                      lineHeight: 1.2,
                    }}
                  >
                    {bucketCounts[bucket.key] ?? 0}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {bucket.label}
                  </div>
                </div>
                <div style={{ fontSize: 24, color: bucket.color, opacity: 0.6 }}>
                  {ICONS[bucket.key]}
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default SummaryCards;
