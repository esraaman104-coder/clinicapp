import asyncio
import asyncpg
from app.config import settings
from app.auth.service import get_password_hash

async def seed():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        print("Seeding database...")
        
        # 1. Create Main Branch
        branch_id = await conn.fetchval(
            "INSERT INTO branches (name, location, is_active) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id",
            "الفرع الرئيسي", "الرياض - الملز", True
        )
        if not branch_id:
            branch_id = await conn.fetchval("SELECT id FROM branches LIMIT 1")
        
        # 2. Create Admin User
        admin_pwd = get_password_hash("admin123")
        await conn.execute(
            """INSERT INTO users (name, email, password_hash, role, branch_id, is_active) 
               VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING""",
            "المدير العام", "admin@erp.com", admin_pwd, "admin", branch_id, True
        )
        
        # 3. Create Products
        products = [
            ("أسمنت اليمامة 50كجم", "CEM-YAM-01", "كيس", 18.5, 22.0, "مواد أساسية", 100),
            ("حديد تسليح 12 ملم", "REB-12MM", "طن", 2400.0, 2650.0, "حديد", 10),
            ("طوب أحمر مفرغ", "BRK-RED-01", "حبة", 1.8, 2.5, "طوب", 500),
            ("رمل لياسة ناعم", "SND-PLAS", "متر", 45.0, 65.0, "رمل", 20),
            ("جبس بورد سعودي", "GYP-SA-12", "لوح", 32.0, 45.0, "ديكور", 50)
        ]
        
        for name, sku, unit, cost, sale, cat, min_s in products:
            product_id = await conn.fetchval(
                """INSERT INTO products (name, sku, unit, cost_price, sale_price, category, min_stock, is_active) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (sku) DO NOTHING RETURNING id""",
                name, sku, unit, cost, sale, cat, min_s, True
            )
            
            if product_id:
                # Add initial stock
                await conn.execute(
                    "INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1, $2, $3)",
                    product_id, branch_id, 1000 if "طوب" in name else 100
                )
        
        # 4. Create dummy customer
        await conn.execute(
            "INSERT INTO customers (name, phone, address, balance, branch_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
            "شركة المقاولات الحديثة", "0501234567", "الرياض", 0.0, branch_id
        )

        print("Seeding complete!")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed())
