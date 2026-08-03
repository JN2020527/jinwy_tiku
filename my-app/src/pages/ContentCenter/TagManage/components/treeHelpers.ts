import type { TreeMovePosition } from '@/services/tagSystem';
import type { TreeProps } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

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

export interface TreeMoveRequest {
  targetId: React.Key;
  position: TreeMovePosition;
}

export const findTreeNode = (
  tree: TreeNodeData[],
  key: React.Key,
): TreeNodeData | undefined => {
  for (const node of tree) {
    if (node.key === key) {
      return node;
    }

    if (node.children?.length) {
      const found = findTreeNode(node.children, key);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
};

export const getSiblingTreeNodes = (
  tree: TreeNodeData[],
  parentKey?: React.Key | null,
): TreeNodeData[] => {
  if (!parentKey) {
    return tree;
  }

  return findTreeNode(tree, parentKey)?.children || [];
};

export const hasSiblingTreeNodeTitle = (
  tree: TreeNodeData[],
  parentKey: React.Key | null | undefined,
  title: string,
  excludeKey?: React.Key,
) => {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    return false;
  }

  return getSiblingTreeNodes(tree, parentKey).some(
    (node) =>
      node.key !== excludeKey && String(node.title).trim() === normalizedTitle,
  );
};

export const getTreeMoveRequest = (
  tree: TreeNodeData[],
  info: Parameters<NonNullable<TreeProps['onDrop']>>[0],
): TreeMoveRequest => {
  const defaultPosition = getTreeMovePosition(info);
  const dragKey = info.dragNode.key;
  const dropKey = info.node.key;

  if (defaultPosition !== 'inside') {
    return {
      targetId: dropKey,
      position: defaultPosition,
    };
  }

  const dragParentKey = getParentKey(dragKey, tree);
  if (dragParentKey !== dropKey) {
    return {
      targetId: dropKey,
      position: 'inside',
    };
  }

  const parentNode = findTreeNode(tree, dropKey);
  const siblings = parentNode?.children || [];
  const dragIndex = siblings.findIndex((node) => node.key === dragKey);
  const remainingSiblings = siblings.filter((node) => node.key !== dragKey);

  if (dragIndex < 0 || remainingSiblings.length === 0) {
    return {
      targetId: dropKey,
      position: 'inside',
    };
  }

  if (dragIndex > 0) {
    return {
      targetId: remainingSiblings[0].key,
      position: 'before',
    };
  }

  return {
    targetId: remainingSiblings[remainingSiblings.length - 1].key,
    position: 'after',
  };
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

const filterTreeDataByTitle = (
  data: TreeNodeData[],
  searchValue: string,
): TreeNodeData[] => {
  const keyword = searchValue.trim();
  if (!keyword) {
    return data;
  }

  return data.flatMap((node) => {
    const filteredChildren = node.children?.length
      ? filterTreeDataByTitle(node.children, keyword)
      : [];
    const matched = node.title.includes(keyword);

    if (!matched && filteredChildren.length === 0) {
      return [];
    }

    return [
      {
        ...node,
        children: filteredChildren.length ? filteredChildren : undefined,
      },
    ];
  });
};

/**
 * Reusable hook for tree search behavior (expand + highlight).
 */
export const useTreeSearch = (treeData: TreeNodeData[]) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [inputValue, setInputValue] = useState<string>('');
  const [searchValue, setSearchValue] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredTreeData = useMemo(
    () => filterTreeDataByTitle(treeData, searchValue),
    [searchValue, treeData],
  );

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

  const applySearch = (value: string) => {
    const keyword = value.trim();
    const nextTreeData = filterTreeDataByTitle(treeData, keyword);

    setSearchValue(value);
    setExpandedKeys(
      keyword
        ? generateExpandableKeys(nextTreeData)
        : generateExpandableKeys(treeData),
    );
    setAutoExpandParent(true);
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    // Immediately update the input display value
    setInputValue(value);
    setSearchValue(value);

    // Debounce the expensive tree expansion computation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      applySearch(value);
    }, 200);
  };

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const submitSearch = (value = inputValue) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    applySearch(value);
  };

  const resetSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setInputValue('');
    setSearchValue('');
    setExpandedKeys(generateExpandableKeys(treeData));
    setAutoExpandParent(true);
  };

  return {
    expandedKeys,
    autoExpandParent,
    inputValue,
    searchValue,
    filteredTreeData,
    onExpand,
    onSearch,
    onSearchInputChange,
    submitSearch,
    resetSearch,
  };
};
