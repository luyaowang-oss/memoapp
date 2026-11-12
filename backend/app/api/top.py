from fastapi import APIRouter
from pydantic import BaseModel
import boto3
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from botocore.exceptions import ClientError

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
    item_id = str(uuid.uuid4())
    japan_time = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y-%m-%d %H:%M:%S")
    item = {
        'id': item_id,
        'title': data.title,
        'content': data.content,
        'createdAt': japan_time,
    }

    tbl = get_table()
    tbl.put_item(Item=item)

    return {
        "message": "success",
        "data": item
    }

@router.get("/")
async def get_page_data():
    tbl = get_table()
    response = tbl.scan()
    items = response.get('Items', [])
    return {
        "message": "success",
        "count": len(items),
        "data": items
    }

@router.delete("/{id}")
async def delete_memo(id: str):
    tbl = get_table()
    response = tbl.delete_item(
        Key={
            'id': id,
        }
    )
    return {"status": "success", "delete": response.get("Attributes")}

@router.put("/{id}")
async def uodate_memo(id:str, newMemo: PageDataCreate):
    tbl = get_table()
    response = tbl.update_item(
        Key={
            'id': id
        },
        UpdateExpression='SET title = :t, content= :c',
        ExpressionAttributeValues={
            ':t' : newMemo.title,
            ':c' : newMemo.content,
        },
        ReturnValues="ALL_NEW"
    )

    return{
        "message": "success",
        "data": response.get("Attributes")
    }