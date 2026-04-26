-- 006_fix_categories_rls.sql
-- Fix: Remove RLS policy that uses auth.uid() since FastAPI connects directly.

-- 1. Drop the faulty policy
DROP POLICY IF EXISTS "Enable all access for admins" ON categories;

-- 2. Keep RLS enabled but without a specific policy for modification.
-- This ensures that:
-- a) Everyone can still read (from policy in 003_categories_products.sql)
-- b) Direct modifications from clients are blocked by default.
-- c) FastAPI backend (connecting as a privileged role) can still modify data.

-- Note: We do not add a new policy here because FastAPI handles RBAC via check_role(["admin"]).
-- Keeping RLS enabled with only a SELECT policy is the most secure "default-deny" approach for mutations.
