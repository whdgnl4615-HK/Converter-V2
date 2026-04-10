import { useState, useEffect } from 'react'
import { useLang } from '../contexts/LangContext'
import { useTemplates } from '../hooks/useTemplates'
import { MODULES, SCHEMAS, buildInitialMapping } from '../lib/n41Schema'
import { parseUploadedFile, getSourceColumns, convertRows, downloadXlsx, resolveValue } from '../lib/converter'
import { suggestAllTransforms } from '../lib/claudeApi'
import MappingTable from '../components/mapping/MappingTable'
import TemplatePanel from '../components/mapping/TemplatePanel'

export default function ConverterPage({ module: moduleKey }) {
  const { T, lang } = useLang()
  const { templates, fetchTemplates, saveTemplate, deleteTemplate, setDefault, getDefaultTemplate } = useTemplates(moduleKey)

  const [step, setStep]                   = useState(1)
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
  const [aiCleanseMsg, setAiCleanseMsg]     = useState('')
  const [cleanseResults, setCleanseResults] = useState([]) // [{n41Col, suggested_tf, reason, priority}]
  const [appliedCleanses, setAppliedCleanses] = useState(new Set())
  const [showCleansePanel, setShowCleansePanel] = useState(false)

  const moduleMeta = MODULES.find(m => m.key === moduleKey)

  useEffect(() => {
    setStep(1); setEvdData([]); setSourceColumns([])
    setMapping(buildInitialMapping(moduleKey))
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

  useEffect(() => {
    if (step === 3 && evdData.length) {
      const rows = evdData.slice(0, 5).map((row, i) => {
        const out = {}
        const activeCols = Object.keys(mapping).filter(c => mapping[c]?.src !== '')
        activeCols.forEach(col => { out[col] = resolveValue(col, mapping, row, i) })
        return out
      })
      setPreviewRows(rows)
    }
  }, [step, evdData, mapping])

  async function handleFile(file) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setUploadErr(T.converter.uploadErrFormat); return
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
    setMapping(prev => ({
      ...prev,
      [n41Col]: { ...prev[n41Col], tf }
    }))
    setAppliedCleanses(prev => new Set([...prev, n41Col]))
  }

  function applyAllCleanses() {
    const updates = {}
    for (const r of cleanseResults) {
      if (!appliedCleanses.has(r.n41Col)) {
        updates[r.n41Col] = { ...mapping[r.n41Col], tf: r.suggested_tf }
      }
    }
    setMapping(prev => ({ ...prev, ...updates }))
    setAppliedCleanses(new Set(cleanseResults.map(r => r.n41Col)))
    setAiCleanseMsg(`✅ ${cleanseResults.length}개 전체 적용 완료`)
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
    high:   { color: 'var(--red)',    bg: 'rgba(247,108,108,0.1)',  label: '🔴 중요' },
    medium: { color: 'var(--orange)', bg: 'rgba(247,163,92,0.1)',   label: '🟡 보통' },
    low:    { color: 'var(--text3)',  bg: 'rgba(255,255,255,0.03)', label: '⚪ 낮음' },
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{background:'var(--s1)',borderBottom:'1px solid var(--border)'}}>
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
                background: step === n ? 'var(--accent-glow)' : step > n ? 'rgba(61,214,140,0.08)' : 'transparent',
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
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div>
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
                  <span className="px-1.5 py-0.5 rounded" style={{background:'rgba(61,214,140,0.08)',color:'var(--green)'}}>AUTO</span>
                  {lang==='ko'?'직접매핑':'Direct map'}
                  <span className="px-1.5 py-0.5 rounded" style={{background:'rgba(92,190,247,0.1)',color:'var(--blue)'}}>CALC</span>
                  {lang==='ko'?'계산값':'Computed'}
                  <span className="px-1.5 py-0.5 rounded" style={{background:'rgba(247,163,92,0.1)',color:'var(--orange)'}}>FIXED</span>
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
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm mono font-bold uppercase" style={{color:'var(--text2)',letterSpacing:'2px'}}>
                  {T.converter.previewTitle}
                </h2>
                <div className="flex items-center gap-2">
                  {/* AI Cleanse button */}
                  <button onClick={handleAICleanse} disabled={aiCleansing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mono font-bold transition-all"
                    style={{
                      background: aiCleansing ? 'var(--s2)' : 'var(--accent-glow)',
                      border: '1px solid var(--accent)',
                      color: aiCleansing ? 'var(--text3)' : 'var(--accent)',
                      cursor: aiCleansing ? 'wait' : 'pointer',
                    }}>
                    {aiCleansing
                      ? <><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⟳</span> AI 분석 중…</>
                      : <>✨ AI 데이터 클렌징 제안</>
                    }
                  </button>
                  {aiCleanseMsg && (
                    <span className="text-xs mono" style={{color: aiCleanseMsg.startsWith('❌') ? 'var(--red)' : 'var(--green)'}}>
                      {aiCleanseMsg}
                    </span>
                  )}
                </div>
              </div>

              {/* AI Cleanse Panel */}
              {showCleansePanel && cleanseResults.length > 0 && (
                <div className="rounded-xl mb-4 overflow-hidden" style={{border:'1px solid var(--accent)',background:'rgba(124,106,247,0.05)'}}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{background:'rgba(124,106,247,0.1)',borderBottom:'1px solid rgba(124,106,247,0.2)'}}>
                    <span className="text-xs mono font-bold" style={{color:'var(--accent)'}}>
                      ✨ AI 클렌징 제안 — {cleanseResults.length}개
                    </span>
                    <div className="flex gap-2">
                      <button onClick={applyAllCleanses}
                        className="px-3 py-1 rounded-lg text-xs mono font-bold"
                        style={{background:'var(--accent)',color:'white'}}>
                        전체 적용
                      </button>
                      <button onClick={() => setShowCleansePanel(false)}
                        style={{color:'var(--text3)',background:'none',border:'none',cursor:'pointer',fontSize:'16px'}}>×</button>
                    </div>
                  </div>
                  <div className="divide-y" style={{borderColor:'rgba(124,106,247,0.15)'}}>
                    {cleanseResults.map((r, i) => {
                      const p = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.low
                      const applied = appliedCleanses.has(r.n41Col)
                      return (
                        <div key={i} className="px-4 py-3 flex items-start gap-4"
                          style={{background: applied ? 'rgba(61,214,140,0.04)' : 'transparent'}}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs mono font-bold" style={{color:'var(--accent)'}}>{r.n41Col}</span>
                              <span className="text-xs mono px-1.5 py-0.5 rounded" style={{background:p.bg,color:p.color}}>{p.label}</span>
                              {applied && <span className="text-xs mono" style={{color:'var(--green)'}}>✓ 적용됨</span>}
                            </div>
                            <div className="text-xs mb-1" style={{color:'var(--text2)'}}>{r.reason}</div>
                            <div className="text-xs mono px-2 py-1 rounded inline-block"
                              style={{background:'var(--s2)',color:'var(--orange)',border:'1px solid var(--border)'}}>
                              {r.suggested_tf}
                            </div>
                          </div>
                          {!applied && (
                            <button onClick={() => applyOneCleanse(r.n41Col, r.suggested_tf)}
                              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs mono font-bold transition-all"
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

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  [evdData.length, lang==='ko'?'총 레코드':'Total Records'],
                  [activeCols.length, lang==='ko'?'활성 컬럼':'Active Cols'],
                  [uniqueCount, lang==='ko'?'고유 건수':'Unique Count'],
                ].map(([val, lbl]) => (
                  <div key={lbl} className="rounded-xl p-4 text-center" style={{background:'var(--s1)',border:'1px solid var(--border)'}}>
                    <div className="text-2xl font-bold mono" style={{color:'var(--accent)'}}>{val}</div>
                    <div className="text-xs mt-1" style={{color:'var(--text2)'}}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="rounded-xl overflow-hidden mb-4" style={{border:'1px solid var(--border)'}}>
                <div className="overflow-x-auto" style={{maxHeight:'280px'}}>
                  <table className="text-xs" style={{borderCollapse:'collapse',minWidth:'100%'}}>
                    <thead>
                      <tr style={{background:'var(--s2)',borderBottom:'1px solid var(--border)'}}>
                        {previewRows[0] && Object.keys(previewRows[0]).map(col => (
                          <th key={col} className="px-3 py-2 text-left mono whitespace-nowrap" style={{color:'var(--accent)'}}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} style={{borderBottom:'1px solid rgba(44,44,66,0.4)'}}>
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-1.5 mono whitespace-nowrap"
                              style={{color:'var(--text2)',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis'}}>
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {convertMsg && (
                <div className="mb-3 px-4 py-2 rounded-lg text-sm mono"
                  style={{
                    background: convertMsg.includes('오류') || convertMsg.includes('Error') ? 'rgba(247,108,108,0.1)' : 'rgba(61,214,140,0.1)',
                    color: convertMsg.includes('오류') || convertMsg.includes('Error') ? 'var(--red)' : 'var(--green)',
                    border: `1px solid ${convertMsg.includes('오류') || convertMsg.includes('Error') ? 'rgba(247,108,108,0.2)' : 'rgba(61,214,140,0.2)'}`,
                  }}>
                  {convertMsg}
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg text-sm mono transition-all"
                  style={{background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)'}}>
                  {T.converter.back}
                </button>
                <button onClick={handleConvert} disabled={converting}
                  className="px-6 py-2 rounded-lg text-sm mono font-bold transition-all"
                  style={{background:'var(--green)',color:'#0a1a10',opacity:converting?0.6:1}}>
                  {converting ? T.converter.converting : T.converter.convert}
                </button>
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
