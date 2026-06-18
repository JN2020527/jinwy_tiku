import type { AttributeItem, AttributeStatus } from '@/services/tagSystem';
import {
  ModalForm,
  ProFormRadio,
  ProFormText,
} from '@ant-design/pro-components';
import React, { useMemo } from 'react';

export interface AttributeOptionFormValues {
  name: string;
  status: AttributeStatus;
}

interface AttributeOptionModalProps {
  open: boolean;
  option?: AttributeItem;
  onOpenChange: (open: boolean) => void;
  onFinish: (values: AttributeOptionFormValues) => Promise<boolean>;
}

const ATTRIBUTE_OPTION_STATUS_OPTIONS: Array<{
  label: string;
  value: AttributeStatus;
}> = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];

const AttributeOptionModal: React.FC<AttributeOptionModalProps> = ({
  open,
  option,
  onOpenChange,
  onFinish,
}) => {
  const formInitialValues = useMemo<AttributeOptionFormValues>(
    () => ({
      name: option?.name || '',
      status: option?.status || 'enabled',
    }),
    [option],
  );

  return (
    <ModalForm<AttributeOptionFormValues>
      key={option?.id || 'attribute-option'}
      title="编辑枚举值"
      open={open}
      width={480}
      layout="vertical"
      initialValues={formInitialValues}
      modalProps={{ destroyOnClose: true }}
      onOpenChange={onOpenChange}
      onFinish={async (values) =>
        onFinish({
          name: values.name.trim(),
          status: values.status || 'enabled',
        })
      }
    >
      <ProFormText
        name="name"
        label="枚举值名称"
        placeholder="请输入枚举值名称…"
        rules={[
          { required: true, message: '请输入枚举值名称' },
          {
            validator: async (_, value?: string) => {
              if (value?.trim()) {
                return;
              }

              throw new Error('请输入枚举值名称');
            },
          },
        ]}
      />
      <ProFormRadio.Group
        name="status"
        label="启用状态"
        options={ATTRIBUTE_OPTION_STATUS_OPTIONS}
        rules={[{ required: true, message: '请选择启用状态' }]}
      />
    </ModalForm>
  );
};

export default AttributeOptionModal;
