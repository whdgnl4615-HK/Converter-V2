// Core conversion logic — shared across all modules

// ─── Date Parsing ─────────────────────────────────────────────────────────────

function parseDate(s) {
  if (!s) return null
  const str = String(s).trim()

  // JS ISO (from xlsx cellDates:true)
  if (str.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const d = new Date(str)
    if (!isNaN(d)) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  let m = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return { y: +m[1], m: +m[2], d: +m[3] }

  // MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
  m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (m) return { y: +m[3], m: +m[1], d: +m[2] }

  // YYYYMMDD
  m = str.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return { y: +m[1], m: +m[2], d: +m[3] }

  // DD-Mon-YYYY or Mon-DD-YYYY  (e.g. 15-Jan-2024)
  m = str.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s,]*(\d{4})/)
  if (m) {
    const monthMap = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
    const mo = monthMap[m[2].toLowerCase()]
    if (mo) return { y: +m[3], m: mo, d: +m[1] }
  }

  // Excel serial number (e.g. 45000)
  if (/^\d{4,5}$/.test(str)) {
    const serial = parseInt(str, 10)
    if (serial > 1000 && serial < 99999) {
      const epoch = new Date(Date.UTC(1900, 0, 1))
      const d = new Date(epoch.getTime() + (serial - 2) * 86400000)
      if (!isNaN(d)) return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
    }
  }

  return null
}

function formatDate(parsed, fmt) {
  if (!parsed) return ''
  const { y, m, d } = parsed
  const pad = n => String(n).padStart(2, '0')
  return fmt
    .replace('YYYY', y)
    .replace('YY', String(y).slice(-2))
    .replace('MM', pad(m))
    .replace('M', m)
    .replace('DD', pad(d))
    .replace('D', d)
}

// ─── Single Transform ─────────────────────────────────────────────────────────

export function applyTransform(val, tf) {
  if (!tf) return val == null ? '' : String(val)
  const s = String(val ?? '').trim()

  if (tf.startsWith('date:')) {
    const parsed = parseDate(s)
    return parsed ? formatDate(parsed, tf.slice(5)) : s
  }

  // map:A=X,B=Y  (case-insensitive, supports regex keys like /pattern/)
  if (tf.startsWith('map:')) {
    for (const pair of tf.slice(4).split(',')) {
      const eqIdx = pair.indexOf('=')
      if (eqIdx === -1) continue
      const k = pair.slice(0, eqIdx).trim()
      const v = pair.slice(eqIdx + 1).trim()
      if (k.startsWith('/') && k.endsWith('/')) {
        try { if (new RegExp(k.slice(1, -1), 'i').test(s)) return v } catch { /* skip */ }
      } else {
        if (s.toLowerCase() === k.toLowerCase()) return v
      }
    }
    return s
  }

  if (tf.startsWith('prefix:'))      return tf.slice(7) + s
  if (tf.startsWith('suffix:'))      return s + tf.slice(7)
  if (tf === 'upper')                return s.toUpperCase()
  if (tf === 'lower')                return s.toLowerCase()
  if (tf === 'title')                return s.replace(/\b\w/g, c => c.toUpperCase())
  if (tf === 'trim')                 return s.trim()

  // truncate:N — keep first N characters
  if (tf.startsWith('truncate:')) {
    const n = parseInt(tf.slice(9), 10)
    return isNaN(n) ? s : s.slice(0, n)
  }

  // Special character removals
  if (tf === 'strip_special')        return s.replace(/[^a-zA-Z0-9 \-_]/g, '')
  if (tf === 'strip_all_special')    return s.replace(/[^a-zA-Z0-9]/g, '')
  if (tf === 'no_space')             return s.replace(/\s+/g, '')
  if (tf === 'alphanumeric')         return s.replace(/[^a-zA-Z0-9 ]/g, '').trim()

  if (tf === 'number') {
    const n = s.match(/[\d.]+/)
    return n ? n[0] : ''
  }

  if (tf.startsWith('round:')) {
    const dec = parseInt(tf.slice(6), 10) || 0
    const n = parseFloat(s)
    return isNaN(n) ? s : n.toFixed(dec)
  }

  if (tf.startsWith('multiply:')) {
    const factor = parseFloat(tf.slice(9))
    const n = parseFloat(s)
    return isNaN(n) || isNaN(factor) ? s : String(n * factor)
  }

  // replace:old|new
  if (tf.startsWith('replace:')) {
    const rest = tf.slice(8)
    const sep = rest.indexOf('|')
    if (sep !== -1) return s.split(rest.slice(0, sep)).join(rest.slice(sep + 1))
  }

  // substr:start:length
  if (tf.startsWith('substr:')) {
    const [start, len] = tf.slice(7).split(':').map(Number)
    return len !== undefined ? s.substr(start, len) : s.substr(start)
  }

  // pad_left:length:char  e.g. pad_left:6:0
  if (tf.startsWith('pad_left:')) {
    const [len, ch = '0'] = tf.slice(9).split(':')
    return s.padStart(parseInt(len, 10) || 0, ch)
  }

  return s
}

// ─── Pipe-chained transforms  e.g. "upper | strip_special | prefix:WH-" ──────

export function applyTransforms(val, tf) {
  if (!tf) return val == null ? '' : String(val)
  const parts = tf.split('|').map(p => p.trim()).filter(Boolean)
  let result = val == null ? '' : String(val)
  for (const part of parts) {
    result = applyTransform(result, part)
  }
  return result
}

// ─── Address builder ──────────────────────────────────────────────────────────

export function buildAddress(prefix, row) {
  return ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'City', 'State', 'Zip', 'Country']
    .map(f => (row[`${prefix} ${f}`] || '').trim())
    .filter(Boolean)
    .join(', ')
}

// ─── Value resolver ───────────────────────────────────────────────────────────

export function resolveValue(col, mapping, row, rowIdx) {
  const { src, tf, fixedVal } = mapping[col] || {}
  if (!src) return ''
  if (src === '__row_index__') return rowIdx + 1
  if (src === '__fixed__') return fixedVal || ''
  if (src === '__computed__color')
    return (row['Color Code'] || '').trim() || (row['Color'] || '').trim()
  if (src === '__computed__shipTo') return buildAddress('Shipping', row)
  if (src === '__computed__billTo') return buildAddress('Billing', row)
  const raw = row[src] ?? ''
  return applyTransforms(raw, tf)
}

// ─── Batch conversion ─────────────────────────────────────────────────────────

export function convertRows(evdData, mapping, moduleKey) {
  const allCols = Object.keys(mapping)
  return evdData.map((row, i) => {
    const out = {}
    allCols.forEach(col => {
      // Always include column — empty src keeps header but writes empty string
      out[col] = resolveValue(col, mapping, row, i)
    })
    return out
  })
}

// ─── XLSX download ────────────────────────────────────────────────────────────

export function downloadXlsx(rows, mapping, moduleKey) {
  import('xlsx').then(XLSX => {
    const allCols = Object.keys(mapping)
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows, { header: allCols })
    ws['!cols'] = allCols.map(c => ({ wch: Math.max(c.length + 2, 12) }))
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const d = new Date()
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    XLSX.writeFile(wb, `N41_${moduleKey}_${ds}.xlsx`)
  })
}

// ─── File parser ──────────────────────────────────────────────────────────────

export function parseUploadedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' })
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function getSourceColumns(data) {
  if (!data || !data.length) return []
  return Object.keys(data[0])
}
