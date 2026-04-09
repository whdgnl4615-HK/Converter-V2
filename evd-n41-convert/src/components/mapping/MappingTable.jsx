import { useLang } from '../../contexts/LangContext'
import { SCHEMAS } from '../../lib/n41Schema'

const TAG = {
  auto:     { label: 'AUTO',  style: {background:'rgba(61,214,140,0.1)',color:'var(--green)'} },
  computed: { label: 'CALC',  style: {background:'rgba(92,190,247,0.1)',color:'var(--blue)'} },
  fixed:    { label: 'FIXED', style: {background:'rgba(247,163,92,0.1)',color:'var(--orange)'} },
  skip:     { label: 'SKIP',  style: {background:'rgba(255,255,255,0.04)',color:'var(--text3)'} },
}

function getTag(src) {
  if (!src) return TAG.skip
  if (src === '__row_index__') return TAG.auto
  if (src.startsWith('__computed__')) return TAG.computed
  if (src === '__fixed__') return TAG.fixed
  return TAG.auto
}

export default function MappingTable({ moduleKey, mapping, sourceColumns, onMappingChange }) {
  const { T, lang } = useLang()
  const schema = SCHEMAS[moduleKey] || {}
  const n41Cols = Object.keys(schema)

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
  }

  return (
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

          return (
            <div key={col} className="grid items-start px-4 py-2"
              style={{
                gridTemplateColumns:'160px 220px 200px 1fr',
                borderBottom: i < n41Cols.length - 1 ? '1px solid rgba(44,44,66,0.5)' : 'none',
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
                      date:MM/DD/YYYY · date:YYYY-MM-DD<br/>
                      map:A=X,B=Y · map:/regex/=Y<br/>
                      prefix:WH- · suffix:_US<br/>
                      upper · lower · title<br/>
                      strip_special · strip_all_special<br/>
                      no_space · alphanumeric<br/>
                      replace:old|new · number<br/>
                      round:2 · multiply:1.1<br/>
                      substr:0:4 · pad_left:6:0<br/>
                      <span style={{color:'var(--accent)'}}>파이프로 체이닝: upper | strip_special</span>
                    </div>
                  </>
                )}
              </div>

              {/* Sample */}
              <div className="pt-1.5 overflow-hidden">
                <span className="text-xs mono truncate block" style={{color:'var(--text2)'}}>
                  —
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
