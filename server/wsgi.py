from app import create_app
from flask import redirect
import os

app = create_app()

@app.route("/")
def index_api():
    return redirect("/api")

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5050, debug=False)
