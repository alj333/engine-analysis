import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

// Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

// Validate required environment variables
if (!import.meta.env.VITE_CONVEX_URL) {
  console.warn('VITE_CONVEX_URL not set - running in local-only mode')
}

if (!clerkPubKey) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY not set - authentication disabled')
}

function Root() {
  // If no Clerk key, render app without auth (local-only mode)
  if (!clerkPubKey) {
    return <App />
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
