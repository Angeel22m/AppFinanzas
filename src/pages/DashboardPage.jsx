import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { IngresosGastosForm } from '../components/IngresosGastosForm'
import { ReporteMensual } from '../components/ReporteMensual'
import { LogOut, RefreshCw, TrendingUp, TrendingDown, PiggyBank, Menu, X } from 'lucide-react'

export function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const [metricas, setMetricas] = useState({
    saldo_actual: 0,
    total_ingresos: 0,
    total_gastos: 0
  })
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadMetricas()
  }, [user, refreshKey])

  const loadMetricas = async () => {
    if (!user) return
    try {
      setMetricsLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('saldo_usuario')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (err) {
        console.error('Error loading metrics:', err)
        setMetricas({
          saldo_actual: 0,
          total_ingresos: 0,
          total_gastos: 0
        })
      } else if (data) {
        setMetricas(data)
      }
    } catch (err) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setMetricsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleTransactionSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 font-medium transition-colors duration-300">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50 border-b border-transparent dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors duration-300">FinanzasApp</h1>
          </div>

          {/* Menu Container */}
          <div className="flex items-center relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white focus:outline-none p-2 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Menu Dropdown */}
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 z-50 transform origin-top-right transition-all">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 mb-2">
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Sesión activa</p>
                  <p className="font-bold text-gray-800 dark:text-white capitalize truncate">{user?.email?.split('@')[0]}</p>
                </div>
                
                <div className="px-2 space-y-1">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors font-medium text-left"
                    onClick={() => { setIsMenuOpen(false); /* Aquí conectarás tu futura página de perfil */ }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Mi Perfil
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium text-left"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 dark:border dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1 transition-colors duration-300">Capital Actual</p>
                <p className={`text-3xl font-bold transition-colors duration-300 ${metricas.saldo_actual >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${metricas.saldo_actual.toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg transition-colors duration-300">
                <PiggyBank className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 dark:border dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1 transition-colors duration-300">Total Ingresos</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 transition-colors duration-300">
                  ${metricas.total_ingresos.toFixed(2)}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg transition-colors duration-300">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 dark:border dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1 transition-colors duration-300">Total Gastos</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 transition-colors duration-300">
                  ${metricas.total_gastos.toFixed(2)}
                </p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg transition-colors duration-300">
                <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {/* Content Section */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white transition-colors duration-300">
              Panel de Control
            </h2>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleTransactionSuccess}
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-lg transition-colors duration-200 flex-1 sm:flex-none font-medium shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
              <IngresosGastosForm onSuccess={handleTransactionSuccess} />
            </div>
          </div>
          
          <ReporteMensual key={refreshKey} onSuccess={handleTransactionSuccess} />
        </div>
      </main>
    </div>
  )
}
