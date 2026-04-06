from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
from pydantic import BaseModel
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

app = FastAPI(title="InferBench API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class InferenceRequest(BaseModel):
    model: str
    prompt: str
    max_tokens: int = 256
    provider: str = "ollama"
    base_url: str = "http://localhost:11434"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/results")
async def save_result(result: dict):
    try:
        data = supabase.table("benchmark_results").insert(result).execute()
        return {"success": True, "data": data.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/results")
async def get_results():
    try:
        data = supabase.table("benchmark_results").select("*").order("timestamp", desc=True).limit(50).execute()
        return {"results": data.data}
    except Exception as e:
        return {"results": [], "error": str(e)}

@app.post("/inference/stream")
async def stream_inference(req: InferenceRequest):
    async def generate():
        async with httpx.AsyncClient(timeout=120) as client:
            if req.provider == "ollama":
                url = f"{req.base_url}/api/generate"
                payload = {
                    "model": req.model,
                    "prompt": req.prompt,
                    "stream": True,
                    "options": {"num_predict": req.max_tokens}
                }
            else:
                url = f"{req.base_url}/v1/chat/completions"
                payload = {
                    "model": req.model,
                    "messages": [{"role": "user", "content": req.prompt}],
                    "stream": True,
                    "max_tokens": req.max_tokens
                }

            async with client.stream("POST", url, json=payload) as response:
                async for line in response.aiter_lines():
                    if line:
                        yield f"data: {line}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")