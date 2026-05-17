import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Plus } from 'lucide-react'

export function IngresosGastosForm({ onSuccess }) {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error: err } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre')

      if (err) {
        setError(err.message)
      } else {
        setCategorias(data)
      }
    }

    fetchCategorias()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!monto || !categoriaId) {
      setError('Por favor completa todos los campos')
      setLoading(false)
      return
    }

    try {
      const { error: err } = await supabase.from('transacciones').insert({
        user_id: user.id,
        monto: parseFloat(monto),
        descripcion: descripcion || null,
        categoria_id: categoriaId,
        fecha: new Date().toISOString()
      })

      if (err) throw err

      setMonto('')
      setDescripcion('')
      setCategoriaId('')
      setIsOpen(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium shadow-sm flex-1 sm:flex-none"
      >
        <Plus className="w-5 h-5" />
        Registrar Transacción
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden dark:border dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Nueva Transacción
              </h2>
              <button onClick={() => setIsOpen(false)} type="button" className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm transition-colors duration-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Categoría
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                  {categorias.map((cat) => {
                    const isSelected = categoriaId === cat.id;
                    const isIngreso = cat.tipo === 'ingreso';
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoriaId(cat.id)}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
                    placeholder="Ej: Almuerzo"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
