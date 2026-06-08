'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

const SIX_WH_ITEMS = [
  { key: 'who',   icon: '👤', label: '누가',   question: '누가 등장하나요?',          example: '민준이, 친구들, 선생님' },
  { key: 'when',  icon: '⏰', label: '언제',   question: '언제 일어나는 일인가요?',    example: '점심시간' },
  { key: 'where', icon: '📍', label: '어디서', question: '어디에서 일어나나요?',       example: '학교 급식실' },
  { key: 'what',  icon: '💬', label: '무엇을', question: '어떤 상황인가요?',           example: '줄을 서다 새치기를 당했어요' },
  { key: 'how',   icon: '✋', label: '어떻게', question: '어떻게 행동하면 좋을까요?', example: '차분히 선생님께 말해요' },
  { key: 'why',   icon: '❤️', label: '왜',     question: '왜 그렇게 하면 좋을까요?', example: '모두가 차례를 기다리니까요' },
]

const EXAMPLE_TEXTS = [
  {
    label: '또래 갈등',
    text: '지호가(누가) 쉬는 시간에(언제) 교실에서(어디서) 친구가 장난감을 빼앗아 속상해해요(무엇을). 화내지 않고 "돌려줘"라고 말하는 법(어떻게)을 배우면 좋겠어요. 그래야 친구와 사이좋게 지낼 수 있으니까요(왜).',
  },
  {
    label: '감정 조절',
    text: '서연이가(누가) 수업 중에(언제) 교실에서(어디서) 답을 틀리면 부끄러워 울어버려요(무엇을). 실수해도 괜찮다고 생각하며 다시 시도하는 법(어떻게)을 알려주고 싶어요. 누구나 실수하며 배우니까요(왜).',
  },
  {
    label: '일상 전환',
    text: '준우가(누가) 잠자기 전(언제) 집에서(어디서) 놀이를 멈춰야 할 때 떼를 써요(무엇을). 자기 전 루틴을 자연스럽게 받아들이는 법(어떻게)을 알려주고 싶어요. 푹 자야 다음 날 기분이 좋으니까요(왜).',
  },
  {
    label: '새로운 환경',
    text: '하은이가(누가) 다음 주에(언제) 치과에서(어디서) 처음 진료를 받아요(무엇을). 무서워하지 않고 의사 선생님 말을 따르는 법(어떻게)을 미리 준비시키고 싶어요. 건강한 이를 지킬 수 있으니까요(왜).',
  },
]

interface SixWHGuideProps {
  onExampleSelect: (text: string) => void
}

export function SixWHGuide({ onExampleSelect }: SixWHGuideProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="border-[1.5px] border-mint-300 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3 bg-mint-50 text-left"
      >
        <span className="text-sm font-medium text-mint-700">
          ✅ 이런 내용이 있으면 더 좋은 이야기가 돼요
        </span>
        <span className="text-mint-500 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="p-3 bg-mint-50/50 space-y-2">
          {SIX_WH_ITEMS.map(({ icon, label, question, example }) => (
            <div key={label} className="flex items-start gap-2 text-sm">
              <span className="text-base">{icon}</span>
              <span className="font-medium text-charcoal w-10 shrink-0">{label}</span>
              <span className="text-soft-gray">
                {question}{' '}
                <span className="text-mint-600">({example})</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 예시 선택 */}
      <div className="p-3 border-t border-mint-200 bg-white">
        <p className="text-xs text-soft-gray mb-2">💡 예시 선택 (탭 하면 입력란에 자동 삽입)</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TEXTS.map(({ label, text }) => (
            <button
              key={label}
              type="button"
              onClick={() => onExampleSelect(text)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-mint-200 rounded-lg text-mint-700 hover:bg-mint-50 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
