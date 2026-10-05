const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

// Import database connection and passport
const connectDB = require('./config/database');
const passport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const contactRoutes = require('./routes/contacts');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');

// Import middleware
const { authenticate } = require('./middleware/auth');

const app = express();

// Connect to database (initial attempt; request middleware guarantees connection)
connectDB().catch((err) => {
  console.error('Initial DB connection attempt failed:', err.message);
});

// Trust proxy (important for rate limiting and getting real IP addresses on Vercel)
app.set('trust proxy', 1);

// Session configuration for Passport
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your_session_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

if (process.env.MONGODB_URI) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60
  });
}

app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - Temporarily relaxed for debugging
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Auth rate limiting (relaxed)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 50, // Increased from 10 to 50 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const configuredOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, '')).filter(Boolean)
      : [];

    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [...configuredOrigins, 'https://inventory-billing-management-system.vercel.app']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', ...configuredOrigins];

    const cleanOrigin = origin.replace(/\/$/, '');

    // Allow configured origins, localhost in non-prod, or any Vercel preview/deployment domain
    if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint (accessible without DB dependency)
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Serverless DB connection middleware: guarantees MongoDB is connected before handling /api routes
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (dbError) {
    console.error('Database connection error on API request:', dbError.message);
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGODB_URI is correct and MongoDB Atlas Network Access allows 0.0.0.0/0.',
      error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
    });
  }
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Inventory & Billing Management API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      contacts: '/api/contacts', 
      transactions: '/api/transactions',
      reports: '/api/reports'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      authentication: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        logout: 'GET /auth/logout',
        profile: 'GET /auth/profile',
        updateProfile: 'PUT /auth/profile',
        changePassword: 'PUT /auth/change-password'
      },
      products: {
        list: 'GET /products',
        create: 'POST /products',
        get: 'GET /products/:id',
        update: 'PUT /products/:id',
        delete: 'DELETE /products/:id',
        updateStock: 'PATCH /products/:id/stock',
        categories: 'GET /products/categories',
        lowStock: 'GET /products/low-stock',
        byCategory: 'GET /products/category/:category'
      },
      contacts: {
        list: 'GET /contacts',
        create: 'POST /contacts',
        get: 'GET /contacts/:id',
        update: 'PUT /contacts/:id',
        delete: 'DELETE /contacts/:id',
        customers: 'GET /contacts/customers',
        vendors: 'GET /contacts/vendors',
        search: 'GET /contacts/search/:term',
        updateBalance: 'PATCH /contacts/:id/balance'
      },
      transactions: {
        list: 'GET /transactions',
        create: 'POST /transactions',
        get: 'GET /transactions/:id',
        sales: 'GET /transactions/sales',
        purchases: 'GET /transactions/purchases',
        summary: 'GET /transactions/summary',
        updateStatus: 'PATCH /transactions/:id/status'
      },
      reports: {
        dashboard: 'GET /reports/dashboard',
        inventory: 'GET /reports/inventory',
        transactions: 'GET /reports/transactions',
        customer: 'GET /reports/customer/:id',
        vendor: 'GET /reports/vendor/:id'
      }
    },
    authentication: 'Bearer token required for all endpoints except /auth/register and /auth/login'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET /',
      'GET /health', 
      'GET /api/docs',
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      field
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
🚀 Server running in ${process.env.NODE_ENV || 'development'} mode
📡 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
📚 API Docs: http://localhost:${PORT}/api/docs
💚 Health: http://localhost:${PORT}/health
    `);
  });
}

module.exports = app;