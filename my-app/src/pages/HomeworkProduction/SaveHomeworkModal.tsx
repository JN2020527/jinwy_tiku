import { Form, Input, Modal, Space } from 'antd';
import React, { useEffect } from 'react';

export interface SaveHomeworkValues {
  name: string;
}

interface SaveHomeworkModalProps {
  open: boolean;
  initialName: string;
  saving: boolean;
  onCancel: () => void;
  /** 返回错误信息时落字段并保持弹窗；返回 null 表示成功（由父组件关闭并跳转）。 */
  onConfirm: (name: string) => Promise<string | null>;
}

/**
 * 保存作业名称弹窗：必填；名称冲突等错误落 name 字段（AC-09 / AC-21）。
 */
const SaveHomeworkModal: React.FC<SaveHomeworkModalProps> = ({
  open,
  initialName,
  saving,
  onCancel,
  onConfirm,
}) => {
  const [form] = Form.useForm<SaveHomeworkValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ name: initialName });
    }
  }, [form, initialName, open]);

  const handleOk = async () => {
    let values: SaveHomeworkValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const error = await onConfirm(values.name.trim());
    if (error) {
      form.setFields([{ name: 'name', errors: [error] }]);
    }
  };

  return (
    <Modal
      title="保存作业"
      open={open}
      width={480}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      onOk={() => void handleOk()}
      onCancel={onCancel}
      footer={(_, { OkBtn, CancelBtn }) => (
        <Space>
          <CancelBtn />
          <OkBtn />
        </Space>
      )}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="name"
          label="作业名称"
          rules={[
            { required: true, whitespace: true, message: '请输入作业名称' },
          ]}
        >
          <Input
            placeholder="请输入作业名称，同一学科下作业名称需唯一"
            allowClear
            maxLength={60}
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveHomeworkModal;
