"use client";

import { useEffect } from 'react';
import { formatNumber } from '@/lib/currency';

// Regular expression to match currency symbols and common units (including percentage)
const currencyRegex = /(SAR|EGP|AED|KWD|QAR|BHD|OMR|JOD|LYD|IQD|USD|EUR|GBP|TRY|SDG|\$|€|£|¥|₺|ر\.س|ج\.م|د\.إ|د\.ك|ر\.ق|د\.ب|ر\.ع|د\.أ|د\.ل|د\.ع|ج\.س|ريال|جنيه|%)/gi;

function isPhone(text: string): boolean {
    const clean = text.trim();
    // Phone number criteria:
    // Starts with + or 0, contains only digits, spaces, hyphens, and has 9 to 15 digits
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
    // Match YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, and short year dates separated by -, / or .
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
