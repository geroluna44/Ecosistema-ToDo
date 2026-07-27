# Programa clatarea
Programa que va a funcionar dentro de un ecosistema de programas siguiendo la filosofía KISS y UNIX. Los programas están desitnado a la gestión de tareas.
El programa va a vivir en una Raspi 3b que tiene instalado Hermes. Por lo que tiene que ser hiper mega liviano. 
Escrito en python y usable a través de un CLI, siguiendo los principios de los programas UNIX

## Recursos
- Python
- Linux
## Funcionalidad
'''
clatarea [archivo.txt] [Propiedad(es) a modificar] [Info,Info2]
'''
Lee de ~/tareas/pool/ un archivo .txt
y lo transforma en una tarea .json que se titula con la fecha y hora de creación
    ej.:
    20260727183902.json
el archivo puede contener
    {
        "Nombre": "Barrer pieza",
        "Lugar de trabajo": "Casa",
        "Proyecto" : "Limpiar a fondo",
        "Descripcion" : "Barrer el piso que es un asco. Prestar atención a la esquina derecha"
        "Primer paso" : "Buscar el escobillón",
        "Rango de tiempo" : 20,
        "Postergaciones" : 1,
        "Urgencia" : "A",
        "Deadline" : 20260728120000,
        "Tarea Padre" : "20260727183901.json",
        "Tarea hija" : "20260727183900.json",
    }
El nombre del archivo .txt pasará al campo "Nombre" y se tomará el dia, hora y segundo de sistema para el titulo. Si ya hay un archivo con el mismo nombre, añadir un b, c, d, e, etc al final del nombre del archivo nuevo

En el segundo campo (propiedades) se ingresará las propiedades a modificar en formato array (lugar,proyecto,descripcion) para luego ingresar la información en el campo siguiente también con un array coincidente (casa,limpieza,"limpiar la habitacion")

En vez de un archivo, se puede ingresar directamente el nombre de la tarea
'''
    clatarea "Mover cables" [lugar,proyecto,descripcion] [Casa,"Instalar aire","Traer cables del auto"]
'''

