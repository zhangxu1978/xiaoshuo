const bookId = new URLSearchParams(window.location.search).get('bookId');
const chapterId = new URLSearchParams(window.location.search).get('chapterId');
let currentUser = null;
let currentBook = null;

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
        
        // 如果是作者，显示编辑按钮
        if (currentUser.username === book.author) {
            document.getElementById('editButton').style.display = 'block';
        }
        
        loadChapter();
    } catch (error) {
        console.error('加载书籍详情失败:', error);
    }
}

// 计算字数的函数
function updateWordCount() {
    const content = document.getElementById('chapterContent').textContent;
    const count = content.replace(/\s/g, '').length;
    document.getElementById('wordCount').textContent = `字数：${count}`;
}

// 加载章节内容
async function loadChapter() {
    try {
        const response = await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`);
        const chapter = await response.json();
        
        document.getElementById('chapterTitle').textContent = chapter.title;
        document.getElementById('chapterContent').textContent = chapter.content;
        
        // 更新字数统计
        updateWordCount();
        
        // 添加调试日志
        console.log('章节信息:', chapter);
        
        // 修改判断逻辑，确保 prevChapterId 和 nextChapterId 是有效值
        const hasPrev = chapter.prevChapterId !== null && chapter.prevChapterId !== undefined;
        const hasNext = chapter.nextChapterId !== null && chapter.nextChapterId !== undefined;
        
        document.getElementById('prevChapter').disabled = !hasPrev;
        document.getElementById('nextChapter').disabled = !hasNext;
        
        // 设置导航按钮事件
        if (hasPrev) {
            document.getElementById('prevChapter').onclick = () => {
                window.location.href = `/reader.html?bookId=${bookId}&chapterId=${chapter.prevChapterId}`;
            };
        }
        if (hasNext) {
            document.getElementById('nextChapter').onclick = () => {
                window.location.href = `/reader.html?bookId=${bookId}&chapterId=${chapter.nextChapterId}`;
            };
        }
    } catch (error) {
        console.error('加载章节失败:', error);
    }
}

// AI润色相关函数
let originalText = '';
let selectionStart = 0;
let selectionEnd = 0;

function handleAiPolish() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    const modal = document.getElementById('aiPolishModal');
    const textArea = document.getElementById('selectedText');
    const textG = document.getElementById('getText');
    // 清空之前的内容
    textG.value = '';
    
    if (selectedText) {
        originalText = selectedText;
        const range = selection.getRangeAt(0);
        selectionStart = range.startOffset;
        selectionEnd = range.endOffset;
        textArea.value = selectedText;
        modal.style.display = 'block';
    } else {
        alert('请先选择需要润色的文字');
    }
}

function closeModal() {
    const modal = document.getElementById('aiPolishModal');
    modal.style.display = 'none';
}

async function submitAiPolish() {
    const polishedText = document.getElementById('selectedText').value;
    const contentElement = document.getElementById('chapterContent');
    const currentContent = contentElement.textContent;
    
    // 替换内容
    const newContent = currentContent.substring(0, selectionStart) + 
                     polishedText + 
                     currentContent.substring(selectionEnd);
    
    // 更新显示
    contentElement.textContent = newContent;

    // 保存更新到服务器
    try {
        const response = await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: document.getElementById('chapterTitle').textContent,
                content: newContent
            })
        });

        const result = await response.json();
        if (!result.success) {
            alert('更新失败：' + result.message);
        }
    } catch (error) {
        console.error('保存更新失败:', error);
        alert('保存更新失败，请重试');
    }

    closeModal();
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
        } else if (modelId === 'deepseek-tianyi-ai') {
            // 调用天翼AI API
            const url = 'https://wishub-x1.ctyun.cn/v1/chat/completions';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ae230490cbe44e278ca6501c765151e3'
                },
                body: JSON.stringify({
                    model: '4bd107bff85941239e27b1509eccfe98',
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.8,
                    top_p: 0.8,
                    max_tokens: 2048,
                    stream: false
                })
            });

            const result = await response.json();
            if (result.code === 0 && result.choices && result.choices[0]) {
                return result.choices[0].message.content;
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
                            content: config.systemPrompts.editor
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: modelId,
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 8000
                })
            });

            const result = await response.json();
            if (result.choices && result.choices[0]) {
                return result.choices[0].message.content;
            }
        }
        throw new Error('未获取到有效响应');
    } catch (error) {
        console.error('调用大模型失败:', error);
        throw error;
    }
}

function toggleMaximize() {
    const modalContent = document.querySelector('.modal-content');
    modalContent.classList.toggle('maximized');
    const maxBtn = document.querySelector('.maximize-btn');
    maxBtn.textContent = modalContent.classList.contains('maximized') ? '⛶' : '⛶';
}

function addText() {
    const keywordSelect = document.getElementById('keywordSelect');
    const selectedText = document.getElementById('selectedText');
    const selectedValue = keywordSelect.value;
    
    // 在文本末尾添加换行和选中的要求
    selectedText.value = selectedText.value + '\n\n要求：' + selectedValue;
}

async function getText() {
    const selectedText = document.getElementById('selectedText').value;
    const modelSelect = document.getElementById('modelSelect');
    const selectedModel = modelSelect.value;
    const loadingSpinner = document.querySelector('.loading-spinner');
    const getTextArea = document.getElementById('getText');

    if (!selectedText.trim()) {
        alert('请输入需要润色的文字');
        return;
    }

    try {
        loadingSpinner.style.display = 'block';
        getTextArea.value = '正在处理中...';
        let neirong = await callLargeModel(selectedModel, selectedText);
        getTextArea.value=neirong;
        // 调用服务器端的文本处理API
        // const response = await fetch('/api/process-text-operations', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         operationsText: neirong,
        //         targetText: selectedText,
        //         preprocess: true
        //     })
        // });
        
        // const result = await response.json();
        // if (result.success) {
        //     getTextArea.value = result.result;
        // } else {
        //     throw new Error(result.message);
        // }
    } catch (error) {
        console.error('AI润色请求失败:', error);
        getTextArea.value = '处理失败，请重试';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}
async function processOperations(){
    const selectedText = document.getElementById('selectedText').value;
   
    const loadingSpinner = document.querySelector('.loading-spinner');
    const getTextArea = document.getElementById('getText');

    if (!selectedText.trim()) {
        alert('请输入需要润色的文字');
        return;
    }

    try {
        loadingSpinner.style.display = 'block';
       // getTextArea.value = '正在处理中...';
        // 调用服务器端的文本处理API
        const response = await fetch('/api/process-text-operations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationsText: getTextArea.value,
                targetText: selectedText,
                preprocess: true
            })
        });
        
        const result = await response.json();
        if (result.success) {
            getTextArea.value = result.result;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('AI润色请求失败:', error);
        getTextArea.value = '处理失败，请重试';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}
// 拖动相关代码
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

function dragStart(e) {
    if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
    } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
    }

    if (e.target.classList.contains('modal-content')) {
        isDragging = true;
    }
}

function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        
        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, document.querySelector('.modal-content'));
    }
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

// 交换文本函数
function swapTexts() {
    const textArea1 = document.getElementById('selectedText');
    const textArea2 = document.getElementById('getText');
    const temp = textArea1.value;
    textArea1.value = textArea2.value;
    textArea2.value = temp;
}
async function processTextOperations() {
  //  const textArea1 = document.getElementById('selectedText');
    const textArea2 = document.getElementById('getText');
    try{
        const response = await fetch('/api/process-text-operations-preprocess', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operationsText: textArea2.value,
                targetText:false
            })
        });
        const result = await response.json();
        if (result.success) {
            document.getElementById('selectedText').value= result.result;
        } else {
            throw new Error(result.message);
        }
    }
    catch(error){
        console.error('处理文本操作失败:', error);
        alert('处理文本操作失败');
    }

}
// 章节设定相关函数
async function saveChapterSettings() {
    const title = document.getElementById('chapterTitleInput').value;
    const type = document.getElementById('chapterTypeSelect').value;
    const status = document.getElementById('chapterStatusSelect').value;
    const summary = document.getElementById('chapterSummaryInput').value;
    
    if (!title.trim()) {
        alert('章节标题不能为空');
        return;
    }

    try {
        const response = await fetch('/api/chapter-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: parseInt(bookId),
                chapterId: parseInt(chapterId),
                title,
                type,
                status,
                summary
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('chapterTitle').textContent = title;
            closeChapterSettings();
            alert('保存成功');
            await loadChapterSettings();
        } else {
            alert('保存失败：' + result.message);
        }
    } catch (error) {
        console.error('保存章节设定失败:', error);
        alert('保存失败，请重试。错误: ' + error.message);
    }
}

async function loadChapterSettings() {
    try {
        const response = await fetch(`/api/chapter-settings?bookId=${bookId}&chapterId=${chapterId}`);
        const data = await response.json();
        
        if (data.success && data.settings) {
            const settings = data.settings;
            document.getElementById('chapterTitleInput').value = document.getElementById('chapterTitle').textContent;
            document.getElementById('chapterTypeSelect').value = settings.type || 'normal';
            document.getElementById('chapterStatusSelect').value = settings.status || 'draft';
            document.getElementById('chapterSummaryInput').value = settings.summary || '';
        }
    } catch (error) {
        console.error('加载章节设定失败:', error);
    }
}

function showChapterSettings() {
    const modal = document.getElementById('chapterSettingsModal');
    modal.style.display = 'block';
    loadChapterSettings();
}

function closeChapterSettings() {
    const modal = document.getElementById('chapterSettingsModal');
    modal.style.display = 'none';
}

// 章节摘要生成
async function generateChapterSummary() {
    const chapterContent = document.getElementById('chapterContent').textContent;
    const modelSelect = document.getElementById('summaryModelSelect');
    const selectedModel = modelSelect.value;
    const summaryInput = document.getElementById('chapterSummaryInput');
    
    if (!chapterContent.trim()) {
        alert('章节内容为空，无法生成摘要');
        return;
    }

    try {
        summaryInput.value = '正在生成摘要...';
        const prompt = `请对下面的章节内容进行全面的分析。
       1、 以场景为单位，分析每个场景的背景、人物、情节、情感、冲突,伏笔，线索等。
       2、 每个场景转换到下个场景转换方式

章节内容：${chapterContent}`;
        
        summaryInput.value = await callLargeModel(selectedModel, prompt);
    } catch (error) {
        console.error('生成摘要失败:', error);
        summaryInput.value = '生成摘要失败，请重试';
    }
}

// 章节重构相关函数
function showReconstructChapter() {
    const modal = document.getElementById('reconstructModal');
    modal.style.display = 'block';
}

function closeReconstructModal() {
    const modal = document.getElementById('reconstructModal');
    modal.style.display = 'none';
}

async function startReconstruct() {
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
        const currentContent = document.getElementById('chapterContent').textContent;
        
        // 构建上下文信息
        let context = '';
        
        // 如果需要加载世界观
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

        // 获取前后章节摘要
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

        const prompt = `你是一个专业的小说重构助手，请根据提供的上下文信息和要求，对章节内容进行重构。保持故事的连贯性和整体性。

${context}

原章节内容：
${currentContent}

重构要求：
${requirements}`;

        const reconstructedContent = await callLargeModel(modelSelect.value, prompt);
        
        // 更新章节内容
        document.getElementById('chapterContent').textContent = reconstructedContent;
        
        // 保存更新到服务器
        await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: document.getElementById('chapterTitle').textContent,
                content: reconstructedContent
            })
        });

        alert('章节重构完成');
        closeReconstructModal();
        
        // 更新字数统计
        updateWordCount();
    } catch (error) {
        console.error('章节重构失败:', error);
        alert('重构失败，请重试');
    } finally {
        spinner.style.display = 'none';
    }
}

// 副本相关函数
async function saveChapterCopy() {
    const content = document.getElementById('chapterContent').textContent;
    const title = document.getElementById('chapterTitle').textContent;
    
    try {
        const copyData = {
            title,
            content,
            timestamp: new Date().toISOString()
        };
        
        // 获取现有副本
        let copies = JSON.parse(localStorage.getItem(`chapter_copy_${bookId}_${chapterId}`) || '[]');
        copies.push(copyData);
        
        // 保存到localStorage
        localStorage.setItem(`chapter_copy_${bookId}_${chapterId}`, JSON.stringify(copies));
        
        alert('副本保存成功');
    } catch (error) {
        console.error('保存副本失败:', error);
        alert('保存副本失败');
    }
}

function showChapterCopy() {
    try {
        const copies = JSON.parse(localStorage.getItem(`chapter_copy_${bookId}_${chapterId}`) || '[]');
        
        if (copies.length === 0) {
            alert('没有找到任何副本');
            return;
        }
        
        // 显示最新的副本
        const latestCopy = copies[copies.length - 1];
        const modal = document.getElementById('chapterCopyModal');
        const copyContent = document.getElementById('copyContent');
        
        copyContent.textContent = `标题: ${latestCopy.title}\n时间: ${new Date(latestCopy.timestamp).toLocaleString()}\n\n${latestCopy.content}`;
        modal.style.display = 'block';
    } catch (error) {
        console.error('显示副本失败:', error);
        alert('显示副本失败');
    }
}

function closeChapterCopy() {
    const modal = document.getElementById('chapterCopyModal');
    modal.style.display = 'none';
}

async function restoreFromCopy() {
    try {
        const copies = JSON.parse(localStorage.getItem(`chapter_copy_${bookId}_${chapterId}`) || '[]');
        if (copies.length === 0) return;
        
        const latestCopy = copies[copies.length - 1];
        
        // 更新显示
        document.getElementById('chapterContent').textContent = latestCopy.content;
        document.getElementById('chapterTitle').textContent = latestCopy.title;
        
        // 保存到服务器
        const response = await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: latestCopy.title,
                content: latestCopy.content
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('已恢复到副本版本');
            closeChapterCopy();
            updateWordCount();
        } else {
            alert('恢复失败：' + result.message);
        }
    } catch (error) {
        console.error('恢复副本失败:', error);
        alert('恢复副本失败');
    }
}

// 加载模型配置
async function loadModelConfig() {
    try {
        const response = await fetch('/newbook/key.config');
        const config = await response.json();
        const modelSelect = document.getElementById('modelSelect');
        const reconstructModelSelect = document.getElementById('reconstructModelSelect');
        const summaryModelSelect = document.getElementById('summaryModelSelect');
        window.config = config; // 保存配置到全局变量
        
        // 清空现有选项
        modelSelect.innerHTML = '';
        reconstructModelSelect.innerHTML = '';
        summaryModelSelect.innerHTML = '';


        // 添加新选项
        config.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            const option2 = document.createElement('option');
            option2.value = model.id;
            option2.textContent = model.name;
            const option3 = document.createElement('option');
            option3.value = model.id;
            option3.textContent = model.name;
            modelSelect.appendChild(option);
            reconstructModelSelect.appendChild(option3);
            summaryModelSelect.appendChild(option2);
        });
    } catch (error) {
        console.error('加载模型配置失败:', error);
    }
}

// 页面加载时的初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!bookId || !chapterId) {
        window.location.href = '/bookshelf.html';
        return;
    }
    checkLoginStatus();

    // 编辑按钮事件
    document.getElementById('editButton').onclick = () => {
        window.location.href = `/editor.html?bookId=${bookId}&chapterId=${chapterId}`;
    };

    // 添加拖动事件监听
    const modal = document.getElementById('aiPolishModal');
    const modalContent = modal.querySelector('.modal-content');

    modalContent.addEventListener('mousedown', dragStart, false);
    document.addEventListener('mousemove', drag, false);
    document.addEventListener('mouseup', dragEnd, false);

    modalContent.addEventListener('touchstart', dragStart, false);
    document.addEventListener('touchmove', drag, false);
    document.addEventListener('touchend', dragEnd, false);
    
    // 加载模型配置
    loadModelConfig();
});

async function generateChapterDetail() {
    const summaryInput = document.getElementById('chapterSummaryInput');
    const modelSelect = document.getElementById('summaryModelSelect');
    const selectedModel = modelSelect.value;
    
    try {
        summaryInput.value = '正在生成细节...';
        
        // 构建上下文信息
        let context = '';
        
        // 获取世界观设定
        try {
            const worldviewResponse = await fetch(`/api/settings/environment?bookId=${bookId}`);
            const worldviewData = await worldviewResponse.json();
            if (worldviewData.success) {
                context += '世界观设定：\n' + worldviewData.value + '\n\n';
            }
        } catch (error) {
            console.error('加载世界观失败:', error);
        }
        
        // 获取大纲
        try {
            const outlineResponse = await fetch(`/api/settings/outline?bookId=${bookId}`);
            const outlineData = await outlineResponse.json();
            if (outlineData.success) {
                context += '故事大纲：\n' + outlineData.value + '\n\n';
            }
        } catch (error) {
            console.error('加载大纲失败:', error);
        }
        
        // 获取人物关系
        // try {
        //     const charactersResponse = await fetch(`/api/settings/characters?bookId=${bookId}`);
        //     const charactersData = await charactersResponse.json();
        //     if (charactersData.success) {
        //         context += '人物关系：\n' + charactersData.value + '\n\n';
        //     }
        // } catch (error) {
        //     console.error('加载人物关系失败:', error);
        // }
        
        // 获取本章节摘要
        try {
            const chapterResponse = await fetch(`/api/chapters/${chapterId}?bookId=${bookId}`);
            const chapterData = await chapterResponse.json();
            if (chapterData.summary) {
                context += '本章摘要：\n' + chapterData.summary + '\n\n';
            }
        } catch (error) {
            console.error('加载章节摘要失败:', error);
        }

        const prompt = `作为一个专业的小说写作助手，请根据以下信息生成一个200字左右的详细章节细纲。
细纲需要包含：
1. 具体场景设定和场景转换
2. 重要事件的发生过程
3. 如何设计情节来吸引读者注意
4. 重要的伏笔和线索安排

${context}

请以分点方式输出，每个场景一个要点，重点标注需要着重描写的部分。`;

        const detailedOutline = await callLargeModel(selectedModel, prompt);
        summaryInput.value = detailedOutline;
    } catch (error) {
        console.error('生成章节细节失败:', error);
        summaryInput.value = '生成细节失败，请重试';
    }
} 