import RichTextEditor from '@/components/RichTextEditor';
import { Button } from 'antd';
import React from 'react';
import styles from '../ParseReviewWorkspace.less';

interface AnswerEditorProps {
  answer: string;
  analysis: string;
  hasChanges: boolean;
  saving: boolean;
  readOnly: boolean;
  onAnswerChange: (value: string) => void;
  onAnalysisChange: (value: string) => void;
  onSave: () => void;
}

const AnswerEditor: React.FC<AnswerEditorProps> = ({
  answer,
  analysis,
  hasChanges,
  saving,
  readOnly,
  onAnswerChange,
  onAnalysisChange,
  onSave,
}) => (
  <div className={styles.editorPanel}>
    <div className={styles.editorContent}>
      <div className={styles.editorField}>
        <div className={styles.sectionLabel}>
          答案
          <span className={styles.aiTag}>AI 生成</span>
        </div>
        <div className={styles.editorWrap} style={{ minHeight: 60 }}>
          {readOnly ? (
            <div
              className={styles.readonlyContent}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          ) : (
            <RichTextEditor
              value={answer}
              onChange={onAnswerChange}
              placeholder="输入答案..."
            />
          )}
        </div>
      </div>

      <div className={styles.editorField}>
        <div className={styles.sectionLabel}>
          解析
          <span className={styles.aiTag}>AI 生成</span>
        </div>
        <div className={styles.editorWrap} style={{ minHeight: 200 }}>
          {readOnly ? (
            <div
              className={styles.readonlyContent}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: analysis }}
            />
          ) : (
            <RichTextEditor
              value={analysis}
              onChange={onAnalysisChange}
              placeholder="输入解析..."
            />
          )}
        </div>
      </div>
    </div>

    {!readOnly && (
      <div className={styles.editorToolbar}>
        <span className={styles.toolbarHint}>Ctrl+Enter 保存下一题</span>
        <Button
          type="primary"
          loading={saving}
          disabled={!hasChanges}
          onClick={onSave}
        >
          保存并下一题 →
        </Button>
      </div>
    )}
  </div>
);

export default AnswerEditor;
