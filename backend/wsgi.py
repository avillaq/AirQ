from app import create_app
from flask import redirect

app = create_app()

@app.route("/")
def index_api():
    return redirect("/api")

if __name__ == '__main__':
    app.run(debug=True)
