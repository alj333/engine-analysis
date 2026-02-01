import { useAuth, SignIn } from '@clerk/clerk-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEffect, useState } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Wraps content that requires authentication
 * Shows sign-in UI when not authenticated
 * Ensures user exists in Convex after sign-in
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const ensureUser = useMutation(api.users.ensureUser)
  const [userEnsured, setUserEnsured] = useState(false)

  // Ensure user exists in Convex after sign-in
  useEffect(() => {
    if (isSignedIn && userId && !userEnsured) {
      // Get user info from Clerk and sync to Convex
      ensureUser({
        clerkId: userId,
        email: '', // Will be populated from Clerk claims
        name: undefined,
      })
        .then(() => setUserEnsured(true))
        .catch(console.error)
    }
  }, [isSignedIn, userId, userEnsured, ensureUser])

  // Still loading auth state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  // Not signed in - show fallback or sign-in
  if (!isSignedIn) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="max-w-md w-full">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'bg-gray-800 border-gray-700',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-400',
                socialButtonsBlockButton: 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600',
                formFieldLabel: 'text-gray-300',
                formFieldInput: 'bg-gray-700 border-gray-600 text-white',
                footerActionLink: 'text-orange-500 hover:text-orange-400',
              },
            }}
          />
        </div>
      </div>
    )
  }

  // Signed in and user ensured
  return <>{children}</>
}

/**
 * Optional auth wrapper - allows unauthenticated access
 * but provides auth context if signed in
 */
export function OptionalAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const ensureUser = useMutation(api.users.ensureUser)
  const [userEnsured, setUserEnsured] = useState(false)

  // Ensure user exists in Convex if signed in
  useEffect(() => {
    if (isSignedIn && userId && !userEnsured) {
      ensureUser({
        clerkId: userId,
        email: '',
        name: undefined,
      })
        .then(() => setUserEnsured(true))
        .catch(console.error)
    }
  }, [isSignedIn, userId, userEnsured, ensureUser])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  return <>{children}</>
}
