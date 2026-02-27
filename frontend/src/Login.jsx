import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Check, LogIn, TrendingUp, Zap, BookOpen, Share2 } from 'lucide-react'

const BACKEND_URL = "http://localhost:8899"

const STEPS = [
    {
        num: '01',
        title: '리서치 → 카피',
        desc: '주제를 입력하면 AI가 웹 리서치 후 카피를 자동 작성',
        items: ['주제를 입력해요', 'AI가 웹 리서치해요', '카피가 자동으로 작성돼요'],
        note: '사람이 할 일은 주제 입력뿐이에요',
        color: '#22c55e',
    },
    {
        num: '02',
        title: '후킹 팀 토론',
        desc: '후킹 전문가 에이전트와 카피 에디터가 점수를 매겨요',
        items: ['후킹 전문가 에이전트와', '카피 에디터가 점수를 매겨요', '기준 미달이면 자동으로 다시 써요'],
        note: '7점 이상이면 통과해요',
        color: '#f59e0b',
    },
    {
        num: '03',
        title: '구조 토론',
        desc: '10장의 흐름이 적절한지 에이전트들이 함께 검토해요',
        items: ['10장의 흐름이 적절한지', '에이전트들이 함께 검토해요', '끝까지 읽게 만드는지도 점검해요'],
        note: '내용만큼 구조도 중요해요',
        color: '#3b82f6',
    },
    {
        num: '04',
        title: 'PNG 자동 생성',
        desc: 'HTML 템플릿과 Playwright로 인스타그램 규격 그대로 렌더링',
        items: ['1080×1350 인스타 규격', 'Playwright로 정밀 렌더링', 'PNG로 즉시 다운로드'],
        note: '인스타그램 규격 그대로 출력돼요',
        color: '#8b5cf6',
    },
]

const FORMULAS = [
    { num: '1', title: '첫 장이 핵심이다', desc: '3초 안에 눈길을 사로잡는 제목. 숫자·질문·강력한 키워드로 시선 고정', emoji: '🎯' },
    { num: '2', title: '한 장 = 하나의 메시지', desc: '장마다 딱 하나의 포인트만. 문장 최소화, 핵심만 전달해야 끝까지 읽힘', emoji: '💡' },
    { num: '3', title: '저장하고 싶은 정보', desc: '가이드, 체크리스트, HOW TO 등 실용 정보 포함. "나중에 다시 봐야지" 유도', emoji: '📌' },
    { num: '4', title: '공감이 핵심', desc: '"내 얘기 같다"는 감정이 공유를 유도. 문제 상황→해결책 구조가 특히 효과적', emoji: '🤝' },
    { num: '5', title: '공유하고 싶은 요소', desc: '공감, 인사이트, 감동, 유머 중 하나는 꼭! 건강/부/사랑/재미 욕망 카테고리 활용', emoji: '🔁' },
    { num: '6', title: '디자인은 직관적으로', desc: '핵심 키워드 중심의 깔끔한 레이아웃. 복잡하면 저장·공유 욕구도 떨어짐', emoji: '✨' },
    { num: '7', title: 'CTA 꼭 활용하기', desc: '내용 요약 + 행동 유도는 필수. 선명한 다음 액션을 제시해야 행동까지 연결됨', emoji: '📣' },
]

const STATS = [
    { value: '107만', label: '달성 조회수', sub: '@highoutputclub 카드뉴스만으로' },
    { value: '1080×1350', label: '인스타 최적화', sub: 'px - 인스타그램 세로 규격' },
    { value: '7점 이상', label: '후킹 품질 보장', sub: '7점 미달 시 자동 재작성' },
    { value: '4단계', label: 'AI 검토 파이프라인', sub: '리서치부터 PNG까지 자동화' },
]

export default function LandingPage() {
    const [activeStep, setActiveStep] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep(prev => (prev + 1) % STEPS.length)
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    const handleLogin = () => {
        window.location.href = `${BACKEND_URL}/login`
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white" style={{ fontFamily: "'Noto Sans KR', 'Inter', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&family=Inter:wght@300;400;700;900&display=swap" rel="stylesheet" />

            {/* NAV */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 backdrop-blur-xl bg-black/40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#f59e0b] flex items-center justify-center">
                        <Sparkles size={16} className="text-black" />
                    </div>
                    <span className="font-black text-lg tracking-tight">DUKE STUDIO</span>
                </div>
                <button
                    onClick={handleLogin}
                    className="flex items-center gap-2 bg-[#D4AF37] text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-[#f5c842] transition-all hover:scale-105 active:scale-95"
                >
                    <LogIn size={14} />
                    시작하기
                </button>
            </nav>

            {/* HERO */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 text-center overflow-hidden">
                {/* Background gradients */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                    <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-8">
                        <TrendingUp size={14} className="text-[#D4AF37]" />
                        <span className="text-[#D4AF37] text-sm font-semibold">카드뉴스만으로 107만 조회수 달성 공식 적용</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
                        AI가 만드는<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#f59e0b]">바이럴</span> 카드뉴스
                    </h1>

                    <p className="text-white/50 text-xl mb-4">
                        주제만 입력하면 AI가 리서치 → 후킹 점수 → 구조 검토 → PNG 출력까지
                    </p>
                    <p className="text-white/30 text-lg mb-12">
                        사람이 할 일은 <span className="text-white/60 font-bold">주제 입력뿐</span>이에요
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <motion.button
                            onClick={handleLogin}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-3 bg-[#D4AF37] text-black px-8 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-[#D4AF37]/20"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google로 무료 시작
                            <ArrowRight size={18} />
                        </motion.button>
                    </div>
                </motion.div>
            </section>

            {/* STATS */}
            <section className="py-20 px-6 border-y border-white/5">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {STATS.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center"
                        >
                            <div className="text-3xl md:text-4xl font-black text-[#D4AF37] mb-1">{s.value}</div>
                            <div className="font-bold text-white mb-1">{s.label}</div>
                            <div className="text-white/40 text-xs">{s.sub}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 4-STEP WORKFLOW */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="text-[#D4AF37] text-sm font-bold uppercase tracking-widest mb-3">How it works</div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">4단계 AI 파이프라인</h2>
                        <p className="text-white/40 mt-4">주제 입력 하나로 완성까지 자동으로</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {STEPS.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.15 }}
                                className={`relative p-8 rounded-3xl border transition-all duration-500 cursor-default
                  ${activeStep === i
                                        ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5'
                                        : 'border-white/5 bg-white/2'
                                    }`}
                            >
                                <div className="flex items-start gap-5">
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-black font-black text-lg shrink-0"
                                        style={{ backgroundColor: activeStep === i ? step.color : '#1a1a1a' }}
                                    >
                                        <span style={{ color: activeStep === i ? '#000' : '#666' }}>{step.num}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black mb-2">{step.title}</h3>
                                        <p className="text-white/40 text-sm mb-4">{step.desc}</p>
                                        <ul className="space-y-2">
                                            {step.items.map((item, j) => (
                                                <li key={j} className="flex items-center gap-2 text-sm text-white/60">
                                                    <Check size={14} className="text-[#D4AF37] shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 text-xs text-white/30 italic">{step.note}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7 VIRAL FORMULAS */}
            <section className="py-24 px-6 bg-white/[0.01]">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="text-[#D4AF37] text-sm font-bold uppercase tracking-widest mb-3">Built-in expertise</div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                            바이럴 카드뉴스<br />
                            <span className="text-[#D4AF37]">7가지 공식</span>이 자동 적용돼요
                        </h2>
                        <p className="text-white/40 mt-4">
                            <span className="text-white/70 font-bold">@highoutputclub</span>이 107만 조회수로 검증한 공식을 AI가 자동으로 적용합니다
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FORMULAS.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">{f.emoji}</span>
                                    <span className="text-[#D4AF37] text-xs font-bold">Formula {f.num}</span>
                                </div>
                                <h3 className="font-black text-lg mb-2 group-hover:text-[#D4AF37] transition-colors">{f.title}</h3>
                                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}

                        {/* CTA card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="p-6 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#f59e0b]/10 border border-[#D4AF37]/30 flex flex-col justify-center items-center text-center"
                        >
                            <Zap size={32} className="text-[#D4AF37] mb-3" />
                            <p className="font-black text-lg mb-1">모두 자동 적용</p>
                            <p className="text-white/40 text-sm">7가지 공식을 AI가 알아서 적용해 바이럴 가능한 카드뉴스를 만들어요</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* DESIGN QUALITY */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="text-[#D4AF37] text-sm font-bold uppercase tracking-widest mb-3">Design quality</div>
                        <h2 className="text-4xl font-black">전문가 수준의 디자인 스펙 자동 적용</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: '📐',
                                title: '정밀한 타이포그래피',
                                items: ['타이틀 60px · 굵기 900', '부제목 45px · 굵기 700', '본문 28px · 굵기 300', '좌측 정렬로 가독성 극대화']
                            },
                            {
                                icon: '🎨',
                                title: '자동 레이아웃',
                                items: ['1080×1350px 인스타 규격', '투명 그라데이션 자동 적용', 'CSS 전용 (이미지 태그 없음)', '슬라이드마다 최적 구성']
                            },
                            {
                                icon: '✅',
                                title: '품질 검증',
                                items: ['후킹 점수 7점 이상만 통과', '슬라이드당 3줄 이내 텍스트', 'CTA 슬라이드 자동 생성', '한국어 최적화 폰트 적용']
                            }
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-7 rounded-3xl border border-white/5 bg-white/[0.02]"
                            >
                                <div className="text-4xl mb-4">{card.icon}</div>
                                <h3 className="font-black text-lg mb-4">{card.title}</h3>
                                <ul className="space-y-2">
                                    {card.items.map((item, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-white/50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* BOTTOM CTA */}
            <section className="py-32 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#D4AF37]/10 rounded-full blur-3xl" />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="relative max-w-2xl mx-auto"
                >
                    <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                        지금 바로<br />
                        <span className="text-[#D4AF37]">바이럴 카드뉴스</span>를<br />
                        만들어보세요
                    </h2>
                    <p className="text-white/40 mb-10">Google 계정만 있으면 무료로 시작할 수 있어요</p>
                    <motion.button
                        onClick={handleLogin}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-3 bg-[#D4AF37] text-black px-10 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-[#D4AF37]/30"
                    >
                        <LogIn size={22} />
                        Google로 무료 시작
                        <ArrowRight size={22} />
                    </motion.button>
                </motion.div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-white/5 py-10 px-6 text-center text-white/20 text-sm">
                <div className="font-black text-white/40 mb-2">DUKE ECONOMIC STUDIO</div>
                <div>AI-Powered Instagram Card News Generator</div>
            </footer>
        </div>
    )
}
