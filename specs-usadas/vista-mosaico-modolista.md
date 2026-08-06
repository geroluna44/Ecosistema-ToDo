# Modo mosaico
## Acciones principales a realizar
- Eliminar el toggle de Zoom Controls y añadir uno que permita cambiar de modo standar a moscaico.
- Crear una disposición que conserve las caracteristicas de la vista de lista, pero que condense las caracteristicas de la tarea en un mosaico al estilo del elemento de información adicional del arbol de nodos.
- Se debe conservar el filtro por caracteristicas de arriba (Lugar, Proyecto, Descripcion, Primer paso, etc). Los mismos deben ser funcionales y deben permitir ocultar o mostar información dentro de los mosaicos
- Conservar filtro avanzado y su funcionalidad
## Features
- Tareas en forma de mosaico dentro de la vista de lista
- Información del .json filtrada según los filtros detallados en el header de la lista
- Disposición en filas de tareas
- Enmarcados al estilo de los nodos del arbol de nodos
- Priorizar legibilidad a detallado

## Happy path
- Usuario cambia al modo mosaico y puede deslizarse viendo sus tareas
- Añade el filtro "Postergaciones" para ver cuales tareas están postergadas
- Busca en el filtro avanzado el proyecto "Arreglar compu" para ver las tareas correspondientes a tal proyecto
- Hace click en una tarea, en el toggle de modificación, hace click en el lapiz y modifica la tarea en el submenu "Editar tarea"
- Hace click en guardar y puede seguir navegando en las tareas
