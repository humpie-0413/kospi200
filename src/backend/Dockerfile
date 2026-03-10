FROM python:3.12-slim

WORKDIR /app

COPY src/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/backend/ ./src/backend/
COPY src/frontend/dist/ ./src/frontend/dist/

WORKDIR /app/src/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
