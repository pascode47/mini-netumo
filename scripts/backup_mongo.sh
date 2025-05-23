#!/bin/bash

# Script to backup MongoDB data from the Docker container

# Configuration
BACKUP_DIR="./mongo_backups" # Directory to store backups on the host
CONTAINER_NAME="mini-netumo-mongo-1" # Docker Compose default is projectname-servicename-1
DB_NAME="mini_netumo" # Database name to backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${DB_NAME}_${TIMESTAMP}.gz"

# Create backup directory on host if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting MongoDB backup for database: ${DB_NAME}..."

# Execute mongodump inside the MongoDB container
# The backup will be created inside the container first, then copied out.
# Alternatively, if mongodump is installed on host and DB port is exposed, can run directly.
# This approach uses docker exec.

# Path inside the container where the dump will be temporarily stored
CONTAINER_BACKUP_PATH="/tmp/backup_temp"

docker exec "${CONTAINER_NAME}" sh -c "mkdir -p ${CONTAINER_BACKUP_PATH} && mongodump --db ${DB_NAME} --archive=${CONTAINER_BACKUP_PATH}/${BACKUP_NAME} --gzip"

if [ $? -eq 0 ]; then
  echo "mongodump successful inside container."
  
  # Copy the backup from the container to the host
  docker cp "${CONTAINER_NAME}:${CONTAINER_BACKUP_PATH}/${BACKUP_NAME}" "${BACKUP_DIR}/${BACKUP_NAME}"
  
  if [ $? -eq 0 ]; then
    echo "Backup successfully copied to host: ${BACKUP_DIR}/${BACKUP_NAME}"
    
    # Clean up the temporary backup file inside the container
    docker exec "${CONTAINER_NAME}" rm -rf "${CONTAINER_BACKUP_PATH}/${BACKUP_NAME}"
    echo "Cleaned up temporary backup from container."

    # Optional: Prune old backups on host (e.g., keep last 7 days)
    # find "${BACKUP_DIR}" -name "${DB_NAME}_*.gz" -type f -mtime +7 -delete
    # echo "Pruned backups older than 7 days."

  else
    echo "ERROR: Failed to copy backup from container to host."
  fi
else
  echo "ERROR: mongodump failed inside container."
fi

echo "MongoDB backup process finished."
