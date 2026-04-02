'use client';

import React from 'react';

/**
 * 24 Premium Cartoon Avatars matching the user's provided reference image.
 * All implemented as pure SVGs for high performance and no external dependencies.
 */
export const AVATAR_OPTIONS = [
    // Row 1
    { id: 'av1', gender: 'male', label: 'شاب قميص أزرق' },
    { id: 'av2', gender: 'male', label: 'رجل أسمر ببدلة' },
    { id: 'av3', gender: 'male', label: 'رجل مسن ببدلة' },
    { id: 'av4', gender: 'female', label: 'سيدة ببدلة تركواز' },
    { id: 'av5', gender: 'female', label: 'سيدة سمراء ببدلة صفراء' },
    { id: 'av6', gender: 'female', label: 'سيدة محجبة' },

    // Row 2
    { id: 'av7', gender: 'male', label: 'رجل عربي رسمي' },
    { id: 'av8', gender: 'male', label: 'رجل بلحية قميص مربعات' },
    { id: 'av9', gender: 'male', label: 'رجل شعر أحمر' },
    { id: 'av10', gender: 'female', label: 'سيدة بنظارات بنفسجي' },
    { id: 'av11', gender: 'female', label: 'سيدة بتسريحة كعكة' },
    { id: 'av12', gender: 'female', label: 'سيدة ببدلة وردية' },

    // Row 3
    { id: 'av13', gender: 'male', label: 'رجل أسمر بنظارات' },
    { id: 'av14', gender: 'male', label: 'رجل قميص أبيض وربطة' },
    { id: 'av15', gender: 'female', label: 'سيدة سمراء ببدلة سوداء' },
    { id: 'av16', gender: 'female', label: 'سيدة ببدلة كاجوال' },
    { id: 'av17', gender: 'female', label: 'سيدة قميص أبيض' },
    { id: 'av18', gender: 'male', label: 'رجل أعمال ببدلة زرقاء' },

    // Row 4
    { id: 'av19', gender: 'male', label: 'رجل بنظارات ولحية' },
    { id: 'av20', gender: 'female', label: 'سيدة بنظارات ستايل' },
    { id: 'av21', gender: 'male', label: 'رجل بقميص برتقالي' },
    { id: 'av22', gender: 'female', label: 'سيدة بضفيرة' },
    { id: 'av23', gender: 'male', label: 'رجل ببدلة رسمية سوداء' },
    { id: 'av24', gender: 'male', label: 'شاب بنظارات وكنزة حمراء' },
];

interface AvatarProps {
    id?: string;
    size?: number;
    style?: React.CSSProperties;
    className?: string;
}

export const Avatar = ({ id = 'av1', size = 40, style, className }: AvatarProps) => {
    // Background colors matching the reference grid circle backgrounds
    const bgColors: Record<string, string> = {
        av1: '#E65100', av2: '#00ACC1', av3: '#D32F2F', av4: '#F57C00', av5: '#00838F', av6: '#D32F2F',
        av7: '#7CB342', av8: '#F9A825', av9: '#4527A0', av10: '#7CB342', av11: '#F9A825', av12: '#4E342E',
        av13: '#E65100', av14: '#00ACC1', av15: '#C62828', av16: '#D84315', av17: '#0097A7', av18: '#C62828',
        av19: '#7CB342', av20: '#F9A825', av21: '#4A148C', av22: '#7CB342', av23: '#F9A825', av24: '#4E342E',
    };

    const bg = bgColors[id] || '#6366f1';

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                ...style
            }}
        >
            <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <clipPath id="circleClip">
                        <circle cx="50" cy="50" r="50" />
                    </clipPath>
                </defs>
                <g clipPath="url(#circleClip)">

                    {/* Common Skin Tones */}
                    {['av2', 'av5', 'av13', 'av15'].includes(id) ? (
                        <circle cx="50" cy="45" r="22" fill="#8D5524" /> // Dark
                    ) : ['av1', 'av19', 'av21'].includes(id) ? (
                        <circle cx="50" cy="45" r="22" fill="#D2B48C" /> // Mid
                    ) : (
                        <circle cx="50" cy="45" r="22" fill="#FFDBAC" /> // Fair
                    )}

                    {/* BODIES - Implementing 24 unique clothes matching image */}
                    {['av1', 'av2', 'av3', 'av4', 'av5'].includes(id) && <path d="M20 75C20 65 30 60 50 60C70 60 80 65 80 75V100H20V75Z" fill={id === 'av1' ? "#1A237E" : id === 'av2' ? "#0D47A1" : id === 'av3' ? "#37474F" : id === 'av4' ? "#0097A7" : "#F9A825"} />}
                    {id === 'av6' && <path d="M15 50C15 30 30 20 50 20C70 20 85 30 85 50V100H15V50Z" fill="#006064" />}
                    {['av7', 'av8', 'av9', 'av10', 'av11', 'av12'].includes(id) && <path d="M20 75c0-10 10-15 30-15s30 5 30 15v25H20V75z" fill={id === 'av7' ? "white" : id === 'av8' ? "#C62828" : id === 'av9' ? "#00838F" : id === 'av10' ? "#4527A0" : id === 'av11' ? "#0277BD" : "#D81B60"} />}
                    {['av13', 'av14', 'av15', 'av16', 'av17', 'av18'].includes(id) && <path d="M20 78c0-8 10-13 30-13s30 5 30 13v22H20V78z" fill={id === 'av13' ? "#ECEFF1" : id === 'av14' ? "white" : id === 'av15' ? "#212121" : id === 'av16' ? "#263238" : id === 'av17' ? "#CFD8DC" : "#1565C0"} />}
                    {['av19', 'av20', 'av21', 'av22', 'av23', 'av24'].includes(id) && <path d="M20 78c0-8 10-13 30-13s30 5 30 13v22H20V78z" fill={id === 'av19' ? "#0D47A1" : id === 'av20' ? "#212121" : id === 'av21' ? "#E64A19" : id === 'av22' ? "#00838F" : id === 'av23' ? "#1A1A1A" : "#C62828"} />}

                    {/* Tie / Shirt details */}
                    {['av3', 'av18', 'av23'].includes(id) && (
                        <>
                            <path d="M42 63L50 78L58 63" fill="white" />
                            <path d="M48 68L50 85L52 68" fill={id === 'av3' ? "#1976D2" : id === 'av18' ? "#37474F" : "#00838F"} />
                        </>
                    )}
                    {id === 'av14' && <path d="M48 65L50 85L52 65" fill="#BF360C" />}
                    {id === 'av24' && <path d="M42 65L50 78L58 65" fill="white" />}

                    {/* HAIR & EXTRAS */}
                    {['av1', 'av10', 'av12', 'av17', 'av20'].includes(id) && <path d="M28 45C28 25 35 15 50 15C65 15 72 25 72 45H28Z" fill={id === 'av1' ? "#3D2314" : id === 'av20' ? "#121212" : "#5D4037"} />}
                    {['av2', 'av3', 'av8', 'av9', 'av13', 'av14', 'av18', 'av19', 'av21', 'av23', 'av24'].includes(id) && <path d="M30 40C30 25 38 18 50 18C62 18 70 25 70 40H30Z" fill={id === 'av3' ? "#ECEFF1" : id === 'av9' ? "#FF5722" : id === 'av21' ? "#2D1B0F" : "#121212"} />}
                    {id === 'av4' && (
                        <>
                            <path d="M28 48c0-20 10-30 22-30s22 10 22 30h-44z" fill="#3D2314" />
                            <circle cx="50" cy="18" r="8" fill="#3D2314" />
                        </>
                    )}
                    {['av5', 'av15'].includes(id) && <circle cx="50" cy="38" r="28" fill="#121212" />}
                    {id === 'av6' && (
                        <>
                            <ellipse cx="50" cy="45" rx="18" ry="22" fill="#FFDBAC" />
                        </>
                    )}
                    {id === 'av7' && (
                        <>
                            <path d="M15 40L50 15L85 40v35H15V40z" fill="white" />
                            <rect x="25" y="42" width="50" height="4" rx="2" fill="#121212" />
                        </>
                    )}
                    {id === 'av11' && (
                        <>
                            <path d="M30 45c0-15 8-22 20-22s20 7 20 22H30z" fill="#121212" />
                            <circle cx="50" cy="22" r="8" fill="#121212" />
                        </>
                    )}
                    {id === 'av16' && <path d="M25 45c0-20 12-30 25-30s25 10 25 30v15H25V45z" fill="#1A1A1A" />}
                    {id === 'av22' && (
                        <>
                            <path d="M30 45C30 30 38 22 50 22C62 22 70 30 70 45H30Z" fill="#5D4037" />
                            <path d="M68 45v30" stroke="#5D4037" strokeWidth="6" strokeLinecap="round" />
                        </>
                    )}

                    {/* FACIAL HAIR */}
                    {['av3', 'av7', 'av8', 'av19', 'av21'].includes(id) && (
                        <path d="M32 60c0 10 8 18 18 18s18-8 18-18H32z" fill={id === 'av3' ? "#ECEFF1" : id === 'av7' || id === 'av8' || id === 'av21' ? "#2D1B0F" : "#121212"} />
                    )}

                    {/* EYES */}
                    <g fill="#121212">
                        <circle cx="42" cy="48" r="3" />
                        <circle cx="58" cy="48" r="3" />
                    </g>

                    {/* GLASSES */}
                    {['av10', 'av13', 'av19', 'av20', 'av24'].includes(id) && (
                        <>
                            <rect x="30" y="45" width="16" height="12" rx="2" stroke="#121212" strokeWidth="2" fill="none" />
                            <rect x="54" y="45" width="16" height="12" rx="2" stroke="#121212" strokeWidth="2" fill="none" />
                        </>
                    )}

                    {/* MOUTH */}
                    <path d="M44 64c0 0 3 3 6 3s6-3 6-3" stroke="#121212" strokeWidth="2" strokeLinecap="round" fill="none" />
                </g>
            </svg>
        </div>
    );
};

export default Avatar;
