#!/bin/bash
# Iniciar servidor de tareas para desarrollo
# Uso: ./serve-tasks.sh

TASKS_DIR="$HOME/tareas/clasificadas"

if [ ! -d "$TASKS_DIR" ]; then
    echo "Error: $TASKS_DIR no existe"
    exit 1
fi

echo "Iniciando servidor de tareas en http://localhost:8080"
echo "Sirviendo: $TASKS_DIR"
echo "Presiona Ctrl+C para detener"

cd "$TASKS_DIR"
python3 -m http.server 8080
