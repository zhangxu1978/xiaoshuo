const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const ngrok = require('ngrok');
const app = express();
const port = 8090;

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
        author: 'test_user', // 实际应该从session获取
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
        const data = fs.readFileSync(path.join(__dirname, `chapters_${bookId}.json`));
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// 保存章节数据
function saveChapters(bookId, chapters) {
    fs.writeFileSync(path.join(__dirname, `chapters_${bookId}.json`), JSON.stringify(chapters, null, 4));
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
