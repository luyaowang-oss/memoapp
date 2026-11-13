from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import boto3
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from botocore.exceptions import ClientError, EndpointConnectionError

router = APIRouter(prefix="/api/top", tags=["top"])

class PageDataCreate(BaseModel):
    title: str
    content: str

dynamodb = boto3.resource('dynamodb', 
                          region_name='ap-northeast-1',
                          endpoint_url='http://dynamodb:8000',
                          aws_access_key_id='AKIAIOSFODNN7EXAMPLE',
                          aws_secret_access_key='dummy_secret')

table_name = 'PageDataTable'

def get_table():
    tbl = dynamodb.Table(table_name)
    try:
        tbl.load()
    except EndpointConnectionError:
        raise HTTPException(status_code=503, detail="データベースに繋ぎません")
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
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

@router.delete("/{id}")
async def delete_memo(id: str):
    try:
        tbl = get_table()
        response = tbl.delete_item(
            Key={
                'id': id,
            }
        )
        return {"status": "success", "delete": response.get("Attributes")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メモ削除失敗: {str(e)}")

@router.put("/{id}")
async def update_memo(id:str, newMemo: PageDataCreate):
    try:
        tbl = get_table()
        japan_time = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y-%m-%d %H:%M:%S")
        response = tbl.update_item(
            Key={
                'id': id
            },
            UpdateExpression='SET title = :t, content= :c, updatedAt= :u',
            ExpressionAttributeValues={
                ':t' : newMemo.title,
                ':c' : newMemo.content,
                ':u' : japan_time,
            },
            ReturnValues="ALL_NEW"
        )
        return{
            "message": "success",
            "data": response.get("Attributes")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メモ更新失敗: {str(e)}")