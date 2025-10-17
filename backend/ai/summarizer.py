import requests

ENDPOINT = "https://insightbridge-yhyhe.eastus2.inference.ml.azure.com/score"
API_KEY = "Bw8Et3QcfkRuSx4FkllcEJd1aGJxssWKODGJB23dgBmPJbznS0UvJQQJ99BEAAAAAAAAAAAAINFRAZMLhPq8"  # ⚠️ Replace with your secure key or env var

def call_model(text: str) -> str:
    payload = {
        "input_data": {
            "input_string": [{
                "role": "user",
                "content": f"Summarize the following:\n{text}"
            }],
            "parameters": {
                "temperature": 0.3,
                "max_tokens": 512
            }
        }
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    res = requests.post(ENDPOINT, json=payload, headers=headers)
    res.raise_for_status()
    return res.json().get("output", "[No summary returned]")
