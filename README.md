# Weather Information App

A simple Java web application using Servlets and JSP to fetch and display current weather information from the Open-Meteo API.

## Prerequisites

*   Java Development Kit (JDK) 11 or later
*   Apache Maven
*   A Servlet Container (like Apache Tomcat 10.x or later, compatible with Jakarta EE 9+)

## Technology Stack

*   Java 11
*   Jakarta Servlet 5.0
*   Jakarta Server Pages (JSP) 3.0 / JSTL 2.0
*   Open-Meteo API (https://open-meteo.com/)
*   Jackson Databind (for JSON parsing)
*   Maven (for build and dependency management)

## Building the Application

1.  Clone the repository or place the source files in the correct directory structure.
2.  Navigate to the project's root directory (where `pom.xml` is located) in your terminal.
3.  Compile the code (packaging is optional if only running embedded):

    ```bash
    mvn clean compile
    # Or package if you still want the WAR file:
    # mvn clean package
    ```

## Running the Application (Embedded Tomcat 9 via Maven)

1.  Ensure you have built the application (at least compiled it).
2.  Run the application using the Cargo Maven plugin:

    ```bash
    mvn cargo:run
    ```

3.  Maven will download dependencies (if needed), start an embedded Tomcat 9 server, and deploy the application.
4.  Access the application in your web browser at:
    `http://localhost:8080/` (The plugin is configured to deploy to the root context '/').
5.  To stop the server, press `Ctrl+C` in the terminal where you ran the command.

## Usage

1.  The application will load the `