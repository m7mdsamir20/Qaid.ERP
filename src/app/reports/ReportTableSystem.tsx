'use client';

import { type ReactNode, useEffect } from 'react';

type ColType = 'text' | 'num' | 'date' | 'action';

const AR_NUM = '٠١٢٣٤٥٦٧٨٩';
const EN_NUM = '0123456789';
const FA_NUM = '۰۱۲۳۴۵۶۷۸۹';

const NUM_HINTS = [
    'total', 'paid', 'remaining', 'qty', 'quantity', 'price', 'amount', 'balance', 'debit', 'credit',
    'tax', 'discount', 'value', 'cost', 'rate', 'avg', 'average', 'net', 'gross', 'salary', 'deduction',
    'surplus', 'shortage', 'count', 'days', 'months', 'overdue', 'installment', 'percent',
    'الاجمالي', 'الإجمالي', 'المبلغ', 'القيمة', 'المتبقي', 'المتبقى', 'المدفوع', 'الكمية', 'العدد',
    'الرصيد', 'مدين', 'دائن', 'الخصم', 'الضريبة', 'سعر', 'تكلفة', 'صافي', 'متوسط', 'الأيام', 'ايام',
    'تأخير', 'العجز', 'الزيادة', 'النسبة'
];

const DATE_HINTS = [
    'date', 'due', 'issued', 'created', 'from', 'to', 'day',
    'التاريخ', 'تاريخ', 'موعد', 'الاستحقاق', 'من', 'إلى', 'اليوم'
];

const ACTION_HINTS = ['action', 'actions', 'options', 'إجراء', 'اجراء', 'خيارات', 'التحكم'];

function normalizeDigits(input: string): string {
    let out = input;
    for (let i = 0; i < AR_NUM.length; i += 1) {
        out = out.replaceAll(AR_NUM[i], EN_NUM[i]);
    }
    for (let i = 0; i < FA_NUM.length; i += 1) {
        out = out.replaceAll(FA_NUM[i], EN_NUM[i]);
    }
    return out;
}

function normalizeDigitsInNode(root: HTMLElement) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
        const textNode = current as Text;
        const original = textNode.nodeValue || '';
        const normalized = normalizeDigits(original);
        if (normalized !== original) textNode.nodeValue = normalized;
        current = walker.nextNode();
    }
}

function cleanText(input: string): string {
    return normalizeDigits(input).trim().toLowerCase();
}

function isNumericLike(value: string): boolean {
    const raw = cleanText(value);
    if (!raw) return false;

    const stripped = raw
        .replace(/egp|usd|sar|aed|kwd|qar|bhd|omr|jod/gi, '')
        .replace(/[جسدرقبحطع]/g, '')
        .replace(/[^\d.,+\-()]/g, '');

    if (!stripped) return false;

    const normalized = stripped
        .replace(/,/g, '')
        .replace(/[()]/g, '');

    return /^[+\-]?\d+(\.\d+)?$/.test(normalized);
}

function isDateLike(value: string): boolean {
    const raw = cleanText(value);
    if (!raw) return false;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return true;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(raw)) return true;

    const parsed = Date.parse(raw);
    return Number.isFinite(parsed);
}

function hasHint(text: string, hints: string[]): boolean {
    const v = cleanText(text);
    return hints.some((h) => v.includes(cleanText(h)));
}

function getColumnMap(table: HTMLTableElement): HTMLTableCellElement[][] {
    const colMap: HTMLTableCellElement[][] = [];
    const allRows = Array.from(table.querySelectorAll('tr'));

    allRows.forEach((row) => {
        let colIndex = 0;
        Array.from(row.cells).forEach((cell) => {
            const span = Math.max(cell.colSpan || 1, 1);
            for (let i = 0; i < span; i += 1) {
                if (!colMap[colIndex + i]) colMap[colIndex + i] = [];
                colMap[colIndex + i].push(cell);
            }
            colIndex += span;
        });
    });

    return colMap;
}

function inferColType(headerText: string, colCells: HTMLTableCellElement[]): ColType {
    if (hasHint(headerText, ACTION_HINTS)) return 'action';
    if (hasHint(headerText, DATE_HINTS)) return 'date';
    if (hasHint(headerText, NUM_HINTS)) return 'num';

    const sampleTexts = colCells
        .filter((c) => c.closest('tbody'))
        .map((c) => c.textContent?.trim() || '')
        .filter((v) => v.length > 0)
        .slice(0, 40);

    if (!sampleTexts.length) return 'text';

    const numScore = sampleTexts.filter(isNumericLike).length / sampleTexts.length;
    const dateScore = sampleTexts.filter(isDateLike).length / sampleTexts.length;
    const actionScore = colCells.filter((c) => !!c.querySelector('button,a,[role="button"],input,select')).length / colCells.length;

    if (actionScore >= 0.35) return 'action';
    if (dateScore >= 0.5) return 'date';
    if (numScore >= 0.6) return 'num';
    return 'text';
}

function ensureScrollableWrapper(table: HTMLTableElement) {
    const parent = table.parentElement;
    if (!parent) return;
    if (parent.classList.contains('rt-scroll')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'rt-scroll';
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);
}

function applyCellType(cell: HTMLTableCellElement, type: ColType) {
    cell.classList.remove('rt-col-text', 'rt-col-num', 'rt-col-date', 'rt-col-action');
    cell.classList.add(`rt-col-${type}`);
    cell.classList.add('rt-cell');

    const hasInteractive = !!cell.querySelector('button,a,[role="button"],input,select');
    if (hasInteractive) {
        cell.classList.remove('rt-col-text', 'rt-col-num', 'rt-col-date');
        cell.classList.add('rt-col-action');
    }

    const text = (cell.textContent || '').trim();
    const isTrulyEmpty = text.length === 0 && !hasInteractive && !cell.querySelector('img,svg');
    if (isTrulyEmpty) {
        cell.classList.add('rt-empty');
        if (!cell.getAttribute('data-empty')) cell.setAttribute('data-empty', '—');
    } else {
        cell.classList.remove('rt-empty');
        cell.removeAttribute('data-empty');
    }
}

function normalizeTable(table: HTMLTableElement) {
    table.classList.add('rt-table');
    ensureScrollableWrapper(table);

    const colMap = getColumnMap(table);
    if (!colMap.length) return;

    colMap.forEach((cells) => {
        const headerCell = cells.find((c) => c.tagName === 'TH');
        const headerText = headerCell?.textContent || '';
        const type = inferColType(headerText, cells);
        cells.forEach((cell) => {
            applyCellType(cell, type);
            normalizeDigitsInNode(cell);
        });
    });

    Array.from(table.querySelectorAll('input')).forEach((input) => {
        if (input.dataset.rtDigitsNormalized === 'true') return;
        input.dataset.rtDigitsNormalized = 'true';
        input.addEventListener('input', () => {
            const next = normalizeDigits(input.value);
            if (input.value !== next) input.value = next;
        });
    });
}

function normalizeAllTables(root: ParentNode = document) {
    const tables = Array.from(root.querySelectorAll<HTMLTableElement>('table'));
    tables.forEach((table) => {
        if (table.closest('[data-skip-rt-table="true"]')) return;
        normalizeTable(table);
    });
}

export default function ReportTableSystem({ children }: { children: ReactNode }) {
    useEffect(() => {
        const root = document.querySelector('[data-reports-root]') || document;
        normalizeAllTables(root);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.type === 'childList') {
                    m.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement)) return;
                        if (node.matches?.('table')) normalizeTable(node as HTMLTableElement);
                        normalizeAllTables(node);
                    });
                }
            });
        });

        observer.observe(root, {
            subtree: true,
            childList: true,
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div data-reports-root="true">
            {children}
            <style jsx global>{`
                [data-reports-root='true'] .rt-scroll {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                [data-reports-root='true'] .rt-table {
                    width: 100% !important;
                    min-width: 100%;
                    border-collapse: collapse !important;
                    table-layout: fixed;
                    direction: inherit;
                }

                [data-reports-root='true'] .rt-table thead th {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    background: #f1f5f9 !important;
                    color: #0f172a !important;
                    font-weight: 800 !important;
                    border-bottom: 1px solid #cbd5e1 !important;
                }

                [data-reports-root='true'] .rt-table th,
                [data-reports-root='true'] .rt-table td,
                [data-reports-root='true'] .rt-cell {
                    padding: 12px 14px !important;
                    line-height: 1.45;
                    vertical-align: middle !important;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.25);
                }

                [data-reports-root='true'] .rt-col-text {
                    text-align: start !important;
                    min-width: 180px;
                }

                [data-reports-root='true'] .rt-col-num {
                    text-align: right !important;
                    min-width: 120px;
                    font-variant-numeric: tabular-nums;
                }

                [data-reports-root='true'] .rt-col-date {
                    text-align: center !important;
                    min-width: 120px;
                    font-variant-numeric: tabular-nums;
                }

                [data-reports-root='true'] .rt-col-action {
                    text-align: center !important;
                    min-width: 120px;
                }

                [data-reports-root='true'] .rt-col-action > * {
                    margin-inline: auto;
                }

                [data-reports-root='true'] .rt-empty::before {
                    content: attr(data-empty);
                    opacity: 0.7;
                }

                @media (max-width: 900px) {
                    [data-reports-root='true'] .rt-table {
                        min-width: 860px;
                    }
                }
            `}</style>
        </div>
    );
}
