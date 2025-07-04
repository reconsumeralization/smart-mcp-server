const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const EventEmitter = require('events');
const { createClient } = require('redis');

/**
 * Comprehensive Security Manager
 * Handles authentication, authorization, encryption, and security monitoring
 */
class SecurityManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            jwtSecret: config.jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
            encryptionKey: config.encryptionKey || process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
            saltRounds: config.saltRounds || 12,
            sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
            maxLoginAttempts: config.maxLoginAttempts || 5,
            lockoutDuration: config.lockoutDuration || 900000, // 15 minutes
            ...config
        };

        // Initialize Redis client
        this.redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        this.redisClient.on('error', (err) => console.error('Redis Client Error', err));
        this.redisClient.connect().catch(console.error);

        this.loginAttempts = new Map();
        this.securityEvents = [];
        this.trustedIPs = new Set(config.trustedIPs || []);
        
        this.setupSecurityMonitoring();
    }

    /**
     * Initialize security middleware stack
     */
    initializeMiddleware(app) {
        // Security headers
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                }
            },
            crossOriginEmbedderPolicy: false
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP',
            standardHeaders: true,
            legacyHeaders: false,
        });

        const strictLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 10, // stricter limit for sensitive endpoints
            message: 'Too many requests to sensitive endpoint',
        });

        app.use('/api/', limiter);
        app.use('/api/auth/', strictLimiter);
        app.use('/api/admin/', strictLimiter);

        // Security event logging
        app.use((req, res, next) => {
            this.logSecurityEvent('request', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                timestamp: new Date()
            });
            next();
        });

        return this;
    }

    /**
     * Authentication Methods
     */
    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, this.config.saltRounds);
        } catch (error) {
            this.logSecurityEvent('error', { type: 'password_hash_failed', error: error.message });
            throw new Error('Password hashing failed');
        }
    }

    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            this.logSecurityEvent('error', { type: 'password_verify_failed', error: error.message });
            return false;
        }
    }

    generateToken(payload, expiresIn = '1h') {
        try {
            return jwt.sign(payload, this.config.jwtSecret, { expiresIn });
        } catch (error) {
            this.logSecurityEvent('error', { type: 'token_generation_failed', error: error.message });
            throw new Error('Token generation failed');
        }
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.config.jwtSecret);
        } catch (error) {
            this.logSecurityEvent('warning', { type: 'invalid_token', error: error.message });
            return null;
        }
    }

    /**
     * Session Management
     */
    async createSession(userId, metadata = {}) {
        const sessionId = crypto.randomUUID();
        const session = {
            id: sessionId,
            userId,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            metadata: {
                ip: metadata.ip,
                userAgent: metadata.userAgent,
                ...metadata
            }
        };

        await this.redisClient.setEx(
            `session:${sessionId}`,
            this.config.sessionTimeout / 1000,
            JSON.stringify(session)
        );
        this.logSecurityEvent('session_created', { sessionId, userId });

        return sessionId;
    }

    async getSession(sessionId) {
        const sessionData = await this.redisClient.get(`session:${sessionId}`);
        if (sessionData) {
            const session = JSON.parse(sessionData);
            session.lastActivity = new Date().toISOString();
            // Update expiry time on activity
            await this.redisClient.setEx(
                `session:${sessionId}`,
                this.config.sessionTimeout / 1000,
                JSON.stringify(session)
            );
            return session;
        }
        return null;
    }

    async destroySession(sessionId) {
        const deleted = await this.redisClient.del(`session:${sessionId}`);
        if (deleted) {
            this.logSecurityEvent('session_destroyed', { sessionId });
        }
    }

    /**
     * Login Attempt Tracking
     */
    recordLoginAttempt(identifier, success = false) {
        const key = `login_${identifier}`;
        const attempts = this.loginAttempts.get(key) || { count: 0, lastAttempt: null, lockedUntil: null };

        if (success) {
            this.loginAttempts.delete(key);
            this.logSecurityEvent('login_success', { identifier });
        } else {
            attempts.count++;
            attempts.lastAttempt = new Date();

            if (attempts.count >= this.config.maxLoginAttempts) {
                attempts.lockedUntil = new Date(Date.now() + this.config.lockoutDuration);
                this.logSecurityEvent('account_locked', { identifier, attempts: attempts.count });
            }

            this.loginAttempts.set(key, attempts);
            this.logSecurityEvent('login_failed', { identifier, attempts: attempts.count });
        }
    }

    isAccountLocked(identifier) {
        const key = `login_${identifier}`;
        const attempts = this.loginAttempts.get(key);
        
        if (!attempts || !attempts.lockedUntil) return false;
        
        if (new Date() > attempts.lockedUntil) {
            this.loginAttempts.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Encryption/Decryption
     */
    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            this.logSecurityEvent('error', { type: 'encryption_failed', error: error.message });
            throw new Error('Encryption failed');
        }
    }

    decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts.shift(), 'hex');
            const encrypted = parts.join(':');
            const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            this.logSecurityEvent('error', { type: 'decryption_failed', error: error.message });
            throw new Error('Decryption failed');
        }
    }

    /**
     * Security Monitoring
     */
    setupSecurityMonitoring() {
        // Monitor for suspicious activity
        setInterval(() => {
            this.analyzeSecurityEvents();
        }, 60000); // Check every minute

        // Cleanup old security events periodically
        setInterval(() => {
            this.cleanupSecurityEvents();
        }, 3600000); // Every hour
    }

    logSecurityEvent(type, data) {
        const event = {
            timestamp: new Date().toISOString(),
            type,
            ...data
        };
        this.securityEvents.push(event);
        this.emit('security_event', event);
    }

    analyzeSecurityEvents() {
        // Placeholder for advanced security analytics
        // e.g., detect unusual login patterns, brute-force attempts
        // Generate alerts if anomalies are detected
        // Example: simple check for too many failed logins in short period
        const recentFailedLogins = this.securityEvents.filter(e => 
            e.type === 'login_failed' && 
            (new Date().getTime() - new Date(e.timestamp).getTime()) < (5 * 60 * 1000) // Last 5 minutes
        );

        if (recentFailedLogins.length > 10) {
            this.emit('alerts', [{ type: 'excessive_failed_logins', message: 'Multiple failed login attempts detected.' }]);
        }
    }

    cleanupSecurityEvents() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.securityEvents = this.securityEvents.filter(event => new Date(event.timestamp) > oneDayAgo);
    }

    /**
     * Authorization Middleware
     */
    requireAuth(roles = []) {
        return async (req, res, next) => {
            const sessionId = req.headers['x-session-id'];
            
            if (!sessionId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const session = await this.getSession(sessionId);
            if (!session) {
                return res.status(401).json({ error: 'Invalid session' });
            }

            req.session = session;
            req.user = { id: session.userId }; // Assuming user ID is stored in session

            // Role-based authorization: check if user has any of the required roles
            if (roles.length > 0 && !roles.includes(req.user.role)) { // Assuming role is part of req.user now
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: roles,
                    current: req.user.role
                });
            }

            next();
        };
    }

    /**
     * IP Whitelist Middleware
     */
    requireTrustedIP() {
        return (req, res, next) => {
            const clientIP = req.ip;
            
            if (!this.trustedIPs.has(clientIP)) {
                this.logSecurityEvent('untrusted_ip_access', { ip: clientIP, path: req.path });
                return res.status(403).json({ error: 'Access denied from this IP' });
            }

            next();
        };
    }

    /**
     * Status and Metrics
     */
    getSecurityStatus() {
        return {
            activeSessions: this.activeSessions.size,
            loginAttemptsTracked: this.loginAttempts.size,
            securityEventsCount: this.securityEvents.length,
            trustedIPsCount: this.trustedIPs.size
        };
    }

    exportSecurityEvents(hours = 24) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.securityEvents.filter(event => new Date(event.timestamp) > cutoff);
    }
}

module.exports = SecurityManager; 