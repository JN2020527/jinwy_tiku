import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import { Button, Card, Descriptions, Divider, Popconfirm } from 'antd';
import React, { useRef } from 'react';

// Mock Product Data
const mockProductInfo = {
  id: '46',
  name: '晋文源九年级考试-名师精讲',
  displayTime: '2025-12-19 至 2026-06-30',
  activationType: '激活产品',
  status: '已上市',
};

type SubjectItem = {
  id: string;
  name: string;
  sort: number;
  intro: string;
  createTime: string;
  updateTime: string;
};

const SubjectManage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('id');

  const mockData: SubjectItem[] = [
    {
      id: '164',
      name: '语文',
      sort: 1,
      intro: '有',
      createTime: '2025-12-18 13:56:43',
      updateTime: '2025-12-18 13:59:27',
    },
    {
      id: '165',
      name: '数学',
      sort: 2,
      intro: '有',
      createTime: '2025-12-18 13:57:05',
      updateTime: '2025-12-18 14:09:50',
    },
    {
      id: '166',
      name: '英语',
      sort: 3,
      intro: '有',
      createTime: '2025-12-18 13:57:21',
      updateTime: '2025-12-18 14:25:16',
    },
    {
      id: '167',
      name: '物理',
      sort: 4,
      intro: '有',
      createTime: '2025-12-18 13:58:10',
      updateTime: '2025-12-18 14:30:22',
    },
  ];

  const columns: ProColumns<SubjectItem>[] = [
    {
      title: '科目ID',
      dataIndex: 'id',
      hideInSearch: true,
    },
    {
      title: '科目名称',
      dataIndex: 'name',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      hideInSearch: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      hideInSearch: true,
    },
    {
      title: '排序',
      dataIndex: 'sort',
    },
    {
      title: '科目介绍',
      dataIndex: 'intro',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <>
          <a key="edit">编辑科目</a>
          <Divider type="vertical" />
          <a key="view">查看科目</a>
          <Divider type="vertical" />

          <Popconfirm title="确定删除吗？" onConfirm={() => {}}>
            <a key="delete" style={{ color: 'red' }}>
              删除
            </a>
          </Popconfirm>
          <br />
          <a key="log">日志</a>
          <Divider type="vertical" />
          <a
            key="answers"
            onClick={() => {
              const subjectName = encodeURIComponent(record.name);
              window.location.href = `/content/product-list/answer-manage?subjectId=${
                record.id
              }&subjectName=${subjectName}&productId=${
                productId || mockProductInfo.id
              }`;
            }}
          >
            答案管理
          </a>
        </>
      ),
    },
  ];

  return (
    <PageContainer>
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="产品ID">
            {productId || mockProductInfo.id}
          </Descriptions.Item>
          <Descriptions.Item label="产品名称">
            {mockProductInfo.name}
          </Descriptions.Item>
          <Descriptions.Item label="展示时间">
            {mockProductInfo.displayTime}
          </Descriptions.Item>
          <Descriptions.Item label="激活类型">
            {mockProductInfo.activationType}
          </Descriptions.Item>
          <Descriptions.Item label="是否上市">
            {mockProductInfo.status}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <ProTable<SubjectItem>
        headerTitle=""
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          <Button type="primary" key="primary" icon={<PlusOutlined />}>
            新增科目
          </Button>,
        ]}
        request={async (params) => {
          console.log('Query params:', params);
          return {
            data: mockData,
            success: true,
            total: mockData.length,
          };
        }}
        columns={columns}
      />
    </PageContainer>
  );
};

export default SubjectManage;
