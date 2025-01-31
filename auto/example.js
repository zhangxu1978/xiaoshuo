const puppeteer = require('puppeteer');

async function automate() {
    try {
        let userDataDir;
        let executablePath;

        if (process.platform === 'win32') {
            // Windows 系统
            userDataDir = 'C:\\Users\\admin\\AppData\\Local\\Google\\Chrome\\User Data';
            executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
        } else if (process.platform === 'darwin') {
            // macOS 系统
            userDataDir = '/Users/YourUsername/Library/Application Support/Google/Chrome';
            executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        } else if (process.platform === 'linux') {
            // Linux 系统
            userDataDir = '/home/YourUsername/.config/google-chrome';
            executablePath = '/usr/bin/google-chrome';
        }

        // 启动浏览器，指定可执行路径和用户数据目录
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            executablePath: executablePath,
            userDataDir: userDataDir
        });

        const page = await browser.newPage();
        await page.goto('https://chat.deepseek.com/');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 后续代码保持不变
        await page.waitForSelector('#chat-input');
        await page.type('#chat-input', 'Puppeteer自动化测试');
       await page.click('.f6d670');
       // 使用 new Promise 和 setTimeout 替代 page.waitForTimeout
       await new Promise(resolve => setTimeout(resolve, 20000));

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('.ds-markdown ds-markdown--block');
            return Array.from(items, item => item.innerText);
        });

       // console.log('搜索结果：', results);
        if (results.length == 0) {
            await page.waitForSelector('.ds-icon-button svg defs clipPath#重新生成');

            // 点击该按钮
            await page.click('.ds-icon-button svg defs clipPath#重新生成').then(() => {
                console.log('点击复制按钮成功');
            }).catch((error) => {
                console.error('点击复制按钮失败:', error);
            });
        } else {
            console.log('搜索结果：', results[0]);
        }
        // 使用 new Promise 和 setTimeout 替代 page.waitForTimeout
       await new Promise(resolve => setTimeout(resolve, 5000));
       //await browser.close();
    } catch (error) {
        console.error('自动化过程中出现错误：', error);
    }
}

automate();