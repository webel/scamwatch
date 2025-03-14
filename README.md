# Screenshot Grid Setup Instructions

Follow these steps to get the screenshot grid up and running:

## Prerequisites

- Node.js (v14 or newer)
- npm or yarn

## Setup Steps

1. Create a new project directory and navigate to it:

```bash
mkdir screenshot-grid
cd screenshot-grid
```

2. Create the files in your project with the contents provided in the code artifacts:

   - `index.html` - Main HTML file
   - `main.js` - JavaScript entry point
   - `style.css` - CSS styling
   - `vite.config.js` - Vite configuration
   - `package.json` - Project dependencies

3. Make sure you have the following directory structure:

```
screenshot-grid/
├── index.html
├── main.js
├── style.css
├── vite.config.js
├── package.json
└── screenshot_extensive/
    ├── bitkauer.cc_.png
    ├── bitkuares.cc_.png
    ├── bitkunpl.cc_.png
    ├── bitkuuber.cc_.png
    └── eocpumfvb.com_.png
```

4. Install the dependencies:

```bash
npm install
```

5. Start the development server:

```bash
npm run dev
```

6. The application should automatically open in your browser. If it doesn't, navigate to the URL shown in your terminal (typically http://localhost:5173/).

## Features

- Responsive grid layout that adjusts based on screen size
- Image thumbnails with captions showing the filename
- Click on any image to see it in full size
- Click anywhere on the full-size image to close it

## Customization

- Adjust the grid column size in the CSS by modifying the `minmax(300px, 1fr)` value
- Change the thumbnail height by modifying the `height: 200px` property
- Add more images by updating the `imagePaths` array in `main.js`
