import { closeSync, copyFileSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databasePath = resolve(process.cwd(), "prisma/dev.db");
const environmentPath = resolve(process.cwd(), ".env");
if (!existsSync(environmentPath)) copyFileSync(resolve(process.cwd(), ".env.example"), environmentPath);
mkdirSync(dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));
