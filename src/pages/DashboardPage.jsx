import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { IngresosGastosForm } from '../components/IngresosGastosForm'
import { ReporteMensual } from '../components/ReporteMensual'
import { LogOut, RefreshCw, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">FinanzasApp</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Sesión activa</p>
              <p className="font-medium text-gray-800">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Capital Actual</p>
                <p className={`text-3xl font-bold ${metricas.saldo_actual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${metricas.saldo_actual.toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <PiggyBank className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Ingresos</p>
                <p className="text-3xl font-bold text-green-600">
                  ${metricas.total_ingresos.toFixed(2)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Gastos</p>
                <p className="text-3xl font-bold text-red-600">
                  ${metricas.total_gastos.toFixed(2)}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Formulario */}
          <div className="lg:col-span-1">
            <IngresosGastosForm onSuccess={handleTransactionSuccess} />
          </div>

          {/* Main - Reporte */}
          <div className="lg:col-span-3">
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleTransactionSuccess}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar Datos
              </button>
            </div>
            <ReporteMensual key={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  )
}
