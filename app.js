// Codex Skills Hub - Vanilla JS
const DATA_URL = './data/skills.json';
const CATEGORIES = ["全部","GitHub / PR","CI / Debug","Code Migration","Testing","Documentation","Meeting","Spreadsheet / Data","Research","Automation","Security","Productivity","Skill Development","Other"];
const USECASES = ["全部","修 CI","審 PR","分析錯誤","程式遷移","重構","寫測試","整理文件","會議紀錄","處理 Excel","資料分析","研究","建立 Skill","日常自動化"];
const RISKS = ["全部","low","medium","high","未確認"];
const DEPENDENCIES = ["全部","API Key","MCP","GitHub","Shell","Network","Git Write","Delete"];
const SORT_OPTIONS = ["featured","name","newest","risk"];

let skills = [];
let filtered = [];
let state = {
  q: "",
  category: "全部",
  useCase: "全部",
  risk: "全部",
  dependency: "全部",
  tags: new Set(),
  sort: "featured",
  favOnly: false,
  installedOnly: false,
  tagsExpanded: false,
  depsExpanded: false
};
let favSet = new Set();
let installedSet = new Set();
let allTags = [];

const els = {};
function $(id){ return document.getElementById(id); }

function initEls(){
  els.searchInput = $('searchInput');
  els.resultCount = $('resultCount');
  els.categoryFilters = $('categoryFilters');
  els.useCaseFilters = $('useCaseFilters');
  els.riskFilters = $('riskFilters');
  els.dependencyFilters = $('dependencyFilters');
  els.tagFilters = $('tagFilters');
  els.skillGrid = $('skillGrid');
  els.featuredGrid = $('featuredGrid');
  els.mySkillsGrid = $('mySkillsGrid');
  els.myEmptyState = $('myEmptyState');
  els.emptyState = $('emptyState');
  els.errorState = $('errorState');
  els.errorMsg = $('errorMsg');
  els.sortSelect = $('sortSelect');
  els.favBtn = $('favoritesOnlyBtn');
  els.installedBtn = $('installedOnlyBtn');
  els.clearBtn = $('clearFiltersBtn');
  els.clearBtn2 = $('clearFiltersBtn2');
  els.emptyClearBtn = $('emptyClearBtn');
  els.toggleTagsBtn = $('toggleTagsBtn');
  els.toggleDepsBtn = $('toggleDepsBtn');
  els.themeToggle = $('themeToggle');
  els.toast = $('toast');
}

function loadStorage(){
  try{
    const favRaw = localStorage.getItem('codex-favorites');
    if(favRaw) favSet = new Set(JSON.parse(favRaw));
    const instRaw = localStorage.getItem('codex-installed');
    if(instRaw) installedSet = new Set(JSON.parse(instRaw));
  }catch(e){ console.warn('storage load fail', e); }
}
function saveFavorites(){ try{ localStorage.setItem('codex-favorites', JSON.stringify([...favSet])); }catch{} }
function saveInstalled(){ try{ localStorage.setItem('codex-installed', JSON.stringify([...installedSet])); }catch{} }

function loadTheme(){
  const saved = localStorage.getItem('codex-theme');
  if(saved) document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const isDark = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('codex-theme', next);
}

function parseURL(){
  const params = new URLSearchParams(location.search);
  if(params.get('q')) state.q = params.get('q');
  if(params.get('category')) state.category = params.get('category');
  if(params.get('useCase')) state.useCase = params.get('useCase');
  if(params.get('risk')) state.risk = params.get('risk');
  if(params.get('dependency')) state.dependency = params.get('dependency');
  if(params.get('sort')) state.sort = params.get('sort');
  if(params.get('fav') === '1') state.favOnly = true;
  if(params.get('installed') === '1') state.installedOnly = true;
  const tags = params.getAll('tag');
  if(tags.length) state.tags = new Set(tags);
  const single = params.get('tag');
  if(single && single.includes(',')){
    single.split(',').forEach(t=> { if(t.trim()) state.tags.add(t.trim()); });
  }
}

function syncURL(){
  const params = new URLSearchParams();
  if(state.q) params.set('q', state.q);
  if(state.category !== '全部') params.set('category', state.category);
  if(state.useCase !== '全部') params.set('useCase', state.useCase);
  if(state.risk !== '全部') params.set('risk', state.risk);
  if(state.dependency !== '全部') params.set('dependency', state.dependency);
  if(state.sort !== 'featured') params.set('sort', state.sort);
  if(state.favOnly) params.set('fav','1');
  if(state.installedOnly) params.set('installed','1');
  state.tags.forEach(t=> params.append('tag', t));
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function getSearchableText(s){
  const useCaseStr = (s.useCase||[]).join(' ');
  const tagsStr = (s.tags||[]).join(' ');
  const requiresStr = (s.requires||[]).join(' ');
  return [s.name, s.title, s.description, s.category, useCaseStr, tagsStr, s.sourceName, requiresStr, s.notes].join(' ').toLowerCase();
}

function matchesDependency(skill, depFilter){
  if(depFilter === '全部') return true;
  const req = (skill.requires||[]).join(' ').toLowerCase();
  const caps = skill.capabilities || {};
  if(depFilter === 'API Key') return caps.apiKey === true || req.includes('api') || req.includes('composio');
  if(depFilter === 'MCP') return caps.mcp === true || req.toLowerCase().includes('mcp');
  if(depFilter === 'GitHub') return req.includes('github') || caps.externalService === true;
  if(depFilter === 'Shell') return caps.shell === true;
  if(depFilter === 'Network') return caps.network === true;
  if(depFilter === 'Git Write') return caps.gitWrite === true;
  if(depFilter === 'Delete') return caps.deleteFiles === true;
  return true;
}

function filterAndSort(){
  const q = state.q.trim().toLowerCase();
  filtered = skills.filter(s=>{
    if(q){
      const hay = getSearchableText(s);
      if(!hay.includes(q)) return false;
    }
    if(state.category !== '全部' && s.category !== state.category) return false;
    if(state.useCase !== '全部'){
      if(!(s.useCase||[]).includes(state.useCase)) return false;
    }
    if(state.risk !== '全部'){
      if(state.risk === '未確認'){
        if(s.risk) return false;
      } else {
        if(s.risk !== state.risk) return false;
      }
    }
    if(!matchesDependency(s, state.dependency)) return false;
    if(state.tags.size){
      const sTags = new Set((s.tags||[]).map(t=>t.toLowerCase()));
      for(const sel of state.tags){
        if(!sTags.has(sel.toLowerCase())) return false;
      }
    }
    if(state.favOnly && !favSet.has(s.id)) return false;
    if(state.installedOnly && !installedSet.has(s.id)) return false;
    return true;
  });

  if(state.sort === 'featured'){
    filtered.sort((a,b)=>{
      if(a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.added||'').localeCompare(a.added||'');
    });
  } else if(state.sort === 'name'){
    filtered.sort((a,b)=> a.name.localeCompare(b.name));
  } else if(state.sort === 'newest'){
    filtered.sort((a,b)=> (b.added||'').localeCompare(a.added||''));
  } else if(state.sort === 'risk'){
    const order = {low:0, medium:1, high:2};
    filtered.sort((a,b)=>{
      const ao = a.risk ? (order[a.risk] ?? 3) : 4;
      const bo = b.risk ? (order[b.risk] ?? 3) : 4;
      return ao - bo;
    });
  }

  renderSkills();
  renderMySkills();
  renderResultCount();
  syncURL();
}

function renderResultCount(){
  if(els.resultCount) els.resultCount.textContent = `目前顯示 ${filtered.length} / ${skills.length} 個 Skills`;
}

function renderChips(){
  // category
  els.categoryFilters.innerHTML = '';
  CATEGORIES.forEach(cat=>{
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.category===cat ? ' active' : '');
    btn.textContent = cat;
    btn.setAttribute('aria-pressed', state.category===cat ? 'true':'false');
    btn.addEventListener('click', ()=>{ state.category=cat; renderChips(); filterAndSort(); });
    els.categoryFilters.appendChild(btn);
  });
  // useCase
  els.useCaseFilters.innerHTML = '';
  USECASES.forEach(uc=>{
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.useCase===uc ? ' active' : '');
    btn.textContent = uc;
    btn.addEventListener('click', ()=>{ state.useCase=uc; renderChips(); filterAndSort(); });
    els.useCaseFilters.appendChild(btn);
  });
  // risk
  els.riskFilters.innerHTML = '';
  RISKS.forEach(r=>{
    const label = r === '未確認' ? '未確認' : r.toUpperCase();
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.risk===r ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', ()=>{ state.risk=r; renderChips(); filterAndSort(); });
    els.riskFilters.appendChild(btn);
  });
  // dependency
  els.dependencyFilters.innerHTML = '';
  DEPENDENCIES.forEach(dep=>{
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.dependency===dep ? ' active' : '');
    btn.textContent = dep;
    btn.addEventListener('click', ()=>{ state.dependency=dep; renderChips(); filterAndSort(); });
    els.dependencyFilters.appendChild(btn);
  });
  // tags
  const counts = {};
  skills.forEach(s=> (s.tags||[]).forEach(t=>{ counts[t]=(counts[t]||0)+1; }));
  const sortedTags = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
  els.tagFilters.innerHTML = '';
  sortedTags.forEach(({name,count})=>{
    const btn = document.createElement('button');
    btn.className = 'chip tag' + (state.tags.has(name) ? ' active' : '');
    btn.textContent = `${name} (${count})`;
    btn.title = name;
    btn.addEventListener('click', ()=>{
      if(state.tags.has(name)) state.tags.delete(name);
      else state.tags.add(name);
      renderChips(); filterAndSort();
    });
    els.tagFilters.appendChild(btn);
  });
  els.tagFilters.classList.toggle('collapsed', !state.tagsExpanded);
  if(els.toggleTagsBtn) els.toggleTagsBtn.textContent = state.tagsExpanded ? '收合' : '顯示全部';
}

function capBadge(label, value){
  // value: true / false / null
  let cls = 'cap-badge ';
  let icon = '?';
  let text = `${label}: ? 未確認`;
  if(value === true){ cls+='yes'; icon='✓'; text=`${label}: ✓ 有`; }
  else if(value === false){ cls+='no'; icon='－'; text=`${label}: － 無`; }
  else { cls+='unknown'; icon='?'; text=`${label}: ? 未確認`; }
  return {cls, icon, text};
}

function createCard(s){
  const isFav = favSet.has(s.id);
  const isInstalled = installedSet.has(s.id);
  const card = document.createElement('article');
  card.className = 'card';
  
  const top = document.createElement('div');
  top.className = 'card-top';
  const titleBlock = document.createElement('div');
  titleBlock.className = 'title-block';
  const mainTitle = document.createElement('h3');
  mainTitle.className = 'card-title-main';
  mainTitle.textContent = s.title;
  const subTitle = document.createElement('div');
  subTitle.className = 'card-title-sub';
  subTitle.textContent = s.name;
  titleBlock.appendChild(mainTitle);
  titleBlock.appendChild(subTitle);
  
  const favBtn = document.createElement('button');
  favBtn.className = 'fav-btn' + (isFav ? ' active' : '');
  favBtn.setAttribute('aria-label', `收藏 ${s.title}`);
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.addEventListener('click', ()=>{
    if(favSet.has(s.id)) favSet.delete(s.id); else favSet.add(s.id);
    saveFavorites(); renderSkills(); renderMySkills(); renderFeatured(); renderResultCount();
  });
  
  top.appendChild(titleBlock);
  top.appendChild(favBtn);
  
  const badges = document.createElement('div');
  badges.className = 'badges';
  const catBadge = document.createElement('span');
  catBadge.className = 'badge cat';
  catBadge.textContent = s.category;
  badges.appendChild(catBadge);
  if(s.useCase && s.useCase.length){
    s.useCase.forEach(uc=>{
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = uc;
      badges.appendChild(b);
    });
  }
  // risk badge
  const riskVal = s.risk || '未確認';
  const riskBadge = document.createElement('span');
  riskBadge.className = 'badge risk-badge ' + (riskVal==='low'?'risk-low': riskVal==='medium'?'risk-medium': riskVal==='high'?'risk-high':'risk-unknown');
  riskBadge.textContent = riskVal === '未確認' ? '⚠ 未確認風險' : `⚠ ${riskVal.toUpperCase()} Risk`;
  badges.appendChild(riskBadge);
  if(isInstalled){
    const inst = document.createElement('span');
    inst.className = 'badge installed-badge active';
    inst.textContent = '已標記安裝';
    badges.appendChild(inst);
  }

  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = s.description;

  const tagsRow = document.createElement('div');
  tagsRow.className = 'tags-row';
  (s.tags||[]).forEach(t=>{
    const btn = document.createElement('button');
    btn.className = 'tag';
    btn.textContent = t;
    btn.addEventListener('click', ()=>{ state.tags.add(t); renderChips(); filterAndSort(); document.getElementById('skills-section').scrollIntoView({behavior:'smooth'}); });
    tagsRow.appendChild(btn);
  });

  const requiresRow = document.createElement('div');
  requiresRow.className = 'requires-row';
  if(s.requires && s.requires.length){
    s.requires.forEach(r=>{
      const b = document.createElement('span');
      b.className = 'requires-badge';
      b.textContent = r;
      requiresRow.appendChild(b);
    });
  }

  const capRow = document.createElement('div');
  capRow.className = 'cap-row';
  const caps = s.capabilities || {};
  const capLabels = [['Scripts','scripts'],['Shell','shell'],['Network','network'],['API Key','apiKey'],['MCP','mcp'],['Git Write','gitWrite'],['Delete','deleteFiles']];
  capLabels.forEach(([label,key])=>{
    const val = caps[key];
    if(val === undefined) return; // if not present, skip? but we want to show unknown if null
    const info = capBadge(label, val);
    const span = document.createElement('span');
    span.className = info.cls;
    span.textContent = info.text;
    span.title = label;
    capRow.appendChild(span);
  });
  // handle explicit nulls
  Object.entries(caps).forEach(([k,v])=>{
    if(v===null){
      const labelMap = {scripts:'Scripts',shell:'Shell',network:'Network',apiKey:'API Key',mcp:'MCP',gitWrite:'Git Write',deleteFiles:'Delete',externalService:'External'};
      const label = labelMap[k]||k;
      if(!capLabels.find(x=>x[1]===k)){
        const info = capBadge(label, null);
        const span = document.createElement('span');
        span.className = info.cls;
        span.textContent = info.text;
        capRow.appendChild(span);
      }
    }
  });

  const meta = document.createElement('div');
  meta.className = 'meta';
  const sourceText = document.createElement('span');
  sourceText.textContent = `來源：${s.sourceName||''} / ${s.skillPath||''}`;
  meta.appendChild(sourceText);
  if(s.added){
    const addedSpan = document.createElement('span');
    addedSpan.textContent = `加入：${s.added}`;
    meta.appendChild(addedSpan);
  }
  if(s.notes){
    const notesSpan = document.createElement('span');
    notesSpan.textContent = s.notes;
    meta.appendChild(notesSpan);
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  
  if(s.skillUrl){
    const a = document.createElement('a');
    a.href = s.skillUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'btn secondary small';
    a.textContent = '查看 Skill';
    actions.appendChild(a);
  } else if(s.sourceRepo){
    const a = document.createElement('a');
    a.href = s.sourceRepo;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'btn secondary small';
    a.textContent = '查看來源';
    actions.appendChild(a);
  }

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn secondary small';
  copyBtn.textContent = '複製安裝指令';
  copyBtn.addEventListener('click', ()=>{
    if(s.installCommand) copyText(s.installCommand);
    else showToast('未提供安裝指令');
  });
  actions.appendChild(copyBtn);

  const instBtn = document.createElement('button');
  instBtn.className = 'btn small' + (isInstalled ? ' secondary' : '');
  instBtn.textContent = isInstalled ? '取消已安裝標記' : '手動標記已安裝';
  instBtn.addEventListener('click', ()=>{
    if(installedSet.has(s.id)) installedSet.delete(s.id);
    else installedSet.add(s.id);
    saveInstalled();
    renderSkills();
    renderMySkills();
    renderFeatured();
  });
  actions.appendChild(instBtn);

  card.appendChild(top);
  card.appendChild(badges);
  card.appendChild(desc);
  card.appendChild(tagsRow);
  if(requiresRow.children.length) card.appendChild(requiresRow);
  if(capRow.children.length) card.appendChild(capRow);
  card.appendChild(meta);
  card.appendChild(actions);

  // optional install box preview
  if(s.installCommand){
    const box = document.createElement('pre');
    box.className = 'install-box';
    box.textContent = s.installCommand;
    card.appendChild(box);
  }

  return card;
}

function renderSkills(){
  els.skillGrid.innerHTML = '';
  if(filtered.length===0){
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    filtered.forEach(s=> els.skillGrid.appendChild(createCard(s)));
  }
}
function renderFeatured(){
  els.featuredGrid.innerHTML = '';
  const feat = skills.filter(s=> s.featured);
  feat.forEach(s=> els.featuredGrid.appendChild(createCard(s)));
}
function renderMySkills(){
  els.mySkillsGrid.innerHTML = '';
  const mine = skills.filter(s=> favSet.has(s.id) || installedSet.has(s.id));
  if(mine.length===0){
    els.myEmptyState.hidden = false;
  } else {
    els.myEmptyState.hidden = true;
    mine.forEach(s=> els.mySkillsGrid.appendChild(createCard(s)));
  }
}

function copyText(text){
  navigator.clipboard.writeText(text).then(()=> showToast('已複製安裝指令')).catch(()=>{
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); showToast('已複製'); }catch{ showToast('複製失敗'); }
    ta.remove();
  });
}
let toastTimer;
function showToast(msg){
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> els.toast.hidden = true, 2500);
}

async function loadData(){
  try{
    const res = await fetch(DATA_URL, {cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    skills = data.filter(x=> x && x.id && x.name && x.title);
    if(skills.length===0) throw new Error('無有效資料');
  }catch(e){
    els.errorState.hidden = false;
    els.errorMsg.textContent = e.message;
    console.error(e);
    if(els.resultCount) els.resultCount.textContent = '載入失敗';
    return;
  }
  renderChips();
  if(state.q && els.searchInput) els.searchInput.value = state.q;
  if(state.sort && els.sortSelect) els.sortSelect.value = state.sort;
  if(state.favOnly && els.favBtn){ els.favBtn.textContent='★ 只看收藏'; els.favBtn.setAttribute('aria-pressed','true'); }
  if(state.installedOnly && els.installedBtn){ els.installedBtn.textContent='◆ 只看已安裝'; els.installedBtn.setAttribute('aria-pressed','true'); }
  filterAndSort();
  renderFeatured();
}

function bindEvents(){
  els.searchInput.addEventListener('input', e=>{ state.q=e.target.value; filterAndSort(); });
  els.sortSelect.addEventListener('change', e=>{ state.sort=e.target.value; filterAndSort(); });
  els.favBtn.addEventListener('click', ()=>{
    state.favOnly=!state.favOnly;
    els.favBtn.setAttribute('aria-pressed', state.favOnly?'true':'false');
    els.favBtn.textContent = state.favOnly ? '★ 只看收藏' : '☆ 只看收藏';
    filterAndSort();
  });
  els.installedBtn.addEventListener('click', ()=>{
    state.installedOnly=!state.installedOnly;
    els.installedBtn.setAttribute('aria-pressed', state.installedOnly?'true':'false');
    els.installedBtn.textContent = state.installedOnly ? '◆ 只看已安裝' : '◇ 只看已安裝';
    filterAndSort();
  });
  function clearAll(){
    state.q=''; state.category='全部'; state.useCase='全部'; state.risk='全部'; state.dependency='全部'; state.tags.clear(); state.favOnly=false; state.installedOnly=false; state.sort='featured';
    els.searchInput.value=''; els.sortSelect.value='featured';
    els.favBtn.textContent='☆ 只看收藏'; els.favBtn.setAttribute('aria-pressed','false');
    els.installedBtn.textContent='◇ 只看已安裝'; els.installedBtn.setAttribute('aria-pressed','false');
    renderChips(); filterAndSort();
  }
  els.clearBtn.addEventListener('click', clearAll);
  els.clearBtn2.addEventListener('click', clearAll);
  els.emptyClearBtn.addEventListener('click', clearAll);
  els.toggleTagsBtn.addEventListener('click', ()=>{ state.tagsExpanded=!state.tagsExpanded; renderChips(); });
  if(els.toggleDepsBtn) els.toggleDepsBtn.addEventListener('click', ()=>{ /* dependency currently not collapsed */ });
  els.themeToggle.addEventListener('click', toggleTheme);
}

function init(){
  initEls();
  loadStorage();
  loadTheme();
  parseURL();
  bindEvents();
  loadData();
}
init();
