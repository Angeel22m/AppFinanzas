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
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 space-y-4 dark:border dark:border-slate-700 transition-colors duration-300">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 transition-colors duration-300">
        <Plus className="w-5 h-5" />
        Registrar Transacción
      </h2>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm transition-colors duration-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors duration-300">
          Categoría
        </label>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
        >
          <option value="">Selecciona una categoría</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icono_opcional} {cat.nombre} ({cat.tipo})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors duration-300">
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
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors duration-300">
          Descripción (opcional)
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
          placeholder="Ej: Almuerzo en la oficina"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg transition-colors"
      >
        {loading ? 'Guardando...' : 'Registrar'}
      </button>
    </form>
  )
}
