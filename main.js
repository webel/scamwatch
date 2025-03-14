document.addEventListener("DOMContentLoaded", async () => {
  const response = await fetch("./screenshots.json");
  if (!response.ok) throw new Error("Failed to load screenshots.json");

  const imagePaths = await response.json();
  // Get existing elements from the DOM
  const counterElement = document.querySelector(".counter");
  const gridContainer = document.getElementById("imageGrid");

  // Update counter with accurate count
  counterElement.textContent = `Total: ${imagePaths.length} screenshots, taken on 13/3/2025 23.00 (CET)`;

  // Add each image to the grid
  imagePaths.forEach((imagePath) => {
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";

    const img = document.createElement("img");
    img.src = imagePath;
    img.alt = imagePath.split("/").pop().replace(".png", "");

    // Add caption with filename
    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = imagePath.split("/").pop();

    // Add click handler to show full-size image
    imageContainer.addEventListener("click", () => {
      showFullSizeImage(imagePath);
    });

    imageContainer.appendChild(img);
    imageContainer.appendChild(caption);
    gridContainer.appendChild(imageContainer);
  });

  // Function to show full-size image when clicked
  function showFullSizeImage(imagePath) {
    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const fullImg = document.createElement("img");
    fullImg.src = imagePath;
    fullImg.alt = "Full size image";

    const closeBtn = document.createElement("div");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "×";
    closeBtn.title = "Close";

    const filename = document.createElement("div");
    filename.style.position = "absolute";
    filename.style.bottom = "20px";
    filename.style.left = "0";
    filename.style.right = "0";
    filename.style.textAlign = "center";
    filename.style.color = "white";
    filename.style.padding = "10px";
    filename.style.backgroundColor = "rgba(0,0,0,0.5)";
    filename.textContent = imagePath.split("/").pop();

    overlay.appendChild(fullImg);
    overlay.appendChild(closeBtn);
    overlay.appendChild(filename);
    document.body.appendChild(overlay);

    // Close overlay when clicked
    overlay.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });

    // Prevent image click from closing overlay
    fullImg.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
});
