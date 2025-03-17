import { readdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the directory name from command line argument
const screenshotDirName = process.argv[2];

if (!screenshotDirName) {
  console.error(
    "Please provide a screenshot directory name, e.g.: node create_screenshots_json.js 17_03_2025_screenshots",
  );
  process.exit(1);
}

// Extract date from directory name (assuming format DD_MM_YYYY_screenshots)
const dateMatch = screenshotDirName.match(
  /^(\d{2})_(\d{2})_(\d{4})_screenshots$/,
);
if (!dateMatch) {
  console.error("Directory name must be in format DD_MM_YYYY_screenshots");
  process.exit(1);
}

// Path to the screenshots directory
const screenshotsDir = join(__dirname, screenshotDirName);

// Check if screenshots directory exists
if (!existsSync(screenshotsDir)) {
  console.error(`Screenshots directory not found: ${screenshotsDir}`);
  process.exit(1);
}

// Get all screenshots
const imagePaths = readdirSync(screenshotsDir)
  .filter((filename) => filename.endsWith(".png")) // Only include PNG files
  .map((filename) => {
    return join(screenshotDirName, filename); // Relative path for portability
  });

console.log(`Found ${imagePaths.length} PNG screenshots`);

// Output JSON filename (matching directory name)
const outputFilename = `${screenshotDirName}.json`;

// Create JSON file
const json = JSON.stringify(imagePaths, null, 2);
writeFileSync(join(__dirname, outputFilename), json);

console.log(`Created JSON file: ${outputFilename}`);
console.log(`Contains ${imagePaths.length} screenshot paths`);

// Update or create collections manifest
updateCollectionsManifest();

function updateCollectionsManifest() {
  // Find all JSON files matching the pattern DD_MM_YYYY_screenshots.json
  const jsonFiles = readdirSync(__dirname)
    .filter((file) => file.match(/^\d{2}_\d{2}_\d{4}_screenshots\.json$/))
    .sort()
    .reverse(); // Newest first

  console.log(`Found ${jsonFiles.length} screenshot collections`);

  // Create collection info for each file
  const collections = jsonFiles
    .map((filename) => {
      // Extract date from filename format DD_MM_YYYY_screenshots.json
      const dateParts = filename.match(
        /^(\d{2})_(\d{2})_(\d{4})_screenshots\.json$/,
      );
      if (!dateParts) return null;

      const day = dateParts[1];
      const month = dateParts[2];
      const year = dateParts[3];

      // Count screenshots in this collection
      try {
        const fileContent = readFileSync(join(__dirname, filename), "utf8");
        const data = JSON.parse(fileContent);
        return {
          filename: filename,
          date: `${day}/${month}/${year}`,
          count: data.length,
        };
      } catch (error) {
        console.error(`Error processing ${filename}:`, error.message);
        // If we can't read or parse the file, still include it but without count
        return {
          filename: filename,
          date: `${day}/${month}/${year}`,
          count: "unknown",
        };
      }
    })
    .filter((item) => item !== null);

  // Write manifest
  const manifest = { collections };
  const manifestPath = join(__dirname, "screenshot_collections.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Updated screenshot collections manifest at ${manifestPath}`);
  console.log(`Contains ${collections.length} collections`);
}
