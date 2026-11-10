# Rakt-Setu | Blood Bridge

Rakt-Setu is a real-time blood donation and request coordination platform designed to help donors, hospitals, organisations, and admins work together efficiently during emergencies. The application connects blood request creators with eligible donors based on blood type, location, and availability, while also providing analytics, inventory monitoring, and AI-assisted decision support.

## Project Overview

This project is built as a full-stack web application using:
- Frontend: React.js
- Backend: Node.js + Express.js
- Database: SQLite with better-sqlite3
- Styling: Bootstrap
- State Management: React state + Redux Toolkit
- Security: JWT, bcrypt, Helmet, CORS, rate limiting

The app supports four main roles:
- Admin
- Donor
- Hospital
- Organisation

## Technology Stack

### Frontend
- React.js
- Redux Toolkit (for app state and auth/session management)
- Bootstrap (responsive UI components)
- Leaflet + OpenStreetMap (live map visualization)
- Axios / fetch-based API calls for backend communication

### Backend
- Node.js
- Express.js
- JWT for authentication
- bcryptjs for password hashing
- better-sqlite3 for SQLite integration
- Helmet for HTTP security headers
- CORS for cross-origin access control
- express-rate-limit for request throttling

### Database
- SQLite database file created automatically at runtime (`rakt-setu.db`)
- Tables include:
  - users
  - requests
  - inventory
- Custom lightweight query abstraction supports Mongoose-style patterns for easier database reads and writes

### Features and Implementation Details

## 1. User Authentication and Role Management

Implemented in:
- `controllers/authController.js`
- `middleware/authMiddleware.js`
- `routes/authRoute.js`
- `config/db.js`

How it works:
- Users register with email, password, role, blood group, address, contact details, and location.
- Passwords are hashed with `bcryptjs` before saving to the database.
- Login verifies the user email and role, compares the password using bcrypt, then issues a JWT token.
- JWT tokens are checked on protected routes through middleware to grant access only to authenticated users.
- Role checking ensures users can only access the pages and APIs meant for their role.

Example:
- Donors can browse and accept blood requests.
- Hospitals can create requests and monitor donations.
- Organisations can create and manage blood requests and inventory.
- Admins can view system-wide data.

## 2. Blood Request System

Implemented in:
- `controllers/requestController.js`
- `routes/requestRoutes.js`
- `config/db.js`

How it works:
- A blood request is stored in the `requests` table with fields such as:
  - blood group
  - requester ID
  - status (`pending`, `accepted`, `completed`, `cancelled`)
  - coordinates and address
  - notes, patient name, photo, and supporting documents
- Donors can view only open pending requests that match their blood type and distance.
- When a donor accepts a request, the system updates the request with `acceptedBy` and changes status to `accepted`.
- The donor and requester contact details are revealed only after acceptance, protecting privacy before that point.
- The request lifecycle can also be completed or cancelled by authorized parties.

Distance logic:
- The backend calculates geographical distance between donor and request coordinates using the Haversine-style approach.
- Only nearby compatible requests are shown to each donor.

## 3. Real-Time Blood Map

Implemented in:
- Frontend map UI under `client/src/`
- API endpoints returning donors and request locations
- Leaflet/OpenStreetMap integration

How it works:
- Donor locations and blood request locations are rendered on a Leaflet map.
- Blue markers represent donors and red/orange markers represent blood requests.
- The frontend polls the backend every 15 seconds to refresh live data.
- This creates a near-real-time map of urgent blood needs and active donors.

Technology used:
- Leaflet
- OpenStreetMap tiles
- JavaScript geolocation and polling logic

## 4. Inventory Management

Implemented in:
- `controllers/inventoryController.js`
- `models/inventoryModel.js`
- `routes/inventoryRoutes.js`
- `config/db.js`

How it works:
- Inventory is stored in the `inventory` table with entries such as:
  - inventoryType (`in` or `out`)
  - bloodGroup
  - quantity
  - organisation/hospital/donor reference
  - timestamps
- Inventory is updated when blood is donated, used, or transferred.
- Organisations and hospitals can check stock levels and recent movement data.
- The app calculates available blood by subtracting outgoing records from incoming records.

## 5. Analytics and Dashboard Statistics

Implemented in:
- `controllers/analyticsController.js`
- `routes/analyticsRoutes.js`

How it works:
- The app aggregates data from SQLite tables using SQL queries.
- It calculates:
  - total donors, hospitals, organisations
  - total inventory in and out
  - available blood count
  - pending, accepted, and completed requests
  - blood-group-wise inventory breakdown
- These metrics are exposed to the frontend dashboard and displayed using cards or charts.

## 6. AI-Powered Features

Implemented in:
- `controllers/ai/`
- `routes/aiRoutes.js`

### 6.1 Smart Donor Matching
File:
- `controllers/ai/donorMatchingController.js`

How it works:
- The system evaluates donors using attributes like:
  - compatible blood type
  - distance from patient/request
  - availability status
  - historical donation activity
- Results are ranked and returned to the frontend for recommendation.

### 6.2 Blood Demand Prediction
File:
- `controllers/ai/predictionController.js`

How it works:
- Using recent inventory and request history, the app calculates a moving average trend.
- It predicts future demand for each blood group over a selected number of days.
- Based on the result, it creates alert levels such as low, moderate, or critical.

### 6.3 Inventory Optimization
File:
- `controllers/ai/predictionController.js`

How it works:
- The system evaluates stock thresholds and warning levels for each blood type.
- It suggests whether inventory should be increased, maintained, or monitored closely.
- This helps reduce shortages and wastage.

### 6.4 AI Chatbot
File:
- `controllers/ai/chatbotController.js`

How it works:
- The chatbot answers common blood donation questions using rule-based logic and contextual responses.
- It understands user intent around topics like:
  - blood donation eligibility
  - blood group compatibility
  - emergency response guidance
  - general platform usage

## 7. Security and Reliability

Implemented in:
- `middleware/securityMiddleware.js`
- `server.js`
- `middleware/validationMiddleware.js`

Security features include:
- `helmet` to set secure HTTP headers
- `cors` to allow controlled frontend access
- `express-rate-limit` to block excessive requests and brute-force login attempts
- JWT authentication for protected APIs
- `bcryptjs` password hashing
- validation checks for IDs, emails, coordinates, and request payload structure

## 8. Backend Architecture

The project follows a modular backend structure:
- `config/` → database and setup logic
- `controllers/` → business logic
- `routes/` → API route definitions
- `middleware/` → auth, validation, and security
- `models/` → data model abstractions
- `server.js` → app bootstrap and route registration

This keep the code clean and makes it easier to maintain the app as it grows.

## Project Structure

```bash
Rakt-Setu/
├── client/                     # Frontend React app
│   ├── public/
│   └── src/
├── config/
│   └── db.js                  # SQLite configuration and schema setup
├── controllers/
│   ├── ai/
│   │   ├── chatbotController.js
│   │   ├── donorMatchingController.js
│   │   └── predictionController.js
│   ├── adminController.js
│   ├── analyticsController.js
│   ├── authController.js
│   ├── inventoryController.js
│   └── requestController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── securityMiddleware.js
│   ├── validationMiddleware.js
│   └── errorMiddleware.js
├── models/
│   ├── inventoryModel.js
│   └── userModel.js
├── routes/
│   ├── adminRoutes.js
│   ├── aiRoutes.js
│   ├── analyticsRoutes.js
│   ├── authRoute.js
│   ├── inventoryRoutes.js
│   └── requestRoutes.js
├── .env
├── .env.example
├── package.json
├── server.js
├── rakt-setu.db
├── README.md
└── seedData.js
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or later recommended)
- npm

### 1. Install dependencies

```bash
git clone <repository-url>
cd Rakt-Setu
npm install
```

### 2. Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### 3. Configure environment variables

Create a `.env` file in the root with the following:

```env
PORT=8080
DEV_MODE=development
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=1000
```

Frontend `.env` in `client/.env`:

```env
REACT_APP_BASEURL=http://localhost:8080/api/v1
```

### 4. Start the app

```bash
npm start
```

This runs both backend and frontend together.

Alternative:

```bash
npm run server
npm run client
```

### 5. Access the application
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080/api/v1`

## Deployment

The repository includes a Vercel configuration for deploying the React frontend and Express API together. Set `JWT_SECRET` as a Vercel environment variable before using authentication. The SQLite database is placed in the function's temporary directory on Vercel, so records may be lost when a function instance is recycled; use a persistent managed database for real use.

## Future Improvements

- Real SMS/email notification service
- Advanced AI engine with actual ML models
- Better dashboard visualizations and charts
- Chatbot with NLP and external knowledge
- Donor reminders and recurring donation scheduling
- Multi-language support

## Conclusion

Rakt-Setu is a complete blood donation management system designed to solve real-world coordination problems for urgent blood needs. It combines robust backend logic, location-based donor matching, SQLite persistence, and AI powered analytics to provide a reliable and useful healthcare support application.

This project is suitable for demonstration, academic use, or as a strong starting point for a real-world donation platform.
