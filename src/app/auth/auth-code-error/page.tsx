export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-4">There was a problem signing you in.</p>
        <a href="/login" className="text-blue-600 hover:underline">
          Try again
        </a>
      </div>
    </div>
  )
}