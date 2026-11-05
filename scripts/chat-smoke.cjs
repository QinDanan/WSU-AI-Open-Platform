const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.WSU_BASE || 'http://127.0.0.1:4173/';
(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const context = await browser.newContext({
      viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3
    });
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('syai:settings',JSON.stringify({
        endpoint:'https://example.test/chat',model:'test-model'
      }));
      window.__freeTestCalls=[];
    });
    const stub = [
      'window.__puterLoggedIn=false;window.__signInCalls=[];',
      'window.puter={',
      ' auth:{isSignedIn:()=>window.__puterLoggedIn,',
      '   signIn:async(options)=>{window.__signInCalls.push(options);window.__puterLoggedIn=true;return {username:"test"};}},',
      ' ai:{chat:async(messages,options)=>{',
      '   window.__freeTestCalls.push({messages,options});',
      '   if(messages.at(-1).content === "模拟失败") throw new Error("mock provider unavailable");',
      '   return {message:{role:"assistant",content:"FREE_REPLY: "+messages.at(-1).content}};',
      ' }}',
      '};'
    ].join('');
    await page.route('https://js.puter.com/v2/',route=>route.fulfill({
      status:200,contentType:'application/javascript',body:stub
    }));
    await page.route('https://example.test/chat',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({choices:[{message:{role:'assistant',content:'API_REPLY'}}]})
    }));
    await page.goto(base+'#/chat',{waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>!!window.puter?.ai?.chat);
    assert.equal(await page.locator('#chat-mode-free').getAttribute('aria-pressed'),'true',
      'Free chat must be the default');
    await page.locator('#chat-input').fill('测试免费问答');
    await page.locator('#send-message').click();
    await page.waitForFunction(()=>
      [...document.querySelectorAll('#chat-body .message-content')]
        .some(e=>e.textContent.includes('FREE_REPLY: 测试免费问答')),null,{timeout:10000});
    const freeCalls=await page.evaluate(()=>window.__freeTestCalls);
    assert.equal(freeCalls.length,1,'Exactly one Puter SDK chat call is expected');
    assert.equal(freeCalls[0].messages.at(-1).content,'测试免费问答');
    assert.equal(freeCalls[0].options.normalize,true);
    await page.locator('#puter-connect').click();
    await page.waitForFunction(()=>window.__signInCalls.length === 2);
    assert.equal((await page.evaluate(()=>window.__signInCalls[1])).request_auth,true,
      'Explicit account switch must open account picker');
    await page.locator('#chat-input').fill('模拟失败');
    await page.locator('#send-message').click();
    await page.waitForFunction(()=>
      [...document.querySelectorAll('#chat-body .chat-message.error .message-content')]
        .some(e=>e.textContent.includes('mock provider unavailable')),null,{timeout:10000});
    assert.ok((await page.locator('#chat-body').innerText()).includes('请求失败'),
      'Request failures must remain visible in conversation history');
    await page.locator('#chat-mode-api').click();
    assert.equal(await page.locator('#chat-mode-api').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#chat-body .chat-intro').count(),1,
      'API history should not contain Puter messages');
    await page.locator('#chat-input').fill('测试自定义 API');
    await page.locator('#send-message').click();
    await page.waitForFunction(()=>
      [...document.querySelectorAll('#chat-body .message-content')]
        .some(e=>e.textContent.includes('API_REPLY')),null,{timeout:10000});
    await page.locator('#chat-mode-free').click();
    assert.ok((await page.locator('#chat-body').innerText()).includes('FREE_REPLY: 测试免费问答'),
      'Switching back must restore Puter conversation');
    assert.ok(!(await page.locator('#chat-body').innerText()).includes('API_REPLY'),
      'The API history must remain isolated');
    assert.deepEqual(errors,[],'The UI must not throw JavaScript errors');
    console.log('PASS: default free chat, first-use login, Puter reply, API selection, isolated history, error persistence, account switch, mobile layout');
    await context.close();
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
