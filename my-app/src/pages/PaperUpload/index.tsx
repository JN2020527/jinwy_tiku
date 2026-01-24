import { uploadPaper } from '@/services/paperUpload';
import {
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormUploadDragger,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Card, message, Segmented } from 'antd';
import { useState } from 'react';

const PaperUpload: React.FC = () => {
  const [mode, setMode] = useState<'paper' | 'question'>('paper');

  const [form] = ProForm.useForm();

  const handleFinish = async (values: any) => {
    const file = values.file?.[0]?.originFileObj;
    if (!file) {
      message.error('请上传文件');
      return false;
    }

    const hide = message.loading('正在上传并解析...');
    try {
      const result = await uploadPaper(file, { ...values, mode });
      hide();
      if (result.success) {
        message.success('上传成功，即将进入校对页面');
        history.push(
          `/question-bank/word-upload/edit?taskId=${result.data.taskId}`,
        );
      }
      return true;
    } catch (error) {
      hide();
      message.error('上传失败，请重试');
      return false;
    }
  };

  return (
    <PageContainer title="试题上传">
      <Card>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Segmented
            options={[
              { label: '试卷录入模式', value: 'paper' },
              { label: '试题录入模式', value: 'question' },
            ]}
            value={mode}
            onChange={(val) => setMode(val as 'paper' | 'question')}
          />
        </div>

        <ProForm
          form={form}
          onFinish={handleFinish}
          submitter={{
            searchConfig: {
              submitText: '下一步：智能解析',
            },
          }}
          grid={true}
          rowProps={{
            gutter: [16, 16],
          }}
        >
          <ProFormUploadDragger
            name="file"
            label="上传文件"
            title="点击或拖拽文件到此处上传"
            description="支持 .docx 格式，文件大小不超过 10MB"
            max={1}
            fieldProps={{
              accept: '.docx',
              beforeUpload: (file) => {
                const fileName = file.name.replace(/\.[^/.]+$/, '');
                form.setFieldsValue({ name: fileName });
                return false;
              },
            }}
            rules={[{ required: true, message: '请上传文件' }]}
            colProps={{ span: 24 }}
          />

          <ProFormText
            name="name"
            label="试卷名称"
            placeholder="请输入试卷名称（默认使用文件名）"
            rules={[{ required: mode === 'paper', message: '请输入试卷名称' }]}
            hidden={mode === 'question'}
            colProps={{ span: 24 }}
          />

          <ProFormSelect
            name="subject"
            label="学科"
            colProps={{ span: 6 }}
            valueEnum={{
              math: '数学',
              chinese: '语文',
              english: '英语',
              physics: '物理',
              chemistry: '化学',
            }}
            rules={[{ required: true, message: '请选择学科' }]}
          />

          <ProFormSelect
            name="year"
            label="年份"
            colProps={{ span: 6 }}
            valueEnum={{
              '2026': '2026',
              '2025': '2025',
              '2024': '2024',
            }}
            hidden={mode === 'question'}
          />

          <ProFormSelect
            name="source"
            label="试题来源"
            colProps={{ span: 6 }}
            options={[
              { label: '真题', value: 'real' },
              { label: '模拟题', value: 'mock' },
              { label: '原创', value: 'original' },
            ]}
            hidden={mode === 'question'}
          />

          <ProFormSelect
            name="region"
            label="地区"
            colProps={{ span: 6 }}
            options={[
              { label: '全国', value: 'national' },
              { label: '北京', value: 'beijing' },
              { label: '上海', value: 'shanghai' },
              { label: '山西', value: 'shanxi' },
              { label: '江苏', value: 'jiangsu' },
            ]}
            hidden={mode === 'question'}
          />
        </ProForm>
      </Card>
    </PageContainer>
  );
};

export default PaperUpload;
