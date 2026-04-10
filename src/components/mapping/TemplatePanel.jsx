import { useState, useEffect } from 'react'
import { useLang } from '../../contexts/LangContext'

export default function TemplatePanel({ templates, onLoad, onSave, onDelete, onSetDefault, onExport, onImport, activeTemplateName }) {
  const { T } = useLang()
  const [name, setName] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })

  function showMsg(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3000)
  }

  async function handleSave() {
    if (!name.trim()) { showMsg('err', T.templates.noName); return }
    try {
      await onSave(name.trim())
      showMsg('ok', T.templates.saved(name.trim()))
      setName('')
    } catch(e) { showMsg('err', e.message) }
  }

  async function handleDelete(tpl) {
    if (!confirm(T.templates.deleteConfirm(tpl.name))) return
    try { await onDelete(tpl.id) } catch(e) { showMsg('err', e.message) }
  }

  function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!Array.isArray(data)) throw new Error('Invalid format')
        let added = 0
        for (const tpl of data) {
          if (tpl.name && tpl.mapping) {
            const exists = templates.find(t => t.name === tpl.name)
            if (!exists || confirm(T.templates.conflict(tpl.name))) {
              await onSave(tpl.name, tpl.mapping)
              added++
            }
          }
        }
        showMsg('ok', T.templates.importDone(added, 0))
      } catch { showMsg('err', T.templates.importErr) }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col h-full" style={{background:'var(--s1)'}}>
      {/* Save new */}
      <div className="p-4 border-b" style={{borderColor:'var(--border)'}}>
        <div className="text-xs mono uppercase mb-2" style={{color:'var(--text2)',letterSpacing:'1.5px'}}>
          {T.templates.save}
        </div>
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder={T.templates.namePlaceholder}
            className="flex-1 rounded-lg px-3 py-2 text-xs mono outline-none"
            style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text)'}}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--border2)'}
          />
          <button onClick={handleSave}
            className="px-3 py-2 rounded-lg text-xs mono font-bold transition-all"
            style={{background:'var(--accent)',color:'white'}}>
            {T.templates.saveBtn}
          </button>
        </div>
        {msg.text && (
          <p className="text-xs mt-2 mono" style={{color: msg.type==='ok'?'var(--green)':'var(--red)'}}>
            {msg.text}
          </p>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs mono uppercase mb-3" style={{color:'var(--text2)',letterSpacing:'1.5px'}}>
          {T.templates.list}
        </div>
        {templates.length === 0 ? (
          <p className="text-xs text-center py-4 mono" style={{color:'var(--text3)'}}>{T.templates.empty}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map(tpl => (
              <div key={tpl.id} className="rounded-lg p-3" style={{
                background:'var(--s2)',
                border: tpl.name === activeTemplateName
                  ? '1px solid var(--accent)'
                  : '1px solid var(--border)',
              }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs mono font-bold" style={{color:'var(--text)'}}>{tpl.name}</span>
                    {tpl.is_default && (
                      <span className="text-xs mono px-1.5 py-0.5 rounded" style={{background:'rgba(22,163,74,0.10)',color:'var(--green)'}}>
                        {T.templates.isDefault}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs mb-2" style={{color:'var(--text3)',fontFamily:'monospace',fontSize:'10px'}}>
                  {tpl.updated_at ? new Date(tpl.updated_at).toLocaleString() : ''}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => onLoad(tpl)}
                    className="px-2 py-1 rounded text-xs mono transition-all"
                    style={{background:'var(--accent-glow)',color:'var(--accent)',border:'1px solid var(--accent)'}}>
                    {T.templates.load}
                  </button>
                  {!tpl.is_default && (
                    <button onClick={() => onSetDefault(tpl.id)}
                      className="px-2 py-1 rounded text-xs mono transition-all"
                      style={{background:'rgba(22,163,74,0.08)',color:'var(--green)',border:'1px solid rgba(22,163,74,0.20)'}}>
                      {T.templates.setDefault}
                    </button>
                  )}
                  <button onClick={() => handleDelete(tpl)}
                    className="px-2 py-1 rounded text-xs mono transition-all"
                    style={{background:'rgba(220,38,38,0.06)',color:'var(--red)',border:'1px solid rgba(220,38,38,0.15)'}}>
                    {T.templates.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export / Import */}
      <div className="p-4 border-t" style={{borderColor:'var(--border)',background:'var(--s2)'}}>
        <div className="text-xs mono uppercase mb-2" style={{color:'var(--text3)',letterSpacing:'1px'}}>
          {T.templates.share}
        </div>
        <div className="flex gap-2">
          <button onClick={onExport}
            className="flex-1 py-1.5 rounded-lg text-xs mono transition-all"
            style={{background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)'}}>
            {T.templates.exportBtn}
          </button>
          <label className="flex-1 py-1.5 rounded-lg text-xs mono text-center cursor-pointer transition-all"
            style={{background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)'}}>
            {T.templates.importBtn}
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>
    </div>
  )
}
