import requests
import logging

logging.basicConfig(level=logging.INFO)

num = {
        "number": 2
}

post = requests.post("http://127.0.0.1:8000/test_add_num", json=num
                     )

if post.status_code == 200:
        result = post.json()

logging.info(result)