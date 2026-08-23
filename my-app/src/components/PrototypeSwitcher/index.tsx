import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useCallback, useEffect } from 'react';
import './index.less';

export interface PrototypeVariantOption<T extends string> {
  key: T;
  label: string;
}

interface PrototypeSwitcherProps<T extends string> {
  variants: PrototypeVariantOption<T>[];
  current: T;
  onChange: (variant: T) => void;
}

const PrototypeSwitcher = <T extends string>({
  variants,
  current,
  onChange,
}: PrototypeSwitcherProps<T>) => {
  const cycle = useCallback(
    (offset: number) => {
      const currentIndex = variants.findIndex((item) => item.key === current);
      const nextIndex =
        (currentIndex + offset + variants.length) % variants.length;
      onChange(variants[nextIndex].key);
    },
    [current, onChange, variants],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        cycle(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycle]);

  if (process.env.NODE_ENV === 'production') return null;

  const active = variants.find((item) => item.key === current) || variants[0];

  return (
    <nav className="prototype-switcher" aria-label="原型方向切换">
      <Button
        type="text"
        shape="circle"
        icon={<LeftOutlined />}
        onClick={() => cycle(-1)}
        aria-label="查看上一个方向"
      />
      <div>
        <small>THROWAWAY PROTOTYPE</small>
        <strong>
          {active.key} · {active.label}
        </strong>
      </div>
      <Button
        type="text"
        shape="circle"
        icon={<RightOutlined />}
        onClick={() => cycle(1)}
        aria-label="查看下一个方向"
      />
    </nav>
  );
};

export default PrototypeSwitcher;
