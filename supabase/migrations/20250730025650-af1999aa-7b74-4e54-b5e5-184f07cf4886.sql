-- Test to see which specific table has the ID issue
-- Let's check if monthly_closures has records first
SELECT closure_month, closure_year FROM monthly_closures WHERE closure_month = 7 AND closure_year = 2025;