from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import boto3
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from botocore.exceptions import ClientError, EndpointConnectionError
import os
import shutil
import re

# ルーターの定義
router = APIRouter(prefix="/api/top", tags=["top"])

# アップロード先ディレクトリの作成
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# メモ作成・更新用のリクエストスキーマ
class PageDataCreate(BaseModel):
    title: str
    content: str

# DynamoDBリソースの初期化（ローカル環境接続用）
dynamodb = boto3.resource(
    'dynamodb', 
    region_name='ap-northeast-1',
    endpoint_url='http://dynamodb:8000',
    aws_access_key_id='AKIAIOSFODNN7EXAMPLE',
    aws_secret_access_key='dummy_secret'
)

table_name = 'PageDataTable'

# DynamoDBテーブル接続関数（テーブルが存在しない場合は自動作成）
def get_table():
    tbl = dynamodb.Table(table_name)
    try:
        tbl.load()
    except EndpointConnectionError:
        raise HTTPException(status_code=503, detail="データベースに接続できません")
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
            # テーブルが存在しない場合は新規作成
            tbl = dynamodb.create_table(
                TableName=table_name,
                KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
                AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
                BillingMode='PAY_PER_REQUEST'
            )
            tbl.wait_until_exists()
        else:
            raise
    return tbl

# ファイルアップロードAPI
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # 重複を避けるため一意のファイル名を生成
        ext = os.path.splitext(file.filename or "")[1]
        saved_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)

        # ファイルをサーバーに保存
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer, length=1024 * 1024)

        return {
            "url": f"http://localhost:8000/uploads/{saved_filename}",
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"アップロード失敗: {str(e)}")
    finally:
        await file.close()

# メモ新規作成API
@router.post("/")
async def save_page_data(data: PageDataCreate):
    try:
        item_id = str(uuid.uuid4())
        japan_time = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y-%m-%d %H:%M:%S")
        item = {
            'id': item_id,
            'title': data.title,
            'content': data.content,
            'updatedAt': japan_time,
        }

        tbl = get_table()
        tbl.put_item(Item=item)

        return {
            "message": "success",
            "data": item
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メモ保存失敗: {str(e)}")

# メモ一覧取得API
@router.get("/")
async def get_page_data():
    try:
        tbl = get_table()
        response = tbl.scan()
        items = response.get('Items', [])
        return {
            "message": "success",
            "count": len(items),
            "data": items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メモ取得失敗: {str(e)}")

# メモ削除API（添付ファイルもストレージから削除）
@router.delete("/{id}")
async def delete_memo(id: str):
    try:
        tbl = get_table()
        response = tbl.delete_item(
            Key={
                'id': id,
            },
            ReturnValues="ALL_OLD"
        )
        old_item = response.get("Attributes")
        # 削除されたメモ本文に含まれるアップロードファイルをサーバー上からも削除
        if old_item and "content" in old_item and isinstance(old_item["content"], str):
            filenames = re.findall(r'http://localhost:8000/uploads/([a-zA-Z0-9_.-]+)', old_item["content"])
            for fname in filenames:
                target_path = os.path.join(UPLOAD_DIR, fname)
                if os.path.exists(target_path):
                    os.remove(target_path)

        return {"status": "success", "delete": old_item}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メモ削除失敗: {str(e)}")

# メモ更新API
@router.put("/{id}")
async def update_memo(id: str, newMemo: PageDataCreate):
    try:
        tbl = get_table()
        japan_time = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y-%m-%d %H:%M:%S")
        response = tbl.update_item(
            Key={
                'id': id
            },
            UpdateExpression='SET title = :t, content= :c, updatedAt= :u',
            ExpressionAttributeValues={
                ':t': newMemo.title,
                ':c': newMemo.content,
                ':u': japan_time,
            },
            ReturnValues="ALL_NEW"
        )
        return {
            "message": "success",
            "data": response.get("Attributes")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メモ更新失敗: {str(e)}")
