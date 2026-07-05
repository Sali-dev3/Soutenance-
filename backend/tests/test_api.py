from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_create_and_list_report():
    response = client.post(
        '/api/reports',
        data={
            'name': 'Awa',
            'phone': '70000000',
            'problem_type': 'Coupure d\'eau',
            'description': 'Pas d\'eau depuis ce matin',
            'latitude': '12.3714',
            'longitude': '-1.5197',
            'address': 'Quartier 10',
            'district': 'Secteur 3',
            'sector': 'Ouaga',
            'city': 'Ouagadougou',
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['message'] == 'Signalement enregistré'
    report_id = payload['report']['id']

    list_response = client.get('/api/reports')
    assert list_response.status_code == 200
    assert any(item['id'] == report_id for item in list_response.json()['reports'])
