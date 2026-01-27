import { ProForm, ProFormSelect } from '@ant-design/pro-components';
import { Col, Input, Row } from 'antd';
import React from 'react';
import { mockSubjects } from '../mockData';
import { FilterParams } from '../types';

interface FilterPanelProps {
  mode?: 'question' | 'paper';
  onFilterChange: (filters: Partial<FilterParams>) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ mode = 'question', onFilterChange }) => {
  const [form] = ProForm.useForm();

  const handleValuesChange = (_: any, allValues: any) => {
    onFilterChange(allValues);
  };

  // 学科选项（添加"全部"选项）
  const subjectOptions = [
    { label: '全部', value: '' },
    ...mockSubjects,
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <ProForm
        form={form}
        submitter={false}
        onValuesChange={handleValuesChange}
        layout="vertical"
        initialValues={{
          subject: '', // 默认选中"全部"
          tagStatus: '全部',
        }}
      >
        {/* 关键字搜索框 */}
        <ProForm.Item name="keyword" style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder={mode === 'paper' ? '搜索试卷名称' : '搜索试卷/题干内容'}
            allowClear
            onSearch={(value) => {
              form.setFieldsValue({ keyword: value });
              onFilterChange({ ...form.getFieldsValue(), keyword: value });
            }}
          />
        </ProForm.Item>

        {/* 学科和打标状态并列 */}
        <Row gutter={12}>
          <Col span={12}>
            <ProFormSelect
              name="subject"
              placeholder="请选择学科"
              options={subjectOptions}
              fieldProps={{
                style: { width: '100%' },
              }}
              formItemProps={{
                style: { marginBottom: 0 },
              }}
            />
          </Col>
          <Col span={12}>
            <ProFormSelect
              name="tagStatus"
              placeholder="完成状态"
              options={[
                { label: '全部', value: '全部' },
                { label: '已完成', value: '已完成' },
                { label: '部分完成', value: '部分完成' },
                { label: '未完成', value: '未完成' },
              ]}
              fieldProps={{
                style: { width: '100%' },
              }}
              formItemProps={{
                style: { marginBottom: 0 },
              }}
            />
          </Col>
        </Row>
      </ProForm>
    </div>
  );
};

export default FilterPanel;
