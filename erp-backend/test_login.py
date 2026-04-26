from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

response = client.post("/api/auth/login", json={"email": "admin@erp.com", "password": "admin123"})
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
