import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import '@wangeditor/editor/dist/css/style.css'; // 引入 css
import { message } from 'antd';
import React, { useEffect, useState } from 'react';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  style,
}) => {
  // editor 实例
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  // 编辑器内容
  const [html, setHtml] = useState(value || '');

  // 监听 value 变化，同步到 html
  useEffect(() => {
    if (value !== html) {
      setHtml(value || '');
    }
  }, [value]);

  // 模拟图片上传
  const customUploadInsertImage = (
    file: File,
    insertFn: (url: string, alt: string, href: string) => void,
  ) => {
    // 模拟上传过程
    message.loading({ content: '上传中...', key: 'upload' });
    setTimeout(() => {
      // 这里使用一个占位图或者 base64，实际项目中应上传到服务器
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        insertFn(base64, 'image', base64);
        message.success({ content: '上传成功', key: 'upload' });
      };
      reader.readAsDataURL(file);
    }, 1000);
  };

  // 工具栏配置
  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: ['fullScreen'],
  };

  // 编辑器配置
  const editorConfig: Partial<IEditorConfig> = {
    placeholder: placeholder || '请输入内容...',
    MENU_CONF: {
      uploadImage: {
        customUpload: customUploadInsertImage,
      },
    },
    hoverbarKeys: {
      formula: {
        menuKeys: ['editFormula'], // 公式 hover 菜单
      },
    },
  };

  // 及时销毁 editor ，重要！
  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  const handleChange = (editor: IDomEditor) => {
    const newHtml = editor.getHtml();
    setHtml(newHtml);
    if (onChange) {
      onChange(newHtml);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', zIndex: 100, ...style }}>
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        style={{ borderBottom: '1px solid #ccc' }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={html}
        onCreated={setEditor}
        onChange={handleChange}
        mode="default"
        style={{ height: '300px', overflowY: 'hidden' }}
      />
    </div>
  );
};

export default RichTextEditor;
