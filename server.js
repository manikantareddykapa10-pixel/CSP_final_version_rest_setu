const express = require('express');
const dotenv = require('dotenv');
const colors = require('colors');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { connectDB } = require('./config/db.js');
const { notFound, errorHandler } = require('./middleware/errorMiddleware.js');
const { apiLimiter } = require('./middleware/securityMiddleware.js');

// Load .env
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath, override: true });

// SQLite connection
connectDB();

const app = express();

//security middlewares
app.use(helmet());

//cors configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

//body parser
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

//logging
app.use(morgan('dev'));

//rate limiting
app.use('/api', apiLimiter);

//routes
app.use('/api/v1/test',require('./routes/testRroute.js'))
app.use('/api/v1/auth',require('./routes/authRoute.js'))
app.use('/api/v1/inventory',require('./routes/inventoryRoutes.js'))
app.use('/api/v1/analytics',require('./routes/analyticsRoutes.js'))
app.use("/api/v1/admin", require("./routes/adminRoutes.js"));

//AI routes
app.use('/api/v1/ai', require('./routes/aiRoutes.js'));

//Blood request routes
app.use('/api/v1/requests', require('./routes/requestRoutes.js'));

//error handling middlewares (must be after routes)
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`Server running in ${process.env.DEV_MODE} on ${PORT}`.bgBlue.white));
}

module.exports = app;
