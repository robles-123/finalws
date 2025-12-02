FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy entire backend directory
COPY backend .

# Collect static files (if any)
RUN mkdir -p /app/staticfiles || true

EXPOSE 8000

# Run migrations and start server
CMD sh -c "python manage.py migrate --noinput 2>/dev/null || true && gunicorn backend.wsgi --bind 0.0.0.0:8000 --workers 2 --timeout 60"
