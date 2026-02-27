import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
    Sparkles, Send, RefreshCw, ArrowRight, Download, Eye,
    Plus, LogOut, Check, Globe, Layers, ChevronDown,
    Type, Palette, Hash, Image as ImageIcon, Layout,
    Sliders, Instagram, FileText, Wand2, ChevronRight,
    PanelRightOpen, PanelRightClose, Maximize2, Edit3, ZoomIn, ZoomOut, RotateCcw,
    EyeOff, ShieldCheck, Trash2, Bold, Italic, List, Table as TableIcon, Type as TypeIcon,
    AlignLeft, AlignCenter, AlignRight, Underline, Undo2, Redo2, MousePointer2, Rows, Move, ChevronUp, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Login from './Login';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8899";

const THEME_PRESETS = [
    { name: '다크 골드', bg: '#1A1A1A', primary: '#D4AF37', accent: '#f5c842', icon: '🌙' },
    { name: '클린 화이트', bg: '#FFFFFF', primary: '#111111', accent: '#333333', icon: '☀️' },
    { name: '네이비 블루', bg: '#0F172A', primary: '#3B82F6', accent: '#60a5fa', icon: '🌊' },
    { name: '네온 사이버', bg: '#0A0A0A', primary: '#39FF14', accent: '#00ffff', icon: '⚡' },
    { name: '로즈 핑크', bg: '#FFF5F5', primary: '#E11D48', accent: '#fb7185', icon: '🌸' },
    { name: '포레스트', bg: '#0D1117', primary: '#2EA043', accent: '#3fb950', icon: '🌲' },
    { name: '선셋 오렌지', bg: '#1a0a00', primary: '#F77737', accent: '#ff9966', icon: '🌅' },
    { name: '퍼플 드림', bg: '#0d0014', primary: '#a855f7', accent: '#c084fc', icon: '💜' },
];

const GENERATE_STEPS = [
    { label: '🔍 자료 조사 중', detail: '실시간 트렌드 데이터 분석...' },
    { label: '✍️ 기획안 작성 중', detail: 'AI가 스토리보드를 구성 중...' },
    { label: '🎨 디자인 생성 중', detail: '프리미엄 레이아웃 렌더링...' },
    { label: '✨ 마무리 중', detail: '최종 품질 검사 중...' },
];

export default function App() {
    const [user, setUser] = useState(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [inputText, setInputText] = useState('');
    const [htmlText, setHtmlText] = useState('');
    const [editableHtml, setEditableHtml] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generateStep, setGenerateStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [activeStep, setActiveStep] = useState(1);
    const [slideCount, setSlideCount] = useState(5);
    const [sidebarTab, setSidebarTab] = useState('theme');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [titleColor, setTitleColor] = useState('#D4AF37');
    const [bgColor, setBgColor] = useState('#1A1A1A');
    const [history, setHistory] = useState([]);
    const [backendStatus, setBackendStatus] = useState('checking');
    const [editMode, setEditMode] = useState(false);
    const [zoom, setZoom] = useState(0.55);
    const [bgImage, setBgImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [refining, setRefining] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [claudeApiKey, setClaudeApiKey] = useState(localStorage.getItem('claude_api_key') || '');
    const [openaiApiKey, setOpenaiApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [deepseekApiKey, setDeepseekApiKey] = useState(localStorage.getItem('deepseek_api_key') || '');
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showClaudeKey, setShowClaudeKey] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [showDeepSeekKey, setShowDeepSeekKey] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    // Floating toolbar state (text selection)
    const [floatingBar, setFloatingBar] = useState({ show: false, x: 0, y: 0 });
    const [floatingFontSize, setFloatingFontSize] = useState(16);
    const [floatingColor, setFloatingColor] = useState('#ffffff');

    // Element click panel state (only active in element select mode)
    const [elementSelectMode, setElementSelectMode] = useState(false);
    const [elPanel, setElPanel] = useState({ show: false, x: 0, y: 0, el: null });
    const [elPanelData, setElPanelData] = useState({ fontSize: '', padding: '', bg: '', align: 'center' });

    // Undo/Redo
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const undoDebounceRef = useRef(null);

    // Card structure
    const [cardStructure, setCardStructure] = useState([]);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // Canva-style canvas editor state
    const [selectedEl, setSelectedEl] = useState(null);
    const [selBox, setSelBox] = useState(null); // { x, y, w, h } in viewport (fixed) coords
    const [elRotation, setElRotation] = useState(0);

    const prevHighlightElRef = useRef(null);
    const dragStateRef = useRef({ el: null });
    const selectedElRef = useRef(null);
    const canvasScrollRef = useRef(null);
    const dragStartRef = useRef({});
    const previewRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- Helper & API Functions ---
    const checkHealth = async () => {
        try {
            const resp = await fetch(`${BACKEND_URL}/api/health`);
            setBackendStatus(resp.ok ? 'online' : 'offline');
        } catch { setBackendStatus('offline'); }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resp = await fetch(`${BACKEND_URL}/api/history`, { headers });
            const data = await resp.json();
            if (data.history) {
                const seen = new Map();
                data.history.forEach(item => {
                    const key = item.text?.trim().substring(0, 50);
                    if (!seen.has(key) || item.timestamp > seen.get(key).timestamp) {
                        seen.set(key, item);
                    }
                });
                setHistory(Array.from(seen.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')));
            }
        } catch (err) { console.error("History fetch failed", err); }
    };

    const checkAuth = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) { setAuthChecking(false); return; }
        try {
            const resp = await fetch(`${BACKEND_URL}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await resp.json();
            if (data.authenticated) setUser(data.user);
            else localStorage.removeItem('auth_token');
        } catch (err) { console.error(err); }
        finally { setAuthChecking(false); }
    };

    const fetchUserSettings = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/user/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data) {
                setGeminiApiKey(data.gemini_api_key || '');
                setClaudeApiKey(data.claude_api_key || '');
                setOpenaiApiKey(data.openai_api_key || '');
                setDeepseekApiKey(data.deepseek_api_key || '');
            }
        } catch (err) { console.error("Settings fetch failed", err); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.url) setBgImage(data.url);
        } catch (err) { setError("이미지 업로드에 실패했습니다."); }
        finally { setUploading(false); }
    };

    const handleLogout = () => { localStorage.removeItem('auth_token'); setUser(null); };

    const handleSaveSettings = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/user/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gemini_api_key: geminiApiKey,
                    claude_api_key: claudeApiKey,
                    openai_api_key: openaiApiKey,
                    deepseek_api_key: deepseekApiKey
                })
            });
            if (response.ok) {
                setShowSettings(false);
                alert("설정이 서버에 안전하게 저장되었습니다.");
            } else {
                throw new Error("저장 실패");
            }
        } catch (err) { alert("설정 저장에 실패했습니다."); }
        finally { setLoading(false); }
    };

    const handleGenerate = async () => {
        if (!inputText.trim()) return;
        setGenerating(true);
        setGenerateStep(0);
        setError(null);
        const stepTimer = setInterval(() => {
            setGenerateStep(prev => Math.min(prev + 1, GENERATE_STEPS.length - 1));
        }, 3000);
        try {
            const response = await fetch(`${BACKEND_URL}/api/generate_html`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    text: inputText,
                    slide_count: Number(slideCount),
                    ...(bgImage ? { bg_image_url: bgImage } : {}),
                    ...(selectedTheme ? { theme: selectedTheme } : {}),
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "서버 오류가 발생했습니다." }));
                throw new Error(errorData.detail || "생성 실패");
            }
            const data = await response.json();
            if (data.html) { setHtmlText(data.html); setActiveStep(2); setEditMode(false); }
        } catch (err) {
            console.error(err);
            setError(err.message || "생성 실패. 다시 시도해주세요.");
        } finally {
            clearInterval(stepTimer);
            setGenerating(false);
            fetchHistory();
        }
    };

    const handleRefine = async () => {
        if (!refineText.trim() || !editableHtml) return;
        setRefining(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/generate_html`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `다음 HTML 카드뉴스를 이렇게 수정해줘: "${refineText}"\n\n현재 HTML:\n${editableHtml.substring(0, 3000)}`,
                    slide_count: Number(slideCount),
                }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.html) { setHtmlText(data.html); setRefineText(''); }
            }
        } catch (err) { setError("수정 실패. 다시 시도해주세요."); }
        finally { setRefining(false); }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const currentHtml = editMode && previewRef.current
                ? previewRef.current.innerHTML
                : injectStyles(editableHtml);
            const formData = new FormData();
            formData.append('html_content', currentHtml);
            const response = await fetch(`${BACKEND_URL}/api/convert`, { method: 'POST', body: formData });
            const data = await response.json();
            setResult(data);
        } catch (err) { setError("변환 실패."); }
        finally { setLoading(false); }
    };

    const injectStyles = (html) => {
        if (!html) return html;
        const s = `<style>
            .slide, body > div[style*="1080px"], body > div[style*="1080px"] { 
                background: ${bgColor} !important; 
                background-image: none !important;
            }
            .slide h1, .slide h2, .slide h3, .slide h4, .slide .title,
            body > div h1, body > div h2, body > div h3,
            .slide span, .slide p, .slide div,
            [style*="color:#D4AF37"], [style*="color: #D4AF37"], 
            [style*="color:#d4af37"], [style*="color: gold"],
            [style*="border-color"] { 
                color: ${titleColor} !important;
                border-color: ${titleColor} !important;
            }
            [style*="background:${titleColor}"], [style*="background-color:${titleColor}"] {
                color: ${bgColor} !important;
            }
            body { margin: 0; padding: 0; overflow-x: hidden; }
            [contenteditable="true"] *:not(table):not(tr):not(td):not(th) {
                pointer-events: auto !important;
                user-select: text !important;
                z-index: 100 !important;
                position: relative;
            }
            /* 요소 선택 모드(contenteditable=false)에서도 모든 요소 클릭 가능 */
            [contenteditable="false"] *:not(table):not(tr):not(td):not(th) {
                pointer-events: auto !important;
                cursor: default !important;
            }
            [contenteditable="true"] .background-decoration,
            [contenteditable="true"] .overlay-gradient,
            [contenteditable="true"] .blob,
            [contenteditable="true"] .mask,
            [contenteditable="true"] svg,
            [contenteditable="true"] img:not(.content-image) {
                pointer-events: none !important;
                z-index: 1 !important;
            }
            [contenteditable="true"] table, [contenteditable="true"] tr, [contenteditable="true"] td, [contenteditable="true"] th {
                pointer-events: auto !important;
                z-index: 100 !important;
            }
        </style>`;
        return html.includes('</head>') ? html.replace('</head>', `${s}</head>`) : s + html;
    };

    const applyTheme = (theme) => {
        setBgColor(theme.bg);
        setTitleColor(theme.primary);
        setSelectedTheme(theme.name);
    };

    // --- Callbacks ---
    const saveUndo = useCallback(() => {
        if (!previewRef.current) return;
        const html = previewRef.current.innerHTML;
        clearTimeout(undoDebounceRef.current);
        undoDebounceRef.current = setTimeout(() => {
            setUndoStack(prev => [...prev.slice(-29), html]);
            setRedoStack([]);
        }, 500);
    }, []);

    const applyFontSize = useCallback((sizePx) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        if (!sel.isCollapsed) {
            try {
                const range = sel.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = `${sizePx}px`;
                range.surroundContents(span);
            } catch {
                document.execCommand('insertHTML', false, `<span style="font-size:${sizePx}px">${sel.toString()}</span>`);
            }
        } else {
            const el = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
            if (el && el !== previewRef.current) el.style.fontSize = `${sizePx}px`;
        }
        setFloatingFontSize(sizePx);
        if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
        saveUndo();
    }, [saveUndo]);

    const selectElement = useCallback((el) => {
        if (prevHighlightElRef.current && prevHighlightElRef.current !== el) {
            prevHighlightElRef.current.style.outline = '';
            prevHighlightElRef.current.style.outlineOffset = '';
        }
        if (!el) {
            setSelectedEl(null); setSelBox(null);
            setElPanel(prev => ({ ...prev, show: false }));
            prevHighlightElRef.current = null;
            return;
        }
        prevHighlightElRef.current = el;
        if (!('tx' in el.dataset)) {
            el.dataset.origTransform = el.style.transform || '';
            el.dataset.tx = '0'; el.dataset.ty = '0'; el.dataset.rotation = '0';
        }
        const r = el.getBoundingClientRect();
        setSelectedEl(el);
        setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
        setElRotation(parseFloat(el.dataset.rotation || '0'));
        const cs = window.getComputedStyle(el);
        setElPanel({
            show: true,
            x: Math.min(r.left, window.innerWidth - 240),
            y: Math.min(r.bottom + 8, window.innerHeight - 180),
            el,
        });
        setElPanelData({
            fontSize: Math.round(parseFloat(cs.fontSize)) || '',
            padding: el.style.padding || '',
            bg: el.style.backgroundColor || '',
            align: cs.textAlign || 'center',
        });
        setSidebarTab('props');
        setSidebarOpen(prev => {
            // 사이드바가 닫혀있었다면 열린 후 selBox 재계산 (260px 레이아웃 이동 보정)
            if (!prev) {
                setTimeout(() => {
                    if (el.isConnected) {
                        const r2 = el.getBoundingClientRect();
                        setSelBox({ x: r2.left, y: r2.top, w: r2.width, h: r2.height });
                    }
                }, 250); // 사이드바 애니메이션(200ms) 완료 후
            }
            return true;
        });
    }, []);

    const handleElClick = useCallback((e) => {
        if (!elementSelectMode) return;
        const target = e.target;
        if (!target || target === previewRef.current) { selectElement(null); return; }
        e.stopPropagation();
        selectElement(target);
    }, [elementSelectMode, selectElement]);

    const applyToEl = useCallback((prop, value) => {
        const el = elPanel.el;
        if (!el) return;
        el.style[prop] = value;
        setElPanelData(prev => ({ ...prev, [prop]: value }));
        if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
        saveUndo();
    }, [elPanel.el, saveUndo]);

    const parseCardStructure = useCallback(() => {
        if (!previewRef.current) return;
        const children = Array.from(previewRef.current.children);
        const slides = children.map((slide, i) => {
            const h = slide.querySelector('h1, h2, h3, [style*="font-size: 1"]');
            const title = h?.textContent?.trim().substring(0, 25) || `슬라이드 ${i + 1}`;
            return { index: i, el: slide, title, id: `slide-${i}` };
        });
        setCardStructure(slides);
    }, []);

    const moveSlide = useCallback((fromIdx, toIdx) => {
        if (!previewRef.current) return;
        const slides = Array.from(previewRef.current.children);
        if (fromIdx < 0 || fromIdx >= slides.length || toIdx < 0 || toIdx >= slides.length) return;
        const moving = slides[fromIdx];
        const reference = slides[toIdx];
        if (fromIdx < toIdx) previewRef.current.insertBefore(moving, reference.nextSibling);
        else previewRef.current.insertBefore(moving, reference);
        saveUndo();
        parseCardStructure();
        setEditableHtml(previewRef.current.innerHTML);
    }, [saveUndo, parseCardStructure]);

    const startDrag = useCallback((e, handle) => {
        e.preventDefault(); e.stopPropagation();
        if (!selectedEl || !selBox) return;
        const el = selectedEl;
        const z = zoom;
        const tx0 = parseFloat(el.dataset.tx || '0');
        const ty0 = parseFloat(el.dataset.ty || '0');
        const rot0 = parseFloat(el.dataset.rotation || '0');
        dragStartRef.current = {
            mouseX: e.clientX, mouseY: e.clientY,
            origX: selBox.x, origY: selBox.y,
            origW: selBox.w, origH: selBox.h,
            origTx: tx0, origTy: ty0, origRot: rot0,
            zoom: z, handle,
        };
        const applyEl = (newTx, newTy, newRot) => {
            const base = el.dataset.origTransform || '';
            const parts = [];
            if (newTx !== 0 || newTy !== 0) parts.push(`translate(${newTx}px, ${newTy}px)`);
            if (newRot !== 0) parts.push(`rotate(${newRot}deg)`);
            el.style.transform = (base + (parts.length ? ' ' + parts.join(' ') : '')).trim();
            el.dataset.tx = newTx; el.dataset.ty = newTy; el.dataset.rotation = newRot;
        };
        const onMove = (me) => {
            const d = dragStartRef.current;
            const dxV = me.clientX - d.mouseX;
            const dyV = me.clientY - d.mouseY;
            const dxC = dxV / d.zoom;
            const dyC = dyV / d.zoom;
            if (d.handle === 'move') {
                setSelBox({ x: d.origX + dxV, y: d.origY + dyV, w: d.origW, h: d.origH });
                applyEl(d.origTx + dxC, d.origTy + dyC, d.origRot);
            } else if (d.handle === 'rotate') {
                const cx = d.origX + d.origW / 2;
                const cy = d.origY + d.origH / 2;
                const a0 = Math.atan2(d.mouseY - cy, d.mouseX - cx);
                const a1 = Math.atan2(me.clientY - cy, me.clientX - cx);
                const newRot = d.origRot + (a1 - a0) * 180 / Math.PI;
                setElRotation(newRot);
                applyEl(d.origTx, d.origTy, newRot);
            } else {
                let newW = d.origW, newH = d.origH;
                let newTx = d.origTx, newTy = d.origTy;
                let newBX = d.origX, newBY = d.origY;
                if (d.handle.includes('e')) newW = Math.max(20 * d.zoom, d.origW + dxV);
                if (d.handle.includes('s')) newH = Math.max(20 * d.zoom, d.origH + dyV);
                if (d.handle.includes('w')) {
                    newW = Math.max(20 * d.zoom, d.origW - dxV);
                    newBX = d.origX + (d.origW - newW);
                    newTx = d.origTx + (d.origW - newW) / d.zoom;
                }
                if (d.handle.includes('n')) {
                    newH = Math.max(20 * d.zoom, d.origH - dyV);
                    newBY = d.origY + (d.origH - newH);
                    newTy = d.origTy + (d.origH - newH) / d.zoom;
                }
                setSelBox({ x: newBX, y: newBY, w: newW, h: newH });
                applyEl(newTx, newTy, d.origRot);
                el.style.width = (newW / d.zoom) + 'px';
                el.style.height = (newH / d.zoom) + 'px';
                el.style.boxSizing = 'border-box';
            }
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setTimeout(() => {
                const cur = selectedElRef.current;
                if (cur) { const r = cur.getBoundingClientRect(); setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height }); }
            }, 50);
            if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
            saveUndo();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [selectedEl, selBox, zoom, saveUndo]);

    // --- Effects ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) { localStorage.setItem('auth_token', token); window.history.replaceState({}, document.title, "/"); }
        checkAuth(); fetchHistory(); checkHealth(); fetchUserSettings();

        const handleKeyDown = (e) => {
            if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                const target = e.target;
                if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
                e.preventDefault();
                setUndoStack(prev => {
                    if (prev.length === 0) return prev;
                    const html = prev[prev.length - 1];
                    setRedoStack(r => [...r, previewRef.current?.innerHTML || '']);
                    if (previewRef.current) { previewRef.current.innerHTML = html; setEditableHtml(html); }
                    return prev.slice(0, -1);
                });
                return;
            }
            if ((e.key === 'y' && (e.metaKey || e.ctrlKey)) || (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey)) {
                const target = e.target;
                if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
                e.preventDefault();
                setRedoStack(prev => {
                    if (prev.length === 0) return prev;
                    const html = prev[prev.length - 1];
                    setUndoStack(u => [...u, previewRef.current?.innerHTML || '']);
                    if (previewRef.current) { previewRef.current.innerHTML = html; setEditableHtml(html); }
                    return prev.slice(0, -1);
                });
                return;
            }
            if (e.key === 'Backspace') {
                const target = e.target;
                const isEditable = target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
                if (!isEditable) e.preventDefault();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => { selectedElRef.current = selectedEl; }, [selectedEl]);

    useEffect(() => {
        if (!selectedEl) return;
        const updateBox = () => {
            const r = selectedEl.getBoundingClientRect();
            setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
        };
        const scrollEl = canvasScrollRef.current;
        scrollEl?.addEventListener('scroll', updateBox);
        window.addEventListener('resize', updateBox);
        return () => {
            scrollEl?.removeEventListener('scroll', updateBox);
            window.removeEventListener('resize', updateBox);
        };
    }, [selectedEl]);

    useEffect(() => {
        if (!elementSelectMode) return;
        const handler = (e) => {
            const el = selectedElRef.current;
            if (!el) return;
            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedEl(null); setSelBox(null);
                setElPanel(prev => ({ ...prev, show: false }));
                if (prevHighlightElRef.current) { prevHighlightElRef.current.style.outline = ''; prevHighlightElRef.current = null; }
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                el.remove();
                setSelectedEl(null); setSelBox(null);
                setElPanel(prev => ({ ...prev, show: false }));
                prevHighlightElRef.current = null;
                if (previewRef.current) { setEditableHtml(previewRef.current.innerHTML); saveUndo(); }
                return;
            }
            const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
            if (isArrow) {
                e.preventDefault();
                const nudge = e.shiftKey ? 10 : 1;
                const tx = parseFloat(el.dataset.tx || '0');
                const ty = parseFloat(el.dataset.ty || '0');
                const rot = parseFloat(el.dataset.rotation || '0');
                const newTx = tx + (e.key === 'ArrowLeft' ? -nudge : e.key === 'ArrowRight' ? nudge : 0);
                const newTy = ty + (e.key === 'ArrowUp' ? -nudge : e.key === 'ArrowDown' ? nudge : 0);
                el.dataset.tx = newTx; el.dataset.ty = newTy;
                const base = el.dataset.origTransform || '';
                const parts = [];
                if (newTx !== 0 || newTy !== 0) parts.push(`translate(${newTx}px, ${newTy}px)`);
                if (rot !== 0) parts.push(`rotate(${rot}deg)`);
                el.style.transform = (base + (parts.length ? ' ' + parts.join(' ') : '')).trim();
                const r = el.getBoundingClientRect();
                setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
                if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [elementSelectMode, saveUndo]);

    useEffect(() => {
        if (!elementSelectMode) {
            setSelectedEl(null); setSelBox(null);
            if (prevHighlightElRef.current) { prevHighlightElRef.current.style.outline = ''; prevHighlightElRef.current = null; }
            setElPanel(prev => ({ ...prev, show: false }));
        }
    }, [elementSelectMode]);

    useEffect(() => {
        const onSelChange = () => {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed && sel.rangeCount > 0 && previewRef.current?.contains(sel.anchorNode)) {
                const rect = sel.getRangeAt(0).getBoundingClientRect();
                setFloatingBar({ show: true, x: rect.left + rect.width / 2, y: rect.top });
                const el = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
                if (el) {
                    const cs = window.getComputedStyle(el);
                    setFloatingFontSize(Math.round(parseFloat(cs.fontSize)) || 16);
                    setFloatingColor(cs.color || '#ffffff');
                }
            } else { setFloatingBar(prev => ({ ...prev, show: false })); }
        };
        document.addEventListener('selectionchange', onSelChange);
        return () => document.removeEventListener('selectionchange', onSelChange);
    }, []);

    useEffect(() => {
        if (htmlText && previewRef.current) {
            previewRef.current.innerHTML = injectStyles(htmlText);
            setEditableHtml(htmlText); setUndoStack([]); setRedoStack([]);
            // 새 HTML 로드 시 기존 선택 초기화 (stale DOM 참조 방지)
            setSelectedEl(null); setSelBox(null);
            setElPanel(prev => ({ ...prev, show: false }));
            if (prevHighlightElRef.current) { prevHighlightElRef.current = null; }
            setTimeout(() => parseCardStructure(), 100);
        }
    }, [htmlText, parseCardStructure]);

    if (authChecking) return (
        <div className="h-screen flex items-center justify-center bg-[#FAFAFA]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center animate-pulse">
                    <Instagram size={24} className="text-white" />
                </div>
                <span className="text-xs font-bold text-gray-400">불러오는 중...</span>
            </div>
        </div>
    );

    if (!user) return <Login />;

    return (
        <div className="h-screen flex flex-col bg-[#FAFAFA] text-gray-900 overflow-hidden" style={{ fontFamily: "'Noto Sans KR', 'Inter', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&family=Inter:wght@300;400;700;900&display=swap" rel="stylesheet" />

            {/* ===== HEADER ===== */}
            <header className="h-12 border-b border-gray-200/60 flex items-center justify-between px-5 bg-white/80 backdrop-blur-xl z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center">
                        <Instagram size={14} className="text-white" />
                    </div>
                    <div className="flex items-center gap-1.5 mr-2">
                        <span className="font-black text-sm">카드뉴스</span>
                        <span className="text-[10px] font-bold text-gray-400">스튜디오</span>
                    </div>
                    <div className="hidden md:flex items-center gap-1 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                        <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`} />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                            {backendStatus === 'online' ? 'AI Engine Active' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-1">
                    {['입력', '편집', '내보내기'].map((label, i) => (
                        <button key={i} onClick={() => { if (i + 1 <= (htmlText ? 2 : 1)) setActiveStep(i + 1); }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold transition-all ${activeStep === i + 1 ? 'bg-gray-900 text-white' : activeStep > i + 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {activeStep > i + 1 ? <Check size={9} /> : <span>{i + 1}</span>}
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {user && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-gray-900 transition-colors p-1" title="API 설정">
                                <Sliders size={14} />
                            </button>
                            {user.picture && <img src={user.picture} alt="avatar" className="w-6 h-6 rounded-full" />}
                            <span className="text-[10px] font-bold text-gray-600 hidden md:block">{user.name}</span>
                            <button onClick={handleLogout} className="text-gray-300 hover:text-gray-900 transition-colors p-1">
                                <LogOut size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ===== MAIN CONTENT ===== */}
            <div className="flex-1 flex overflow-hidden">

                {/* ===== LEFT SIDEBAR: HISTORY (항상 표시) ===== */}
                <div className="w-52 border-r border-gray-200/60 bg-white shrink-0 flex flex-col overflow-hidden hidden md:flex">
                    <div className="p-3 border-b border-gray-100 shrink-0">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">최근 생성 기록</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-gray-300">
                                <FileText size={24} className="mx-auto mb-2 opacity-30" />
                                <p className="text-[10px]">생성 기록이 없어요</p>
                            </div>
                        ) : (
                            history.map((item, i) => (
                                <button key={i} onClick={() => { setHtmlText(item.html); setInputText(item.text); setSlideCount(item.slide_count); setActiveStep(2); }}
                                    className="w-full text-left p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        {i === 0 && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">최근 작업</span>}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-700 truncate">{item.text}</div>
                                    <div className="text-[9px] text-gray-300 mt-0.5">{item.slide_count}장 · {item.timestamp?.slice(0, 10)}</div>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t border-gray-100 shrink-0">
                        <button onClick={() => { setActiveStep(1); setHtmlText(''); setError(null); }}
                            className="w-full flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 py-2 rounded-xl text-[10px] font-bold transition-colors">
                            <Plus size={11} /> 새 카드뉴스
                        </button>
                    </div>
                </div>

                {/* ===== MAIN AREA ===== */}
                {activeStep === 1 ? (
                    /* ===== STEP 1: 입력 ===== */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-6">
                            {/* Hero */}
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833AB4]/10 via-[#E1306C]/10 to-[#F77737]/10 px-4 py-1.5 rounded-full border border-[#E1306C]/20">
                                    <Sparkles size={12} className="text-[#E1306C]" />
                                    <span className="text-[11px] font-bold text-[#E1306C]">AI 기반 카드뉴스 생성 스튜디오</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                                    카드뉴스를<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737]">AI로 만들어보세요</span>
                                </h1>
                                <p className="text-gray-400 text-sm">주제나 텍스트를 입력하면 인스타그램 최적화 카드뉴스가 자동 생성됩니다</p>
                            </div>



                            {/* Input Area */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] rounded-[22px] blur opacity-10 group-focus-within:opacity-25 transition duration-700"></div>
                                <div className="relative">
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleGenerate(); }}
                                        placeholder={`카드뉴스로 만들 주제나 내용을 입력하세요...\n\n예: 2026년 부동산 시장 전망과 투자 전략 5가지`}
                                        className="w-full h-44 bg-white rounded-2xl p-5 pb-16 outline-none text-base font-medium placeholder:text-gray-300 border border-transparent group-focus-within:border-gray-100 transition-all resize-none shadow-xl"
                                    />
                                    <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                                <Layers size={12} className="text-gray-400" />
                                                <span className="text-[10px] font-black text-gray-500">{slideCount}장</span>
                                                <input type="range" min="3" max="10" value={slideCount}
                                                    onChange={(e) => setSlideCount(parseInt(e.target.value))}
                                                    className="w-20 accent-[#E1306C] h-1.5 rounded-full appearance-none cursor-pointer" />
                                            </div>
                                            {bgImage ? (
                                                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-1 rounded-lg cursor-pointer" onClick={() => setBgImage(null)}>
                                                    <Check size={10} className="text-green-600" />
                                                    <span className="text-[9px] text-green-600 font-bold">배경 이미지 선택됨 (클릭해 제거)</span>
                                                </div>
                                            ) : (
                                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                                                    <ImageIcon size={11} /> 배경 이미지
                                                </button>
                                            )}
                                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                        </div>
                                        <button onClick={handleGenerate} disabled={generating || !inputText.trim()}
                                            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-black active:scale-95 transition-all disabled:opacity-30 shadow-xl">
                                            {generating ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                            {generating ? GENERATE_STEPS[generateStep]?.label : '생성하기'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 생성 중 진행상황 */}
                            <AnimatePresence>
                                {generating && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] to-[#F77737] flex items-center justify-center animate-pulse">
                                                <Sparkles size={14} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-800">{GENERATE_STEPS[generateStep]?.label}</p>
                                                <p className="text-[10px] text-gray-400">{GENERATE_STEPS[generateStep]?.detail}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {GENERATE_STEPS.map((_, i) => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= generateStep ? 'bg-gradient-to-r from-[#833AB4] to-[#F77737]' : 'bg-gray-100'}`} />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 font-medium">
                                    ⚠️ {error}
                                    <button className="ml-3 text-red-400 hover:text-red-600 text-xs underline" onClick={() => setError(null)}>닫기</button>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                ) : (
                    /* ===== STEP 2: 에디터 ===== */
                    <>
                        {/* PREVIEW AREA */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                            {/* Toolbar (Increased Z-Index to avoid being blocked) */}
                            <div className="h-11 border-b border-gray-200/60 bg-white flex items-center justify-between px-4 shrink-0 gap-2 relative z-[110] shadow-sm">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setActiveStep(1); }}
                                        className="flex items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors text-[10px] font-bold">
                                        <ArrowRight size={12} className="rotate-180" /> 뒤로
                                    </button>
                                    <div className="w-px h-4 bg-gray-200" />
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        <Sparkles size={11} />
                                        클릭해서 즉시 수정 · 텍스트 선택 시 툴바 표시
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => {
                                            setUndoStack(prev => {
                                                if (prev.length === 0) return prev;
                                                const html = prev[prev.length - 1];
                                                setRedoStack(r => [...r, previewRef.current?.innerHTML || '']);
                                                if (previewRef.current) { previewRef.current.innerHTML = html; setEditableHtml(html); }
                                                return prev.slice(0, -1);
                                            });
                                        }} disabled={undoStack.length === 0} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30" title="실행 취소 (Ctrl+Z)">
                                            <Undo2 size={12} />
                                        </button>
                                        <button onClick={() => {
                                            setRedoStack(prev => {
                                                if (prev.length === 0) return prev;
                                                const html = prev[prev.length - 1];
                                                setUndoStack(u => [...u, previewRef.current?.innerHTML || '']);
                                                if (previewRef.current) { previewRef.current.innerHTML = html; setEditableHtml(html); }
                                                return prev.slice(0, -1);
                                            });
                                        }} disabled={redoStack.length === 0} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30" title="다시 실행 (Ctrl+Y)">
                                            <Redo2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.05))} className="p-1 rounded hover:bg-gray-100 text-gray-400"><ZoomOut size={12} /></button>
                                        <span className="text-[10px] font-bold text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                                        <button onClick={() => setZoom(z => Math.min(1, z + 0.05))} className="p-1 rounded hover:bg-gray-100 text-gray-400"><ZoomIn size={12} /></button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const next = !elementSelectMode;
                                            setElementSelectMode(next);
                                            if (next) setSidebarTab('props');
                                            if (!next && prevHighlightElRef.current) {
                                                prevHighlightElRef.current.style.outline = '';
                                                prevHighlightElRef.current = null;
                                                setElPanel(prev => ({ ...prev, show: false }));
                                            }
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${elementSelectMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        title="요소 선택 모드: 드래그·리사이즈·회전 활성화"
                                    >
                                        <MousePointer2 size={11} />
                                        {elementSelectMode ? '요소 선택 ON' : '요소 선택'}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 relative z-[150]">
                                    <button onClick={() => { setError(null); handleGenerate(); }}
                                        disabled={generating}
                                        className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-gray-200 transition-all disabled:opacity-40">
                                        <RefreshCw size={11} className={generating ? 'animate-spin' : ''} /> 재생성
                                    </button>
                                    <button onClick={handleExport} disabled={loading}
                                        className="flex items-center gap-1.5 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white px-4 py-1.5 rounded-lg font-bold text-[10px] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                                        <Download size={11} />
                                        {loading ? 'PNG 변환 중...' : 'PNG로 내보내기'}
                                    </button>
                                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                                        {sidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Rich Text Editor Toolbar (Always Visible for seamless editing) */}
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-20 shadow-sm overflow-x-auto no-scrollbar py-2"
                            >
                                <div className="flex items-center gap-1 border-r border-gray-100 pr-3">
                                    <select
                                        onChange={(e) => document.execCommand('fontName', false, e.target.value)}
                                        className="text-[10px] font-bold bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none"
                                    >
                                        <option value="Noto Sans KR">Noto Sans KR</option>
                                        <option value="Pretendard">Pretendard</option>
                                        <option value="Gmarket Sans">Gmarket Sans</option>
                                        <option value="Nanum Myeongjo">나눔명조</option>
                                    </select>
                                    <select
                                        onChange={(e) => document.execCommand('fontSize', false, e.target.value)}
                                        className="text-[10px] font-bold bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none"
                                    >
                                        <option value="3">보통</option>
                                        <option value="1">매우 작게</option>
                                        <option value="2">작게</option>
                                        <option value="4">크게</option>
                                        <option value="5">매우 크게</option>
                                        <option value="6">헤드라인</option>
                                        <option value="7">초대형</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1 border-r border-gray-100 pr-3 font-bold">
                                    <button onClick={() => document.execCommand('bold')} className="p-2 hover:bg-gray-100 rounded text-gray-600"><Bold size={14} /></button>
                                    <button onClick={() => document.execCommand('italic')} className="p-2 hover:bg-gray-100 rounded text-gray-600"><Italic size={14} /></button>
                                    <input
                                        type="color"
                                        onChange={(e) => document.execCommand('foreColor', false, e.target.value)}
                                        className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                                        title="글자 색상"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const tableHtml = `
                                                        <div style="margin: 20px 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; background: rgba(255,255,255,0.03); backdrop-filter: blur(10px); width: 100%;">
                                                            <table style="width: 100%; border-collapse: collapse; text-align: center;">
                                                                <thead style="background: rgba(255,255,255,0.05);">
                                                                    <tr>
                                                                        <th style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 24px; color: ${titleColor};">항목</th>
                                                                        <th style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 24px; color: ${titleColor};">수치</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 20px; color: #fff;">내용 1</td>
                                                                        <td style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 24px; color: #fff; font-weight: bold;">100%</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="padding: 20px; font-size: 20px; color: #fff;">내용 2</td>
                                                                        <td style="padding: 20px; font-size: 24px; color: #fff; font-weight: bold;">50%</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    `;
                                            document.execCommand('insertHTML', false, tableHtml);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-bold hover:bg-black transition-all"
                                    >
                                        <TableIcon size={12} /> 표 삽입
                                    </button>
                                </div>
                            </motion.div>

                            {/* Combined Preview & Editor Canvas */}
                            <div ref={canvasScrollRef} className="flex-1 overflow-auto bg-[#f8f9fa] p-10 flex justify-center">
                                <div className="relative group">
                                    <div
                                        style={{
                                            width: `${1080 * zoom}px`,
                                            height: `${slideCount * 1350 * zoom}px`,
                                            borderRadius: '12px',
                                            boxShadow: '0 50px 150px rgba(0,0,0,0.18)',
                                            position: 'relative',
                                            backgroundColor: '#fff',
                                            overflow: 'hidden',
                                            margin: '0 auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-start'
                                        }}
                                        className="group"
                                    >
                                        {/* Hover Edit Badge (텍스트 영역을 가리지 않도록 위치 및 속성 조정) */}
                                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="bg-indigo-600/95 text-white text-[11px] font-black px-5 py-2 rounded-full backdrop-blur-xl shadow-[0_10px_40px_rgba(79,70,229,0.4)] flex items-center gap-2 border border-indigo-400/30">
                                                <Edit3 size={12} className="animate-pulse" /> 클릭해서 즉시 수정
                                            </div>
                                        </div>

                                        <div
                                            ref={previewRef}
                                            contentEditable={elementSelectMode ? 'false' : 'true'}
                                            suppressContentEditableWarning
                                            onClick={handleElClick}
                                            onInput={(e) => {
                                                setEditableHtml(e.currentTarget.innerHTML);
                                                saveUndo();
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && e.currentTarget.innerHTML === '') {
                                                    e.preventDefault();
                                                }
                                                e.stopPropagation();
                                            }}
                                            style={{
                                                width: '1080px',
                                                height: 'auto',
                                                transform: `scale(${zoom})`,
                                                transformOrigin: 'top left',
                                                outline: 'none',
                                                backgroundColor: '#fff',
                                                wordBreak: 'keep-all',
                                                overflowWrap: 'break-word',
                                                minHeight: `${slideCount * 1350}px`,
                                                cursor: elementSelectMode ? 'default' : 'text',
                                                zIndex: 50,
                                                position: 'relative',
                                                pointerEvents: 'auto'
                                            }}
                                        />
                                    </div>

                                    {/* ===== CANVA-STYLE SELECTION OVERLAY ===== */}
                                    {elementSelectMode && selectedEl && selBox && (
                                        <div
                                            style={{
                                                position: 'fixed',
                                                left: selBox.x,
                                                top: selBox.y,
                                                width: selBox.w,
                                                height: selBox.h,
                                                zIndex: 9990,
                                                pointerEvents: 'auto',
                                                cursor: 'move',
                                                transform: elRotation ? `rotate(${elRotation}deg)` : undefined,
                                                transformOrigin: 'center',
                                                userSelect: 'none',
                                            }}
                                            onMouseDown={(e) => startDrag(e, 'move')}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Selection border */}
                                            <div style={{ position: 'absolute', inset: -1, border: '2px solid #4f46e5', borderRadius: 2, pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(79,70,229,0.15)' }} />

                                            {/* 8 Resize handles */}
                                            {[
                                                { id: 'nw', s: { top: -5, left: -5 }, cur: 'nw-resize' },
                                                { id: 'n', s: { top: -5, left: '50%', marginLeft: -5 }, cur: 'n-resize' },
                                                { id: 'ne', s: { top: -5, right: -5 }, cur: 'ne-resize' },
                                                { id: 'e', s: { top: '50%', right: -5, marginTop: -5 }, cur: 'e-resize' },
                                                { id: 'se', s: { bottom: -5, right: -5 }, cur: 'se-resize' },
                                                { id: 's', s: { bottom: -5, left: '50%', marginLeft: -5 }, cur: 's-resize' },
                                                { id: 'sw', s: { bottom: -5, left: -5 }, cur: 'sw-resize' },
                                                { id: 'w', s: { top: '50%', left: -5, marginTop: -5 }, cur: 'w-resize' },
                                            ].map(h => (
                                                <div key={h.id} style={{ position: 'absolute', width: 10, height: 10, background: 'white', border: '2px solid #4f46e5', borderRadius: 2, cursor: h.cur, zIndex: 1, ...h.s }}
                                                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, h.id); }} />
                                            ))}

                                            {/* Rotation connector + handle */}
                                            <div style={{ position: 'absolute', top: -28, left: '50%', marginLeft: -1, width: 2, height: 22, background: '#4f46e5', pointerEvents: 'none' }} />
                                            <div style={{ position: 'absolute', top: -42, left: '50%', marginLeft: -9, width: 18, height: 18, background: '#4f46e5', borderRadius: '50%', border: '2px solid white', cursor: 'crosshair', boxShadow: '0 2px 6px rgba(79,70,229,0.5)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'rotate'); }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                                                </svg>
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{ position: 'absolute', top: -26, right: 0, display: 'flex', gap: 3, zIndex: 2 }}>
                                                {/* Duplicate */}
                                                <div style={{ width: 20, height: 20, background: '#10b981', borderRadius: '50%', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', color: 'white', fontSize: 11, fontWeight: 'bold' }}
                                                    title="복제 (⎘)"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation(); e.preventDefault();
                                                        if (!selectedEl) return;
                                                        const clone = selectedEl.cloneNode(true);
                                                        const tx = parseFloat(selectedEl.dataset.tx || '0') + 20;
                                                        const ty = parseFloat(selectedEl.dataset.ty || '0') + 20;
                                                        clone.dataset.origTransform = selectedEl.dataset.origTransform || '';
                                                        clone.dataset.tx = tx; clone.dataset.ty = ty; clone.dataset.rotation = '0';
                                                        const base = clone.dataset.origTransform || '';
                                                        clone.style.transform = (base + ` translate(${tx}px, ${ty}px)`).trim();
                                                        selectedEl.parentNode?.insertBefore(clone, selectedEl.nextSibling);
                                                        selectElement(clone);
                                                        if (previewRef.current) { setEditableHtml(previewRef.current.innerHTML); saveUndo(); }
                                                    }}>⎘</div>
                                                {/* Delete */}
                                                <div style={{ width: 20, height: 20, background: '#ef4444', borderRadius: '50%', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                                    title="삭제 (Delete)"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation(); e.preventDefault();
                                                        if (selectedEl) { selectedEl.remove(); selectElement(null); if (previewRef.current) { setEditableHtml(previewRef.current.innerHTML); saveUndo(); } }
                                                    }}>
                                                    <X size={10} style={{ color: 'white' }} />
                                                </div>
                                            </div>

                                            {/* Dimensions label */}
                                            <div style={{ position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)', background: 'rgba(79,70,229,0.85)', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                                                {Math.round(selBox.w / zoom)} × {Math.round(selBox.h / zoom)}px
                                            </div>
                                        </div>
                                    )}

                                    {/* Focus Indicator Tip */}
                                    <div className="absolute -bottom-10 left-0 right-0 text-center opacity-40 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-gray-400 font-medium">💡 내용을 클릭하면 커서가 생기며 바로 수정할 수 있습니다.</span>
                                    </div>
                                </div>
                            </div>

                            {/* AI 수정 입력창 */}
                            <div className="border-t border-gray-200/60 bg-white p-3 px-5 shrink-0">
                                <div className="flex items-center gap-3 max-w-3xl mx-auto">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Wand2 size={12} className="text-[#E1306C]" />
                                        <span className="text-[9px] font-bold text-gray-400">AI 수정</span>
                                    </div>
                                    <input
                                        value={refineText}
                                        onChange={(e) => setRefineText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleRefine(); }}
                                        placeholder="수정할 내용을 입력하세요 (예: 제목을 더 자극적으로, 3번 슬라이드 내용 바꿔줘)"
                                        className="flex-1 bg-gray-50 rounded-lg px-3 py-2 outline-none text-xs font-medium placeholder:text-gray-300 border border-gray-100 focus:border-[#E1306C]/30 transition-colors"
                                    />
                                    <button onClick={handleRefine} disabled={refining || !refineText.trim()}
                                        className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-40">
                                        {refining ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ===== RIGHT SIDEBAR ===== */}
                        <AnimatePresence>
                            {sidebarOpen && activeStep !== 1 && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                                    className="border-l border-gray-200/60 bg-white overflow-hidden shrink-0"
                                >
                                    <div className="w-[260px] h-full flex flex-col">
                                        {/* Sidebar Tabs */}
                                        <div className="p-3 border-b border-gray-100 shrink-0">
                                            <div className="grid grid-cols-5 bg-gray-100 p-0.5 rounded-lg gap-0.5">
                                                {[
                                                    { id: 'theme', label: '색상', icon: Palette },
                                                    { id: 'props', label: '속성', icon: MousePointer2 },
                                                    { id: 'structure', label: '구조', icon: Rows },
                                                    { id: 'export', label: '저장', icon: Download },
                                                    { id: 'settings', label: '설정', icon: Sliders },
                                                ].map(tab => (
                                                    <button key={tab.id} onClick={() => { setSidebarTab(tab.id); if (tab.id === 'structure') parseCardStructure(); }}
                                                        className={`flex items-center justify-center gap-0.5 py-1.5 text-[9px] font-bold rounded-md transition-all ${sidebarTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                                                        <tab.icon size={10} />{tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-5">
                                            {/* ===== 색상 탭 ===== */}
                                            {sidebarTab === 'theme' && (
                                                <>
                                                    <div className="space-y-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">테마 프리셋</span>
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            {THEME_PRESETS.map(t => (
                                                                <button key={t.name} onClick={() => applyTheme(t)}
                                                                    className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${selectedTheme === t.name ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                                                                    <span className="text-base">{t.icon}</span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-[9px] font-bold text-gray-600 truncate">{t.name}</div>
                                                                        <div className="flex gap-0.5 mt-0.5">
                                                                            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: t.bg }} />
                                                                            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: t.primary }} />
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* 커스텀 컬러 픽커 */}
                                                    <div className="space-y-3">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">커스텀 색상</span>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-bold text-gray-400">배경색</span>
                                                                <div className="relative">
                                                                    <div className="h-10 rounded-lg border border-gray-200 cursor-pointer shadow-sm" style={{ backgroundColor: bgColor }} />
                                                                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                                                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                                                                </div>
                                                                <span className="text-[8px] text-gray-300 font-mono">{bgColor}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-bold text-gray-400">강조색</span>
                                                                <div className="relative">
                                                                    <div className="h-10 rounded-lg border border-gray-200 cursor-pointer shadow-sm" style={{ backgroundColor: titleColor }} />
                                                                    <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)}
                                                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                                                                </div>
                                                                <span className="text-[8px] text-gray-300 font-mono">{titleColor}</span>
                                                            </div>
                                                        </div>
                                                        {/* 빠른 컬러 팔레트 */}
                                                        <div className="space-y-1.5">
                                                            <span className="text-[9px] font-bold text-gray-400">빠른 색상 선택</span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {['#D4AF37', '#3B82F6', '#E11D48', '#10b981', '#a855f7', '#F77737', '#39FF14', '#00ffff', '#ff006e', '#ffffff', '#111111', '#0f172a'].map(c => (
                                                                    <button key={c} onClick={() => setTitleColor(c)} title={c}
                                                                        className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${titleColor === c ? 'border-gray-900 scale-110' : 'border-gray-200'}`}
                                                                        style={{ backgroundColor: c }} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* ===== 속성 탭 (선택 요소 편집) ===== */}
                                            {sidebarTab === 'props' && (
                                                <div className="space-y-4">
                                                    {!selectedEl ? (
                                                        <div className="text-center py-10 text-gray-300">
                                                            <MousePointer2 size={28} className="mx-auto mb-2 opacity-30" />
                                                            <p className="text-[10px] font-medium">요소 선택 모드를 켜고<br />요소를 클릭하세요</p>
                                                            <button onClick={() => setElementSelectMode(true)} className="mt-3 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">요소 선택 ON</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">위치 (캔버스 px)</span>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="text-[9px] text-gray-400 font-bold">X 이동</label>
                                                                        <input type="number" value={Math.round(parseFloat(selectedEl?.dataset?.tx || '0'))}
                                                                            onChange={(e) => {
                                                                                const el = selectedEl; if (!el) return;
                                                                                const newTx = Number(e.target.value);
                                                                                const ty = parseFloat(el.dataset.ty || '0');
                                                                                const rot = parseFloat(el.dataset.rotation || '0');
                                                                                el.dataset.tx = newTx;
                                                                                const base = el.dataset.origTransform || '';
                                                                                const parts = []; if (newTx !== 0 || ty !== 0) parts.push(`translate(${newTx}px, ${ty}px)`); if (rot !== 0) parts.push(`rotate(${rot}deg)`);
                                                                                el.style.transform = (base + (parts.length ? ' ' + parts.join(' ') : '')).trim();
                                                                                const r = el.getBoundingClientRect(); setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
                                                                                if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
                                                                            }}
                                                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-indigo-400 mt-0.5" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] text-gray-400 font-bold">Y 이동</label>
                                                                        <input type="number" value={Math.round(parseFloat(selectedEl?.dataset?.ty || '0'))}
                                                                            onChange={(e) => {
                                                                                const el = selectedEl; if (!el) return;
                                                                                const newTy = Number(e.target.value);
                                                                                const tx = parseFloat(el.dataset.tx || '0');
                                                                                const rot = parseFloat(el.dataset.rotation || '0');
                                                                                el.dataset.ty = newTy;
                                                                                const base = el.dataset.origTransform || '';
                                                                                const parts = []; if (tx !== 0 || newTy !== 0) parts.push(`translate(${tx}px, ${newTy}px)`); if (rot !== 0) parts.push(`rotate(${rot}deg)`);
                                                                                el.style.transform = (base + (parts.length ? ' ' + parts.join(' ') : '')).trim();
                                                                                const r = el.getBoundingClientRect(); setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
                                                                                if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
                                                                            }}
                                                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-indigo-400 mt-0.5" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">크기</span>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="text-[9px] text-gray-400 font-bold">너비</label>
                                                                        <input type="number" value={Math.round(selBox?.w / zoom || 0)}
                                                                            onChange={(e) => {
                                                                                const el = selectedEl; if (!el || !selBox) return;
                                                                                const newW = Math.max(20, Number(e.target.value));
                                                                                el.style.width = newW + 'px'; el.style.boxSizing = 'border-box';
                                                                                const r = el.getBoundingClientRect(); setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
                                                                                if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
                                                                            }}
                                                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-indigo-400 mt-0.5" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] text-gray-400 font-bold">높이</label>
                                                                        <input type="number" value={Math.round(selBox?.h / zoom || 0)}
                                                                            onChange={(e) => {
                                                                                const el = selectedEl; if (!el || !selBox) return;
                                                                                const newH = Math.max(20, Number(e.target.value));
                                                                                el.style.height = newH + 'px'; el.style.boxSizing = 'border-box';
                                                                                const r = el.getBoundingClientRect(); setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
                                                                                if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
                                                                            }}
                                                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-indigo-400 mt-0.5" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">회전</span>
                                                                <div className="flex items-center gap-2">
                                                                    <input type="range" min="-180" max="180" value={Math.round(elRotation)}
                                                                        onChange={(e) => {
                                                                            const el = selectedEl; if (!el) return;
                                                                            const newRot = Number(e.target.value);
                                                                            setElRotation(newRot);
                                                                            el.dataset.rotation = newRot;
                                                                            const base = el.dataset.origTransform || '';
                                                                            const tx = parseFloat(el.dataset.tx || '0'); const ty = parseFloat(el.dataset.ty || '0');
                                                                            const parts = []; if (tx !== 0 || ty !== 0) parts.push(`translate(${tx}px, ${ty}px)`); if (newRot !== 0) parts.push(`rotate(${newRot}deg)`);
                                                                            el.style.transform = (base + (parts.length ? ' ' + parts.join(' ') : '')).trim();
                                                                            const r = el.getBoundingClientRect(); setSelBox({ x: r.left, y: r.top, w: r.width, h: r.height });
                                                                            if (previewRef.current) setEditableHtml(previewRef.current.innerHTML);
                                                                        }}
                                                                        className="flex-1 accent-indigo-500 h-1.5 rounded-full appearance-none cursor-pointer" />
                                                                    <span className="text-[10px] font-bold text-gray-600 w-10 text-right">{Math.round(elRotation)}°</span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">텍스트</span>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="text-[9px] text-gray-400 font-bold">폰트 크기</label>
                                                                        <input type="number" value={elPanelData.fontSize}
                                                                            onChange={(e) => { setElPanelData(p => ({ ...p, fontSize: e.target.value })); applyToEl('fontSize', e.target.value + 'px'); }}
                                                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-indigo-400 mt-0.5" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] text-gray-400 font-bold">패딩</label>
                                                                        <input type="text" value={elPanelData.padding} placeholder="10px"
                                                                            onChange={(e) => { setElPanelData(p => ({ ...p, padding: e.target.value })); applyToEl('padding', e.target.value); }}
                                                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-indigo-400 mt-0.5" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {[['justifyLeft', <AlignLeft size={11} />], ['justifyCenter', <AlignCenter size={11} />], ['justifyRight', <AlignRight size={11} />]].map(([cmd, icon]) => (
                                                                        <button key={cmd} onClick={() => { document.execCommand(cmd); applyToEl('textAlign', cmd === 'justifyLeft' ? 'left' : cmd === 'justifyCenter' ? 'center' : 'right'); }}
                                                                            className="flex-1 flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg text-gray-500">{icon}</button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">배경</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative flex-1 h-9 rounded-lg border border-gray-200 overflow-hidden" style={{ backgroundColor: elPanelData.bg || 'transparent' }}>
                                                                        <input type="color" value={elPanelData.bg || '#ffffff'}
                                                                            onChange={(e) => { setElPanelData(p => ({ ...p, bg: e.target.value })); applyToEl('backgroundColor', e.target.value); }}
                                                                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                                                                    </div>
                                                                    <button onClick={() => { setElPanelData(p => ({ ...p, bg: '' })); applyToEl('backgroundColor', ''); }} className="text-[9px] text-gray-400 font-bold hover:text-red-400">초기화</button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button onClick={() => {
                                                                    if (!selectedEl) return;
                                                                    const clone = selectedEl.cloneNode(true);
                                                                    const tx = parseFloat(selectedEl.dataset.tx || '0') + 20;
                                                                    const ty = parseFloat(selectedEl.dataset.ty || '0') + 20;
                                                                    clone.dataset.origTransform = selectedEl.dataset.origTransform || '';
                                                                    clone.dataset.tx = tx; clone.dataset.ty = ty; clone.dataset.rotation = '0';
                                                                    const base = clone.dataset.origTransform || '';
                                                                    clone.style.transform = (base + ` translate(${tx}px, ${ty}px)`).trim();
                                                                    selectedEl.parentNode?.insertBefore(clone, selectedEl.nextSibling);
                                                                    selectElement(clone);
                                                                    if (previewRef.current) { setEditableHtml(previewRef.current.innerHTML); saveUndo(); }
                                                                }} className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 py-2 rounded-xl text-[10px] font-bold hover:bg-gray-200">⎘ 복제</button>
                                                                <button onClick={() => {
                                                                    if (selectedEl) { selectedEl.remove(); selectElement(null); if (previewRef.current) { setEditableHtml(previewRef.current.innerHTML); saveUndo(); } }
                                                                }} className="flex items-center justify-center gap-1.5 bg-red-50 text-red-500 py-2 rounded-xl text-[10px] font-bold hover:bg-red-100"><Trash2 size={11} /> 삭제</button>
                                                            </div>
                                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5">
                                                                <p className="text-[9px] text-indigo-600 font-medium">💡 드래그로 자유롭게 이동 · 핸들로 크기조절 · 회전 핸들로 회전<br />방향키로 1px 이동 · Shift+방향키로 10px 이동</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* ===== 구조 탭 ===== */}
                                            {sidebarTab === 'structure' && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">슬라이드 구조</span>
                                                        <button onClick={parseCardStructure} className="text-[9px] text-indigo-500 font-bold hover:text-indigo-700">새로고침</button>
                                                    </div>
                                                    {cardStructure.length === 0 ? (
                                                        <div className="text-center py-8 text-gray-300">
                                                            <Rows size={24} className="mx-auto mb-2 opacity-30" />
                                                            <p className="text-[10px]">카드뉴스를 생성하면<br />구조가 표시됩니다</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            {cardStructure.map((slide, i) => (
                                                                <div
                                                                    key={slide.id}
                                                                    draggable
                                                                    onDragStart={(e) => e.dataTransfer.setData('slideIdx', String(i))}
                                                                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                                                                    onDragLeave={() => setDragOverIdx(null)}
                                                                    onDrop={(e) => {
                                                                        e.preventDefault();
                                                                        const from = parseInt(e.dataTransfer.getData('slideIdx'));
                                                                        if (!isNaN(from) && from !== i) moveSlide(from, i);
                                                                        setDragOverIdx(null);
                                                                    }}
                                                                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-grab transition-all ${dragOverIdx === i ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                                                                >
                                                                    <div className="flex flex-col items-center gap-0.5 text-gray-300 shrink-0">
                                                                        <ChevronUp size={10} className={i === 0 ? 'opacity-20' : 'cursor-pointer hover:text-gray-600'} onClick={() => i > 0 && moveSlide(i, i - 1)} />
                                                                        <Move size={10} />
                                                                        <ChevronDown size={10} className={i === cardStructure.length - 1 ? 'opacity-20' : 'cursor-pointer hover:text-gray-600'} onClick={() => i < cardStructure.length - 1 && moveSlide(i, i + 1)} />
                                                                    </div>
                                                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#833AB4] to-[#F77737] flex items-center justify-center shrink-0">
                                                                        <span className="text-[9px] font-black text-white">{i + 1}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[9px] font-bold text-gray-700 truncate">{slide.title}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            slide.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                            slide.el.style.outline = '3px solid rgba(99,102,241,0.8)';
                                                                            setTimeout(() => { slide.el.style.outline = ''; }, 1500);
                                                                        }}
                                                                        className="text-gray-300 hover:text-indigo-500 shrink-0"
                                                                    >
                                                                        <Eye size={11} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                                                        <p className="text-[9px] text-blue-600 font-medium">💡 드래그하거나 ▲▼ 버튼으로 슬라이드 순서를 바꾸세요</p>
                                                    </div>
                                                    {undoStack.length > 0 && (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => {
                                                                setUndoStack(prev => {
                                                                    if (prev.length === 0) return prev;
                                                                    const html = prev[prev.length - 1];
                                                                    setRedoStack(r => [...r, previewRef.current?.innerHTML || '']);
                                                                    if (previewRef.current) { previewRef.current.innerHTML = html; setEditableHtml(html); parseCardStructure(); }
                                                                    return prev.slice(0, -1);
                                                                });
                                                            }} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-600 py-1.5 rounded-lg text-[10px] font-bold hover:bg-gray-200">
                                                                <Undo2 size={11} /> 실행 취소
                                                            </button>
                                                            <button onClick={() => {
                                                                setRedoStack(prev => {
                                                                    if (prev.length === 0) return prev;
                                                                    const html = prev[prev.length - 1];
                                                                    setUndoStack(u => [...u, previewRef.current?.innerHTML || '']);
                                                                    if (previewRef.current) { previewRef.current.innerHTML = html; setEditableHtml(html); parseCardStructure(); }
                                                                    return prev.slice(0, -1);
                                                                });
                                                            }} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-600 py-1.5 rounded-lg text-[10px] font-bold hover:bg-gray-200">
                                                                <Redo2 size={11} /> 다시 실행
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* ===== 내보내기 탭 ===== */}
                                            {sidebarTab === 'export' && (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">PNG 내보내기</span>
                                                        <button onClick={handleExport} disabled={loading}
                                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                                                            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                                            {loading ? '변환 중...' : '전체 PNG 다운로드'}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">출력 스펙</span>
                                                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                                                            {[
                                                                ['해상도', '1080 × 1350px'],
                                                                ['비율', '4:5 (인스타 최적)'],
                                                                ['포맷', 'PNG'],
                                                                ['폰트', 'Noto Sans KR'],
                                                                ['슬라이드', `${slideCount}장`],
                                                            ].map(([k, v]) => (
                                                                <div key={k} className="flex justify-between text-[10px]">
                                                                    <span className="text-gray-500">{k}</span>
                                                                    <span className="font-bold">{v}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">배경 이미지</span>
                                                        {bgImage ? (
                                                            <div className="space-y-2">
                                                                <img src={bgImage} alt="배경" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                                                                <button onClick={() => setBgImage(null)} className="w-full text-[10px] text-red-400 hover:text-red-600 font-bold py-1">제거</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => fileInputRef.current?.click()}
                                                                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-400 py-3 rounded-xl text-[10px] font-bold hover:border-gray-400 hover:text-gray-600 transition-all">
                                                                <ImageIcon size={14} /> 배경 이미지 업로드
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ===== 설정 탭 ===== */}
                                            {sidebarTab === 'settings' && (
                                                <div className="space-y-5">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <ShieldCheck size={14} className="text-green-500" />
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">보안 API 설정</span>
                                                                <span className="bg-green-50 text-green-600 text-[8px] px-1.5 py-0.5 rounded font-bold">Privacy First</span>
                                                            </div>
                                                            <p className="text-[9px] text-gray-400 leading-relaxed">
                                                                입력된 키는 서버 DB에 저장되지 않으며, 사용자의 브라우저(LocalStorage) 내 보안 영역에만 유지됩니다.
                                                            </p>
                                                        </div>

                                                        {/* Gemini API Key */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-gray-600">Gemini API Key</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => setShowGeminiKey(!showGeminiKey)} className="text-gray-400 hover:text-gray-600">
                                                                        {showGeminiKey ? <EyeOff size={11} /> : <Eye size={11} />}
                                                                    </button>
                                                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 hover:underline">발급</a>
                                                                </div>
                                                            </div>
                                                            <div className="relative">
                                                                <input
                                                                    type={showGeminiKey ? "text" : "password"}
                                                                    value={geminiApiKey}
                                                                    onChange={(e) => {
                                                                        setGeminiApiKey(e.target.value);
                                                                        localStorage.setItem('gemini_api_key', e.target.value);
                                                                    }}
                                                                    placeholder="Google API 키 입력"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[10px] outline-none focus:border-blue-400 transition-colors pr-8"
                                                                />
                                                                {geminiApiKey && (
                                                                    <button onClick={() => { setGeminiApiKey(''); localStorage.removeItem('gemini_api_key'); }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400">
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Claude API Key */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-gray-600">Claude API Key</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => setShowClaudeKey(!showClaudeKey)} className="text-gray-400 hover:text-gray-600">
                                                                        {showClaudeKey ? <EyeOff size={11} /> : <Eye size={11} />}
                                                                    </button>
                                                                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 hover:underline">발급</a>
                                                                </div>
                                                            </div>
                                                            <div className="relative">
                                                                <input
                                                                    type={showClaudeKey ? "text" : "password"}
                                                                    value={claudeApiKey}
                                                                    onChange={(e) => {
                                                                        setClaudeApiKey(e.target.value);
                                                                        localStorage.setItem('claude_api_key', e.target.value);
                                                                    }}
                                                                    placeholder="Anthropic API 키 입력"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[10px] outline-none focus:border-purple-400 transition-colors pr-8"
                                                                />
                                                                {claudeApiKey && (
                                                                    <button onClick={() => { setClaudeApiKey(''); localStorage.removeItem('claude_api_key'); }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400">
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* OpenAI API Key */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-gray-600">OpenAI (GPT) API Key</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="text-gray-400 hover:text-gray-600">
                                                                        {showOpenAIKey ? <EyeOff size={11} /> : <Eye size={11} />}
                                                                    </button>
                                                                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 hover:underline">발급</a>
                                                                </div>
                                                            </div>
                                                            <div className="relative">
                                                                <input
                                                                    type={showOpenAIKey ? "text" : "password"}
                                                                    value={openaiApiKey}
                                                                    onChange={(e) => {
                                                                        setOpenaiApiKey(e.target.value);
                                                                        localStorage.setItem('openai_api_key', e.target.value);
                                                                    }}
                                                                    placeholder="OpenAI API 키 입력"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[10px] outline-none focus:border-emerald-400 transition-colors pr-8"
                                                                />
                                                                {openaiApiKey && (
                                                                    <button onClick={() => { setOpenaiApiKey(''); localStorage.removeItem('openai_api_key'); }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400">
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* DeepSeek API Key */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-gray-600">DeepSeek API Key</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button onClick={() => setShowDeepSeekKey(!showDeepSeekKey)} className="text-gray-400 hover:text-gray-600">
                                                                        {showDeepSeekKey ? <EyeOff size={11} /> : <Eye size={11} />}
                                                                    </button>
                                                                    <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 hover:underline">발급</a>
                                                                </div>
                                                            </div>
                                                            <div className="relative">
                                                                <input
                                                                    type={showDeepSeekKey ? "text" : "password"}
                                                                    value={deepseekApiKey}
                                                                    onChange={(e) => {
                                                                        setDeepseekApiKey(e.target.value);
                                                                        localStorage.setItem('deepseek_api_key', e.target.value);
                                                                    }}
                                                                    placeholder="DeepSeek API 키 입력"
                                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[10px] outline-none focus:border-cyan-400 transition-colors pr-8"
                                                                />
                                                                {deepseekApiKey && (
                                                                    <button onClick={() => { setDeepseekApiKey(''); localStorage.removeItem('deepseek_api_key'); }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400">
                                                                        <Trash2 size={10} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                                            <p className="text-[9px] text-blue-600 font-medium leading-tight text-center">
                                                                🛡️ 모든 트래픽은 암호화(HTTPS)되며, 키는 본인의 브라우저 외에는 어디에도 기록되지 않습니다.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>

            {/* ===== 플로팅 텍스트 툴바 (텍스트 선택 시) ===== */}
            <AnimatePresence>
                {floatingBar.show && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            left: Math.max(8, Math.min(floatingBar.x - 185, window.innerWidth - 380)),
                            top: Math.max(8, floatingBar.y - 58),
                            zIndex: 9999
                        }}
                        className="bg-gray-900/95 backdrop-blur-xl text-white rounded-2xl px-2.5 py-2 flex items-center gap-1 shadow-2xl border border-white/10"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {/* Font size */}
                        <button onMouseDown={(e) => { e.preventDefault(); applyFontSize(Math.max(8, floatingFontSize - 2)); }} className="w-6 h-6 flex items-center justify-center hover:bg-white/15 rounded-lg text-gray-300 font-bold text-xs">−</button>
                        <input
                            type="number"
                            value={floatingFontSize}
                            onChange={(e) => setFloatingFontSize(Number(e.target.value))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyFontSize(floatingFontSize); } }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-11 bg-white/10 rounded-lg px-1 py-0.5 text-xs text-center outline-none text-white"
                        />
                        <span className="text-[9px] text-gray-500 mr-0.5">px</span>
                        <button onMouseDown={(e) => { e.preventDefault(); applyFontSize(floatingFontSize + 2); }} className="w-6 h-6 flex items-center justify-center hover:bg-white/15 rounded-lg text-gray-300 font-bold text-xs">+</button>
                        <div className="w-px h-4 bg-white/20 mx-0.5" />
                        <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg font-bold text-sm">B</button>
                        <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg italic text-sm">I</button>
                        <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg underline text-sm">U</button>
                        <div className="w-px h-4 bg-white/20 mx-0.5" />
                        {/* Text color */}
                        <div className="relative w-7 h-7">
                            <div className="w-full h-full rounded-lg border-2 border-white/20 cursor-pointer overflow-hidden" style={{ backgroundColor: floatingColor }} />
                            <input type="color" value={floatingColor}
                                onChange={(e) => { setFloatingColor(e.target.value); document.execCommand('foreColor', false, e.target.value); if (previewRef.current) setEditableHtml(previewRef.current.innerHTML); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        </div>
                        <div className="w-px h-4 bg-white/20 mx-0.5" />
                        <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyLeft'); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg"><AlignLeft size={12} /></button>
                        <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyCenter'); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg"><AlignCenter size={12} /></button>
                        <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyRight'); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg"><AlignRight size={12} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== 요소 클릭 패널 ===== */}
            <AnimatePresence>
                {elPanel.show && elPanel.el && !elementSelectMode && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', left: elPanel.x, top: elPanel.y, zIndex: 9998 }}
                        className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-gray-200 w-[220px]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1"><MousePointer2 size={9} /> 요소 편집</span>
                            <button onClick={() => {
                                setElPanel(prev => ({ ...prev, show: false }));
                                if (prevHighlightElRef.current) { prevHighlightElRef.current.style.outline = ''; prevHighlightElRef.current = null; }
                            }} className="text-gray-300 hover:text-gray-600"><X size={12} /></button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-500 w-14 shrink-0">폰트크기</span>
                                <input type="number" value={elPanelData.fontSize}
                                    onChange={(e) => { setElPanelData(prev => ({ ...prev, fontSize: e.target.value })); applyToEl('fontSize', `${e.target.value}px`); }}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] outline-none text-center" placeholder="px" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-500 w-14 shrink-0">패딩</span>
                                <input type="text" value={elPanelData.padding}
                                    onChange={(e) => { setElPanelData(prev => ({ ...prev, padding: e.target.value })); applyToEl('padding', e.target.value); }}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] outline-none" placeholder="e.g. 20px 40px" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-500 w-14 shrink-0">배경색</span>
                                <div className="relative flex-1 h-7">
                                    <div className="w-full h-full rounded-lg border border-gray-200 cursor-pointer" style={{ backgroundColor: elPanelData.bg || 'transparent' }} />
                                    <input type="color" value={elPanelData.bg || '#000000'}
                                        onChange={(e) => { setElPanelData(prev => ({ ...prev, bg: e.target.value })); applyToEl('backgroundColor', e.target.value); }}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                </div>
                                <button onClick={() => { setElPanelData(prev => ({ ...prev, bg: '' })); applyToEl('backgroundColor', ''); }} className="text-gray-300 hover:text-red-400 text-[9px]">초기화</button>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] text-gray-500 w-14 shrink-0">정렬</span>
                                <div className="flex gap-1">
                                    {[['left', <AlignLeft size={10} />], ['center', <AlignCenter size={10} />], ['right', <AlignRight size={10} />]].map(([val, icon]) => (
                                        <button key={val} onClick={() => { setElPanelData(prev => ({ ...prev, align: val })); applyToEl('textAlign', val); }}
                                            className={`p-1.5 rounded-lg border transition-all ${elPanelData.align === val ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== PNG 내보내기 결과 다이얼로그 ===== */}
            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center">
                                        <Check className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">PNG 내보내기 완료!</h3>
                                        <p className="text-gray-400 text-[11px]">{result.slides?.length}장의 슬라이드가 생성되었습니다</p>
                                    </div>
                                </div>
                                <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600 transition-colors text-xs font-bold bg-gray-50 px-4 py-2 rounded-lg">닫기</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    {result.slides?.map((slide, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="group relative">
                                            <div className="aspect-[1080/1350] bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                                <img src={`${BACKEND_URL}/api/slides/${slide}`} alt={`slide ${i + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-xl">
                                                    <a href={`${BACKEND_URL}/api/slides/${slide}`} download className="bg-white text-gray-900 p-3 rounded-full hover:scale-110 transition-all shadow-lg">
                                                        <Download size={16} />
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-center">
                                                <span className="text-[10px] font-bold text-gray-400">{i + 1}번 슬라이드</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== 설정 모달 (API 키 입력) ===== */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center text-white">
                                        <Sliders size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-md font-black">API 설정</h3>
                                        <p className="text-gray-400 text-[10px]">AI 서비스 이용을 위한 API 키를 입력하세요</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-900 p-2">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                                    <ShieldCheck className="text-blue-500 shrink-0" size={18} />
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold text-blue-700">개인정보 보호 안내</span>
                                        <p className="text-[10px] text-blue-600/80 leading-relaxed">
                                            입력하신 API 키는 서버에 저장되지 않으며, 오직 귀하의 장치(localStorage)에만 안전하게 보관됩니다.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {/* Gemini */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[11px] font-bold text-gray-700">Gemini (Google)</span>
                                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">키 발급받기</a>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type={showGeminiKey ? "text" : "password"}
                                                value={geminiApiKey}
                                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all pr-20"
                                                placeholder="Gemini API Key 입력"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button onClick={() => setShowGeminiKey(!showGeminiKey)} className="text-gray-400 hover:text-gray-600">
                                                    {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                {geminiApiKey && <button onClick={() => setGeminiApiKey('')} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Claude */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[11px] font-bold text-gray-700">Claude (Anthropic)</span>
                                            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">키 발급받기</a>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type={showClaudeKey ? "text" : "password"}
                                                value={claudeApiKey}
                                                onChange={(e) => setClaudeApiKey(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all pr-20"
                                                placeholder="Claude API Key 입력"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button onClick={() => setShowClaudeKey(!showClaudeKey)} className="text-gray-400 hover:text-gray-600">
                                                    {showClaudeKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                {claudeApiKey && <button onClick={() => setClaudeApiKey('')} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* OpenAI */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[11px] font-bold text-gray-700">OpenAI (GPT-4o)</span>
                                            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">키 발급받기</a>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type={showOpenAIKey ? "text" : "password"}
                                                value={openaiApiKey}
                                                onChange={(e) => setOpenaiApiKey(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all pr-20"
                                                placeholder="OpenAI API Key 입력"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="text-gray-400 hover:text-gray-600">
                                                    {showOpenAIKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                {openaiApiKey && <button onClick={() => setOpenaiApiKey('')} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* DeepSeek */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[11px] font-bold text-gray-700">DeepSeek (V3/R1)</span>
                                            <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">키 발급받기</a>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type={showDeepSeekKey ? "text" : "password"}
                                                value={deepseekApiKey}
                                                onChange={(e) => setDeepseekApiKey(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all pr-20"
                                                placeholder="DeepSeek API Key 입력"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button onClick={() => setShowDeepSeekKey(!showDeepSeekKey)} className="text-gray-400 hover:text-gray-600">
                                                    {showDeepSeekKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                {deepseekApiKey && <button onClick={() => setDeepseekApiKey('')} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveSettings}
                                    className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                    서버에 안전하게 저장하기
                                </button>
                            </div>

                            <div className="p-6 bg-gray-50/50 border-t border-gray-100 italic text-[9px] text-gray-400 text-center">
                                입력한 키는 브라우저를 닫아도 저장되며, 필요할 때 언제든 수정/삭제할 수 있습니다.
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
