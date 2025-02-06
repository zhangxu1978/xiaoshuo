const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const ngrok = require('ngrok');
const OpenAI = require('openai');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 设置全局代理
process.env.http_proxy = 'http://127.0.0.1:7890';
process.env.https_proxy = 'http://127.0.0.1:7890';

const app = express();
const port = 8090;

// 确保必要的目录存在
const settingsDir = path.join(__dirname, 'settings');
try {
    if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
        console.log('创建settings目录成功:', settingsDir);
    }
} catch (error) {
    console.error('创建settings目录失败:', error);
}

// DeepSeek 模型配置
const deepseekConfig = {
    title: "DeepSeek V3",
    model: "deepseek-coder-33b-instruct",
    contextLength: 64000,
    apiBase: "https://api.deepseek.com/v1",
    apiKey: "YOUR_DEEPSEEK_API_KEY", // 请替换为您的 DeepSeek API Key
    provider: "openaiCompatible"
};

// 初始化 OpenAI 客户端
const openai = new OpenAI({
    apiKey: deepseekConfig.apiKey,
    baseURL: deepseekConfig.apiBase
});

// 初始化Google AI客户端
const genAI = new GoogleGenerativeAI("AIzaSyAxPOoOh-zAvC7FoFaxKd15E1NDGKhotAI"); // 请替换为您的 Google AI API Key
const googleModel = genAI.getGenerativeModel({ 
    model: "gemini-pro", // 使用更稳定的模型
    // 添加安全超时设置
    timeout: 30000, // 30秒超时
    retry: {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000
    }
});

app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
// 读取用户数据
function readUsers() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'users.json'));
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// 保存用户数据
function saveUsers(users) {
    fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
}

// 读取书籍数据
function readBooks() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'books.json'));
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// 保存书籍数据
function saveBooks(books) {
    fs.writeFileSync(path.join(__dirname, 'books.json'), JSON.stringify(books, null, 2));
}

// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        // 保存用户信息到session
        req.session.user = {
            username: user.username,
            isAuthor: user.isAuthor
        };
        res.json({ 
            success: true, 
            message: '登录成功',
            user: {
                username: user.username,
                isAuthor: user.isAuthor
            }
        });
    } else {
        res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
});
// 获取session信息的接口
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({
            success: true,
            session: req.session,
            user: req.session.user
        });
    } else {
        res.json({
            success: false,
            message: '未登录'
        });
    }
});
// 检查登录状态接口
app.get('/api/check-login', (req, res) => {
    if (req.session.user) {
        res.json({ 
            success: true,
            user: req.session.user
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: '未登录' 
        });
    }
});

// 注册接口
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    
    if (users.some(u => u.username === username)) {
        res.status(400).json({ success: false, message: '用户名已存在' });
        return;
    }
    
    users.push({ 
        username, 
        password,
        isAuthor: true  // 为了测试方便，默认所有新注册用户都是作者
    });
    saveUsers(users);
    res.json({ success: true, message: '注册成功' });
});

// 获取所有书籍
app.get('/api/books', (req, res) => {
    const books = readBooks();
    res.json(books);
});

// 获取单本书籍
app.get('/api/books/:bookId', (req, res) => {
    const books = readBooks();
    const book = books.find(b => b.id === parseInt(req.params.bookId));
    if (book) {
        res.json(book);
    } else {
        res.status(404).json({ success: false, message: '书籍不存在' });
    }
});

// 创建新书籍
app.post('/api/books', (req, res) => {
    const { title } = req.body;
    const books = readBooks();
    const newBook = {
        id: books.length + 1,
        title,
        author: zhangxu, // 实际应该从session获取
        chapters: []
    };
    books.push(newBook);
    saveBooks(books);
    res.json({ success: true, book: newBook });
});

app.listen(port, async () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    
    // try {
    //     // 创建 ngrok 隧道
    //     const url = await ngrok.connect({
    //         addr: port,
    //          authtoken: '2qzIampQVvHE4eZKvkGZdigmEcJ_pQwuL8wKfUXQrp5RAi9U',  // 如果你有 ngrok 账号，可以添加这行
    //     });
        
    //     // 输出生成的外网访问地址
    //     console.log('可以通过以下地址从外网访问：', url);

    // } catch (err) {
    //     console.error('创建隧道时发生错误：', err);
    // }
});
// 在 server.js 中添加以下函数和 API 端点

// 读取章节数据
function readChapters(bookId) {
    try {
        const filePath = path.join(__dirname, `chapters_${bookId}.json`);
       // console.log('尝试读取章节数据从:', filePath);
        if (!fs.existsSync(filePath)) {
            console.log('章节文件不存在:', filePath);
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取章节数据失败:', error);
        return [];
    }
}

// 保存章节数据
function saveChapters(bookId, chapters) {
    try {
        const filePath = path.join(__dirname, `chapters_${bookId}.json`);
        console.log('保存章节数据到:', filePath);
        fs.writeFileSync(filePath, JSON.stringify(chapters, null, 2), 'utf8');
        console.log('章节数据保存成功');
    } catch (error) {
        console.error('保存章节数据失败:', error);
        throw error;
    }
}

// 获取书籍的所有章节
app.get('/api/books/:bookId/chapters', (req, res) => {
    const bookId = parseInt(req.params.bookId);
    const chapters = readChapters(bookId);
    res.json(chapters);
});

// 创建新章节
app.post('/api/books/:bookId/chapters', (req, res) => {
    const bookId = parseInt(req.params.bookId);
    const { title, content } = req.body;
    const chapters = readChapters(bookId);
    const newChapter = {
        id: chapters.length + 1,
        title,
        content,
        createTime: new Date().toISOString()
    };
    chapters.push(newChapter);
    saveChapters(bookId, chapters);
    res.json({ success: true, chapter: newChapter });
});

// 获取单个章节
app.get('/api/chapters/:chapterId', (req, res) => {
    const chapterId = parseInt(req.params.chapterId);
    const bookId = parseInt(req.query.bookId);
    const chapters = readChapters(bookId);
    const chapterIndex = chapters.findIndex(c => c.id === chapterId);
    
    if (chapterIndex !== -1) {
        // 获取当前章节
        const chapter = chapters[chapterIndex];
        
        // 添加上一章和下一章的ID
        const response = {
            ...chapter,
            prevChapterId: chapterIndex > 0 ? chapters[chapterIndex - 1].id : null,
            nextChapterId: chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1].id : null
        };
        
        res.json(response);
    } else {
        res.status(404).json({ success: false, message: '章节不存在' });
    }
});

// 更新章节
app.put('/api/chapters/:chapterId', (req, res) => {
    const chapterId = parseInt(req.params.chapterId);
    const bookId = parseInt(req.query.bookId);
    const { title, content } = req.body;
    const chapters = readChapters(bookId);
    const chapterIndex = chapters.findIndex(c => c.id === chapterId);
    
    if (chapterIndex !== -1) {
        chapters[chapterIndex] = {
            ...chapters[chapterIndex],
            title,
            content,
            updateTime: new Date().toISOString()
        };
        saveChapters(bookId, chapters);
        res.json({ success: true, chapter: chapters[chapterIndex] });
    } else {
        res.status(404).json({ success: false, message: '章节不存在' });
    }
});

// 删除章节
app.delete('/api/chapters/:chapterId', (req, res) => {
    const chapterId = parseInt(req.params.chapterId);
    const bookId = parseInt(req.query.bookId);
    const chapters = readChapters(bookId);
    const chapterIndex = chapters.findIndex(c => c.id === chapterId);
    
    if (chapterIndex !== -1) {
        chapters.splice(chapterIndex, 1);
        saveChapters(bookId, chapters);
        res.json({ success: true, message: '章节删除成功' });
    } else {
        res.status(404).json({ success: false, message: '章节不存在' });
    }
});
// 读取设定数据
function readSetting(type, bookId) {
    try {
        const data = fs.readFileSync(path.join(__dirname, `${type}_${bookId}.json`));
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// 保存设定数据
function saveSetting(type, bookId, data) {
    fs.writeFileSync(path.join(__dirname, `${type}_${bookId}.json`), JSON.stringify(data, null, 2));
}

// API端点
app.get('/api/settings/:type', (req, res) => {
    const { type } = req.params;
    const { bookId } = req.query;
    const data = readSetting(type, bookId);
    res.json({ success: true, value: data });
});

app.post('/api/settings/:type', (req, res) => {
    const { type } = req.params;
    const { bookId } = req.query;
    const data = req.body.value;
    saveSetting(type, bookId, data);
    res.json({ success: true, message: `${type} 保存成功` });
});

// 保存章节设定
app.post('/api/chapter-settings', (req, res) => {
    const { bookId, chapterId, title, type, status, summary } = req.body;
    
    try {
        // 转换ID为数字类型
        const numericBookId = parseInt(bookId);
        const numericChapterId = parseInt(chapterId);
        
        if (isNaN(numericBookId) || isNaN(numericChapterId)) {
            throw new Error('无效的书籍ID或章节ID');
        }

        // 更新章节数据
        const chapters = readChapters(numericBookId);
        console.log('读取到的章节数据:', chapters);
        
        const chapterIndex = chapters.findIndex(c => c.id === numericChapterId);
        console.log('查找章节索引:', chapterIndex, '章节ID:', numericChapterId);
        
        if (chapterIndex === -1) {
            throw new Error(`找不到章节(ID: ${numericChapterId})`);
        }
        
        // 更新章节标题
        chapters[chapterIndex].title = title;
        saveChapters(numericBookId, chapters);
        
        // 保存章节设定
        const settings = {
            type,
            status,
            summary,
            updateTime: new Date().toISOString()
        };
        saveChapterSettings(numericBookId, numericChapterId, settings);
        
        res.json({
            success: true,
            message: '章节设定保存成功'
        });
    } catch (error) {
        console.error('保存章节设定失败:', error);
        res.status(500).json({
            success: false,
            message: '保存章节设定失败: ' + error.message
        });
    }
});

// 生成静态页面
app.post('/api/generate-static', async (req, res) => {
    try {
        const { bookId, html, chapters } = req.body;
        
        // 创建静态页面目录
        const staticDir = path.join(__dirname, 'static', bookId.toString());
        if (!fs.existsSync(staticDir)) {
            fs.mkdirSync(staticDir, { recursive: true });
        }

        // 写入主页面
        fs.writeFileSync(path.join(staticDir, 'index.html'), html);

        // 为每个章节生成静态页面
        for (const chapter of chapters) {
            const chapterHtml = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${chapter.title}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            max-width: 100%;
            margin: 0 auto;
            padding: 15px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            background-color: #f8f9fa;
            color: #333;
        }
        
        @media (min-width: 768px) {
            body {
                max-width: 800px;
                padding: 20px;
            }
        }
        
        .chapter-title {
            text-align: center;
            color: #333;
            margin: 20px 0;
            font-size: 1.5rem;
            padding: 0 10px;
        }
        
        .chapter-content {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 1.1rem;
            line-height: 1.8;
        }
        
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding: 15px 0;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .nav-button {
            flex: 1;
            min-width: 80px;
            padding: 12px 15px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            font-size: 0.9rem;
            transition: background-color 0.3s;
            border: none;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }
        
        .nav-button:hover {
            background-color: #45a049;
        }
        
        @media (max-width: 480px) {
            .chapter-title {
                font-size: 1.3rem;
            }
            
            .chapter-content {
                font-size: 1rem;
                padding: 15px;
            }
            
            .nav-button {
                padding: 10px;
                font-size: 0.85rem;
            }
        }
    </style>
</head>
<body>
    <h1 class="chapter-title">${chapter.title}</h1>
    <div class="chapter-content">${chapter.content}</div>
    <div class="navigation">
        <a href="index.html" class="nav-button">返回目录</a>
        ${chapter.id > 1 ? `<a href="chapter_${chapter.id - 1}.html" class="nav-button">上一章</a>` : ''}
        ${chapter.id < chapters.length ? `<a href="chapter_${chapter.id + 1}.html" class="nav-button">下一章</a>` : ''}
    </div>
</body>
</html>`;
            
            fs.writeFileSync(path.join(staticDir, `chapter_${chapter.id}.html`), chapterHtml);
        }

        // 添加静态文件目录到express
        app.use('/static', express.static(path.join(__dirname, 'static')));

        res.json({ 
            success: true, 
            message: '静态页面生成成功',
            path: `/static/${bookId}/index.html`
        });
    } catch (error) {
        console.error('生成静态页面失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '生成静态页面失败: ' + error.message 
        });
    }
});

// DeepSeek API 调用接口
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const temperature = req.body.temperature || 0.7;
        const top_p = req.body.top_p || 0.9;
        const max_tokens = req.body.max_tokens || 8000;
        const model = req.body.model || deepseekConfig.model;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: '无效的消息格式'
                }
            });
        }

        let response;
        let error = null;
        
        // 首先尝试使用指定的模型
        try {
            if (model === 'google-ai') {
                // Google AI 处理逻辑
                const formattedMessages = messages.map(msg => ({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                }));

                if (formattedMessages[0].role !== "user") {
                    formattedMessages.unshift({
                        role: "user",
                        parts: [{ text: "开始对话" }]
                    });
                }

                const chat = googleModel.startChat({
                    history: formattedMessages.slice(0, -1)
                });

                const lastMessage = messages[messages.length - 1];
                const result = await chat.sendMessage(lastMessage.content);
                const responseText = result.response.text();

                response = {
                    choices: [{
                        message: {
                            content: responseText
                        }
                    }]
                };
            } else {
                // DeepSeek 处理逻辑
                const formattedMessages = messages.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }));

                response = await openai.chat.completions.create({
                    model: deepseekConfig.model,
                    messages: formattedMessages,
                    temperature,
                    max_tokens,
                    top_p,
                    stream: false
                });
            }
        } catch (e) {
            error = e;
            console.error(`${model} API调用失败:`, e);
        }



        if (!response || !response.choices || !response.choices[0]) {
            return res.status(500).json({
                success: false,
                error: {
                    message: '无效的API响应格式'
                }
            });
        }

        res.json(response);

    } catch (error) {
        console.error('处理请求时发生错误:', error);
        res.status(500).json({
            success: false,
            error: {
                message: '服务器内部错误',
                details: error.message
            }
        });
    }
});

// 读取章节设定
function readChapterSettings(bookId, chapterId) {
    try {
        // 使用绝对路径
        const filePath = path.resolve(__dirname, 'settings', `chapter_settings_${bookId}_${chapterId}.json`);
        console.log('尝试读取章节设定从:', filePath);
        
        if (!fs.existsSync(filePath)) {
            console.log('文件不存在，返回默认设定');
            return {
                type: 'normal',
                status: 'draft',
                summary: ''
            };
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取章节设定失败:', error);
        return {
            type: 'normal',
            status: 'draft',
            summary: ''
        };
    }
}

// 保存章节设定
function saveChapterSettings(bookId, chapterId, data) {
    try {
        // 使用绝对路径
        const settingsDir = path.resolve(__dirname, 'settings');
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
            console.log('创建settings目录成功:', settingsDir);
        }

        // 构建文件路径
        const filePath = path.join(settingsDir, `chapter_settings_${bookId}_${chapterId}.json`);
        console.log('准备保存章节设定到:', filePath);
        
        // 保存文件
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`成功保存章节设定到: ${filePath}`);
        
        // 验证文件是否成功创建
        if (fs.existsSync(filePath)) {
            console.log('文件创建成功，可以在以下位置找到:', filePath);
        } else {
            throw new Error('文件创建失败');
        }
    } catch (error) {
        console.error('保存章节设定失败:', error);
        throw error;
    }
}

// 获取章节概要API
app.get('/api/chapter-summary', (req, res) => {
    const { bookId, chapterId } = req.query;
    try {
        const settings = readChapterSettings(bookId, chapterId);
        res.json({
            success: true,
            summary: settings.summary || ''
        });
    } catch (error) {
        console.error('获取章节概要失败:', error);
        res.status(500).json({
            success: false,
            message: '获取章节概要失败: ' + error.message
        });
    }
});

// 获取章节设定API
app.get('/api/chapter-settings', (req, res) => {
    const { bookId, chapterId } = req.query;
    try {
        const numericBookId = parseInt(bookId);
        const numericChapterId = parseInt(chapterId);
        
        if (isNaN(numericBookId) || isNaN(numericChapterId)) {
            throw new Error('无效的书籍ID或章节ID');
        }

        const settings = readChapterSettings(numericBookId, numericChapterId);
        res.json({
            success: true,
            settings: settings
        });
    } catch (error) {
        console.error('获取章节设定失败:', error);
        res.status(500).json({
            success: false,
            message: '获取章节设定失败: ' + error.message
        });
    }
});

// 获取连续章节摘要API
app.get('/api/chapter-summaries', (req, res) => {
    const { bookId, chapterId, prevCount, nextCount } = req.query;
    try {
        const numericBookId = parseInt(bookId);
        const numericChapterId = parseInt(chapterId);
        const numericPrevCount = parseInt(prevCount) || 0;
        const numericNextCount = parseInt(nextCount) || 0;
        
        if (isNaN(numericBookId) || isNaN(numericChapterId)) {
            throw new Error('无效的书籍ID或章节ID');
        }

        // 获取所有章节
        const chapters = readChapters(numericBookId);
        const currentChapterIndex = chapters.findIndex(c => c.id === numericChapterId);
        
        if (currentChapterIndex === -1) {
            throw new Error('找不到当前章节');
        }

        const summaries = [];
        
        // 获取前面章节的摘要
        for (let i = currentChapterIndex - numericPrevCount; i < currentChapterIndex; i++) {
            if (i >= 0) {
                const settings = readChapterSettings(numericBookId, chapters[i].id);
                if (settings && settings.summary) {
                    summaries.push(`第${chapters[i].id}章 ${chapters[i].title}：\n${settings.summary}`);
                }
            }
        }

        // 获取后面章节的摘要
        for (let i = currentChapterIndex + 1; i <= currentChapterIndex + numericNextCount; i++) {
            if (i < chapters.length) {
                const settings = readChapterSettings(numericBookId, chapters[i].id);
                if (settings && settings.summary) {
                    summaries.push(`第${chapters[i].id}章 ${chapters[i].title}：\n${settings.summary}`);
                }
            }
        }

        res.json({
            success: true,
            summaries: summaries
        });
    } catch (error) {
        console.error('获取连续章节摘要失败:', error);
        res.status(500).json({
            success: false,
            message: '获取连续章节摘要失败: ' + error.message
        });
    }
});
