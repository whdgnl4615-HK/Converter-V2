import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [notifications, setNotifications] = useState([])
  const fetchingRef = useRef(false)

  async function fetchProfile(userId) {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) { console.warn('fetchProfile error:', error.message); return null }
      setProfile(data)
      return data
    } finally {
      fetchingRef.current = false
    }
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
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
        await fetchNotifications(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      console.log('auth event:', event, session?.user?.email)

      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
        await fetchNotifications(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setNotifications([])
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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
    setUser(null)
    setProfile(null)
    setNotifications([])
  }

  async function refreshProfile() {
    if (user) {
      fetchingRef.current = false
      await fetchProfile(user.id)
    }
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
