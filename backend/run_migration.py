import os
import psycopg2
from urllib.parse import urlparse

# Load raw env variables or just hardcode for this one-off script based on what we know
# The user provided: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kaliningrad_land

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"

def run_migration():
    print(f"Connecting to {DATABASE_URL}...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        with open("add_fias_id_columns.sql", "r", encoding="utf-8") as f:
            sql_script = f.read()
            
        print("Executing migration script...")
        cursor.execute(sql_script)
        
        print("Migration executed successfully!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == "__main__":
    run_migration()
