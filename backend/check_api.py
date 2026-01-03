import urllib.request
import json

try:
    with urllib.request.urlopen("http://127.0.0.1:8001/api/listings/popular?limit=4") as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")
