---
name: despliegue-nube-obligatorio
description: Procedimiento estricto para ejecutar y desplegar cambios en este proyecto sin delegar al usuario.
trigger: always_on
---

# MANDATO DE EJECUCIÓN Y DESPLIEGUE (CERO EXCUSAS LOCALES)

## 1. Verificación Técnica de Assets (Imágenes)
- **Prohibido** asumir la extensión de una imagen. Antes de modificar el código, verifica la extensión real (`.jpg`, `.png`, `.svg`, `.webp`) mediante comandos en la terminal.
- **Prohibido** hardcodear los atributos `width` y `height` directamente en HTML/Astro; gestiona tamaños mediante CSS.

## 2. Prohibición de Delegar el Despliegue
- Cuando el usuario solicite un cambio, **el cambio debe llegar a la página en vivo** antes de considerarse completado.
- Nunca respondas "ya lo guardé localmente, haz push tú mismo".

## 3. Autenticación a GitHub
- El agente debe usar el **Token de Acceso Personal** provisto a través de la variable de entorno `GITHUB_PAT`.
- El comando de push debe ejecutarse así:
```bash
# Asumiendo que $GITHUB_PAT está definido en el entorno
git push https://$GITHUB_PAT@github.com/FrankBetances/proyectos.git main
```
- No se debe escribir el token en el código ni en los archivos del proyecto.

## 4. Confirmación de Cierre
- El agente solo marca la tarea como finalizada si el `git push` anterior devuelve código de salida `0` y GitHub Actions actualiza la página pública (`https://FrankBetances.github.io/proyectos/earlify`).

---
