Hasta ahora hay 3 vistas:
- Vista de arbol
- Vista calendario
- Vista de nodos

Las últimas 2 no están implementadas. Pero quiero añadir una cuarta, que se posicionará arriba de la vista de arbol: Vista de lista

Esta nueva vista de lista será el dashboard principal. Al abrir la web, debería mandar a este modo de vista

# Los 3 modos
El modo de vista debe tener tres modos que se seleccionarán en un botón abajo centrado al estilo de "Ordenar" del dashboard de arbol:
- Clasificadas
- Pool
- Clasificadas + Pool

Por defecto, debe abrir Clasificadas.

## Clasificadas

Deben aparecer las tareas en modo de cuadro. Cada fila es una tarea y cada columna un dato del json
Las columnas deben decir en orden:
- ID (nombre del archivo)
- Nombre
- Proyecto
- Descripcion
- Urgencia
- Tarea padre/Tarea hijo
- Deadline

Al hacer click, se debe desplegar una vista que permita ver toda la información pertinente a la tarea

Arriba de cada columna debe decir el dato al que corresponde. Al hacer click en el dato se debe poder ordenar las tareas de menor a mayor o mayor a menor según el parámetro.

También debe tener arriba a la derecha un botón "filtro avanzado" en donde se debe poder filtrar según el dato ingresado o mezclando varios datos. Total énfasis en el filtro por Proyecto que debería aparecer primero en este menú.

## Pool
Deben aparecer las tareas del Pool al estilo de la vista de Clasificadas. En vez del botón "filtro avanzado" tiene un "Buscar" que buscará por palabra dentro de la descripcion de cada .txt
Son solamente dos columnas: el nombre y la descripción

## Clasificadas + Pool
Se deben mezclar ambas vistas a fin de poder usar modtarea.py para transformar las tareas del pool en tareas clasificadas.
Se debe ver a la izquierda las tareas Pool y a la derecha las tareas Clasificadas. Ambas con su vista definida en los dos titulos anteriores. En caso de vista de celular, una vista debe estar debajo de la otra (abajo debe estar clasificadas)

# Elementos
Abajo a la izquierda situar el elemento del botón + que despliega el menú para addtarea y modtarea del dashboard de arbol. Refactorizar para universalizar, si hace falta.

Abajo a la derecha un zoom para agrandar y achicar la letra. Siguiendo el siguiente esquema:
[-100+ | <]
[>]
Se debe poder desplegar y replegar.

El topbar debe ser igual al resto de las vistas, conservando el menú de hamburguesa. Si es necesario, refactorizar para universalizar.
