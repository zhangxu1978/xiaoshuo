let currentUser = null;
let currentBook = null;
const bookId = new URLSearchParams(window.location.search).get('bookId');

// 检查登录状态
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/check-login');
        const data = await response.json();
        if (!data.success) {
            window.location.href = '/index.html';
        }
        currentUser = data.user;
        loadBookDetails();
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = '/index.html';
    }
}

// 加载书籍详情
async function loadBookDetails() {
    try {
        const response = await fetch(`/api/books/${bookId}`);
        const book = await response.json();
        currentBook = book;
        document.getElementById('bookTitle').textContent = book.title;
        
        // 如果是作者，显示添加章节按钮
        if (currentUser.username === book.author) {
            document.getElementById('addChapterBtn').style.display = 'block';
        }
        
        loadChapters();
    } catch (error) {
        console.error('加载书籍详情失败:', error);
    }
}

// 加载章节列表
async function loadChapters() {
    try {
        const response = await fetch(`/api/books/${bookId}/chapters`);
        const chapters = await response.json();
        const chapterList = document.getElementById('chapterList');
        chapterList.innerHTML = '';

        chapters.forEach(chapter => {
            const chapterItem = document.createElement('div');
            chapterItem.className = 'chapter-item';
            chapterItem.innerHTML = `
                <span>${chapter.title}</span>
                <div class="edit-buttons">
                    ${currentUser.username === currentBook.author ? 
                        `<button onclick="showReconstructChapter(${chapter.id})" style="background-color: #ff5722; color: white;">章节重构</button>
                         <button onclick="editChapter(${chapter.id})">编辑</button>
                         <button onclick="deleteChapter(${chapter.id})">删除</button>` 
                        : ''}
                </div>
            `;
            chapterItem.onclick = (e) => {
                if (!e.target.matches('button')) {
                    window.location.href = `/reader.html?bookId=${bookId}&chapterId=${chapter.id}`;
                }
            };
            chapterList.appendChild(chapterItem);
        });
    } catch (error) {
        console.error('加载章节失败:', error);
    }
}

// 编辑章节
async function editChapter(chapterId) {
    window.location.href = `/editor.html?bookId=${bookId}&chapterId=${chapterId}`;
}

// 删除章节
async function deleteChapter(chapterId) {
    if (confirm('确定要删除这个章节吗？')) {
        try {
            const response = await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                loadChapters();
            } else {
                alert('删除章节失败: ' + result.message);
            }
        } catch (error) {
            console.error('删除章节失败:', error);
            alert('删除章节失败');
        }
    }
}

// 显示模态框
function showModal(type) {
    const modal = document.getElementById('myModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalText = document.getElementById('modalText');
    const modalControls = document.getElementById('modalControls');
    const characterControls = document.getElementById('characterControls');
    const timelineControls = document.getElementById('timelineControls');
    const worldTimelineControls = document.getElementById('worldTimelineControls');
    modal.style.display = 'block';
    modalTitle.textContent = type + ' 设定';
    
    // 根据类型显示不同的控制元素
    modalControls.style.display = type === 'environment' ? 'block' : 'none';
    characterControls.style.display = type === 'characters' ? 'block' : 'none';
    timelineControls.style.display = type === 'characterTimeline' ? 'block' : 'none';
    worldTimelineControls.style.display = type === 'worldTimeline' ? 'block' : 'none';
    
    fetch(`/api/settings/${type}?bookId=${bookId}`)
        .then(response => response.json())
        .then(data => {
            modalText.value = data.value || '';
        })
        .catch(error => {
            console.error('获取设定失败:', error);
            modalText.value = '';
        });
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('myModal');
    const modalContent = modal.querySelector('.modal-content');
    modalContent.classList.remove('maximized', 'minimized');
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    modal.style.display = 'none';
}

// 保存模态框内容
function saveModalContent() {
    const modalText = document.getElementById('modalText');
    const modalTitle = document.getElementById('modalTitle');
    const type = modalTitle.textContent.split(' ')[0].toLowerCase();
    fetch(`/api/settings/${type}?bookId=${bookId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: modalText.value })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal();
        } else {
            alert('保存设定失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('保存设定失败:', error);
        alert('保存设定失败');
    });
}

// 生成静态页面
async function generateStaticPage() {
    try {
        // 获取书籍信息和章节列表
        const bookResponse = await fetch(`/api/books/${bookId}`);
        const book = await bookResponse.json();
        
        const chaptersResponse = await fetch(`/api/books/${bookId}/chapters`);
        const chapters = await chaptersResponse.json();

        // 生成静态HTML内容
        const staticHtml = `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>${book.title}</title>
<style>
body {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}
.chapter-list {
    list-style: none;
    padding: 0;
}
.chapter-item {
    padding: 15px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}
.chapter-item:hover {
    background-color: #f5f5f5;
}
h1 {
    text-align: center;
    color: #333;
}
</style>
</head>
<body>
<h1>${book.title}</h1>
<div class="chapter-list">
${chapters.map(chapter => `
    <div class="chapter-item" onclick="window.location.href='chapter_${chapter.id}.html'">
        ${chapter.title}
    </div>
`).join('')}
</div>
</body>
</html>`;

        // 首先创建静态页面目录结构
        const response = await fetch('/api/generate-static', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: bookId,
                html: staticHtml,
                chapters: chapters.map(chapter => ({
                    id: chapter.id,
                    title: chapter.title
                }))
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }

        // 分块处理章节内容
        const CHUNK_SIZE = 5; // 每次处理5个章节
        for (let i = 0; i < chapters.length; i += CHUNK_SIZE) {
            const chapterChunk = chapters.slice(i, i + CHUNK_SIZE);
            
            // 发送章节内容
            const chunkResponse = await fetch('/api/generate-static-chunk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bookId: bookId,
                    chapters: chapterChunk
                })
            });

            const chunkResult = await chunkResponse.json();
            if (!chunkResult.success) {
                throw new Error(chunkResult.message);
            }
        }

        // 生成txt文件
        let txtContent = `${book.title}\n\n`;
        for (const chapter of chapters) {
            txtContent += `${chapter.title}\n\n${chapter.content}\n\n`;
        }

        // 发送txt内容
        const txtResponse = await fetch('/api/generate-static-txt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: bookId,
                bookTitle: book.title,
                txtContent: txtContent
            })
        });

        const txtResult = await txtResponse.json();
        if (txtResult.success) {
            alert('静态页面生成成功！\n访问路径：/static/' + bookId + '/index.html\nTXT文件路径：/newbook/' + book.title + '.txt');
        } else {
            alert('生成TXT文件失败: ' + txtResult.message);
        }
    } catch (error) {
        console.error('生成静态页面失败:', error);
        alert('生成静态页面失败');
    }
}

// 显示AI模态框
function showAiModal() {
    const modal = document.getElementById('aiModal');
    modal.style.display = 'block';
}

// 关闭AI模态框
function closeAiModal() {
    const modal = document.getElementById('aiModal');
    const modalContent = modal.querySelector('.modal-content');
    modalContent.classList.remove('maximized', 'minimized');
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    modal.style.display = 'none';
}

// 加载设定内容到AI iframe
async function loadSettingToAi(type) {
    try {
        const response = await fetch(`/api/settings/${type}?bookId=${bookId}`);
        const data = await response.json();
        const content = data.value || '';
        
        // 获取iframe并设置内容到user-input输入框
        const aiFrame = document.getElementById('aiFrame');
        const userInput = aiFrame.contentDocument.getElementById('user-input');
        if (userInput) {
            userInput.value += content;
            // 触发input事件以调整输入框高度
            const event = new Event('input', { bubbles: true });
            userInput.dispatchEvent(event);
        }
    } catch (error) {
        console.error('加载设定失败:', error);
        alert('加载设定失败');
    }
}

// 加载章节内容到AI iframe
async function loadChapterToAi() {
    try {
        const chapterInput = document.getElementById('chapterInput');
        const chapterId = chapterInput.value;
        
        if (!chapterId) {
            alert('请输入章节号');
            return;
        }

        const response = await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`);
        const data = await response.json();
        
        if (!data.content) {
            alert('未找到该章节内容');
            return;
        }

        // 获取iframe并设置内容到user-input输入框
        const aiFrame = document.getElementById('aiFrame');
        const userInput = aiFrame.contentDocument.getElementById('user-input');
        if (userInput) {
            userInput.value += '\n\n第' + chapterId + '章内容：\n' + data.content;
            // 触发input事件以调整输入框高度
            const event = new Event('input', { bubbles: true });
            userInput.dispatchEvent(event);
        }
    } catch (error) {
        console.error('加载章节失败:', error);
        alert('加载章节失败');
    }
}

// 添加关键词到AI iframe
function addKeywordToAi() {
    const keywordSelect = document.getElementById('keywordSelect');
    const selectedKeyword = keywordSelect.value.replace(/&#13;&#10;/g, '\n');
    
    const aiFrame = document.getElementById('aiFrame');
    const userInput = aiFrame.contentDocument.getElementById('user-input');
    if (userInput) {
        // 如果当前输入框已有内容，先添加两个换行符
        if (userInput.value.trim() !== '') {
            userInput.value += '\n\n';
        }
        userInput.value += selectedKeyword;
        // 触发input事件以调整输入框高度
        const event = new Event('input', { bubbles: true });
        userInput.dispatchEvent(event);
    }
}

// 切换最大化状态
function toggleMaximize(event) {
    const modalContent = event.target.closest('.modal-content');
    const modal = modalContent.parentElement;
    
    // 如果当前是最小化状态，先恢复正常大小
    if (modalContent.classList.contains('minimized')) {
        toggleMinimize(event);
    }
    
    modalContent.classList.toggle('maximized');
    
    // 更新最大化按钮的图标
    const maximizeBtn = event.target;
    if (modalContent.classList.contains('maximized')) {
        maximizeBtn.innerHTML = '&#9744;'; // 显示还原图标
    } else {
        maximizeBtn.innerHTML = '&#9633;'; // 显示最大化图标
    }
}

// 切换最小化状态
function toggleMinimize(event) {
    const modalContent = event.target.closest('.modal-content');
    const modal = modalContent.parentElement;
    
    // 如果当前是最大化状态，先恢复正常大小
    if (modalContent.classList.contains('maximized')) {
        modalContent.classList.remove('maximized');
        event.target.previousElementSibling.innerHTML = '&#9633;';
    }
    
    modalContent.classList.toggle('minimized');
    
    // 切换蒙版显示
    if (modalContent.classList.contains('minimized')) {
        modal.style.backgroundColor = 'transparent';
    } else {
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    }
}

// 通用的大模型调用函数
async function callLargeModel(modelId, prompt) {
    try {
        if (modelId === 'google-ai'||modelId==='google-ai-thinking') {
            let model='gemini-2.0-flash-exp';
            if(modelId==='google-ai-thinking'){
                model='gemini-2.0-flash-thinking-exp';
            }
            // 调用谷歌 AI API
            const url = 'https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key=AIzaSyAxPOoOh-zAvC7FoFaxKd15E1NDGKhotAI';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const result = await response.json();
            if (result.candidates && result.candidates[0] && result.candidates[0].content) {
                return result.candidates[0].content.parts[0].text;
            }
        } else {
            // 其他模型通过服务器处理
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: config.systemPrompts[getSystemPromptType(prompt)]
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: modelId,
                    temperature: 0.5,
                    top_p: 0.9,
                    max_tokens: 8000
                })
            });

            const result = await response.json();

            if (result.choices && result.choices[0]) {
                            //写入日志
            await fetch('/api/write-log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userMessage: prompt, aiResponse: result.choices[0].message.content })
            });
                return result.choices[0].message.content;
            }
        }
        throw new Error('未获取到有效响应');
    } catch (error) {
        console.error('调用大模型失败:', error);
        throw error;
    }
}

// 根据提示词类型获取对应的系统提示词
function getSystemPromptType(prompt) {
    if (prompt.includes('小说策划师') && prompt.includes('世界观设定')) {
        return 'novel';
    } else if (prompt.includes('小说策划师') && prompt.includes('人物设定')) {
        return 'novel-character';
    } else if (prompt.includes('小说策划师') && prompt.includes('章节目录')) {
        return 'novel-timeline';
    } else if (prompt.includes('小说重构助手')) {
        return 'reconstructor';
    } else if (prompt.includes('专业小说作家')) {
        return 'writer';
    }
    return 'novel'; // 默认返回
}

// 修改生成世界观函数
async function generateModalWorldView() {
    const modelSelect = document.getElementById('modalModelSelect');
    const novelTypeSelect = document.getElementById('modalNovelTypeSelect');
    const selectedModel = modelSelect.value;
    const novelType = novelTypeSelect.value;
    const modalText = document.getElementById('modalText');
//获取生成世界观的要求
    const worldRequirements = document.getElementById('worldRequirements').value;
    //获取当前世界观的内容
    const worldViewResponse = modalText.value;
    let prompt = `用户给出的建议：\n${worldRequirements}\n\n`;
    prompt += `当前世界观：\n${worldViewResponse}\n\n`;
    prompt += `请你作为一个专业的小说策划师，为我构建一个完整的${novelType}类型小说的世界观设定。
需要包含以下要素：
1. 世界背景：整体世界观的基本设定，包括时代背景、空间结构等
2. 核心法则：该世界运行的基本规则，如修炼体系、科技水平、力量体系等
3. 主要势力：世界中的主要势力分布和特点
4. 特殊元素：独特的物品、生物、现象等
5. 文明特征：世界中的文明发展水平、文化特点等
6. 冲突源：潜在的矛盾点和冲突来源
7.丰富的想象力、逻辑自洽

请详细描述每个方面，使其既符合${novelType}小说的特点，又具有独特性和创新性。`;

    try {
        modalText.value = '正在生成世界观设定...';
        modalText.value = await callLargeModel(selectedModel, prompt);
    } catch (error) {
        modalText.value = '生成世界观失败，请重试';
    }
}

// 修改生成人物设定函数
async function generateCharacters() {
    const modelSelect = document.getElementById('characterModelSelect');
    const includeWorldView = document.getElementById('includeWorldView');
    const includeWorldTimeline = document.getElementById('includeWorldTimeline');
    const selectedModel = modelSelect.value;
    const modalText = document.getElementById('modalText');
    let context = '';

    if (includeWorldView.checked) {
        try {
            const response = await fetch(`/api/settings/environment?bookId=${bookId}`);
            const data = await response.json();
            if (data.value) {
                context += '世界观设定：\n' + data.value + '\n\n';
            }
        } catch (error) {
            console.error('获取世界观失败:', error);
        }
    }

    if (includeWorldTimeline.checked) {
        try {
            const response = await fetch(`/api/settings/worldTimeline?bookId=${bookId}`);
            const data = await response.json();
            if (data.value) {
                context += '故事大纲：\n' + data.value + '\n\n';
            }
        } catch (error) {
            console.error('获取故事大纲失败:', error);
        }
    }
//获取生成人物的要求        
    const characterRequirements = document.getElementById('characterRequirements').value;
     context += '用户给出的建议：\n' + characterRequirements + '\n\n';
   // context += '当前人物设定：\n' + worldViewResponse + '\n\n';
    const  prompt = `请你作为一个专业的小说策划师，${context ? '基于以下信息：\n\n' + context + '\n\n' : ''}为我构建一组完整的小说人物设定。
需要包含以下要素：
1. 主要人物：详细描述每个主要人物的性格特征、背景故事、能力特点等
2. 次要人物：简要描述重要的配角人物
3. 人物关系：描述主要人物之间的关系网络
4. 成长轨迹：主要人物可能的成长方向和发展路线
5. 矛盾冲突：人物之间潜在的矛盾点和冲突源
6. 个性特征：每个主要人物独特的性格特点和行为模式
7.人物决策树

为每个主要角色制作"性格-处境"响应表
示例：
| 角色 | 恐惧源 | 应激反应模式 | 道德底线 |
|---|---|---|---|
| 主角A | 失去控制 | 先发制人攻击 | 不伤害无辜者 |
| 反派B | 被遗忘 | 制造大规模事件 | 无 |
请详细描述每个方面，使人物形象丰满立体，性格特点鲜明，关系网络合理。`;

    try {
        modalText.value = '正在生成人物设定...';
        modalText.value = await callLargeModel(selectedModel, prompt);
    } catch (error) {
        modalText.value = '生成人物设定失败，请重试';
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    if (!bookId) {
        window.location.href = '/bookshelf.html';
        return;
    }
    checkLoginStatus();

    // 添加新章节的事件处理
    document.getElementById('addChapterBtn').onclick = async () => {
        window.location.href = `/editor.html?bookId=${bookId}`;
    };
// 定义一个系数来加快拖动速度，这里设置为 2，你可以根据需要调整
// const speedFactor = 5; 
    // 拖动模态框
    interact('.modal-content')
        .draggable({
            allowFrom: '.modal-header',
            listeners: {
                move: function (event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            }
        });
});

async function generateChapterOutline() {
    const modelSelect = document.getElementById('timelineModelSelect');
    const startChapter = document.getElementById('startChapter').value;
    const endChapter = document.getElementById('endChapter').value;
    const chapterCount = endChapter - startChapter + 1;
    const outlineRequirements = document.getElementById('outlineRequirements').value;
    const modalText = document.getElementById('modalText');
    const selectedModel = modelSelect.value;

    try {
        // 获取世界观和人物设定
        const worldviewResponse = await fetch(`/api/settings/environment?bookId=${bookId}`);
        const worldviewData = await worldviewResponse.json();
        const worldview = worldviewData.value || '';

        const charactersResponse = await fetch(`/api/settings/characters?bookId=${bookId}`);
        const charactersData = await charactersResponse.json();
        const characters = charactersData.value || '';
//获取故事大纲
        const worldTimelineResponse = await fetch(`/api/settings/worldTimeline?bookId=${bookId}`);
        const worldTimelineData = await worldTimelineResponse.json();
        const worldTimeline = worldTimelineData.value || '';
        const prompt = `请根据以下世界观，故事大纲和人物设定，生成第${startChapter}章到第${endChapter}章共${chapterCount}章的小说章节目录。
每章的格式必须严格按照："章节序号，章节名称，【章节目标 |发生时间 | 发生地点 | 出场人物 | 关键事件 | 伏笔/回收 | 情绪基调 | 场景1-核心冲突 | 场景2-核心冲突 | ...】"字数200字左右，写清楚本章的剧情。
如果有多个人物或场景出现，用"||"分隔。一句话介绍应该包含
例如：
1，初入修仙界，【章节目标：少年踏上修行之路。| 发生时间：1000年 | 发生地点：修仙界 | 出场人物：张三 | 关键事件：初入宗门 | 伏笔/回收：无 | 情绪基调：热血 | 场景1：山门-核心冲突：弟子间的竞争 | 场景2：外门弟子住处-核心冲突：弟子间的竞争 | 场景3：藏经阁-核心冲突：弟子间的竞争】
2，寻找灵药，【章节目标：寻找灵药 | 发生时间：1001年 | 发生地点：修仙界 | 出场人物：张三||李四 | 关键事件：寻找灵药 | 伏笔/回收：无 | 情绪基调：热血 | 场景1：药王谷-核心冲突：找不到位置 | 场景2 ：药王谷内仙藤-核心冲突：护药妖兽】
...

世界观设定：
${worldview}

故事大纲：
${worldTimeline}

人物设定：
${characters}

特殊要求：
${outlineRequirements}

请参考以上内容，生成${chapterCount}章的章节目录，确保每章都符合世界观，故事大纲和人物设定，并且故事情节连贯，富有张力。同时请严格遵守特殊要求中的内容。`;

        modalText.value = '正在生成章节目录...';

        modalText.value  = await callLargeModel(selectedModel, prompt);
    } catch (error) {
        console.error('生成章节目录失败:', error);
        modalText.value = '生成章节目录失败，请重试';
    }
}

async function generateSummariesFromOutline(outline) {
    try {
        const lines = outline.split('\n').filter(line => line.trim());
        const chapters = [];

        for (const line of lines) {
            const match = line.match(/(\d+)，([^，]+)，(.+)/);
            if (match) {
                chapters.push({
                    chapterNumber: parseInt(match[1]),
                    title: match[2],
                    summary: match[3]
                });
            }
        }

        // 保存每个章节的摘要并创建章节
        for (const chapter of chapters) {
            try {
                // 创建章节
                const createResponse = await fetch(`/api/chapters?bookId=${bookId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: chapter.title,
                        content: '', // 初始内容为空
                        chapterNumber: chapter.chapterNumber
                    })
                });
                
                const createResult = await createResponse.json();
                if (createResult.success) {
                    // 保存章节设定
                    const settingsResponse = await fetch('/api/chapter-settings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            bookId: parseInt(bookId),
                            chapterId: chapter.chapterNumber,
                            title: chapter.title,
                            type: 'normal',
                            status: 'draft',
                            summary: chapter.summary
                        })
                    });
                    
                    const settingsResult = await settingsResponse.json();
                    if (!settingsResult.success) {
                        console.error(`保存第${chapter.chapterNumber}章设定失败:`, settingsResult.message);
                    }
                } else {
                    console.error(`创建第${chapter.chapterNumber}章失败:`, createResult.message);
                }
            } catch (error) {
                console.error(`处理第${chapter.chapterNumber}章失败:`, error);
            }
        }
        
        // 重新加载章节列表
        await loadChapters();
    } catch (error) {
        console.error('处理章节目录失败:', error);
    }
}

async function regenerateChapterSummaries() {
    const modalText = document.getElementById('modalText');
    const currentContent = modalText.value;

    try {
        // 按行分割并过滤空行
        const lines = currentContent.split('\n').filter(line => line.trim());
        let allSummaries = '';
        let successCount = 0;

        for (const line of lines) {
            // 使用正则表达式匹配格式：章节号，章节名称，摘要
            const match = line.match(/^(\d+)，([^，]+)，(.+)$/);
            if (!match) {
                console.log('跳过不符合格式的行:', line);
                continue;
            }

            const [_, chapterNumber, title, summary] = match;

            try {
                // 保存章节摘要
                const response = await fetch('/api/chapter-settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        bookId: parseInt(bookId),
                        chapterId: parseInt(chapterNumber),
                        title: title,
                        type: 'normal',
                        status: 'draft',
                        summary: summary.trim()
                    })
                });

                const result = await response.json();
                if (result.success) {
                    successCount++;
                    allSummaries += `${chapterNumber}，${title}，${summary.trim()}\n`;
                } else {
                    console.error(`保存第${chapterNumber}章摘要失败:`, result.message);
                    allSummaries += `${chapterNumber}，${title}，保存失败\n`;
                }
            } catch (error) {
                console.error(`处理第${chapterNumber}章摘要失败:`, error);
                allSummaries += `${chapterNumber}，${title}，处理失败\n`;
            }
        }

        modalText.value = allSummaries;
        alert(`摘要更新完成，成功处理 ${successCount} 章节。`);
    } catch (error) {
        console.error('重新生成摘要失败:', error);
        alert('重新生成摘要失败，请重试');
    }
}

// 显示章节重构弹窗
function showReconstructChapter(chapterId) {
    const modal = document.getElementById('reconstructModal');
    modal.style.display = 'block';
    modal.setAttribute('data-chapter-id', chapterId);
}

// 关闭章节重构弹窗
function closeReconstructModal() {
    const modal = document.getElementById('reconstructModal');
    modal.style.display = 'none';
}

// 开始重构章节
async function startReconstruct() {
    const modal = document.getElementById('reconstructModal');
    const chapterId = modal.getAttribute('data-chapter-id');
    const modelSelect = document.getElementById('reconstructModelSelect');
    const loadWorldview = document.getElementById('loadWorldview').checked;
    const prevCount = parseInt(document.getElementById('prevChaptersCount').value);
    const nextCount = parseInt(document.getElementById('nextChaptersCount').value);
    const requirements = document.getElementById('reconstructRequirements').value;
    const spinner = document.getElementById('reconstructSpinner');

    if (!requirements.trim()) {
        alert('请输入重构要求');
        return;
    }

    try {
        spinner.style.display = 'block';
        
        // 获取当前章节内容
        const chapterResponse = await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`);
        const chapterData = await chapterResponse.json();
        const currentContent = chapterData.content;
        
        // 构建上下文信息
        let context = '';
        
        if (loadWorldview) {
            try {
                const worldviewResponse = await fetch(`/api/settings/environment?bookId=${bookId}`);
                const worldviewData = await worldviewResponse.json();
                if (worldviewData.success) {
                    context += '世界观设定：\n' + worldviewData.value + '\n\n';
                }
            } catch (error) {
                console.error('加载世界观失败:', error);
            }
        }

        if (prevCount > 0 || nextCount > 0) {
            try {
                const summaryResponse = await fetch(`/api/chapter-summaries?bookId=${bookId}&chapterId=${chapterId}&prevCount=${prevCount}&nextCount=${nextCount}`);
                const summaryData = await summaryResponse.json();
                if (summaryData.success) {
                    context += '相关章节摘要：\n' + summaryData.summaries.join('\n\n') + '\n\n';
                }
            } catch (error) {
                console.error('加载章节摘要失败:', error);
            }
        }

        const prompt = `你是一个专业的小说重构助手，请根据提供的上下文信息和要求，对第${chapterId}章内容进行重构。保持故事的连贯性和整体性。

${context}

原章节内容：
${currentContent}

重构要求：
${requirements}`;
console.log(prompt);
        const reconstructedContent = await callLargeModel(modelSelect.value, prompt);

        // 保存重构后的内容
        await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: chapterData.title,
                content: reconstructedContent
            })
        });

        alert('章节重构完成');
        closeReconstructModal();
    } catch (error) {
        console.error('章节重构失败:', error);
        alert('重构失败，请重试');
    } finally {
        spinner.style.display = 'none';
    }
}

// 加载模型配置
async function loadModelConfig() {
    try {
        const response = await fetch('/newbook/key.config');
        const config = await response.json();
        window.config = config; // 保存配置到全局变量
        
        // 获取所有模型选择下拉框
        const modelSelects = [
            document.getElementById('modalModelSelect'),
            document.getElementById('characterModelSelect'),
            document.getElementById('timelineModelSelect'),
            document.getElementById('worldTimelineModelSelect')
        ];
        
        // 为每个下拉框添加选项
        modelSelects.forEach(select => {
            if (select) {
                // 清空现有选项
                select.innerHTML = '';
                
                // 添加新选项
                config.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    select.appendChild(option);
                });
            }
        });

        // 如果iframe存在，向其发送模型配置
        const aiFrame = document.getElementById('aiFrame');
        if (aiFrame && aiFrame.contentWindow) {
            aiFrame.contentWindow.postMessage({
                type: 'modelConfig',
                config: config.models
            }, '*');
        }
    } catch (error) {
        console.error('加载模型配置失败:', error);
    }
}

// 页面加载时调用
document.addEventListener('DOMContentLoaded', loadModelConfig);

// iframe加载完成后也发送配置
document.getElementById('aiFrame').addEventListener('load', loadModelConfig);

// 修改章节生成函数
async function regenerateChapters() {
    const startChapter = parseInt(document.getElementById('startChapter').value);
    const endChapter = parseInt(document.getElementById('endChapter').value);
    const wordCount = parseInt(document.getElementById('chapterWordCount').value);
    const modelSelect = document.getElementById('timelineModelSelect');
    const selectedModel = modelSelect.value;

    if (!startChapter || !endChapter || !wordCount) {
        alert('请填写完整的章节范围和字数要求');
        return;
    }

    if (startChapter > endChapter) {
        alert('开始章节不能大于结束章节');
        return;
    }

    try {
        // 获取世界观
        const worldviewResponse = await fetch(`/api/settings/environment?bookId=${bookId}`);
        const worldviewData = await worldviewResponse.json();
        const worldview = worldviewData.value || '';
//获取故事大纲
        const worldTimelineResponse = await fetch(`/api/settings/worldTimeline?bookId=${bookId}`);
        const worldTimelineData = await worldTimelineResponse.json();
        const worldTimeline = worldTimelineData.value || '';
        // 获取人物设定
        const charactersResponse = await fetch(`/api/settings/characters?bookId=${bookId}`);
        const charactersData = await charactersResponse.json();
        const characters = charactersData.value || '';

        // 获取所有章节摘要
        const summaryResponse = await fetch(`/api/chapter-summaries?bookId=${bookId}&chapterId=${startChapter}&prevCount=${startChapter-1}&nextCount=${endChapter-1}`);
        const summaryData = await summaryResponse.json();
        const summaries = summaryData.summaries || [];


        // 逐章生成内容
        for (let currentChapter = startChapter; currentChapter <= endChapter; currentChapter++) {
            //如果不是第一章，则将上一章的内容作为上文
            let prevChapterContent = '';
            if (currentChapter > 1) {
                const chapterResponse = await fetch(`/api/chapters/${currentChapter-1}?bookId=${bookId}`);
                const prevChapter = await chapterResponse.json();
                prevChapterContent ="上文:" + prevChapter.content;
            }


            const prompt = `作为一位专业小说作家，请根据以下信息创作小说章节：

世界观设定：
${worldview}

故事大纲：
${worldTimeline}

人物设定：
${characters}

章节摘要：
${summaries.join('\n')}


${prevChapterContent}
当前需要创作的是第${currentChapter}章，要求：
1. 字数控制在${wordCount}字左右
2. 严格按照章节摘要发展情节
3. 注意人物性格的一致性
4. 场景描写要细腻生动
5. 对话要自然流畅
6. 如果上文存在，请注意与上文的连贯性


请开始创作第${currentChapter}章的内容：`;

            try {
                const chapterContent = await callLargeModel(selectedModel, prompt);

                // 保存章节内容
                await fetch(`/api/chapters/${currentChapter}?bookId=${bookId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: `第${currentChapter}章`,
                        content: chapterContent
                    })
                });

                console.log(`第${currentChapter}章生成完成`);
                document.getElementById('regenerateChapter').innerHTML = currentChapter;
                // 等待10秒后继续下一章
                if (currentChapter < endChapter) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            } catch (error) {
                console.error(`生成第${currentChapter}章失败:`, error);
            }
        }

        alert('章节生成完成！');
    } catch (error) {
        console.error('生成章节失败:', error);
        alert('生成章节失败，请重试');
    }
}

// 添加生成故事大纲的函数
async function generateWorldTimeline() {
    const modelSelect = document.getElementById('worldTimelineModelSelect');
    const includeWorldView = document.getElementById('includeWorldViewForTimeline').checked;
    const includeCharacters = document.getElementById('includeCharactersForTimeline').checked;
    const selectedModel = modelSelect.value;
    const modalText = document.getElementById('modalText');
    
    let context = '';

    try {
        // 获取世界观
        if (includeWorldView) {
            const worldviewResponse = await fetch(`/api/settings/environment?bookId=${bookId}`);
            const worldviewData = await worldviewResponse.json();
            if (worldviewData.value) {
                context += '世界观设定：\n' + worldviewData.value + '\n\n';
            }
        }

        // 获取人物设定
        if (includeCharacters) {
            const charactersResponse = await fetch(`/api/settings/characters?bookId=${bookId}`);
            const charactersData = await charactersResponse.json();
            if (charactersData.value) {
                context += '人物设定：\n' + charactersData.value + '\n\n';
            }
        }
 //获取当前大纲的内容
        const worldTimelineResponse = modalText.value;
        context += '当前大纲：\n' + worldTimelineResponse + '\n\n';
//获取生成大纲的要求
const worldTimelineRequirements = document.getElementById('worldTimelineRequirements').value;
context += '用户给出的建议：\n' + worldTimelineRequirements + '\n\n';
        const prompt = `作为一个专业的小说策划师，请根据以下信息构建一个完整的故事大纲：

${context}
请按照以下要求构建故事大纲：

1. 整体架构：
   - 分为5-10个主要篇章
   - 每个篇章的主要剧情走向
   - 篇章之间的关联和递进关系

2. 主线剧情：
   - 核心矛盾和冲突
   - 主要转折点
   - 高潮情节设计
   - 结局构思

3. 支线剧情：
   - 重要配角的故事线
   - 与主线的交织点
   - 对主线的推动作用

4. 情感线索：
   - 主要人物的情感发展
   - 重要关系的变化过程
   - 情感冲突的设计

5. 世界观展开：
   - 世界观元素的逐步揭示
   - 重要设定的铺垫和运用
   - 神秘感和悬念的设计
6.多线叙事锚点
   - 主时间轴：主角成长线（每3章达成阶段性目标）
   - 暗时间轴：反派阴谋推进线（关键节点与主线交汇）
   - 世界轴：环境恶化/势力变迁等客观进程（用新闻简报/自然异象穿插）
7.关键事件沙盘
   - 在时间线上标注10个不可更改的"支柱事件"
   - 每个支柱事件预留3种触发可能性（人物选择/意外干扰/阴谋推动）
请详细描述每个方面，确保故事结构完整，情节发展合理，冲突设置合理，并保持故事的吸引力和可读性。`;

        modalText.value = '正在生成故事大纲...';
        modalText.value = await callLargeModel(selectedModel, prompt);
    } catch (error) {
        console.error('生成故事大纲失败:', error);
        modalText.value = '生成故事大纲失败，请重试';
    }
}
