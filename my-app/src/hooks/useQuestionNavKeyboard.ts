import { useEffect } from 'react';

interface Options {
  enabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveNext?: () => void;
}

/**
 * 通用题目键盘导航 hook。
 *
 * - ↑ / ArrowUp   → onPrev
 * - ↓ / ArrowDown → onNext
 * - Ctrl/Cmd+Enter → onSaveNext（在 input/textarea/contentEditable 里也生效）
 *
 * 当焦点位于可编辑元素（INPUT / TEXTAREA / contentEditable）时，仅 Ctrl+Enter 透传，
 * 防止用户在输入框里按方向键意外切题。
 *
 * `enabled=false` 时整个 hook 不挂监听，对应只读模式。
 */
export function useQuestionNavKeyboard({
  enabled,
  onPrev,
  onNext,
  onSaveNext,
}: Options): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isEditable) {
        // 仅 Ctrl/Cmd+Enter 在可编辑元素里也透传，其余键放回原行为
        if (!((e.metaKey || e.ctrlKey) && e.key === 'Enter')) return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNext();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSaveNext?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onPrev, onNext, onSaveNext]);
}
