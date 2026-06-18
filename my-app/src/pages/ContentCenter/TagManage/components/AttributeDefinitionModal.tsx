import type {
  AttributeOptionAddMode,
  AttributeStatus,
  AttributeSubjectScope,
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
import {
  ATTRIBUTE_TARGET_OPTIONS,
  SUBJECT_OPTIONS,
} from './attributeSettingsConstants';

export interface AttributeDefinitionFormValues {
  target: AttributeTarget;
  name: string;
  optionAddMode?: AttributeOptionAddMode;
  subjectScope?: AttributeSubjectScope;
  applicableSubjects?: string[];
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
  { label: '统一维护', value: 'unified' },
  { label: '按学科维护', value: 'bySubject' },
];

const SUBJECT_SCOPE_OPTIONS: Array<{
  label: string;
  value: AttributeSubjectScope;
}> = [
  { label: '全部学科', value: 'all' },
  { label: '指定学科', value: 'specified' },
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
      subjectScope: initialValues?.subjectScope || 'all',
      applicableSubjects: initialValues?.applicableSubjects || [],
      status: initialValues?.status || 'enabled',
    }),
    [activeTarget, initialValues],
  );

  return (
    <ModalForm<AttributeDefinitionFormValues>
      key={`${mode}-${formInitialValues.target}-${formInitialValues.name}`}
      title={mode === 'edit' ? '编辑属性' : '新增属性'}
      open={open}
      width={620}
      layout="vertical"
      initialValues={formInitialValues}
      modalProps={{
        destroyOnClose: true,
        className: 'attribute-definition-modal',
      }}
      onOpenChange={onOpenChange}
      onFinish={async (values) =>
        onFinish({
          ...values,
          name: values.name.trim(),
          optionAddMode: values.optionAddMode || 'unified',
          subjectScope: values.subjectScope || 'all',
          applicableSubjects: values.applicableSubjects || [],
        })
      }
    >
      <div className="attribute-definition-form">
        <div className="attribute-definition-basic-grid">
          <ProFormText
            className="attribute-definition-full-field"
            name="name"
            label="属性名称"
            placeholder="请输入属性名称…"
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
          <ProFormSelect
            name="target"
            label="归属对象"
            disabled={mode === 'edit'}
            options={ATTRIBUTE_TARGET_OPTIONS}
            rules={[{ required: true, message: '请选择归属对象' }]}
          />
          <ProFormRadio.Group
            name="status"
            label="启用状态"
            radioType="button"
            fieldProps={{
              className: 'attribute-definition-status-radio',
            }}
            options={ATTRIBUTE_STATUS_OPTIONS}
            rules={[{ required: true, message: '请选择启用状态' }]}
          />
        </div>
        <ProFormDependency name={['target']}>
          {({ target }: { target?: AttributeTarget }) =>
            target === 'question' ? (
              <section className="attribute-definition-option-card">
                <ProFormRadio.Group
                  name="optionAddMode"
                  label="枚举值维护方式"
                  radioType="button"
                  fieldProps={{
                    className: 'attribute-definition-mode-radio',
                  }}
                  options={OPTION_ADD_MODE_OPTIONS}
                  rules={[{ required: true, message: '请选择枚举值维护方式' }]}
                />
                <ProFormDependency name={['optionAddMode', 'subjectScope']}>
                  {({
                    optionAddMode,
                    subjectScope,
                  }: {
                    optionAddMode?: AttributeOptionAddMode;
                    subjectScope?: AttributeSubjectScope;
                  }) =>
                    optionAddMode === 'bySubject' ? (
                      <div className="attribute-definition-subject-grid">
                        <ProFormRadio.Group
                          className={
                            subjectScope === 'specified'
                              ? ''
                              : 'attribute-definition-full-field'
                          }
                          name="subjectScope"
                          label="适用学科"
                          radioType="button"
                          fieldProps={{
                            className: 'attribute-definition-subject-radio',
                          }}
                          options={SUBJECT_SCOPE_OPTIONS}
                          rules={[
                            { required: true, message: '请选择适用学科' },
                          ]}
                        />
                        {subjectScope === 'specified' ? (
                          <ProFormSelect
                            name="applicableSubjects"
                            label="指定学科"
                            mode="multiple"
                            options={SUBJECT_OPTIONS}
                            placeholder="请选择学科…"
                            rules={[
                              {
                                required: true,
                                message: '请选择至少一个适用学科',
                              },
                            ]}
                          />
                        ) : null}
                      </div>
                    ) : null
                  }
                </ProFormDependency>
              </section>
            ) : null
          }
        </ProFormDependency>
      </div>
    </ModalForm>
  );
};

export default AttributeDefinitionModal;
