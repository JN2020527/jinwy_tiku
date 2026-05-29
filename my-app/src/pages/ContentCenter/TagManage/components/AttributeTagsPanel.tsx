import {
  addAttribute,
  addTagCategory,
  deleteAttribute,
  deleteTagCategory,
  updateAttribute,
  updateTagCategory,
} from '@/services/tagSystem';
import type { AttributeItem, TagCategory } from '@/services/tagSystem';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'antd';
import {
  EditableProTable,
  ModalForm,
  ProFormText,
} from '@ant-design/pro-components';
import React, { useState } from 'react';

interface AttributeTagsPanelProps {
  tagCategories: TagCategory[];
  onRefresh: () => void;
}

const MAX_VISIBLE_TAGS = 15;

/**
 * Action type passed as the 4th argument to EditableProTable column render.
 * Provides row-level editable actions like startEditable.
 */
interface EditableColumnAction {
  startEditable?: (key: React.Key) => void;
}

const AttributeTagsPanel: React.FC<AttributeTagsPanelProps> = ({
  tagCategories,
  onRefresh,
}) => {
  // Category Modal State
  const [catModalVisible, setCatModalVisible] = useState<boolean>(false);
  const [catModalType, setCatModalType] = useState<'add' | 'edit'>('add');
  const [currentCategoryId, setCurrentCategoryId] = useState<string>('');
  const [catForm] = Form.useForm();
  const [editableKeys, setEditableKeys] = useState<React.Key[]>([]);

  // Attribute Modal State
  const [attrModalVisible, setAttrModalVisible] = useState<boolean>(false);
  const [attrModalType, setAttrModalType] = useState<'add' | 'edit'>('add');
  const [selectedAttr, setSelectedAttr] = useState<AttributeItem | null>(null);
  const [attrForm] = Form.useForm();

  // UI State
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [inputVisible, setInputVisible] = useState<Record<string, boolean>>(
    {},
  );
  const [inputValue, setInputValue] = useState<Record<string, string>>({});

  // --- Category Handlers ---
  const handleAddCategory = () => {
    setCatModalType('add');
    catForm.resetFields();
    setEditableKeys([]);
    setCatModalVisible(true);
  };

  const handleEditCategory = (category: TagCategory) => {
    setCatModalType('edit');
    setCurrentCategoryId(category.id);
    catForm.setFieldsValue({
      name: category.name,
      tags: category.tags,
    });
    setEditableKeys([]);
    setCatModalVisible(true);
  };

  const handleCatModalFinish = async (values: { name: string; tags?: AttributeItem[] }) => {
    let res;
    if (catModalType === 'add') {
      res = await addTagCategory(values);
    } else {
      res = await updateTagCategory({ ...values, id: currentCategoryId });
    }

    if (res.success) {
      message.success(catModalType === 'add' ? '分类添加成功' : '分类更新成功');
      setCatModalVisible(false);
      onRefresh();
      return true;
    }
    return false;
  };

  const handleDeleteCategory = (cat: TagCategory) => {
    Modal.confirm({
      title: '确认删除分类',
      content: `确定要删除分类 "${cat.name}" 及其所有标签吗？`,
      onOk: async () => {
        const res = await deleteTagCategory(cat.id);
        if (res.success) {
          message.success('删除成功');
          onRefresh();
        }
      },
    });
  };

  // --- Attribute Handlers ---
  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleEditAttr = (categoryId: string, item: AttributeItem) => {
    setAttrModalType('edit');
    setCurrentCategoryId(categoryId);
    setSelectedAttr(item);
    attrForm.setFieldsValue({
      name: item.name,
      color: item.color,
    });
    setAttrModalVisible(true);
  };

  const handleDeleteAttr = (categoryId: string, item: AttributeItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除标签 "${item.name}" 吗？`,
      onOk: async () => {
        const res = await deleteAttribute(item.id, categoryId);
        if (res.success) {
          message.success('删除成功');
          onRefresh();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const handleAttrModalFinish = async (values: { name: string; color?: string }) => {
    let res;
    const payload = { ...values, categoryId: currentCategoryId };
    if (attrModalType === 'add') {
      res = await addAttribute({ ...payload, color: payload.color || 'default' });
    } else {
      res = await updateAttribute({ ...payload, id: selectedAttr!.id });
    }

    if (res.success) {
      message.success(attrModalType === 'add' ? '添加成功' : '修改成功');
      setAttrModalVisible(false);
      onRefresh();
      return true;
    }
    return false;
  };

  // --- Inline Add Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId: string,
  ) => {
    setInputValue((prev) => ({ ...prev, [categoryId]: e.target.value }));
  };

  const handleInputConfirm = async (categoryId: string) => {
    const value = inputValue[categoryId];
    if (value) {
      const res = await addAttribute({
        categoryId,
        name: value,
        color: 'default',
      });
      if (res.success) {
        message.success('添加成功');
        onRefresh();
      }
    }
    setInputVisible((prev) => ({ ...prev, [categoryId]: false }));
    setInputValue((prev) => ({ ...prev, [categoryId]: '' }));
  };

  // --- Table Columns ---
  const columns: ColumnsType<TagCategory> = [
    {
      title: '标签分类',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '包含标签',
      key: 'tags',
      render: (_: unknown, record: TagCategory) => {
        const isExpanded = expandedCategories[record.id];
        const tags = record.tags || [];
        const visibleTags = isExpanded ? tags : tags.slice(0, MAX_VISIBLE_TAGS);
        const hasMore = tags.length > MAX_VISIBLE_TAGS;

        return (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {visibleTags.map((item) => (
              <Tag
                key={item.id}
                color="default"
                style={{
                  margin: 0,
                }}
              >
                {item.name}
              </Tag>
            ))}
            {hasMore && (
              <Button
                type="link"
                size="small"
                onClick={() => toggleExpand(record.id)}
                style={{ padding: 0 }}
              >
                {isExpanded ? '收起' : `展开(${tags.length})`}
              </Button>
            )}
            {!tags.length && !inputVisible[record.id] && (
              <span style={{ color: '#999', fontSize: '12px' }}>暂无标签</span>
            )}
            {inputVisible[record.id] && (
              <Input
                type="text"
                size="small"
                style={{ width: 78 }}
                value={inputValue[record.id]}
                onChange={(e) => handleInputChange(e, record.id)}
                onBlur={() => handleInputConfirm(record.id)}
                onPressEnter={() => handleInputConfirm(record.id)}
                autoFocus
              />
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: TagCategory) => {
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditCategory(record)}
            >
              编辑
            </Button>
            <Button
              type="text"
              danger
              size="small"
              onClick={() => handleDeleteCategory(record)}
            >
              删除
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div>
        <div style={{ marginBottom: 16 }}>
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={handleAddCategory}
          >
            添加标签分类
          </Button>
        </div>
        <Table
          dataSource={tagCategories}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </div>

      {/* Attribute Modal */}
      <ModalForm
        title={attrModalType === 'add' ? '添加属性标签' : '编辑属性标签'}
        open={attrModalVisible}
        onOpenChange={setAttrModalVisible}
        form={attrForm}
        onFinish={handleAttrModalFinish}
        width={400}
      >
        <ProFormText
          name="name"
          label="标签名称"
          rules={[{ required: true, message: '请输入标签名称' }]}
        />
      </ModalForm>

      {/* Category Modal */}
      <ModalForm
        title={catModalType === 'add' ? '添加标签分类' : '编辑标签分类'}
        open={catModalVisible}
        onOpenChange={setCatModalVisible}
        form={catForm}
        onFinish={handleCatModalFinish}
        width={580}
      >
        <ProFormText
          name="name"
          label="分类名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
          placeholder="例如：年份、来源、VIP属性"
        />
        <EditableProTable<AttributeItem>
          name="tags"
          rowKey="id"
          toolBarRender={false}
          columns={[
            {
              title: '标签名称',
              dataIndex: 'name',
              formItemProps: {
                rules: [{ required: true, message: '此项为必填项' }],
              },
              width: '80%',
            },
            {
              title: '操作',
              valueType: 'option',
              width: 100,
              render: (_text: React.ReactNode, record: AttributeItem, _index: number, action: EditableColumnAction) => [
                <a
                  key="editable"
                  onClick={() => {
                    action?.startEditable?.(record.id);
                  }}
                >
                  编辑
                </a>,
                <a
                  key="delete"
                  onClick={() => {
                    const dataSource = catForm.getFieldValue('tags') as AttributeItem[];
                    const newDataSource = dataSource.filter(
                      (item) => item.id !== record.id,
                    );
                    catForm.setFieldsValue({ tags: newDataSource });
                  }}
                >
                  删除
                </a>,
              ],
            },
          ]}
          recordCreatorProps={{
            newRecordType: 'dataSource',
            position: 'bottom',
            record: () => ({ id: Date.now().toString(), name: '' }),
            creatorButtonText: '添加新标签',
          }}
          editable={{
            type: 'multiple',
            editableKeys,
            onChange: setEditableKeys,
            onValuesChange: (_record: AttributeItem, recordList: AttributeItem[]) => {
              catForm.setFieldsValue({ tags: recordList });
            },
            actionRender: (_row, _config, defaultDom) => [
              defaultDom.save,
              defaultDom.cancel,
            ],
          }}
        />
      </ModalForm>
    </>
  );
};

export default AttributeTagsPanel;
