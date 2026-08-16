# filename-fixer

## Acerca de

`filename-fixer` es una GitHub Action para corregir nombres de archivo en un repositorio.

> **Estado:** proyecto en fase temprana (alpha). La lógica de corrección de nombres de archivo todavía no está implementada; por ahora el código es un andamiaje base para la Action.

### ¿Qué significa "corregir"?

La idea es que la Action detecte (y, si `fix: true`, corrija automáticamente) nombres de archivo que no sigan un formato consistente. Las reglas previstas son:

- **Convertir a minúsculas**: `Foto.JPG` → `foto.jpg`
- **Reemplazar espacios y símbolos por guiones**: `mi foto final.jpg` → `mi-foto-final.jpg`
- **Quitar acentos y caracteres no ASCII**: `canción.mp3` → `cancion.mp3`

## Uso

Agrega la Action a un workflow de GitHub Actions:

```yaml
- uses: piruetasxyz/filename-fixer@main
  with:
    fix: 'false'
```

### Entradas (inputs)

| Nombre | Descripción | Requerido | Valor por defecto |
| --- | --- | --- | --- |
| `fix` | Corregir o no los problemas automáticamente | No | `false` |

### Salidas (outputs)

| Nombre | Descripción |
| --- | --- |
| `time` | Tiempo tomado en corregir problemas |

## Desarrollo

Este proyecto usa Node.js y las librerías `@actions/core` y `@actions/github`.

```bash
npm install
```

El punto de entrada está en [index.js](index.js), y el código compilado para la Action vive en `dist/`.

## Licencia

[MIT](LICENSE)
