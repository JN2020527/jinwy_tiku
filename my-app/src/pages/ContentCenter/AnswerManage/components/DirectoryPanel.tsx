import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  QrcodeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { Button, Card, Form, Modal, Space, Tree, message } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { DirectoryItem } from './types';

interface DirectoryPanelProps {
  directoryList: DirectoryItem[];
  onDirectoryListChange: (
    updater: (prev: DirectoryItem[]) => DirectoryItem[],
  ) => void;
  selectedDirectoryKey: string;
  onSelectedDirectoryKeyChange: (key: string) => void;
  onQrCodeOpen: (item: { name: string; qrCodeUrl?: string }) => void;
}

const ALL_DIRECTORY_KEY = '__all__';
const UNASSIGNED_DIRECTORY_KEY = '__unassigned__';

interface TreeNode {
  title: string;
  value: string;
  qrCodeUrl?: string;
  sort: number;
  parentId?: string;
  children: TreeNode[];
  selectable?: boolean;
}

const buildTreeData = (
  list: DirectoryItem[],
  leafOnly: boolean = false,
): TreeNode[] => {
  const nodeMap = new Map<string, TreeNode>();
  const childIdsByParent = new Map<string, string[]>();
  const rootIds: string[] = [];

  list.forEach((item) => {
    nodeMap.set(item.id, {
      title: item.name,
      value: item.id,
      qrCodeUrl: item.qrCodeUrl,
      sort: item.sort,
      parentId: item.parentId,
      children: [],
    });

    if (item.parentId && list.some((d) => d.id === item.parentId)) {
      const siblings = childIdsByParent.get(item.parentId) ?? [];
      childIdsByParent.set(item.parentId, [...siblings, item.id]);
    } else {
      rootIds.push(item.id);
    }
  });

  const resolveNode = (id: string): TreeNode => {
    const node = nodeMap.get(id)!;
    const childIds = childIdsByParent.get(id);
    if (childIds && childIds.length > 0) {
      const children = childIds.map(resolveNode);
      return { ...node, children };
    }
    return node;
  };

  const roots = rootIds.map(resolveNode);

  if (leafOnly) {
    const markNonSelectable = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((node) => {
        if (node.children.length > 0) {
          return {
            ...node,
            selectable: false,
            children: markNonSelectable(node.children),
          };
        }
        return node;
      });
    return markNonSelectable(roots);
  }

  return roots;
};

const getDescendantIds = (
  rootId: string,
  allDirs: DirectoryItem[],
): string[] => {
  const children = allDirs.filter((d) => d.parentId === rootId);
  let ids = children.map((c) => c.id);
  children.forEach((c) => {
    ids = [...ids, ...getDescendantIds(c.id, allDirs)];
  });
  return ids;
};

const DirectoryPanel: React.FC<DirectoryPanelProps> = ({
  directoryList,
  onDirectoryListChange,
  selectedDirectoryKey,
  onSelectedDirectoryKeyChange,
  onQrCodeOpen,
}) => {
  const [isDirectoryManaging, setIsDirectoryManaging] = useState(false);
  const [directoryModalVisible, setDirectoryModalVisible] = useState(false);
  const [currentDirectoryAction, setCurrentDirectoryAction] = useState<
    'add' | 'edit' | 'addSub'
  >('add');
  const [currentOperatingDirectory, setCurrentOperatingDirectory] =
    useState<DirectoryItem>();
  const [directoryForm] = Form.useForm();

  const handleDirectoryModalOpen = (
    action: 'add' | 'edit' | 'addSub',
    record?: DirectoryItem,
  ) => {
    setCurrentDirectoryAction(action);
    setCurrentOperatingDirectory(record);
    setDirectoryModalVisible(true);
  };

  useEffect(() => {
    if (directoryModalVisible) {
      directoryForm.resetFields();
      if (currentDirectoryAction === 'edit' && currentOperatingDirectory) {
        directoryForm.setFieldsValue({
          name: currentOperatingDirectory.name,
          sort: currentOperatingDirectory.sort,
        });
      } else if (
        currentDirectoryAction === 'add' ||
        currentDirectoryAction === 'addSub'
      ) {
        const parentId =
          currentDirectoryAction === 'addSub' && currentOperatingDirectory
            ? currentOperatingDirectory.id
            : undefined;
        const siblings = directoryList.filter((d) => d.parentId === parentId);
        const maxSort = Math.max(...siblings.map((s) => s.sort), 0);
        directoryForm.setFieldsValue({
          sort: maxSort + 1,
        });
      }
    }
  }, [
    directoryModalVisible,
    currentDirectoryAction,
    currentOperatingDirectory,
    directoryForm,
    directoryList,
  ]);

  const handleDeleteDirectory = (record: DirectoryItem) => {
    Modal.confirm({
      title: '确认删除目录?',
      content: `删除 "${record.name}" 将同时删除其所有下级目录。目录下的资源将变为"未归类"。`,
      onOk: () => {
        const idsToDelete = [
          record.id,
          ...getDescendantIds(record.id, directoryList),
        ];

        // Notify parent to clear answers referencing deleted directories.
        // We call onDirectoryListChange which returns the new list,
        // but we also need to update answerList from parent. The parent
        // wraps both updates, so we pass a callback that the parent handles.
        // However, to keep things simple and avoid coupling, we just
        // update the directory list here. The parent component handles
        // answer cleanup through its own onDeleteDirectory callback.
        onDirectoryListChange((prev) =>
          prev.filter((d) => !idsToDelete.includes(d.id)),
        );

        message.success('删除成功');
      },
    });
  };

  const directoryTreeData = useMemo(() => {
    const attachKeys = (nodes: any[]): any[] =>
      nodes.map((node) => ({
        ...node,
        key: node.value,
        title: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>{node.title}</span>
            <Space>
              {!isDirectoryManaging && node.qrCodeUrl && (
                <QrcodeOutlined
                  style={{ marginLeft: 8, color: '#1890ff' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onQrCodeOpen({
                      name: node.title,
                      qrCodeUrl: node.qrCodeUrl,
                    });
                  }}
                />
              )}
              {isDirectoryManaging && (
                <>
                  <EditOutlined
                    style={{ color: '#1890ff', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDirectoryModalOpen('edit', {
                        id: node.value,
                        name: node.title,
                        sort: node.sort,
                        parentId: node.parentId,
                      } as any);
                    }}
                  />
                  {!node.parentId && (
                    <PlusCircleOutlined
                      style={{ color: '#52c41a', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectoryModalOpen('addSub', {
                          id: node.value,
                        } as any);
                      }}
                    />
                  )}
                  <DeleteOutlined
                    style={{ color: '#ff4d4f', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDirectory({
                        id: node.value,
                        name: node.title,
                      } as any);
                    }}
                  />
                </>
              )}
            </Space>
          </div>
        ),
        children: node.children ? attachKeys(node.children) : undefined,
      }));

    const treeNodes = attachKeys(buildTreeData(directoryList));

    if (isDirectoryManaging) {
      return treeNodes;
    }

    // Compute unassigned count is done by the parent, but we don't have it here.
    // Instead, we just show the label. The parent passes selectedDirectoryKey to us.
    return [
      { title: '全部', key: ALL_DIRECTORY_KEY },
      { title: '未归类', key: UNASSIGNED_DIRECTORY_KEY },
      ...treeNodes,
    ];
  }, [directoryList, isDirectoryManaging]);

  const handleDirectoryDrop = (info: any) => {
    const dropKey = info.node.key as string;
    const dragKey = info.dragNode.key as string;
    const dropPos = info.node.pos.split('-');
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (
      data: any[],
      key: string,
      callback: (item: any, index: number, arr: any[]) => void,
    ) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data);
        }
        if (data[i].children) {
          loop(data[i].children, key, callback);
        }
      }
    };

    const data = [...directoryTreeData];

    let dragObj: any;
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.push(dragObj);
      });
    } else if (
      (info.node.children || []).length > 0 &&
      info.node.expanded &&
      dropPosition === 1
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else {
      let ar: any[] = [];
      let i: number = 0;
      loop(data, dropKey, (item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj);
      } else {
        ar.splice(i + 1, 0, dragObj);
      }
    }

    const newDirectoryList: DirectoryItem[] = [];
    const flatten = (nodes: any[], parentId?: string) => {
      nodes.forEach((node, index) => {
        const original = directoryList.find((d) => d.id === node.key);
        if (original) {
          newDirectoryList.push({
            ...original,
            parentId: parentId,
            sort: index + 1,
          });
        }
        if (node.children) {
          flatten(node.children, node.key);
        }
      });
    };

    flatten(data, undefined);

    const validNewList = newDirectoryList.filter(
      (item) =>
        item.id !== ALL_DIRECTORY_KEY && item.id !== UNASSIGNED_DIRECTORY_KEY,
    );

    onDirectoryListChange(() => validNewList);
  };

  return (
    <>
      <Card
        title="目录"
        extra={
          <Space>
            {isDirectoryManaging && (
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleDirectoryModalOpen('add')}
              >
                添加一级
              </Button>
            )}
            <Button
              type="text"
              icon={
                isDirectoryManaging ? <CheckOutlined /> : <SettingOutlined />
              }
              onClick={() => setIsDirectoryManaging(!isDirectoryManaging)}
            >
              {isDirectoryManaging ? '完成' : '管理'}
            </Button>
          </Space>
        }
      >
        <Tree
          blockNode
          defaultExpandAll
          draggable={isDirectoryManaging}
          onDrop={handleDirectoryDrop}
          selectedKeys={isDirectoryManaging ? [] : [selectedDirectoryKey]}
          treeData={directoryTreeData}
          onSelect={(keys) => {
            if (isDirectoryManaging) return;
            const nextKey = (keys[0] as string) || ALL_DIRECTORY_KEY;
            onSelectedDirectoryKeyChange(nextKey);
          }}
        />
      </Card>

      {/* Directory Management Modal */}
      <ModalForm
        title={
          currentDirectoryAction === 'add'
            ? '添加一级目录'
            : currentDirectoryAction === 'addSub'
            ? '添加下级目录'
            : '编辑目录'
        }
        width={500}
        open={directoryModalVisible}
        onOpenChange={setDirectoryModalVisible}
        form={directoryForm}
        modalProps={{ zIndex: 2000 }}
        layout="horizontal"
        labelCol={{ flex: '80px' }}
        onFinish={async (values) => {
          if (currentDirectoryAction === 'edit' && currentOperatingDirectory) {
            onDirectoryListChange((prev) =>
              prev.map((item) => {
                if (item.id === currentOperatingDirectory.id) {
                  return { ...item, name: values.name, sort: values.sort };
                }
                return item;
              }),
            );
            message.success('修改成功');
          } else {
            const newId = Date.now().toString();
            const parentId =
              currentDirectoryAction === 'addSub' && currentOperatingDirectory
                ? currentOperatingDirectory.id
                : undefined;
            const newRecord: DirectoryItem = {
              id: newId,
              name: values.name,
              parentId: parentId,
              sort: values.sort,
              createTime: new Date().toISOString(),
            };
            onDirectoryListChange((prev) => [...prev, newRecord]);
            message.success('添加成功');
          }
          return true;
        }}
      >
        <ProFormText
          name="name"
          label="目录名称"
          placeholder="请输入目录名称"
          rules={[{ required: true, message: '请输入目录名称' }]}
        />
        <ProFormText
          name="sort"
          label="排序"
          placeholder="请输入排序号"
          fieldProps={{ type: 'number' }}
          initialValue={1}
          rules={[{ required: true, message: '请输入排序号' }]}
        />
      </ModalForm>
    </>
  );
};

export {
  ALL_DIRECTORY_KEY,
  UNASSIGNED_DIRECTORY_KEY,
  buildTreeData,
  getDescendantIds,
};
export default DirectoryPanel;
