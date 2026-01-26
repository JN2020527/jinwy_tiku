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
        {/* 学科和打标状态并列 */}
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={12}>
            <ProFormSelect
              name="subject"
              placeholder="请选择学科"
              options={mockSubjects}
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
          </Col>
        </Row>

        {/* 关键字搜索框 */}
        {mode !== 'paper' && (
          <ProForm.Item name="keyword" style={{ marginBottom: 0 }}>
            <Input.Search
              placeholder="搜索试卷/题干内容"
              allowClear
              onSearch={(value) => {
                form.setFieldsValue({ keyword: value });
                onFilterChange({ ...form.getFieldsValue(), keyword: value });
              }}
            />
          </ProForm.Item>
        )}
      </ProForm>
    </div>
  );
};

export default FilterPanel;
