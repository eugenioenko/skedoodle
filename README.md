# Skedoodle

**Skedoodle** is a real-time, interactive sketching and drawing tool that allows multiple users to connect, view, and edit the same board simultaneously. Designed for teams to brainstorm and visually collaborate. 
Built with Next.js, WebSocket, and Two.js, the platform delivers fast, responsive, and synchronized interactions across devices.

### > [Live Preview Here](https://skedoodle.yy-dev.top)


## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Real-time Collaboration**: Multiple users can draw on the same board in real-time.
- **Sketch & Draw**: Offers tools for freehand sketching, shapes, and lines with Two.js for smooth vector graphics.
- **Persistent Data**: TBD.
- **Scalable**: Designed for scalability with WebSocket handling real-time data, powered by Next.js for optimal performance.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) for server-side rendering and optimized React components.
- **Backend**: [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) for real-time data synchronization.
- **Graphics**: [Two.js](https://two.js.org/) for rendering smooth and interactive vector graphics.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v14+
- [Next.js](https://nextjs.org/)
- Database (SQLite/PostgreSQL/MySQL, etc.)

### Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/eugenioenko/collaborative-whiteboard.git
   cd collaborative-whiteboard
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Install Dependencies**:

   ```bash
   npm run dev
   ```
   
## Usage

- Open a Board: Navigate to http://localhost:4200 and create a new board or join an existing one.
- Collaborate: Invite others to join the board via a unique URL. All participants can draw, erase, and edit in real-time.
- Persist Data: Board data will be saved and synced to the database, making it accessible for future sessions.

## Contributing

We welcome contributions! To contribute:

- Fork the repository and create a new branch.
- Make your changes, then submit a pull request.

Please make sure all contributions are well-documented and follow the existing coding conventions.

## License

Distributed under the MIT License. See LICENSE for more information.
