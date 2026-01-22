import { ProForm, ProFormCascader, ProFormRadio, ProFormSelect } from '@ant-design/pro-components';
import { Input } from 'antd';
import React from 'react';
import { mockPapers, mockSubjects } from '../mockData';
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
                    tagStatus: 'all'
                }}
            >
                <ProFormSelect
                    name="subject"
                    label="科目"
                    options={mockSubjects}
                    placeholder="请选择科目"
                    allowClear
                    fieldProps={{
                        size: 'small'
                    }}
                />

                <ProFormCascader
                    name="paperId"
                    label="试卷"
                    fieldProps={{
                        options: mockPapers.map(p => ({ label: p.label, value: p.value })),
                        placeholder: '请选择试卷',
                        size: 'small',
                        showSearch: true
                    }}
                    allowClear
                />

                <ProFormRadio.Group
                    name="tagStatus"
                    label="标签状态"
                    options={[
                        { label: '全部', value: 'all' },
                        { label: '已完整打标', value: 'complete' },
                        { label: '部分打标', value: 'partial' },
                        { label: '未打标', value: 'untagged' }
                    ]}
                    fieldProps={{
                        size: 'small'
                    }}
                />

                <ProForm.Item label="关键词搜索" name="keyword">
                    <Input.Search
                        placeholder="搜索题干内容"
                        allowClear
                        size="small"
                        onSearch={(value) => {
                            form.setFieldsValue({ keyword: value });
                            onFilterChange({ ...form.getFieldsValue(), keyword: value });
                        }}
                    />
                </ProForm.Item>
            </ProForm>
        </div>
    );
};

export default FilterPanel;
