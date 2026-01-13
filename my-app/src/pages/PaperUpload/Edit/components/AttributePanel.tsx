import { QuestionItem } from '@/services/paperUpload';
import { ProForm, ProFormRate, ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { Card, Empty } from 'antd';
import React, { useEffect } from 'react';

interface AttributePanelProps {
    question: QuestionItem | null;
    onUpdate: (id: string, values: Partial<QuestionItem>) => void;
}

const AttributePanel: React.FC<AttributePanelProps> = ({ question, onUpdate }) => {
    const [form] = ProForm.useForm();

    useEffect(() => {
        if (question) {
            form.setFieldsValue({
                type: question.type,
                difficulty: question.difficulty,
                knowledgePoints: question.knowledgePoints,
            });
        } else {
            form.resetFields();
        }
    }, [question, form]);

    if (!question) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    background: '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: '#333'
                }}>
                    属性标引
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description="请选择一道题目" />
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                height: 50,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 600,
                fontSize: '15px',
                color: '#333'
            }}>
                {`属性标引 (第 ${question.number} 题)`}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <ProForm
                    form={form}
                    submitter={false}
                    onValuesChange={(_, allValues) => {
                        onUpdate(question.id, allValues);
                    }}
                    layout="vertical"
                >
                    <ProFormText name="type" label="题型" disabled />

                    <ProFormRate name="difficulty" label="难度系数" />

                    <ProFormSelect
                        name="knowledgePoints"
                        label="知识点"
                        mode="multiple"
                        options={[
                            { label: '中心对称', value: 'kp1' },
                            { label: '绝对值', value: 'kp2' },
                            { label: '阅读理解', value: 'kp3' },
                        ]}
                    />

                    {/* Add more attributes as needed */}
                </ProForm>
            </div>
        </div>
    );
};

export default AttributePanel;
