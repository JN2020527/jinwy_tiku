import ExcelJS from 'exceljs';
import type { ImportTreeNode } from '@/services/tagSystem';
import type { TreeNodeData } from './treeHelpers';

/** 树模板的列头前缀，解析时以第一列为「级别1」定位表头行 */
export const TREE_TEMPLATE_HEADER_PREFIX = '级别';

const TITLE_ROW_TEXT =
  '本文件由题库后台导出，既是当前树的快照，也是导入模板。请勿修改前两行；从表头行起，每行填写一条从根到叶的路径，同一行内层级用列表达。';

const EXAMPLE_ROW = ['示例', '数与代数', '实数', '有理数'];

export interface ImportRowError {
  /** Excel 行号（从 1 开始） */
  rowNumber: number;
  message: string;
}

export interface ParseTreeExcelResult {
  tree: TreeNodeData[];
  errors: ImportRowError[];
  maxLevel: number;
  nodeCount: number;
}

const getCellText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') {
    const record = value as { richText?: { text?: unknown }[]; text?: unknown; result?: unknown };
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((item) => (typeof item?.text === 'string' ? item.text : ''))
        .join('')
        .trim();
    }
    if (typeof record.text === 'string') return record.text.trim();
    if (record.result != null) return getCellText(record.result);
  }
  return '';
};

/** 将树展平为逐级路径行（DFS，每行一条从根到叶的路径） */
export const flattenTreeToLevelRows = (tree: TreeNodeData[]): string[][] => {
  const rows: string[][] = [];
  const walk = (nodes: TreeNodeData[], prefix: string[]) => {
    nodes.forEach((node) => {
      const path = [...prefix, getCellText(node.title)];
      rows.push(path);
      if (node.children?.length) {
        walk(node.children, path);
      }
    });
  };
  walk(tree, []);
  return rows;
};

/** 树节点总数（预览弹窗展示用） */
export const countTreeNodes = (tree: TreeNodeData[]): number =>
  tree.reduce(
    (sum, node) =>
      sum + 1 + (node.children?.length ? countTreeNodes(node.children) : 0),
    0,
  );

/** 将预览树转换为导入接口载荷 */
export const treeToImportPayload = (tree: TreeNodeData[]): ImportTreeNode[] =>
  tree.map((node) => ({
    title: node.title,
    description: node.description,
    children: node.children?.length
      ? treeToImportPayload(node.children)
      : undefined,
  }));

/** 导出当前树为 Excel 模板并触发浏览器下载 */
export const exportTreeToExcel = async (tree: TreeNodeData[], filename: string) => {
  const rows = flattenTreeToLevelRows(tree);
  const maxLevel = Math.max(2, ...rows.map((row) => row.length));
  const headerRow = Array.from(
    { length: maxLevel },
    (_, index) => `级别${index + 1}`,
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('树模板');

  // 仅设置列宽，不通过 columns.header 生成表头行（表头由下方手动写入）
  for (let index = 1; index <= maxLevel; index += 1) {
    sheet.getColumn(index).width = 22;
  }

  // 说明行
  const titleRow = sheet.addRow([TITLE_ROW_TEXT]);
  sheet.mergeCells(1, 1, 1, maxLevel);
  titleRow.font = { italic: true, color: { argb: 'FF8C8C8C' }, size: 10 };
  titleRow.height = 30;

  // 示例行
  const exampleRow = sheet.addRow(EXAMPLE_ROW.slice(0, maxLevel));
  exampleRow.font = { color: { argb: 'FFB8B8B8' }, size: 10 };

  // 表头行
  const headerExcelRow = sheet.addRow(headerRow);
  headerExcelRow.font = { bold: true };
  headerExcelRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F0FE' },
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFB7C9E8' } },
    };
  });

  // 数据行
  rows.forEach((row) => {
    sheet.addRow(row);
  });

  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const buildNodeKey = (parentPath: string[], title: string) =>
  JSON.stringify([...parentPath, title]);

/** 解析导入文件为树结构 + 行级校验错误 */
export const parseTreeExcelFile = async (
  file: File,
): Promise<ParseTreeExcelResult> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('文件中没有可读取的工作表');
  }

  const rawRows: { rowNumber: number; cells: string[] }[] = [];
  sheet.eachRow((row, rowNumber) => {
    const values = row.values as unknown[];
    const cells = (values || []).slice(1).map(getCellText);
    rawRows.push({ rowNumber, cells });
  });

  // 定位表头行：第一列为「级别1」
  const headerIndex = rawRows.findIndex(
    ({ cells }) => cells[0] === '级别1',
  );
  if (headerIndex < 0) {
    throw new Error('未找到表头行：第 1 列应为「级别1」');
  }
  const maxLevel = rawRows[headerIndex].cells.filter((cell) =>
    new RegExp(`^${TREE_TEMPLATE_HEADER_PREFIX}\\d+$`).test(cell),
  ).length;

  const errors: ImportRowError[] = [];
  const tree: TreeNodeData[] = [];
  const nodeByKey = new Map<
    string,
    { node: TreeNodeData; declaredByRow: number }
  >();

  rawRows.slice(headerIndex + 1).forEach(({ rowNumber, cells }) => {
    const path = cells.slice(0, maxLevel);
    const lastNonEmpty = path.reduce(
      (last, cell, index) => (cell ? index : last),
      -1,
    );
    if (lastNonEmpty < 0) return; // 整行空白，跳过

    // 层级断裂：某级为空但更深级有内容
    for (let index = 0; index < lastNonEmpty; index += 1) {
      if (!path[index]) {
        errors.push({
          rowNumber,
          message: `第 ${index + 1} 级为空，但第 ${
            lastNonEmpty + 1
          } 级「${path[lastNonEmpty]}」有内容（层级断裂）`,
        });
        return;
      }
    }

    // 沿路径逐级插入/复用节点
    let parent: TreeNodeData | null = null;
    const parentPath: string[] = [];
    for (let level = 0; level <= lastNonEmpty; level += 1) {
      const title = path[level];
      const key = buildNodeKey(parentPath, title);
      const existing = nodeByKey.get(key);
      if (existing) {
        parent = existing.node;
      } else {
        const node: TreeNodeData = { key, title };
        nodeByKey.set(key, { node, declaredByRow: 0 });
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          tree.push(node);
        }
        parent = node;
      }
      parentPath.push(title);
    }

    // 本行完整声明的节点（路径末尾）
    const declaredEntry = nodeByKey.get(
      buildNodeKey(parentPath.slice(0, -1), path[lastNonEmpty]),
    );
    if (declaredEntry) {
      if (declaredEntry.declaredByRow > 0) {
        errors.push({
          rowNumber,
          message: `节点「${parentPath.join(' / ')}」与第 ${
            declaredEntry.declaredByRow
          } 行重复`,
        });
      } else {
        declaredEntry.declaredByRow = rowNumber;
      }
    }
  });

  return { tree, errors, maxLevel, nodeCount: countTreeNodes(tree) };
};
