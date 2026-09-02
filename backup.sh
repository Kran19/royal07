#!/bin/bash

# Define variables
BACKUP_DIR="./prod_data/backups"
DB_USER="royalbet"
DB_NAME="royalbet"
CONTAINER_NAME="royalbet_postgres_live"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Ensure the postgres container is running before attempting backup
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Starting backup of $DB_NAME to $BACKUP_FILE..."
    
    # Run pg_dump inside the container and redirect output to the host file
    docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup completed successfully!"
        
        # Optional: Keep only the last 7 backups to save disk space
        echo "Cleaning up old backups (keeping last 7)..."
        ls -t $BACKUP_DIR/db_backup_*.sql | tail -n +8 | xargs -r rm --
    else
        echo "❌ Backup failed!"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    echo "❌ Container $CONTAINER_NAME is not running. Backup aborted."
    exit 1
fi
