'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PsyReport from './PsyReport'
import { loadAssessment, loadEngine } from '@/lib/psy/registry'
import type {
  PsyAnswer,
  PsyAssessment,
  PsyCatalogueItem,
  PsyEngine,
  PsyEngineConstructor,
  PsyOption,
  PsyQuestion,
  PsyResult,
} from '@/lib/psy/types'

type Phase = 'intro' | 'questions' | 'result'

const draftKey = (id: string) => `tc.psy.draft.${id}`
const resultKey = (id: string) => `tc.psy.result.${id}`
const GENDER_KEY = 'tc.psy.gender'

/**
 * `answers` 存分数值，是引擎与旧草稿的口径；`selected` 存选项下标，是界面选中态的唯一依据。
 * 选项分值会重复（EAT-26 后三档都是 0 分，AQA 有两组同分），按值判选中会一次点亮多行。
 */
type Draft = {
  answers: Record<number, number>
  selected?: Record<number, number>
  page: number
  gender: number | null
  savedAt: number
}

function optionList(question: PsyQuestion, assessment: PsyAssessment | null): PsyOption[] {
  if (question.options?.length) return question.options
  return assessment?.defaultOptions ?? []
}

/** 旧草稿只有分数值：取第一个同值下标，至少不会把高亮丢到别的题上。 */
function indexOfValue(options: PsyOption[], value: number): number {
  const found = options.findIndex((option) => option.value === value)
  return found >= 0 ? found : 0
}

function valuesFromSelected(
  selected: Record<number, number>,
  questions: PsyQuestion[],
  assessment: PsyAssessment | null
): Record<number, number> {
  const values: Record<number, number> = {}
  for (const [key, index] of Object.entries(selected)) {
    const question = questions.find((q) => q.id === Number(key))
    const options = question ? optionList(question, assessment) : []
    const option = options[index]
    if (option) values[Number(key)] = option.value
  }
  return values
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 存储满了或隐私模式：不影响作答，只是不保存 */
  }
}

/** 与 PSYMETRA 相同：超过 20 题，每页 10 题；否则整卷单页。 */
function pageSizeFor(total: number) {
  return total > 20 ? 10 : total
}

export default function PsyRunner({ item }: { item: PsyCatalogueItem }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [assessment, setAssessment] = useState<PsyAssessment | null>(null)
  const [engine, setEngine] = useState<PsyEngine | null>(null)
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [gender, setGender] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PsyResult | null>(null)
  const [savedResult, setSavedResult] = useState<PsyResult | null>(null)
  const [draftNotice, setDraftNotice] = useState<Draft | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const topRef = useRef<HTMLDivElement | null>(null)

  const questions = assessment?.questions ?? []
  const pageSize = pageSizeFor(questions.length)
  const pageCount = Math.max(1, Math.ceil(questions.length / pageSize))
  const pageQuestions = useMemo(
    () => questions.slice(page * pageSize, page * pageSize + pageSize),
    [questions, page, pageSize]
  )
  const answeredCount = Object.keys(selected).length
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0

  useEffect(() => {
    setSavedResult(readJson<PsyResult>(resultKey(item.id)))
    const draft = readJson<Draft>(draftKey(item.id))
    const resumed = draft ? Object.keys(draft.selected ?? draft.answers ?? {}).length : 0
    if (draft && resumed > 0) {
      setDraftNotice(draft)
      setGender(draft.gender ?? readJson<number>(GENDER_KEY))
    } else {
      setGender(readJson<number>(GENDER_KEY))
    }
  }, [item.id])

  const scrollTop = useCallback(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [])

  const start = useCallback(
    async (restore?: Draft) => {
      setLoading(true)
      setLoadError(null)
      try {
        const [loaded, EngineCtor] = await Promise.all([loadAssessment(item.id), loadEngine()])
        if (!loaded) throw new Error('量表数据缺失')
        const Ctor = EngineCtor as PsyEngineConstructor
        const next = new Ctor(loaded as PsyAssessment)
        if (gender !== null) next.gender = gender

        const loadedAssessment = loaded as PsyAssessment
        const restoredSelected: Record<number, number> = {}
        if (restore?.selected) {
          for (const [key, index] of Object.entries(restore.selected)) {
            const question = loadedAssessment.questions.find((q) => q.id === Number(key))
            if (!question) continue
            const options = optionList(question, loadedAssessment)
            if (Number.isInteger(index) && index >= 0 && index < options.length) {
              restoredSelected[Number(key)] = index
            }
          }
        }
        if (!Object.keys(restoredSelected).length && restore?.answers) {
          for (const [key, value] of Object.entries(restore.answers)) {
            const question = loadedAssessment.questions.find((q) => q.id === Number(key))
            if (!question) continue
            restoredSelected[Number(key)] = indexOfValue(optionList(question, loadedAssessment), value)
          }
        }
        const restoredValues = valuesFromSelected(restoredSelected, loadedAssessment.questions, loadedAssessment)
        for (const [key, value] of Object.entries(restoredValues)) {
          next.setAnswer(Number(key), value)
        }
        setAssessment(loadedAssessment)
        setEngine(next)
        setSelected(restoredSelected)
        setPage(restore?.page ?? 0)
        setDraftNotice(null)
        setPhase('questions')
        scrollTop()
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '量表加载失败')
      } finally {
        setLoading(false)
      }
    },
    [gender, item.id, scrollTop]
  )

  const choose = useCallback(
    (questionId: number, index: number, value: number) => {
      setSelected((prev) => {
        const next = { ...prev, [questionId]: index }
        writeJson(draftKey(item.id), {
          answers: valuesFromSelected(next, questions, assessment),
          selected: next,
          page,
          gender,
          savedAt: Date.now(),
        } satisfies Draft)
        return next
      })
      engine?.setAnswer(questionId, value)
      setPageError(null)
    },
    [assessment, engine, gender, item.id, page, questions]
  )

  const goPage = useCallback(
    (delta: number) => {
      const missing = pageQuestions.filter((q) => selected[q.id] === undefined)
      if (delta > 0 && missing.length) {
        setPageError(`这一页还有 ${missing.length} 题没答`)
        return
      }
      setPageError(null)
      setPage((prev) => Math.min(pageCount - 1, Math.max(0, prev + delta)))
      scrollTop()
    },
    [pageCount, pageQuestions, scrollTop, selected]
  )

  const submit = useCallback(() => {
    if (!engine) return
    const missing = questions.filter((q) => selected[q.id] === undefined)
    if (missing.length) {
      setPageError(`还有 ${missing.length} 题没答，翻回上一页看看`)
      return
    }
    const computed = engine.computeResult()
    const stamped: PsyResult = { ...computed, answers: computed.answers as PsyAnswer[] }
    writeJson(resultKey(item.id), stamped)
    try {
      window.localStorage.removeItem(draftKey(item.id))
    } catch {
      /* 忽略 */
    }
    setSavedResult(stamped)
    setResult(stamped)
    setPhase('result')
    scrollTop()
  }, [engine, item.id, questions, scrollTop, selected])

  const restart = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey(item.id))
    } catch {
      /* 忽略 */
    }
    setSelected({})
    setPage(0)
    setPageError(null)
    setResult(null)
    setPhase('intro')
    setDraftNotice(null)
    scrollTop()
  }, [item.id, scrollTop])

  const genderMissing = item.requiresGender && gender === null

  return (
    <div className="tc-psy-run" ref={topRef}>
      <nav className="tc-psy-crumb" aria-label="位置">
        <Link href="/psy/">量表库</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{item.name}</span>
      </nav>

      {phase === 'intro' && (
        <section className="tc-psy-intro">
          <p className="tc-psy-eyebrow">
            {item.category} · {item.questionCount} 题 · 约 {item.duration} 分钟
          </p>
          <h1>{item.name}</h1>
          <p className="tc-psy-subtitle">
            {item.fullName}
            {item.englishName ? ` · ${item.englishName}` : ''}
          </p>
          <p className="tc-psy-lead">{item.description}</p>

          <div className="tc-psy-instructions">
            <h2>作答说明</h2>
            <p>{item.instructions}</p>
            {item.timeframe && !item.instructions?.includes(item.timeframe) && (
              <p className="tc-psy-note">
                回想时间范围：<strong>{item.timeframe}</strong>
              </p>
            )}
            <p className="tc-psy-note">结果只保存在这台设备上，不会上传。量表不能代替医生的诊断。</p>
            <p className="tc-psy-note">
              量表题项与计分逻辑转写自 PSYMETRA 项目；量表版权归原作者与出版方所有。
            </p>
          </div>

          {item.requiresGender && (
            <fieldset className="tc-psy-gender">
              <legend>这份量表的常模按性别分组，需要先选一个</legend>
              <div className="tc-psy-gender-options">
                {[
                  { value: 0, label: '男' },
                  { value: 1, label: '女' },
                ].map((option) => (
                  <label key={option.value} className="tc-psy-radio tc-psy-radio--inline">
                    <input
                      type="radio"
                      name="psy-gender"
                      value={option.value}
                      checked={gender === option.value}
                      onChange={() => {
                        setGender(option.value)
                        writeJson(GENDER_KEY, option.value)
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {draftNotice && (
            <div className="tc-psy-banner" role="status">
              <p>上次作答没提交，已答 {Object.keys(draftNotice.selected ?? draftNotice.answers ?? {}).length} 题。</p>
              <div className="tc-psy-banner-actions">
                <button type="button" className="tc-button" onClick={() => start(draftNotice)}>
                  继续上次
                </button>
                <button
                  type="button"
                  className="tc-button tc-button--ghost"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(draftKey(item.id))
                    } catch {
                      /* 忽略 */
                    }
                    setDraftNotice(null)
                  }}
                >
                  丢弃重来
                </button>
              </div>
            </div>
          )}

          {loadError && (
            <p className="tc-psy-error" role="alert">
              {loadError}
            </p>
          )}

          <div className="tc-psy-intro-actions">
            <button
              type="button"
              className="tc-button"
              disabled={loading || genderMissing}
              onClick={() => start(draftNotice ?? undefined)}
            >
              {loading ? '加载中…' : '开始作答'}
            </button>
            {genderMissing && <span className="tc-psy-note">先选性别，才能对正常模</span>}
            {savedResult && (
              <button
                type="button"
                className="tc-button tc-button--ghost"
                onClick={() => {
                  setResult(savedResult)
                  setPhase('result')
                  scrollTop()
                }}
              >
                看上次结果
              </button>
            )}
          </div>
        </section>
      )}

      {phase === 'questions' && (
        <section className="tc-psy-quiz" aria-label={`${item.name} 作答`}>
          <header className="tc-psy-quiz-head">
            <div>
              <p className="tc-psy-eyebrow">{item.name}</p>
              <h1 className="tc-psy-quiz-title">
                第 {page + 1} / {pageCount} 页
              </h1>
            </div>
            <p className="tc-psy-progress-text" role="status">
              已答 {answeredCount} / {questions.length}
            </p>
          </header>
          <div className="tc-psy-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="作答进度">
            <span style={{ width: `${progress}%` }} />
          </div>

          <ol className="tc-psy-questions">
            {pageQuestions.map((question) => {
              const options = question.options?.length ? question.options : assessment?.defaultOptions ?? []
              const current = selected[question.id]
              const fieldName = `q-${question.id}`
              return (
                <li key={question.id} className="tc-psy-question">
                  <p className="tc-psy-question-text">
                    <span className="tc-psy-question-no">{question.id}.</span>
                    {question.text}
                  </p>
                  <div className="tc-psy-options" role="radiogroup" aria-label={`第 ${question.id} 题`}>
                    {options.map((option, index) => (
                      <label
                        key={index}
                        className="tc-psy-radio"
                        data-checked={current === index ? 'true' : undefined}
                      >
                        <input
                          type="radio"
                          name={fieldName}
                          value={option.value}
                          checked={current === index}
                          onChange={() => choose(question.id, index, option.value)}
                        />
                        <span className="tc-psy-radio-body">
                          <span className="tc-psy-radio-label">{option.label}</span>
                          {option.desc && <span className="tc-psy-radio-desc">{option.desc}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              )
            })}
          </ol>

          {pageError && (
            <p className="tc-psy-error" role="alert">
              {pageError}
            </p>
          )}

          <div className="tc-psy-quiz-actions">
            <button type="button" className="tc-button tc-button--ghost" disabled={page === 0} onClick={() => goPage(-1)}>
              上一页
            </button>
            {page < pageCount - 1 ? (
              <button type="button" className="tc-button" onClick={() => goPage(1)}>
                下一页
              </button>
            ) : (
              <button type="button" className="tc-button" onClick={submit}>
                提交，看结果
              </button>
            )}
          </div>
        </section>
      )}

      {phase === 'result' && result && (
        <PsyReport item={item} result={result} levels={assessment?.scoring?.levels ?? []} onRestart={restart} />
      )}
    </div>
  )
}
