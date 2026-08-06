# Vinculación con Hermes

Hermes es el asistente que gestiona, lee y modifica las tareas de este ecosistema. Corre en la Raspi (servergl44) y opera sobre los programas via CLI.

## Flujo

1. **Gero pide** -> agregar tarea X, postergar Y, que tengo hoy?
2. **Hermes ejecuta** -> addtarea, clatarea, trashtarea
3. **Hermes planifica** -> lee los .json, ordena por urgencia/deadline y ubica en bloques libres

## Que puede hacer Hermes

| Accion | Como |
|--------|------|
| Crear tarea | addtarea + clatarea |
| Modificar tarea | clatarea archivo.json -m campo=valor |
| Postergar | Suma +1 a Postergaciones, corre Deadline un dia |
| Completar | Marca completado: true |
| Mover a papelera | trashtarea |
| Planificar el dia | Lee .json, aplica urgencia, deadline, dependencias, duracion |

## Reglas de planificacion

- Urgencia A > B > C
- A igual urgencia, deadline mas proximo primero
- Si tiene Tarea Padre pendiente, no se agenda
- Se ubica en bloque libre segun Rango de tiempo
- Si se posterga 3+ veces, Hermes pregunta si sigue siendo relevante

## Donde vive

Los programas y datos viven en la Raspi. Hermes los llama directamente.
