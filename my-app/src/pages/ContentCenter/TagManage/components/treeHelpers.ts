import { useRef, useState } from 'react';

/**
 * Shape of a tree node as received by titleRender in Ant Design Tree
 * when using fieldNames to map backend data (id→key, name→title).
 * The original backend fields are also present on the node object.
 */
export interface TreeNodeData {
  key: React.Key;
  title: string;
  children?: TreeNodeData[];
  [extra: string]: unknown;
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

/**
 * Reusable hook for tree search behavior (expand + highlight).
 */
export const useTreeSearch = (treeData: TreeNodeData[]) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [searchValue, setSearchValue] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
