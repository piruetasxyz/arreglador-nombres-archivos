# arreglador-nombres-archivos

## Acerca de

`arreglador-nombres-archivos` es una GitHub Action que detecta (y, si se le pide, corrige) nombres de archivo que no siguen un formato consistente en un repositorio.

### ¿Qué significa "corregir"?

Para cada archivo del repositorio (sin contar archivos/carpetas ocultos ni `node_modules/`), la Action calcula un nombre normalizado aplicando estas reglas:

- **Convertir a minúsculas**: `Foto.JPG` → `foto.jpg`
- **Reemplazar espacios y símbolos por guiones**: `mi foto final.jpg` → `mi-foto-final.jpg`
- **Quitar acentos y caracteres no ASCII**: `canción.mp3` → `cancion.mp3`

Si el nombre normalizado difiere del original, se considera un archivo a corregir. Cuando dos o más archivos de una misma carpeta terminarían con el mismo nombre normalizado (por ejemplo `café.jpg` y `cafe.jpg`), ese renombrado se omite y se reporta como conflicto en vez de sobrescribir un archivo existente.

Se exceptúan de estas reglas archivos convencionales como `README.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AUTHORS.md` y `NOTICE.md` (sin distinguir mayúsculas/minúsculas), que se dejan con su nombre original.

Para archivos `.ino` (sketches de Arduino) y `.pde` (sketches de Processing), los espacios y símbolos se reemplazan por guiones bajos (`_`) en vez de guiones (`-`), ya que estos IDEs no permiten guiones en nombres de sketch: `mi sketch.ino` → `mi_sketch.ino`.

## Uso

```yaml
- uses: piruetasxyz/arreglador-nombres-archivos@main
  with:
    arreglar: true
```

Con `arreglar: false` (valor por defecto) la Action solo detecta y reporta los archivos con nombres no normalizados, sin modificarlos.

### Entradas (inputs)

| Nombre | Descripción | Requerido | Valor por defecto |
| --- | --- | --- | --- |
| `arreglar` | Si es `true`, renombra los archivos automáticamente; si es `false`, solo detecta y reporta | No | `false` |

### Salidas (outputs)

| Nombre | Descripción |
| --- | --- |
| `hay_cambios` | `true` si se detectaron (o corrigieron) archivos con nombres no normalizados |
| `time` | Tiempo tomado en corregir problemas |

### Reporte `cambios.txt`

Cuando hay cambios o conflictos, la Action escribe un archivo `cambios.txt` en la raíz del repositorio con el detalle en formato Markdown, listo para usarse como cuerpo de un comentario de PR.

### Ejemplo: corregir y comentar en cada push

```yaml
permissions:
  contents: write

name: comprobar nombres de archivos

on:
  push:
    branches:
      - main

jobs:
  nombres:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Ejecutar action
        id: nombres
        uses: piruetasxyz/arreglador-nombres-archivos@v0.2.2
        with:
          arreglar: true

      - name: Comentar en PR (sin spam)
        if: steps.nombres.outputs.hay_cambios == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('cambios.txt', 'utf8');

            const { owner, repo } = context.repo;
            const issue_number = context.issue.number;

            const comments = await github.rest.issues.listComments({
              owner,
              repo,
              issue_number
            });

            const botComment = comments.data.find(c =>
              c.user.type === 'Bot' &&
              c.body.includes('### 🔧 Archivos renombrados')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner,
                repo,
                comment_id: botComment.id,
                body
              });
            } else {
              await github.rest.issues.createComment({
                owner,
                repo,
                issue_number,
                body
              });
            }

      - name: Commit cambios
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"
          git add .
          git diff --staged --quiet || git commit -m "chore: normalizar nombres de archivos"
          git push origin HEAD:${{ github.head_ref || github.ref_name }}
```

> El paso "Comentar en PR" usa `context.issue.number`, que solo existe en eventos de pull request. En un workflow disparado por `push` (como el de arriba) ese paso no encontrará un issue/PR al cual comentar; identifícalo desde `context.payload` o dispara el workflow con `pull_request` si necesitas el comentario.

## Desarrollo

Este proyecto usa Node.js y `@actions/core`.

```bash
npm install
npm run build   # empaqueta index.js en dist/index.js con ncc
```

El punto de entrada está en [index.js](index.js), y el código compilado para la Action (el que realmente se ejecuta) vive en `dist/index.js`. Tras modificar `index.js` hay que correr `npm run build` y commitear `dist/`.

## Licencia

[MIT](LICENSE)
