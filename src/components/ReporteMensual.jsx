import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'

export function ReporteMensual({ onSuccess }) {
  const { user } = useAuth()
  const [saldo, setSaldo] = useState(0)
  const [ingresos, setIngresos] = useState(0)
  const [gastos, setGastos] = useState(0)
  const [categoriaGastos, setCategoriaGastos] = useState([])
  const [transaccionesRaw, setTransaccionesRaw] = useState([])
  const [categoriasLista, setCategoriasLista] = useState([])
  const [editingTx, setEditingTx] = useState(null)
  const [deletingTx, setDeletingTx] = useState(null)
  const [editForm, setEditForm] = useState({ monto: '', descripcion: '', categoria_id: '' })
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState('pie')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [periodo, setPeriodo] = useState('mensual')

  useEffect(() => {
    const fetchTransacciones = async () => {
      setLoading(true)

      let query = supabase
        .from('transacciones')
        .select(`
          id,
          monto,
          fecha,
          descripcion,
          categoria_id,
          categorias:categoria_id (
            id,
            nombre,
            tipo,
            icono_opcional
          )
        `)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })

      if (periodo === 'mensual') {
        const primerDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
        const ultimoDia = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()
        query = query.gte('fecha', primerDia).lte('fecha', ultimoDia)
      } else if (periodo === 'anual') {
        const primerDia = new Date(currentDate.getFullYear(), 0, 1).toISOString()
        const ultimoDia = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59).toISOString()
        query = query.gte('fecha', primerDia).lte('fecha', ultimoDia)
      }

      const { data: transacciones, error } = await query

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
      setTransaccionesRaw(transacciones)
      setLoading(false)
    }

    if (user) {
      fetchTransacciones()
    }
  }, [user, currentDate, periodo])

  useEffect(() => {
    const fetchCategorias = async () => {
      const { data } = await supabase.from('categorias').select('*').order('nombre')
      if (data) setCategoriasLista(data)
    }
    fetchCategorias()
  }, [])

  const handleDeleteClick = (tx) => {
    setDeletingTx(tx)
  }

  const confirmDelete = async () => {
    if (!deletingTx) return;
    const { error } = await supabase.from('transacciones').delete().eq('id', deletingTx.id)
    if (!error && onSuccess) onSuccess()
    setDeletingTx(null)
  }

  const handleEditClick = (tx) => {
    setEditingTx(tx)
    setEditForm({
      monto: tx.monto.toString(),
      descripcion: tx.descripcion || '',
      categoria_id: tx.categoria_id
    })
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('transacciones').update({
      monto: parseFloat(editForm.monto),
      descripcion: editForm.descripcion || null,
      categoria_id: editForm.categoria_id
    }).eq('id', editingTx.id)
    
    if (!error) {
      setEditingTx(null)
      if (onSuccess) onSuccess()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 dark:text-slate-400 transition-colors duration-300">Cargando datos...</p>
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

  let tituloReporte = ''
  if (periodo === 'mensual') {
    tituloReporte = `Reporte de ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
  } else if (periodo === 'anual') {
    tituloReporte = `Reporte del ${currentDate.getFullYear()}`
  } else {
    tituloReporte = 'Reporte General'
  }

  const handlePrev = () => {
    if (periodo === 'mensual') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    } else if (periodo === 'anual') {
      setCurrentDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))
    }
  }

  const handleNext = () => {
    if (periodo === 'mensual') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    } else if (periodo === 'anual') {
      setCurrentDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 dark:border dark:border-slate-700 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white capitalize transition-colors duration-300">
            {tituloReporte}
          </h2>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-colors cursor-pointer"
            >
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
              <option value="general">General</option>
            </select>

            {periodo !== 'general' && (
              <div className="flex items-center bg-gray-50 dark:bg-slate-700/50 rounded-lg p-1 border border-gray-200 dark:border-slate-600">
                <button onClick={handlePrev} className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors shadow-sm" title="Anterior">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())} 
                  className="px-3 py-1 text-sm font-medium hover:bg-white dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors rounded-md"
                >
                  Hoy
                </button>
                <button onClick={handleNext} className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors shadow-sm" title="Siguiente">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-6 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-medium text-sm">Ingresos</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">${ingresos.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-6 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 font-medium text-sm">Gastos</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">${gastos.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className={`bg-gradient-to-br ${saldo >= 0 ? 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800/50' : 'from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800/50'} border rounded-lg p-6 transition-colors duration-300`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium text-sm ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Saldo Actual
                </p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                  ${saldo.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Vista */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300 pb-2">
          <button
            onClick={() => setViewType('pie')}
            className={`px-4 py-2 font-medium transition-colors ${viewType === 'pie' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
          >
            Gráfico Circular
          </button>
          <button
            onClick={() => setViewType('bar')}
            className={`px-4 py-2 font-medium transition-colors ${viewType === 'bar' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
          >
            Gráfico de Barras
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`px-4 py-2 font-medium transition-colors ${viewType === 'list' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
          >
            Listado
          </button>
          <button
            onClick={() => setViewType('historial')}
            className={`px-4 py-2 font-medium transition-colors ${viewType === 'historial' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
          >
            Historial
          </button>
        </div>

        {/* Gráficos */}
        {transaccionesRaw.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-slate-400 text-lg transition-colors duration-300">No hay transacciones en este periodo</p>
          </div>
        ) : (
          <>
            {(viewType === 'pie' || viewType === 'bar' || viewType === 'list') && categoriaGastos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-slate-400 text-lg transition-colors duration-300">No hay gastos en este periodo</p>
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
                    <div key={cat.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors duration-300">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: coloresCategoria[idx % coloresCategoria.length] }}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-white transition-colors duration-300">
                          {cat.icono} {cat.nombre}
                        </p>
                        <div className="w-full bg-gray-300 dark:bg-slate-600 rounded-full h-2 mt-1 transition-colors duration-300">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 dark:text-white transition-colors duration-300">${cat.total.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400 transition-colors duration-300">{porcentaje}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
              </>
            )}

            {viewType === 'historial' && (
              <div className="space-y-3">
                {transaccionesRaw.map((tx) => {
                  const es_ingreso = tx.categorias.tipo === 'ingreso'
                  return (
                    <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg border border-gray-100 dark:border-slate-700 transition-colors duration-300">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`p-2 rounded-lg ${es_ingreso ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                          {tx.categorias.icono_opcional || (es_ingreso ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 dark:text-white capitalize">{tx.descripcion || tx.categorias.nombre}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {new Date(tx.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto mt-3 sm:mt-0 gap-4">
                        <p className={`font-bold ${es_ingreso ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {es_ingreso ? '+' : '-'}${tx.monto.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditClick(tx)} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteClick(tx)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Edición */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden dark:border dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Editar Transacción</h3>
              <button onClick={() => setEditingTx(null)} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Categoría</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                  {categoriasLista.map((cat) => {
                    const isSelected = editForm.categoria_id === cat.id;
                    const isIngreso = cat.tipo === 'ingreso';
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, categoria_id: cat.id })}
                        className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-center transition-all duration-200 ${
                          isSelected 
                            ? (isIngreso 
                                ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/40 dark:border-green-500 dark:text-green-300 ring-2 ring-green-500/20' 
                                : 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-300 ring-2 ring-red-500/20')
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-slate-600'
                        }`}
                      >
                        <span className="text-2xl">{cat.icono_opcional}</span>
                        <span className="text-xs font-medium w-full break-words leading-tight">{cat.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.monto}
                    onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={editForm.descripcion}
                    onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingTx(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Actualizar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deletingTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden dark:border dark:border-slate-700 p-6 text-center transform transition-all">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">¿Eliminar Transacción?</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Estás a punto de eliminar el registro de <strong>${deletingTx.monto.toFixed(2)}</strong> en la categoría {deletingTx.categorias?.nombre}. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingTx(null)} 
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
