import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const { signIn, signUp, error: authError } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // OTP States
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpType, setOtpType] = useState('signup')
  const [message, setMessage] = useState(null)
  
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
    setMessage(null)

    if (!validateForm()) return

    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
        setError(null)
        setMessage('Hemos enviado un código de 6 dígitos a tu correo. Por favor, ingrésalo para verificar tu cuenta.')
        setOtpType('signup')
        setShowOtpInput(true)
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

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido para enviarte el código')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email })
      if (err) throw err
      setMessage('Hemos enviado un código de 6 dígitos a tu correo.')
      setOtpType('email')
      setShowOtpInput(true)
    } catch (err) {
      setError(err.message || 'Error al enviar el código')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length < 6) {
      setError('El código debe tener 6 dígitos')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: otpType
      })
      if (err) throw err
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Código inválido o expirado. Solicita uno nuevo.')
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
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-400 text-sm font-medium">{displayError}</p>
            </div>
          )}

          {/* Success/Message Banner */}
          {message && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-500/50 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-800 dark:text-emerald-300 text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Form */}
          {!showOtpInput ? (
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
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="w-5 h-5 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Código de 6 dígitos"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-600/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-700/50 transition-all text-center tracking-widest text-lg font-mono"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full mt-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Verificar código</span>
                    <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtpInput(false)
                  setMessage(null)
                  setError(null)
                  setOtp('')
                }}
                disabled={loading}
                className="w-full py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors text-sm font-medium"
              >
                Volver
              </button>
            </form>
          )}

          {/* Toggle Auth Mode */}
          {!showOtpInput && (
            <div className="mt-6 space-y-4 text-center">
              <p className="text-gray-500 dark:text-slate-400 text-sm transition-colors duration-300">
                {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError(null)
                    setMessage(null)
                    setConfirmPassword('')
                  }}
                  disabled={loading}
                  className="text-blue-600 dark:text-emerald-400 hover:text-blue-500 dark:hover:text-emerald-300 font-semibold transition-colors disabled:opacity-50"
                >
                  {isSignUp ? 'Inicia sesión' : 'Regístrate'}
                </button>
              </p>
              
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors"
                >
                  Ingresar con código por email
                </button>
              )}
            </div>
          )}

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
