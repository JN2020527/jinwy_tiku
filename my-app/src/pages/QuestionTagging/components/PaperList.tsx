import React from 'react';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { List, Pagination, Tag } from 'antd';
import type { Paper } from '../types';
import styles from './PaperList.less';

interface PaperListProps {
  papers: Paper[];
  currentPaperId: string;
  onPaperClick: (paperId: string) => void;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

const PaperList: React.FC<PaperListProps> = ({
  papers,
  currentPaperId,
  onPaperClick,
  pagination,
}) => {

  // 获取打标状态标签
  const getTagStatusTag = (paper: Paper) => {
    if (paper.taggedCount === paper.questionCount && paper.questionCount > 0) {
      return (
        <Tag
          color="#f6ffed"
          style={{
            color: '#52c41a',
            border: '1px solid #b7eb8f',
            margin: 0,
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <CheckOutlined style={{ marginRight: 4, fontSize: 10 }} />
          已完成
        </Tag>
      );
    }
    if (paper.taggedCount === 0) {
      return (
        <Tag
          color="#fafafa"
          style={{
            color: '#999',
            border: '1px solid #d9d9d9',
            margin: 0,
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <CloseOutlined
            style={{ marginRight: 4, fontSize: 10, color: '#666' }}
          />
          未打标
        </Tag>
      );
    }
    return (
      <Tag
        color="#fff7e6"
        style={{
          color: '#fa8c16',
          border: '1px solid #ffd591',
          margin: 0,
          fontSize: 12,
        }}
      >
        进行中
      </Tag>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 试卷列表 - 可滚动区域 */}
      <div
        className={styles.paperListScroll}
        style={{ flex: 1, overflowY: 'auto' }}
      >
        <List
          dataSource={papers}
          renderItem={(paper) => {
            const isCurrent = currentPaperId === paper.id;
            const progress =
              paper.questionCount > 0
                ? (paper.taggedCount / paper.questionCount) * 100
                : 0;

            return (
              <List.Item
                key={paper.id}
                style={{
                  padding: '12px',
                  marginBottom: 8,
                  border: isCurrent ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  borderRadius: 4,
                  background: isCurrent ? '#e6f7ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onClick={() => onPaperClick(paper.id)}
              >
                <div style={{ width: '100%' }}>
                  {/* 头部：试卷名称 + 状态 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginRight: 8,
                      }}
                      title={paper.name}
                    >
                      {paper.name}
                    </div>
                    {getTagStatusTag(paper)}
                  </div>

                  {/* 进度条 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        backgroundColor: '#f0f0f0',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: '#52c41a',
                          borderRadius: 3,
                          width: `${progress}%`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>
                      {paper.taggedCount}/{paper.questionCount}
                    </span>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </div>

      {/* 分页 - 固定底部 */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
          showSizeChanger
          size="small"
        />
      </div>
    </div>
  );
};

export default PaperList;
