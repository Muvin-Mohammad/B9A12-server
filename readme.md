Building Management System (BMS) - Server
Overview
The server-side application for the Building Management System (BMS) serves as the backend, providing RESTful APIs for user authentication, apartment management, announcements, and other features required by the client application.
Features
User Authentication:
JWT-based authentication.
Role-based access control (e.g., admin, resident).
Apartment Management:
CRUD operations for apartment data.
Search and filter functionality.
Announcements:
CRUD operations for building announcements.
Notifications for residents.
Resident Management:
Manage residents’ profiles and roles.
Analytics:
APIs for retrieving building usage and apartment availability statistics.
Technology Stack
Framework: Node.js with Express.js
Database: MongoDB (with Mongoose)
Authentication: Firebase Authentication + JWT
Others: dotenv, cors, bcrypt, and multer
