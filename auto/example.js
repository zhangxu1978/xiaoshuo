const puppeteer = require('puppeteer');

async function automate() {
    try {
        let userDataDir= 'C:\\Users\\admin\\AppData\\Local\\Google\\Chrome\\User Data';
        let executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
        // 启动浏览器，指定可执行路径和用户数据目录
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            executablePath: executablePath,
            userDataDir: userDataDir
        });

        const page = await browser.newPage();
        await page.goto('https://chat.deepseek.com/');
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 后续代码保持不变
        await page.waitForSelector('#chat-input');
        await page.type('#chat-input', '你好，随便说的什么吧');
       await page.click('.f6d670');
       // 使用 new Promise 和 setTimeout 替代 page.waitForTimeout
       await new Promise(resolve => setTimeout(resolve, 30000));

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('.ds-markdown.ds-markdown--block');
            return Array.from(items, item => item.innerText);
        });

        console.log('搜索结果：', results);
        // 使用 new Promise 和 setTimeout 替代 page.waitForTimeout
       await new Promise(resolve => setTimeout(resolve, 5000));
       await browser.close();
    } catch (error) {
        console.error('自动化过程中出现错误：', error);
    }
}

automate();