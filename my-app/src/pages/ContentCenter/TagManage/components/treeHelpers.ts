import type { TreeMovePosition } from '@/services/tagSystem';
import type { TreeProps } from 'antd';
import { useEffect, useRef, useState } from 'react';

/**
 * Shape of a tree node as received by titleRender in Ant Design Tree
 * when using fieldNames to map backend data (id→key, name→title).
 * The original backend fields are also present on the node object.
 */
export interface TreeNodeData {
  key: React.Key;
  title: string;
  grade?: string;
  subject?: string;
  description?: string;
  answerCardType?: 'objective' | 'subjective';
  answerArea?: {
    type: 'line' | 'blank';
    rows: number;
  };
  children?: TreeNodeData[];
}

/**
 * Recursively find the parent key of a given key in a tree structure.
 */
export const getParentKey = (
  key: React.Key,
  tree: TreeNodeData[],
): React.Key | undefined => {
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.children) {
      if (node.children.some((item) => item.key === key)) {
        return node.key;
      }
      const found = getParentKey(key, node.children);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
};

export const isTreeDescendant = (
  tree: TreeNodeData[],
  ancestorKey: React.Key,
  targetKey: React.Key,
): boolean => {
  const findNode = (nodes: TreeNodeData[]): TreeNodeData | null => {
    for (const node of nodes) {
      if (node.key === ancestorKey) {
        return node;
      }
      if (node.children?.length) {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const containsTarget = (nodes: TreeNodeData[]): boolean =>
    nodes.some(
      (node) =>
        node.key === targetKey ||
        Boolean(node.children?.length && containsTarget(node.children)),
    );

  const ancestorNode = findNode(tree);
  return Boolean(
    ancestorNode?.children?.length && containsTarget(ancestorNode.children),
  );
};

export const allowCrossParentTreeDrop = (
  tree: TreeNodeData[],
  dragKey: React.Key,
  dropKey: React.Key,
) => dragKey !== dropKey && !isTreeDescendant(tree, dragKey, dropKey);

export const appendTreeNode = (
  treeData: TreeNodeData[],
  nodeToAppend: TreeNodeData,
  parentKey?: React.Key | null,
): TreeNodeData[] => {
  if (!parentKey) {
    return [...treeData, nodeToAppend];
  }

  return treeData.map((node) => {
    if (node.key === parentKey) {
      return {
        ...node,
        children: [...(node.children || []), nodeToAppend],
      };
    }

    if (node.children?.length) {
      return {
        ...node,
        children: appendTreeNode(node.children, nodeToAppend, parentKey),
      };
    }

    return node;
  });
};

export const getTreeMovePosition = (
  info: Parameters<NonNullable<TreeProps['onDrop']>>[0],
): TreeMovePosition => {
  if (!info.dropToGap) {
    return 'inside';
  }

  const dropPos = info.node.pos.split('-');
  const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
  return dropPosition < 0 ? 'before' : 'after';
};

/**
 * Flatten a tree into a list of { key, title } objects.
 */
export const generateList = (
  data: TreeNodeData[],
): { key: React.Key; title: string }[] => {
  const result: { key: React.Key; title: string }[] = [];
  for (let i = 0; i < data.length; i++) {
    const node = data[i];
    const { key, title } = node;
    result.push({ key, title });
    if (node.children) {
      result.push(...generateList(node.children));
    }
  }
  return result;
};

const generateExpandableKeys = (data: TreeNodeData[]): React.Key[] => {
  const result: React.Key[] = [];
  data.forEach((node) => {
    if (node.children?.length) {
      result.push(node.key);
      result.push(...generateExpandableKeys(node.children));
    }
  });
  return result;
};

/**
 * Reusable hook for tree search behavior (expand + highlight).
 */
export const useTreeSearch = (treeData: TreeNodeData[]) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setExpandedKeys(generateExpandableKeys(treeData));
    setAutoExpandParent(true);
  }, [treeData]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    // Immediately update the input display value
    setSearchValue(value);

    // Debounce the expensive tree expansion computation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const dataList = generateList(treeData);

      const newExpandedKeys = dataList
        .map((item) => {
          if (item.title.includes(value)) {
            return getParentKey(item.key, treeData);
          }
          return null;
        })
        .filter((item, i, self) => item && self.indexOf(item) === i);

      setExpandedKeys(newExpandedKeys as React.Key[]);
      setAutoExpandParent(true);
    }, 200);
  };

  return {
    expandedKeys,
    autoExpandParent,
    searchValue,
    onExpand,
    onSearch,
  };
};
