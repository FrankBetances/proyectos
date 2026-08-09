#!/bin/bash
# Workflow de Despliegue Automático (Cero Intervención del Usuario)

# 1. Comprobar si hay un mensaje de commit proporcionado
COMMIT_MSG=${1:-"chore: auto-deploy de cambios realizados por el asistente IA"}

echo "🚀 Iniciando despliegue automático..."

# 2. Agregar cambios
git add .

# 3. Hacer commit
git commit -m "$COMMIT_MSG"

# 4. Hacer push utilizando el PAT seguro con BypassSandbox
# El asistente IA TIENE PROHIBIDO delegar este paso al usuario.
if [ -f ".agents/workflows/.github_pat" ]; then
  GITHUB_PAT=$(cat .agents/workflows/.github_pat)
else
  echo "❌ Error: Archivo .github_pat no encontrado. El asistente debe crearlo o solicitarlo al usuario."
  exit 1
fi

git push https://FrankBetances:${GITHUB_PAT}@github.com/FrankBetances/proyectos.git main

if [ $? -eq 0 ]; then
  echo "✅ Despliegue completado con éxito."
else
  echo "❌ Error en el despliegue. Intentando pull con rebase..."
  git pull --rebase https://FrankBetances:${GITHUB_PAT}@github.com/FrankBetances/proyectos.git main
  git push https://FrankBetances:${GITHUB_PAT}@github.com/FrankBetances/proyectos.git main
  
  if [ $? -eq 0 ]; then
    echo "✅ Despliegue completado con éxito tras el rebase."
  else
    echo "❌ Falla crítica en el despliegue. Revisa los conflictos."
    exit 1
  fi
fi
