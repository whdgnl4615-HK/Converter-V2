import { useState, useEffect } from 'react'
import { useLang } from '../contexts/LangContext'
import { useTemplates } from '../hooks/useTemplates'
import { MODULES, SCHEMAS, buildInitialMapping, buildDesktopMapping, buildCloudMapping } from '../lib/n41Schema'
import { parseUploadedFile, getSourceColumns, convertRows, downloadXlsx, resolveValue } from '../lib/converter'
import { suggestAllTransforms, processCleanseCommand } from '../lib/claudeApi'
import MappingTable from '../components/mapping/MappingTable'
import TemplatePanel from '../components/mapping/TemplatePanel'

export default function ConverterPage({ module: moduleKey }) {
  const { T, lang } = useLang()
  const { templates, fetchTemplates, saveTemplate, deleteTemplate, setDefault, getDefaultTemplate } = useTemplates(moduleKey)

  const [step, setStep]                   = useState(1)
  const [n41Version, setN41Version]       = useState('') // 'desktop' | 'cloud' | ''
  const [evdData, setEvdData]             = useState([])
  const [sourceColumns, setSourceColumns] = useState([])
  const [mapping, setMapping]             = useState(() => buildInitialMapping(moduleKey))
  const [dragging, setDragging]           = useState(false)
  const [uploadErr, setUploadErr]         = useState('')
  const [converting, setConverting]       = useState(false)
  const [convertMsg, setConvertMsg]       = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTemplateName, setActiveTemplateName] = useState('')
  const [previewRows, setPreviewRows]     = useState([])

  // AI cleanse state
  const [aiCleansing, setAiCleansing]       = useState(false)
  const [aiChatInput, setAiChatInput]       = useState('')
  const [aiChatLoading, setAiChatLoading]   = useState(false)
  const [aiChatMsg, setAiChatMsg]           = useState('')
  const [aiCleanseMsg, setAiCleanseMsg]     = useState('')
  const [cleanseResults, setCleanseResults] = useState([]) // [{n41Col, suggested_tf, reason, priority}]
  const [appliedCleanses, setAppliedCleanses] = useState(new Set())
  const [showCleansePanel, setShowCleansePanel] = useState(false)

  const moduleMeta = MODULES.find(m => m.key === moduleKey)

  useEffect(() => {
    setStep(1); setEvdData([]); setSourceColumns([])
    setMapping(buildInitialMapping(moduleKey))
    setN41Version('')
    setActiveTemplateName(''); setUploadErr(''); setConvertMsg('')
    setCleanseResults([]); setAppliedCleanses(new Set()); setShowCleansePanel(false)
    fetchTemplates()
  }, [moduleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (templates.length > 0 && !activeTemplateName) {
      const def = getDefaultTemplate()
      if (def) { setMapping(def.mapping); setActiveTemplateName(def.name) }
    }
  }, [templates]) // eslint-disable-line react-hooks/exhaustive-deps

  function rebuildPreview(currentMapping) {
    if (!evdData.length) return
    const allCols = Object.keys(currentMapping)
    const rows = evdData.map((row, i) => {
      const out = {}
      allCols.forEach(col => { out[col] = resolveValue(col, currentMapping, row, i) })
      return out
    })
    setPreviewRows(rows)
  }

  useEffect(() => {
    if (step === 3) rebuildPreview(mapping)
  }, [step, evdData, mapping]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(file) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setUploadErr(T.converter.uploadErrFormat); return
    }
    // Auto-detect version from filename if not selected
    if (!n41Version) {
      const lower = file.name.toLowerCase()
      const detected = lower.includes('cloud') ? 'cloud' : 'desktop'
      setN41Version(detected)
      setMapping(detected === 'desktop' ? buildDesktopMapping(moduleKey) : buildCloudMapping(moduleKey))
    }
    setUploadErr('')
    try {
      const data = await parseUploadedFile(file)
      setEvdData(data)
      setSourceColumns(getSourceColumns(data))
      const def = getDefaultTemplate()
      if (def) { setMapping(def.mapping); setActiveTemplateName(def.name) }
      setStep(2)
    } catch (err) {
      setUploadErr(T.converter.uploadErr + err.message)
    }
  }

  function updateMappingCol(col, val) {
    setMapping(prev => ({ ...prev, [col]: val }))
  }

  async function handleSaveTemplate(name, mappingOverride) {
    await saveTemplate(name, mappingOverride || mapping)
  }

  function handleLoadTemplate(tpl) {
    setMapping(tpl.mapping)
    setActiveTemplateName(tpl.name)
  }

  function handleExportTemplates() {
    const data = templates.map(t => ({ name: t.name, mapping: t.mapping }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const d = new Date()
    a.download = `n41_${moduleKey}_templates_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleConvert() {
    setConverting(true); setConvertMsg('')
    try {
      const rows = convertRows(evdData, mapping, moduleKey)
      downloadXlsx(rows, mapping, moduleKey)
      setConvertMsg(T.converter.convertDone)
    } catch (e) {
      setConvertMsg(T.converter.convertErr + e.message)
    } finally {
      setConverting(false)
    }
  }

  // ── AI Cleanse ──
  async function handleAICleanse() {
    setAiCleansing(true)
    setAiCleanseMsg('')
    setCleanseResults([])
    try {
      const sampleRow = evdData[0] || {}
      const results = await suggestAllTransforms(mapping, sourceColumns, sampleRow)
      setCleanseResults(results)
      setShowCleansePanel(true)
      const high = results.filter(r => r.priority === 'high').length
      setAiCleanseMsg(`✨ ${results.length}개 제안 (${high}개 중요)`)
    } catch (e) {
      setAiCleanseMsg('❌ ' + e.message)
    } finally {
      setAiCleansing(false)
    }
  }

  function applyOneCleanse(n41Col, tf) {
    const newMapping = { ...mapping, [n41Col]: { ...mapping[n41Col], tf } }
    setMapping(newMapping)
    setAppliedCleanses(prev => new Set([...prev, n41Col]))
    if (step === 3) rebuildPreview(newMapping)
  }

  function applyAllCleanses() {
    const updates = {}
    for (const r of cleanseResults) {
      if (!appliedCleanses.has(r.n41Col)) {
        updates[r.n41Col] = { ...mapping[r.n41Col], tf: r.suggested_tf }
      }
    }
    const newMapping = { ...mapping, ...updates }
    setMapping(newMapping)
    setAppliedCleanses(new Set(cleanseResults.map(r => r.n41Col)))
    setAiCleanseMsg(`✅ ${cleanseResults.length}개 전체 적용 완료`)
    if (step === 3) rebuildPreview(newMapping)
  }

  // AI chat command handler
  async function handleAiChat() {
    if (!aiChatInput.trim()) return
    setAiChatLoading(true)
    setAiChatMsg('')
    try {
      const sampleRow = evdData[0] || {}
      const results = await processCleanseCommand(aiChatInput, mapping, sourceColumns, sampleRow)
      if (!results.length) {
        setAiChatMsg('❌ 해당하는 컬럼을 찾지 못했어요')
        return
      }
      // Apply results
      let newMapping = { ...mapping }
      for (const r of results) {
        if (newMapping[r.n41Col]) {
          newMapping[r.n41Col] = { ...newMapping[r.n41Col], tf: r.suggested_tf }
        }
      }
      setMapping(newMapping)
      if (step === 3) rebuildPreview(newMapping)
      setAiChatMsg(`✅ ${results.length}개 컬럼에 적용: ${results.map(r => r.n41Col).join(', ')}`)
      setAiChatInput('')
    } catch (e) {
      setAiChatMsg('❌ ' + e.message)
    } finally {
      setAiChatLoading(false)
    }
  }

  const activeCols = Object.keys(mapping).filter(c => mapping[c]?.src !== '')

  const uniqueCount = (() => {
    if (!evdData.length) return 0
    const keyFields = ['orderNo', 'poNo', 'customer', 'index']
    for (const field of keyFields) {
      const src = mapping[field]?.src
      if (src && src !== '__row_index__' && src !== '__fixed__' && !src.startsWith('__computed__')) {
        return new Set(evdData.map(r => r[src])).size
      }
    }
    return evdData.length
  })()

  const PRIORITY_COLOR = {
    high:   { color: 'var(--red)',    bg: 'rgba(220,38,38,0.08)',  label: '🔴 중요' },
    medium: { color: 'var(--orange)', bg: 'rgba(217,119,6,0.10)',   label: '🟡 보통' },
    low:    { color: 'var(--text3)',  bg: 'rgba(255,255,255,0.03)', label: '⚪ 낮음' },
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{background:'var(--s1)',borderBottom:'1px solid var(--border)',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{moduleMeta?.icon}</span>
          <div>
            <div className="font-semibold text-sm" style={{color:'var(--text)'}}>
              {lang === 'ko' ? moduleMeta?.label_ko : moduleMeta?.label_en}
            </div>
            {activeTemplateName && (
              <div className="text-xs mono" style={{color:'var(--accent)'}}>📋 {activeTemplateName}</div>
            )}
          </div>
        </div>

        {/* Step pills */}
        <div className="flex gap-1">
          {[
            [1, T.converter.stepUpload],
            [2, T.converter.stepMapping],
            [3, T.converter.stepConvert],
          ].map(([n, label]) => (
            <div key={n} className="px-3 py-1 rounded-full text-xs mono"
              style={{
                background: step === n ? 'var(--accent-glow)' : step > n ? 'rgba(22,163,74,0.08)' : 'transparent',
                color: step === n ? 'var(--accent)' : step > n ? 'var(--green)' : 'var(--text3)',
                border: `1px solid ${step === n ? 'var(--accent)' : step > n ? 'var(--green)' : 'var(--border)'}`,
              }}>
              {label}
            </div>
          ))}
        </div>

        {step >= 2 && (
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="px-3 py-1.5 rounded-lg text-xs mono transition-all"
            style={{
              background: showTemplates ? 'var(--accent-glow)' : 'transparent',
              color: showTemplates ? 'var(--accent)' : 'var(--text2)',
              border: `1px solid ${showTemplates ? 'var(--accent)' : 'var(--border2)'}`,
            }}>
            📋 {T.templates.title}
          </button>
        )}
        {step < 2 && <div className="w-24" />}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 p-6 ${step === 3 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div>
              {/* Desktop / Cloud 선택 */}
              <div className="flex gap-3 mb-5">
                {[
                  { key: 'desktop', label: 'Desktop', icon: '🖥️', desc: 'N41 Desktop Import 템플릿' },
                  { key: 'cloud',   label: 'Cloud',   icon: '☁️', desc: 'N41 Cloud Import 템플릿' },
                ].map(v => (
                  <button key={v.key} onClick={() => {
                    setN41Version(v.key)
                    setMapping(v.key === 'desktop' ? buildDesktopMapping(moduleKey) : buildCloudMapping(moduleKey))
                    setActiveTemplateName(v.key === 'desktop' ? '[Desktop] 기본 매핑' : '')
                  }}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                    style={{
                      background: n41Version === v.key ? 'var(--accent-glow)' : 'var(--s1)',
                      border: `2px solid ${n41Version === v.key ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-2xl">{v.icon}</span>
                    <div>
                      <div className="text-sm font-bold mono" style={{color: n41Version === v.key ? 'var(--accent)' : 'var(--text)'}}>
                        {v.label}
                      </div>
                      <div className="text-xs mt-0.5" style={{color:'var(--text3)'}}>{v.desc}</div>
                    </div>
                    {n41Version === v.key && (
                      <span className="ml-auto text-xs mono" style={{color:'var(--accent)'}}>✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div
                className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
                  background: dragging ? 'var(--s2)' : 'var(--s1)',
                  padding: '80px 40px',
                  minHeight: '320px',
                }}
                onClick={() => document.getElementById('file-input-' + moduleKey).click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}>
                <div className="text-5xl mb-4">📂</div>
                <p className="text-base font-medium mb-2" style={{color:'var(--text)'}}>
                  <strong style={{color:'var(--accent)'}}>{T.converter.uploadTitle}</strong>
                </p>
                <p className="text-xs mono" style={{color:'var(--text2)'}}>{T.converter.uploadSub}</p>
                {uploadErr && <p className="mt-4 text-sm" style={{color:'var(--red)'}}>{uploadErr}</p>}
              </div>
              <input id={'file-input-' + moduleKey} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {/* ── STEP 2: Mapping ── */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm mono font-bold uppercase" style={{color:'var(--text2)',letterSpacing:'2px'}}>
                  {T.converter.mappingTitle}
                </h2>
                <div className="flex items-center gap-2 text-xs mono" style={{color:'var(--text3)'}}>
                  <span className="px-1.5 py-0.5 rounded" style={{background:'rgba(22,163,74,0.08)',color:'var(--green)'}}>AUTO</span>
                  {lang==='ko'?'직접매핑':'Direct map'}
                  <span className="px-1.5 py-0.5 rounded" style={{background:'rgba(37,99,235,0.08)',color:'var(--blue)'}}>CALC</span>
                  {lang==='ko'?'계산값':'Computed'}
                  <span className="px-1.5 py-0.5 rounded" style={{background:'rgba(217,119,6,0.10)',color:'var(--orange)'}}>FIXED</span>
                  {lang==='ko'?'고정값':'Fixed'}
                  <span className="px-1.5 py-0.5 rounded" style={{background:'rgba(255,255,255,0.04)',color:'var(--text3)'}}>SKIP</span>
                  {lang==='ko'?'비워두기':'Empty'}
                </div>
              </div>
              <MappingTable
                moduleKey={moduleKey}
                mapping={mapping}
                sourceColumns={sourceColumns}
                onMappingChange={updateMappingCol}
                evdData={evdData}
              />
              <div className="flex justify-between mt-4">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-sm mono transition-all"
                  style={{background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)'}}>
                  {T.converter.back}
                </button>
                <button onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-lg text-sm mono font-bold transition-all"
                  style={{background:'var(--accent)',color:'white'}}>
                  {T.converter.next}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preview & Convert ── */}
          {step === 3 && (
            <div className="flex flex-col h-full" style={{minHeight:0}}>

              {/* Top controls */}
              <div className="flex-shrink-0 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm mono font-bold uppercase" style={{color:'var(--text2)',letterSpacing:'2px'}}>
                    {lang==='ko' ? '변환 미리보기' : 'Preview'}
                  </h2>
                  <div className="flex flex-col gap-2 flex-1">
                    {/* AI 자동 제안 버튼 */}
                    <div className="flex items-center gap-2">
                      <button onClick={handleAICleanse} disabled={aiCleansing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-bold transition-all flex-shrink-0"
                        style={{
                          background: aiCleansing ? 'var(--s2)' : 'var(--accent-glow)',
                          border: '1px solid var(--accent)',
                          color: aiCleansing ? 'var(--text3)' : 'var(--accent)',
                          cursor: aiCleansing ? 'wait' : 'pointer',
                        }}>
                        {aiCleansing
                          ? <><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</span> 분석 중…</>
                          : <>✨ AI 자동 제안</>
                        }
                      </button>
                      {aiCleanseMsg && (
                        <span className="text-xs mono" style={{color: aiCleanseMsg.startsWith('❌') ? 'var(--red)' : 'var(--green)'}}>
                          {aiCleanseMsg}
                        </span>
                      )}
                    </div>
                    {/* AI 직접 요청 입력창 */}
                    <div className="flex items-center gap-2">
                      <input
                        value={aiChatInput}
                        onChange={e => setAiChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !aiChatLoading && handleAiChat()}
                        placeholder="예: address 컬럼 special character 지워줘 / name 20자 이상 잘라줘"
                        className="flex-1 rounded-lg px-3 py-1.5 text-xs mono outline-none"
                        style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text)',minWidth:0}}
                        onFocus={e => e.target.style.borderColor='var(--accent)'}
                        onBlur={e => e.target.style.borderColor='var(--border2)'}
                      />
                      <button onClick={handleAiChat} disabled={aiChatLoading || !aiChatInput.trim()}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs mono font-bold transition-all"
                        style={{
                          background: aiChatLoading ? 'var(--s2)' : 'var(--accent)',
                          color: aiChatLoading ? 'var(--text3)' : 'white',
                          cursor: aiChatLoading || !aiChatInput.trim() ? 'not-allowed' : 'pointer',
                          opacity: !aiChatInput.trim() ? 0.5 : 1,
                        }}>
                        {aiChatLoading
                          ? <span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</span>
                          : '→ 실행'
                        }
                      </button>
                    </div>
                    {aiChatMsg && (
                      <div className="text-xs mono px-2 py-1 rounded" style={{
                        color: aiChatMsg.startsWith('❌') ? 'var(--red)' : 'var(--green)',
                        background: aiChatMsg.startsWith('❌') ? 'rgba(220,38,38,0.06)' : 'rgba(22,163,74,0.08)',
                      }}>
                        {aiChatMsg}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {convertMsg && (
                      <span className="text-xs mono" style={{
                        color: convertMsg.includes('오류') || convertMsg.includes('Error') ? 'var(--red)' : 'var(--green)'
                      }}>{convertMsg}</span>
                    )}
                    <button onClick={() => setStep(2)}
                      className="px-3 py-1.5 rounded-lg text-sm mono transition-all"
                      style={{background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)'}}>
                      {T.converter.back}
                    </button>
                    <button onClick={handleConvert} disabled={converting}
                      className="px-5 py-1.5 rounded-lg text-sm mono font-bold transition-all"
                      style={{background:'var(--green)',color:'white',opacity:converting?0.6:1}}>
                      {converting ? T.converter.converting : T.converter.convert}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[
                    [evdData.length, lang==='ko'?'총 레코드':'Total Records'],
                    [activeCols.length, lang==='ko'?'활성 컬럼':'Active Cols'],
                    [uniqueCount, lang==='ko'?'고유 건수':'Unique Count'],
                  ].map(([val, lbl]) => (
                    <div key={lbl} className="rounded-lg p-2 text-center" style={{background:'var(--s1)',border:'1px solid var(--border)'}}>
                      <div className="text-lg font-bold mono" style={{color:'var(--accent)'}}>{val}</div>
                      <div className="text-xs" style={{color:'var(--text2)'}}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* AI Cleanse Panel */}
                {showCleansePanel && cleanseResults.length > 0 && (
                  <div className="rounded-xl mb-2 overflow-hidden" style={{border:'1px solid var(--accent)',background:'rgba(79,99,210,0.04)'}}>
                    <div className="px-4 py-2 flex items-center justify-between"
                      style={{background:'var(--accent-glow)',borderBottom:'1px solid rgba(79,99,210,0.15)'}}>
                      <span className="text-xs mono font-bold" style={{color:'var(--accent)'}}>
                        ✨ AI 클렌징 제안 — {cleanseResults.length}개
                      </span>
                      <div className="flex gap-2">
                        <button onClick={applyAllCleanses}
                          className="px-3 py-1 rounded-lg text-xs mono font-bold"
                          style={{background:'var(--accent)',color:'white'}}>전체 적용</button>
                        <button onClick={() => setShowCleansePanel(false)}
                          style={{color:'var(--text3)',background:'none',border:'none',cursor:'pointer',fontSize:'16px'}}>×</button>
                      </div>
                    </div>
                    <div style={{maxHeight:'140px',overflowY:'auto'}}>
                      {cleanseResults.map((r, i) => {
                        const p = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.low
                        const applied = appliedCleanses.has(r.n41Col)
                        return (
                          <div key={i} className="px-4 py-2 flex items-center gap-3"
                            style={{borderBottom:'1px solid var(--accent-glow)',background:applied?'rgba(22,163,74,0.05)':'transparent'}}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs mono font-bold" style={{color:'var(--accent)'}}>{r.n41Col}</span>
                                <span className="text-xs mono px-1.5 py-0.5 rounded" style={{background:p.bg,color:p.color}}>{p.label}</span>
                                <span className="text-xs" style={{color:'var(--text2)'}}>{r.reason}</span>
                                <span className="text-xs mono px-1.5 py-0.5 rounded" style={{background:'var(--s2)',color:'var(--orange)',border:'1px solid var(--border)'}}>{r.suggested_tf}</span>
                                {applied && <span className="text-xs mono" style={{color:'var(--green)'}}>✓</span>}
                              </div>
                            </div>
                            {!applied && (
                              <button onClick={() => applyOneCleanse(r.n41Col, r.suggested_tf)}
                                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs mono font-bold"
                                style={{background:'var(--accent-glow)',border:'1px solid var(--accent)',color:'var(--accent)'}}>
                                적용
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Split preview: 위=원본, 아래=변환 */}
              <div className="flex-1 flex flex-col gap-2" style={{minHeight:0}}>

                {/* 위: 원본 데이터 */}
                <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{border:'1px solid var(--border)',minHeight:0}}>
                  <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
                    style={{background:'var(--s2)',borderBottom:'1px solid var(--border)'}}>
                    <span className="text-xs mono font-bold uppercase" style={{color:'var(--text3)',letterSpacing:'1px'}}>
                      📄 {lang==='ko' ? '원본 데이터' : 'Source Data'}
                    </span>
                    <span className="text-xs mono" style={{color:'var(--text3)'}}>{evdData.length} rows · {sourceColumns.length} cols</span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="text-xs" style={{borderCollapse:'collapse',minWidth:'100%'}}>
                      <thead style={{position:'sticky',top:0,zIndex:5}}>
                        <tr style={{background:'var(--s2)',borderBottom:'1px solid var(--border)'}}>
                          <th className="px-3 py-1.5 text-left mono whitespace-nowrap"
                            style={{color:'var(--text3)',background:'var(--s2)',minWidth:36}}>#</th>
                          {sourceColumns.map(col => (
                            <th key={col} className="px-3 py-1.5 text-left mono whitespace-nowrap"
                              style={{color:'var(--blue)',background:'var(--s2)'}}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {evdData.map((row, i) => (
                          <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'var(--s1)':'var(--bg)'}}>
                            <td className="px-3 py-1 mono" style={{color:'var(--text3)'}}>{i+1}</td>
                            {sourceColumns.map(col => (
                              <td key={col} className="px-3 py-1 mono whitespace-nowrap"
                                style={{color:'var(--text2)',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis'}}>
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 아래: 변환 후 데이터 */}
                <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{border:'1px solid var(--green)',minHeight:0}}>
                  <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
                    style={{background:'rgba(61,214,140,0.06)',borderBottom:'1px solid rgba(22,163,74,0.20)'}}>
                    <span className="text-xs mono font-bold uppercase" style={{color:'var(--green)',letterSpacing:'1px'}}>
                      ✅ {lang==='ko' ? 'N41 변환 결과' : 'N41 Output'}
                    </span>
                    <span className="text-xs mono" style={{color:'var(--text3)'}}>{previewRows.length} rows · {activeCols.length} cols</span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="text-xs" style={{borderCollapse:'collapse',minWidth:'100%'}}>
                      <thead style={{position:'sticky',top:0,zIndex:5}}>
                        <tr style={{background:'rgba(61,214,140,0.06)',borderBottom:'1px solid rgba(22,163,74,0.20)'}}>
                          <th className="px-3 py-1.5 text-left mono whitespace-nowrap"
                            style={{color:'var(--text3)',background:'rgba(61,214,140,0.06)',minWidth:36}}>#</th>
                          {previewRows[0] && Object.keys(previewRows[0]).map(col => (
                            <th key={col} className="px-3 py-1.5 text-left mono whitespace-nowrap"
                              style={{color:'var(--green)',background:'rgba(61,214,140,0.06)'}}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'var(--s1)':'var(--bg)'}}>
                            <td className="px-3 py-1 mono" style={{color:'var(--text3)'}}>{i+1}</td>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-1 mono whitespace-nowrap"
                                style={{color:'var(--text2)',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis'}}>
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Template sidebar */}
        {showTemplates && step >= 2 && (
          <div className="w-72 flex-shrink-0 border-l overflow-hidden flex flex-col" style={{borderColor:'var(--border)'}}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{borderColor:'var(--border)',background:'var(--s2)'}}>
              <span className="text-xs mono font-bold uppercase" style={{color:'var(--text2)',letterSpacing:'1.5px'}}>
                {T.templates.title}
              </span>
              <button onClick={() => setShowTemplates(false)} style={{color:'var(--text3)',background:'none',border:'none',cursor:'pointer',fontSize:'18px',lineHeight:1}}>×</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TemplatePanel
                templates={templates}
                activeTemplateName={activeTemplateName}
                onLoad={handleLoadTemplate}
                onSave={handleSaveTemplate}
                onDelete={deleteTemplate}
                onSetDefault={setDefault}
                onExport={handleExportTemplates}
                onImport={() => {}}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
