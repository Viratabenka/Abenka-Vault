-- Drop WeightsConfig table (points concept removed)
DROP TABLE IF EXISTS "WeightsConfig";

-- Drop points column from Contribution
ALTER TABLE "Contribution" DROP COLUMN IF EXISTS "points";
