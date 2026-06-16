import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  Input,
  Radio,
  Space,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useState } from 'react';
import type { DistributeConfig, Grade, Subject, UploadTask } from '../../types';
import styles from './DistributeForm.less';

export interface DistributeFormProps {
  task: UploadTask;
  initial: DistributeConfig | null;
  onSave: (config: DistributeConfig) => Promise<void>;
  readOnly?: boolean;
}

const GRADE_OPTIONS: Grade[] = ['小学', '初中', '高中'];
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
const ROLE_OPTIONS: Array<{
  label: string;
  value: 'teacher' | 'student' | 'admin';
}> = [
  { label: '教师端', value: 'teacher' },
  { label: '学生端', value: 'student' },
  { label: '管理员端', value: 'admin' },
];
const CHANNEL_OPTIONS: Array<{
  value: 'paper-bank' | 'api' | 'export' | 'recommend';
  label: string;
  desc: string;
}> = [
  { value: 'paper-bank', label: '组卷库', desc: '进入组卷功能可选题池' },
  { value: 'api', label: 'API 开放', desc: '外部系统通过 API 调用' },
  { value: 'export', label: '题库导出', desc: '允许批量导出 Word/PDF/Excel' },
  { value: 'recommend', label: '推荐引擎', desc: '根据知识点自动推送给学生' },
];

interface FormValues {
  institutions: 'all' | 'partners' | 'internal';
  grades: Grade[];
  subjects: Subject[];
  roles: Array<'teacher' | 'student' | 'admin'>;
  validityMode: 'forever' | 'until';
  validUntil?: Dayjs;
  channels: Array<'paper-bank' | 'api' | 'export' | 'recommend'>;
}

function toInitialValues(initial: DistributeConfig | null): FormValues {
  if (!initial) {
    return {
      institutions: 'all',
      grades: [],
      subjects: [],
      roles: [],
      validityMode: 'forever',
      channels: [],
    };
  }
  return {
    institutions: initial.scope.institutions,
    grades: initial.scope.grades,
    subjects: initial.scope.subjects,
    roles: initial.scope.roles,
    validityMode: initial.scope.validUntil ? 'until' : 'forever',
    validUntil: initial.scope.validUntil
      ? dayjs(initial.scope.validUntil)
      : undefined,
    channels: initial.channels,
  };
}

const DistributeForm: React.FC<DistributeFormProps> = ({
  task,
  initial,
  onSave,
  readOnly = false,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [editing, setEditing] = useState<boolean>(!initial);
  const [submitting, setSubmitting] = useState(false);
  const [validityMode, setValidityMode] = useState<'forever' | 'until'>(
    initial?.scope.validUntil ? 'until' : 'forever',
  );

  const disabled = readOnly || (!editing && !!initial);

  const handleSubmit = async (vals: FormValues) => {
    if (!vals.institutions) {
      message.error('请选择机构范围');
      return;
    }
    if (vals.grades.length === 0) {
      message.error('请至少选择 1 个适用年级段');
      return;
    }
    if (vals.subjects.length === 0) {
      message.error('请至少选择 1 个适用科目');
      return;
    }
    if (vals.roles.length === 0) {
      message.error('请至少选择 1 个用户角色');
      return;
    }
    if (vals.channels.length === 0) {
      message.error('请至少选择 1 个分发渠道');
      return;
    }
    if (vals.validityMode === 'until' && !vals.validUntil) {
      message.error('请选择截止日期');
      return;
    }

    const config: DistributeConfig = {
      taskId: task.id,
      scope: {
        institutions: vals.institutions,
        grades: vals.grades,
        subjects: vals.subjects,
        roles: vals.roles,
        validUntil:
          vals.validityMode === 'until' && vals.validUntil
            ? vals.validUntil.format('YYYY-MM-DD')
            : undefined,
      },
      channels: vals.channels,
    };

    setSubmitting(true);
    try {
      await onSave(config);
      message.success('已保存分发配置');
      setEditing(false);
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.distributeRoot}>
      <h2 className={styles.title}>分发配置</h2>

      {initial?.configuredAt && (
        <Alert
          type="success"
          showIcon
          message={
            <Space>
              <span>
                已分发至 {initial.channels.length} 渠道 · 配置时间{' '}
                {initial.configuredAt}
              </span>
              {!readOnly && !editing && (
                <Button size="small" onClick={() => setEditing(true)}>
                  修改
                </Button>
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={toInitialValues(initial)}
        onFinish={handleSubmit}
        disabled={disabled}
        onValuesChange={(changed) => {
          if (changed.validityMode) setValidityMode(changed.validityMode);
        }}
      >
        <Divider orientation="left">第一步：分发范围</Divider>

        <Form.Item label="机构范围" name="institutions">
          <Radio.Group>
            <Radio value="all">全平台公开</Radio>
            <Radio value="partners">指定合作机构</Radio>
            <Radio value="internal">仅内部</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="适用年级段" name="grades">
          <Checkbox.Group
            options={GRADE_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item label="适用科目" name="subjects">
          <Checkbox.Group
            options={SUBJECT_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item label="用户角色" name="roles">
          <Checkbox.Group options={ROLE_OPTIONS} />
        </Form.Item>

        <Form.Item label="有效期" name="validityMode">
          <Radio.Group>
            <Radio value="forever">永久有效</Radio>
            <Radio value="until">设定截止日期</Radio>
          </Radio.Group>
        </Form.Item>

        {validityMode === 'until' && (
          <Form.Item label="截止日期" name="validUntil">
            <DatePicker style={{ width: 240 }} />
          </Form.Item>
        )}

        <Divider orientation="left">第二步：分发渠道</Divider>

        <Form.Item name="channels">
          <Checkbox.Group style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {CHANNEL_OPTIONS.map((c) => (
                <Checkbox key={c.value} value={c.value}>
                  <span className={styles.channelLabel}>{c.label}</span>
                  <span className={styles.channelDesc}>{c.desc}</span>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item name="_placeholder" hidden>
          <Input />
        </Form.Item>

        {!readOnly && editing && (
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存分发配置
            </Button>
            <Button disabled title="原型不支持草稿">
              仅保存草稿
            </Button>
          </Space>
        )}
      </Form>
    </div>
  );
};

export default DistributeForm;
