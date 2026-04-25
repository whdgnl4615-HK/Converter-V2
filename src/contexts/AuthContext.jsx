import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null)
  const [profile, setProfile]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [notifications, setNotifications] = useState([])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) { console.warn('fetchProfile:', error.message); return null }
    setProfile(data)
    return data
  }

  async function fetchNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('to_user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
    if (!error) setNotifications(data || [])
  }

  useEffect(() => {
    // onAuthStateChange만 사용 - getSession 중복 제거
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('auth event:', event)

        if (session?.user) {
          setUser(session.user)
          // setTimeout으로 Supabase 내부 상태 정리 후 fetch
          setTimeout(async () => {
            await fetchProfile(session.user.id)
            await fetchNotifications(session.user.id)
            setLoading(false)
          }, 0)
        } else {
          setUser(null)
          setProfile(null)
          setNotifications([])
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password, fullName = '') {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setNotifications([])
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function markNotificationRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function markAllRead() {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('to_user_id', user.id)
    setNotifications([])
  }

  const isAdmin     = profile?.role === 'admin'
  const isPending   = profile?.role === 'pending'
  const isActive    = profile?.role === 'user' || profile?.role === 'admin'
  const unreadCount = notifications.length

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      notifications, unreadCount,
      signIn, signUp, signOut, refreshProfile,
      markNotificationRead, markAllRead,
      isAdmin, isPending, isActive,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
