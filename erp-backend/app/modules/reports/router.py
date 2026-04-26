from fastapi import APIRouter, Depends, HTTPException, Query
from ...database import db_connection
from ...auth.router import get_current_user
from datetime import datetime, time
from typing import Optional

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/dashboard")
async def get_dashboard_stats(
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    current_user=Depends(get_current_user)
):
    # Default range: today
    now = datetime.now()
    if not date_from:
        date_from = datetime.combine(now.date(), time.min)
    if not date_to:
        date_to = datetime.combine(now.date(), time.max)

    is_admin = current_user["role"] == "admin"
    branch_id = current_user["branch_id"]

    async with db_connection() as conn:
        # 1. Summary (Sales & Count)
        summary_query = """
            SELECT 
                COALESCE(SUM(total), 0) as total_sales,
                COUNT(*) as invoice_count
            FROM invoices
            WHERE created_at BETWEEN $1 AND $2
            AND ($3::boolean OR branch_id = $4)
        """
        summary = await conn.fetchrow(summary_query, date_from, date_to, is_admin, branch_id)

        # 2. Profit Calculation
        profit_query = """
            SELECT 
                COALESCE(SUM((ii.price - ii.cost_price) * ii.qty), 0) as total_profit
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE i.created_at BETWEEN $1 AND $2
            AND ($3::boolean OR i.branch_id = $4)
        """
        total_profit = await conn.fetchval(profit_query, date_from, date_to, is_admin, branch_id)

        # 3. Low Stock Count (Current state, not filtered by date, but filtered by branch)
        low_stock_query = """
            SELECT COUNT(*) FROM stock s
            JOIN products p ON s.product_id = p.id
            WHERE s.quantity <= p.min_stock
            AND ($1::boolean OR s.branch_id = $2)
        """
        low_stock_count = await conn.fetchval(low_stock_query, is_admin, branch_id)

        # 4. Top Selling Products
        top_selling_query = """
            SELECT 
                p.name, 
                SUM(ii.qty) as total_qty,
                SUM(ii.total) as total_amount
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            JOIN products p ON ii.product_id = p.id
            WHERE i.created_at BETWEEN $1 AND $2
            AND ($3::boolean OR i.branch_id = $4)
            GROUP BY p.id, p.name
            ORDER BY total_qty DESC
            LIMIT 5
        """
        top_selling = await conn.fetch(top_selling_query, date_from, date_to, is_admin, branch_id)

        # 5. Sales Chart
        chart_query = """
            SELECT 
                DATE(created_at) as date,
                SUM(total) as amount
            FROM invoices
            WHERE created_at BETWEEN $1 AND $2
            AND ($3::boolean OR branch_id = $4)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """
        chart_data = await conn.fetch(chart_query, date_from, date_to, is_admin, branch_id)

        return {
            "summary": {
                "total_sales": float(summary["total_sales"]),
                "invoice_count": summary["invoice_count"],
                "total_profit": float(total_profit or 0),
                "low_stock_count": low_stock_count
            },
            "top_selling": [dict(r) for r in top_selling],
            "chart_data": [
                {"date": r["date"].strftime("%Y-%m-%d"), "amount": float(r["amount"])} 
                for r in chart_data
            ]
        }
