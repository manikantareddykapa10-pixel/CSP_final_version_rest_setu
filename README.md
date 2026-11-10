# Blood Bridge

A real-time blood donation platform connecting donors, hospitals, and organisations.

## Stack

**SERN** — SQLite, Express, React, Node.js

## Features

- **User Roles:**
  - Admin: View and manage registered donors, hospitals, and organisations.
  - Donor: Set location, browse blood requests nearby, accept and fulfil them.
  - Hospital: Manage blood inventory, request blood, track consumers.
  - Organisation: Manage inventory, coordinate donors and hospitals, post blood requests.

- **Real-Time Blood Map:**
  - Live map showing donor locations (blue) and blood requests (red/orange).
  - Built with Leaflet + OpenStreetMap — no API key needed.
  - Auto-refreshes every 15 seconds via client-side polling.

- **Blood Request System:**
  - Organisations and hospitals post urgent blood requests with location.
  - Donors see requests nearby and accept them.
  - Contact details revealed to both parties only after acceptance (bidirectional).
  - Status notifications via polling every 8 seconds with toast alerts.

- **Statistical Dashboard:**
  - Blood demand prediction using moving average on last 90 days of inventory data.
  - Donor matching using weighted scoring (blood type, proximity, availability, history).
  - Inventory optimisation using threshold-based rules and expiry alerts.
  - Rule-based chatbot for blood donation queries.
  - Live stats pulled directly from the database.

- **Authentication & Security:**
  - JWT (JSON Web Tokens) for session management.
  - Passwords hashed with bcrypt.
  - Rate limiting — 1000 requests per 15 minutes general, 5 failed auth attempts per 15 minutes.
  - Helmet.js for security headers.
  - CORS configuration.

- **Frontend:**
  - React.js with Redux Toolkit for state management.
  - Bootstrap for styling.

- **Backend:**
  - Node.js and Express.js, MVC architecture.
  - SQLite (better-sqlite3) — file-based, no external database server needed.
  - Custom query builder compatible with Mongoose-style syntax.

## Getting Started

### Prerequisites

- Node.js and npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Rakt-Setu
   ```

2. **Backend Setup:**
   ```bash
   npm install
   ```

3. **Frontend Setup:**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Environment Configuration:**

   **Backend (.env):**
   ```env
   PORT=8080
   DEV_MODE=development
   JWT_SECRET=your-secret-key
   JWT_EXPIRE=7d
   ALLOWED_ORIGINS=http://localhost:3000
   RATE_LIMIT_MAX=1000
   ```

   **Frontend (client/.env):**
   ```env
   REACT_APP_BASEURL=http://localhost:8080/api/v1
   ```

### Running the Application

```bash
# Start both together
npm start

# Or separately
npm run server   # backend
npm run client   # frontend
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/v1

> SQLite database file is created automatically on first run. No external database setup needed.

### Deployment
- Backend: Render
- Frontend: Netlify

## Project Structure

```
Rakt-Setu/
├── client/                     # React frontend
│   ├── src/
│   └── public/
├── config/
│   └── db.js                   # SQLite connection + table setup
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
│   ├── adminMiddleware.js
│   └── securityMiddleware.js
├── models/
│   ├── inventoryModel.js
│   └── userModel.js
├── routes/
│   ├── aiRoutes.js
│   ├── adminRoutes.js
│   ├── analyticsRoutes.js
│   ├── authRoute.js
│   ├── inventoryRoutes.js
│   └── requestRoutes.js
├── server.js
└── package.json
```

## Screenshots

<img width="1425" height="798" alt="Screenshot 2026-04-11 at 11 15 34 AM" src="https://github.com/user-attachments/assets/5fc809b5-8ad6-48c3-adc2-051e1477e9a2" />
<img width="1464" height="792" alt="Screenshot 2026-05-05 at 12 12 44 PM" src="https://github.com/user-attachments/assets/9b6021ea-2ca6-4e48-9be0-13b200fa9571" />
<img width="1468" height="867" alt="Screenshot 2026-04-14 at 11 41 01 PM" src="https://github.com/user-attachments/assets/a4501e4f-d265-4bee-b563-4279e57288da" />
<img width="1469" height="866" alt="Screenshot 2026-04-14 at 11 40 05 PM" src="https://github.com/user-attachments/assets/5013228a-47d8-48f9-9590-6aa8b10457a3" />
<img width="1464" height="868" alt="Screenshot 2026-04-14 at 11 39 25 PM" src="https://github.com/user-attachments/assets/55ff9feb-af70-4720-af9e-ed914c91308f" />
<img width="1470" height="866" alt="Screenshot 2026-04-14 at 11 38 02 PM" src="https://github.com/user-attachments/assets/866ef72c-7a38-4bb1-8019-fac1826466cc" />
<img width="1456" height="867" alt="Screenshot 2026-04-14 at 11 37 36 PM" src="https://github.com/user-attachments/assets/8b80efda-fc9e-484d-8b03-0f01e545ecd3" />
<img width="1468" height="798" alt="Screenshot 2026-05-05 at 12 01 40 PM" src="https://github.com/user-attachments/assets/975a346f-e464-4bb6-ac16-debf98e19234" />
<img width="1464" height="793" alt="Screenshot 2026-05-05 at 12 01 26 PM" src="https://github.com/user-attachments/assets/82419ebc-70ec-4c7e-bee8-4d2a7a769406" />


