import RichTextEditor from '@/components/RichTextEditor';
import { addQuestion, getQuestion, Question, updateQuestion } from '@/services/questionEntry';
import {
    ProForm,
    ProFormDependency,
    ProFormList,
    ProFormSelect,
    StepsForm,
} from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import { Button, Card, Form, message, Modal, Tag } from 'antd';
import React, { useEffect, useState, useRef } from 'react';

const SingleEntry: React.FC = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const formRef = useRef<any>();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<Question>();

    // Transform options for ProFormList <-> API
    const transformValues = (values: any) => {
        return {
            ...values,
            options: values.options?.map((opt: any) => opt.text),
        };
    };

    const transformInitialValues = (data: any) => {
        return {
            ...data,
            options: data.options?.map((opt: string) => ({ text: opt })),
        };
    };

    // Load data for editing
    useEffect(() => {
        if (id && formRef.current) {
            getQuestion(Number(id)).then((res) => {
                if (res.success) {
                    formRef.current.setFieldsValue(transformInitialValues(res.data));
                }
            });
        }
    }, [id]);

    const handleFinish = async (values: any) => {
        const data = { ...transformValues(values), id: id ? Number(id) : undefined };
        try {
            if (id) {
                await updateQuestion(data);
                message.success('更新成功');
                history.push('/question-bank/list');
            } else {
                await addQuestion(data);
                message.success('添加成功');
                history.push('/question-bank/list');
            }
            return true;
        } catch (error) {
            message.error('操作失败');
            return false;
        }
    };

    const handleSubmitAndContinue = async () => {
        const values = formRef.current?.getFieldsValue();
        // Validate Step 2 fields manually if needed, or rely on form state if possible.
        // Since we are inside the form, we can try to validate.
        try {
            await formRef.current?.validateFields(); // Validate all
            const data = transformValues(values);
            await addQuestion(data);
            message.success('添加成功，请继续录入下一题');

            // Clear Content fields but keep Context fields
            // Context fields: subject, grade, difficulty, type, tags
            // Content fields: content, options, answer, analysis
            const { subject, grade, difficulty, type, tags } = values;
            formRef.current?.resetFields();
            formRef.current?.setFieldsValue({
                subject, grade, difficulty, type, tags
            });
        } catch (error) {
            message.error('请完善试题信息');
        }
    };

    const handlePreview = async () => {
        const values = formRef.current?.getFieldsValue();
        setPreviewData(transformValues(values));
        setPreviewVisible(true);
    };

    return (
        <PageContainer title={id ? '编辑试题' : '单题录入'}>
            <Card bordered={false}>
                <StepsForm
                    formRef={formRef}
                    onFinish={handleFinish}
                    submitter={{
                        render: (props, dom) => {
                            if (props.step === 1) {
                                return [
                                    <Button key="pre" onClick={() => props.onPre?.()}>
                                        上一步
                                    </Button>,
                                    <Button key="preview" onClick={handlePreview}>
                                        预览
                                    </Button>,
                                    !id && (
                                        <Button key="saveAndContinue" type="primary" ghost onClick={handleSubmitAndContinue}>
                                            提交并继续录入
                                        </Button>
                                    ),
                                    <Button key="submit" type="primary" onClick={() => props.onSubmit?.()}>
                                        提交并返回列表
                                    </Button>,
                                ];
                            }
                            return dom;
                        },
                    }}
                >
                    <StepsForm.StepForm
                        name="context"
                        title="设置上下文"
                        stepProps={{
                            description: '设定学科、年级与知识点',
                        }}
                    >
                        <ProForm.Group>
                            <ProFormSelect
                                name="subject"
                                label="学科"
                                width="md"
                                options={['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治']}
                                rules={[{ required: true }]}
                            />
                            <ProFormSelect
                                name="grade"
                                label="年级/阶段"
                                width="md"
                                options={['初一', '初二', '初三']}
                                rules={[{ required: true }]}
                            />
                        </ProForm.Group>
                        <ProForm.Group>
                            <ProFormSelect
                                name="difficulty"
                                label="难度"
                                width="md"
                                options={['简单', '中等', '困难']}
                                rules={[{ required: true }]}
                            />
                            <ProFormSelect
                                name="type"
                                label="题型"
                                width="md"
                                options={['单选题', '多选题', '简答题']}
                                rules={[{ required: true }]}
                            />
                        </ProForm.Group>
                        <ProFormSelect
                            name="tags"
                            label="知识点/标签"
                            width="lg"
                            mode="multiple"
                            options={['函数', '几何', '力学', '电学', '古诗词', '阅读理解', '语法', '化学方程式']}
                            placeholder="请选择知识点（支持多选）"
                            rules={[{ required: true }]}
                        />
                    </StepsForm.StepForm>

                    <StepsForm.StepForm
                        name="content"
                        title="生产内容"
                        stepProps={{
                            description: '录入题干、选项与解析',
                        }}
                    >
                        <ProForm.Item
                            name="content"
                            label="题干内容"
                            rules={[{ required: true, message: '请输入题干内容' }]}
                        >
                            <RichTextEditor placeholder="请输入题干内容，支持公式和图片" />
                        </ProForm.Item>

                        <ProFormDependency name={['type']}>
                            {({ type }) => {
                                if (type === '单选题' || type === '多选题') {
                                    return (
                                        <ProFormList
                                            name="options"
                                            label="选项"
                                            creatorButtonProps={{
                                                position: 'bottom',
                                                creatorButtonText: '添加选项',
                                            }}
                                        >
                                            <ProForm.Item name="text" noStyle>
                                                <RichTextEditor placeholder="选项内容" style={{ height: 150, marginBottom: 10 }} />
                                            </ProForm.Item>
                                        </ProFormList>
                                    );
                                }
                                return null;
                            }}
                        </ProFormDependency>

                        <ProForm.Item
                            name="answer"
                            label="答案"
                            rules={[{ required: true, message: '请输入答案' }]}
                        >
                            <RichTextEditor placeholder="请输入答案" />
                        </ProForm.Item>

                        <ProForm.Item
                            name="analysis"
                            label="解析"
                        >
                            <RichTextEditor placeholder="请输入解析" />
                        </ProForm.Item>
                    </StepsForm.StepForm>
                </StepsForm>
            </Card>

            <Modal
                title="试题预览"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width={800}
            >
                {previewData && (
                    <div>
                        <Tag color="blue">{previewData.type}</Tag>
                        <Tag color={previewData.difficulty === '简单' ? 'green' : 'orange'}>{previewData.difficulty}</Tag>
                        <div style={{ marginTop: 16, fontWeight: 'bold' }} dangerouslySetInnerHTML={{ __html: previewData.content }} />
                        {previewData.options && (
                            <div style={{ marginTop: 8 }}>
                                {previewData.options.map((opt: any, index: number) => (
                                    <div key={index} style={{ padding: '4px 0' }}>{String.fromCharCode(65 + index)}. {opt}</div>
                                ))}
                            </div>
                        )}
                        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                            <div><strong>答案：</strong>{previewData.answer}</div>
                            <div style={{ marginTop: 8 }}><strong>解析：</strong>{previewData.analysis}</div>
                        </div>
                    </div>
                )}
            </Modal>
        </PageContainer>
    );
};

export default SingleEntry;
