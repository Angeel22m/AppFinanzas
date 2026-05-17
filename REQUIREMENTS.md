# 📦 Requisitos del Sistema - Finanzas App

## Versiones Recomendadas

| Software | Versión Mínima | Versión Recomendada |
|----------|---|---|
| **Node.js** | 16.x | 20.x LTS |
| **npm** | 8.x | 10.x |
| **Git** | 2.x | Cualquier versión reciente |

## 🔧 ¿Cómo Instalar?

### Windows

#### Opción 1: Usar Script Automático (RECOMENDADO)

**PowerShell (Recomendado):**
1. Click derecho en `instalar-nodejs.ps1`
2. "Run with PowerShell"
3. Si te pide permisos, elige "Yes to All"

**CMD Batch:**
1. Doble-click en `instalar-nodejs.bat`
2. O ejecuta desde cmd como administrador:
   ```cmd
   instalar-nodejs.bat
   ```

#### Opción 2: Instalación Manual
1. Ve a https://nodejs.org/
2. Descarga **v20.x LTS** (64-bit)
3. Instala siguiendo el wizard (todo por defecto está bien)
4. Reinicia tu PC
5. Abre una nueva terminal y verifica:
   ```cmd
   node --version
   npm --version
   ```

### macOS

```bash
# Usando Homebrew (recomendado)
brew install node@20

# O desde nodejs.org
https://nodejs.org/ → Descarga v20.x LTS
```

### Linux (Ubuntu/Debian)

```bash
# Usando NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## ✅ Verificar Instalación

Una vez instalado, abre una **NUEVA terminal** y ejecuta:

```bash
node --version
# Deberías ver: v20.x.x

npm --version
# Deberías ver: 10.x.x o superior
```

## 🚀 Después de Instalar Node.js

1. Abre una nueva terminal en la carpeta del proyecto:
   ```bash
   cd "c:\Users\mmois\Downloads\Proyecto-Compiladores-Conversor-de-Divisas-main\finanzas-app"
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abre en navegador: **http://localhost:5173/finanzas-app**

## 📋 Dependencias del Proyecto

Una vez que instales Node.js, `npm install` descargará automáticamente:

- React 18.2
- Vite 5.0
- Tailwind CSS 3.3
- Supabase JS 2.38
- Recharts 2.10
- Lucide React (iconos)
- Y más...

**Total:** ~300 MB (todo automático)

## 🆘 Troubleshooting

### "npm is not recognized"
→ Node.js no está en el PATH. Reinicia la terminal o tu PC después de instalar.

### "node_modules no se crea"
→ Ejecuta: `npm cache clean --force` y luego `npm install` de nuevo

### Port 5173 en uso
→ El servidor ya está corriendo. O cambia el puerto en `vite.config.js`

### Permisos denegados (macOS/Linux)
→ Usa `sudo` o instala NVM: https://github.com/nvm-sh/nvm

---

**¿Tienes Node.js instalado? Confirma con `node --version` en tu terminal.**
