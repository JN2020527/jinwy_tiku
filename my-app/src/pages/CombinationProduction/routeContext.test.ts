import assert from 'node:assert/strict';
import test from 'node:test';
import { SUBJECT_OPTIONS } from '../ContentCenter/TagManage/components/treeFilterConstants';
import { parseCombinationProductionRouteContext } from './routeContext';

test('新建学案支持统一学科配置中的全部学科', () => {
  SUBJECT_OPTIONS.forEach(({ value }) => {
    assert.deepEqual(
      parseCombinationProductionRouteContext({
        mode: 'new',
        subject: value,
        type: 'studyGuide',
      }),
      {
        valid: true,
        mode: 'new',
        subject: value,
        resourceType: 'studyGuide',
      },
    );
  });
});

test('新建学案仍拒绝未知学科', () => {
  assert.deepEqual(
    parseCombinationProductionRouteContext({
      mode: 'new',
      subject: 'unknown-subject',
      type: 'studyGuide',
    }),
    {
      valid: false,
      mode: 'new',
      error: '缺少有效学科上下文',
    },
  );
});
