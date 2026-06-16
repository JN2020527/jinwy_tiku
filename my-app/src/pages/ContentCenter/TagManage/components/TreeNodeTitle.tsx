import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Space, Tooltip } from 'antd';
import React from 'react';
import type { TreeNodeData } from './treeHelpers';

export interface TreeNodeTitleProps {
  nodeData: TreeNodeData;
  searchValue?: string;
  onAddChild: (node: TreeNodeData, e: React.MouseEvent) => void;
  onEdit: (node: TreeNodeData, e: React.MouseEvent) => void;
  onDelete: (node: TreeNodeData, e: React.MouseEvent) => void;
}

const TreeNodeTitle: React.FC<TreeNodeTitleProps> = ({
  nodeData,
  searchValue = '',
  onAddChild,
  onEdit,
  onDelete,
}) => {
  const title =
    searchValue && nodeData.title.includes(searchValue) ? (
      <span>
        {nodeData.title.split(searchValue).map((part, i, parts) =>
          i < parts.length - 1
            ? [
                part,
                <span key={i} style={{ color: '#f50' }}>
                  {searchValue}
                </span>,
              ]
            : part,
        )}
      </span>
    ) : (
      <span>{nodeData.title}</span>
    );

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span>{title}</span>
      <Space style={{ marginLeft: 12 }}>
        <Tooltip title="添加子节点">
          <PlusOutlined
            onClick={(e) => onAddChild(nodeData, e)}
            style={{ color: '#1890ff', cursor: 'pointer' }}
          />
        </Tooltip>
        <Tooltip title="编辑">
          <EditOutlined
            onClick={(e) => onEdit(nodeData, e)}
            style={{ color: '#52c41a', cursor: 'pointer' }}
          />
        </Tooltip>
        <Tooltip title="删除">
          <DeleteOutlined
            onClick={(e) => onDelete(nodeData, e)}
            style={{ color: '#ff4d4f', cursor: 'pointer' }}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default TreeNodeTitle;
