import { UploadOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import React, { useState } from 'react';
import { createUploadTask } from '@/services/uploadTask';
import type { Grade, Source, Subject } from '../types';

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  name: string;
  upload?: UploadFile[];
  subject: Subject;
  grade: Grade;
  source: Source;
  sourceNote?: string;
  batch: string;
}

const SUBJECT_OPTIONS: Subject[] = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治',
];
const GRADE_OPTIONS: Grade[] = ['小学', '初中', '高中'];
const SOURCE_OPTIONS: Source[] = ['原创', '改编', '引用'];

const NewTaskModal: React.FC<NewTaskModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const source = Form.useWatch('source', form);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const fileName = values.upload?.[0]?.name;
      if (!fileName) {
        message.error('请选择 Word 文件');
        return;
      }
      setSubmitting(true);
      await createUploadTask({
        name: values.name,
        fileName,
        subject: values.subject,
        grade: values.grade,
        source: values.source,
        sourceNote: values.sourceNote,
        batch: values.batch,
      });
      message.success('任务创建成功');
      form.resetFields();
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="新建上传任务"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="创建"
      cancelText="取消"
      destroyOnClose
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ source: '原创' }}
        preserve={false}
      >
        <Form.Item
          name="name"
          label="任务名"
          rules={[
            { required: true, message: '请输入任务名' },
            { min: 2, message: '任务名至少 2 个字符' },
          ]}
        >
          <Input placeholder="例如：2024 秋季高一物理周练 A" maxLength={60} />
        </Form.Item>

        <Form.Item
          name="upload"
          label="Word 文件"
          valuePropName="fileList"
          getValueFromEvent={(e) =>
            Array.isArray(e) ? e : e?.fileList?.slice(-1) ?? []
          }
          rules={[
            {
              validator: (_rule, value: UploadFile[] | undefined) => {
                if (value && value.length > 0) return Promise.resolve();
                return Promise.reject(new Error('请选择 Word 文件'));
              },
            },
          ]}
        >
          <Upload accept=".docx" maxCount={1} beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>选择 .docx 文件</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="subject"
          label="科目"
          rules={[{ required: true, message: '请选择科目' }]}
        >
          <Select
            placeholder="请选择"
            options={SUBJECT_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item
          name="grade"
          label="年级段"
          rules={[{ required: true, message: '请选择年级段' }]}
        >
          <Select
            placeholder="请选择"
            options={GRADE_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item
          name="source"
          label="来源类型"
          rules={[{ required: true, message: '请选择来源类型' }]}
        >
          <Radio.Group>
            {SOURCE_OPTIONS.map((s) => (
              <Radio key={s} value={s}>
                {s}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {source && source !== '原创' && (
          <Form.Item
            name="sourceNote"
            label="来源说明"
            rules={[{ required: true, message: '请填写来源说明' }]}
          >
            <Input placeholder="例如：改编自 2023 年某校期中卷第 12 题" />
          </Form.Item>
        )}

        <Form.Item
          name="batch"
          label="批次"
          rules={[{ required: true, message: '请输入批次号' }]}
        >
          <Input placeholder="例如：2024-12-A" maxLength={32} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NewTaskModal;
