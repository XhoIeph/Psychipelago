'use client'

import Link from 'next/link'
import { ChevronLeft, Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
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

gsap.registerPlugin(useGSAP)

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
  const storageId = item.formVersion ? `${item.id}.${item.formVersion}` : item.id
  const [phase, setPhase] = useState<Phase>('intro')
  const [assessment, setAssessment] = useState<PsyAssessment | null>(null)
  const [engine, setEngine] = useState<PsyEngine | null>(null)
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [gender, setGender] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PsyResult | null>(null)
  const [savedResult, setSavedResult] = useState<PsyResult | null>(null)
  const [priorResult, setPriorResult] = useState<PsyResult | null>(null)
  const [priorDraft, setPriorDraft] = useState(false)
  const [draftNotice, setDraftNotice] = useState<Draft | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const consentRef = useRef<HTMLDialogElement>(null)
  const consentAccepted = useRef(false)
  const pendingDraft = useRef<Draft | undefined>(undefined)
  const topRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const pageDirectionRef = useRef(1)
  const prevPhaseRef = useRef<Phase>('intro')

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
    setSavedResult(readJson<PsyResult>(resultKey(storageId)))
    setPriorResult(item.formVersion ? readJson<PsyResult>(resultKey(item.id)) : null)
    setPriorDraft(Boolean(item.formVersion && readJson<Draft>(draftKey(item.id))))
    const draft = readJson<Draft>(draftKey(storageId))
    const resumed = draft ? Object.keys(draft.selected ?? draft.answers ?? {}).length : 0
    if (draft && resumed > 0) {
      setDraftNotice(draft)
      setGender(draft.gender ?? readJson<number>(GENDER_KEY))
    } else {
      setGender(readJson<number>(GENDER_KEY))
    }
  }, [item.id, item.formVersion, storageId])

  const scrollTop = useCallback(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [])

  useGSAP(
    () => {
      const stage = stageRef.current
      if (!stage) return
      const phaseChanged = prevPhaseRef.current !== phase
      prevPhaseRef.current = phase
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        if (phase === 'questions' && !phaseChanged) {
          const items = Array.from(stage.querySelectorAll<HTMLElement>('.tc-psy-question'))
          if (!items.length) return
          gsap.killTweensOf(items)
          gsap.fromTo(
            items,
            { opacity: 0, x: pageDirectionRef.current * 18 },
            {
              opacity: 1,
              x: 0,
              duration: 0.28,
              stagger: 0.018,
              ease: 'power3.out',
              overwrite: 'auto',
              clearProps: 'transform,opacity',
            },
          )
          return
        }
        gsap.killTweensOf(stage)
        gsap.fromTo(
          stage,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.32,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'transform,opacity',
          },
        )
      })
      return () => media.revert()
    },
    { scope: topRef, dependencies: [phase, page] },
  )

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
        pageDirectionRef.current = 1
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

  const saveDraft = useCallback(
    (choices: Record<number, number>, draftPage: number) => {
      writeJson(draftKey(storageId), {
        answers: valuesFromSelected(choices, questions, assessment),
        selected: choices,
        page: draftPage,
        gender,
        savedAt: Date.now(),
      } satisfies Draft)
    },
    [assessment, gender, questions, storageId]
  )

  const choose = useCallback(
    (questionId: number, index: number, value: number) => {
      const next = { ...selected, [questionId]: index }
      setSelected(next)
      saveDraft(next, page)
      engine?.setAnswer(questionId, value)
      setPageError(null)
    },
    [engine, page, saveDraft, selected]
  )

  const goPage = useCallback(
    (delta: number) => {
      const missing = pageQuestions.filter((q) => selected[q.id] === undefined)
      if (delta > 0 && missing.length) {
        setPageError(`这一页还有 ${missing.length} 题没答`)
        return
      }
      const nextPage = Math.min(pageCount - 1, Math.max(0, page + delta))
      pageDirectionRef.current = delta >= 0 ? 1 : -1
      setPageError(null)
      setPage(nextPage)
      saveDraft(selected, nextPage)
      scrollTop()
    },
    [page, pageCount, pageQuestions, saveDraft, scrollTop, selected]
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
    writeJson(resultKey(storageId), stamped)
    try {
      window.localStorage.removeItem(draftKey(storageId))
    } catch {
      /* 忽略 */
    }
    setSavedResult(stamped)
    setResult(stamped)
    setPhase('result')
    scrollTop()
  }, [engine, storageId, questions, scrollTop, selected])

  const restart = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey(storageId))
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
  }, [storageId, scrollTop])

  const genderMissing = item.requiresGender && gender === null

  const requestStart = (draft?: Draft) => {
    if (loading || genderMissing) return
    if (consentAccepted.current) {
      void start(draft)
      return
    }
    pendingDraft.current = draft
    setConsentChecked(false)
    consentRef.current?.showModal()
  }

  return (
    <div className="tc-psy-run" ref={topRef}>
      <nav className="tc-psy-crumb" aria-label="位置">
        <Link href="/psy/" className="tc-detail-back">
          <ChevronLeft aria-hidden="true" />
          <span>量表库</span>
        </Link>
      </nav>

      <dialog ref={consentRef} className="tc-psy-consent-dialog" aria-labelledby="psy-consent-title" aria-modal="true">
        <header className="tc-psy-consent-head">
          <Info size={22} aria-hidden="true" />
          <h2 id="psy-consent-title">测评前必读与免责声明</h2>
        </header>
        <ul className="tc-psy-consent-list">
          <li><strong>测评用途</strong><p>量表可用于心理健康科普和自我评估，结果不构成医学诊断或治疗建议。需要诊断或治疗时，请咨询专业人员。</p></li>
          <li><strong>怎么看结果</strong><p>作答时的状态和环境会影响结果。请结合题目所问的时间范围理解分数，不必用一次结果给自己贴标签。</p></li>
          <li><strong>隐私保护</strong><p>答案、草稿和结果保存在当前浏览器的本地存储中，方便续答和回看。作答不会上传到群岛服务器。</p></li>
        </ul>
        <form className="tc-psy-consent-form" onSubmit={(event) => {
          event.preventDefault()
          if (!consentChecked) return
          consentAccepted.current = true
          consentRef.current?.close()
          void start(pendingDraft.current)
        }}>
          <label className="tc-psy-consent-confirm">
            <input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} />
            <span>我已阅读并理解以上说明，自愿开始测评。</span>
          </label>
          <div className="tc-psy-consent-actions">
            <button type="button" className="tc-button tc-button--ghost" onClick={() => consentRef.current?.close()}>暂不开始</button>
            <button type="submit" className="tc-button tc-button--active" disabled={!consentChecked}>确认并作答</button>
          </div>
        </form>
      </dialog>

      <div ref={stageRef}>
      {phase === 'intro' && (
        <section className="tc-psy-intro">
          <h1>{item.fullName}</h1>
          <p className="tc-psy-subtitle">{item.name}</p>
          <ul className="tc-doctor-disorders tc-psy-tags" aria-label="量表信息">
            <li>
              <span>{item.category}</span>
            </li>
            <li>
              <span>{item.questionCount} 题</span>
            </li>
          </ul>
          <p className="tc-psy-lead">{item.description}</p>

          <div className="tc-psy-instructions">
            <h2>作答说明</h2>
            <p>{item.instructions}</p>
            {item.timeframe && !item.instructions?.includes(item.timeframe) && (
              <p className="tc-psy-note">
                回想时间范围：<strong>{item.timeframe}</strong>
              </p>
            )}
            {item.attribution && <p className="tc-psy-note"><a href={item.attribution.url}>{item.attribution.label}</a></p>}
            {item.validationStudy && <p className="tc-psy-note"><a href={item.validationStudy.url}>{item.validationStudy.label}</a></p>}
          </div>

          {priorDraft && <p className="tc-psy-note">旧版草稿仍保存在此浏览器。题面已更新，当前版本需重新作答。</p>}

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
                <button type="button" className="tc-button tc-button--active" disabled={loading || genderMissing} onClick={() => requestStart(draftNotice)}>
                  继续上次
                </button>
                <button
                  type="button"
                  className="tc-button tc-button--ghost"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(draftKey(storageId))
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
              className="tc-button tc-button--active"
              disabled={loading || genderMissing}
              onClick={() => requestStart(draftNotice ?? undefined)}
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
            {priorResult && (
              <button type="button" className="tc-button tc-button--ghost" onClick={() => {
                setResult(priorResult)
                setPhase('result')
                scrollTop()
              }}>
                查看旧版结果
              </button>
            )}
          </div>
        </section>
      )}

      {phase === 'questions' && (
        <section className="tc-psy-quiz" aria-label={`${item.name} 作答`}>
          <header className="tc-psy-quiz-head">
            <h1>{item.fullName}</h1>
            <div className="tc-psy-quiz-status">
              {pageCount > 1 && <span>第 {page + 1} / {pageCount} 页</span>}
              <p role="status">已答 {answeredCount} / {questions.length}</p>
            </div>
          </header>
          <div className="tc-psy-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="作答进度">
            <span style={{ width: `${progress}%` }} />
          </div>

          <ol className="tc-psy-questions">
            {pageQuestions.map((question, index) => {
              const options = optionList(question, assessment)
              const fitsScale = options.every(option => option.label.length <= 10)
              const current = selected[question.id]
              const fieldName = `q-${question.id}`
              const displayNumber = question.displayNumber ?? question.id
              const groupPrompt = question.groupPrompt !== pageQuestions[index - 1]?.groupPrompt ? question.groupPrompt : undefined
              return (
                <li key={question.id} className="tc-psy-question">
                  {question.instruction && <p className="tc-psy-note">{question.instruction}</p>}
                  {groupPrompt && <p className="tc-psy-note">{groupPrompt}</p>}
                  <p className="tc-psy-question-text">
                    <span className="tc-psy-question-no">{displayNumber}.</span>
                    {question.text}
                  </p>
                  <div className="tc-psy-options" role="radiogroup" aria-label={`第 ${displayNumber} 题`}
                    data-scale={fitsScale ? (options.length < 7 ? 'compact' : 'wide') : undefined}>
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
                        <span className="tc-psy-radio-label">{option.label}</span>
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
              <button type="button" className="tc-button tc-button--active" onClick={() => goPage(1)}>
                下一页
              </button>
            ) : (
              <button type="button" className="tc-button tc-button--active" onClick={submit}>
                提交，看结果
              </button>
            )}
          </div>
        </section>
      )}

      {phase === 'result' && result && (
        <PsyReport result={result} levels={assessment?.scoring?.levels ?? []} onRestart={restart} />
      )}
      </div>
    </div>
  )
}
