# Mandato de Verificación Estricta: Cero Declaraciones Falsas

## Directivas Fundamentales:
1. **Nunca declarar éxito sin verificación empírica previa**:
   - Antes de afirmar al usuario que una tarea ha sido realizada, desplegada o publicada, el asistente TIENE la obligación estricta de ejecutar un comando de verificación (ej. `git log origin/main`, verificación de código de salida 0, o inspección del estado remoto).
   - Editar o modificar un archivo local NO equivale a haber completado la tarea en producción o repositorio remoto.

2. **Transparencia y Diagnóstico en Caso de Fallos**:
   - Si un comando o `git push` requiere elevación de permisos, autenticación interactiva o falla silenciosamente, se debe reportar inmediatamente el diagnóstico real al usuario sin asumir éxito prematuro.

3. **Verificación Obligatoria de Despliegue**:
   - Proveer siempre el identificador único de verificación empírica (ej. SHA del commit en GitHub, resultado de tests o respuesta de servidor) al comunicar un resultado.
