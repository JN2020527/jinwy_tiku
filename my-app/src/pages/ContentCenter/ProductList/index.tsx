import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Divider, Popconfirm } from 'antd';
import React, { useRef } from 'react';

type ProductItem = {
  id: string;
  name: string;
  status: 'published' | 'pending' | 'offline';
  listingTime?: string;
  startTime: string;
  endTime: string;
  activationType: 'subject' | 'product';
  sort: number;
  totalCodes: number;
  boundCodes: number;
  unboundCodes: number;
};

const ProductList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const mockData: ProductItem[] = [
    {
      id: '10001',
      name: '领跑卷',
      status: 'published',
      listingTime: '2025-01-01',
      startTime: '2025-01-01',
      endTime: '2025-12-31',
      activationType: 'subject',
      sort: 1,
      totalCodes: 1000,
      boundCodes: 500,
      unboundCodes: 500,
    },
    {
      id: '10002',
      name: '听力封面测试',
      status: 'pending',
      listingTime: '-',
      startTime: '2025-02-01',
      endTime: '2025-06-30',
      activationType: 'product',
      sort: 2,
      totalCodes: 200,
      boundCodes: 0,
      unboundCodes: 200,
    },
    {
      id: '10003',
      name: '历史学科测试',
      status: 'pending',
      listingTime: '-',
      startTime: '2025-03-01',
      endTime: '2025-07-31',
      activationType: 'product',
      sort: 3,
      totalCodes: 500,
      boundCodes: 100,
      unboundCodes: 400,
    },
  ];

  const columns: ProColumns<ProductItem>[] = [
    {
      title: '产品ID',
      dataIndex: 'id',
      copyable: true,
      render: (dom, entity) => {
        return <a onClick={() => {}}>{dom}</a>;
      },
    },
    {
      title: '产品名称',
      dataIndex: 'name',
    },
    {
      title: '上市状态',
      dataIndex: 'status',
      valueEnum: {
        published: { text: '已上市', status: 'Success' },
        pending: { text: '待上市', status: 'Default' },
        offline: { text: '下架', status: 'Error' },
      },
    },
    {
      title: '上市时间',
      dataIndex: 'listingTime',
      valueType: 'date',
      hideInSearch: true,
    },
    {
      title: '展示开始时间',
      dataIndex: 'startTime',
      valueType: 'date',
      hideInSearch: true,
    },
    {
      title: '展示结束时间',
      dataIndex: 'endTime',
      valueType: 'date',
      hideInSearch: true,
    },
    {
      title: '激活码属性',
      dataIndex: 'activationType',
      hideInSearch: true,
      valueEnum: {
        subject: { text: '激活科目' },
        product: { text: '激活产品' },
      },
    },
    {
      title: '排序',
      dataIndex: 'sort',
      hideInSearch: true,
    },
    {
      title: '激活码数量',
      dataIndex: 'totalCodes',
      hideInSearch: true,
    },
    {
      title: '已绑定',
      dataIndex: 'boundCodes',
      hideInSearch: true,
    },
    {
      title: '未绑定',
      dataIndex: 'unboundCodes',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <>
          <a key="view">查看</a>
          <Divider type="vertical" />
          <a key="edit">编辑</a>
          <Divider type="vertical" />
          <Popconfirm title="确定删除吗？" onConfirm={() => {}}>
            <a key="delete" style={{ color: 'red' }}>
              删除
            </a>
          </Popconfirm>
          <Divider type="vertical" />
          <a key="log">日志</a>
          <Divider type="vertical" />
          <a
            key="subject"
            onClick={() => {
              // In a real app we would use history.push
              window.location.href = `/content/product-list/subject-manage?id=${record.id}`;
            }}
          >
            科目管理
          </a>
          {record.activationType === 'product' && (
            <>
              <Divider type="vertical" />
              <a key="activation">激活码管理</a>
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<ProductItem>
        headerTitle="产品列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button type="primary" key="primary" icon={<PlusOutlined />}>
            新增产品
          </Button>,
        ]}
        request={async (params) => {
          // Simulate request
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

export default ProductList;
