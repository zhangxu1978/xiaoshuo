const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { Redis } = require('@upstash/redis');
const bodyParser = require('body-parser');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const app = express();

// 添加中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 配置 session 中间件
app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// 登录路由
app.post('/api/login', (req, res) => {
  console.log('Login request received:', req.body);
  res.json({ message: 'Login endpoint reached' });
});

// 为 Vercel 导出
module.exports = app;