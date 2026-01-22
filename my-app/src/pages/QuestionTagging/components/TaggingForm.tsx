import { ProForm, ProFormCascader, ProFormRadio, ProFormSelect, ProFormTreeSelect } from '@ant-design/pro-components';
import { Button, Empty, message, Space, Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import { mockChapters, mockKnowledgeTree, mockQuestionTypes } from '../mockData';
import { Question } from '../types';

interface TaggingFormProps {
    question: Question | null;
    selectedQuestions: Question[];
    isBatchMode: boolean;
    onUpdate: (id: string, values: Partial<Question>) => void;
    onBatchUpdate: (ids: string[], values: Partial<Question>) => void;
    onSaveAndNext: () => void;
    onSkip: () => void;
}

const TaggingForm: React.FC<TaggingFormProps> = ({
    question,
    selectedQuestions,
    isBatchMode,
    onUpdate,
    onBatchUpdate,
    onSaveAndNext,
    onSkip
}) => {
    const [form] = ProForm.useForm();
    const [batchSwitches, setBatchSwitches] = useState({
        knowledgePoints: false,
        questionType: false,
        difficulty: false,
        chapters: false
    });

    // 单选模式：回显当前试题的标签
    useEffect(() => {
        if (!isBatchMode && question) {
            form.setFieldsValue({
                knowledgePoints: question.knowledgePoints || [],
                questionType: question.questionType,
                difficulty: question.difficulty,
                chapters: question.chapters || []
            });
        } else if (isBatchMode) {
            // 批量模式：清空表单
            form.resetFields();
            setBatchSwitches({
                knowledgePoints: false,
                questionType: false,
                difficulty: false,
                chapters: false
            });
        }
    }, [question, isBatchMode, form]);

    // 单选模式：自动保存
    const handleValuesChange = (_: any, allValues: any) => {
        if (!isBatchMode && question) {
            // 延迟500ms自动保存
            setTimeout(() => {
                onUpdate(question.id, allValues);
                message.success('保存成功', 1);
            }, 500);
        }
    };

    // 批量模式：应用到所有选中试题
    const handleBatchApply = () => {
        const values = form.getFieldsValue();
        const updates: Partial<Question> = {};

        // 只应用开启了 Switch 的字段
        if (batchSwitches.knowledgePoints) {
            updates.knowledgePoints = values.knowledgePoints;
        }
        if (batchSwitches.questionType) {
            updates.questionType = values.questionType;
        }
        if (batchSwitches.difficulty) {
            updates.difficulty = values.difficulty;
        }
        if (batchSwitches.chapters) {
            updates.chapters = values.chapters;
        }

        if (Object.keys(updates).length === 0) {
            message.warning('请至少开启一个字段的开关');
            return;
        }

        onBatchUpdate(selectedQuestions.map(q => q.id), updates);
        message.success(`已为 ${selectedQuestions.length} 道试题批量打标`);
    };

    // 未选中状态
    if (!isBatchMode && !question) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="请从左侧选择试题进行打标" />
                <div style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
                    <div>快捷键提示：</div>
                    <div>↑/↓ 切换试题</div>
                    <div>⌘+Enter 保存并下一题</div>
                </div>
            </div>
        );
    }

    // 批量模式
    if (isBatchMode) {
        return (
            <div>
                <div style={{
                    padding: '12px',
                    background: '#fff7e6',
                    borderRadius: 4,
                    marginBottom: 16,
                    textAlign: 'center',
                    border: '1px solid #ffd591'
                }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fa8c16' }}>
                        正在为 {selectedQuestions.length} 道试题批量打标
                    </span>
                </div>

                <ProForm
                    form={form}
                    submitter={false}
                    layout="vertical"
                >
                    {/* 知识点 */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600 }}>知识点</span>
                            <Switch
                                checked={batchSwitches.knowledgePoints}
                                onChange={(checked) => setBatchSwitches({ ...batchSwitches, knowledgePoints: checked })}
                                size="small"
                            />
                        </div>
                        <ProFormTreeSelect
                            name="knowledgePoints"
                            fieldProps={{
                                treeData: mockKnowledgeTree,
                                multiple: true,
                                treeCheckable: true,
                                placeholder: '请选择知识点',
                                disabled: !batchSwitches.knowledgePoints,
                                showSearch: true,
                                treeNodeFilterProp: 'title'
                            }}
                        />
                    </div>

                    {/* 题型 */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600 }}>题型</span>
                            <Switch
                                checked={batchSwitches.questionType}
                                onChange={(checked) => setBatchSwitches({ ...batchSwitches, questionType: checked })}
                                size="small"
                            />
                        </div>
                        <ProFormSelect
                            name="questionType"
                            fieldProps={{
                                options: mockQuestionTypes,
                                placeholder: '请选择题型',
                                disabled: !batchSwitches.questionType
                            }}
                        />
                    </div>

                    {/* 难度 */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600 }}>难度</span>
                            <Switch
                                checked={batchSwitches.difficulty}
                                onChange={(checked) => setBatchSwitches({ ...batchSwitches, difficulty: checked })}
                                size="small"
                            />
                        </div>
                        <ProFormRadio.Group
                            name="difficulty"
                            options={[
                                { label: '简单', value: 'easy' },
                                { label: '中等', value: 'medium' },
                                { label: '困难', value: 'hard' }
                            ]}
                            fieldProps={{
                                disabled: !batchSwitches.difficulty
                            }}
                        />
                    </div>

                    {/* 教材章节 */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600 }}>教材章节</span>
                            <Switch
                                checked={batchSwitches.chapters}
                                onChange={(checked) => setBatchSwitches({ ...batchSwitches, chapters: checked })}
                                size="small"
                            />
                        </div>
                        <ProFormCascader
                            name="chapters"
                            fieldProps={{
                                options: mockChapters,
                                multiple: true,
                                placeholder: '请选择教材章节',
                                disabled: !batchSwitches.chapters,
                                showSearch: true
                            }}
                        />
                    </div>
                </ProForm>

                {/* 底部操作按钮 */}
                <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                    <Button block onClick={() => onBatchUpdate([], {})}>
                        取消
                    </Button>
                    <Button type="primary" block onClick={handleBatchApply}>
                        应用到所有选中试题
                    </Button>
                </div>
            </div>
        );
    }

    // 单选模式
    return (
        <div>
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f0f0f0', borderRadius: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                    第 {question?.number} 题 - {question?.type}
                </span>
            </div>

            <ProForm
                form={form}
                submitter={false}
                onValuesChange={handleValuesChange}
                layout="vertical"
            >
                <ProFormTreeSelect
                    name="knowledgePoints"
                    label="知识点"
                    fieldProps={{
                        treeData: mockKnowledgeTree,
                        multiple: true,
                        treeCheckable: true,
                        placeholder: '请选择知识点',
                        showSearch: true,
                        treeNodeFilterProp: 'title'
                    }}
                />

                <ProFormSelect
                    name="questionType"
                    label="题型"
                    fieldProps={{
                        options: mockQuestionTypes,
                        placeholder: '请选择题型'
                    }}
                />

                <ProFormRadio.Group
                    name="difficulty"
                    label="难度"
                    options={[
                        { label: '简单', value: 'easy' },
                        { label: '中等', value: 'medium' },
                        { label: '困难', value: 'hard' }
                    ]}
                />

                <ProFormCascader
                    name="chapters"
                    label="教材章节"
                    fieldProps={{
                        options: mockChapters,
                        multiple: true,
                        placeholder: '请选择教材章节',
                        showSearch: true
                    }}
                />
            </ProForm>

            {/* 快捷操作 */}
            <div style={{ marginTop: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" block onClick={onSaveAndNext}>
                        保存并下一题 (⌘+Enter)
                    </Button>
                    <Button block onClick={onSkip}>
                        跳过
                    </Button>
                </Space>
            </div>

            {/* 快捷键提示 */}
            <div style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
                <div>快捷键：↑/↓ 切换 | ←/→ 导航 | ⌘+Enter 保存</div>
            </div>
        </div>
    );
};

export default TaggingForm;
