const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const csurf = require('csurf');
const { body, validationResult } = require('express-validator');
const fileUpload = require('express-fileupload');

// Load environment variables
dotenv.config();

// Initialize Google Drive service
const driveService = require('./src/utils/googleDriveService');

// Import routes
const projectRoutes = require('./src/routes/projectRoutes');
const planningRoutes = require('./src/routes/planningRoutes');
const codeSearchRoutes = require('./src/routes/codeSearchRoutes');
const codeGenerationRoutes = require('./src/routes/codeGenerationRoutes');
const meetingActionItemRoutes = require('./src/routes/meetingActionItemRoutes');
const documentationRoutes = require('./src/routes/documentationRoutes');
const aiProcessingRoutes = require('./src/routes/aiProcessingRoutes');

// Initialize express
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('Strict-Transport-Security', 'max-age=63072000');
  res.setHeader('Content-Security-Policy', 
    "default-src 'self';" +
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';" +
    "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';" +
    "img-src 'self' data:;");
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Authentication middleware
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection
app.use(csurf({ cookie: true }));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    scope: ['profile', 'email'],
    state: true
  },
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }
));

// Register routes
app.use('/api/project', projectRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/code-search', codeSearchRoutes);
app.use('/api/code-generation', codeGenerationRoutes);
app.use('/api/meeting', meetingActionItemRoutes);
app.use('/api/documentation', documentationRoutes);
app.use('/api/ai', aiProcessingRoutes);

// Add a route to check Google Drive connection
app.get('/api/drive/status', async (req, res) => {
  try {
    const files = await driveService.listFiles();
    res.json({ 
      status: 'connected',
      workFolderId: driveService.workFolderId,
      fileCount: files.length
    });
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message
    });
  }
});

// Add a route to list files in Google Drive
app.get('/api/drive/files', async (req, res) => {
  try {
    const subfolder = req.query.subfolder || null;
    const files = await driveService.listFiles(subfolder);
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Authentication routes
app.get('/auth/google',
  passport.authenticate('google', { 
    prompt: 'select_account',
    accessType: 'offline' 
  })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Web UI routes
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// Secure file upload endpoint
app.post('/api/upload', ensureAuthenticated, (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const uploadedFile = req.files.file;
  const sanitizedName = sanitizeFilename(uploadedFile.name);
  
  driveService.createFile(sanitizedName, uploadedFile.data, uploadedFile.mimetype)
    .then(fileId => res.json({ success: true, fileId }))
    .catch(error => res.status(500).json({ error: 'Upload failed' }));
});

// CSRF token endpoint
app.get('/api/csrf-token', ensureAuthenticated, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Filename sanitization
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9.-]/gi, '_').substring(0, 255);
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
