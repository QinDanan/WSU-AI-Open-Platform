(() => {
  'use strict';
  const D = window.WSU_DATA;
  const $ = id => document.getElementById(id);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${D.icons[name] || D.icons['info']}</svg>`;
  const currentDate = () => new Date().toISOString().slice(0,10);
  const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeLoad = (key, fallback) => {try{const value=JSON.parse(localStorage.getItem('syai:'+key));return value ?? fallback}catch{return fallback}};
  const safeSave = (key,value) => {try{localStorage.setItem('syai:'+key,JSON.stringify(value));return true}catch{toast('浏览器存储空间不足，当前内容无法持久保存');return false}};
  let toastTimer;
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
  let tasks=safeLoad('tasks',[]);
  let notes=safeLoad('notes',[]);
  if(!Array.isArray(tasks))tasks=[];
  if(!Array.isArray(notes))notes=[];
  if(!notes.length && localStorage.getItem('syai:seeded')!=='true'){
    notes=[{id:uuid(),title:'使用指南',content:'# 文档工作台\n\n这里可以记录课程笔记、项目资料或个人备忘。\n\n## 常用操作\n\n- 自动保存到当前浏览器\n- 导入 Markdown / TXT 文件\n- 切换 Markdown 预览\n- 导出为 `.md` 文档\n\n> 建议定期导出重要笔记备份。',updated:Date.now()}];
    safeSave('notes',notes);safeSave('seeded',true);
  }
  let activeNote=notes[0]?.id || null, docPreview=false, taskFilter='all',activeTool='grades',appFilter='全部', appQuery='',knowledgeFilter='全部',knowledgeQuery='';
  let settings=safeLoad('settings',{endpoint:'',model:'deepseek-chat'});if(!settings || typeof settings!=='object')settings={endpoint:'',model:'deepseek-chat'};
  let chatMode=safeLoad('chatMode','free')==='api'?'api':'free';
  let gatewayToken='';
  let threads=safeLoad('threads',[]);if(!Array.isArray(threads))threads=[];
  let activeThread=threads[0]?.id || null;
  const time={mode:'focus',remaining:1500,running:false,tick:null,deadline:0};
  const navHTML=item=>`<a class="nav-link" data-nav="${item.id}" href="#/${item.id}">${icon(item.icon)}<span>${item.name}</span></a>`;
  $('primary-nav').innerHTML=D.nav.filter(x=>x.section==='main').map(navHTML).join('');
  $('tool-nav').innerHTML=D.nav.filter(x=>x.section==='secondary').map(navHTML).join('');
  const date=new Date();
  $('top-date').textContent=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  $('today-long').textContent=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(date);
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon)});
  $('feature-grid').innerHTML=D.quick.map(x=>`<button class="feature-card" data-route="${x.id}"><span class="feature-arrow">${icon('arrow-up-right')}</span><span class="feature-icon ${x.accent}">${icon(x.icon)}</span><strong>${x.label}</strong><p>${x.desc}</p></button>`).join('');
  $('quick-links').innerHTML=D.links.map(x=>`<a class="resource-item" href="${x.url}" target="_blank" rel="noopener noreferrer"><span class="resource-mini">${icon(x.icon)}</span><span><strong>${x.name}</strong><small>${x.desc}</small></span>${icon('arrow-up-right')}</a>`).join('');
  const routes=new Set(D.nav.map(n=>n.id));
  function go(route){location.hash='#/'+(routes.has(route)?route:'dashboard')}
  function navigate(){const raw=location.hash.replace(/^#\/?/,'').split('?')[0];const route=routes.has(raw)?raw:'dashboard';
    $$('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+route));
    $$('[data-nav]').forEach(el=>{let active=el.dataset.nav===route;el.classList.toggle('active',active);active?el.setAttribute('aria-current','page'):el.removeAttribute('aria-current')});
    const page=D.nav.find(x=>x.id===route);$('page-crumb').textContent=page.name;document.title=page.name+' — 首义 AI';
    closeMobile();window.scrollTo({top:0,behavior:'instant'});
    if(route==='dashboard')renderDashboard();if(route==='knowledge')renderKnowledge();if(route==='docs')renderDocs();if(route==='planner')renderTasks();if(route==='tools')renderTool();if(route==='apps')renderApps();if(route==='chat')renderChat();
  }
  function openMobile(){$('sidebar').classList.add('open');$('mobile-scrim').classList.add('visible')}
  function closeMobile(){$('sidebar').classList.remove('open');$('mobile-scrim').classList.remove('visible')}
  $('mobile-toggle').addEventListener('click',openMobile);$('mobile-scrim').addEventListener('click',closeMobile);
  window.addEventListener('hashchange',navigate);
  document.addEventListener('click', e=>{
    const r=e.target.closest('[data-route]');if(r){e.preventDefault();go(r.dataset.route);return}
    const tab=e.target.closest('[data-tool-tab]');if(tab){activeTool=tab.dataset.toolTab;go('tools');renderTool();return}
  });

  /* Tasks and dashboard */
  function saveTasks(){safeSave('tasks',tasks);renderDashboard();renderTasks()}
  function renderDashboard(){const pending=tasks.filter(t=>!t.done);$('stat-tasks').textContent=pending.length;$('stat-notes').textContent=notes.length;
    $('dashboard-task-list').innerHTML=pending.length?pending.slice(0,3).map(t=>`<label class="dashboard-task"><input type="checkbox" data-quick-check="${escapeHTML(t.id)}"><span>${escapeHTML(t.title)}</span>${t.date?`<small>${escapeHTML(t.date.slice(5))}</small>`:''}</label>`).join(''):'<div class="dash-empty">暂无待完成任务。点击下方按钮新建。</div>';
    $$('[data-quick-check]').forEach(el=>el.addEventListener('change',()=>toggleTask(el.dataset.quickCheck)));
  }
  function toggleTask(id){tasks=tasks.map(t=>t.id===id?{...t,done:!t.done}:t);saveTasks()}
  $('add-task-quick').addEventListener('click',()=>{go('planner');setTimeout(()=>$('task-title').focus(),50)});
  $('task-form').addEventListener('submit',e=>{e.preventDefault();const title=$('task-title').value.trim();if(!title)return;tasks.unshift({id:uuid(),title,date:$('task-date').value,done:false,created:Date.now()});$('task-title').value='';$('task-date').value='';saveTasks();toast('任务已添加')});
  function renderTasks(){let total=tasks.length,done=tasks.filter(t=>t.done).length,pct=total?Math.round(done/total*100):0;
    $('planner-percent').textContent=pct+'%';$('planner-bar').style.width=pct+'%';$('planner-summary').textContent=total?`已完成 ${done} / ${total} 项任务`:'尚未添加任务';
    $$('[data-task-filter]').forEach(el=>el.classList.toggle('active',el.dataset.taskFilter===taskFilter));
    let visible=tasks.filter(t=>taskFilter==='all'||(taskFilter==='done'?t.done:!t.done));
    $('planner-list').innerHTML=visible.length?visible.map(t=>`<div class="planner-item"><button class="task-check ${t.done?'done':''}" aria-label="${t.done?'标记未完成':'标记完成'}" data-toggle-task="${escapeHTML(t.id)}">${t.done?icon('check'):''}</button><div class="task-item-body ${t.done?'done':''}"><strong>${escapeHTML(t.title)}</strong><span>${t.date?'截止 '+escapeHTML(t.date):'未设置截止日期'}</span></div><button class="task-remove" aria-label="删除任务" data-remove-task="${escapeHTML(t.id)}">${icon('trash-2')}</button></div>`).join(''):'<div class="dash-empty">这个分类暂时没有任务。</div>';
    $$('[data-toggle-task]').forEach(b=>b.onclick=()=>toggleTask(b.dataset.toggleTask));
    $$('[data-remove-task]').forEach(b=>b.onclick=()=>{tasks=tasks.filter(t=>t.id!==b.dataset.removeTask);saveTasks();toast('已删除任务')});
  }
  $$('[data-task-filter]').forEach(b=>b.onclick=()=>{taskFilter=b.dataset.taskFilter;renderTasks()});

  /* Knowledge retrieval */
  const categories=['全部','学校概况','校园文化','校园服务'];
  $('knowledge-tags').innerHTML=categories.map(c=>`<button data-knowledge-filter="${c}" class="${knowledgeFilter===c?'active':''}">${c}</button>`).join('');
  $$('[data-knowledge-filter]').forEach(b=>b.onclick=()=>{knowledgeFilter=b.dataset.knowledgeFilter;renderKnowledge()});
  $('knowledge-query').addEventListener('input',e=>{knowledgeQuery=e.target.value.trim();renderKnowledge()});
  function scores(item,query){if(!query)return 1;const q=query.toLowerCase().replace(/\s+/g,'');const text=(item.title+item.answer+item.tags.join(' ')+item.category).toLowerCase();let value=text.includes(q)?1:0;if(item.title.toLowerCase().includes(q))value+=3;if(item.tags.some(t=>t.toLowerCase().includes(q)))value+=3;const terms=query.toLowerCase().split(/[\s，,、？?！!。]+/).filter(Boolean);for(const t of terms)if(text.includes(t))value+=1;return value}
  function renderKnowledge(){const list=D.knowledge.filter(item=>knowledgeFilter==='全部'||item.category===knowledgeFilter).map(item=>({...item,score:scores(item,knowledgeQuery)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
    $('knowledge-count').textContent=knowledgeQuery?`找到 ${list.length} 条相关资料`:'全部资料 · '+list.length;
    $$('[data-knowledge-filter]').forEach(b=>b.classList.toggle('active',b.dataset.knowledgeFilter===knowledgeFilter));
    $('knowledge-results').innerHTML=list.length?list.map(i=>`<article class="knowledge-item"><div><span class="knowledge-category">${i.category}</span><span style="color:#a3b2c1;font:700 9px 'DM Sans'">${escapeHTML(i.id.toUpperCase())}</span></div><h3>${escapeHTML(i.title)}</h3><p>${escapeHTML(i.answer)}</p><div class="knowledge-actions"><a href="${i.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(i.source)} ${icon('arrow-up-right')}</a><button data-copy-knowledge="${i.id}">${icon('copy')} 复制内容</button></div></article>`).join(''):'<div class="knowledge-item"><h3>没有匹配的资料</h3><p>换一个关键词，或通过学校官方网站搜索最新信息。</p></div>';
    $$('[data-copy-knowledge]').forEach(b=>b.onclick=()=>{let i=D.knowledge.find(k=>k.id===b.dataset.copyKnowledge);copyText(`${i.title}\n${i.answer}\n来源：${i.url}`)});
  }
  function copyText(t){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t).then(()=>toast('已复制到剪贴板')).catch(()=>toast('复制失败，请检查浏览器权限'));else toast('当前浏览器不支持一键复制')}

  /* Notes */
  const activeDoc=()=>notes.find(n=>n.id===activeNote);
  function persistNotes(){safeSave('notes',notes);$('save-status').textContent='已保存';renderDashboard()}
  function newNote(title='未命名文档',content=''){const n={id:uuid(),title,content,updated:Date.now()};notes.unshift(n);activeNote=n.id;persistNotes();renderDocs();$('doc-title').focus()}
  $('new-note').onclick=()=>newNote();
  function renderDocs(){if(!activeDoc() && notes.length)activeNote=notes[0].id;
    $('doc-count').textContent=notes.length+' 篇';
    $('doc-list').innerHTML=notes.length?notes.map(n=>`<button class="doc-item ${n.id===activeNote?'active':''}" data-open-note="${escapeHTML(n.id)}"><b>${escapeHTML(n.title||'未命名文档')}</b><span>${new Date(n.updated).toLocaleDateString('zh-CN')} · ${n.content.length} 字</span></button>`).join(''):'<div class="dash-empty">还没有笔记</div>';
    $$('[data-open-note]').forEach(b=>b.onclick=()=>{activeNote=b.dataset.openNote;renderDocs()});
    const n=activeDoc();$('doc-title').value=n?.title||'';$('doc-editor').value=n?.content||'';$('doc-title').disabled=!n;$('doc-editor').disabled=!n;
    $('doc-editor').hidden=docPreview;$('doc-preview').hidden=!docPreview;$('toggle-preview').innerHTML=docPreview?icon('files')+' 编辑':icon('eye')+' 预览';if(docPreview)$('doc-preview').innerHTML=renderMarkdown(n?.content||'');updateWordCount();
  }
  let noteDelay;
  function noteInput(){const n=activeDoc();if(!n)return;n.title=$('doc-title').value.slice(0,80);n.content=$('doc-editor').value;n.updated=Date.now();$('save-status').textContent='保存中…';updateWordCount();clearTimeout(noteDelay);noteDelay=setTimeout(()=>{persistNotes();renderDocsListOnly()},350)}
  function renderDocsListOnly(){$('doc-count').textContent=notes.length+' 篇';$('doc-list').innerHTML=notes.map(n=>`<button class="doc-item ${n.id===activeNote?'active':''}" data-open-note="${escapeHTML(n.id)}"><b>${escapeHTML(n.title||'未命名文档')}</b><span>${new Date(n.updated).toLocaleDateString('zh-CN')} · ${n.content.length} 字</span></button>`).join('');$$('[data-open-note]').forEach(b=>b.onclick=()=>{activeNote=b.dataset.openNote;renderDocs()})}
  function updateWordCount(){const t=$('doc-editor').value;$('editor-count').textContent=`${t.length} 字 · ${t?t.split('\n').length:0} 行`}
  $('doc-title').addEventListener('input',noteInput);$('doc-editor').addEventListener('input',noteInput);
  $('toggle-preview').onclick=()=>{docPreview=!docPreview;renderDocs()};
  $('delete-note').onclick=()=>{if(!activeDoc())return;if(!confirm('确定删除当前笔记？此操作无法撤销。'))return;notes=notes.filter(n=>n.id!==activeNote);activeNote=notes[0]?.id||null;persistNotes();renderDocs();toast('笔记已删除')};
  $('download-note').onclick=()=>{let n=activeDoc();if(!n){toast('请先创建笔记');return}downloadFile((n.title||'未命名文档').replace(/[\\/:*?"<>|]/g,'_')+'.md',n.content,'text/markdown;charset=utf-8')};
  $('import-file').onchange=async e=>{let file=e.target.files[0];if(!file)return;if(file.size>1024*1024){toast('请导入小于 1 MB 的文本文件');e.target.value='';return}try{newNote(file.name.replace(/\.(md|txt)$/i,''),await file.text());toast('文档已导入')}catch{toast('无法读取所选文件')}e.target.value=''};
  function downloadFile(name,text,type='text/plain;charset=utf-8'){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
  function renderMarkdown(input){const safe=escapeHTML(input);const lines=safe.split('\n');let inCode=false;let out=[];for(let line of lines){if(/^```/.test(line)){out.push(inCode?'</code></pre>':'<pre><code>');inCode=!inCode;continue}if(inCode){out.push(line+'\n');continue}if(/^### /.test(line))out.push('<h3>'+line.slice(4)+'</h3>');else if(/^## /.test(line))out.push('<h2>'+line.slice(3)+'</h2>');else if(/^# /.test(line))out.push('<h1>'+line.slice(2)+'</h1>');else if(/^&gt; /.test(line))out.push('<blockquote>'+line.slice(5)+'</blockquote>');else if(/^[-*] /.test(line))out.push('<p>• '+line.slice(2)+'</p>');else if(line.trim())out.push('<p>'+line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')+'</p>');else out.push('<div style="height:9px"></div>')}if(inCode)out.push('</code></pre>');return out.join('')}

  /* Applications */
  const appCats=['全部','AI','校园','学习','效率','开发'];
  $('app-categories').innerHTML=appCats.map(c=>`<button data-app-filter="${c}" class="${c==='全部'?'active':''}">${c}</button>`).join('');
  $$('[data-app-filter]').forEach(b=>b.onclick=()=>{appFilter=b.dataset.appFilter;renderApps()});
  $('app-query').oninput=e=>{appQuery=e.target.value.trim();renderApps()};
  function renderApps(){const list=D.applications.filter(x=>(appFilter==='全部'||x.category===appFilter)&&(x.title+x.desc).toLowerCase().includes(appQuery.toLowerCase()));
    $$('[data-app-filter]').forEach(b=>b.classList.toggle('active',b.dataset.appFilter===appFilter));
    $('app-directory').innerHTML=list.length?list.map(x=>`<button class="directory-card" data-launch-app="${x.route}" data-app-tab="${x.tab||''}"><span class="feature-icon ${x.category==='校园'?'sky':x.category==='效率'?'teal':x.category==='学习'?'gold':'indigo'}">${icon(x.icon)}</span><h3>${x.title}</h3><p>${x.desc}</p><footer><span class="directory-state">${x.state}</span>${icon('arrow-up-right')}</footer></button>`).join(''):'<div class="dash-empty">未找到符合条件的应用。</div>';
    $$('[data-launch-app]').forEach(b=>b.onclick=()=>{if(b.dataset.appTab)activeTool=b.dataset.appTab;go(b.dataset.launchApp);if(b.dataset.launchApp==='tools')renderTool()})}

  /* Utilities */
  const tools=[{id:'grades',name:'加权成绩',icon:'calculator'},{id:'json',name:'JSON 工具',icon:'braces'},{id:'text',name:'文本统计',icon:'text-cursor-input'},{id:'timer',name:'专注计时',icon:'timer'}];
  let gradeRows=[{id:uuid(),name:'',credit:'',score:''},{id:uuid(),name:'',credit:'',score:''},{id:uuid(),name:'',credit:'',score:''}];
  let jsonText='{"course": "高等数学", "score": 92, "credit": 4}',textAnalyze='';
  $('tool-switch').innerHTML=tools.map(x=>`<button data-tool-tab="${x.id}">${icon(x.icon)} ${x.name}</button>`).join('');
  function renderTool(){$$('[data-tool-tab]').forEach(b=>b.classList.toggle('active',b.dataset.toolTab===activeTool));
    const root=$('tool-runtime');
    if(activeTool==='grades'){
      root.innerHTML=`<div class="tool-panel"><h2>成绩加权计算</h2><p>根据课程分数与学分计算加权平均分；此结果不等同于学校官方 GPA。</p><div class="grade-table" id="grade-table"><div class="grade-row header"><span>课程名称</span><span>学分</span><span>成绩</span><span></span></div></div><div class="tool-actions"><button class="btn btn-neutral" id="add-grade-row">${icon('plus')} 添加课程</button><button class="btn btn-blue" id="calc-grades">计算结果 ${icon('arrow-right')}</button></div><div class="grade-result"><span>学分加权平均分</span><strong id="grade-result">—</strong></div><p class="tool-message" id="grade-message"></p></div>`;renderGrades();$('add-grade-row').onclick=()=>{collectGrades();gradeRows.push({id:uuid(),name:'',credit:'',score:''});renderGrades()};$('calc-grades').onclick=calcGrades;
    }else if(activeTool==='json'){
      root.innerHTML=`<div class="tool-panel"><h2>JSON 格式化</h2><p>JSON 美化、压缩、语法验证与复制。</p><textarea id="json-input" aria-label="JSON 文本" spellcheck="false"></textarea><div class="tool-actions"><button class="btn btn-blue" data-json-action="pretty">格式化</button><button class="btn btn-neutral" data-json-action="minify">压缩</button><button class="btn btn-neutral" data-json-action="check">验证</button><button class="btn btn-neutral" data-json-action="copy">${icon('copy')} 复制</button></div><p class="tool-message" id="json-message"></p></div>`;$('json-input').value=jsonText;$('json-input').oninput=e=>jsonText=e.target.value;$$('[data-json-action]').forEach(b=>b.onclick=()=>jsonAction(b.dataset.jsonAction));
    }else if(activeTool==='text'){
      root.innerHTML=`<div class="tool-panel"><h2>文本统计</h2><p>输入或粘贴任意文本，即时统计常见指标。</p><textarea id="text-input" placeholder="在这里输入文本…" aria-label="文本统计输入"></textarea><div class="tool-stats"><div class="tool-stat"><strong id="text-chars">0</strong><span>字符数（含空格）</span></div><div class="tool-stat"><strong id="text-nonspaces">0</strong><span>非空字符</span></div><div class="tool-stat"><strong id="text-lines">0</strong><span>行数</span></div><div class="tool-stat"><strong id="text-words">0</strong><span>英文单词</span></div></div><div class="tool-actions"><button class="btn btn-neutral" id="copy-text">${icon('copy')} 复制文本</button><button class="btn btn-neutral" id="clear-text">清空</button></div></div>`;$('text-input').value=textAnalyze;$('text-input').oninput=e=>{textAnalyze=e.target.value;renderTextStats()};$('copy-text').onclick=()=>copyText(textAnalyze);$('clear-text').onclick=()=>{textAnalyze='';$('text-input').value='';renderTextStats()};renderTextStats();
    }else if(activeTool==='timer'){
      root.innerHTML=`<div class="tool-panel"><h2>专注计时</h2><p>保持当前页面打开，计时器会在时间结束时提示。</p><div class="timer-center"><div class="timer-modes"><button data-mode="focus" class="${time.mode==='focus'?'active':''}">专注 25 分钟</button><button data-mode="short" class="${time.mode==='short'?'active':''}">休息 5 分钟</button></div><div class="clock-display" id="clock-display">25:00</div><div class="clock-sub" id="clock-sub">专注计时器</div><div class="tool-actions" style="justify-content:center"><button class="btn btn-blue" id="timer-start">开始</button><button class="btn btn-neutral" id="timer-reset">重置</button></div></div></div>`;$$('[data-mode]').forEach(b=>b.onclick=()=>{time.mode=b.dataset.mode;resetTimer();renderTool()});$('timer-start').onclick=toggleTimer;$('timer-reset').onclick=()=>{resetTimer();paintTimer()};paintTimer();
    }
  }
  function collectGrades(){gradeRows.forEach(row=>{const el=document.querySelector(`[data-grade-id="${row.id}"]`);if(el){row.name=el.querySelector('[data-field=name]').value;row.credit=el.querySelector('[data-field=credit]').value;row.score=el.querySelector('[data-field=score]').value}})}
  function renderGrades(){let el=$('grade-table');if(!el)return;el.innerHTML='<div class="grade-row header"><span>课程名称</span><span>学分</span><span>成绩</span><span></span></div>'+gradeRows.map(row=>`<div class="grade-row" data-grade-id="${row.id}"><input data-field="name" aria-label="课程名称" placeholder="如：大学英语" value="${escapeHTML(row.name)}"><input data-field="credit" type="number" aria-label="学分" min="0.1" max="50" step="0.5" placeholder="学分" value="${escapeHTML(row.credit)}"><input data-field="score" type="number" aria-label="成绩" min="0" max="100" step="0.1" placeholder="分数" value="${escapeHTML(row.score)}"><button data-remove-grade="${row.id}" aria-label="删除课程">${icon('x')}</button></div>`).join('');$$('[data-remove-grade]').forEach(b=>b.onclick=()=>{collectGrades();gradeRows=gradeRows.filter(row=>row.id!==b.dataset.removeGrade);renderGrades()})}
  function calcGrades(){collectGrades();const hasData=gradeRows.filter(r=>r.credit!==''||r.score!=='');if(!hasData.length){$('grade-message').textContent='请至少填写一门课程的学分和成绩';return}let weighted=0,credits=0;for(let row of hasData){let credit=Number(row.credit),score=Number(row.score);if(row.credit===''||row.score===''||!Number.isFinite(credit)||credit<=0||credit>50||score<0||score>100){$('grade-message').textContent='请检查学分（0–50）和成绩（0–100）的输入';return}credits+=credit;weighted+=credit*score}let avg=weighted/credits;$('grade-result').textContent=avg.toFixed(2);$('grade-message').textContent=`共 ${hasData.length} 门课程 · 总学分 ${credits.toFixed(1)} · 仅为学分加权平均分`}
  function jsonAction(action){let el=$('json-input');if(action==='copy'){copyText(el.value);return}try{let obj=JSON.parse(el.value);if(action==='pretty')el.value=JSON.stringify(obj,null,2);else if(action==='minify')el.value=JSON.stringify(obj);jsonText=el.value;$('json-message').className='tool-message';$('json-message').textContent=action==='check'?'JSON 语法正确':'处理完成'}catch(err){$('json-message').className='tool-message error';$('json-message').textContent='JSON 解析失败：'+err.message}}
  function renderTextStats(){const t=textAnalyze;if(!$('text-chars'))return;$('text-chars').textContent=t.length;$('text-nonspaces').textContent=t.replace(/\s/g,'').length;$('text-lines').textContent=t?t.split(/\r\n|\n|\r/).length:0;$('text-words').textContent=(t.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)||[]).length}
  function paintTimer(){if(!$('clock-display'))return;const m=String(Math.floor(time.remaining/60)).padStart(2,'0'),s=String(time.remaining%60).padStart(2,'0');$('clock-display').textContent=m+':'+s;$('clock-sub').textContent=time.mode==='focus'?'专注时段':'短暂休息';$('timer-start').textContent=time.running?'暂停':'开始'}
  function resetTimer(){time.running=false;clearInterval(time.tick);time.remaining=time.mode==='focus'?1500:300;paintTimer()}
  function toggleTimer(){if(time.running){clearInterval(time.tick);time.running=false;time.remaining=Math.max(0,Math.ceil((time.deadline-Date.now())/1000));paintTimer();return}time.running=true;time.deadline=Date.now()+time.remaining*1000;time.tick=setInterval(()=>{time.remaining=Math.max(0,Math.ceil((time.deadline-Date.now())/1000));paintTimer();if(time.remaining===0){clearInterval(time.tick);time.running=false;toast(time.mode==='focus'?'专注时间结束，休息一下':'休息结束，可以继续学习');paintTimer()}},250);paintTimer()}

  /* AI conversations — independent free (Puter) and private API channels */
  let sendingChat=false, puterSdkFailed=false;
  const apiEndpoint=()=>String(settings.endpoint||'').trim();
  const apiConnected=()=>/^https:\/\//.test(apiEndpoint()) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(apiEndpoint());
  const selectedMode=()=>chatMode==='api'?'api':'free';
  const inMode=t=>(t.mode||'api')===selectedMode();
  const modeThreads=()=>threads.filter(inMode);
  const currentThread=()=>threads.find(t=>t.id===activeThread&&inMode(t));
  function persistThreads(){safeSave('threads',threads)}
  function newThread(){
    const t={id:uuid(),mode:selectedMode(),title:'新对话',messages:[],created:Date.now()};
    threads.unshift(t);activeThread=t.id;persistThreads();renderChat();
  }
  function sdk(){return window.puter?.ai?.chat&&window.puter?.auth?window.puter:null}
  function sdkLoggedIn(){
    try{return !!sdk()?.auth.isSignedIn()}catch{return false}
  }
  function updateFreeAccount(){
    const state=$('puter-account-state');
    if(!state)return;
    if(puterSdkFailed){state.textContent='免费组件加载失败，请检查网络';return}
    if(!sdk()){state.textContent='免费组件正在加载…';return}
    const signedIn=sdkLoggedIn();
    state.textContent=signedIn?'Puter 已连接':'首次问答时按提示登录';
    $('puter-connect').textContent=signedIn?'重新登录':'连接 Puter';
  }
  const sdkScript=$('puter-sdk');
  if(sdkScript){
    sdkScript.addEventListener('load',updateFreeAccount);
    sdkScript.addEventListener('error',()=>{puterSdkFailed=true;updateFreeAccount()});
  }
  function setChatMode(next){
    chatMode=next==='api'?'api':'free';
    safeSave('chatMode',chatMode);
    activeThread=modeThreads()[0]?.id||null;
    renderChat();
  }
  $('chat-mode-free').onclick=()=>setChatMode('free');
  $('chat-mode-api').onclick=()=>setChatMode('api');
  $('puter-connect').onclick=()=>{
    const client=sdk();
    if(!client){toast('Puter 组件尚未加载，请检查网络后重试');return}
    try{
      Promise.resolve(client.auth.signIn({attempt_temp_user_creation:true}))
        .then(()=>{updateFreeAccount();toast('Puter 账号已连接')})
        .catch(error=>toast('登录未完成：'+displayChatError(error)));
    }catch(error){toast('登录未完成：'+displayChatError(error))}
  };
  $('new-chat').onclick=newThread;
  $('chat-clear-all').onclick=()=>{
    if(!modeThreads().length)return;
    if(!confirm('清空当前通道的本地会话记录？'))return;
    threads=threads.filter(t=>!inMode(t));activeThread=null;
    persistThreads();renderChat();toast('本地会话已清空');
  };
  function updateModeUi(){
    const free=selectedMode()==='free';
    $('chat-mode-free').classList.toggle('active',free);
    $('chat-mode-api').classList.toggle('active',!free);
    $('chat-mode-free').setAttribute('aria-pressed',String(free));
    $('chat-mode-api').setAttribute('aria-pressed',String(!free));
    $('free-account-row').hidden=!free;
    $('chat-provider-info').textContent=free
      ?'Puter.js · 首次使用需登录 Puter，免费月度额度用完可自行决定是否升级'
      :'自定义 API · 使用你部署的服务端网关及所选模型';
    $('chat-configure').textContent=free?'API 设置':'配置连接';
    $('chat-foot').textContent=free
      ?'免费额度按 Puter 账号计算；会话记录只保存在当前浏览器。'
      :'使用自定义网关；访问令牌仅保留在当前页面。';
    const ok=free?!!sdk():apiConnected();
    $('model-name-label').textContent=free?'Puter · 默认模型':(ok?(settings.model||'已配置模型'):'尚未配置 API');
    $('gateway-status-dot').classList.toggle('connected',ok);
    updateFreeAccount();
  }
  function renderChat(){
    updateModeUi();
    const list=modeThreads();
    $('conversation-list').innerHTML=list.length?list.map(t=>'<button class="history-item '+(t.id===activeThread?'active':'')+'" data-thread="'+escapeHTML(t.id)+'">'+icon('message-square')+'<span>'+escapeHTML(t.title)+'</span></button>').join(''):'<div class="history-empty">暂无会话记录</div>';
    $$('[data-thread]').forEach(b=>b.onclick=()=>{activeThread=b.dataset.thread;renderChat()});
    const thread=currentThread();
    if(!thread||!thread.messages.length){
      const description=selectedMode()==='free'
        ?'直接提问，首次使用请按提示登录 Puter。免费额度由 Puter 账户提供。'
        :(apiConnected()?'通过已配置的 AI 网关进行对话。':'选择自定义 API 后，请先配置网关地址。');
      $('chat-body').innerHTML='<div class="chat-intro"><span class="intro-crest"><img src="assets/school-emblem.png?v=20261105-r2" alt="校徽"></span><h2>开始新的对话</h2><p>'+escapeHTML(description)+'</p><div class="chat-prompts"><button data-chat-prompt="解释一下傅里叶变换的基本思想">解释傅里叶变换</button><button data-chat-prompt="帮我梳理一份英语学习计划">梳理英语学习计划</button><button data-chat-prompt="如何阅读一篇科研论文？">科研论文阅读方法</button><button data-chat-prompt="给我一个 Python 数据分析示例">Python 数据分析示例</button></div></div>';
      $$('[data-chat-prompt]').forEach(b=>b.onclick=()=>{$('chat-input').value=b.dataset.chatPrompt;$('chat-input').focus()});
    }else{
      $('chat-body').innerHTML=thread.messages.map(m=>'<div class="chat-message '+(m.role==='user'?'user':'')+'"><span class="message-avatar">'+(m.role==='user'?'我':'SY')+'</span><div class="message-content">'+escapeHTML(m.content)+'</div></div>').join('');
      $('chat-body').scrollTop=$('chat-body').scrollHeight;
    }
  }
  function displayChatError(error){
    const e=String(error?.msg||error?.message||error||'请求失败');
    if(/quota|usage.limit|balance|billing|insufficient|payment|credit|exceeded/i.test(e))
      return 'Puter 免费额度可能已用完，请到 Puter 账户查看用量。';
    if(/popup.blocked|auth.window.closed|user.cancelled|login.cancel/i.test(e))
      return '未完成 Puter 登录，请点击「连接 Puter」后重试。';
    if(/network|fetch.failed|Failed to fetch|ERR_|timeout/i.test(e))
      return '连接服务失败，请检查网络后重试。';
    return e.slice(0,160);
  }
  async function sendFree(messages){
    const client=sdk();
    if(!client)throw new Error('Puter 组件未加载。请检查网络后刷新页面，或选择自定义 API。');
    if(!sdkLoggedIn()){
      await client.auth.signIn({attempt_temp_user_creation:true});
      updateFreeAccount();
    }
    const response=await client.ai.chat(messages,{normalize:true});
    const answer=response?.message?.content;
    if(typeof answer!=='string'||!answer.trim())throw new Error('模型未返回有效文本，请重新发送。');
    return answer.trim();
  }
  async function sendApi(messages){
    const controller=new AbortController(),abort=setTimeout(()=>controller.abort(),60000);
    let response;
    try{
      response=await fetch(apiEndpoint(),{
        method:'POST',
        headers:{'Content-Type':'application/json',...(gatewayToken?{'Authorization':'Bearer '+gatewayToken}:{})},
        body:JSON.stringify({model:settings.model||'deepseek-chat',messages}),
        signal:controller.signal
      });
    }finally{clearTimeout(abort)}
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||payload.message||'HTTP '+response.status);
    const answer=payload.choices?.[0]?.message?.content??payload.reply??payload.content;
    if(typeof answer!=='string'||!answer.trim())throw new Error('网关未返回有效回答');
    return answer.trim();
  }
  $('chat-input').addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('chat-form').requestSubmit()}
  });
  $('chat-form').addEventListener('submit',async e=>{
    e.preventDefault();if(sendingChat)return;
    const input=$('chat-input'),message=input.value.trim();
    if(!message)return;
    if(selectedMode()==='api'&&!apiConnected()){
      openSettings();$('settings-message').textContent='请先配置你的 API 网关地址';return;
    }
    if(selectedMode()==='free'&&!sdk()){
      toast('免费组件尚未加载，请检查网络后重试');return;
    }
    let thread=currentThread();
    if(!thread){newThread();thread=currentThread()}
    if(!thread.messages.length)thread.title=message.slice(0,24);
    const modeAtSend=selectedMode();
    const history=thread.messages.filter(m=>m.role==='user'||m.role==='assistant')
      .slice(-23).map(m=>({role:m.role,content:m.content}));
    history.push({role:'user',content:message});
    thread.messages.push({role:'user',content:message});
    input.value='';persistThreads();renderChat();sendingChat=true;
    $('send-message').disabled=true;
    const loader=document.createElement('div');
    loader.className='chat-message';
    loader.innerHTML='<span class="message-avatar">SY</span><div class="message-content">正在生成回复…</div>';
    $('chat-body').appendChild(loader);$('chat-body').scrollTop=$('chat-body').scrollHeight;
    try{
      const answer=modeAtSend==='free'?await sendFree(history):await sendApi(history);
      thread.messages.push({role:'assistant',content:answer});persistThreads();
    }catch(error){
      const message=displayChatError(error);
      toast('请求失败：'+message);
      loader.querySelector('.message-content').textContent='请求失败：'+message;
    }finally{
      sendingChat=false;$('send-message').disabled=false;renderChat();
    }
  });
  function openSettings(){
    $('gateway-url').value=settings.endpoint||'';
    $('gateway-model').value=settings.model||'';
    $('gateway-token').value=gatewayToken;
    $('settings-message').className='settings-message';
    $('settings-message').textContent='';
    $('settings-overlay').hidden=false;$('gateway-url').focus();
  }
  function closeSettings(){$('settings-overlay').hidden=true}
  $('settings-trigger').onclick=openSettings;
  $('settings-close').onclick=closeSettings;
  $('chat-configure').onclick=openSettings;
  $('save-settings').onclick=()=>{
    const value=$('gateway-url').value.trim();
    if(value&&!(/^https:\/\//.test(value)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(value))){
      $('settings-message').className='settings-message error';
      $('settings-message').textContent='网关需要使用 HTTPS 地址（本机可使用 HTTP）';return;
    }
    gatewayToken=$('gateway-token').value.trim();
    settings={endpoint:value,model:$('gateway-model').value.trim()||'deepseek-chat'};
    safeSave('settings',settings);
    $('settings-message').className='settings-message';
    $('settings-message').textContent=value?'网关设置已保存':'网关设置已清除';
    renderChat();toast('设置已保存');
  };
  $('test-connection').onclick=async()=>{
    const url=$('gateway-url').value.trim();
    if(!/^https:\/\//.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)/.test(url)){
      $('settings-message').textContent='请先填写有效的 HTTPS 地址';return;
    }
    const el=$('settings-message');
    el.className='settings-message';el.textContent='测试中…';
    try{
      const health=new URL(url);
      health.pathname=health.pathname.replace(/\/?chat\/?$/,'/health');
      const result=await fetch(health.toString(),{method:'GET',signal:AbortSignal.timeout(8000)});
      if(!result.ok)throw new Error('HTTP '+result.status);
      el.textContent='服务可访问。可保存后尝试发送消息。';
    }catch(error){
      el.className='settings-message error';
      el.textContent='连接失败：'+error.message+'。请检查 CORS、地址与服务状态。';
    }
  };
  $('settings-overlay').addEventListener('click',e=>{
    if(e.target===$('settings-overlay'))closeSettings()
  });

  /* Command palette */
  const commandEntries=[...D.nav.map(n=>({label:n.name,icon:n.icon,route:n.id,kind:'页面'})),...D.applications.filter(a=>a.route==='tools').map(a=>({label:a.title,icon:a.icon,route:'tools',tab:a.tab,kind:'工具'}))];
  let commandSelection=0,commandFiltered=[];
  function openCommand(){closeSettings();$('search-overlay').hidden=false;$('command-query').value='';renderCommands();$('command-query').focus()}
  function closeCommand(){$('search-overlay').hidden=true}
  $('global-search-trigger').onclick=openCommand;
  function renderCommands(){const q=$('command-query').value.trim().toLowerCase();const filtered=commandEntries.filter(x=>x.label.toLowerCase().includes(q)).slice(0,10);const campusHits=q?D.knowledge.filter(x=>scores(x,q)>0).slice(0,4).map(x=>({label:x.title,icon:'book-open',route:'knowledge',query:q,kind:'校园资料'})):[];commandFiltered=[...filtered,...campusHits];commandSelection=0;paintCommands()}
  function paintCommands(){$('command-results').innerHTML='<div class="command-label">功能与资料</div>'+(commandFiltered.length?commandFiltered.map((x,i)=>`<button class="command-entry ${i===commandSelection?'selected':''}" data-command-index="${i}">${icon(x.icon)}<span>${escapeHTML(x.label)}</span><span>${x.kind}</span></button>`).join(''):'<div class="dash-empty" style="padding:18px">没有匹配结果</div>');$$('[data-command-index]').forEach(b=>b.onclick=()=>launchCommand(Number(b.dataset.commandIndex)))}
  function launchCommand(i){let x=commandFiltered[i];if(!x)return;closeCommand();if(x.tab)activeTool=x.tab;if(x.query){knowledgeQuery=x.query;$('knowledge-query').value=x.query}go(x.route);if(x.route==='tools')renderTool()}
  $('command-query').oninput=renderCommands;
  $('command-query').onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();commandSelection=Math.min(commandFiltered.length-1,commandSelection+1);paintCommands()}else if(e.key==='ArrowUp'){e.preventDefault();commandSelection=Math.max(0,commandSelection-1);paintCommands()}else if(e.key==='Enter'){e.preventDefault();launchCommand(commandSelection)}};
  $('search-overlay').onclick=e=>{if(e.target===$('search-overlay'))closeCommand()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCommand();closeSettings();closeMobile()};if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()}else if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&$('search-overlay').hidden&&!e.ctrlKey&&!e.metaKey){e.preventDefault();openCommand()}});
  renderDashboard();renderKnowledge();renderDocs();renderTasks();renderChat();renderApps();renderTool();navigate();
})();
