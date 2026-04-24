'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, LucideIcon, Plus } from 'lucide-react';
import { C } from '@/constants/theme';

interface Option {
    value: string | number;
    label: string;
    icon?: LucideIcon;
    style?: React.CSSProperties;
    sub?: string;
}

interface CustomSelectProps {
    value: string | number;
    onChange: (value: any) => void;
    options: Option[];
    placeholder?: string;
    icon?: LucideIcon;
    style?: React.CSSProperties;
    disabled?: boolean;
    minWidth?: string;
    onCreate?: (value: string) => void;
    onQuickAction?: () => void;
    hideSearch?: boolean;
    openUp?: boolean;
    maxHeight?: string;
}

const CustomSelect = forwardRef((props: CustomSelectProps, ref) => {
    const {
        value,
        onChange,
        options,
        placeholder = 'اختر...',
        icon: Icon,
        style = {},
        disabled = false,
        minWidth = '160px',
        onCreate,
        onQuickAction,
        hideSearch = false,
        openUp = false,
        maxHeight = '240px'
    } = props;
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const lastInteraction = useRef<'mouse' | 'keyboard'>('keyboard');
    const containerRef = useRef<HTMLDivElement>(null);
    const optionsListRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            if (!disabled) setIsOpen(true);
        }
    }));

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const shouldShowCreate = !!(onCreate && search.trim() && !filteredOptions.some(o => o.label === search.trim()));
    const totalItems = filteredOptions.length + (shouldShowCreate ? 1 : 0);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setActiveIndex(0);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        setActiveIndex(0);
    }, [search]);

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && optionsListRef.current && lastInteraction.current === 'keyboard') {
            const activeItem = optionsListRef.current.children[activeIndex] as HTMLElement;
            if (activeItem) {
                const container = optionsListRef.current;
                const itemTop = activeItem.offsetTop;
                const itemBottom = itemTop + activeItem.offsetHeight;
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.offsetHeight;

                if (itemTop < containerTop) {
                    container.scrollTop = itemTop;
                } else if (itemBottom > containerBottom) {
                    container.scrollTop = itemBottom - container.offsetHeight;
                }
            }
        }
    }, [activeIndex, isOpen]);

    // Split incoming style into layout vs appearance if needed
    const { width, height, margin, padding, position, top, right, bottom, left, flex, ...appearanceStyle } = style;
    const layoutStyle = { width, height, margin, padding, position: position || 'relative', top, right, bottom, left, flex };

    return (
        <div ref={containerRef} style={{ minWidth, ...layoutStyle, zIndex: isOpen ? 10000 : 10 }}>
            {/* Trigger Container */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    background: C.card,
                    border: `1px solid ${isOpen ? C.primary : C.border}`,
                    borderRadius: '10px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: '42px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: Icon ? '0 16px 0 40px' : '0 16px 0 36px',
                    opacity: disabled ? 0.6 : 1,
                    boxSizing: 'border-box',
                    boxShadow: isOpen ? `0 0 0 4px var(--c-primary-bg, rgba(37,106,244,0.15)), 0 4px 12px var(--c-shadow, rgba(0,0,0,0.2))` : 'none',
                    ...appearanceStyle
                }}
            >
                {/* Prefix Icon */}
                {Icon && (
                    <Icon
                        size={16}
                        color={C.primary}
                        style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', transition: '0.2s' }}
                    />
                )}
                {/* Selected Label */}
                <div style={{
                    flex: 1,
                    textAlign: 'start',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: selectedOption ? C.textPrimary : C.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    height: '100%',
                    paddingInlineStart: Icon ? '30px' : '0',
                    paddingInlineEnd: '20px'
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </div>

                <ChevronDown
                    size={16}
                    color={C.textMuted}
                    style={{
                        position: 'absolute',
                        insetInlineEnd: '12px',
                        top: '50%',
                        transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    [openUp ? 'bottom' : 'top']: 'calc(100% + 8px)',
                    insetInlineEnd: 0,
                    width: '100%',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: '14px',
                    padding: '6px',
                    boxShadow: '0 25px 60px -12px var(--c-shadow, rgba(0,0,0,0.5))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    zIndex: 100000,
                    maxHeight: maxHeight,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    animation: openUp ? 'dropdownInUp 0.2s ease-out' : 'dropdownIn 0.2s ease-out'
                }}
                    tabIndex={-1}
                >
                    {/* Search Input */}
                    {!hideSearch && (
                        <div style={{ padding: '4px', marginBottom: '4px' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="ابحث هنا..."
                                    autoComplete="off"
                                    name="custom-select-search-nope"
                                    spellCheck={false}
                                    style={{
                                        width: '100%',
                                        height: '36px',
                                        padding: '0 12px',
                                        background: C.inputBg,
                                        border: `1px solid ${C.border}`,
                                        borderRadius: '8px',
                                        color: C.textPrimary,
                                        fontSize: '13px',
                                        outline: 'none',
                                        textAlign: 'start',
                                        boxSizing: 'border-box'
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            lastInteraction.current = 'keyboard';
                                            e.preventDefault();
                                            if (activeIndex < filteredOptions.length) {
                                                const opt = filteredOptions[activeIndex];
                                                onChange(opt.value);
                                                setIsOpen(false);
                                                if (onQuickAction) onQuickAction();
                                            } else if (shouldShowCreate && activeIndex === filteredOptions.length) {
                                                onCreate!(search.trim());
                                                setIsOpen(false);
                                            }
                                        } else if (e.key === 'ArrowDown') {
                                            lastInteraction.current = 'keyboard';
                                            e.preventDefault();
                                            setActiveIndex(prev => (prev + 1) % totalItems);
                                        } else if (e.key === 'ArrowUp') {
                                            lastInteraction.current = 'keyboard';
                                            e.preventDefault();
                                            setActiveIndex(prev => (prev - 1 + totalItems) % totalItems);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div
                        ref={optionsListRef}
                        className="custom-select-list"
                        style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingInlineEnd: '2px' }}
                    >
                        {filteredOptions.map((opt, idx) => {
                            const isSelected = opt.value === value;
                            const isActive = activeIndex === idx;

                            return (
                                <div
                                    key={String(opt.value)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    onMouseEnter={() => {
                                        lastInteraction.current = 'mouse';
                                        setActiveIndex(idx);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: isSelected ? 800 : 500,
                                        background: isSelected ? 'var(--c-primary-bg, rgba(37,106,244,0.15))' : (isActive ? C.hover : 'transparent'),
                                        color: isSelected ? C.primary : (isActive ? C.textPrimary : C.textSecondary),
                                        transition: 'all 0.15s',
                                        textAlign: 'start',
                                        minHeight: '40px',
                                        ...opt.style
                                    }}
                                >
                                    {opt.icon && <opt.icon size={16} style={{
                                        color: isSelected ? C.primary : (isActive ? C.textPrimary : 'inherit'),
                                        opacity: isActive ? 1 : 0.6
                                    }} />}
                                    <span style={{ flex: 1 }}>{opt.label}</span>
                                    {(opt as any).sub && <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: 400 }}>{(opt as any).sub}</span>}
                                </div>
                            );
                        })}

                        {shouldShowCreate && (
                            <div
                                onClick={() => {
                                    onCreate!(search.trim());
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => {
                                    lastInteraction.current = 'mouse';
                                    setActiveIndex(filteredOptions.length);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: C.success,
                                    background: activeIndex === filteredOptions.length ? 'var(--c-success-bg, rgba(16,185,129,0.1))' : 'transparent',
                                    marginTop: '4px',
                                    border: `1px dashed ${activeIndex === filteredOptions.length ? C.success : C.border}`,
                                    textAlign: 'start',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Plus size={16} />
                                <span>إضافة جديد: "{search}"</span>
                            </div>
                        )}
                    </div>

                    {filteredOptions.length === 0 && !shouldShowCreate && (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                            لم يتم العثور على نتائج
                        </div>
                    )}
                </div>
            )}
            <style>{`
                @keyframes dropdownIn {
                    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes dropdownInUp {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .custom-select-list::-webkit-scrollbar {
                    display: none;
                }
                .custom-select-list {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
});

export default CustomSelect;
