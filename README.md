# Skedoodle

**Skedoodle** is a work in progress of a real-time interactive sketching and drawing tool that allows multiple users to connect, view, and edit the same board simultaneously. Designed for teams to brainstorm and visually collaborate.
Built with Vite, React, WebSocket, and Two.js, the platform delivers fast, responsive, and synchronized interactions across devices.

### > [Live Preview Here](https://eugenioenko.github.io/skedoodle/dist/)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Real-time Collaboration**: (In Progress) Multiple users can draw on the same board in real-time.
- **Sketch & Draw**: Offers tools for freehand sketching, shapes, and lines with Two.js for smooth vector graphics.
- **Persistent Data**: TBD.
- **Scalable**: Designed for scalability with WebSocket handling real-time data.

## Tech Stack

- **Frontend**: [Vite](https://https://vite.dev/) for client side rendering.
- **Graphics**: [Two.js](https://two.js.org/) for rendering smooth and interactive vector graphics.
- **Server**: [Socket.io](https://socket.io/) for real-time collaboration

## Getting Started

### Installation and Execution

```bash
pnpm install
pnpm dev
```

## Usage

- Open a Board: Navigate to http://localhost:5317 and create a new board or join an existing one.
- Collaborate: Invite others to join the board via a unique URL. All participants can draw, erase, and edit in real-time.
- Persist Data: Board data will be saved and synced to the database, making it accessible for future sessions.

## Contributing

We welcome contributions! To contribute:

- Fork the repository and create a new branch.
- Make your changes, then submit a pull request.

Please make sure all contributions are well-documented and follow the existing coding conventions.

## License

Distributed under the MIT License. See LICENSE for more information.
