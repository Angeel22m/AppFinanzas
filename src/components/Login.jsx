import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function Login() {
  const navigate = useNavigate()
  const { signIn, signUp, error: authError } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido')
      return false
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (isSignUp && password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
        setError(null)
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setIsSignUp(false)
        alert('Cuenta creada exitosamente. Por favor inicia sesión.')
      } else {
        await signIn(email, password)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Error al procesar tu solicitud')
    } finally {
      setLoading(false)
    }
  }

  const displayError = error || authError

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 transition-colors duration-300">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-md z-10">
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl p-8 transition-colors duration-300">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg mb-4">
              <span className="text-white font-bold text-xl">₲</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 transition-colors duration-300">FinanzasApp</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm transition-colors duration-300">
              {isSignUp ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
            </p>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm font-medium">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-600/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-700/50 transition-all"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-600/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-700/50 transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-slate-400 hover:text-blue-500 dark:hover:text-emerald-400 transition-colors"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Confirm Password Input (only for signup) */}
            {isSignUp && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma contraseña"
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-600/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-700/50 transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-slate-400 hover:text-blue-500 dark:hover:text-emerald-400 transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 dark:text-slate-400 text-sm transition-colors duration-300">
              {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setConfirmPassword('')
                }}
                disabled={loading}
                className="text-blue-600 dark:text-emerald-400 hover:text-blue-500 dark:hover:text-emerald-300 font-semibold transition-colors disabled:opacity-50"
              >
                {isSignUp ? 'Inicia sesión' : 'Regístrate'}
              </button>
            </p>
          </div>

          {/* Footer info */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700/50 transition-colors duration-300">
            <p className="text-gray-400 dark:text-slate-500 text-xs text-center transition-colors duration-300">
              Tu información está protegida con encriptación de nivel empresarial
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
