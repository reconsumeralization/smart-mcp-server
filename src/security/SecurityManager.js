const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const EventEmitter = require('events');

/**
 * Comprehensive Security Manager
 * Handles authentication, authorization, encryption, and security monitoring
 */
class SecurityManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            jwtSecret: config.jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
            encryptionKey: config.encryptionKey || process.env.ENCRYPTION_KEY || crypto.randomBytes(32),
            saltRounds: config.saltRounds || 12,
            sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
            maxLoginAttempts: config.maxLoginAttempts || 5,
            lockoutDuration: config.lockoutDuration || 900000, // 15 minutes
            ...config
        };

        this.activeSessions = new Map();
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
    createSession(userId, metadata = {}) {
        const sessionId = crypto.randomUUID();
        const session = {
            id: sessionId,
            userId,
            createdAt: new Date(),
            lastActivity: new Date(),
            metadata: {
                ip: metadata.ip,
                userAgent: metadata.userAgent,
                ...metadata
            }
        };

        this.activeSessions.set(sessionId, session);
        this.logSecurityEvent('session_created', { sessionId, userId });

        // Auto-cleanup session after timeout
        setTimeout(() => {
            this.destroySession(sessionId);
        }, this.config.sessionTimeout);

        return sessionId;
    }

    getSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
            return session;
        }
        return null;
    }

    destroySession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            this.activeSessions.delete(sessionId);
            this.logSecurityEvent('session_destroyed', { sessionId, userId: session.userId });
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

        // Clean up old events
        setInterval(() => {
            this.cleanupSecurityEvents();
        }, 3600000); // Clean up every hour
    }

    logSecurityEvent(type, data) {
        const event = {
            id: crypto.randomUUID(),
            type,
            timestamp: new Date(),
            data: {
                ...data,
                ip: data.ip || 'unknown',
                userAgent: data.userAgent || 'unknown'
            }
        };

        this.securityEvents.push(event);
        this.emit('securityEvent', event);

        // Log critical events immediately
        if (['account_locked', 'suspicious_activity', 'security_breach'].includes(type)) {
            console.warn(`🚨 SECURITY ALERT: ${type}`, event);
        }
    }

    analyzeSecurityEvents() {
        const recentEvents = this.securityEvents.filter(
            event => Date.now() - event.timestamp.getTime() < 300000 // Last 5 minutes
        );

        // Detect brute force attacks
        const failedLogins = recentEvents.filter(e => e.type === 'login_failed');
        const ipGroups = {};
        
        failedLogins.forEach(event => {
            const ip = event.data.ip;
            if (!ipGroups[ip]) ipGroups[ip] = 0;
            ipGroups[ip]++;
        });

        Object.entries(ipGroups).forEach(([ip, count]) => {
            if (count >= 10 && !this.trustedIPs.has(ip)) {
                this.logSecurityEvent('suspicious_activity', {
                    type: 'brute_force_detected',
                    ip,
                    attempts: count
                });
            }
        });

        // Detect unusual access patterns
        const requests = recentEvents.filter(e => e.type === 'request');
        const pathCounts = {};
        
        requests.forEach(event => {
            const path = event.data.path;
            if (!pathCounts[path]) pathCounts[path] = 0;
            pathCounts[path]++;
        });

        Object.entries(pathCounts).forEach(([path, count]) => {
            if (count >= 50) { // More than 50 requests to same path in 5 minutes
                this.logSecurityEvent('suspicious_activity', {
                    type: 'high_frequency_access',
                    path,
                    requests: count
                });
            }
        });
    }

    cleanupSecurityEvents() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        this.securityEvents = this.securityEvents.filter(
            event => event.timestamp.getTime() > cutoff
        );
    }

    /**
     * Authorization Middleware
     */
    requireAuth(roles = []) {
        return (req, res, next) => {
            const sessionId = req.headers['x-session-id'];
            
            if (!sessionId) {
                return res.status(401).json({ error: 'No session provided' });
            }

            const session = this.getSession(sessionId);
            if (!session) {
                return res.status(401).json({ error: 'Invalid session' });
            }

            req.session = session;
            req.user = { id: session.userId };
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
     * Security Status
     */
    getSecurityStatus() {
        const recentEvents = this.securityEvents.filter(
            event => Date.now() - event.timestamp.getTime() < 3600000 // Last hour
        );

        const criticalEvents = recentEvents.filter(
            event => ['account_locked', 'suspicious_activity', 'security_breach'].includes(event.type)
        );

        return {
            status: criticalEvents.length > 0 ? 'alert' : 'secure',
            activeSessions: this.activeSessions.size,
            recentEvents: recentEvents.length,
            criticalEvents: criticalEvents.length,
            lockedAccounts: Array.from(this.loginAttempts.keys()).filter(
                key => this.isAccountLocked(key.replace('login_', ''))
            ).length,
            trustedIPs: this.trustedIPs.size,
            lastAnalysis: new Date()
        };
    }

    /**
     * Export security events for analysis
     */
    exportSecurityEvents(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.securityEvents.filter(
            event => event.timestamp.getTime() > cutoff
        );
    }
}

module.exports = SecurityManager; 