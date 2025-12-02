FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app

EXPOSE 8000

CMD ["gunicorn", "backend.wsgi", "--bind", "0.0.0.0:8000", "--workers", "2"]
