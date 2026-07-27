# Programa addtarea
Programa que va a funcionar dentro de un ecosistema de programas siguiendo la filosofía KISS y UNIX. Los programas están desitnado a la gestión de tareas.
El programa va a vivir en una Raspi 3b que tiene instalado Hermes. Por lo que tiene que ser hiper mega liviano. 
Escrito en python y usable a través de un CLI, siguiendo los principios de los programas UNIX

## Recursos
- Python
- Linux
## Funcionalidad
addtarea titulo_tarea
o
addtarea titulo_tarea "descripción de tarea"

- addtarea va a crear una llamda a este programa
- va a crear un archivo llamado como titulo_tarea con extensión .txt en  ~/tareas/pool/
- Luego el usuario va a poder ingresar el texto que quiera y al dar enter se guarda el archivo
- Si no, podrá usar el campo correspondiente a "descripcion de tarea" para poder poner texto dentro del archivo

