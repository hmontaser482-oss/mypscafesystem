const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Hardware Lock & Machine MAC Address Security Verification
const { verifyHardwareLock } = require('./engines/hardwareLock');
verifyHardwareLock();

// Initialize DB and Seed
require('./db/database');
const seedDatabase = require('./db/seed');
seedDatabase();

// Express & Sockets
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const { initSockets } = require('./sockets/socketManager');
initSockets(io);

// Crash Recovery & State Preservation
const { recoverActiveSessionsOnStartup, registerShutdownHandlers } = require('./engines/recoveryEngine');
registerShutdownHandlers();
recoverActiveSessionsOnStartup();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  if (!req.url.startsWith('/api/notifications') && !req.url.startsWith('/api/sessions/calculate')) {
    // console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Mount Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/cash-drawer', require('./routes/cashDrawer'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/games', require('./routes/games'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));

// Serve client production build if available
const fs = require('fs');
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/socket\.io).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler (Arabic Localized)
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` PS Lounge Gaming Center Backend Server Running `);
  console.log(` Port: http://localhost:${PORT}`);
  console.log(` Real-Time WebSockets: Active`);
  console.log(` Database: SQLite (WAL Mode Enabled)`);
  console.log(`====================================================`);
});

module.exports = { app, server };
