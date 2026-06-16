import { ThunderboltOutlined } from '@ant-design/icons';
import {
  DrawerForm,
  EditableProTable,
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormTimePicker,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Form, message } from 'antd';
import React, { useState } from 'react';
import type { AnswerItem, VideoQuestionItem, VideoSummaryItem } from './types';

interface VideoConfigDrawerProps {
  open: boolean;
  onOpenChange: (visible: boolean) => void;
  currentVideoItem: AnswerItem | undefined;
  onAnswerListChange: (
    updater: AnswerItem[] | ((prev: AnswerItem[]) => AnswerItem[]),
  ) => void;
}

const VideoConfigDrawer: React.FC<VideoConfigDrawerProps> = ({
  open,
  onOpenChange,
  currentVideoItem,
  onAnswerListChange,
}) => {
  const [form] = Form.useForm();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showVideoSummary, setShowVideoSummary] = useState(false);
  const [editableRowKeys, setEditableRowKeys] = useState<React.Key[]>([]);

  // Question Management State
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [currentEditingQuestion, setCurrentEditingQuestion] =
    useState<VideoQuestionItem>();
  const [questionForm] = Form.useForm();

  // Keep a local copy of video item so we can mutate questions during editing
  const [localVideoItem, setLocalVideoItem] = useState<AnswerItem>();

  // Sync localVideoItem from prop when opening
  React.useEffect(() => {
    if (open && currentVideoItem) {
      setLocalVideoItem({ ...currentVideoItem });
      setShowVideoSummary(
        !!(
          currentVideoItem.videoSummary &&
          currentVideoItem.videoSummary.length > 0
        ),
      );
    }
  }, [open, currentVideoItem]);

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setShowVideoSummary(true);
    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1500);
      });

      const mockSummary: VideoSummaryItem[] = [
        {
          id: Date.now().toString() + '1',
          startTime: '00:00:00',
          endTime: '00:05:00',
          content: 'AI生成：课程导入与背景介绍',
        },
        {
          id: Date.now().toString() + '2',
          startTime: '00:05:01',
          endTime: '00:15:30',
          content: 'AI生成：核心知识点深度解析',
        },
        {
          id: Date.now().toString() + '3',
          startTime: '00:15:31',
          endTime: '00:25:00',
          content: 'AI生成：典型例题分析与解题技巧',
        },
        {
          id: Date.now().toString() + '4',
          startTime: '00:25:01',
          endTime: '00:30:00',
          content: 'AI生成：课程总结与课后作业布置',
        },
      ];

      form.setFieldValue('videoSummary', mockSummary);
      message.success('AI摘要生成成功');
    } catch (error) {
      message.error('生成失败，请重试');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleQuestionSave = async (values: any) => {
    if (!localVideoItem) return false;

    let newQuestions = [...(localVideoItem.questions || [])];
    if (currentEditingQuestion) {
      newQuestions = newQuestions.map((q) =>
        q.id === currentEditingQuestion.id ? { ...q, ...values, id: q.id } : q,
      );
    } else {
      newQuestions.push({
        id: Date.now().toString(),
        ...values,
      });
    }

    const updatedVideoItem = {
      ...localVideoItem,
      questions: newQuestions,
    };
    setLocalVideoItem(updatedVideoItem);

    onAnswerListChange((prev: AnswerItem[]) =>
      prev.map((item) => {
        if (item.id === localVideoItem.id) {
          return updatedVideoItem;
        }
        return item;
      }),
    );

    message.success('保存成功');
    return true;
  };

  const handleQuestionDelete = (record: VideoQuestionItem) => {
    if (!localVideoItem) return;
    const newQuestions = (localVideoItem.questions || []).filter(
      (q) => q.id !== record.id,
    );
    const updatedVideoItem = {
      ...localVideoItem,
      questions: newQuestions,
    };
    setLocalVideoItem(updatedVideoItem);

    onAnswerListChange((prev: AnswerItem[]) =>
      prev.map((item) => {
        if (item.id === localVideoItem.id) {
          return updatedVideoItem;
        }
        return item;
      }),
    );
    message.success('删除成功');
  };

  return (
    <>
      <DrawerForm
        title="视频配置"
        width={800}
        open={open}
        onOpenChange={onOpenChange}
        form={form}
        drawerProps={{
          destroyOnClose: true,
          mask: true,
          maskClosable: true,
          maskStyle: { backgroundColor: 'transparent' },
        }}
        onFinish={async (values) => {
          onAnswerListChange((prev: AnswerItem[]) =>
            prev.map((item) => {
              if (item.id === localVideoItem?.id) {
                return {
                  ...item,
                  videoSummary: values.videoSummary,
                  questions: values.questions,
                };
              }
              return item;
            }),
          );
          message.success('配置保存成功');
          return true;
        }}
        initialValues={{
          videoSummary: currentVideoItem?.videoSummary,
          questions: currentVideoItem?.questions || [],
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>视频摘要</div>
            <Button
              type="primary"
              ghost
              size="small"
              icon={<ThunderboltOutlined />}
              loading={aiGenerating}
              onClick={handleAiGenerate}
            >
              AI生成视频摘要
            </Button>
          </div>
          {showVideoSummary && (
            <EditableProTable<VideoSummaryItem>
              name="videoSummary"
              rowKey="id"
              toolBarRender={false}
              columns={[
                {
                  title: '开始时间',
                  dataIndex: 'startTime',
                  valueType: 'time',
                  width: 110,
                  fieldProps: {
                    format: 'HH:mm:ss',
                  },
                  formItemProps: {
                    rules: [{ required: true, message: '此项为必填项' }],
                  },
                },
                {
                  title: '结束时间',
                  dataIndex: 'endTime',
                  valueType: 'time',
                  width: 110,
                  fieldProps: {
                    format: 'HH:mm:ss',
                  },
                  formItemProps: {
                    rules: [{ required: true, message: '此项为必填项' }],
                  },
                },
                {
                  title: '摘要内容',
                  dataIndex: 'content',
                  valueType: 'textarea',
                  formItemProps: {
                    rules: [{ required: true, message: '此项为必填项' }],
                  },
                },
                {
                  title: '操作',
                  valueType: 'option',
                  width: 120,
                  render: (text, record, _, action) => [
                    <a
                      key="editable"
                      onClick={() => {
                        action?.startEditable?.(record.id);
                      }}
                    >
                      编辑
                    </a>,
                    <a
                      key="delete"
                      onClick={() => {
                        const dataSource = form.getFieldValue(
                          'videoSummary',
                        ) as VideoSummaryItem[];
                        form.setFieldValue(
                          'videoSummary',
                          dataSource.filter((item) => item.id !== record.id),
                        );
                      }}
                    >
                      删除
                    </a>,
                  ],
                },
              ]}
              recordCreatorProps={{
                newRecordType: 'dataSource',
                record: () => ({
                  id: Date.now().toString(),
                  startTime: '00:00:00',
                  endTime: '00:00:00',
                  content: '',
                }),
              }}
              editable={{
                type: 'multiple',
                editableKeys: editableRowKeys,
                actionRender: (row, config, defaultDom) => [
                  defaultDom.save,
                  defaultDom.cancel,
                ],
                onSave: async (_rowKey) => {
                  // EditableProTable auto-save handler
                },
                onChange: setEditableRowKeys,
              }}
            />
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>选择题列表</div>
          </div>

          <ProTable<VideoQuestionItem>
            rowKey="id"
            dataSource={localVideoItem?.questions || []}
            search={false}
            options={false}
            pagination={false}
            columns={[
              {
                title: '时间点',
                dataIndex: 'time',
                valueType: 'time',
                width: 150,
                fieldProps: {
                  format: 'HH:mm:ss',
                },
              },
              {
                title: '题目名称',
                dataIndex: 'title',
              },
              {
                title: '操作',
                valueType: 'option',
                width: 120,
                render: (text, record) => [
                  <a
                    key="edit"
                    onClick={() => {
                      setCurrentEditingQuestion(record);
                      questionForm.setFieldsValue(record);
                      setQuestionModalVisible(true);
                    }}
                  >
                    编辑
                  </a>,
                  <a key="delete" onClick={() => handleQuestionDelete(record)}>
                    删除
                  </a>,
                ],
              },
            ]}
          />

          <Button
            type="dashed"
            style={{ width: '100%', marginTop: 16 }}
            onClick={() => {
              setCurrentEditingQuestion(undefined);
              questionForm.resetFields();
              setQuestionModalVisible(true);
            }}
          >
            + 添加一行数据
          </Button>
        </div>
      </DrawerForm>

      {/* Question Management Modal */}
      <ModalForm
        title={currentEditingQuestion ? '编辑互动题目' : '视频中插入选择题'}
        width={600}
        open={questionModalVisible}
        onOpenChange={setQuestionModalVisible}
        form={questionForm}
        modalProps={{ zIndex: 2000 }}
        layout="horizontal"
        labelCol={{ flex: '80px' }}
        onFinish={handleQuestionSave}
      >
        <ProFormTextArea
          name="title"
          label="题目"
          placeholder="请输入"
          rules={[{ required: true, message: '请输入题目' }]}
        />
        <ProFormTimePicker
          name="time"
          label="时间点"
          placeholder="请选择时间"
          fieldProps={{ format: 'HH:mm:ss' }}
          rules={[{ required: true, message: '请选择时间点' }]}
        />

        <ProFormText
          name="optionA"
          label="选项 A"
          placeholder="请输入"
          rules={[{ required: true, message: '请输入选项A' }]}
        />
        <ProFormText
          name="optionB"
          label="选项 B"
          placeholder="请输入"
          rules={[{ required: true, message: '请输入选项B' }]}
        />
        <ProFormText
          name="optionC"
          label="选项 C"
          placeholder="请输入"
          rules={[{ required: true, message: '请输入选项C' }]}
        />
        <ProFormText
          name="optionD"
          label="选项 D"
          placeholder="请输入"
          rules={[{ required: true, message: '请输入选项D' }]}
        />

        <ProFormSelect
          name="correctAnswer"
          label="答案"
          placeholder="请选择"
          options={[
            { label: 'A', value: 'A' },
            { label: 'B', value: 'B' },
            { label: 'C', value: 'C' },
            { label: 'D', value: 'D' },
          ]}
          rules={[{ required: true, message: '请选择答案' }]}
        />

        <ProFormText
          name="analysis"
          label="解析"
          placeholder="请输入"
          rules={[{ required: true, message: '请输入解析' }]}
        />
      </ModalForm>
    </>
  );
};

export default VideoConfigDrawer;
