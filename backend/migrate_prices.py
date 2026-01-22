
import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal

async def main():
    print("--- MIGRATING PRICES TO BIGINT ---")
    
    async with AsyncSessionLocal() as db:
        print("Connected to DB.")
        
        # Determine columns to update
        columns = [
            "price_public",
            "price_per_sotka",
            "price_private",
            "price_per_sotka_private"
        ]
        
        for col in columns:
            print(f"Altering column '{col}' to BIGINT...")
            try:
                await db.execute(text(f"ALTER TABLE plots ALTER COLUMN {col} TYPE BIGINT;"))
                print("OK.")
            except Exception as e:
                print(f"FAILED: {e}")
                # Don't return, try others if one fails (unlikely)
        
        await db.commit()
        print("Migration complete.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
