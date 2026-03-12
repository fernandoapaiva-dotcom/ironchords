# Gunicorn configuration file
import multiprocessing

# Increase timeout to 300 seconds to allow for massive document generation
timeout = 300

# Reduce worker count to 2 to save RAM on restricted environments
workers = 2

# Use uvicorn worker class for FastAPI
worker_class = "uvicorn.workers.UvicornWorker"

# Bind to the specified port
bind = "0.0.0.0:10000" # This will be overridden by --bind if present
