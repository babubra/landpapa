import psycopg2

# The user provided: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kaliningrad_land

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/kaliningrad_land"

def run_migration():
    print(f"Connecting to {DATABASE_URL}...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        with open("add_missing_columns.sql", "r", encoding="utf-8") as f:
            sql_script = f.read()
            
        print("Executing additional migration script...")
        cursor.execute(sql_script)
        
        print("Additional migration executed successfully!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == "__main__":
    run_migration()
