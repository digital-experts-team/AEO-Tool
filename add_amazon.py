import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from backend.sheets.client_ops import create_client
from backend.main import process_client

async def main():
    print("Creating Amazon.in client...")
    amazon_data = {
        "name": "Amazon India",
        "brand_name": "Amazon",
        "brand_aliases": ["Amazon.in", "Amazon India"],
        "competitors": ["Flipkart", "Myntra", "Ajio", "Meesho", "JioMart"],
        "queries": [
            "best e-commerce site in india",
            "fastest delivery online shopping india",
            "amazon vs flipkart",
            "buy electronics online india",
            "where to buy smartphones online in india"
        ],
        "is_active": True
    }
    
    new_client = create_client(amazon_data)
    if not new_client:
        print("Failed to create client in Google Sheets.")
        return
        
    print(f"Created client: {new_client['id']}. Running daily job for this client...")
    res = await process_client(new_client)
    print("Process result:", res)

if __name__ == "__main__":
    asyncio.run(main())
