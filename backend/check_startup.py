import sys
import os

# Mock DATABASE_URL to check postgres paths
os.environ["DATABASE_URL"] = "postgres://user:pass@host:5432/db"

try:
    print("Attempting to import main.py...")
    import main
    print("Import successful!")
    
    # Try a simple database operation check (mocked)
    print("Testing database module import...")
    import database
    print("Database module imported successfully!")
    
except Exception as e:
    import traceback
    print(f"Startup check failed with error: {e}")
    traceback.print_exc()
    sys.exit(1)
