import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import React from 'react';
import type { TreeNodeData } from './treeHelpers';
import './TreeNodeTitle.less';

export interface TreeNodeTitleProps {
  nodeData: TreeNodeData;
  searchValue?: string;
  showAddChild?: boolean;
  addChildTitle?: string;
  onAddChild: (node: TreeNodeData, e: React.MouseEvent) => void;
  onEdit: (node: TreeNodeData, e: React.MouseEvent) => void;
  onDelete: (node: TreeNodeData, e: React.MouseEvent) => void;
}

const TreeNodeTitle: React.FC<TreeNodeTitleProps> = ({
  nodeData,
  searchValue = '',
  showAddChild = true,
  addChildTitle = '添加子节点',
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
    <div className="tag-tree-node-title">
      <span className="tag-tree-node-name">{title}</span>
      <Space className="tag-tree-node-actions" size={2}>
        {showAddChild ? (
          <Tooltip title={addChildTitle}>
            <Button
              type="text"
              size="small"
              aria-label={addChildTitle}
              icon={<PlusOutlined />}
              onClick={(e) => onAddChild(nodeData, e)}
            />
          </Tooltip>
        ) : null}
        <Tooltip title="编辑">
          <Button
            type="text"
            size="small"
            aria-label="编辑"
            icon={<EditOutlined />}
            onClick={(e) => onEdit(nodeData, e)}
          />
        </Tooltip>
        <Tooltip title="删除">
          <Button
            danger
            type="text"
            size="small"
            aria-label="删除"
            icon={<DeleteOutlined />}
            onClick={(e) => onDelete(nodeData, e)}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default TreeNodeTitle;
