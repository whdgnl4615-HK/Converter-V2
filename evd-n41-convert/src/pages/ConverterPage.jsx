import { useState, useEffect, useCallback } from 'react'
import { useLang } from '../contexts/LangContext'
import { useTemplates } from '../hooks/useTemplates'
import { MODULES, SCHEMAS, buildInitialMapping } from '../lib/n41Schema'
import { parseUploadedFile, getSourceColumns, convertRows, downloadXlsx, resolveValue } from '../lib/converter'
import MappingTable from '../components/mapping/MappingTable'
import TemplatePanel from '../components/mapping/TemplatePanel'

export default function ConverterPage({ module: moduleKey }) {
  const { T, lang } = useLang()
  const { templates, fetchTemplates, saveTemplate, deleteTemplate, setDefault, getDefaultTemplate } = useTemplates(moduleKey)

  const [step, setStep] = useState(1) // 1=upload 2=mapping 3=preview
  const [evdData, setEvdData] = useState([])
  const [sourceColumns, setSourceColumns] = useState([])
  const [mapping, setMapping] = useState(() => buildInitialMapping(moduleKey))
  const [dragging, setDragging] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertMsg, setConvertMsg] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTemplateName, setActiveTemplateName] = useState('')
  const [previewRows, setPreviewRows] = useState([])

  const moduleMeta = MODULES.find(m => m.key === moduleKey)
  const schema = SCHEMAS[moduleKey] || {}

  // Reset when module changes
  useEffect(() => {
    setStep(1); setEvdData([]); setSourceColumns([])
    setMapping(buildInitialMapping(moduleKey))
    setActiveTemplateName(''); setUploadErr(''); setConvertMsg('')
    fetchTemplates()
  }, [moduleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !activeTemplateName) {
      const def = getDefaultTemplate()
      if (def) { setMapping(def.mapping); setActiveTemplateName(def.name) }
    }
  }, [templates]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build preview when reaching step 3
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
      // Apply default template mapping if available
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
    const m = mappingOverride || mapping
    await saveTemplate(name, m)
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
    setConverting(true)
    setConvertMsg('')
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

  const activeCols = Object.keys(mapping).filter(c => mapping[c]?.src !== '')

  // Unique count: find the mapped source column for order/customer key fields
  const uniqueCount = (() => {
    if (!evdData.length) return 0
    // Try to use the mapped source for common key columns
    const keyFields = ['orderNo', 'poNo', 'customer', 'index']
    for (const field of keyFields) {
      const src = mapping[field]?.src
      if (src && src !== '__row_index__' && src !== '__fixed__' && !src.startsWith('__computed__')) {
        return new Set(evdData.map(r => r[src])).size
      }
    }
    // Fallback: count all rows as unique
    return evdData.length
  })()

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

        {/* Template button (step 2+) */}
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
        {/* Main area */}
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
                <button onClick={() => setStep(3)}
                  className="px-3 py-1.5 rounded-lg text-xs mono transition-all"
                  style={{border:'1px solid var(--border2)',color:'var(--text2)'}}>
                  {T.converter.refresh}
                </button>
              </div>

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
                            <td key={j} className="px-3 py-1.5 mono whitespace-nowrap" style={{color:'var(--text2)',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis'}}>
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
                onImport={() => {}} // handled inside TemplatePanel
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
