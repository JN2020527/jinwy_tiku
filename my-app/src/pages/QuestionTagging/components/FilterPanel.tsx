import { ProForm, ProFormSelect } from '@ant-design/pro-components';
import { Col, Input, Row } from 'antd';
import React from 'react';
import { mockSubjects } from '../mockData';
import { FilterParams } from '../types';

interface FilterPanelProps {
  onFilterChange: (filters: Partial<FilterParams>) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange }) => {
  const [form] = ProForm.useForm();

  const handleValuesChange = (_: any, allValues: any) => {
    onFilterChange(allValues);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <ProForm
        form={form}
        submitter={false}
        onValuesChange={handleValuesChange}
        layout="vertical"
        initialValues={{
          subject: mockSubjects[0]?.value, // 默认选中第一个学科
          tagStatus: 'all',
        }}
      >
        {/* 学科选择（必选，单独一行） */}
        <ProFormSelect
          name="subject"
          placeholder="请选择学科"
          options={mockSubjects}
          fieldProps={{
            style: { width: '100%' },
          }}
          formItemProps={{
            style: { marginBottom: 12 },
          }}
        />

        {/* 关键字搜索框 */}
        <ProForm.Item name="keyword" style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="搜索试卷/题干内容"
            allowClear
            onSearch={(value) => {
              form.setFieldsValue({ keyword: value });
              onFilterChange({ ...form.getFieldsValue(), keyword: value });
            }}
          />
        </ProForm.Item>

        {/* 打标状态 */}
        <ProFormSelect
          name="tagStatus"
          placeholder="打标状态"
          options={[
            { label: '全部', value: 'all' },
            { label: '已完整打标', value: 'complete' },
            { label: '部分打标', value: 'partial' },
            { label: '未打标', value: 'untagged' },
          ]}
          fieldProps={{
            style: { width: '100%' },
          }}
          formItemProps={{
            style: { marginBottom: 0 },
          }}
        />
      </ProForm>
    </div>
  );
};

export default FilterPanel;
