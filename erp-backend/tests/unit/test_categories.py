import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_list_categories_unauthorized():
    response = client.get("/api/categories/")
    assert response.status_code == 401 # Should return 401 when no token is provided

def test_create_category_unauthorized():
    response = client.post("/api/categories/", json={
        "name": "Test Category",
        "color": "#C17A2B"
    })
    assert response.status_code == 401

def test_update_category_unauthorized():
    response = client.put("/api/categories/123e4567-e89b-12d3-a456-426614174000", json={
        "name": "Updated Category",
        "is_active": True
    })
    assert response.status_code == 401

def test_delete_category_unauthorized():
    response = client.delete("/api/categories/123e4567-e89b-12d3-a456-426614174000")
    assert response.status_code == 401
