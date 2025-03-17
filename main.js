document.addEventListener("DOMContentLoaded", async () => {
  // Debug flag for extra logging
  const DEBUG = true;
  function debugLog(...args) {
    if (DEBUG) console.log(...args);
  }

  debugLog("Application starting up");

  // Load collections from the manifest file instead of hardcoding
  let availableScreenshotSets = [];

  try {
    // Try to load the collections from the manifest
    debugLog("Attempting to load screenshot_collections.json manifest");
    const manifestResponse = await fetch("./screenshot_collections.json");
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      availableScreenshotSets = manifest.collections.map((collection) => ({
        filename: `./${collection.filename}`,
        date: collection.date,
      }));
      debugLog(
        `Loaded ${availableScreenshotSets.length} collections from manifest:`,
        availableScreenshotSets.map((s) => s.date).join(", "),
      );
    } else {
      debugLog(
        "Manifest not found or couldn't be loaded, using fallback collections",
      );
      // Fallback to these if the manifest doesn't exist or fails to load
      availableScreenshotSets = [
        { filename: "./17_03_2025_screenshots.json", date: "17/03/2025" },
        { filename: "./15_03_2025_screenshots.json", date: "15/03/2025" },
      ];
    }
  } catch (error) {
    console.error("Error loading screenshot collections:", error);
    debugLog("Using fallback collections due to error");
    // Fallback collections
    availableScreenshotSets = [
      { filename: "./17_03_2025_screenshots.json", date: "17/03/2025" },
      { filename: "./15_03_2025_screenshots.json", date: "15/03/2025" },
    ];
  }

  // Create a map to store domain -> screenshots mapping
  const domainScreenshotsMap = new Map();

  // Counter element to display stats
  const counterElement = document.querySelector(".counter");
  const gridContainer = document.getElementById("imageGrid");

  // Create date selector controls
  createDateSelector(availableScreenshotSets);

  // Load the most recent screenshot set by default (if any exist)
  if (availableScreenshotSets.length > 0) {
    await loadScreenshotData(
      availableScreenshotSets[0].filename,
      availableScreenshotSets[0].date,
    );
  } else {
    counterElement.textContent = "No screenshot collections found.";
  }

  // Set up intersection observer for lazy loading
  setupLazyLoading();

  /**
   * Create a date selector UI
   */
  function createDateSelector(screenshotSets) {
    const selectorContainer = document.createElement("div");
    selectorContainer.className = "date-selector";

    const label = document.createElement("span");
    label.textContent = "View screenshots from: ";
    selectorContainer.appendChild(label);

    // Only create selector if we have more than one set
    if (screenshotSets.length <= 1) {
      if (screenshotSets.length === 1) {
        const dateDisplay = document.createElement("span");
        dateDisplay.textContent = screenshotSets[0].date;
        dateDisplay.style.fontWeight = "bold";
        selectorContainer.appendChild(dateDisplay);
      }
    } else {
      const select = document.createElement("select");
      select.id = "dateSelector";

      // Use a Set to prevent duplicate dates
      const addedDates = new Set();

      screenshotSets.forEach((set, index) => {
        // Skip if this date is already in the dropdown
        if (addedDates.has(set.date)) return;

        addedDates.add(set.date);
        const option = document.createElement("option");
        option.value = set.filename;
        option.textContent = set.date;
        if (index === 0) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener("change", async (e) => {
        const selectedFile = e.target.value;
        const selectedSet = screenshotSets.find(
          (set) => set.filename === selectedFile,
        );

        // Clear current grid
        gridContainer.innerHTML = "";

        // Important: Keep the map intact to preserve history
        // Just clear the UI

        // Load selected data
        await loadScreenshotData(selectedFile, selectedSet.date);
      });

      selectorContainer.appendChild(select);
    }

    // Insert before the grid
    const container = document.querySelector(".container");
    container.insertBefore(selectorContainer, gridContainer);
  }

  /**
   * Load and process screenshot data
   */
  async function loadScreenshotData(jsonFilePath, dateLabel) {
    try {
      const response = await fetch(jsonFilePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${jsonFilePath}`);
      }

      const imagePaths = await response.json();

      // Show loading state
      counterElement.textContent = `Loading ${imagePaths.length} screenshots...`;

      // Process and organize by domain
      processScreenshots(imagePaths, dateLabel);

      // Load other date collections to ensure we have the full history
      await loadOtherDateCollections(jsonFilePath);

      // Update counter with accurate count
      counterElement.textContent = `Total: ${imagePaths.length} screenshots, last updated on ${dateLabel}`;

      // Render the screenshots
      renderScreenshots();
    } catch (error) {
      console.error("Error loading screenshot data:", error);
      counterElement.textContent = `Error loading screenshots: ${error.message}`;
    }
  }

  /**
   * Load other date collections to ensure we have the full history
   */
  async function loadOtherDateCollections(currentJsonPath) {
    try {
      // Skip if we're loading from the manifest directly
      if (currentJsonPath === "./screenshot_collections.json") return;

      // Get all available collections except the current one
      const otherCollections = availableScreenshotSets.filter(
        (set) => set.filename !== currentJsonPath,
      );

      console.log(
        `Loading ${otherCollections.length} additional date collections for history`,
      );

      // Load each collection
      for (const collection of otherCollections) {
        try {
          const response = await fetch(collection.filename);
          if (!response.ok) continue;

          const imagePaths = await response.json();
          processScreenshots(imagePaths, collection.date);
          console.log(`Added historical data from ${collection.date}`);
        } catch (err) {
          console.warn(
            `Failed to load historical data from ${collection.filename}:`,
            err,
          );
        }
      }

      console.log("Finished loading historical data");
    } catch (error) {
      console.error("Error loading historical data:", error);
    }
  }

  /**
   * Process screenshots and organize by domain
   */
  function processScreenshots(imagePaths, dateLabel) {
    // For debugging
    console.log("Processing screenshot paths:", imagePaths.slice(0, 3), "...");

    imagePaths.forEach((imagePath) => {
      // Extract domain name from filename
      const filename = imagePath.split("/").pop();
      let domain = filename.replace(".png", "");

      // Handle potential underscores in filename
      if (domain.includes("_")) {
        domain = domain.split("_").join(""); // Remove all underscores
      }

      // If domain not in map, initialize it
      if (!domainScreenshotsMap.has(domain)) {
        domainScreenshotsMap.set(domain, []);
      }

      // Add this screenshot
      const screenshotInfo = {
        path: imagePath,
        date: dateLabel,
        filename: filename,
      };

      // Check if we already have a screenshot with this date
      const existingIndex = domainScreenshotsMap
        .get(domain)
        .findIndex((s) => s.date === dateLabel);

      if (existingIndex >= 0) {
        // Replace the existing screenshot for this date
        domainScreenshotsMap.get(domain)[existingIndex] = screenshotInfo;
      } else {
        // Add a new screenshot
        domainScreenshotsMap.get(domain).push(screenshotInfo);
      }
    });

    // Log the domains found for debugging
    console.log("Found domains:", [...domainScreenshotsMap.keys()]);

    // For each domain, log how many dates we have
    domainScreenshotsMap.forEach((screenshots, domain) => {
      console.log(`Domain: ${domain}, dates: ${screenshots.length}`);
    });
  }

  /**
   * Render screenshots to the grid
   */
  function renderScreenshots() {
    // Clear existing content
    gridContainer.innerHTML = "";

    // Sort domains alphabetically
    const sortedDomains = Array.from(domainScreenshotsMap.keys()).sort();

    // For debugging
    console.log(`Rendering ${sortedDomains.length} domains`);

    sortedDomains.forEach((domain) => {
      const screenshots = domainScreenshotsMap.get(domain);
      if (screenshots.length === 0) return;

      // Get the most recent screenshot
      const latestScreenshot = screenshots.sort((a, b) => {
        // Sort by date (newest first)
        return (
          new Date(b.date.split("/").reverse().join("-")) -
          new Date(a.date.split("/").reverse().join("-"))
        );
      })[0];

      // Create container
      const imageContainer = document.createElement("div");
      imageContainer.className = "image-container";

      // Create image element (with data-src for lazy loading)
      const img = document.createElement("img");
      img.dataset.src = latestScreenshot.path; // For lazy loading
      img.alt = domain;
      img.className = "lazy";

      // For debugging, log the image path
      console.log(`Image path for ${domain}: ${latestScreenshot.path}`);

      // Add placeholder
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24px' fill='%23666666'%3ELoading...%3C/text%3E%3C/svg%3E";

      // Add error handling for images
      img.onerror = function () {
        this.onerror = null;
        console.error(`Failed to load image: ${this.dataset.src}`);
        this.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23ffeeee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24px' fill='%23cc5555'%3EImage not found%3C/text%3E%3C/svg%3E";
      };

      // Add caption with domain name
      const caption = document.createElement("div");
      caption.className = "caption";
      caption.textContent = domain;

      // If domain has multiple dates, add an indicator badge
      if (screenshots.length > 1) {
        const historyBadge = document.createElement("span");
        historyBadge.className = "history-badge";
        historyBadge.textContent = `${screenshots.length} dates`;
        caption.appendChild(historyBadge);
      }

      // Add click handler to show full-size image
      imageContainer.addEventListener("click", () => {
        showFullSizeImage(domain, screenshots);
      });

      imageContainer.appendChild(img);
      imageContainer.appendChild(caption);
      gridContainer.appendChild(imageContainer);
    });

    // Set up lazy loading after rendering
    setupLazyLoading();
  }

  /**
   * Set up lazy loading with Intersection Observer
   */
  function setupLazyLoading() {
    if ("IntersectionObserver" in window) {
      const lazyImageObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const lazyImage = entry.target;
              lazyImage.src = lazyImage.dataset.src;
              lazyImage.classList.remove("lazy");
              lazyImageObserver.unobserve(lazyImage);
            }
          });
        },
      );

      // Observe all lazy images
      const lazyImages = document.querySelectorAll("img.lazy");
      console.log(`Setting up lazy loading for ${lazyImages.length} images`);
      lazyImages.forEach((lazyImage) => {
        lazyImageObserver.observe(lazyImage);
      });
    } else {
      // Fallback for browsers without Intersection Observer
      document.querySelectorAll("img.lazy").forEach((img) => {
        img.src = img.dataset.src;
        img.classList.remove("lazy");
      });
    }
  }

  /**
   * Show full-size image with history navigation if available
   */
  function showFullSizeImage(domain, screenshots) {
    // Create overlay element
    const overlay = document.createElement("div");
    overlay.className = "overlay";

    console.log(
      `Showing full-size image for ${domain} with ${screenshots.length} date(s)`,
    );

    // Log all screenshots for this domain
    screenshots.forEach((screenshot, index) => {
      console.log(
        `  [${index}] Date: ${screenshot.date}, Path: ${screenshot.path}`,
      );
    });

    // Sort screenshots by date (newest first)
    const sortedScreenshots = [...screenshots].sort((a, b) => {
      return (
        new Date(b.date.split("/").reverse().join("-")) -
        new Date(a.date.split("/").reverse().join("-"))
      );
    });

    // Start with the most recent screenshot
    let currentIndex = 0;

    // Create image element
    const fullImg = document.createElement("img");
    fullImg.src = sortedScreenshots[currentIndex].path;
    fullImg.alt = domain;

    // Add error handling
    fullImg.onerror = function () {
      console.error(`Failed to load full-size image: ${this.src}`);
      this.onerror = null;
      this.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23ffeeee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32px' fill='%23cc5555'%3EImage not found%3C/text%3E%3C/svg%3E";
    };

    // Create close button
    const closeBtn = document.createElement("div");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "×";
    closeBtn.title = "Close";

    // Add domain and date info
    const info = document.createElement("div");
    info.className = "image-info";
    updateImageInfo();

    // Add navigation controls if there are multiple screenshots
    if (sortedScreenshots.length > 1) {
      const navControls = document.createElement("div");
      navControls.className = "nav-controls";

      const prevBtn = document.createElement("button");
      prevBtn.innerHTML = "&larr; Previous Date";
      prevBtn.className = "nav-btn prev-btn";
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateScreenshots(-1);
      });

      const nextBtn = document.createElement("button");
      nextBtn.innerHTML = "Next Date &rarr;";
      nextBtn.className = "nav-btn next-btn";
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateScreenshots(1);
      });

      navControls.appendChild(prevBtn);
      navControls.appendChild(nextBtn);
      overlay.appendChild(navControls);
    }

    // Add elements to overlay
    overlay.appendChild(fullImg);
    overlay.appendChild(closeBtn);
    overlay.appendChild(info);
    document.body.appendChild(overlay);

    // Prevent scrolling on body when overlay is open
    document.body.style.overflow = "hidden";

    // Navigate between dates
    function navigateScreenshots(direction) {
      currentIndex =
        (currentIndex + direction + sortedScreenshots.length) %
        sortedScreenshots.length;
      fullImg.src = sortedScreenshots[currentIndex].path;
      console.log(
        `Navigated to index ${currentIndex}: ${sortedScreenshots[currentIndex].date}`,
      );
      updateImageInfo();
    }

    // Update the info display
    function updateImageInfo() {
      const screenshot = sortedScreenshots[currentIndex];
      info.innerHTML = `
        <div class="domain">${domain}</div>
        <div class="date">${screenshot.date}</div>
        <div class="count">${currentIndex + 1} of ${sortedScreenshots.length}</div>
      `;
    }

    // Close overlay when clicked
    overlay.addEventListener("click", () => {
      document.body.removeChild(overlay);
      document.body.style.overflow = ""; // Restore scrolling
    });

    // Prevent image click from closing overlay
    fullImg.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Keyboard navigation
    document.addEventListener("keydown", keyHandler);

    function keyHandler(e) {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        document.body.style.overflow = "";
        document.removeEventListener("keydown", keyHandler);
      } else if (e.key === "ArrowLeft" && sortedScreenshots.length > 1) {
        navigateScreenshots(-1);
      } else if (e.key === "ArrowRight" && sortedScreenshots.length > 1) {
        navigateScreenshots(1);
      }
    }
  }
});
