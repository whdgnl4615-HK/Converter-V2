import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*, brands(*)')
      .eq('id', userId)
      .single()
    setProfile(data)
    return data
  }

  async function fetchNotifications(userId) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('to_user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchNotifications(session.user.id),
        ]).finally(() => setLoading(false))
      } else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchNotifications(session.user.id),
        ]).finally(() => setLoading(false))
      } else { setProfile(null); setNotifications([]); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

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

  const isAdmin   = profile?.role === 'admin'
  const isPending = profile?.role === 'pending'
  const isActive  = profile?.role === 'user' || profile?.role === 'admin'
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
