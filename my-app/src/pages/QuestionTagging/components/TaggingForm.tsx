import {
  ProForm,
  ProFormRadio,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { Button, Empty, message, Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  mockAbilities,
  mockChapters,
  mockExamMethods,
  mockFeatures,
  mockKnowledgeTree,
  mockQuestionTypes,
} from '../mockData';
import { Question } from '../types';
import styles from './TaggingForm.less';

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
  onSkip,
}) => {
  const [form] = ProForm.useForm();
  const [batchSwitches, setBatchSwitches] = useState({
    knowledgePoints: false,
    questionType: false,
    difficulty: false,
    chapters: false,
    features: false,
    examMethod: false,
    ability: false,
  });

  // 单选模式：回显当前试题的标签
  useEffect(() => {
    if (!isBatchMode && question) {
      form.setFieldsValue({
        knowledgePoints: question.knowledgePoints || [],
        questionType: question.questionType,
        difficulty: question.difficulty,
        chapters: question.chapters,
        features: question.features,
        examMethod: question.examMethod,
        ability: question.ability,
      });
    } else if (isBatchMode) {
      // 批量模式：清空表单
      form.resetFields();
      setBatchSwitches({
        knowledgePoints: false,
        questionType: false,
        difficulty: false,
        chapters: false,
        features: false,
        examMethod: false,
        ability: false,
      });
    }
  }, [question, isBatchMode, form]);

  // 保存并下一题
  const handleSaveAndNext = async () => {
    if (!isBatchMode && question) {
      try {
        const values = await form.validateFields();
        onUpdate(question.id, values);
        message.success('保存成功', 1);
        onSaveAndNext();
      } catch {
        // 验证失败，不执行保存和跳转
      }
    } else {
      onSaveAndNext();
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
    if (batchSwitches.features) {
      updates.features = values.features;
    }
    if (batchSwitches.examMethod) {
      updates.examMethod = values.examMethod;
    }
    if (batchSwitches.ability) {
      updates.ability = values.ability;
    }

    if (Object.keys(updates).length === 0) {
      message.warning('请至少开启一个字段的开关');
      return;
    }

    onBatchUpdate(
      selectedQuestions.map((q) => q.id),
      updates,
    );
    message.success(`已为 ${selectedQuestions.length} 道试题批量打标`);
  };

  // 未选中状态
  if (!isBatchMode && !question) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Empty description="请从左侧选择试题进行打标" />
        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: '#999',
            textAlign: 'center',
          }}
        >
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
      <div className={styles.taggingForm}>
        <div
          style={{
            padding: '12px',
            background: '#fff7e6',
            borderRadius: 4,
            marginBottom: 16,
            textAlign: 'center',
            border: '1px solid #ffd591',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fa8c16' }}>
            正在为 {selectedQuestions.length} 道试题批量打标
          </span>
        </div>

        <ProForm form={form} submitter={false} layout="vertical">
          {/* 题型 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>题型</span>
              <Switch
                checked={batchSwitches.questionType}
                onChange={(checked) =>
                  setBatchSwitches({ ...batchSwitches, questionType: checked })
                }
                size="small"
              />
            </div>
            <ProFormTreeSelect
              name="questionType"
              fieldProps={{
                treeData: mockQuestionTypes,
                placeholder: '请选择题型',
                disabled: !batchSwitches.questionType,
                showSearch: true,
                treeNodeFilterProp: 'title',
              }}
            />
          </div>

          {/* 知识点 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>知识点</span>
              <Switch
                checked={batchSwitches.knowledgePoints}
                onChange={(checked) =>
                  setBatchSwitches({
                    ...batchSwitches,
                    knowledgePoints: checked,
                  })
                }
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
                treeNodeFilterProp: 'title',
              }}
            />
          </div>

          {/* 专题 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>专题</span>
              <Switch
                checked={batchSwitches.chapters}
                onChange={(checked) =>
                  setBatchSwitches({ ...batchSwitches, chapters: checked })
                }
                size="small"
              />
            </div>
            <ProFormTreeSelect
              name="chapters"
              fieldProps={{
                treeData: mockChapters,
                placeholder: '请选择专题',
                disabled: !batchSwitches.chapters,
                showSearch: true,
                treeNodeFilterProp: 'title',
              }}
            />
          </div>

          {/* 难度 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>难度</span>
              <Switch
                checked={batchSwitches.difficulty}
                onChange={(checked) =>
                  setBatchSwitches({ ...batchSwitches, difficulty: checked })
                }
                size="small"
              />
            </div>
            <ProFormRadio.Group
              name="difficulty"
              radioType="button"
              options={[
                { label: '简单', value: 'easy' },
                { label: '中等', value: 'medium' },
                { label: '困难', value: 'hard' },
              ]}
              fieldProps={{
                buttonStyle: 'solid',
                disabled: !batchSwitches.difficulty,
              }}
            />
          </div>

          {/* 中考特色 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>中考特色</span>
              <Switch
                checked={batchSwitches.features}
                onChange={(checked) =>
                  setBatchSwitches({ ...batchSwitches, features: checked })
                }
                size="small"
              />
            </div>
            <ProFormRadio.Group
              name="features"
              radioType="button"
              options={mockFeatures}
              fieldProps={{
                buttonStyle: 'solid',
                disabled: !batchSwitches.features,
              }}
            />
          </div>

          {/* 学科考法 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>学科考法</span>
              <Switch
                checked={batchSwitches.examMethod}
                onChange={(checked) =>
                  setBatchSwitches({ ...batchSwitches, examMethod: checked })
                }
                size="small"
              />
            </div>
            <ProFormRadio.Group
              name="examMethod"
              radioType="button"
              options={mockExamMethods}
              fieldProps={{
                buttonStyle: 'solid',
                disabled: !batchSwitches.examMethod,
              }}
            />
          </div>

          {/* 学科能力 */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>学科能力</span>
              <Switch
                checked={batchSwitches.ability}
                onChange={(checked) =>
                  setBatchSwitches({ ...batchSwitches, ability: checked })
                }
                size="small"
              />
            </div>
            <ProFormRadio.Group
              name="ability"
              radioType="button"
              options={mockAbilities}
              fieldProps={{
                buttonStyle: 'solid',
                disabled: !batchSwitches.ability,
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
    <div
      className={styles.taggingForm}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* 表单区域 - 可滚动 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ProForm
          form={form}
          submitter={false}
          onValuesChange={handleValuesChange}
          layout="vertical"
        >
          <ProFormTreeSelect
            name="questionType"
            label="题型"
            fieldProps={{
              treeData: mockQuestionTypes,
              placeholder: '请选择题型',
              showSearch: true,
              treeNodeFilterProp: 'title',
            }}
          />

          <ProFormTreeSelect
            name="knowledgePoints"
            label="知识点"
            fieldProps={{
              treeData: mockKnowledgeTree,
              multiple: true,
              treeCheckable: true,
              placeholder: '请选择知识点',
              showSearch: true,
              treeNodeFilterProp: 'title',
            }}
          />

          <ProFormTreeSelect
            name="chapters"
            label="专题"
            fieldProps={{
              treeData: mockChapters,
              placeholder: '请选择专题',
              showSearch: true,
              treeNodeFilterProp: 'title',
            }}
          />

          <ProFormRadio.Group
            name="difficulty"
            label="难度"
            radioType="button"
            fieldProps={{
              buttonStyle: 'solid',
            }}
            options={[
              { label: '简单', value: 'easy' },
              { label: '中等', value: 'medium' },
              { label: '困难', value: 'hard' },
            ]}
          />

          <ProFormRadio.Group
            name="features"
            label="中考特色"
            radioType="button"
            fieldProps={{
              buttonStyle: 'solid',
            }}
            options={mockFeatures}
          />

          <ProFormRadio.Group
            name="examMethod"
            label="学科考法"
            radioType="button"
            fieldProps={{
              buttonStyle: 'solid',
            }}
            options={mockExamMethods}
          />

          <ProFormRadio.Group
            name="ability"
            label="学科能力"
            radioType="button"
            fieldProps={{
              buttonStyle: 'solid',
            }}
            options={mockAbilities}
          />
        </ProForm>
      </div>

      {/* 底部操作按钮 - 固定底部 */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Button type="primary" block onClick={onSaveAndNext}>
          保存并下一题 (⌘+Enter)
        </Button>
      </div>
    </div>
  );
};

export default TaggingForm;
