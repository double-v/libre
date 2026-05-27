-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "practices" TEXT[] DEFAULT ARRAY[]::TEXT[];
