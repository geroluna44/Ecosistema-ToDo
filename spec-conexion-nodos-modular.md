Hacer un elemento que dibuje un círculo que se llamará ENTRADA y un triangulo apuntando fuera del nodo
que se llamará SALIDA.
Estos elementos que se llamarán CONECTORES deben dibujarse sobre el borde de los nodos y en una capa superior, quedando por arriba de ellos visualmente. Estos deben tener los mismos colores y border que los nodos.

Estos CONECTORES se ubicarán en el borde de los nodos y deben ubicarse en función de su utilidad.

Al organizarse el dashboard según proyectos (recordar: el botón del borde inferior que funciona como organizador de los nodos), deberá haber un CONECTOR ENTRADA por cada tarea padre que el nodo tenga, y un CONECTOR SALIDA por cada tarea hija que el nodo/tarea tenga.

Lo dicho en el párrafo anterior es solo UNA de las configuraciones posibles. En el futuro se deberá poder implementar otro tipo de organizaciones como "Por urgencia" "Por ubicación" etc. En donde se relacionarán mediante otros datos del .json que no sean tareapadre tareahijo

Estos CONECTORES viven dentro del dashboard de árbol. Dejo al criterio del agente la ubicación del elemento y su relación con otros.

Se debe preparar a los CONECTORES para que se puedan conectar mediante lineas ortogonales que se implementarán en una segunda spec
