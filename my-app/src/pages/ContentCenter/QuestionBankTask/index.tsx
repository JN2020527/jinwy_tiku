import { addTask, deleteTask, getTasks, TaskItem, updateTask } from '@/services/questionBankTask';
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Modal } from 'antd';
import React, { useRef } from 'react';

const QuestionBankTask: React.FC = () => {
    const actionRef = useRef<ActionType>();

    const handleRemove = async (selectedRows: TaskItem[]) => {
        const hide = message.loading('正在删除');
        if (!selectedRows) return true;
        try {
            await deleteTask({
                id: selectedRows.find((row) => row.id)?.id || 0,
            });
            hide();
            message.success('删除成功');
            actionRef.current?.reload();
            return true;
        } catch (error) {
            hide();
            message.error('删除失败，请重试');
            return false;
        }
    };

    const columns: ProColumns<TaskItem>[] = [
        {
            title: '任务ID',
            dataIndex: 'id',
            search: false,
            width: 80,
        },
        {
            title: '任务名称',
            dataIndex: 'name',
            copyable: true,
            ellipsis: true,
            formItemProps: {
                rules: [
                    {
                        required: true,
                        message: '此项为必填项',
                    },
                ],
            },
        },
        {
            title: '文档类型',
            dataIndex: 'type',
            valueEnum: {
                all: { text: '全部', status: 'Default' },
                试卷: { text: '试卷', status: 'Processing' },
                教材: { text: '教材', status: 'Success' },
            },
            search: false,
            width: 100,
        },
        {
            title: '任务状态',
            dataIndex: 'status',
            valueEnum: {
                all: { text: '全部', status: 'Default' },
                已发布: { text: '已发布', status: 'Success' },
                待审核: { text: '待审核', status: 'Warning' },
                草稿: { text: '草稿', status: 'Default' },
            },
            width: 100,
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            valueType: 'dateTime',
            search: false,
            sorter: true,
            width: 160,
        },
        {
            title: '操作',
            dataIndex: 'option',
            valueType: 'option',
            render: (_, record) => [
                <a
                    key="view"
                    onClick={() => {
                        message.info('查看试卷功能开发中');
                    }}
                >
                    查看试卷
                </a>,
                <a
                    key="snapshot"
                    onClick={() => {
                        message.info('查看快照功能开发中');
                    }}
                >
                    查看快照
                </a>,
                <a
                    key="edit"
                    onClick={() => {
                        message.info('编辑试卷功能开发中');
                    }}
                >
                    编辑试卷
                </a>,
                <a
                    key="delete"
                    onClick={() => {
                        Modal.confirm({
                            title: '确认删除',
                            content: '确定要删除这个任务吗？',
                            onOk: () => handleRemove([record]),
                        });
                    }}
                >
                    删除
                </a>,
                <a
                    key="log"
                    onClick={() => {
                        message.info('日志功能开发中');
                    }}
                >
                    日志
                </a>,
            ],
            width: 300,
        },
    ];

    return (
        <PageContainer>
            <ProTable<TaskItem>
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                toolBarRender={() => [
                    <Button
                        type="primary"
                        key="primary"
                        onClick={() => {
                            message.info('新建任务功能开发中');
                        }}
                    >
                        <PlusOutlined /> 新增
                    </Button>,
                ]}
                request={getTasks}
                columns={columns}
            />
        </PageContainer>
    );
};

export default QuestionBankTask;
