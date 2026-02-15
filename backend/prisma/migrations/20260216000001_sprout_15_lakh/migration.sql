-- Update Sprout phase target label to 15 Lakh everywhere
UPDATE "CompanyPhase"
SET "monthly_sales_target_label" = 'Upto 15 Lakh/Month'
WHERE "name" = 'Sprout';
