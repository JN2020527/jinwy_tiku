import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import React from 'react';
import type { TreeNodeData } from './treeHelpers';
import './TreeNodeTitle.less';

export interface TreeNodeTitleProps {
  nodeData: TreeNodeData;
  searchValue?: string;
  meta?: React.ReactNode;
  showAddChild?: boolean;
  addChildTitle?: string;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (node: TreeNodeData, e: React.MouseEvent) => void;
  onMoveDown?: (node: TreeNodeData, e: React.MouseEvent) => void;
  onAddChild: (node: TreeNodeData, e: React.MouseEvent) => void;
  onEdit: (node: TreeNodeData, e: React.MouseEvent) => void;
  onDelete: (node: TreeNodeData, e: React.MouseEvent) => void;
}

const TreeNodeTitle: React.FC<TreeNodeTitleProps> = ({
  nodeData,
  searchValue = '',
  meta,
  showAddChild = true,
  addChildTitle = '添加子节点',
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
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
      <span className="tag-tree-node-content">
        <span className="tag-tree-node-name">{title}</span>
        {meta ? <span className="tag-tree-node-meta">{meta}</span> : null}
      </span>
      <Space className="tag-tree-node-actions" size={2}>
        {onMoveUp ? (
          <Tooltip title="上移">
            <Button
              type="text"
              size="small"
              aria-label="上移"
              disabled={!canMoveUp}
              icon={<ArrowUpOutlined />}
              onClick={(e) => onMoveUp(nodeData, e)}
            />
          </Tooltip>
        ) : null}
        {onMoveDown ? (
          <Tooltip title="下移">
            <Button
              type="text"
              size="small"
              aria-label="下移"
              disabled={!canMoveDown}
              icon={<ArrowDownOutlined />}
              onClick={(e) => onMoveDown(nodeData, e)}
            />
          </Tooltip>
        ) : null}
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
