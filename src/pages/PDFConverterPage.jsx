import { useState, useRef, useEffect } from 'react'
import { useLang } from '../contexts/LangContext'
import { useTemplates } from '../hooks/useTemplates'
import { parsePOPdf, convertPOToSORows } from '../lib/claudeApi'
import { downloadXlsx } from '../lib/converter'
import { CLOUD_COL_MAP } from '../lib/n41Schema'

const SO_COLS = Object.keys(CLOUD_COL_MAP.sales_order)

const FIXED_FIELDS = [
  { key: 'customer',  label: '고객 코드',   placeholder: 'e.g. UO001' },
  { key: 'division',  label: 'Division',    placeholder: 'e.g. WOMEN' },
  { key: 'warehouse', label: 'Warehouse',   placeholder: 'e.g. LA' },
  { key: 'type',      label: 'Order Type',  placeholder: 'e.g. REGULAR' },
  { key: 'status',    label: 'Status',      placeholder: 'e.g. N' },
  { key: 'season',    label: 'Season',      placeholder: 'e.g. SS2026' },
]

const EDITABLE_COLS = ['customer','division','warehouse','type','status','season','shipVia','term','currency','style','color','size','quantity','price']
const DISPLAY_COLS  = ['orderNo','po','orderDate','startDate','cancelDate','style','color','size','quantity','price','currency','shipVia','term','customer','division','warehouse','status','season']

export default function PDFConverterPage() {
  const { lang } = useLang()
  const { templates, fetchTemplates, saveTemplate, deleteTemplate, setDefault, getDefaultTemplate } = useTemplates('pdf_so')

  const [step, setStep]         = useState(1)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing]   = useState(false)
  const [parseErr, setParseErr] = useState('')
  const [parsed, setParsed]     = useState(null)
  const [editRows, setEditRows] = useState([])
  const [downloading, setDownloading] = useState(false)
  const [msg, setMsg]           = useState('')

  // Fixed values
  const [fixedVals, setFixedVals] = useState({ customer:'', division:'', warehouse:'', type:'', status:'', season:'' })

  // Template UI
  const [showTemplates, setShowTemplates]     = useState(false)
  const [activeTemplate, setActiveTemplate]   = useState('')
  const [newTplName, setNewTplName]           = useState('')
  const [tplMsg, setTplMsg]                   = useState('')
  const [savingTpl, setSavingTpl]             = useState(false)

  const inputRef = useRef()

  // 시작 시 templates 로드
  useEffect(() => { fetchTemplates() }, []) // eslint-disable-line

  // 기본 템플릿 자동 적용
  useEffect(() => {
    if (templates.length > 0 && !activeTemplate) {
      const def = getDefaultTemplate()
      if (def) { applyTemplate(def, false) }
    }
  }, [templates]) // eslint-disable-line

  function applyTemplate(tpl, showMsg = true) {
    if (tpl.mapping) {
      setFixedVals(prev => ({ ...prev, ...tpl.mapping }))
    }
    setActiveTemplate(tpl.name)
    if (showMsg) setTplMsg(`✅ "${tpl.name}" 적용됨`)
    setTimeout(() => setTplMsg(''), 2000)
  }

  async function handleSaveTemplate() {
    if (!newTplName.trim()) { setTplMsg('이름을 입력하세요'); return }
    setSavingTpl(true)
    try {
      await saveTemplate(newTplName.trim(), fixedVals)
      setActiveTemplate(newTplName.trim())
      setNewTplName('')
      setTplMsg(`✅ "${newTplName.trim()}" 저장 완료`)
    } catch (e) {
      setTplMsg('❌ ' + e.message)
    } finally {
      setSavingTpl(false)
      setTimeout(() => setTplMsg(''), 2500)
    }
  }

  async function handleDeleteTemplate(id, name) {
    if (!confirm(`"${name}" 삭제할까요?`)) return
    try {
      await deleteTemplate(id)
      if (activeTemplate === name) setActiveTemplate('')
      setTplMsg('삭제됨')
      setTimeout(() => setTplMsg(''), 1500)
    } catch (e) { setTplMsg('❌ ' + e.message) }
  }

  async function handleSetDefault(id) {
    try {
      await setDefault(id)
      setTplMsg('✅ 기본값 설정됨')
      setTimeout(() => setTplMsg(''), 1500)
    } catch (e) { setTplMsg('❌ ' + e.message) }
  }

  // PDF 업로드 & 파싱
  async function handleFile(file) {
    if (!file.name.match(/\.pdf$/i)) { setParseErr('PDF 파일만 지원합니다.'); return }
    setParseErr(''); setFileName(file.name); setParsing(true); setParsed(null); setEditRows([])
    try {
      const result = await parsePOPdf(file)
      setParsed(result)
      const converted = convertPOToSORows(result)
      // 고정값 자동 적용
      const withFixed = converted.map(r => ({
        ...r,
        ...Object.fromEntries(Object.entries(fixedVals).filter(([, v]) => v !== ''))
      }))
      setEditRows(withFixed)
      setStep(2)
    } catch (e) {
      setParseErr('PDF 파싱 실패: ' + e.message)
    } finally { setParsing(false) }
  }

  // 고정값 전체 행 적용
  function applyFixed() {
    setEditRows(prev => prev.map(r => ({
      ...r,
      ...Object.fromEntries(Object.entries(fixedVals).filter(([, v]) => v !== ''))
    })))
    setMsg('✅ 적용됨')
    setTimeout(() => setMsg(''), 1500)
  }

  function updateCell(rowIdx, col, val) {
    setEditRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [col]: val } : r))
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const mapping = {}
      SO_COLS.forEach(col => { mapping[col] = { src: col, tf: '', fixedVal: '' } })
      downloadXlsx(editRows, mapping, 'sales_order')
      setMsg('✅ 다운로드 완료!')
      setStep(3)
    } catch (e) { setMsg('❌ ' + e.message) }
    finally { setDownloading(false) }
  }

  function resetAll() {
    setStep(1); setFileName(''); setParsed(null); setEditRows([]); setMsg(''); setParseErr('')
  }

  const headerInfo = parsed?.header

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background:'var(--s1)', borderBottom:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">📄</span>
          <div>
            <div className="font-semibold text-sm" style={{ color:'var(--text)' }}>PDF PO → N41 Sales Order</div>
            {activeTemplate && (
              <div className="text-xs mono" style={{ color:'var(--accent)' }}>📋 {activeTemplate}</div>
            )}
          </div>
        </div>
        {/* Step pills */}
        <div className="flex gap-1">
          {[[1,'① PDF 업로드'],[2,'② 데이터 확인'],[3,'③ 완료']].map(([n,label]) => (
            <div key={n} className="px-3 py-1 rounded-full text-xs mono"
              style={{
                background: step===n ? 'var(--accent-glow)' : step>n ? 'rgba(22,163,74,0.08)' : 'transparent',
                color: step===n ? 'var(--accent)' : step>n ? 'var(--green)' : 'var(--text3)',
                border: `1px solid ${step===n ? 'var(--accent)' : step>n ? 'var(--green)' : 'var(--border)'}`,
              }}>{label}</div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Template 버튼 */}
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="px-3 py-1.5 rounded-lg text-xs mono transition-all"
            style={{
              background: showTemplates ? 'var(--accent-glow)' : 'transparent',
              color: showTemplates ? 'var(--accent)' : 'var(--text2)',
              border: `1px solid ${showTemplates ? 'var(--accent)' : 'var(--border2)'}`,
            }}>
            📋 템플릿
          </button>
          {step === 2 && (
            <button onClick={handleDownload} disabled={downloading}
              className="px-5 py-2 rounded-lg text-sm mono font-bold"
              style={{ background:'var(--green)', color:'white', opacity:downloading?0.7:1 }}>
              {downloading ? '생성 중…' : '⬇ N41 SO 다운로드'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-4"
          style={{ borderRight:'1px solid var(--border)', background:'var(--s1)' }}>

          {/* Upload zone */}
          <div>
            <div className="text-xs mono uppercase mb-2" style={{ color:'var(--text3)', letterSpacing:'1.5px' }}>
              PDF 발주서
            </div>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
              className="rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all py-5 px-4 text-center"
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : fileName ? 'var(--accent)' : 'var(--border2)'}`,
                background: dragging || fileName ? 'var(--accent-light)' : 'var(--s2)',
                minHeight: 100,
              }}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden"
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              {parsing ? (
                <>
                  <div className="text-2xl mb-1" style={{ display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</div>
                  <div className="text-xs mono" style={{ color:'var(--accent)' }}>AI 분석 중…</div>
                </>
              ) : fileName ? (
                <>
                  <div className="text-xl mb-1">✅</div>
                  <div className="text-xs mono font-bold truncate" style={{ color:'var(--accent)', maxWidth:180 }}>{fileName}</div>
                  <div className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>클릭해서 교체</div>
                </>
              ) : (
                <>
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-xs font-bold" style={{ color:'var(--accent)' }}>PDF 업로드</div>
                  <div className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>드래그 또는 클릭</div>
                </>
              )}
            </div>
            {parseErr && (
              <div className="mt-2 text-xs mono p-2 rounded-lg"
                style={{ background:'var(--red-bg)', color:'var(--red)', border:'1px solid rgba(220,38,38,0.2)' }}>
                {parseErr}
              </div>
            )}
          </div>

          {/* 추출된 헤더 정보 */}
          {headerInfo && (
            <div className="rounded-xl p-3" style={{ background:'var(--s2)', border:'1px solid var(--border)' }}>
              <div className="text-xs mono uppercase mb-2" style={{ color:'var(--text3)', letterSpacing:'1px' }}>추출된 정보</div>
              {[
                ['PO#', headerInfo.poNo],
                ['바이어', headerInfo.customer],
                ['주문일', headerInfo.orderDate],
                ['선적일', headerInfo.shipDate],
                ['취소일', headerInfo.cancelDate],
                ['결제조건', headerInfo.paymentTerms],
                ['통화', headerInfo.currency],
                ['배송방법', headerInfo.shipVia],
                ['라인수', `${editRows.length}개`],
              ].map(([k,v]) => v ? (
                <div key={k} className="flex justify-between text-xs mb-1 gap-2">
                  <span className="mono flex-shrink-0" style={{ color:'var(--text3)' }}>{k}</span>
                  <span className="mono font-bold text-right truncate" style={{ color:'var(--text)' }}>{v}</span>
                </div>
              ) : null)}
            </div>
          )}

          {/* 고정값 설정 */}
          <div className="rounded-xl p-3" style={{ background:'var(--s2)', border:'1px solid var(--border)' }}>
            <div className="text-xs mono uppercase mb-2" style={{ color:'var(--text3)', letterSpacing:'1px' }}>
              고정값 설정
            </div>
            {FIXED_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="mb-2">
                <div className="text-xs mb-0.5 flex items-center justify-between">
                  <span style={{ color:'var(--text3)' }}>{label}</span>
                  {fixedVals[key] && (
                    <span className="text-xs mono px-1 rounded" style={{ background:'var(--accent-light)', color:'var(--accent)' }}>
                      설정됨
                    </span>
                  )}
                </div>
                <input
                  value={fixedVals[key]}
                  onChange={e => setFixedVals(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-md px-2 py-1.5 text-xs mono outline-none"
                  style={{ background:'var(--s1)', border:'1px solid var(--border2)', color:'var(--text)' }}
                  onFocus={e => e.target.style.borderColor='var(--accent)'}
                  onBlur={e => e.target.style.borderColor='var(--border2)'}
                />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={applyFixed}
                className="flex-1 py-1.5 rounded-lg text-xs mono font-bold"
                style={{ background:'var(--accent)', color:'white' }}>
                전체 행 적용
              </button>
            </div>
            {msg && (
              <div className="mt-2 text-xs mono text-center"
                style={{ color: msg.startsWith('❌') ? 'var(--red)' : 'var(--green)' }}>
                {msg}
              </div>
            )}
          </div>

          {/* 템플릿 저장 */}
          <div className="rounded-xl p-3" style={{ background:'var(--s2)', border:'1px solid var(--border)' }}>
            <div className="text-xs mono uppercase mb-2" style={{ color:'var(--text3)', letterSpacing:'1px' }}>
              템플릿 저장
            </div>
            <input
              value={newTplName}
              onChange={e => setNewTplName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              placeholder="거래처명 (e.g. Urban Outfitters)"
              className="w-full rounded-md px-2 py-1.5 text-xs mono outline-none mb-2"
              style={{ background:'var(--s1)', border:'1px solid var(--border2)', color:'var(--text)' }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--border2)'}
            />
            <button onClick={handleSaveTemplate} disabled={savingTpl}
              className="w-full py-1.5 rounded-lg text-xs mono font-bold"
              style={{ background:'var(--s1)', border:'1px solid var(--accent)', color:'var(--accent)', opacity:savingTpl?0.6:1 }}>
              {savingTpl ? '저장 중…' : '💾 현재 고정값 저장'}
            </button>
            {tplMsg && (
              <div className="mt-1.5 text-xs mono text-center"
                style={{ color: tplMsg.startsWith('❌') ? 'var(--red)' : 'var(--green)' }}>
                {tplMsg}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Template sidebar overlay */}
          {showTemplates && (
            <div className="flex-shrink-0 border-b p-4" style={{ borderColor:'var(--border)', background:'var(--s2)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs mono font-bold uppercase" style={{ color:'var(--text2)', letterSpacing:'1.5px' }}>
                  저장된 템플릿
                </span>
                <button onClick={() => setShowTemplates(false)}
                  style={{ color:'var(--text3)', background:'none', border:'none', cursor:'pointer', fontSize:18 }}>×</button>
              </div>
              {templates.length === 0 ? (
                <div className="text-xs mono text-center py-3" style={{ color:'var(--text3)' }}>
                  저장된 템플릿이 없어요
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {templates.map(tpl => (
                    <div key={tpl.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{
                        background: activeTemplate === tpl.name ? 'var(--accent-light)' : 'var(--s1)',
                        border: `1px solid ${activeTemplate === tpl.name ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      {tpl.is_default && <span className="text-xs" style={{ color:'var(--orange)' }}>★</span>}
                      <button onClick={() => applyTemplate(tpl)}
                        className="text-xs mono font-bold"
                        style={{ color: activeTemplate === tpl.name ? 'var(--accent)' : 'var(--text)', background:'none', border:'none', cursor:'pointer' }}>
                        {tpl.name}
                      </button>
                      <button onClick={() => handleSetDefault(tpl.id)} title="기본값 설정"
                        className="text-xs" style={{ color:'var(--text3)', background:'none', border:'none', cursor:'pointer' }}>★</button>
                      <button onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        className="text-xs" style={{ color:'var(--red)', background:'none', border:'none', cursor:'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex items-center justify-center flex-col gap-4" style={{ color:'var(--text3)' }}>
              <div className="text-5xl">📄</div>
              <div className="text-sm mono text-center">
                <div style={{ color:'var(--text2)' }}>거래처 PO PDF 업로드</div>
                <div className="mt-1" style={{ color:'var(--text3)' }}>AI가 자동으로 데이터를 추출해요</div>
              </div>
              <div className="flex flex-col gap-1.5 mt-2 text-xs mono" style={{ color:'var(--text3)' }}>
                {['PO#, 날짜, 배송방법 자동 추출','Style, Color, Size, Qty 라인별 추출','고정값 템플릿으로 거래처별 저장'].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span style={{ color:'var(--green)' }}>✓</span>{t}
                  </div>
                ))}
              </div>
              {templates.length > 0 && (
                <div className="mt-2 px-4 py-2 rounded-lg text-xs mono"
                  style={{ background:'var(--accent-light)', border:'1px solid var(--accent)', color:'var(--accent)' }}>
                  📋 {activeTemplate || `${templates.length}개 템플릿 저장됨`} — PDF 업로드하면 자동 적용
                </div>
              )}
            </div>
          )}

          {step >= 2 && editRows.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                style={{ background:'var(--s2)', borderBottom:'1px solid var(--border)' }}>
                <span className="text-xs mono font-bold" style={{ color:'var(--text2)' }}>
                  변환 결과 — {editRows.length}행 <span style={{ color:'var(--orange)' }}>✎ 직접 수정 가능</span>
                </span>
                <span className="text-xs mono" style={{ color:'var(--text3)' }}>
                  {DISPLAY_COLS.length}개 컬럼 표시 / 전체 {SO_COLS.length}개
                </span>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="text-xs" style={{ borderCollapse:'collapse', minWidth:'100%' }}>
                  <thead style={{ position:'sticky', top:0, zIndex:5 }}>
                    <tr style={{ background:'var(--s2)', borderBottom:'2px solid var(--border)' }}>
                      <th className="px-3 py-2 text-left mono" style={{ color:'var(--text3)', minWidth:36, background:'var(--s2)' }}>#</th>
                      {DISPLAY_COLS.map(col => (
                        <th key={col} className="px-3 py-2 text-left mono whitespace-nowrap"
                          style={{
                            color: EDITABLE_COLS.includes(col) ? 'var(--accent)' : 'var(--text3)',
                            background: 'var(--s2)', minWidth:100
                          }}>
                          {col}
                          {EDITABLE_COLS.includes(col) && <span style={{ color:'var(--orange)', fontSize:8, marginLeft:3 }}>✎</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: i%2===0 ? 'var(--s1)' : 'var(--bg)' }}>
                        <td className="px-3 py-1 mono" style={{ color:'var(--text3)' }}>{i+1}</td>
                        {DISPLAY_COLS.map(col => (
                          <td key={col} className="px-1 py-0.5">
                            {EDITABLE_COLS.includes(col) ? (
                              <input
                                value={row[col] ?? ''}
                                onChange={e => updateCell(i, col, e.target.value)}
                                className="w-full rounded px-2 py-0.5 text-xs mono outline-none"
                                style={{ background:'transparent', border:'1px solid transparent', color:'var(--text)', minWidth:80 }}
                                onFocus={e => { e.target.style.background='var(--s1)'; e.target.style.borderColor='var(--accent)' }}
                                onBlur={e => { e.target.style.background='transparent'; e.target.style.borderColor='transparent' }}
                              />
                            ) : (
                              <span className="px-2 mono whitespace-nowrap" style={{ color:'var(--text2)' }}>
                                {row[col] ?? ''}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
              <div className="text-5xl">🎉</div>
              <div className="text-base font-bold" style={{ color:'var(--text)' }}>N41 SO Import 파일 완료!</div>
              <button onClick={resetAll}
                className="px-5 py-2 rounded-lg text-sm mono font-bold"
                style={{ background:'var(--accent)', color:'white' }}>
                새 PDF 업로드
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}
