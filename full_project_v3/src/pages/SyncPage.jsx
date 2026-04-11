import { useState, useRef } from 'react'
import { useLang } from '../contexts/LangContext'
import { processSyncCommand } from '../lib/claudeApi'
import { applyTransforms } from '../lib/converter'

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = {
  fashiongo: {
    id: 'fashiongo',
    label: 'FashionGo',
    icon: '🛍️',
    color: 'var(--blue)',
    colorBg: 'rgba(37,99,235,0.06)',
    colorBorder: 'rgba(37,99,235,0.20)',
    keyCol: 'Vendor Style Number',
    colorCol: 'Color/Scent',
    sizeCol: 'Size',
    packCol: 'Pack',
    altKeyCols: ['Style Number', 'Product ID'],
  },
  shopify: {
    id: 'shopify',
    label: 'Shopify',
    icon: '🛒',
    color: 'var(--green)',
    colorBg: 'rgba(22,163,74,0.08)',
    colorBorder: 'rgba(61,214,140,0.25)',
    keyCol: 'Variant SKU',
    colorCol: 'Option1 Value',
    sizeCol: 'Option2 Value',
    packCol: null,
    altKeyCols: ['Handle', 'Title'],
  },
}

// Size abbreviation expansion: SML → S, M, L
const SIZE_ABBREV = {
  SML:     ['S', 'M', 'L'],
  SMLXL:   ['S', 'M', 'L', 'XL'],
  SMXL:    ['S', 'M', 'XL'],
  XSS:     ['XS', 'S'],
  'XS-S':  ['XS', 'S'],
  XSSML:   ['XS', 'S', 'M', 'L'],
  'XS-XL': ['XS', 'S', 'M', 'L', 'XL'],
  '2XL':   ['2XL'],
  '2-4-6': ['2', '4', '6'],
  '4-6-8': ['4', '6', '8'],
  '6-8-10':['6', '8', '10'],
  '8-10-12':['8', '10', '12'],
  '10-12-14':['10', '12', '14'],
}

function expandSizecat(sizecat) {
  if (!sizecat) return []
  const s = String(sizecat).trim().toUpperCase()
  if (SIZE_ABBREV[s]) return SIZE_ABBREV[s]
  // Try splitting by common delimiters
  if (s.includes('/')) return s.split('/').map(x => x.trim())
  if (s.includes(',')) return s.split(',').map(x => x.trim())
  if (s.includes('-') && s.length <= 12) return s.split('-').map(x => x.trim())
  return [s]
}

// ─── File Parser (uses SheetJS from CDN via dynamic import in browser) ────────
async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx')
        if (file.name.match(/\.csv$/i)) {
          const text = new TextDecoder().decode(e.target.result)
          const wb = XLSX.read(text, { type: 'string' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }))
        } else {
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
          const ws = wb.Sheets[wb.SheetNames[0]]
          // Check if row 1 is col widths (numbers), row 2 is actual headers
          const firstRow = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 })[0] || []
          const isWidthRow = firstRow.every(v => v === null || v === '' || typeof v === 'number')
          if (isWidthRow) {
            const data = XLSX.utils.sheet_to_json(ws, { defval: '', range: 1 })
            resolve(data.map(row => {
              const cleaned = {}
              for (const [k, v] of Object.entries(row)) {
                cleaned[String(k).trim()] = v
              }
              return cleaned
            }))
          } else {
            resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }))
          }
        }
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── N41 Parser ───────────────────────────────────────────────────────────────
// Returns Map: styleKey → { style, color, sizeCat, bundle, price1, descript, ... }
function parseN41(rows) {
  // Detect cloud vs desktop by checking for 'sizeCat' vs 'Sizecat'
  const sample = rows[0] || {}
  const isCloud = 'sizeCat' in sample
  const styleCol   = isCloud ? 'style'   : 'style'
  const colorCol   = isCloud ? 'color'   : 'color'
  const sizecatCol = isCloud ? 'sizeCat' : 'Sizecat'
  const bundleCol  = isCloud ? 'bundle'  : 'bundle'
  const price1Col  = isCloud ? 'price1'  : 'Price1'
  const descriptCol= isCloud ? 'descript': 'Descript'

  const map = new Map()
  for (const row of rows) {
    const style = String(row[styleCol] || '').trim().toUpperCase()
    const color = String(row[colorCol] || '').trim().toUpperCase()
    if (!style) continue
    const key = `${style}||${color}`
    if (!map.has(key)) {
      map.set(key, {
        style,
        color,
        sizeCat: String(row[sizecatCol] || '').trim(),
        bundle:  String(row[bundleCol]  || '').trim(),
        price1:  String(row[price1Col]  || '').trim(),
        descript:String(row[descriptCol]|| '').trim(),
        _raw: row,
      })
    }
  }
  return map
}

// ─── FashionGo Diff Engine ────────────────────────────────────────────────────
function diffFashionGo(fgRows, n41Map) {
  const results = []
  for (const row of fgRows) {
    const vendorStyle = String(row['Vendor Style Number'] || row['Style Number'] || '').trim().toUpperCase()
    const fgColor     = String(row['Color/Scent'] || '').trim().toUpperCase()
    const fgSize      = String(row['Size']  || '').trim().toUpperCase()
    const fgPack      = String(row['Pack']  || '').trim()

    if (!vendorStyle && !fgColor) continue

    // Try to match by style+color, then style only
    const exactKey = `${vendorStyle}||${fgColor}`
    let n41 = n41Map.get(exactKey)

    // If no exact match, try to find any N41 row with this style
    if (!n41) {
      for (const [k, v] of n41Map) {
        if (k.startsWith(vendorStyle + '||')) { n41 = v; break }
      }
    }

    const diffs = []

    if (!n41) {
      diffs.push({ field: 'style', label: 'Style#', fgVal: vendorStyle, n41Val: '—', status: 'missing' })
    } else {
      // Color diff
      const n41Colors = n41.color.split(/[,/]/).map(c => c.trim()).filter(Boolean)
      const fgColors  = fgColor.split(/[,/]/).map(c => c.trim()).filter(Boolean)
      const colorMissing = fgColors.filter(c => !n41Colors.some(nc => nc === c))
      const colorExtra   = n41Colors.filter(c => !fgColors.some(fc => fc === c))
      if (colorMissing.length || colorExtra.length) {
        diffs.push({ field: 'color', label: 'Color', fgVal: fgColor, n41Val: n41.color, status: 'diff',
          fix: n41.color })
      }

      // Size diff
      const n41Sizes = expandSizecat(n41.sizeCat)
      const fgSizes  = fgSize.split(/[,/\s]+/).map(s => s.trim()).filter(Boolean)
      const sizeMissing = fgSizes.filter(s => !n41Sizes.some(ns => ns.toUpperCase() === s.toUpperCase()))
      const sizeExtra   = n41Sizes.filter(s => !fgSizes.some(fs => fs.toUpperCase() === s.toUpperCase()))
      if (sizeMissing.length || sizeExtra.length) {
        diffs.push({ field: 'size', label: 'Size', fgVal: fgSize, n41Val: n41Sizes.join(', '), status: 'diff',
          fix: n41Sizes.join(', ') })
      }

      // Bundle/Pack diff
      if (n41.bundle && fgPack) {
        const n41Pack = String(n41.bundle).replace(/[^0-9]/g, '')
        const fgPackNum = String(fgPack).replace(/[^0-9]/g, '')
        if (n41Pack && fgPackNum && n41Pack !== fgPackNum) {
          diffs.push({ field: 'pack', label: 'Pack', fgVal: fgPack, n41Val: n41.bundle, status: 'diff',
            fix: n41.bundle })
        }
      }
    }

    results.push({
      _row: row,
      _idx: results.length,
      vendorStyle,
      fgColor,
      fgSize,
      fgPack,
      n41: n41 || null,
      diffs,
      status: !n41 ? 'missing' : diffs.length > 0 ? 'diff' : 'ok',
      accepted: false,
    })
  }
  return results
}

// ─── Shopify SKU parser ───────────────────────────────────────────────────────
// SKU format: STYLE-COLOR-SIZE (open pack) or STYLE-COLOR (prepack)
function parseShopifySKU(sku) {
  if (!sku) return null
  const parts = String(sku).trim().split('-')
  if (parts.length >= 3) return { style: parts[0], color: parts[1], size: parts.slice(2).join('-'), isPrepack: false }
  if (parts.length === 2) return { style: parts[0], color: parts[1], size: null, isPrepack: true }
  return { style: parts[0], color: null, size: null, isPrepack: false }
}

// ─── Shopify Diff Engine ──────────────────────────────────────────────────────
function diffShopify(shopifyRows, n41Map) {
  const results = []
  for (const row of shopifyRows) {
    const sku       = String(row['Variant SKU'] || '').trim()
    const opt1Name  = String(row['Option1 Name'] || '').trim()
    const opt1Val   = String(row['Option1 Value'] || '').trim().toUpperCase()
    const opt2Name  = String(row['Option2 Name'] || '').trim()
    const opt2Val   = String(row['Option2 Value'] || '').trim().toUpperCase()

    if (!sku && !opt1Val) continue

    const parsed = parseShopifySKU(sku)
    if (!parsed) continue

    const style = parsed.style.toUpperCase()
    const colorFromSKU = parsed.color ? parsed.color.toUpperCase() : ''
    const sizeFromSKU  = parsed.size  ? parsed.size.toUpperCase()  : ''

    // Find N41 match
    const exactKey = `${style}||${colorFromSKU}`
    let n41 = n41Map.get(exactKey)
    if (!n41) {
      for (const [k, v] of n41Map) {
        if (k.startsWith(style + '||')) { n41 = v; break }
      }
    }

    const diffs = []

    if (!n41) {
      diffs.push({ field: 'style', label: 'Style#', shopifyVal: style, n41Val: '—', status: 'missing' })
    } else {
      // Color: Option1 Value should match N41 color
      if (opt1Name.toLowerCase() === 'color' && opt1Val) {
        const n41Colors = n41.color.split(/[,/]/).map(c => c.trim().toUpperCase())
        if (!n41Colors.includes(opt1Val)) {
          diffs.push({ field: 'color', label: 'Color (Option1)', shopifyVal: opt1Val, n41Val: n41.color, status: 'diff', fix: n41.color })
        }
      }

      // Size: Option2 Value should match one of N41 sizes
      if (!parsed.isPrepack && opt2Name.toLowerCase() === 'size' && opt2Val) {
        const n41Sizes = expandSizecat(n41.sizeCat).map(s => s.toUpperCase())
        if (n41Sizes.length > 0 && !n41Sizes.includes(opt2Val)) {
          diffs.push({ field: 'size', label: 'Size (Option2)', shopifyVal: opt2Val, n41Val: n41Sizes.join(', '), status: 'diff', fix: n41Sizes.join(', ') })
        }
      }

      // SKU format check
      const expectedColorPart = n41.color.replace(/[^A-Z0-9]/gi, '').toUpperCase()
      if (colorFromSKU && colorFromSKU !== expectedColorPart && colorFromSKU !== n41.color.toUpperCase()) {
        const alreadyFlagged = diffs.some(d => d.field === 'color')
        if (!alreadyFlagged) {
          diffs.push({ field: 'sku_color', label: 'SKU Color Part', shopifyVal: colorFromSKU, n41Val: n41.color, status: 'warn' })
        }
      }
    }

    results.push({
      _row: row,
      _idx: results.length,
      sku,
      parsed,
      opt1Name, opt1Val,
      opt2Name, opt2Val,
      n41: n41 || null,
      diffs,
      status: !n41 ? 'missing' : diffs.length > 0 ? 'diff' : 'ok',
      accepted: false,
    })
  }
  return results
}

// ─── Apply fixes & export ─────────────────────────────────────────────────────
async function exportFixed(platform, rows, results, fileName) {
  const XLSX = await import('xlsx')

  // Build a map of accepted fixes by row index
  const fixMap = new Map()
  for (const res of results) {
    if (res.accepted && res.diffs.length > 0) {
      fixMap.set(res._idx, res)
    }
  }

  const updatedRows = rows.map((row, i) => {
    const res = results.find(r => r._row === row)
    if (!res || !res.accepted || res.diffs.length === 0) return row

    const updated = { ...row }
    for (const diff of res.diffs) {
      if (!diff.fix) continue
      if (platform === 'fashiongo') {
        if (diff.field === 'color') updated['Color/Scent'] = diff.fix
        if (diff.field === 'size')  updated['Size']  = diff.fix
        if (diff.field === 'pack')  updated['Pack']  = diff.fix
      } else if (platform === 'shopify') {
        if (diff.field === 'color') updated['Option1 Value'] = diff.fix
        if (diff.field === 'size')  updated['Option2 Value'] = diff.fix
      }
    }
    return updated
  })

  // Preserve original column order from source file
  const originalCols = rows.length > 0 ? Object.keys(rows[0]) : []
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(updatedRows, { header: originalCols })
  ws['!cols'] = originalCols.map(c => ({ wch: Math.max(String(c).length + 2, 10) }))
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const d = new Date()
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const base = fileName.replace(/\.[^/.]+$/, '')
  XLSX.writeFile(wb, `${base}_synced_${ds}.xlsx`)
}

// ─── Upload Zone Component ────────────────────────────────────────────────────
function UploadZone({ label, hint, onFile, fileName, color }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]) }}
      className="rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all py-6 px-4 text-center"
      style={{
        border: `2px dashed ${drag ? color : fileName ? color : 'var(--border2)'}`,
        background: drag ? 'var(--s2)' : fileName ? `rgba(${color === 'var(--blue)' ? '92,190,247' : color === 'var(--green)' ? '61,214,140' : '124,106,247'},0.05)` : 'var(--s1)',
        minHeight: 110,
      }}>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {fileName ? (
        <>
          <div className="text-2xl mb-1">✅</div>
          <div className="text-xs mono font-bold truncate w-full" style={{ color, maxWidth: 200 }}>{fileName}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>클릭해서 교체</div>
        </>
      ) : (
        <>
          <div className="text-2xl mb-1">📂</div>
          <div className="text-xs font-bold" style={{ color }}>{label}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{hint}</div>
        </>
      )}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    ok:      { bg: 'rgba(22,163,74,0.10)',  color: 'var(--green)',  label: '✓ OK' },
    diff:    { bg: 'rgba(217,119,6,0.10)',  color: 'var(--orange)', label: '⚡ DIFF' },
    missing: { bg: 'rgba(220,38,38,0.08)', color: 'var(--red)',    label: '✕ N41 없음' },
    warn:    { bg: 'rgba(37,99,235,0.08)',  color: 'var(--blue)',   label: '⚠ WARN' },
  }
  const c = cfg[status] || cfg.ok
  return (
    <span className="text-xs mono px-2 py-0.5 rounded font-bold whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}>{c.label}</span>
  )
}

// ─── Diff Cell ────────────────────────────────────────────────────────────────
function DiffCell({ diff }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(220,38,38,0.10)', color: 'var(--red)' }}>
          {diff.shopifyVal ?? diff.fgVal ?? '—'}
        </span>
        <span style={{ color: 'var(--text3)', fontSize: 10 }}>→</span>
        <span className="text-xs mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(22,163,74,0.12)', color: 'var(--green)' }}>
          {diff.n41Val}
        </span>
      </div>
      <div className="text-xs" style={{ color: 'var(--text3)', fontSize: 10 }}>{diff.label}</div>
    </div>
  )
}

// ─── Main SyncPage ─────────────────────────────────────────────────────────────
const syncStyles = `@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`

export default function SyncPage() {
  const { lang } = useLang()

  // Files
  const [n41File, setN41File]       = useState(null)
  const [n41FileName, setN41FileName] = useState('')
  const [platFile, setPlatFile]     = useState(null)
  const [platFileName, setPlatFileName] = useState('')
  const [platform, setPlatform]     = useState('fashiongo')

  // Data
  const [n41Map, setN41Map]         = useState(null)
  const [platRows, setPlatRows]     = useState(null)
  const [results, setResults]       = useState(null)

  // UI
  const [loading, setLoading]       = useState(false)

  // AI chat
  const [aiInput, setAiInput]           = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiMsg, setAiMsg]               = useState('')
  const [aiPreview, setAiPreview]       = useState(null)  // {understanding, changes, previewRows}
  const [aiPendingChanges, setAiPendingChanges] = useState(null)
  const [error, setError]           = useState('')
  const [filter, setFilter]         = useState('all') // all | diff | missing | ok
  const [searchQ, setSearchQ]       = useState('')
  const [selectAll, setSelectAll]   = useState(false)

  const plat = PLATFORMS[platform]

  // ── Load N41 file ──
  async function handleN41File(file) {
    setN41File(file)
    setN41FileName(file.name)
    setResults(null)
    try {
      const rows = await parseFile(file)
      setN41Map(parseN41(rows))
    } catch (e) {
      setError('N41 파일 읽기 실패: ' + e.message)
    }
  }

  // ── Load platform file ──
  async function handlePlatFile(file) {
    setPlatFile(file)
    setPlatFileName(file.name)
    setResults(null)
    try {
      const rows = await parseFile(file)
      setPlatRows(rows)
    } catch (e) {
      setError('플랫폼 파일 읽기 실패: ' + e.message)
    }
  }

  // ── AI command ──
  async function handleAiCommand() {
    if (!aiInput.trim() || !platRows?.length) return
    setAiLoading(true)
    setAiMsg('')
    setAiPreview(null)
    setAiPendingChanges(null)
    try {
      const platColumns = Object.keys(platRows[0] || {})
      const platSample  = platRows[0] || {}
      // Build n41 sample from map
      const n41Sample = n41Map ? Object.fromEntries([...n41Map.entries()].slice(0, 3).map(([k, v]) => [k, v])) : {}
      const result = await processSyncCommand(aiInput, platform, platColumns, n41Sample, platSample)

      if (!result.changes?.length) {
        setAiMsg('❌ 변경할 컬럼을 찾지 못했어요. 더 구체적으로 말씀해주세요.')
        return
      }

      // Build preview rows (first 5)
      const previewRows = platRows.slice(0, 5).map(row => {
        const updated = { ...row }
        for (const ch of result.changes) {
          if (!ch.platCol || !platColumns.includes(ch.platCol)) continue
          if (ch.sourceType === 'n41_field' && n41Map) {
            // Find matching N41 row by style
            const styleVal = String(row['Vendor Style Number'] || row['Style Number'] || row['Handle'] || '').toUpperCase()
            const n41Row = n41Map.get([...n41Map.keys()].find(k => k.startsWith(styleVal + '||')) || '') 
                        || [...n41Map.values()].find(v => v.style === styleVal)
            if (n41Row && ch.n41Field && n41Row[ch.n41Field] !== undefined) {
              let val = String(n41Row[ch.n41Field])
              if (ch.transform) val = applyTransforms(val, ch.transform)
              updated[ch.platCol] = val
            }
          } else if (ch.sourceType === 'transform') {
            updated[ch.platCol] = applyTransforms(String(row[ch.platCol] ?? ''), ch.transform)
          } else if (ch.sourceType === 'fixed') {
            updated[ch.platCol] = ch.fixedValue || ''
          }
        }
        return { original: row, updated }
      })

      setAiPreview({ understanding: result.understanding, changes: result.changes, previewNote: result.previewNote, previewRows })
      setAiPendingChanges(result.changes)
      setAiMsg(`✨ ${result.understanding}`)
    } catch (e) {
      setAiMsg('❌ ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Apply AI changes to all rows ──
  function applyAiChanges() {
    if (!aiPendingChanges || !platRows) return
    const platColumns = Object.keys(platRows[0] || {})
    const newRows = platRows.map(row => {
      const updated = { ...row }
      for (const ch of aiPendingChanges) {
        if (!ch.platCol || !platColumns.includes(ch.platCol)) continue
        if (ch.sourceType === 'n41_field' && n41Map) {
          const styleVal = String(row['Vendor Style Number'] || row['Style Number'] || row['Handle'] || '').toUpperCase()
          const n41Row = n41Map.get([...n41Map.keys()].find(k => k.startsWith(styleVal + '||')) || '')
                      || [...n41Map.values()].find(v => v.style === styleVal)
          if (n41Row && ch.n41Field && n41Row[ch.n41Field] !== undefined) {
            let val = String(n41Row[ch.n41Field])
            if (ch.transform) val = applyTransforms(val, ch.transform)
            updated[ch.platCol] = val
          }
        } else if (ch.sourceType === 'transform') {
          updated[ch.platCol] = applyTransforms(String(row[ch.platCol] ?? ''), ch.transform)
        } else if (ch.sourceType === 'fixed') {
          updated[ch.platCol] = ch.fixedValue || ''
        }
      }
      return updated
    })
    // Update platRows with new data and re-run diff
    setPlatRows(newRows)
    setAiPreview(null)
    setAiPendingChanges(null)
    setAiInput('')
    setAiMsg(`✅ ${aiPendingChanges.length}개 컬럼 전체 적용 완료 — 비교 다시 실행해주세요`)
  }

  // ── Run comparison ──
  async function runSync() {
    if (!n41Map || !platRows) return
    setLoading(true)
    setError('')
    try {
      await new Promise(r => setTimeout(r, 50)) // allow render
      let res
      if (platform === 'fashiongo') res = diffFashionGo(platRows, n41Map)
      else res = diffShopify(platRows, n41Map)
      setResults(res)
    } catch (e) {
      setError('비교 중 오류: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle accept ──
  function toggleAccept(idx) {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, accepted: !r.accepted } : r))
  }

  function toggleAll(checked) {
    setSelectAll(checked)
    setResults(prev => prev.map(r => r.status !== 'ok' && r.status !== 'missing' ? { ...r, accepted: checked } : r))
  }

  // ── Export ──
  async function handleExport() {
    if (!results || !platRows) return
    await exportFixed(platform, platRows, results, platFileName || 'export')
  }

  // ── Filtered results ──
  const filtered = results ? results.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      const key = platform === 'fashiongo' ? r.vendorStyle : r.sku
      if (!String(key || '').toLowerCase().includes(q)) return false
    }
    return true
  }) : []

  const stats = results ? {
    total:   results.length,
    ok:      results.filter(r => r.status === 'ok').length,
    diff:    results.filter(r => r.status === 'diff').length,
    missing: results.filter(r => r.status === 'missing').length,
    accepted: results.filter(r => r.accepted).length,
  } : null

  const canRun = n41Map && platRows

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <style>{syncStyles}</style>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🔄</span>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              Platform Sync
            </div>
            <div className="text-xs mono" style={{ color: 'var(--text3)' }}>
              {lang === 'ko' ? 'N41 기준으로 플랫폼 파일 검증 및 수정' : 'Validate & fix platform files against N41'}
            </div>
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-2">
            {[
              { label: 'Total', val: stats.total, color: 'var(--text2)' },
              { label: 'OK', val: stats.ok, color: 'var(--green)' },
              { label: 'DIFF', val: stats.diff, color: 'var(--orange)' },
              { label: 'Missing', val: stats.missing, color: 'var(--red)' },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-1 rounded-lg"
                style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-bold mono" style={{ color: s.color }}>{s.val}</div>
                <div className="text-xs" style={{ color: 'var(--text3)', fontSize: 10 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: setup */}
        <div className="w-72 flex-shrink-0 overflow-y-auto p-4 flex flex-col gap-4"
          style={{ borderRight: '1px solid var(--border)', background: 'var(--s1)' }}>

          {/* Platform selector */}
          <div>
            <div className="text-xs mono uppercase mb-2" style={{ color: 'var(--text3)', letterSpacing: '1.5px' }}>
              Platform
            </div>
            <div className="flex gap-1">
              {Object.values(PLATFORMS).map(p => (
                <button key={p.id} onClick={() => { setPlatform(p.id); setResults(null); setPlatRows(null); setPlatFileName('') }}
                  className="flex-1 py-2 rounded-lg text-xs mono font-bold transition-all flex flex-col items-center gap-1"
                  style={{
                    background: platform === p.id ? p.colorBg : 'var(--s2)',
                    border: `1px solid ${platform === p.id ? p.colorBorder : 'var(--border)'}`,
                    color: platform === p.id ? p.color : 'var(--text3)',
                  }}>
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* N41 Upload */}
          <div>
            <div className="text-xs mono uppercase mb-2" style={{ color: 'var(--text3)', letterSpacing: '1.5px' }}>
              ① N41 Style 파일
            </div>
            <UploadZone
              label="N41 Style 업로드"
              hint="Desktop xlsx / Cloud csv"
              onFile={handleN41File}
              fileName={n41FileName}
              color="var(--accent)"
            />
            {n41Map && (
              <div className="mt-1.5 text-xs mono text-center" style={{ color: 'var(--green)' }}>
                ✓ {n41Map.size}개 style 로드됨
              </div>
            )}
          </div>

          {/* Platform Upload */}
          <div>
            <div className="text-xs mono uppercase mb-2" style={{ color: 'var(--text3)', letterSpacing: '1.5px' }}>
              ② {plat.label} 파일
            </div>
            <UploadZone
              label={`${plat.label} export 업로드`}
              hint=".xlsx 또는 .csv"
              onFile={handlePlatFile}
              fileName={platFileName}
              color={plat.color}
            />
            {platRows && (
              <div className="mt-1.5 text-xs mono text-center" style={{ color: plat.color }}>
                ✓ {platRows.length}개 행 로드됨
              </div>
            )}
          </div>

          {/* Run button */}
          <button onClick={runSync} disabled={!canRun || loading}
            className="w-full py-2.5 rounded-xl text-sm mono font-bold transition-all"
            style={{
              background: canRun ? 'var(--accent)' : 'var(--s2)',
              color: canRun ? 'white' : 'var(--text3)',
              opacity: loading ? 0.7 : 1,
              cursor: canRun ? 'pointer' : 'not-allowed',
            }}>
            {loading ? '비교 중…' : '③ 비교 실행 →'}
          </button>

          {error && (
            <div className="text-xs mono p-3 rounded-lg" style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.15)' }}>
              {error}
            </div>
          )}

          {/* Mapping reference */}
          <div className="rounded-xl p-3" style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}>
            <div className="text-xs mono uppercase mb-2" style={{ color: 'var(--text3)', letterSpacing: '1px' }}>
              매핑 기준
            </div>
            {platform === 'fashiongo' ? (
              <div className="flex flex-col gap-1">
                {[
                  ['Vendor Style #', 'N41 style'],
                  ['Color/Scent', 'N41 color'],
                  ['Size', 'N41 sizeCat (확장)'],
                  ['Pack', 'N41 bundle'],
                ].map(([fg, n41]) => (
                  <div key={fg} className="flex items-center gap-1 text-xs mono">
                    <span style={{ color: plat.color }} className="truncate">{fg}</span>
                    <span style={{ color: 'var(--text3)' }}>↔</span>
                    <span style={{ color: 'var(--accent)' }} className="truncate">{n41}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {[
                  ['Variant SKU', 'STYLE-COLOR[-SIZE]'],
                  ['Option1 Value', 'N41 color'],
                  ['Option2 Value', 'N41 size (open)'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 text-xs mono">
                    <span style={{ color: plat.color }} className="truncate">{k}</span>
                    <span style={{ color: 'var(--text3)' }}>↔</span>
                    <span style={{ color: 'var(--accent)' }} className="truncate">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export button */}
          {results && stats && stats.accepted > 0 && (
            <button onClick={handleExport}
              className="w-full py-2.5 rounded-xl text-sm mono font-bold transition-all"
              style={{ background: 'var(--green)', color: '#0a1a10' }}>
              ⬇ {stats.accepted}개 수정 적용 후 export
            </button>
          )}

          {/* AI Chat */}
          {platRows && (
            <div className="flex flex-col gap-2">
              <div className="text-xs mono uppercase" style={{ color: 'var(--text3)', letterSpacing: '1.5px' }}>
                ✨ AI 직접 요청
              </div>
              <textarea
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !aiLoading) { e.preventDefault(); handleAiCommand() }}}
                placeholder={"예: FashionGo seller ID를 N41 style#로 바꿔줘\n예: color 컬럼 대문자로 바꿔줘\n예: size에서 special character 제거해줘"}
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-xs mono outline-none resize-none"
                style={{ background: 'var(--s2)', border: '1px solid var(--border2)', color: 'var(--text)', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <button onClick={handleAiCommand} disabled={aiLoading || !aiInput.trim()}
                className="w-full py-2 rounded-lg text-xs mono font-bold transition-all"
                style={{
                  background: aiLoading ? 'var(--s2)' : 'var(--accent-glow)',
                  border: '1px solid var(--accent)',
                  color: aiLoading ? 'var(--text3)' : 'var(--accent)',
                  opacity: !aiInput.trim() ? 0.5 : 1,
                }}>
                {aiLoading
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> AI 분석 중…</>
                  : '→ AI 실행 (Enter)'}
              </button>
              {aiMsg && (
                <div className="text-xs mono px-2 py-1.5 rounded-lg"
                  style={{
                    color: aiMsg.startsWith('❌') ? 'var(--red)' : aiMsg.startsWith('✅') ? 'var(--green)' : 'var(--accent)',
                    background: aiMsg.startsWith('❌') ? 'rgba(220,38,38,0.06)' : aiMsg.startsWith('✅') ? 'rgba(22,163,74,0.08)' : 'var(--accent-glow)',
                    border: `1px solid ${aiMsg.startsWith('❌') ? 'rgba(220,38,38,0.15)' : aiMsg.startsWith('✅') ? 'rgba(22,163,74,0.20)' : 'rgba(79,99,210,0.15)'}`,
                  }}>
                  {aiMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel: results */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* AI Preview Panel */}
          {aiPreview && (
            <div className="flex-shrink-0 mx-4 mt-3 rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--accent)', background: 'rgba(79,99,210,0.04)' }}>
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ background: 'var(--accent-glow)', borderBottom: '1px solid rgba(79,99,210,0.15)' }}>
                <div>
                  <span className="text-xs mono font-bold" style={{ color: 'var(--accent)' }}>
                    ✨ AI 미리보기 (상위 5행)
                  </span>
                  <span className="text-xs mono ml-2" style={{ color: 'var(--text3)' }}>
                    {aiPreview.understanding}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={applyAiChanges}
                    className="px-3 py-1 rounded-lg text-xs mono font-bold"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    ✅ 전체 적용 ({platRows?.length}행)
                  </button>
                  <button onClick={() => { setAiPreview(null); setAiPendingChanges(null) }}
                    style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              </div>
              {/* Changes summary */}
              <div className="px-4 py-2 flex flex-wrap gap-2" style={{ borderBottom: '1px solid var(--accent-glow)' }}>
                {aiPreview.changes.map((ch, i) => (
                  <div key={i} className="text-xs mono px-2 py-1 rounded"
                    style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                    <span style={{ color: plat.color }}>{ch.platCol}</span>
                    <span style={{ color: 'var(--text3)' }}> ← </span>
                    <span style={{ color: 'var(--accent)' }}>
                      {ch.sourceType === 'n41_field' ? `N41.${ch.n41Field}` : ch.sourceType === 'fixed' ? `"${ch.fixedValue}"` : ch.transform}
                    </span>
                  </div>
                ))}
              </div>
              {/* Preview table */}
              <div className="overflow-x-auto" style={{ maxHeight: 200 }}>
                <table className="text-xs w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr style={{ background: 'var(--accent-glow)', borderBottom: '1px solid rgba(79,99,210,0.15)' }}>
                      {aiPreview.changes.map(ch => (
                        <th key={ch.platCol} className="px-3 py-1.5 text-left mono whitespace-nowrap"
                          style={{ color: 'var(--text3)', fontSize: 10 }}>
                          {ch.platCol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aiPreview.previewRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {aiPreview.changes.map(ch => {
                          const orig = String(row.original[ch.platCol] ?? '')
                          const upd  = String(row.updated[ch.platCol] ?? '')
                          const changed = orig !== upd
                          return (
                            <td key={ch.platCol} className="px-3 py-1.5 mono whitespace-nowrap"
                              style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {changed ? (
                                <div className="flex flex-col gap-0.5">
                                  <span style={{ color: 'var(--red)', textDecoration: 'line-through', fontSize: 10 }}>{orig || '—'}</span>
                                  <span style={{ color: 'var(--green)' }}>{upd || '—'}</span>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text3)' }}>{orig || '—'}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {aiPreview.previewNote && (
                <div className="px-4 py-2 text-xs mono" style={{ color: 'var(--text3)', borderTop: '1px solid var(--accent-glow)' }}>
                  ℹ️ {aiPreview.previewNote}
                </div>
              )}
            </div>
          )}

          {!results ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3"
              style={{ color: 'var(--text3)' }}>
              <div className="text-4xl">🔍</div>
              <div className="text-sm mono">
                {!n41Map ? 'N41 파일을 먼저 업로드하세요' :
                 !platRows ? `${plat.label} 파일을 업로드하세요` :
                 '비교 실행 버튼을 눌러주세요'}
              </div>
            </div>
          ) : (
            <>
              {/* Filter bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--s2)' }}>
                <div className="flex gap-1">
                  {[
                    { key: 'all',     label: `전체 (${stats.total})` },
                    { key: 'diff',    label: `DIFF (${stats.diff})` },
                    { key: 'missing', label: `Missing (${stats.missing})` },
                    { key: 'ok',      label: `OK (${stats.ok})` },
                  ].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      className="px-2.5 py-1 rounded-lg text-xs mono transition-all"
                      style={{
                        background: filter === f.key ? 'var(--accent-glow)' : 'transparent',
                        color: filter === f.key ? 'var(--accent)' : 'var(--text3)',
                        border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Style# 검색…"
                  className="ml-2 px-3 py-1 rounded-lg text-xs mono outline-none"
                  style={{ background: 'var(--s1)', border: '1px solid var(--border2)', color: 'var(--text)', width: 160 }} />
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs mono cursor-pointer" style={{ color: 'var(--text2)' }}>
                    <input type="checkbox" checked={selectAll}
                      onChange={e => toggleAll(e.target.checked)}
                      className="rounded" />
                    DIFF 전체 선택
                  </label>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="text-xs w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text3)', width: 36 }}>#</th>
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text3)', width: 44 }}>수정</th>
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--accent)' }}>Style#</th>
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text2)' }}>
                        {platform === 'fashiongo' ? 'FG Color' : 'SKU'}
                      </th>
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text2)' }}>
                        {platform === 'fashiongo' ? 'FG Size' : 'Option1 (Color)'}
                      </th>
                      {platform === 'fashiongo' && (
                        <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text2)' }}>FG Pack</th>
                      )}
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text2)' }}>차이</th>
                      <th className="px-3 py-2 text-left mono" style={{ color: 'var(--text2)' }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={platform === 'fashiongo' ? 8 : 7} className="text-center py-12 mono"
                          style={{ color: 'var(--text3)' }}>결과 없음</td>
                      </tr>
                    ) : filtered.map((r, rowI) => (
                      <tr key={r._idx}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: r.accepted ? 'rgba(22,163,74,0.05)' : rowI % 2 === 0 ? 'var(--s1)' : 'transparent',
                        }}>
                        <td className="px-3 py-2 mono" style={{ color: 'var(--text3)' }}>{r._idx + 1}</td>
                        <td className="px-3 py-2">
                          {r.status === 'diff' ? (
                            <input type="checkbox" checked={r.accepted}
                              onChange={() => toggleAccept(results.indexOf(r))}
                              className="cursor-pointer" />
                          ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                        </td>
                        <td className="px-3 py-2 mono font-bold" style={{ color: 'var(--text)' }}>
                          {platform === 'fashiongo' ? r.vendorStyle : r.parsed?.style}
                        </td>
                        <td className="px-3 py-2 mono" style={{ color: 'var(--text2)' }}>
                          {platform === 'fashiongo' ? r.fgColor : r.sku}
                        </td>
                        <td className="px-3 py-2 mono" style={{ color: 'var(--text2)' }}>
                          {platform === 'fashiongo' ? r.fgSize : r.opt1Val}
                        </td>
                        {platform === 'fashiongo' && (
                          <td className="px-3 py-2 mono" style={{ color: 'var(--text2)' }}>{r.fgPack}</td>
                        )}
                        <td className="px-3 py-2">
                          {r.diffs.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {r.diffs.map((d, di) => <DiffCell key={di} diff={d} />)}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text3)' }}>—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
