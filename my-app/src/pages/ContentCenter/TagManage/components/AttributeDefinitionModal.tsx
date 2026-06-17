import type {
  AttributeOptionAddMode,
  AttributeStatus,
  AttributeTarget,
} from '@/services/tagSystem';
import {
  ModalForm,
  ProFormDependency,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import React, { useMemo } from 'react';
import { ATTRIBUTE_TARGET_OPTIONS } from './attributeSettingsConstants';

export interface AttributeDefinitionFormValues {
  target: AttributeTarget;
  name: string;
  optionAddMode?: AttributeOptionAddMode;
  status: AttributeStatus;
}

interface AttributeDefinitionModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  activeTarget?: AttributeTarget;
  initialValues?: Partial<AttributeDefinitionFormValues>;
  onOpenChange: (open: boolean) => void;
  onFinish: (values: AttributeDefinitionFormValues) => Promise<boolean>;
}

const ATTRIBUTE_STATUS_OPTIONS: Array<{
  label: string;
  value: AttributeStatus;
}> = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];

const OPTION_ADD_MODE_OPTIONS: Array<{
  label: string;
  value: AttributeOptionAddMode;
}> = [
  { label: '统一添加', value: 'unified' },
  { label: '按学科添加', value: 'bySubject' },
];

const AttributeDefinitionModal: React.FC<AttributeDefinitionModalProps> = ({
  open,
  mode,
  activeTarget = 'question',
  initialValues,
  onOpenChange,
  onFinish,
}) => {
  const formInitialValues = useMemo<AttributeDefinitionFormValues>(
    () => ({
      target: initialValues?.target || activeTarget,
      name: initialValues?.name || '',
      optionAddMode: initialValues?.optionAddMode || 'unified',
      status: initialValues?.status || 'enabled',
    }),
    [activeTarget, initialValues],
  );

  return (
    <ModalForm<AttributeDefinitionFormValues>
      key={`${mode}-${formInitialValues.target}-${formInitialValues.name}`}
      title={mode === 'edit' ? '编辑属性' : '新增属性'}
      open={open}
      width={520}
      layout="vertical"
      initialValues={formInitialValues}
      modalProps={{ destroyOnClose: true }}
      onOpenChange={onOpenChange}
      onFinish={async (values) =>
        onFinish({
          ...values,
          name: values.name.trim(),
          optionAddMode: values.optionAddMode || 'unified',
        })
      }
    >
      <ProFormSelect
        name="target"
        label="归属对象"
        disabled={mode === 'edit'}
        options={ATTRIBUTE_TARGET_OPTIONS}
        rules={[{ required: true, message: '请选择归属对象' }]}
      />
      <ProFormText
        name="name"
        label="属性名称"
        placeholder="请输入属性名称"
        rules={[
          { required: true, message: '请输入属性名称' },
          {
            validator: async (_, value?: string) => {
              if (value?.trim()) {
                return;
              }

              throw new Error('请输入属性名称');
            },
          },
        ]}
      />
      <ProFormDependency name={['target']}>
        {({ target }: { target?: AttributeTarget }) =>
          target === 'question' ? (
            <ProFormRadio.Group
              name="optionAddMode"
              label="枚举值添加方式"
              options={OPTION_ADD_MODE_OPTIONS}
              rules={[{ required: true, message: '请选择枚举值添加方式' }]}
            />
          ) : null
        }
      </ProFormDependency>
      <ProFormRadio.Group
        name="status"
        label="状态"
        options={ATTRIBUTE_STATUS_OPTIONS}
        rules={[{ required: true, message: '请选择状态' }]}
      />
    </ModalForm>
  );
};

export default AttributeDefinitionModal;
