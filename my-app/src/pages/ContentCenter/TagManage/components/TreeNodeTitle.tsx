import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { InputRef } from 'antd';
import { Button, Input, Space, Tooltip } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import type { TreeNodeData } from './treeHelpers';
import './TreeNodeTitle.less';

interface TreeNodeInlineEditConfig {
  initialValue: string;
  placeholder?: string;
  saving?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export interface TreeNodeTitleProps {
  nodeData: TreeNodeData;
  className?: string;
  style?: React.CSSProperties;
  searchValue?: string;
  meta?: React.ReactNode;
  inlineEdit?: TreeNodeInlineEditConfig;
  actionsVisible?: boolean;
  nodeActionsVisible?: boolean;
  showAddChild?: boolean;
  addChildTitle?: string;
  extraActions?: React.ReactNode;
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
  className,
  style,
  searchValue = '',
  meta,
  inlineEdit,
  actionsVisible = true,
  nodeActionsVisible = true,
  showAddChild = true,
  addChildTitle = '添加子节点',
  extraActions,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onAddChild,
  onEdit,
  onDelete,
}) => {
  const [inlineValue, setInlineValue] = useState(
    inlineEdit?.initialValue || '',
  );
  const inlineInputRef = useRef<InputRef>(null);

  useEffect(() => {
    setInlineValue(inlineEdit?.initialValue || '');
    if (inlineEdit) {
      window.setTimeout(() => {
        inlineInputRef.current?.focus();
        inlineInputRef.current?.select();
      }, 0);
    }
  }, [Boolean(inlineEdit), inlineEdit?.initialValue]);

  const handleInlineSubmit = () => {
    inlineEdit?.onSubmit(inlineValue.trim());
  };

  if (inlineEdit) {
    return (
      <div
        className="tag-tree-node-title tag-tree-node-title-editing"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          ref={inlineInputRef}
          name="treeNodeTitle"
          autoComplete="off"
          size="small"
          value={inlineValue}
          placeholder={inlineEdit.placeholder}
          className="tag-tree-node-input"
          disabled={inlineEdit.saving}
          onChange={(e) => setInlineValue(e.target.value)}
          onPressEnter={handleInlineSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              inlineEdit.onCancel();
            }
            e.stopPropagation();
          }}
        />
        <Space className="tag-tree-node-actions" size={2}>
          <Tooltip title="保存">
            <Button
              type="text"
              size="small"
              aria-label="保存"
              loading={inlineEdit.saving}
              icon={<CheckOutlined />}
              onClick={handleInlineSubmit}
            />
          </Tooltip>
          <Tooltip title="取消">
            <Button
              type="text"
              size="small"
              aria-label="取消"
              disabled={inlineEdit.saving}
              icon={<CloseOutlined />}
              onClick={inlineEdit.onCancel}
            />
          </Tooltip>
        </Space>
      </div>
    );
  }

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

  const shouldRenderActions =
    actionsVisible &&
    (Boolean(onMoveUp || onMoveDown || extraActions) || nodeActionsVisible);

  return (
    <div
      className={`tag-tree-node-title${className ? ` ${className}` : ''}`}
      style={style}
    >
      <span
        className={`tag-tree-node-content${
          meta ? ' tag-tree-node-content-with-meta' : ''
        }`}
      >
        <span className="tag-tree-node-name">{title}</span>
        {meta ? <span className="tag-tree-node-meta">{meta}</span> : null}
      </span>
      {shouldRenderActions ? (
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
          {extraActions}
          {nodeActionsVisible && showAddChild ? (
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
          {nodeActionsVisible ? (
            <>
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
                  type="text"
                  size="small"
                  className="tag-tree-node-delete-button"
                  aria-label="删除"
                  icon={<DeleteOutlined />}
                  onClick={(e) => onDelete(nodeData, e)}
                />
              </Tooltip>
            </>
          ) : null}
        </Space>
      ) : null}
    </div>
  );
};

export default TreeNodeTitle;
