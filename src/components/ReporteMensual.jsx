import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function ReporteMensual() {
  const { user } = useAuth()
  const [saldo, setSaldo] = useState(0)
  const [ingresos, setIngresos] = useState(0)
  const [gastos, setGastos] = useState(0)
  const [categoriaGastos, setCategoriaGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState('pie')

  useEffect(() => {
    const fetchTransacciones = async () => {
      setLoading(true)

      const now = new Date()
      const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      // Obtener todas las transacciones del mes
      const { data: transacciones, error } = await supabase
        .from('transacciones')
        .select(`
          id,
          monto,
          categoria_id,
          categorias:categoria_id (
            id,
            nombre,
            tipo,
            icono_opcional
          )
        `)
        .eq('user_id', user.id)
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        setLoading(false)
        return
      }

      // Agrupar por categoría
      const gastosPorCategoria = {}
      let totalIngresos = 0
      let totalGastos = 0

      transacciones.forEach((tx) => {
        const categoria = tx.categorias
        const es_ingreso = categoria.tipo === 'ingreso'
        const monto = tx.monto

        if (es_ingreso) {
          totalIngresos += monto
        } else {
          totalGastos += monto

          if (!gastosPorCategoria[categoria.id]) {
            gastosPorCategoria[categoria.id] = {
              id: categoria.id,
              nombre: categoria.nombre,
              icono: categoria.icono_opcional,
              total: 0
            }
          }
          gastosPorCategoria[categoria.id].total += monto
        }
      })

      const categoriaArray = Object.values(gastosPorCategoria).sort((a, b) => b.total - a.total)

      setSaldo(totalIngresos - totalGastos)
      setIngresos(totalIngresos)
      setGastos(totalGastos)
      setCategoriaGastos(categoriaArray)
      setLoading(false)
    }

    if (user) {
      fetchTransacciones()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  const colorGastos = '#EF4444'
  const colorIngresos = '#10B981'
  const coloresCategoria = [
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#14B8A6',
    '#06B6D4',
    '#6366F1'
  ]

  const mes = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
          Reporte de {mes}
        </h2>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-medium text-sm">Ingresos</p>
                <p className="text-2xl font-bold text-green-700">${ingresos.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 font-medium text-sm">Gastos</p>
                <p className="text-2xl font-bold text-red-700">${gastos.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className={`bg-gradient-to-br ${saldo >= 0 ? 'from-blue-50 to-cyan-50 border-blue-200' : 'from-orange-50 to-yellow-50 border-orange-200'} border rounded-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium text-sm ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Saldo Actual
                </p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  ${saldo.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Vista */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setViewType('pie')}
            className={`px-4 py-2 font-medium transition-colors ${viewType === 'pie' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Gráfico Circular
          </button>
          <button
            onClick={() => setViewType('bar')}
            className={`px-4 py-2 font-medium transition-colors ${viewType === 'bar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Gráfico de Barras
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`px-4 py-2 font-medium transition-colors ${viewType === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Listado
          </button>
        </div>

        {/* Gráficos */}
        {categoriaGastos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay gastos registrados este mes</p>
          </div>
        ) : (
          <>
            {viewType === 'pie' && (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoriaGastos}
                      dataKey="total"
                      nameKey="nombre"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ nombre, percent }) => `${nombre} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoriaGastos.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={coloresCategoria[index % coloresCategoria.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {viewType === 'bar' && (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoriaGastos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="total" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {viewType === 'list' && (
              <div className="space-y-2">
                {categoriaGastos.map((cat, idx) => {
                  const porcentaje = ((cat.total / gastos) * 100).toFixed(1)
                  return (
                    <div key={cat.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: coloresCategoria[idx % coloresCategoria.length] }}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {cat.icono} {cat.nombre}
                        </p>
                        <div className="w-full bg-gray-300 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">${cat.total.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{porcentaje}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
