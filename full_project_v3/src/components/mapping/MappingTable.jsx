import { useState } from 'react'
import { useLang } from '../../contexts/LangContext'
import { SCHEMAS } from '../../lib/n41Schema'
import { suggestMappings } from '../../lib/claudeApi'

const TAG = {
  auto:     { label: 'AUTO',  style: {background:'rgba(22,163,74,0.10)',color:'var(--green)'} },
  computed: { label: 'CALC',  style: {background:'rgba(37,99,235,0.08)',color:'var(--blue)'} },
  fixed:    { label: 'FIXED', style: {background:'rgba(217,119,6,0.10)',color:'var(--orange)'} },
  skip:     { label: 'SKIP',  style: {background:'rgba(255,255,255,0.04)',color:'var(--text3)'} },
  ai:       { label: 'AI',    style: {background:'var(--accent-glow)',color:'var(--accent)'} },
}

function getTag(src) {
  if (!src) return TAG.skip
  if (src === '__row_index__') return TAG.auto
  if (src.startsWith('__computed__')) return TAG.computed
  if (src === '__fixed__') return TAG.fixed
  return TAG.auto
}

export default function MappingTable({ moduleKey, mapping, sourceColumns, onMappingChange, evdData }) {
  const { T, lang } = useLang()
  const schema = SCHEMAS[moduleKey] || {}
  const n41Cols = Object.keys(schema)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg]         = useState('')
  const [aiSuggestions, setAiSuggestions] = useState({}) // n41col → suggested src
  const [appliedCols, setAppliedCols]     = useState(new Set())

  const computedOpts = [
    { v: '__computed__color',  l: lang==='ko' ? '[계산] Color Code (없으면 Color)' : '[Computed] Color Code (fallback Color)' },
    { v: '__computed__shipTo', l: lang==='ko' ? '[계산] 배송지 주소 합치기' : '[Computed] Concat shipping address' },
    { v: '__computed__billTo', l: lang==='ko' ? '[계산] 청구지 주소 합치기' : '[Computed] Concat billing address' },
  ]

  function update(col, field, val) {
    onMappingChange(col, { ...mapping[col], [field]: val })
  }

  function onSrcChange(col, val) {
    const cur = mapping[col] || {}
    onMappingChange(col, { ...cur, src: val, fixedVal: cur.fixedVal || '', tf: cur.tf || '' })
    // clear AI suggestion for this col if manually changed
    setAiSuggestions(prev => { const n = {...prev}; delete n[col]; return n })
  }

  // ── AI Mapping Suggest ──
  async function handleAISuggest() {
    if (!sourceColumns.length) return
    setAiLoading(true)
    setAiMsg('')
    setAiSuggestions({})
    try {
      const suggestions = await suggestMappings(moduleKey, sourceColumns, schema)
      // Only keep suggestions where source col actually exists
      const valid = {}
      for (const [n41Col, srcCol] of Object.entries(suggestions)) {
        if (srcCol && sourceColumns.includes(srcCol) && n41Cols.includes(n41Col)) {
          valid[n41Col] = srcCol
        }
      }
      setAiSuggestions(valid)
      const count = Object.keys(valid).length
      setAiMsg(`✨ ${count}개 컬럼 매핑 제안됨 — 확인 후 적용하세요`)
    } catch (e) {
      setAiMsg('❌ AI 오류: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function applyOneSuggestion(col) {
    const src = aiSuggestions[col]
    if (!src) return
    onMappingChange(col, { ...mapping[col], src, fixedVal: '', tf: mapping[col]?.tf || '' })
    setAppliedCols(prev => new Set([...prev, col]))
  }

  function applyAllSuggestions() {
    for (const [col, src] of Object.entries(aiSuggestions)) {
      onMappingChange(col, { ...mapping[col], src, fixedVal: '', tf: mapping[col]?.tf || '' })
    }
    setAppliedCols(new Set(Object.keys(aiSuggestions)))
    setAiMsg(`✅ ${Object.keys(aiSuggestions).length}개 전체 적용 완료`)
  }

  // Sample value for a column
  function getSample(col) {
    const src = mapping[col]?.src
    if (!src || src.startsWith('__') || !evdData?.length) return '—'
    const val = evdData[0]?.[src]
    return val !== undefined && val !== '' ? String(val).slice(0, 30) : '—'
  }

  const hasSuggestions = Object.keys(aiSuggestions).length > 0

  return (
    <div>
      {/* AI Suggest Bar */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <button onClick={handleAISuggest} disabled={aiLoading || !sourceColumns.length}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs mono font-bold transition-all"
          style={{
            background: aiLoading ? 'var(--s2)' : 'var(--accent-glow)',
            border: '1px solid var(--accent)',
            color: aiLoading ? 'var(--text3)' : 'var(--accent)',
            cursor: aiLoading ? 'wait' : 'pointer',
          }}>
          {aiLoading ? (
            <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⟳</span> AI 분석 중…</>
          ) : (
            <>✨ AI 매핑 제안</>
          )}
        </button>

        {hasSuggestions && (
          <button onClick={applyAllSuggestions}
            className="px-3 py-2 rounded-lg text-xs mono font-bold transition-all"
            style={{background:'var(--accent)',color:'white'}}>
            전체 적용 ({Object.keys(aiSuggestions).length}개)
          </button>
        )}

        {aiMsg && (
          <span className="text-xs mono" style={{color: aiMsg.startsWith('❌') ? 'var(--red)' : 'var(--green)'}}>
            {aiMsg}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--border)',background:'var(--s1)'}}>
        {/* Header */}
        <div className="grid text-xs mono uppercase px-4 py-2.5" style={{
          gridTemplateColumns:'160px 220px 200px 1fr',
          background:'var(--s2)',
          borderBottom:'1px solid var(--border)',
          color:'var(--text2)',
          letterSpacing:'1px'
        }}>
          <span>{T.converter.n41Col}</span>
          <span>{T.converter.sourceCol}</span>
          <span>{T.converter.transform}</span>
          <span>{T.converter.sample}</span>
        </div>

        {/* Rows */}
        <div>
          {n41Cols.map((col, i) => {
            const def = schema[col] || {}
            const cur = mapping[col] || { src: '', tf: '', fixedVal: '' }
            const tag = getTag(cur.src)
            const showFixed = cur.src === '__fixed__'
            const showTf = cur.src && cur.src !== '__fixed__' && cur.src !== '__row_index__' && !cur.src.startsWith('__computed__')
            const suggestion = aiSuggestions[col]
            const isApplied  = appliedCols.has(col)
            const sample     = getSample(col)

            return (
              <div key={col} className="grid items-start px-4 py-2"
                style={{
                  gridTemplateColumns:'160px 220px 200px 1fr',
                  borderBottom: i < n41Cols.length - 1 ? '1px solid var(--border)' : 'none',
                  background: suggestion && !isApplied ? 'rgba(79,99,210,0.04)' : 'transparent',
                }}>

                {/* N41 col */}
                <div className="pt-1.5">
                  <div className="text-xs mono font-bold" style={{color:'var(--accent)'}}>{col}</div>
                  <div className="text-xs mt-0.5" style={{color:'var(--text3)'}}>
                    {lang === 'ko' ? def.ko : def.en}
                  </div>
                </div>

                {/* Source */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs mono font-bold px-1.5 py-0.5 rounded" style={tag.style}>
                      {tag.label}
                    </span>
                  </div>
                  <select value={cur.src || ''} onChange={e => onSrcChange(col, e.target.value)}
                    className="w-full rounded-md px-2 py-1.5 text-xs mono outline-none"
                    style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text)'}}>
                    <optgroup label={lang==='ko'?'특수':'Special'}>
                      <option value="">{T.converter.skip}</option>
                      <option value="__row_index__">{T.converter.rowIndex}</option>
                    </optgroup>
                    <optgroup label={lang==='ko'?'계산값':'Computed'}>
                      {computedOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </optgroup>
                    <optgroup label={lang==='ko'?'고정값':'Fixed Value'}>
                      <option value="__fixed__">{T.converter.fixedVal}</option>
                    </optgroup>
                    <optgroup label={lang==='ko'?'소스 컬럼':'Source Columns'}>
                      {sourceColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>

                  {showFixed && (
                    <input value={cur.fixedVal || ''} onChange={e => update(col,'fixedVal',e.target.value)}
                      placeholder={T.converter.fixedPlaceholder}
                      className="w-full rounded-md px-2 py-1.5 text-xs mono outline-none mt-1"
                      style={{background:'var(--s3)',border:'1px solid var(--border)',color:'var(--orange)'}}
                    />
                  )}

                  {/* AI Suggestion badge */}
                  {suggestion && !isApplied && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-xs mono px-1.5 py-0.5 rounded"
                        style={{background:'var(--accent-glow)',color:'var(--accent)',border:'1px solid rgba(124,106,247,0.3)'}}>
                        ✨ AI: {suggestion}
                      </span>
                      <button onClick={() => applyOneSuggestion(col)}
                        className="text-xs mono px-2 py-0.5 rounded transition-all"
                        style={{background:'var(--accent)',color:'white'}}>
                        적용
                      </button>
                    </div>
                  )}
                  {isApplied && (
                    <div className="mt-1 text-xs mono" style={{color:'var(--green)'}}>✓ AI 적용됨</div>
                  )}
                </div>

                {/* Transform */}
                <div>
                  {showTf && (
                    <>
                      <input value={cur.tf || ''} onChange={e => update(col,'tf',e.target.value)}
                        placeholder={T.converter.tfPlaceholder}
                        className="w-full rounded-md px-2 py-1.5 text-xs mono outline-none"
                        style={{background:'var(--s3)',border:'1px solid var(--border)',color:'var(--orange)'}}
                      />
                      <div className="text-xs mt-1 leading-relaxed" style={{color:'var(--text3)',fontFamily:'monospace',fontSize:'10px'}}>
                        date:MM/DD/YYYY · upper · lower<br/>
                        strip_special · no_space<br/>
                        truncate:20 · prefix:WH-<br/>
                        map:A=X,B=Y · replace:old|new<br/>
                        <span style={{color:'var(--accent)'}}>체이닝: strip_special | upper | truncate:20</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Sample */}
                <div className="pt-1.5 overflow-hidden">
                  <span className="text-xs mono block" style={{color:'var(--text2)',wordBreak:'break-all'}}>
                    {sample}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
