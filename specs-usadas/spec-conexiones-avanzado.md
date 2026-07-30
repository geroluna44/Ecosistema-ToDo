Los CONECTORES padre e hijo de dos nodos/tareas conectados deberán unirse visualmente por una linea ortogonal que deberá poder transformarse según se vayan moviendo los elementos en el dashboard. Es decir, no deberá tener una posición fija en el espacio, si no que se calculará según las posiciones de los nodos que se conectan.

Los CONECTORES deben ser clickie. Al hacer click en un conector y arrastrar haacia otro nodo, a una distancia de 15px se debe empezar a dibujar con transparencia el conector que debería existir ahí si se conectara.
Si se suelta el conector arriba o al costado (15px) de otro nodo, deberá modificar los datos del .json utilizando clatarea. Según la lógica que se está utilizando en el dashboard (por ejemplo, por proyecto) se deberá modificar los padres e hijos, siendo el nodo conectado el hijo y el conector el padre

Además, en el desplegable de los nodos (donde se encuentra información, el boton de papelera y editar) debe haber un botón que diga Moodificar conexiones, en donde se dibuje dos nuevos conectores fantasma (con transparencia) arriba y abajo y permita arrastrar para realizar la función detallada en los parrafos anteriores.
