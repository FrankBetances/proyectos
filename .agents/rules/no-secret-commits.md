# Regla obligatoria: Evitar cometer secretos (PAT, claves, contraseñas) en el repositorio

## Propósito
Esta regla se crea para garantizar que **ningún token de acceso personal (PAT) u otro secreto** sea incluido en los commits del proyecto. Evita que GitHub Push Protection bloquee los pushes y asegura el cumplimiento de los mandatos de despliegue automático.

## Alcance
- Se aplica a **todos los archivos** dentro del workspace `Documentos locales/Paginas web`.
- Se ejecuta en **cada commit** y antes de cualquier `git push` automatizado.

## Directrices
1. **No hardcodear tokens**
   - Nunca escribir directamente un PAT, API key, contraseñas o certificados en el código o en archivos de configuración.
   - Utilizar variables de entorno (`process.env.GITHUB_PAT`) o secretos de CI/CD.
2. **Uso de placeholder en reglas de despliegue**
   - En el archivo `.agents/rules/despliegue-nube-obligatorio.md` sustituir la línea con token por un comentario que indique que el token debe ser provisto a través de una variable de entorno:
   ```bash
   # git push command – token removed for security; use $GITHUB_PAT environment variable
   ```
3. **Pre‑commit hook**
   - Añadir un hook `pre-commit` que invoque `git secrets --scan` o `detect-secrets` para escanear cambios en busca de patrones de secretos.
   - Si se detecta un secreto, abortar el commit y mostrar mensaje de error.
4. **CI validation**
   - Configurar GitHub Actions con el job `secret-scan` que falle si algún secreto está presente en el repo.
5. **Limpieza de historial**
   - Si accidentalmente un secreto queda en el historial, usar `git filter-repo --replace-text` para eliminarlo y forzar el push.

## Implementación automática (ejemplo de script)
```bash
#!/usr/bin/env bash
# pre‑commit hook
if command -v git &>/dev/null && command -v grep &>/dev/null; then
  # Busca patrones típicos de PAT de GitHub
  if git diff --cached --name-only | xargs grep -E "ghp_[A-Za-z0-9]{36}" --null; then
    echo "Error: Se ha detectado un GitHub PAT en los archivos preparados para commit."
    echo "Elimine el token o reemplácelo por una variable de entorno antes de continuar."
    exit 1
  fi
fi
exit 0
```
Guarde este script como `.git/hooks/pre-commit` y hágalo ejecutable (`chmod +x .git/hooks/pre-commit`).

## Cumplimiento
- **Antes de cada push** el agente verificará que el archivo `despliegue-nube-obligatorio.md` no contenga un token literal.
- Si la verificación falla, el push será abortado y se mostrará una advertencia al usuario.
- Esta regla se considera **obligatoria** y no puede ser sobrescrita por configuraciones locales.
