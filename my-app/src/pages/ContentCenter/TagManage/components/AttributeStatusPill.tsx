import type { AttributeStatus } from '@/services/tagSystem';
import React from 'react';

interface AttributeStatusPillProps {
  status?: AttributeStatus;
}

const AttributeStatusPill: React.FC<AttributeStatusPillProps> = ({
  status = 'enabled',
}) => {
  const enabled = status === 'enabled';

  return (
    <span
      className={
        enabled ? 'attribute-status-pill enabled' : 'attribute-status-pill disabled'
      }
    >
      {enabled ? '启用' : '停用'}
    </span>
  );
};

export default AttributeStatusPill;
