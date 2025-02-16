const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const OpenAI = require('openai');
const fetch = require('node-fetch');

// 导入 Gradio 客户端
let gradioClient = null;
let isGradioInitialized = false;

async function initGradioClient() {
    if (isGradioInitialized && gradioClient) {
        console.log('Gradio客户端已初始化');
        return;
    }
    
    try {
        console.log('开始初始化Gradio客户端...');
        const { Client } = await import('@gradio/client');
        console.log('成功导入@gradio/client');
        
        gradioClient = await Client.connect(config.apiSoundBase);
        console.log('成功创建Gradio客户端实例');
        
        isGradioInitialized = true;
    } catch (error) {
        console.error('Gradio客户端连接失败:', error);
        console.error('错误详情:', {
            message: error.message,
            stack: error.stack
        });
        gradioClient = null;
        isGradioInitialized = false;
        throw error;
    }
}

// 定期尝试重新连接
setInterval(async () => {
    if (!isGradioInitialized) {
        await initGradioClient();
    }
}, 30000); // 每30秒尝试重新连接一次

// 读取配置文件
const configPath = path.join(__dirname, 'newbook', 'key.config');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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
       // console.log('创建settings目录成功:', settingsDir);
    }
} catch (error) {
    console.error('创建settings目录失败:', error);
}

// DeepSeek 模型配置
const deepseekConfig = {
    title: "DeepSeek V3",
    model: "deepseek-coder-33b-instruct",
    contextLength: 64000,
    apiBase: config.deepseek.apiBase,
    apiKey: config.deepseek.apiKey,
    provider: "openaiCompatible"
};

// 初始化 OpenAI 客户端
const openai = new OpenAI({
    apiKey: config.deepseek.apiKey,
    baseURL: config.deepseek.apiBase
});

// 英伟达AI配置
const yingweidaConfig = {
    apiKey: config.yingweida.apiKey,
    apiBase: config.yingweida.apiBase,
    model: config.yingweida.model
};

// 天翼AI配置
const tianyiConfig = {
    apiKey: config.tianyi.apiKey,
    modelId: config.tianyi.modelId,
    apiBase: config.tianyi.apiBase
};

// 华为云AI配置
const huaweiConfig = {
    apiKey: config.huawei.apiKey,
    apiBase: config.huawei.apiBase,
    model: config.huawei.model
};

// 火山引擎DeepSeek配置
const doubaoConfig = {
    apiKey: config.doubao.apiKey,
    apiBase: config.doubao.apiBase,
    model: config.doubao.model
};

// 火山引擎DeepSeekR1配置
const doubaoR1Config = {
    apiKey: config.doubaoR1.apiKey,
    apiBase: config.doubaoR1.apiBase,
    model: config.doubaoR1.model
};
// 硅基流动deepseekR1配置
const siliconflowDeepseekR1Config = {
    apiKey: config.siliconflowDeepseekR1.apiKey,
    apiBase: config.siliconflowDeepseekR1.apiBase,
    model: config.siliconflowDeepseekR1.model
};
// 硅基流动deepseekV3配置
const siliconflowDeepseekV3Config = {
    apiKey: config.siliconflowDeepseekV3.apiKey,
    apiBase: config.siliconflowDeepseekV3.apiBase,
    model: config.siliconflowDeepseekV3.model
};
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
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
        author:  req.session.user.username, // 实际应该从session获取
        chapters: []
    };
    books.push(newBook);
    saveBooks(books);
    res.json({ success: true, book: newBook });
});

app.listen(port, async () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    
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
       // console.log('保存章节数据到:', filePath);
        fs.writeFileSync(filePath, JSON.stringify(chapters, null, 2), 'utf8');
       // console.log('章节数据保存成功'+new Date().toISOString());
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
      //  console.log('读取到的章节数据:', chapters);
        
        const chapterIndex = chapters.findIndex(c => c.id === numericChapterId);
       // console.log('查找章节索引:', chapterIndex, '章节ID:', numericChapterId);
        
        if (chapterIndex === -1) {
            //如果章节不存在，生成章节
            const newChapter = {    
                id: numericChapterId,
                title: title,
                content: '',
                createTime: new Date().toISOString()
            };
            chapters.push(newChapter);
            saveChapters(numericBookId, chapters);
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

        // 添加静态文件目录到express
        app.use('/static', express.static(path.join(__dirname, 'static')));

        res.json({ 
            success: true, 
            message: '静态页面目录结构创建成功'
        });
    } catch (error) {
        console.error('创建静态页面目录结构失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '创建静态页面目录结构失败: ' + error.message 
        });
    }
});

// 处理章节内容分块
app.post('/api/generate-static-chunk', async (req, res) => {
    try {
        const { bookId, chapters } = req.body;
        const staticDir = path.join(__dirname, 'static', bookId.toString());

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

        res.json({ 
            success: true, 
            message: '章节内容处理成功'
        });
    } catch (error) {
        console.error('处理章节内容失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '处理章节内容失败: ' + error.message 
        });
    }
});

// 生成txt文件
app.post('/api/generate-static-txt', async (req, res) => {
    try {
        const { bookId, bookTitle, txtContent } = req.body;

        // 在newbook目录下生成txt文件
        const newbookDir = path.join(__dirname, 'newbook');
        if (!fs.existsSync(newbookDir)) {
            fs.mkdirSync(newbookDir, { recursive: true });
        }
        fs.writeFileSync(path.join(newbookDir, `${bookTitle}.txt`), txtContent);

        res.json({ 
            success: true, 
            message: 'TXT文件生成成功'
        });
    } catch (error) {
        console.error('生成TXT文件失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '生成TXT文件失败: ' + error.message 
        });
    }
});

// 添加聊天API处理
app.post('/api/chat', async (req, res) => {
    const { messages, model, temperature, top_p, max_tokens } = req.body;

    try {
        if (model === 'huawei-ai') {
            // 调用华为云AI
            const response = await fetch(`${huaweiConfig.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${huaweiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: huaweiConfig.model,
                    messages,
                    temperature: temperature || 0.5,
                    max_tokens: 2048,
                    stream: false
                })
            });

            const result = await response.json();
           // console.log('华为云AI返回结果:', result);
            if (result.choices && result.choices[0]) {
                res.json({
                    choices: [{
                        message: {
                            content: result.choices[0].message.content
                        }
                    }]
                });
            } else {
                console.error('华为云AI返回错误:', result.error);
                res.status(500).json({
                    error: {
                        message: '调用华为云AI失败: ' + (result.error ? result.error.message : '未知错误')
                    }
                });
            }
        }
        else if (model === 'doubao-deepseek-r1-ai') {
            // 调用火山引擎DeepSeekR1
            const response = await fetch(`${doubaoR1Config.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${doubaoR1Config.apiKey}`
                },
                body: JSON.stringify({
                    model: doubaoR1Config.model,
                    messages,
                    temperature: temperature || 0.5,
                    top_p: top_p || 0.8,
                    max_tokens: max_tokens || 8000,
                    stream: false
                })
            });
            const result = await response.json();
            //序列化火山引擎DeepSeekR1返回结果: {"choices":[{"finish_reason":"stop","index":0,"logprobs":null,"message":{"content":"\n\n你好！很高兴见到你。有什么我可以帮助你的吗？","reasoning_content":"好的，用户发来了"你好"，这是一个常见的中文问候。我需要用中文回复，保持友好和自然。首先，我应 该回应问候，比如"你好！很高兴见到你。"然后，按照用户的要求，我需要提供一个例子来展示我的思考过程，但用户可能希望这个例子是中文的。接下来，我需要确保回答符合他们的需求，比如询问他们需要什么帮助。要注意保持口语化，避免使用格式化的结构，同时遵循中文的表达习惯。此外，要避免任何Markdown格式，保持文本简洁。最后，确保回答准确，符合用户的指示。现在，把这些整合起来，形成自然流畅的回应。\n","role":"assistant"}}],"created":1739110675,"id":"02173911066296584bae976ab37fc49f95f8882bb751870ac2210","model":"deepseek-r1-250120","object":"chat.completion","usage":{"completion_tokens":145,"prompt_tokens":12,"total_tokens":157,"prompt_tokens_details":{"cached_tokens":0},"completion_tokens_details":{"reasoning_tokens":132}}}
            const resultString = JSON.stringify(result);
           // console.log('火山引擎DeepSeekR1返回结果:', resultString);
           const reasoning_content = result.choices[0].message["reasoning_content"];
           const content = result.choices[0].message["content"];
           const assistantMessage = "思考过程：" + reasoning_content + "\n\n回答："  + content;
            res.json({
                choices: [{
                    message: {
                        content: assistantMessage
                    }
                }]
            });
        }
        else if (model === 'doubao-deepseek-ai') {
            // 调用火山引擎DeepSeek
            const response = await fetch(`${doubaoConfig.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${doubaoConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: doubaoConfig.model,
                    messages,
                    temperature: temperature || 0.5,
                    top_p: top_p || 0.8,
                    max_tokens: max_tokens || 8000,
                    stream: false
                })
            });
            const result = await response.json();
           // console.log('火山引擎DeepSeek返回结果:', result);
            res.json({
                choices: [{
                    message: {
                        content: result.choices[0].message.content
                    }
                }]
            });
        
        }   
        else if (model === 'yingweida') {
            // 调用英伟达AI
            const response = await fetch(`${yingweidaConfig.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${yingweidaConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: yingweidaConfig.model,
                    messages,
                    temperature: temperature || 0.5,
                    top_p: top_p || 0.8,
                    max_tokens: max_tokens || 2048,
                    stream: false
                })
            });
            const result = await response.json();
            res.json({
                choices: [{
                    message: {
                        content: result.choices[0].message.content
                    }
                }]
            });
        }   
        else if (model === 'deepseek-tianyi-ai') {
            // 调用天翼AI
            const response = await fetch(`${tianyiConfig.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tianyiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: tianyiConfig.modelId,
                    messages,
                    temperature: temperature || 0.5,
                    top_p: top_p || 0.8,
                    max_tokens: max_tokens || 2048,
                    stream: false
                })
            });

            const result = await response.json();
            
            if (result.code === 0 && result.choices && result.choices[0]) {
                res.json({
                    choices: [{
                        message: {
                            content: result.choices[0].message.content
                        }
                    }]
                });
            } else {
                console.error('天翼AI返回错误:', result.error);
                res.status(500).json({
                    error: {
                        message: '调用天翼AI失败: ' + (result.error ? result.error.message : '未知错误')
                    }
                });
            }
        }
        else if (model=="deepseek-ai/DeepSeek-R1"){
            // 调用硅基流动deepseekR1
            const response = await fetch(`${siliconflowDeepseekR1Config.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${siliconflowDeepseekR1Config.apiKey}`
                },
                body: JSON.stringify({
                    model: siliconflowDeepseekR1Config.model,
                    messages,
                    temperature: temperature || 0.5,
                    top_p: top_p || 0.8,
                    max_tokens: max_tokens || 4096,
                    stream: false
                })
            });
            const result = await response.json();
           // console.log('硅基流动deepseekR1返回结果:', result);
            res.json({
                choices: [{
                    message: {
                        content: result.choices[0].message.content
                    }
                }]
            });
        }
        else if (model=="deepseek-ai/DeepSeek-V3"){
            // 调用硅基流动deepseekV3
            const response = await fetch(`${siliconflowDeepseekV3Config.apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${siliconflowDeepseekV3Config.apiKey}`
                },
                body: JSON.stringify({
                    model: siliconflowDeepseekV3Config.model,
                    messages,
                    temperature: temperature || 0.5,
                    top_p: top_p || 0.8,
                    max_tokens: max_tokens || 4096,
                    stream: false
                })
            });
            const result = await response.json();
          //  console.log('硅基流动deepseekV3返回结果:', result);
            res.json({
                choices: [{
                    message: {
                        content: result.choices[0].message.content
                    }
                }]
            });
        }   
        else {
            // 处理其他模型
            res.status(400).json({ error: { message: '不支持的模型类型' } });
        }
    } catch (error) {
        console.error('处理聊天请求时出错:', error);
        res.status(500).json({
            error: {
                message: '服务器内部错误: ' + error.message
            }
        });
    }
});

// 读取章节设定
function readChapterSettings(bookId, chapterId) {
    try {
        // 使用绝对路径
        const filePath = path.resolve(__dirname, 'settings', `chapter_settings_${bookId}_${chapterId}.json`);
       // console.log('尝试读取章节设定从:', filePath);
        
        if (!fs.existsSync(filePath)) {
        //    console.log('文件不存在，返回默认设定');
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
           // console.log('创建settings目录成功:', settingsDir);
        }

        // 构建文件路径
        const filePath = path.join(settingsDir, `chapter_settings_${bookId}_${chapterId}.json`);
        //console.log('准备保存章节设定到:', filePath);
        
        // 保存文件
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        //console.log(`成功保存章节设定到: ${filePath}`);
        
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
        for (let i = currentChapterIndex ; i <= currentChapterIndex + numericNextCount; i++) {
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


// 文本操作函数
function operateText(lineNumber, operation, text1, text2) {
    // 将文本2按行分割成数组
    const lines = text2.split('\n');
    
    // 根据不同操作类型处理文本
    switch (operation.toLowerCase()) {
        case 'insert':
            // 在指定行前插入文本
            if (lineNumber > 0 && lineNumber <= lines.length + 1) {
                lines.splice(lineNumber - 1, 0, text1);
            }
            break;
            
        case 'update':
            // 更新指定行的文本
            if (lineNumber > 0 && lineNumber <= lines.length) {
                lines[lineNumber - 1] = text1;
            }
            break;
            
        case 'delete':
            // 删除指定行
            if (lineNumber > 0 && lineNumber <= lines.length) {
                lines.splice(lineNumber - 1, 1);
            }
            break;
            
        case 'append':
            // 在指定行后追加文本
            if (lineNumber > 0 && lineNumber <= lines.length) {
                lines.splice(lineNumber, 0, text1);
            }
            break;
            
        default:
            throw new Error('不支持的操作类型');
    }
    
    // 将处理后的数组重新组合成文本并返回
    return lines.join('\n');
}

// 处理文本操作指令的函数
function processTextOperations(operationsText, targetText) {
    // 定义匹配操作指令的正则表达式（包括行操作和替换操作）
    const lineOperationPattern = /(insert|delete|append|update)\((\d+),([^)]+)\)/g;
    const replacePattern = /replace\(([^,]+),([^)]+)\)/g;
    
    // 存储所有找到的操作
    const operations = [];
    let match;
    
    // 查找所有行操作指令
    while ((match = lineOperationPattern.exec(operationsText)) !== null) {
        operations.push({
            type: 'line',
            operation: match[1],         // 操作类型
            lineNumber: parseInt(match[2]), // 行号
            text: match[3].trim()        // 要操作的文本
        });
    }
    
    // 查找所有替换操作指令
    while ((match = replacePattern.exec(operationsText)) !== null) {
        operations.push({
            type: 'replace',
            searchText: match[1].trim(),    // 要查找的文本
            replaceText: match[2].trim()    // 要替换的文本
        });
    }
    
    // 先执行替换操作
    let resultText = targetText;
    for (const op of operations.filter(op => op.type === 'replace')) {
        resultText = resultText.split(op.searchText).join(op.replaceText);
    }
    
    // 按行号从大到小排序行操作（从后往前执行）
    const lineOperations = operations.filter(op => op.type === 'line')
        .sort((a, b) => b.lineNumber - a.lineNumber);
    
    // 执行行操作
    for (const op of lineOperations) {
        resultText = operateText(
            op.lineNumber,
            op.operation,
            op.text,
            resultText
        );
    }
    
    return resultText;
}

// 添加语音生成API
app.post('/api/generate-audio', async (req, res) => {
    try {
        console.log('收到语音生成请求:', req.body);

        // 检查请求体格式
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                success: false,
                message: '无效的请求格式'
            });
        }

        // 获取请求参数
        const {
            text,
            temperature = 0.00001,  // 使用前端传递的参数，如果没有则使用默认值
            top_P = 0.1,
            top_K = 1,
            audio_seed_input = 3,
            text_seed_input = 3,
            refine_text_flag = true
        } = req.body;

        // 验证必要参数
        if (!text) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数: text'
            });
        }

        // 验证参数范围
        if (temperature < 0 || temperature > 1) {
            return res.status(400).json({
                success: false,
                message: '温度参数必须在0到1之间'
            });
        }

        if (top_P < 0 || top_P > 1) {
            return res.status(400).json({
                success: false,
                message: 'Top P参数必须在0到1之间'
            });
        }

        if (top_K < 1) {
            return res.status(400).json({
                success: false,
                message: 'Top K参数必须大于等于1'
            });
        }

        console.log('正在初始化Gradio客户端...');
        // 如果客户端未初始化，尝试初始化
        if (!isGradioInitialized || !gradioClient) {
            await initGradioClient();
        }

        if (!gradioClient) {
            console.error('Gradio客户端初始化失败');
            return res.status(503).json({
                success: false,
                message: '语音生成服务暂时不可用，请稍后重试'
            });
        }

        console.log('开始调用Gradio API...');
        console.log('参数:', {
            text,
            temperature,
            top_P,
            top_K,
            audio_seed_input,
            text_seed_input,
            refine_text_flag
        });

        // 调用 Gradio API
        const result = await gradioClient.predict("/generate_audio", [
            text,
            temperature,
            top_P,
            top_K,
            audio_seed_input,
            text_seed_input,
            refine_text_flag
        ]);

        console.log('Gradio API返回结果:', result);

        // 解构返回的数组
        const [audioFilePath, outputText] = result.data;

        res.json({
            success: true,
            data: {
                audioFilePath,
                outputText
            }
        });
        
    } catch (error) {
        console.error('生成语音失败:', error);
        // 如果是连接错误，重置客户端状态
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
            isGradioInitialized = false;
            gradioClient = null;
            console.log('重置Gradio客户端状态');
        }
        res.status(500).json({
            success: false,
            message: '生成语音失败: ' + error.message
        });
    }
});
