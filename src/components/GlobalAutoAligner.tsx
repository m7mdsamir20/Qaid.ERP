"use client";

import { useEffect } from 'react';
import { formatNumber } from '@/lib/currency';

// Regular expression to match currency symbols and common units (including percentage)
const currencyRegex = /(SAR|EGP|AED|KWD|QAR|BHD|OMR|JOD|LYD|IQD|USD|EUR|GBP|TRY|SDG|\$|€|£|¥|₺|\u0631\.\u0633|\u062c\.\u0645|\u062f\.\u0625|\u062f\.\u0643|\u0631\.\u0642|\u062f\.\u0628|\u0631\.\u0639|\u062f\.\u0623|\u062f\.\u0644|\u062f\.\u0639|\u062c\.\u0633|\u0631\u064a\u0627\u0644|\u062c\u0646\u064a\u0647|%)/gi;

// List of typical keywords indicating empty results / no data
const emptyMessages = [
    '\u0644\u0627 \u062a\u0648\u062c\u062f',
    '\u0644\u0627 \u064a\u0648\u062c\u062f',
    '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631',
    '\u0644\u0627 \u0646\u062a\u0627\u0626\u062c',
    'empty',
    'no data',
    'no results',
    '\u0644\u0645 \u064a\u0633\u062c\u0644',
    '\u0644\u064a\u0633\u062a \u0647\u0646\u0627\u0643'
];

function isPhone(text: string): boolean {
    const clean = text.trim();
    const digitsOnly = clean.replace(/\D/g, '');
    const hasInvalidChars = /[a-zA-Z\u0600-\u06FF.]/.test(clean); // no letters or dots
    const phonePattern = /^(\+?)[0-9\s-]{9,18}$/;
    
    return (clean.startsWith('+') || clean.startsWith('0')) &&
           !hasInvalidChars &&
           phonePattern.test(clean) &&
           digitsOnly.length >= 9 &&
           digitsOnly.length <= 15;
}

function isDate(text: string): boolean {
    const clean = text.trim();
    const dateRegex = /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2})$/;
    return dateRegex.test(clean);
}

function applyAlignment(node: Node, type: 'center' | 'start') {
    let target: HTMLElement | null = null;
    
    // Find nearest ancestor td or th
    let parent = node.parentElement;
    while (parent) {
        const tag = parent.tagName.toLowerCase();
        if (tag === 'td' || tag === 'th') {
            target = parent;
            break;
        }
        parent = parent.parentElement;
    }
    
    // If no td/th, apply to the direct parent element
    if (!target && node.parentElement) {
        target = node.parentElement;
    }
    
    if (target) {
        const currentAlign = target.style.textAlign;
        const newAlign = type === 'center' ? 'center' : 'start';
        if (currentAlign !== newAlign) {
            target.style.setProperty('text-align', newAlign, 'important');
        }
    }
}

function checkAndFormatEmptyState(el: HTMLElement) {
    const tag = el.tagName.toLowerCase();
    if (tag !== 'div' && tag !== 'p' && tag !== 'td') return;
    
    // If already formatted, skip
    if (el.querySelector('.lucide-inbox')) return;
    
    // For div or p, only process if they are leaf elements (no element children)
    if ((tag === 'div' || tag === 'p') && el.children.length > 0) return;
    
    // For td, check colSpan (usually indicates an empty row message)
    if (tag === 'td') {
        const td = el as HTMLTableCellElement;
        if (td.colSpan <= 1) return;
    }
    
    const text = el.textContent || "";
    const trimmed = text.trim();
    if (!trimmed) return;
    
    // Check if the text matches any of our empty messages
    const isMatch = emptyMessages.some(msg => trimmed.toLowerCase().includes(msg));
    if (!isMatch) return;
    
    // Ensure we don't format long instructional paragraphs
    if (trimmed.length > 80) return;
    
    el.style.setProperty('text-align', 'center', 'important');
    if (tag === 'td') {
        el.style.setProperty('padding', '60px 20px', 'important');
    } else {
        el.style.setProperty('padding', '40px 20px', 'important');
    }
    
    el.innerHTML = `
        <div class="empty-state-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; width: 100%;">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.5)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-inbox" style="display: block; margin: 0 auto;">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
            </svg>
            <span style="color: var(--c-text-secondary, #94a3b8); font-size: 13.5px; font-weight: 500; font-family: 'Cairo', sans-serif;">
                ${trimmed}
            </span>
        </div>
    `;
}

function classifyAndProcessTextNode(node: Node) {
    const val = node.nodeValue;
    if (!val) return;
    
    const trimmed = val.trim();
    if (!trimmed) return;
    
    // Check if it contains any digit. If not, do nothing.
    if (!/\d/.test(trimmed)) return;
    
    // Check if it's a phone number
    if (isPhone(trimmed)) {
        applyAlignment(node, 'start');
        return;
    }
    
    // Check if it's a date
    if (isDate(trimmed)) {
        applyAlignment(node, 'center');
        return;
    }
    
    // Clean currency symbols to check if it's a pure number / amount
    const cleanedText = trimmed.replace(currencyRegex, '').trim();
    
    const isFormattedNumber = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleanedText);
    const isPlainNumber = /^-?\d+(\.\d+)?$/.test(cleanedText);
    
    if (isFormattedNumber || isPlainNumber) {
        applyAlignment(node, 'center');
        
        // If it is a plain number, format it with commas
        if (isPlainNumber) {
            const num = parseFloat(cleanedText);
            if (!isNaN(num)) {
                const formattedNum = formatNumber(num);
                // Replace the plain number part inside the original text value
                const formattedValue = val.replace(cleanedText, formattedNum);
                if (node.nodeValue !== formattedValue) {
                    node.nodeValue = formattedValue;
                }
            }
        }
    }
}

function traverseAndProcess(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
        classifyAndProcessTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        
        // Check for empty state elements (div, p, td)
        checkAndFormatEmptyState(el);
        
        // Exclude inputs, textareas, selects, and non-display tags
        if (['script', 'style', 'textarea', 'input', 'select', 'option', 'code', 'pre', 'noscript', 'iframe'].includes(tag)) {
            return;
        }
        if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
            return;
        }
        
        node.childNodes.forEach(child => {
            traverseAndProcess(child);
        });
    }
}

export default function GlobalAutoAligner() {
    useEffect(() => {
        // Initial pass on the entire body
        traverseAndProcess(document.body);
        
        // Setup observer to process dynamic content updates
        const observer = new MutationObserver((mutations) => {
            // Disconnect to avoid recursion when modifying text nodes
            observer.disconnect();
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        traverseAndProcess(node);
                    });
                } else if (mutation.type === 'characterData') {
                    classifyAndProcessTextNode(mutation.target);
                    // Also check parent for empty state if updated
                    if (mutation.target.parentElement) {
                        checkAndFormatEmptyState(mutation.target.parentElement);
                    }
                }
            }
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        return () => {
            observer.disconnect();
        };
    }, []);

    return null;
}
