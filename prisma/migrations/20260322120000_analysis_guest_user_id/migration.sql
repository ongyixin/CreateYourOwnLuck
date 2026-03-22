-- Allow guest (unsigned) FitCheck runs without a User row
ALTER TABLE "Analysis" ALTER COLUMN "userId" DROP NOT NULL;
