from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import top
import os
from fastapi.staticfiles import StaticFiles

# FastAPIアプリケーションの初期化
app = FastAPI()

# CORS設定（フロントエンドからのリクエストを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# トップ画面用APIルーターの登録
app.include_router(top.router)

# アップロード用ディレクトリの作成と静的ファイル配信（/uploads/〜 でアクセス可能）
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
