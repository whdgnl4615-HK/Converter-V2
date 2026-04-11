import { useState, useRef } from 'react'
import { useLang } from '../contexts/LangContext'
import { useTemplates } from '../hooks/useTemplates'
import { parsePOPdf, convertPOToSORows } from '../lib/claudeApi'
import { downloadXlsx } from '../lib/converter'
import { CLOUD_COL_MAP } from '../lib/n41Schema'

// SO 컬럼 순서 (Cloud 기준)
const SO_COLS = Object.keys(CLOUD_COL_MAP.sales_order)

export default function PDFConverterPage() {
  const { lang } = useLang()
  const { templates, fetchTemplates, saveTemplate, getDefaultTemplate } = useTemplates('pdf_so')

  const [step, setStep]           = useState(1) // 1=upload 2=preview 3=done
  const [dragging, setDragging]   = useState(false)
  const [fileName, setFileName]   = useState('')
  const [parsing, setParsing]     = useState(false)
  const [parseErr, setParseErr]   = useState('')
  const [parsed, setParsed]       = useState(null)   // raw parsed PDF data
  const [rows, setRows]           = useState([])     // converted SO rows
  const [editRows, setEditRows]   = useState([])     // editable rows
  const [downloading, setDownloading] = useState(false)
  const [savedMsg, setSavedMsg]   = useState('')

  // Fixed values state (customer, division, warehouse 등)
  const [fixedVals, setFixedVals] = useState({
    customer:  '',
    division:  '',
    warehouse: '',
    type:      '',
    status:    '',
    season:    '',
  })

  const inputRef = useRef()

  async function handleFile(file) {
    if (!file.name.match(/\.pdf$/i)) {
      setParseErr('PDF 파일만 지원합니다.'); return
    }
    setParseErr('')
    setFileName(file.name)
    setParsing(true)
    setParsed(null)
    setRows([])
    try {
      const result = await parsePOPdf(file)
      setParsed(result)
      const converted = convertPOToSORows(result)
      setRows(converted)
      setEditRows(converted.map(r => ({ ...r })))
      setStep(2)
    } catch (e) {
      setParseErr('PDF 파싱 실패: ' + e.message)
    } finally {
      setParsing(false)
    }
  }

  // Apply fixed values to all rows
  function applyFixed() {
    setEditRows(prev => prev.map(r => ({
      ...r,
      ...Object.fromEntries(
        Object.entries(fixedVals).filter(([, v]) => v !== '')
      )
    })))
  }

  function updateCell(rowIdx, col, val) {
    setEditRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [col]: val } : r))
  }

  // Editable columns in preview
  const EDITABLE = ['customer','division','warehouse','type','status','season','shipVia','term','currency','style','color','size','quantity','price']
  // Key display columns
  const DISPLAY_COLS = ['orderNo','po','orderDate','startDate','cancelDate','style','color','size','quantity','price','currency','shipVia','term','customer','division','warehouse']

  async function handleDownload() {
    setDownloading(true)
    try {
      // Build mapping for downloadXlsx (all cols active)
      const mapping = {}
      SO_COLS.forEach(col => { mapping[col] = { src: col, tf: '', fixedVal: '' } })
      downloadXlsx(editRows, mapping, 'sales_order')
      setSavedMsg('✅ 다운로드 완료!')
      setStep(3)
    } catch (e) {
      setSavedMsg('❌ ' + e.message)
    } finally {
      setDownloading(false)
    }
  }

  const headerInfo = parsed?.header

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">📄</span>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>PDF PO → N41 Sales Order</div>
            <div className="text-xs mono" style={{ color: 'var(--text3)' }}>
              {lang === 'ko' ? 'PDF 발주서를 N41 SO Import 파일로 변환' : 'Convert vendor PO PDF to N41 SO import'}
            </div>
          </div>
        </div>

        {/* Step pills */}
        <div className="flex gap-1">
          {[
            [1, '① PDF 업로드'],
            [2, '② 데이터 확인'],
            [3, '③ 완료'],
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

        {step === 2 && (
          <button onClick={handleDownload} disabled={downloading}
            className="px-5 py-2 rounded-lg text-sm mono font-bold"
            style={{ background: 'var(--green)', color: 'white', opacity: downloading ? 0.7 : 1 }}>
            {downloading ? '생성 중…' : '⬇ N41 SO 다운로드'}
          </button>
        )}
        {step !== 2 && <div className="w-40" />}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-4"
          style={{ borderRight: '1px solid var(--border)', background: 'var(--s1)' }}>

          {/* Upload zone */}
          <div>
            <div className="text-xs mono uppercase mb-2" style={{ color: 'var(--text3)', letterSpacing: '1.5px' }}>
              PDF 발주서
            </div>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
              className="rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all py-6 px-4 text-center"
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : fileName ? 'var(--accent)' : 'var(--border2)'}`,
                background: dragging ? 'var(--accent-light)' : fileName ? 'var(--accent-light)' : 'var(--s2)',
                minHeight: 110,
              }}>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden"
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              {parsing ? (
                <>
                  <div className="text-2xl mb-1" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                  <div className="text-xs mono" style={{ color: 'var(--accent)' }}>AI가 PDF 분석 중…</div>
                </>
              ) : fileName ? (
                <>
                  <div className="text-2xl mb-1">✅</div>
                  <div className="text-xs mono font-bold truncate w-full" style={{ color: 'var(--accent)', maxWidth: 200 }}>{fileName}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>클릭해서 교체</div>
                </>
              ) : (
                <>
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-xs font-bold" style={{ color: 'var(--accent)' }}>PDF 업로드</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>드래그 또는 클릭</div>
                </>
              )}
            </div>
            {parseErr && (
              <div className="mt-2 text-xs mono p-2 rounded-lg" style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                {parseErr}
              </div>
            )}
          </div>

          {/* Parsed header info */}
          {headerInfo && (
            <div className="rounded-xl p-3" style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}>
              <div className="text-xs mono uppercase mb-2" style={{ color: 'var(--text3)', letterSpacing: '1px' }}>추출된 헤더 정보</div>
              {[
                ['PO#', headerInfo.poNo],
                ['주문일', headerInfo.orderDate],
                ['선적일', headerInfo.shipDate],
                ['취소일', headerInfo.cancelDate],
                ['결제조건', headerInfo.paymentTerms],
                ['통화', headerInfo.currency],
                ['배송방법', headerInfo.shipVia],
                ['바이어', headerInfo.customer],
                ['라인수', `${rows.length}개`],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span className="mono" style={{ color: 'var(--text3)' }}>{k}</span>
                  <span className="mono font-bold" style={{ color: 'var(--text)', maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              ) : null)}
            </div>
          )}

          {/* Fixed values */}
          {step >= 2 && (
            <div className="rounded-xl p-3" style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}>
              <div className="text-xs mono uppercase mb-2" style={{ color: 'var(--text3)', letterSpacing: '1px' }}>고정값 설정</div>
              {[
                ['customer', '고객 코드'],
                ['division', 'Division'],
                ['warehouse', 'Warehouse'],
                ['type', 'Order Type'],
                ['status', 'Status'],
                ['season', 'Season'],
              ].map(([field, label]) => (
                <div key={field} className="mb-2">
                  <div className="text-xs mb-0.5" style={{ color: 'var(--text3)' }}>{label}</div>
                  <input
                    value={fixedVals[field]}
                    onChange={e => setFixedVals(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full rounded-md px-2 py-1 text-xs mono outline-none"
                    style={{ background: 'var(--s1)', border: '1px solid var(--border2)', color: 'var(--text)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                  />
                </div>
              ))}
              <button onClick={applyFixed}
                className="w-full py-1.5 rounded-lg text-xs mono font-bold mt-1"
                style={{ background: 'var(--accent)', color: 'white' }}>
                전체 행에 적용
              </button>
            </div>
          )}

          {savedMsg && (
            <div className="text-xs mono p-2 rounded-lg text-center"
              style={{ color: savedMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)', background: savedMsg.startsWith('✅') ? 'var(--green-bg)' : 'var(--red-bg)' }}>
              {savedMsg}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 1 && (
            <div className="flex-1 flex items-center justify-center flex-col gap-4" style={{ color: 'var(--text3)' }}>
              <div className="text-5xl">📄</div>
              <div className="text-sm mono text-center">
                <div style={{ color: 'var(--text2)' }}>Urban Outfitters, Nordstrom 등</div>
                <div style={{ color: 'var(--text3)' }}>거래처 PO PDF를 업로드하면</div>
                <div style={{ color: 'var(--text3)' }}>AI가 데이터를 추출해요</div>
              </div>
              <div className="flex flex-col gap-2 mt-2 text-xs mono text-center" style={{ color: 'var(--text3)' }}>
                {['PO#, 날짜, 배송방법 자동 추출', 'Style, Color, Size, Qty 라인별 추출', '고정값 설정 후 N41 SO import 다운로드'].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span style={{ color: 'var(--green)' }}>✓</span> {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step >= 2 && editRows.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Table header info */}
              <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                style={{ background: 'var(--s2)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs mono font-bold" style={{ color: 'var(--text2)' }}>
                  📋 변환 결과 — {editRows.length}행 · 직접 수정 가능
                </span>
                <span className="text-xs mono" style={{ color: 'var(--text3)' }}>
                  표시 컬럼: {DISPLAY_COLS.length}개 (전체 {SO_COLS.length}개)
                </span>
              </div>

              {/* Editable table */}
              <div className="flex-1 overflow-auto">
                <table className="text-xs" style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr style={{ background: 'var(--s2)', borderBottom: '2px solid var(--border)' }}>
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text3)', minWidth: 36, background: 'var(--s2)' }}>#</th>
                      {DISPLAY_COLS.map(col => (
                        <th key={col} className="px-3 py-2 text-left mono whitespace-nowrap"
                          style={{ color: EDITABLE.includes(col) ? 'var(--accent)' : 'var(--text3)', background: 'var(--s2)', minWidth: 100 }}>
                          {col}
                          {EDITABLE.includes(col) && <span style={{ color: 'var(--orange)', fontSize: 8, marginLeft: 3 }}>✎</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--s1)' : 'var(--bg)' }}>
                        <td className="px-3 py-1 mono" style={{ color: 'var(--text3)' }}>{i + 1}</td>
                        {DISPLAY_COLS.map(col => (
                          <td key={col} className="px-1 py-1">
                            {EDITABLE.includes(col) ? (
                              <input
                                value={row[col] ?? ''}
                                onChange={e => updateCell(i, col, e.target.value)}
                                className="w-full rounded px-2 py-0.5 text-xs mono outline-none"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid transparent',
                                  color: 'var(--text)',
                                  minWidth: 80,
                                }}
                                onFocus={e => { e.target.style.background = 'var(--s1)'; e.target.style.borderColor = 'var(--accent)' }}
                                onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent' }}
                              />
                            ) : (
                              <span className="px-2 mono whitespace-nowrap" style={{ color: 'var(--text2)' }}>
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
              <div className="text-base font-bold" style={{ color: 'var(--text)' }}>N41 SO Import 파일 생성 완료!</div>
              <button onClick={() => { setStep(1); setFileName(''); setParsed(null); setRows([]); setEditRows([]); setSavedMsg('') }}
                className="px-5 py-2 rounded-lg text-sm mono font-bold"
                style={{ background: 'var(--accent)', color: 'white' }}>
                새 PDF 업로드
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
