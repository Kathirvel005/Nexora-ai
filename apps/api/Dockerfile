FROM python:3.11-slim

WORKDIR /workspace

# Copy requirements and install dependencies
COPY apps/api/requirements.txt ./apps/api/
RUN pip install --no-cache-dir -r apps/api/requirements.txt

# Copy all source files
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI server relative to workspace root
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
