# SWIFT-HyperSpark
Official Site for the SWIFT: Smart Waste-to-fuel Intelligent Fuel Transition system by Team HyperSpark

Here is the complete content formatted exactly as a raw `README.md` file so you can easily copy and paste it into your project.

SWIFT is a live, mobile-responsive React dashboard featuring a remote admin control panel. It uses a clever single-artifact architecture: the same web app serves both the public viewing dashboard and the private admin controls, synced in real-time via Firebase Realtime Database.

Perfect for live demonstrations, screen recording, or remote monitoring.

## ✨ Features

* **Two Modes, One App:**
  * Open the base URL for a clean, interactive dashboard.
  * Append `#admin` to the URL to access the hidden control panel.
* **Instant Sync:** Built with Firebase Realtime Database `onValue` listeners. Any change made on the PC Admin panel is reflected on the mobile dashboard instantly without refreshing.
* **Quick Presets:** One-click simulation scenarios (Gas Leaks, Low Pressure, System Optimal) perfect for recording videos or live demos.
* **Mobile-Responsive:** The UI scales beautifully from tiny phones to desktop monitors using CSS `clamp()` and smart grid layouts.
* **Zero Backend Required:** Fully serverless architecture.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Setup the Project
If you haven't already, scaffold a React project (Vite is recommended) and install the required dependencies:

```bash
# Create a new Vite React app
npm create vite@latest swift-dashboard -- --template react
cd swift-dashboard

# Install necessary packages
npm install firebase recharts

```

### 2. Add the Code

Replace the contents of `src/App.jsx` (or your main component file) with the provided `App.jsx` code.

### 3. Run the App

Start the development server:

```bash
npm run dev

```

### 4. Test the Real-time Sync

1. Open a browser window to the default local address (e.g., `http://localhost:5173`). This is your **Dashboard**.
2. Open a second browser window (or grab your phone on the same network) and go to `http://localhost:5173/#admin`. This is your **Admin Panel**.
3. Move a slider or tap a preset in the Admin Panel and watch the Dashboard update instantly.

---

## 🔒 A Note on Firebase Configuration

The provided code includes a Firebase configuration block with API keys.

* **For quick testing and demos:** This is perfectly fine to leave as-is to see the app working immediately.
* **For production environments:** It is highly recommended to move these values into `.env` variables (e.g., `VITE_FIREBASE_API_KEY`) and set up Firebase Security Rules to restrict who can write to the `swift-live-state` path.

---

## 🌐 Deploying to Netlify

Deploying this app to Netlify is completely free and takes less than 2 minutes.

### Method 1: Drag & Drop (Easiest)

1. Run the build command in your terminal:
```bash
npm run build


```



```
2. This will generate a `dist` folder in your project directory.
3. Log in to [Netlify](https://app.netlify.com/).
4. Go to the **Sites** tab and simply drag and drop your `dist` folder into the deployment dropzone.
5. Netlify will generate a live URL for you (e.g., `https://your-swift-app.netlify.app`).

### Method 2: Connect to GitHub (Recommended for updates)
1. Push your code to a GitHub repository.
2. Log in to Netlify and click **"Add new site" -> "Import an existing project"**.
3. Connect your GitHub account and select your repository.
4. Use the following build settings:
   * **Framework preset:** Vite (or React)
   * **Build command:** `npm run build`
   * **Publish directory:** `dist`
5. Click **Deploy Site**.

### Using the Live App
Once deployed, you can use your app exactly like you did locally:
* **Phone View:** `https://your-app-name.netlify.app`
* **PC Control Panel:** `https://your-app-name.netlify.app/#admin`

```

```

```

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
