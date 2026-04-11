import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTemplates(moduleKey) {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchTemplates = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('module', moduleKey)
      .order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }, [user, moduleKey])

  async function saveTemplate(name, mapping, isDefault = false) {
    if (!user) return
    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
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
    const { error } = await supabase
      .from('templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetchTemplates()
  }

  async function deleteTemplate(id) {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetchTemplates()
  }

  async function setDefault(id) {
    // Unset all defaults for this module first
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('module', moduleKey)
    // Set the new default
    await supabase
      .from('templates')
      .update({ is_default: true })
      .eq('id', id)
    await fetchTemplates()
  }

  function getDefaultTemplate() {
    return templates.find(t => t.is_default) || templates[0] || null
  }

  return {
    templates, loading,
    fetchTemplates, saveTemplate, updateTemplate, deleteTemplate,
    setDefault, getDefaultTemplate,
  }
}
