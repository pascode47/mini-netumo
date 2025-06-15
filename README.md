# Mini-Netumo Project Overview and Contributions

## Group Members

- **PASCHAL B. BIZULU** (T21-03-08803) - BSc.SE
- **JUSTICE KAMI** (T21-03-09352) - BSc.SE
- **SAITOTI KIVUYO** (T21-03-13486) - BSc.SE

## 1. Project Introduction

Mini-Netumo is a web-based application designed to monitor the uptime and health of websites and web services. It provides users with a dashboard to add target URLs, view their current status (UP/DOWN), check SSL certificate validity, monitor domain name expiry, and receive notifications for important events like downtime or certificate expiry. The application features a decoupled frontend and backend architecture, containerized using Docker and orchestrated with Docker Compose.

## 2. Core Features Implemented

-   **Target Management:** Users can add, view, edit (details and notification settings), and delete monitoring targets (URLs).
-   **HTTP/HTTPS Uptime Monitoring:** Periodically checks the status of target URLs, logs response time, and determines if they are UP or DOWN.
-   **SSL Certificate Monitoring:** Daily checks for SSL certificate validity and expiry dates.
-   **Domain Expiry (WHOIS) Monitoring:** Daily checks for domain name registration expiry dates.
-   **Alerting System:** Generates alerts for significant events such as:
    -   Two consecutive downtime detections.
    -   SSL certificate expiring soon or already expired.
    -   Domain name expiring soon or already expired.
    -   Recovery of a target after downtime.
-   **Notification Service:**
    -   Sends email notifications for alerts (tested with Mailtrap).
    -   Supports per-target configurable email addresses.
    -   Supports per-target configurable webhook URLs (e.g., for Slack/Discord).
-   **Dashboard & UI:**
    -   Displays a list of monitored targets with their current status and key metrics.
    -   Provides a form for adding and editing targets, including notification settings.
    -   Shows SSL and Domain expiry information on target status cards.
    -   Includes an uptime chart for selected targets (visualizing UP/DOWN events over 24 hours).
    -   Displays a history of alerts for selected targets with pagination.
-   **API:**
    -   RESTful API for managing targets (CRUD) and alerts (list, get, acknowledge).
    -   Endpoint to provide data for uptime summaries.
    -   API documentation generated using Swagger/OpenAPI and served via Swagger UI.
-   **Technology Stack & Infrastructure:**
    -   **Backend:** Node.js, Express.js, TypeScript.
    -   **Frontend:** Angular, TypeScript, SCSS, Angular Material.
    -   **Database:** MongoDB.
    -   **Job Queue:** BullMQ with Redis for background monitoring tasks.
    -   **Containerization:** Docker for frontend and backend services.
    -   **Orchestration:** Docker Compose for managing the multi-container application (frontend, backend, MongoDB, Redis).
    -   **Web Server (Frontend):** Nginx serving the Angular SPA and proxying API requests.
    -   **Database Backup:** A shell script for manual MongoDB backups.
    -   **Health Checks:** Implemented in Docker Compose for backend, MongoDB, and Redis services.

## 3. System Architecture Overview

The application consists of:
-   **Frontend Service:** An Angular application served by Nginx. It provides the user interface for interacting with the system.
-   **Backend Service (API & Worker):** A Node.js/Express.js application that:
    -   Exposes a RESTful API for the frontend.
    -   Manages monitoring jobs using BullMQ.
    -   Includes a BullMQ worker process that performs the actual checks (HTTP, SSL, Domain), updates target statuses, creates alerts, and triggers notifications.
-   **MongoDB Service:** The primary database for storing target information, alert history, etc.
-   **Redis Service:** Used by BullMQ as a message broker and for storing job queue data.

All services are containerized and managed by Docker Compose, allowing for easy setup and consistent environments.

## 4. Deployment & Access

The application is deployed and accessible via the following public IP address:

-   **URL:** [http://16.171.176.110](http://16.171.176.110)

Please ensure your EC2 instance's security group allows inbound traffic on port 80.

## 5. Contributions by Team Members

### Paschal B. Bizulu (T21-03-08803)

Paschal took the lead on the overall system architecture, backend development, frontend component structuring, and Dockerization. His contributions were extensive and pivotal to the project's functionality.

**Key Contributions:**

1.  **Project Setup & Core Backend Development:**
    *   Initialized the Node.js/Express.js backend with TypeScript.
    *   Set up Mongoose for MongoDB interaction, defining core schemas (`TargetModel`, `AlertModel`).
    *   Implemented the BullMQ job queue system with Redis for asynchronous monitoring tasks.
    *   Developed the core monitoring worker logic for:
        *   HTTP/HTTPS uptime checks (status, latency).
        *   SSL certificate validity and expiry checks.
        *   Domain name (WHOIS) expiry checks.
2.  **API Development:**
    *   Designed and implemented all RESTful API endpoints for targets (CRUD operations, uptime summary) and alerts (listing, retrieval, acknowledgment, history per target).
    *   Integrated `asyncHandler` for robust error handling in controllers.
    *   Set up Swagger/OpenAPI documentation using `swagger-jsdoc` and `swagger-ui-express`, including writing JSDoc annotations for models and controllers.
3.  **Notification System:**
    *   Developed the `NotificationService` for dispatching alerts.
    *   Implemented email notifications using Nodemailer and integrated with Mailtrap for testing.
    *   Implemented webhook notification logic using Axios.
    *   Enabled per-target configurable notification emails and webhook URLs by modifying models, controllers, and services.
4.  **Dockerization & Orchestration:**
    *   Created Dockerfiles for both the backend (Node.js) and frontend (Angular + Nginx) services.
    *   Developed the `docker-compose.yml` file to orchestrate all services (frontend, backend, MongoDB, Redis), including network setup, volume persistence, port mapping, and environment variable configuration (`env_file`).
    *   Implemented health checks for backend, MongoDB, and Redis services in Docker Compose.
    *   Configured Nginx (`nginx.conf`) to serve the Angular SPA and act as a reverse proxy for backend API calls, resolving various proxying issues (e.g., for POST requests, SPA routing).
5.  **Frontend Integration & Component Development (Guidance & Implementation):**
    *   Updated and created Angular models (`Target`, `Alert`) to align with backend.
    *   Developed the `ApiService` to interact with all backend endpoints.
    *   Created and integrated the `TargetFormComponent` for adding/editing targets, including new notification fields.
    *   Updated `TargetListComponent` to fetch real data, manage the form, handle CRUD operations, and implement pagination.
    *   Enhanced `StatusCardComponent` to display detailed SSL/Domain status and expiry information.
    *   Developed `UptimeChartComponent` to fetch and display uptime data using `ngx-charts`.
    *   Developed `AlertHistoryComponent` to fetch and display alert history with pagination.
    *   Orchestrated child components within `DashboardComponent` for a cohesive user experience.
    *   Resolved various frontend build issues, including those related to Angular Universal prerendering and module imports.
6.  **Problem Solving & Debugging:**
    *   Systematically diagnosed and resolved numerous complex issues, including persistent TypeScript errors (using `@ts-ignore` pragmatically), Nginx proxy errors (403, 405, 500), Docker build failures, and environment variable propagation in Docker.
    *   Led the debugging of notification service connection issues.
7.  **Database Management:**
    *   Created the MongoDB backup script (`backup_mongo.sh`).
8.  **Dependency Management:**
    *   Managed backend `package.json`, addressed package deprecations (e.g., `node-whois` to `whois`), and resolved `npm audit` vulnerabilities.

### Justice Kami (T21-03-09352)

Justice contributed to the foundational setup of the frontend and initial component design.

**Key Contributions:**

1.  **Initial Frontend Setup:**
    *   Assisted in setting up the Angular project structure.
    *   Created initial versions of core frontend components like `DashboardComponent`, `TargetListComponent`, `StatusCardComponent`, `UptimeChartComponent`, and `AlertHistoryComponent` with mock data and basic templates.
2.  **Frontend Model Definition (Initial):**
    *   Defined initial structures for frontend models (`Target`, `Alert`) before backend alignment.
3.  **Basic UI Styling:**
    *   Contributed to the initial SCSS styling for some of the frontend components.

### Saitoti Kivuyo (T21-03-13486)

Saitoti focused on research for specific backend modules and initial data modeling.

**Key Contributions:**

1.  **Research & Module Identification:**
    *   Researched and identified potential libraries for WHOIS lookups (leading to the selection of `node-whois`/`whois`).
    *   Investigated libraries for SSL certificate checking.
2.  **Data Modeling (Conceptual):**
    *   Contributed to the initial conceptual design of the data models for Targets and Alerts before schema implementation.
3.  **Environment Setup Assistance:**
    *   Assisted in setting up the local development environment and understanding `.env` configurations.

## 6. Conclusion

The Mini-Netumo project successfully implements a comprehensive set of features for website and service monitoring. The architecture is robust, leveraging modern technologies and containerization for scalability and ease of deployment. All team members contributed to the project's development, with Paschal Bizulu playing a central role in the design, implementation, and integration of both backend and frontend systems.
