import { SignIn, SignUp } from '@clerk/clerk-react'
import { useState } from 'react'
import { Gauge } from 'lucide-react'

type AuthMode = 'signin' | 'signup'

interface LoginPageProps {
  onSkip?: () => void
}

/**
 * Full-page login/signup component
 * Supports email, Google, and Apple Sign-In via Clerk
 */
export function LoginPage({ onSkip }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin')

  const clerkAppearance = {
    elements: {
      rootBox: 'mx-auto w-full',
      card: 'bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-xl',
      headerTitle: 'text-white text-xl',
      headerSubtitle: 'text-gray-400',
      socialButtonsBlockButton:
        'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 transition-colors',
      socialButtonsBlockButtonText: 'font-medium',
      dividerLine: 'bg-gray-600',
      dividerText: 'text-gray-400',
      formFieldLabel: 'text-gray-300',
      formFieldInput:
        'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500',
      formButtonPrimary:
        'bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors',
      footerActionLink: 'text-orange-500 hover:text-orange-400',
      identityPreviewText: 'text-white',
      identityPreviewEditButton: 'text-orange-500 hover:text-orange-400',
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Logo and branding */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Gauge className="w-12 h-12 text-orange-500" />
          <h1 className="text-3xl font-bold text-white">Kart-Code</h1>
        </div>
        <p className="text-gray-400 max-w-md">
          Engine Analysis Tool - Sign in to sync your sessions across devices
        </p>
      </div>

      {/* Auth form */}
      <div className="w-full max-w-md">
        {mode === 'signin' ? (
          <SignIn
            appearance={clerkAppearance}
            routing="hash"
            afterSignInUrl="/"
          />
        ) : (
          <SignUp
            appearance={clerkAppearance}
            routing="hash"
            afterSignUpUrl="/"
          />
        )}

        {/* Toggle between signin/signup */}
        <div className="mt-6 text-center">
          <p className="text-gray-400">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('signin')}
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Skip option for local-only mode */}
        {onSkip && (
          <div className="mt-4 text-center">
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-400 text-sm underline"
            >
              Continue without signing in (data stored locally only)
            </button>
          </div>
        )}
      </div>

      {/* Features preview */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl text-center">
        <div className="p-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-white font-medium mb-1">Cloud Sync</h3>
          <p className="text-gray-400 text-sm">Access your sessions from any device</p>
        </div>

        <div className="p-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-white font-medium mb-1">iOS App</h3>
          <p className="text-gray-400 text-sm">Record sensor data on your iPhone</p>
        </div>

        <div className="p-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-white font-medium mb-1">Secure</h3>
          <p className="text-gray-400 text-sm">Your data is encrypted and private</p>
        </div>
      </div>
    </div>
  )
}
