import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");

console.log("Looking for:", envPath);
console.log("Exists:", fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  console.log("\nFILE CONTENTS:\n");
  console.log(fs.readFileSync(envPath, "utf8"));
}