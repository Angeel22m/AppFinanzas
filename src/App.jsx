import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { useEffect, useState } from 'react'
import { Sun, Moon, AlertCircle, X } from 'lucide-react'

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })
  const [authErrorAlert, setAuthErrorAlert] = useState(false)

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('error')) {
      setAuthErrorAlert(true)
      window.history.replaceState({}, document.title, window.location.pathname)
      
      const timer = setTimeout(() => setAuthErrorAlert(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <AuthProvider>
      <Router basename="/AppFinanzas">
        {/* Alerta flotante para error de verificación */}
        {authErrorAlert && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-md">
            <div className="bg-white dark:bg-slate-800 border-l-4 border-red-500 shadow-2xl rounded-xl p-4 flex items-start gap-4 ring-1 ring-black/5 dark:ring-white/10">
              <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-full flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 pt-0.5">
                <h3 className="text-gray-900 dark:text-white font-bold text-sm">Enlace no válido</h3>
                <p className="text-gray-600 dark:text-slate-300 text-sm mt-1 leading-snug">
                  El enlace de verificación ha expirado o ya fue utilizado. Por favor, solicita uno nuevo.
                </p>
              </div>
              <button 
                onClick={() => setAuthErrorAlert(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                aria-label="Cerrar alerta"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="fixed bottom-4 right-4 p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-200 dark:border-slate-700 z-50 transition-colors duration-200 hover:scale-105"
          aria-label="Toggle Dark Mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-6 h-6 text-yellow-500" />
          ) : (
            <Moon className="w-6 h-6 text-slate-700" />
          )}
        </button>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App