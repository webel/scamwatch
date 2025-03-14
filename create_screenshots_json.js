import { readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotsDir = join(__dirname, "screenshots");

const imagePaths = readdirSync(screenshotsDir).map((filename) => {
  return join("screenshots", filename); // Relative path for portability
});

const json = JSON.stringify(imagePaths, null, 2);
writeFileSync(join(__dirname, "screenshots.json"), json);
console.log("Screenshots JSON file created");
