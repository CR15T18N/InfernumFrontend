#!/bin/bash
set -e
set -x
ANGULAR_DIR=/home/ubuntu/frontend-code
cd $ANGULAR_DIR
# Construir la imagen hasta el stage build
docker build -f setup/Dockerfile.base --target base -t angular-base .
# Levantar el contenedor de producción
docker compose -f setup/docker-compose.production.yml up -d --build
sleep 10
docker exec Angular service apache2 restart
sleep 5

echo "=== LOGS ANGULAR ==="

docker compose -f setup/docker-compose.production.yml logs angular

echo "=== STATUS ==="

docker compose -f setup/docker-compose.production.yml ps
docker update --restart always Angular
