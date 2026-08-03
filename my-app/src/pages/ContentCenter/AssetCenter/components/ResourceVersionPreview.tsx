import type { ResourceVersion } from '@/services/tagSystem';
import { RESOURCE_CARRIER_LABELS } from '@/services/tagSystem';
import {
  AudioOutlined,
  CloudDownloadOutlined,
  FilePdfOutlined,
  FilePptOutlined,
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

const RESOURCE_MIME_TYPES: Record<ResourceVersion['carrierType'], string> = {
  ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  audio: 'audio/mpeg',
  video: 'video/mp4',
  online: 'text/plain;charset=utf-8',
};

const createAudioPreviewUrl = () => {
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

const downloadMockOriginalFile = (version: ResourceVersion) => {
  const fileName =
    version.originalFileName || `resource-v${version.versionNumber}.txt`;
  const content = [
    '资产中心原型文件下载兜底',
    `版本：V${version.versionNumber}`,
    `原始文件名：${fileName}`,
    `载体：${RESOURCE_CARRIER_LABELS[version.carrierType]}`,
    '',
    '当前为纯前端原型，不保存上传文件二进制；生产环境由对象存储返回原文件。',
  ].join('\n');
  const url = URL.createObjectURL(
    new Blob([content], { type: RESOURCE_MIME_TYPES[version.carrierType] }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

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
    <Tag>前端 Mock</Tag>
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
    const url = createAudioPreviewUrl();
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, version?.id, version?.carrierType]);

  const videoPoster = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#0f172a"/><circle cx="480" cy="245" r="58" fill="#2563eb"/><path d="M462 211l55 34-55 34z" fill="white"/><text x="480" y="355" text-anchor="middle" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="25">${resourceName.replace(
      /[<>&"']/g,
      '',
    )}</text><text x="480" y="394" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="18">VIDEO PREVIEW · FRONTEND MOCK</text></svg>`,
  )}`;

  const renderPreview = () => {
    if (!version) return null;

    if (version.carrierType === 'ppt') {
      return (
        <div className="asset-version-preview-adapter">
          <PreviewHeader
            icon={<FilePptOutlined />}
            label="PPT 幻灯片预览"
            version={version}
          />
          <div
            className="asset-version-ppt-preview"
            role="img"
            aria-label="PPT 模拟预览"
          >
            <div className="asset-version-ppt-slide-index">
              V{version.versionNumber} · 01 / 03
            </div>
            <span className="asset-version-ppt-eyebrow">课堂复习课件</span>
            <h3>{resourceName}</h3>
            <p>当前原型以幻灯片画布验证预览与生效流程</p>
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
            label="PDF 文档预览"
            version={version}
          />
          <div className="asset-version-pdf-stage">
            <article
              className="asset-version-pdf-page"
              aria-label="PDF 模拟预览第 1 页"
            >
              <span>拓展阅读 · V{version.versionNumber}</span>
              <h3>{resourceName}</h3>
              <div className="asset-version-pdf-line asset-version-pdf-line-wide" />
              <div className="asset-version-pdf-line" />
              <div className="asset-version-pdf-line" />
              <div className="asset-version-pdf-callout">PDF PREVIEW</div>
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
            label="音频播放器预览"
            version={version}
          />
          <div className="asset-version-audio-preview">
            <span className="asset-version-audio-disc">
              <AudioOutlined />
            </span>
            <div>
              <strong>{resourceName}</strong>
              <span>试听音轨用于验证前端播放器，原文件可通过下载兜底获取</span>
              <audio
                controls
                preload="metadata"
                src={audioPreviewUrl}
                aria-label={`${resourceName} 音频模拟预览`}
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
            label="视频播放器预览"
            version={version}
          />
          <div className="asset-version-video-preview">
            <video
              controls
              preload="none"
              poster={videoPoster}
              aria-label={`${resourceName} 视频模拟预览`}
            />
            <p>原型不保存视频流；适配器展示封面帧，无法播放时请下载原文件。</p>
          </div>
        </div>
      );
    }

    return (
      <div className="asset-version-preview-unavailable">
        在线组合内容不在附件预览范围内。
      </div>
    );
  };

  return (
    <Modal
      title={version ? `预览 V${version.versionNumber}` : '版本预览'}
      open={open}
      onCancel={onClose}
      width={820}
      destroyOnClose
      footer={
        version
          ? [
              <Button
                key="download"
                icon={<CloudDownloadOutlined />}
                onClick={() => downloadMockOriginalFile(version)}
              >
                下载原文件
              </Button>,
              <Button key="close" type="primary" onClick={onClose}>
                关闭预览
              </Button>,
            ]
          : null
      }
    >
      <div className="asset-version-preview-note">
        预览由载体适配器提供；当前纯前端 Mock
        不保存真实文件，始终保留同名原文件下载兜底。
      </div>
      {renderPreview()}
    </Modal>
  );
};

export default ResourceVersionPreview;
