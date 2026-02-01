import { useAuth, useUser, SignOutButton } from '@clerk/clerk-react'
import { useState, useRef, useEffect } from 'react'
import { User, LogOut, Settings, Cloud, CloudOff } from 'lucide-react'

interface UserMenuProps {
  onSignIn?: () => void
}

/**
 * User menu dropdown for the header
 * Shows user info and sign out option when authenticated
 * Shows sign in button when not authenticated
 */
export function UserMenu({ onSignIn }: UserMenuProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Loading state
  if (!isLoaded) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
    )
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <button
        onClick={onSignIn}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <CloudOff className="w-4 h-4" />
        <span>Sign In</span>
      </button>
    )
  }

  // Signed in - show user menu
  const displayName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User'
  const avatarUrl = user?.imageUrl

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-700 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="hidden sm:flex items-center gap-1">
          <Cloud className="w-3.5 h-3.5 text-green-500" />
          <span className="text-sm text-gray-300">{displayName}</span>
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          {/* User info */}
          <div className="px-4 py-2 border-b border-gray-700">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-white font-medium truncate">{displayName}</p>
                <p className="text-gray-400 text-sm truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Sync status */}
          <div className="px-4 py-2 border-b border-gray-700">
            <div className="flex items-center gap-2 text-sm">
              <Cloud className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Synced to cloud</span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                // TODO: Open settings modal
              }}
              className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <SignOutButton>
              <button
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </SignOutButton>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact sync status indicator
 */
export function SyncStatus() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Local only</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-500">
      <Cloud className="w-3.5 h-3.5" />
      <span>Synced</span>
    </div>
  )
}
