import type {
  AttachmentResourceVersion,
  ResourceVersion,
} from '@/services/tagSystem';
import {
  RESOURCE_CARRIER_LABELS,
  RESOURCE_VERSION_STATE_LABELS,
} from '@/services/tagSystem';
import {
  AudioOutlined,
  CloudDownloadOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Button, Modal, Tag } from 'antd';
import React, { useEffect, useState } from 'react';

interface ResourceVersionPreviewProps {
  open: boolean;
  resourceName: string;
  version: ResourceVersion | null;
  onClose: () => void;
}

const createPrototypeAudioPlaceholderUrl = () => {
  const sampleRate = 8000;
  const duration = 1.2;
  const sampleCount = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    [...text].forEach((character, index) =>
      view.setUint8(offset + index, character.charCodeAt(0)),
    );
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 600, (sampleCount - index) / 600);
    const sample =
      Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.08 * envelope;
    view.setInt16(44 + index * 2, sample * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

export interface PrototypeDownloadPlaceholder {
  fileName: string;
  mimeType: 'text/plain;charset=utf-8';
  content: string;
}

export const createPrototypeDownloadPlaceholder = (
  version: AttachmentResourceVersion,
): PrototypeDownloadPlaceholder => {
  const originalFileName = version.originalFileName;
  const safeOriginalFileName = originalFileName.replace(/[\\/:*?"<>|]/g, '_');
  return {
    fileName: `${safeOriginalFileName}.prototype-placeholder.txt`,
    mimeType: 'text/plain;charset=utf-8',
    content: [
      '资产中心原型下载占位说明（不是原始文件）',
      `版本：V${version.versionNumber}`,
      `产品约定的原始文件名：${originalFileName}`,
      `载体：${RESOURCE_CARRIER_LABELS[version.carrierType]}`,
      '',
      '当前纯前端 Mock 不保存上传文件字节；此文本 Blob 仅用于演示下载入口，不能作为原始文件使用。',
      '接入文件存储后，该入口应按上述原始文件名下载对应版本的真实文件。',
    ].join('\n'),
  };
};

const downloadPrototypePlaceholder = (version: AttachmentResourceVersion) => {
  const placeholder = createPrototypeDownloadPlaceholder(version);
  const url = URL.createObjectURL(
    new Blob([placeholder.content], { type: placeholder.mimeType }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = placeholder.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const PrototypeFileNotice: React.FC = () => (
  <div className="asset-version-preview-note" role="note">
    当前纯前端 Mock
    不保存真实文件字节；以下内容均为原型占位预览。“下载原型占位说明”只生成说明文本
    Blob，并非原始文件。接入文件存储后，此入口应下载对应附件版本的真实文件。
  </div>
);

export const OnlineCombinationPreviewNotice: React.FC = () => (
  <div className="asset-version-preview-note" role="note">
    当前 Mock
    只保存在线组合正式版本的身份与版本元数据，不保存原子化知识块、试题或排版快照。
    下方不是实际内容预览，只用于在切换当前版本前明确核对目标版本；在线版本没有附件原始文件名或下载入口。
  </div>
);

const PreviewHeader: React.FC<{
  icon: React.ReactNode;
  label: string;
  version: ResourceVersion;
}> = ({ icon, label, version }) => (
  <div className="asset-version-preview-heading">
    <span className="asset-version-preview-heading-icon">{icon}</span>
    <div>
      <strong>{label}</strong>
      <span>{version.originalFileName || '在线组合内容'}</span>
    </div>
    <Tag>原型占位</Tag>
  </div>
);

const ResourceVersionPreview: React.FC<ResourceVersionPreviewProps> = ({
  open,
  resourceName,
  version,
  onClose,
}) => {
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');

  useEffect(() => {
    if (!open || version?.carrierType !== 'audio') {
      setAudioPreviewUrl('');
      return undefined;
    }
    const url = createPrototypeAudioPlaceholderUrl();
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, version?.id, version?.carrierType]);

  const videoPoster = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#0f172a"/><circle cx="480" cy="245" r="58" fill="#2563eb"/><path d="M462 211l55 34-55 34z" fill="white"/><text x="480" y="355" text-anchor="middle" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="25">${resourceName.replace(
      /[<>&"']/g,
      '',
    )}</text><text x="480" y="394" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="18">PROTOTYPE VIDEO PLACEHOLDER</text></svg>`,
  )}`;

  const renderPreview = () => {
    if (!version) return null;

    if (version.carrierType === 'ppt') {
      return (
        <div className="asset-version-preview-adapter">
          <PreviewHeader
            icon={<FilePptOutlined />}
            label="PPT 原型占位预览"
            version={version}
          />
          <div
            className="asset-version-ppt-preview"
            role="img"
            aria-label="PPT 原型占位预览"
          >
            <div className="asset-version-ppt-slide-index">
              V{version.versionNumber} · 01 / 03
            </div>
            <span className="asset-version-ppt-eyebrow">课堂复习课件</span>
            <h3>{resourceName}</h3>
            <p>占位画布仅验证预览与生效流程，不包含原始 PPT 页面</p>
            <div className="asset-version-ppt-rule" />
          </div>
        </div>
      );
    }

    if (version.carrierType === 'pdf') {
      return (
        <div className="asset-version-preview-adapter">
          <PreviewHeader
            icon={<FilePdfOutlined />}
            label="PDF 原型占位预览"
            version={version}
          />
          <div className="asset-version-pdf-stage">
            <article
              className="asset-version-pdf-page"
              aria-label="PDF 原型占位预览第 1 页"
            >
              <span>拓展阅读 · V{version.versionNumber}</span>
              <h3>{resourceName}</h3>
              <div className="asset-version-pdf-line asset-version-pdf-line-wide" />
              <div className="asset-version-pdf-line" />
              <div className="asset-version-pdf-line" />
              <div className="asset-version-pdf-callout">
                PROTOTYPE PLACEHOLDER
              </div>
              <div className="asset-version-pdf-line asset-version-pdf-line-wide" />
              <div className="asset-version-pdf-line" />
            </article>
          </div>
        </div>
      );
    }

    if (version.carrierType === 'audio') {
      return (
        <div className="asset-version-preview-adapter">
          <PreviewHeader
            icon={<AudioOutlined />}
            label="音频原型占位预览"
            version={version}
          />
          <div className="asset-version-audio-preview">
            <span className="asset-version-audio-disc">
              <AudioOutlined />
            </span>
            <div>
              <strong>{resourceName}</strong>
              <span>合成试听音轨仅验证播放器，不包含原始音频字节</span>
              <audio
                controls
                preload="metadata"
                src={audioPreviewUrl}
                aria-label={`${resourceName} 音频原型占位预览`}
              />
            </div>
          </div>
        </div>
      );
    }

    if (version.carrierType === 'video') {
      return (
        <div className="asset-version-preview-adapter">
          <PreviewHeader
            icon={<VideoCameraOutlined />}
            label="视频原型占位预览"
            version={version}
          />
          <div className="asset-version-video-preview">
            <video
              controls
              preload="none"
              poster={videoPoster}
              aria-label={`${resourceName} 视频原型占位预览`}
            />
            <p>当前仅展示原型占位封面，不保存或播放原始视频流。</p>
          </div>
        </div>
      );
    }

    return (
      <div className="asset-version-preview-adapter">
        <PreviewHeader
          icon={<FileTextOutlined />}
          label="在线组合版本占位预览"
          version={version}
        />
        <div
          className="asset-version-online-preview"
          role="status"
          aria-label={`${resourceName} 在线组合版本元数据占位预览`}
        >
          <span className="asset-version-online-preview-icon">
            <FileTextOutlined />
          </span>
          <div>
            <span className="asset-version-online-preview-eyebrow">
              仅展示版本元数据
            </span>
            <h3>{resourceName}</h3>
            <p>
              <strong>这不是实际组合内容预览。</strong>
              当前原型没有可渲染的知识块、试题和排版快照。
            </p>
            <dl>
              <div>
                <dt>目标版本</dt>
                <dd>V{version.versionNumber}</dd>
              </div>
              <div>
                <dt>版本状态</dt>
                <dd>{RESOURCE_VERSION_STATE_LABELS[version.state]}</dd>
              </div>
              <div>
                <dt>内容载体</dt>
                <dd>{RESOURCE_CARRIER_LABELS[version.carrierType]}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={version ? `版本占位预览 V${version.versionNumber}` : '版本预览'}
      open={open}
      onCancel={onClose}
      width={820}
      destroyOnClose
      footer={
        version
          ? [
              ...(version.carrierType !== 'online'
                ? [
                    <Button
                      key="download"
                      icon={<CloudDownloadOutlined />}
                      onClick={() => downloadPrototypePlaceholder(version)}
                    >
                      下载原型占位说明
                    </Button>,
                  ]
                : []),
              <Button key="close" type="primary" onClick={onClose}>
                关闭预览
              </Button>,
            ]
          : null
      }
    >
      {version?.carrierType === 'online' ? (
        <OnlineCombinationPreviewNotice />
      ) : (
        <PrototypeFileNotice />
      )}
      {renderPreview()}
    </Modal>
  );
};

export default ResourceVersionPreview;
