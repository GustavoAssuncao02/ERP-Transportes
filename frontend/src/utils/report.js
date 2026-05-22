export function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function pdfText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[\\()]/g, '\\$&');
}

export function fitPdfText(value, length) {
  const text = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');

  if (text.length <= length) return text.padEnd(length, ' ');
  return `${text.slice(0, Math.max(0, length - 1))}~`;
}

export function createPdfContent(lines) {
  const pageWidth = 842;
  const pageHeight = 595;
  const linesPerPage = 41;
  const objects = [];
  const pageRefs = [];
  let objectNumber = 3;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  for (let index = 0; index < lines.length; index += linesPerPage) {
    const pageLines = lines.slice(index, index + linesPerPage);
    const stream = [
      'BT',
      '/F1 10 Tf',
      '18 562 Td',
      ...pageLines.map((line, lineIndex) => `${lineIndex ? '0 -13 Td ' : ''}(${pdfText(line)}) Tj`),
      'ET',
    ].join('\n');
    const contentObject = objectNumber;
    const pageObject = objectNumber + 1;

    objectNumber += 2;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> /Contents ${contentObject} 0 R >>`;
    pageRefs.push(`${pageObject} 0 R`);
  }

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function plainPdfText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function pdfY(pageHeight, top, height = 0) {
  return pageHeight - top - height;
}

function approxPdfTextWidth(value, size) {
  return plainPdfText(value).length * size * 0.53;
}

function fitPdfWidth(value, width, size) {
  const text = plainPdfText(value).trim();
  const maxChars = Math.max(1, Math.floor(width / (size * 0.53)));

  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}~`;
}

function pushPdfText(ops, value, x, top, {
  pageHeight,
  align = 'left',
  font = 'F1',
  size = 7,
  width = 0,
} = {}) {
  const text = width ? fitPdfWidth(value, width, size) : plainPdfText(value).trim();
  const textWidth = approxPdfTextWidth(text, size);
  const textX = align === 'right'
    ? x + width - textWidth
    : align === 'center'
      ? x + ((width - textWidth) / 2)
      : x;

  ops.push(`BT /${font} ${size} Tf ${Number(textX).toFixed(2)} ${Number(pdfY(pageHeight, top) - size).toFixed(2)} Td (${pdfText(text)}) Tj ET`);
}

function pushPdfRect(ops, x, top, width, height, { pageHeight, fill = null } = {}) {
  if (fill) {
    ops.push(
      'q',
      `${fill} rg`,
      `${Number(x).toFixed(2)} ${Number(pdfY(pageHeight, top, height)).toFixed(2)} ${Number(width).toFixed(2)} ${Number(height).toFixed(2)} re f`,
      'Q',
    );
  }

  ops.push(
    'q',
    '0.45 w',
    '0.78 0.78 0.78 RG',
    `${Number(x).toFixed(2)} ${Number(pdfY(pageHeight, top, height)).toFixed(2)} ${Number(width).toFixed(2)} ${Number(height).toFixed(2)} re S`,
    'Q',
  );
}

function pushPdfCell(ops, value, x, top, width, height, {
  pageHeight,
  align = 'left',
  fill = null,
  font = 'F1',
  padding = 3,
  size = 6.4,
} = {}) {
  pushPdfRect(ops, x, top, width, height, { pageHeight, fill });
  pushPdfText(ops, value, x + padding, top + ((height - size) / 2) - 1, {
    pageHeight,
    align,
    font,
    size,
    width: width - (padding * 2),
  });
}

function reportCellText(column, row, columnIndex) {
  if (Array.isArray(row)) return row[columnIndex] ?? '';
  if (column.pdfValue) return column.pdfValue(row);
  if (column.exportValue) return column.exportValue(row);
  if (column.getValue) return column.getValue(row);
  return row?.[column.key] ?? '';
}

function reportColumnWidths(columns, tableWidth) {
  const weights = columns.map((column) => Number(column.pdfWidth || column.width || 14) || 14);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0) || columns.length || 1;
  let usedWidth = 0;

  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return tableWidth - usedWidth;
    }

    const width = Number(((weight / totalWeight) * tableWidth).toFixed(2));
    usedWidth += width;
    return width;
  });
}

function createPdfFromStreams(streams, { pageWidth, pageHeight }) {
  const objects = [];
  const pageRefs = [];
  let objectNumber = 3;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

  streams.forEach((stream) => {
    const contentObject = objectNumber;
    const pageObject = objectNumber + 1;

    objectNumber += 2;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObject} 0 R >>`;
    pageRefs.push(`${pageObject} 0 R`);
  });

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function createReportPdfContent({
  title,
  generatedAt = todayValue(),
  metadata = [],
  columns = [],
  rows = [],
  summary = '',
  emptyMessage = 'Nenhum registro encontrado para os filtros aplicados',
} = {}) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 18;
  const tableWidth = pageWidth - (margin * 2);
  const headerHeight = 18;
  const rowHeight = 16;
  const summaryHeight = 18;
  const columnWidths = reportColumnWidths(columns, tableWidth);
  const safeRows = rows.length ? rows : [[emptyMessage]];
  const streams = [];
  let rowIndex = 0;

  while (rowIndex < safeRows.length || !streams.length) {
    const ops = ['0.45 w'];
    const isFirstPage = streams.length === 0;
    let top = 20;

    pushPdfText(ops, title || 'Relatorio', margin, top, {
      pageHeight,
      font: 'F2',
      size: 12,
      width: tableWidth - 120,
    });
    pushPdfText(ops, `Gerado em ${generatedAt}`, margin, top + 14, {
      pageHeight,
      size: 7,
      width: tableWidth - 120,
    });
    pushPdfText(ops, `Pagina ${streams.length + 1}`, margin + tableWidth - 80, top, {
      pageHeight,
      align: 'right',
      size: 7,
      width: 80,
    });

    top += 34;

    if (isFirstPage && metadata.length) {
      metadata.forEach(([label, value]) => {
        pushPdfCell(ops, label, margin, top, 118, 13, {
          pageHeight,
          fill: '0.96 0.96 0.96',
          font: 'F2',
          size: 6.2,
        });
        pushPdfCell(ops, value, margin + 118, top, tableWidth - 118, 13, {
          pageHeight,
          size: 6.2,
        });
        top += 13;
      });
      top += 10;
    }

    let left = margin;
    columns.forEach((column, columnIndex) => {
      pushPdfCell(ops, column.label, left, top, columnWidths[columnIndex], headerHeight, {
        pageHeight,
        align: column.align || (column.type === 'number' ? 'right' : 'left'),
        fill: '0.93 0.93 0.93',
        font: 'F2',
        size: 6.4,
      });
      left += columnWidths[columnIndex];
    });
    top += headerHeight;

    const reservedFooter = summary && rowIndex < safeRows.length ? summaryHeight + 8 : 0;
    const maxRows = Math.max(1, Math.floor((pageHeight - margin - top - reservedFooter) / rowHeight));
    const pageRows = safeRows.slice(rowIndex, rowIndex + maxRows);

    pageRows.forEach((row, pageRowIndex) => {
      left = margin;

      if (!rows.length) {
        pushPdfCell(ops, emptyMessage, left, top, tableWidth, rowHeight, {
          pageHeight,
          size: 6.4,
        });
        top += rowHeight;
        return;
      }

      columns.forEach((column, columnIndex) => {
        pushPdfCell(ops, reportCellText(column, row, columnIndex), left, top, columnWidths[columnIndex], rowHeight, {
          pageHeight,
          align: column.align || (column.type === 'number' ? 'right' : 'left'),
          fill: pageRowIndex % 2 ? '0.99 0.99 0.99' : null,
          size: 6.2,
        });
        left += columnWidths[columnIndex];
      });
      top += rowHeight;
    });

    rowIndex += pageRows.length;

    if (summary && rowIndex >= safeRows.length) {
      top += 8;
      pushPdfCell(ops, summary, margin, top, tableWidth, summaryHeight, {
        pageHeight,
        fill: '0.96 0.96 0.96',
        font: 'F2',
        size: 7,
      });
    }

    streams.push(ops.join('\n'));
  }

  return createPdfFromStreams(streams, { pageWidth, pageHeight });
}

export function normalizeReportText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function uniqueSortedOptions(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second, 'pt-BR'));
}

export function dateOnlyValue(value) {
  if (!value) return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 10);
  }

  const rawValue = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
    return rawValue.slice(0, 10);
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function formatReportDate(value) {
  const dateValue = dateOnlyValue(value);
  if (!dateValue) return '-';

  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}

export function formatReportDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatReportDate(value);
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isDateInRange(value, startDate, endDate) {
  const dateValue = dateOnlyValue(value);
  if (!dateValue) return !startDate && !endDate;
  if (startDate && dateValue < startDate) return false;
  if (endDate && dateValue > endDate) return false;
  return true;
}

export function optionValue(option) {
  return typeof option === 'object' ? option.value : option;
}

export function optionLabel(option) {
  return typeof option === 'object' ? option.label : option;
}

export function reportOptionValue(option) {
  return String(optionValue(option) ?? '');
}

export function normalizeReportSelection(value) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function isReportOptionSelected(value, selected) {
  return normalizeReportSelection(selected).includes(String(value ?? ''));
}

export function reportSelectionLabel(selected, options = [], allLabel = 'Todos') {
  const selectedValues = normalizeReportSelection(selected);
  const normalizedOptions = options.map((option) => ({
    value: reportOptionValue(option),
    label: optionLabel(option),
  }));

  if (normalizedOptions.length && selectedValues.length === normalizedOptions.length) {
    return allLabel;
  }

  if (!selectedValues.length) {
    return 'Nenhum';
  }

  if (selectedValues.length === 1) {
    return normalizedOptions.find((option) => option.value === selectedValues[0])?.label || selectedValues[0];
  }

  return `${selectedValues.length} selecionado(s)`;
}
