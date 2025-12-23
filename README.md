# Weather Map App

A responsive and interactive weather application built using **HTML5, CSS3, and Vanilla JavaScript**. This application uses **Leaflet.js** for interactive maps and the **Open-Meteo API** to fetch real-time weather data.

## Features

-   **Interactive Map**: Navigate around the world using Leaflet.js.
-   **Real-time Weather**: Click anywhere on the map to get current weather data.
-   **City Search**: Search for cities to quickly view their weather conditions.
-   **Detailed Information**: View temperature, humidity, wind speed, and more.
-   **Responsive Design**: optimized for detailed viewing on various devices.

## Technology Stack

-   **HTML5**: Structure and markup.
-   **CSS3**: Styling and layout.
-   **JavaScript (ES6+)**: Application logic and API integration.
-   **Leaflet.js**: Open-source JavaScript library for mobile-friendly interactive maps.
-   **Open-Meteo API**: Free Weather API for non-commercial use.
-   **OpenStreetMap**: Map tiles.

## Installation & Usage

Since this is a client-side web application, no backend server (like Tomcat or Node.js) is required for core functionality, though running it through a local server is recommended to avoid CORS issues with some browsers.

1.  **Clone or Download** the repository.
2.  **Open** the project folder.
3.  **Run** the application:
    -   Simply open `index.html` in your web browser.
    -   OR use a local development server (e.g., Live Server in VS Code, `python -m http.server`, etc.).

## Project Structure

-   `index.html`: Main entry point for the map view.
-   `index.css`: Styles for the main map view.
-   `index.js`: Logic for map interaction and weather fetching.
-   `details.html`: Detailed view for specific weather data.
-   `details.css`: Styles for the details page.
-   `details.js`: Logic for the details page.