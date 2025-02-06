const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const ngrok = require('ngrok');
const OpenAI = require('openai');
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
    title: "DeepSeek V2.5",
    model: "deepseek-ai/DeepSeek-V2.5",
    contextLength: 128000,
    apiBase: "https://api.siliconflow.cn/v1",
    apiKey: "sk-oxndvuljdpkxtoklbibzjharjcrlglxqstrectxsxgkmbagt", // 需要替换为实际的 API key
    provider: "openaiCompatible"
};

// 初始化 OpenAI 客户端
const openai = new OpenAI({
    apiKey: deepseekConfig.apiKey,
    baseURL: deepseekConfig.apiBase
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
        console.log('尝试读取章节数据从:', filePath);
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
    <title>${chapter.title}</title>
    <style>
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
            line-height: 1.6;
        }
        .chapter-title {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .chapter-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .nav-button {
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
        .nav-button:hover {
            background-color: #45a049;
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
        const top_k = req.body.top_k || 50;
        const frequency_penalty = req.body.frequency_penalty || 0;
        const presence_penalty = req.body.presence_penalty || 0;
        const model = req.body.model || deepseekConfig.model;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error('无效的消息格式');
        }

        // 将消息格式转换为 DeepSeek 所需的格式
        const formattedMessages = messages.map(msg => ({
            role: msg.role,
            content: [{
                type: "text",
                text: msg.content
            }]
        }));

        const response = await openai.chat.completions.create({
            model: model,
            messages: formattedMessages,
            temperature: temperature,
            top_p: top_p,
            max_tokens: max_tokens,
            top_k: top_k,
            frequency_penalty: frequency_penalty,
            presence_penalty: presence_penalty,
            stream: false
        });
        console.log(response);
        res.json(response);

    } catch (error) {
        console.error('调用 AI 模型失败:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                type: error.type,
                code: error.code,
                details: error.response?.data || '未知错误'
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
