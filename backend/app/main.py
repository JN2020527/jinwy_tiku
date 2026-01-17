from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import paper

app = FastAPI(
    title="Word Paper Parsing API",
    description="Backend API for parsing Word documents into structured question data",
    version="1.0.0",
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://localhost:8001",
    ],  # Backend and Frontend dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(paper.router, prefix="/api/paper", tags=["paper"])


@app.get("/")
async def root():
    return {"message": "Word Paper Parsing API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
