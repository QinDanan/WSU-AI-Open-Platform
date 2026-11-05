const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.WSU_BASE || 'http://127.0.0.1:4173/';

(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const context = await browser.newContext({
      viewport:{width:390,height:844},
      isMobile:true,hasTouch:true,deviceScaleFactor:3
    });
    const page = await context.newPage();
    const errors=[],requests=[],unknownProviderRequests=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',req=>{
      if (req.resourceType()==='script' && new URL(req.url()).origin!==new URL(base).origin)
        unknownProviderRequests.push(req.url());
    });
    await page.addInitScript(() => {
      localStorage.setItem('syai:settings',JSON.stringify({
        endpoint:'https://example.test/chat',model:'test-model'
      }));
      // A returning user may still have the old third-provider preference.
      localStorage.setItem('syai:chatMode',JSON.stringify('free'));
    });
    await page.route('https://api.murakumo.cloud/v1/chat/completions',route=>{
      const body=route.request().postDataJSON();
      requests.push({url:route.request().url(),headers:route.request().headers(),body});
      const error=body.messages.at(-1).content==='模拟免费失败';
      route.fulfill({
        status:error?429:200,
        contentType:'application/json',
        headers:{'Access-Control-Allow-Origin':'*'},
        body:JSON.stringify(error?{error:'quota exceeded'}:
          {choices:[{message:{role:'assistant',content:'GUEST_REPLY'}}]})
      });
    });
    await page.route('https://example.test/chat',route=>route.fulfill({
      status:200,contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':'*'},
      body:JSON.stringify({choices:[{message:{role:'assistant',content:'API_REPLY'}}]})
    }));
    await page.goto(base+'#/chat',{waitUntil:'load',timeout:30000});
    assert.equal(await page.locator('.chat-mode-choice').count(),2,'Two modes are expected');
    assert.equal(await page.locator('#chat-mode-guest').getAttribute('aria-pressed'),'true',
      'Retired mode must migrate to anonymous chat');
    assert.equal(await page.locator('#chat-mode-api').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#chat-configure').isVisible(),false,
      'API settings are hidden in the keyless mode');
    assert.equal(await page.locator('script[src^="https://"]').count(),0,
      'No retired provider SDK should be present');
    await page.locator('#chat-input').fill('匿名问答测试');
    await page.locator('#send-message').click();
    await page.waitForFunction(()=>
      [...document.querySelectorAll('#chat-body .message-content')]
        .some(node=>node.textContent.includes('GUEST_REPLY')),null,{timeout:10000});
    assert.equal(requests.length,1,'One anonymous request is expected');
    assert.equal(requests[0].body.model,'mishima');
    assert.equal(requests[0].body.messages.at(-1).content,'匿名问答测试');
    assert.ok(!('authorization' in requests[0].headers),'No credential can be sent');
    await page.locator('#chat-input').fill('模拟免费失败');
    await page.locator('#send-message').click();
    await page.waitForFunction(()=>
      document.querySelector('#chat-body .chat-message.error .message-content')
        ?.textContent.includes('免费额度'),null,{timeout:10000});
    await page.locator('#chat-mode-api').click();
    assert.equal(await page.locator('#chat-mode-api').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#chat-configure').isVisible(),true);
    assert.equal(await page.locator('#chat-body .chat-intro').count(),1,
      'API history must not display anonymous messages');
    await page.locator('#chat-input').fill('测试自定义 API');
    await page.locator('#send-message').click();
    await page.waitForFunction(()=>
      [...document.querySelectorAll('#chat-body .message-content')]
        .some(node=>node.textContent.includes('API_REPLY')),null,{timeout:10000});
    await page.locator('#chat-mode-guest').click();
    const guestText=await page.locator('#chat-body').innerText();
    assert.ok(guestText.includes('GUEST_REPLY'),'Anonymous history must be restored');
    assert.ok(guestText.includes('免费额度'),'Anonymous failure details must persist');
    assert.ok(!guestText.includes('API_REPLY'),'API history must stay separate');
    assert.deepEqual(unknownProviderRequests,[],'Removed SDK must never load');
    assert.deepEqual(errors,[],'The app must not throw errors');
    console.log('PASS: keyless chat, custom API, old setting migration, two isolated histories, no removed SDK, mobile UI');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
