const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

class AuthService {
  static generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
  
  static async verifyToken(token, type = 'access') {
    const secret = type === 'access' ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;
    return jwt.verify(token, secret);
  }
  
  static async login(email, password) {
    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid credentials');
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const tokens = this.generateTokens(user._id);
    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      ...tokens
    };
  }
  
  static async refreshToken(refreshToken) {
    const decoded = await this.verifyToken(refreshToken, 'refresh');
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      throw new Error('Invalid refresh token');
    }
    
    return this.generateTokens(user._id);
  }
  
  static async createUser(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }
}

module.exports = AuthService;