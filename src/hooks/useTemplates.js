import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTemplates(moduleKey) {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      if (!user) { setLoading(false); return }

      // 1. 개인 템플릿
      const { data: personal } = await supabase
        .from('templates')
        .select('*')
        .eq('module', moduleKey)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // 2. 브랜드 템플릿 (같은 브랜드 멤버면 볼 수 있음)
      const { data: profile } = await supabase
        .from('profiles').select('brand_id').eq('id', user.id).single()

      let brand = []
      if (profile?.brand_id) {
        const { data: brandTpls } = await supabase
          .from('templates')
          .select('*')
          .eq('module', moduleKey)
          .eq('scope', 'brand')
          .eq('brand_id', profile.brand_id)
          .order('created_at', { ascending: false })
        brand = brandTpls || []
      }

      // 합쳐서 personal 먼저, brand는 scope 표시
      const all = [
        ...(personal || []).map(t => ({ ...t, scope: 'personal' })),
        ...brand.map(t => ({ ...t, _isBrand: true })),
      ]
      setTemplates(all)
    } catch (e) {
      console.warn('fetchTemplates error:', e)
    } finally {
      setLoading(false)
    }
  }, [user, moduleKey])

  async function saveTemplate(name, mapping, isDefault = false) {
    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user?.id || null,
        module: moduleKey,
        name,
        mapping,
        is_default: isDefault,
      })
      .select()
      .single()
    if (error) throw error
    await fetchTemplates()
    return data
  }

  async function updateTemplate(id, updates) {
    const query = supabase
      .from('templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (user) query.eq('user_id', user.id)

    const { error } = await query
    if (error) throw error
    await fetchTemplates()
  }

  async function deleteTemplate(id) {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchTemplates()
  }

  async function setDefault(id) {
    // Unset all defaults for this module
    const unsetQuery = supabase
      .from('templates')
      .update({ is_default: false })
      .eq('module', moduleKey)
    if (user) unsetQuery.eq('user_id', user.id)
    await unsetQuery

    // Set new default
    await supabase.from('templates').update({ is_default: true }).eq('id', id)
    await fetchTemplates()
  }

  function getDefaultTemplate() {
    return templates.find(t => t.is_default) || templates[0] || null
  }

  return {
    templates, loading,
    fetchTemplates, saveTemplate, updateTemplate,
    deleteTemplate, setDefault, getDefaultTemplate,
  }
}
