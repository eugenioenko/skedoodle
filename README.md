# Skedoodle: Real-Time Collaborative Sketching 🎨

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Skedoodle** is a real-time, interactive sketching and drawing tool designed for seamless collaboration. It empowers teams and individuals to brainstorm, visualize ideas, and co-create on a shared digital canvas, fostering creativity and remote teamwork.

## 📚 Table of Contents

- [Overview](#overview)
- [✨ Features](#features)
- [🛠️ Tech Stack](#tech-stack)
- [🏗️ Architecture Overview](#architecture-overview)
- [🚀 Getting Started](#getting-started)
  - [📋 Prerequisites](#prerequisites)
  - [⚙️ Installation](#installation)
  - [▶️ Running Locally](#running-locally)
- [🖌️ Usage](#usage)
- [🤝 Contributing](#contributing)
- [📜 License](#license)

## Overview

Skedoodle provides a dynamic and responsive platform for collaborative drawing. Built with a modern tech stack including Vite, React, TypeScript, and Two.js for the frontend, and leveraging WebSockets for real-time communication, it aims to deliver a smooth and synchronized experience across all connected clients. Whether for quick sketches, detailed illustrations, or collaborative design sessions, Skedoodle offers the tools to bring ideas to life.

## ✨ Features

- **Real-time Collaboration**: Multiple users can draw, erase, and edit on the same board simultaneously, with changes reflected instantly.
- **Rich Drawing Tools**: Offers a variety of tools for freehand sketching, creating shapes (rectangles, circles, lines), and an eraser.
- **Customizable Brush**: Adjust brush size and color for precise drawing.
- **Vector Graphics**: Utilizes Two.js for rendering smooth, scalable, and interactive vector graphics, ensuring high-quality output regardless of zoom level.
- **Performant**: Built in a way to preserve CPU load compared to other market propositions. (0% cpu load on idle, 10% load on 60 fps while drawing)
- **Persistent Data**: Doodles are saved to local storage.
- **Scalable Architecture**: Designed with scalability in mind, using WebSockets to efficiently handle real-time data streams for numerous concurrent users.

## 🛠️ Tech Stack

Skedoodle leverages a modern and efficient technology stack:

- **Frontend**:
  - **[Vite](https://vitejs.dev/)**: Next-generation frontend tooling that provides an extremely fast development server and optimized builds. Chosen for its speed and developer experience.
  - **[React](https://react.dev/)**: A declarative, efficient, and flexible JavaScript library for building user interfaces. Selected for its component-based architecture and strong community support.
  - **[TypeScript](https://www.typescriptlang.org/)**: Superset of JavaScript that adds static typing, improving code quality and maintainability.
  - **[Two.js](https://two.js.org/)**: A 2D drawing API geared towards modern web browsers. It is renderer agnostic, enabling the same API to draw in multiple contexts: svg, canvas, and webgl. Chosen for its lightweight nature and robust vector graphics capabilities.
  - **[Tailwind CSS](https://tailwindcss.com/)**: A utility-first CSS framework for rapidly building custom user interfaces.
  - **[Zustand](https://zustand-demo.pmnd.rs/)**: A small, fast and scalable bearbones state-management solution.
- **Backend**:
    - **[Node.js](https://nodejs.org/)**: A JavaScript runtime built on Chrome's V8 JavaScript engine.
    - **[ws](https://www.npmjs.com/package/ws)**: A simple to use, blazing fast, and thoroughly tested WebSocket client and server for Node.js.
- **Development & Tooling**:
  - **[PNPM](https://pnpm.io/)**: Fast, disk space-efficient package manager.
  - **[ESLint](https://eslint.org/) & [Prettier](https://prettier.io/)**: For code linting and formatting, ensuring code consistency and quality.
  - **[ULID](https://github.com/ulid/javascript)**: Universally Unique Lexicographically Sortable Identifier. Used for all IDs in the system.

## 🏗️ Architecture Overview

Skedoodle's client-side architecture is designed for modularity and performance:

- **Component-Based UI**: Built with React, the UI is broken down into reusable components (e.g., `Toolbar`, `Canvas`, `PropertiesPanel`).
- **State Management**: Utilizes Zustand for managing global application state, such as selected tools, colors, and brush sizes, in a simple and efficient manner.
- **Canvas Rendering**: The `Canvas` component, powered by `Two.js`, handles all drawing operations. It listens to user input and real-time events to update the visual representation.
- **Drawing Tools**: Each drawing tool (e.g., `BrushTool`, `ShapeTool`) is implemented as a separate module, encapsulating its specific logic for handling user interactions and rendering on the canvas. This promotes separation of concerns and makes it easier to add new tools.
- **Real-time Synchronization**: Client-side services will interact with a WebSocket server to send drawing actions and receive updates from other collaborators. These updates are then applied to the local Two.js canvas.
- **Event Handling**: Custom hooks like `useWindowWheel` manage browser events for features like zooming.
- **ID Generation**: We use ULIDs for all entity identifiers. This choice is predicated on a few key engineering principles:
    - **Sortability**: ULIDs are lexicographically sortable, which is invaluable for debugging and data analysis. We can easily order commands, shapes, and other entities by their creation time without relying on a separate timestamp field.
    - **Uniqueness**: Like UUIDs, ULIDs provide a high degree of uniqueness, which is essential for a distributed system where multiple clients can create entities concurrently.
    - **Performance**: ULIDs are designed to be fast to generate, which is important for a real-time application where performance is critical.

The project structure is organized as follows:

```
src/                # Client-side code
├── canvas/         # Core canvas logic, tools, and rendering
│   ├── tools/      # Individual drawing tool implementations
│   └── ...
├── components/     # React UI components
│   ├── ui/         # Generic, reusable UI elements
│   └── ...
├── hooks/          # Custom React hooks
├── models/         # Data models (e.g., Point)
├── services/       # Client-side services (e.g., storage)
└── utils/          # Utility functions
server/             # Server-side code
├── src/            # Server source code
└── ...
```

This structure aims for a clear separation of concerns, making the codebase easier to understand, maintain, and scale.

## 🚀 Getting Started

Follow these instructions to get a local copy up and running for development and testing.

### ⚙️ Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/eugenioenko/skedoodle.git
    cd skedoodle
    ```
2.  Install dependencies for both the client and the server:
    ```bash
    pnpm install
    cd server
    pnpm install
    cd ..
    ```

### ▶️ Running Locally

1.  **Start the server**:
    ```bash
    cd server
    pnpm build
    pnpm start
    ```
2.  **Start the client**:
    In a new terminal window:
    ```bash
    pnpm dev
    ```

This will typically open the application in your default web browser at `http://localhost:5173`.

## 🖌️ Usage

Once the application is running:

1.  **Select a Tool**: Use the toolbar to pick a drawing tool (e.g., brush, rectangle, eraser).
2.  **Customize Properties**: Adjust color, brush size, or other tool-specific options in the properties panel.
3.  **Draw on the Canvas**: Click and drag on the canvas to create your artwork.
4.  **Collaborate**: Open a new tab or browser window and navigate to the same URL. You should see the cursors of other users and their drawings in real-time.

## 🤝 Contributing

We welcome contributions to Skedoodle! If you'd like to help improve the project:
your changes.
Please ensure that your contributions are well-documented and, if applicable, include or update tests.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Happy Skedoodling! 🎉
