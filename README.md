# Homestarr Personal Dashboard

A sleek single-page homepage/dashboard application inspired by Homarr but focused on simplicity and ease of use. It provides a central search bar (integrating with a local Searx instance) and customizable link categories for quick access to your services and bookmarks. The application stores all data persistently in an SQLite database and is designed to be run easily using Docker.

![Screenshot](https://raw.githubusercontent.com/BornSupercharged/homestarr/refs/heads/main/assets/screenshot.png)

Installed as a browser app:
![Screenshot](https://raw.githubusercontent.com/BornSupercharged/homestarr/refs/heads/main/assets/installed_app_screenshot.png)

## Features

*   **Prominent Search Bar:** Quickly search the web using a self-hosted Searx instance (URL configurable via environment variable).
*   **Link Category Management:**
    *   Create custom categories for organizing links.
    *   Edit category names.
    *   Delete categories (this also removes all links within them).
    *   Category edit/delete actions appear cleanly on hover.
*   **Link Management:**
    *   Add links with a name, URL, and an option to open in a new tab.
    *   Edit existing link details.
    *   Delete individual links.
    *   Link edit/delete actions are accessible via a "Manage Links" toggle within each category.
*   **Drag & Drop Reordering:** Easily rearrange the order of categories, including the "Add Category" card. The order is persistently saved.
*   **Persistent Storage:** All categories, links, and category order settings are stored in an SQLite database file (`server/data/homepage.sqlite`).
*   **Sleek UI:** A dark, futuristic theme featuring a dynamic galaxy background.
*   **Dockerized:** Ready to build and run using Docker and Docker Compose for simple deployment.
*   **Configurable:** Uses environment variables (via `.env` file or Docker environment) for key settings like the Searx URL and port.

## Tech Stack

*   **Backend:** Node.js, Express.js
*   **Database:** SQLite3
*   **Frontend:** Vue.js 3 (using Vite), VueDraggable vuedraggable@next
*   **Styling:** Custom CSS
*   **Containerization:** Docker, Docker Compose

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (v18 or later recommended)
*   [npm](https://www.npmjs.com/) (usually included with Node.js) or [yarn](https://yarnpkg.com/)
*   [Docker Engine](https://docs.docker.com/engine/install/)
*   [Docker Compose](https://docs.docker.com/compose/install/) (v1 or v2 - usually included with Docker Desktop)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/BornSupercharged/homestarr
    cd homestarr
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd server
    npm install
    cd ..
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd client
    npm install
    cd ..
    ```

## Configuration

The application uses environment variables for configuration. A `.env` file is used primarily for local development and as the source for Docker Compose.

1.  **Create a `.env` file:**
    Copy the example file (if you create one) or create a new file named `.env` at the top level directory:
    ```bash
    # Example: cp .env.example .env
    # Or just create .env
    ```

2.  **Edit `.env`:**
    Add the following variables, adjusting the values as needed:

    ```env
    # .env

    # URL template for your Searx instance. %s will be replaced with the search query.
    # Example for Searx running locally on default port:
    SEARX_URL=http://localhost:8080/search?q=%s
    # Example for Searxng running on a different machine:
    # SEARX_URL=http://192.168.1.100:8888/search?q=%s

    # Port the backend server will listen on (inside the container/locally)
    HOMESTARR_PORT=5050
    ```

    *   **`SEARX_URL`:** *Crucial* - Set this to the correct URL for your Searxng instance (or preferred search engine), ensuring it includes `%s` where the query should go.
    *   **`HOMESTARR_PORT`:** The internal port the Node.js server listens on. Defaults to 5050 if not set.

## Running the Application

You can run the application in two ways:

### 1. Docker (Recommended for Production-like Environment)

This method builds a Docker image containing both the frontend and backend, making deployment simple and consistent. It uses the `docker-compose.yml` file provided.

1.  **Build and Start Containers:**
    From the project root directory (where `docker-compose.yml` is located):
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces Docker Compose to rebuild the image if the `Dockerfile` or related source files have changed.
    *   `-d`: Runs the containers in detached mode (in the background).

2.  **Access:** Open your browser to `http://localhost:5050` (or whichever host port you map in `docker-compose.yml` if you change the default `5050:5050`).

3.  **Configuration with Docker:** Docker Compose uses the `env_file` directive to read your `.env` file from the host machine and inject those variables into the running container.

4.  **View Logs:**
    ```bash
    docker-compose logs -f homepage
    ```
    *(Use `Ctrl+C` to stop following)*

5.  **Stop Containers:**
    ```bash
    docker-compose down
    ```

### 2. Development Mode (with Hot Reloading)

This method is ideal for development as it provides automatic reloading when code changes.

*   **Terminal 1: Run Backend Server:**
    ```bash
    cd server
    npm run dev
    ```
    *(This uses `nodemon` to watch for changes)*

*   **Terminal 2: Run Frontend Dev Server:**
    ```bash
    cd client
    npm run dev
    ```
    *(This uses Vite's dev server with HMR and proxies API requests to the backend)*

*   **Access:** Open your browser to the URL provided by Vite (usually `http://localhost:5173` or similar).


## Contributing
Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
