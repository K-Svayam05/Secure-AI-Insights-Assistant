from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Futures First AI Assistant API")

@app.get("/")
def read_root():
    return {"message": "Welcome to Futures First AI Assistant API"}
