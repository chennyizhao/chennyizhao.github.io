import {localized, chronological, randomHomepage, escapeHTML as esc} from './core.mjs';
let data, lang='zh', direction='desc', currentImages=[], activeImages=[], activeIndex=0, returnFocus;
try { lang=localStorage.getItem('archive-language')==='en'?'en':'zh'; } catch {}
const $=s=>document.querySelector(s), t=(zh,en)=>lang==='zh'?zh:en, text=v=>esc(localized(v,lang));
const pending=()=>t('待补充','To be supplied');
const field=v=>text(v)||`<span class="pending">${pending()}</span>`;
const labels={index:['首页','Index'],architecture:['建筑','Architecture'],photography:['摄影','Photography'],about:['关于','About'],contact:['联系','Contact']};
const route=()=>location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
const href=(section,id)=>`#/${section}${id?'/'+encodeURIComponent(id):''}`;
const photo=(image,index)=>`<button class="photo" data-photo="${index}" aria-label="${esc(t('查看图片','View image'))} ${index+1}"><img src="${esc(image.thumb||image.src)}" width="${image.width||''}" height="${image.height||''}" alt="${text(image.title)||esc(image.source||'')}" loading="lazy" decoding="async"></button>`;
function nav() {
  const [section='',id='']=route();
  $('#nav').innerHTML=`<a class="nav-row ${!section?'active':''}" href="#/" ${!section?'aria-current="page"':''}>${t(...labels.index)}</a>`+
    ['architecture','photography'].map(key=>`<div class="nav-group"><a class="nav-row ${section===key&&!id?'active':''}" href="${href(key)}" aria-expanded="${section===key}">${t(...labels[key])}</a><div class="subnav" ${section===key?'':'hidden'}>${chronological(data[key],direction).map(item=>`<a href="${href(key,item.id)}" ${id===item.id?'aria-current="page" class="active"':''}>${text(item.title)}</a>`).join('')}</div></div>`).join('')+
    `<div class="nav-secondary">${['about','contact'].map(key=>`<a class="nav-row ${section===key?'active':''}" href="${href(key)}" ${section===key?'aria-current="page"':''}>${t(...labels[key])}</a>`).join('')}</div><button class="language" id="language" lang="${lang==='zh'?'en':'zh'}">${lang==='zh'?'EN':'中文'}</button>`;
  $('#language').onclick=()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('archive-language',lang);}catch{}render(false);if($('#lightbox').open)showImage();};
  $('#copyright').innerHTML=t('作品版权归陈艺钊所有，未经许可不得商用。','All works © Chen Yizhao.<br>Commercial use requires permission.');
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
}
const heading=(small,title)=>`<p class="eyebrow">${small}</p><h1>${title}</h1>`;
function toolbar(items) {
  const unknown=items.some(x=>!x.date);
  return `<div class="toolbar"><span>${items.length} ${t('项','items')}${unknown?' · '+t('部分日期待补充；未定日期置后','Some dates pending; undated items appear last'):''}</span><label>${t('时间','Date')} <select id="sort" aria-label="${t('按时间排序','Sort by date')}"><option value="desc" ${direction==='desc'?'selected':''}>${t('最新在前','Newest first')}</option><option value="asc" ${direction==='asc'?'selected':''}>${t('最早在前','Oldest first')}</option></select></label></div>`;
}
function render(resetScroll=true) {
  const [section='',encodedId='']=route();let id;try{id=decodeURIComponent(encodedId);}catch{id='';}
  nav();currentImages=[];document.body.classList.toggle('home-mode',!section);
  document.title=`${section&&labels[section]?t(...labels[section])+' — ':''}Chen Yizhao 陈艺钊`;
  let html='';
  if(!section){
    const hero=data.home.hero;
    html=`<section class="home" aria-label="${t('首页精选','Featured works')}">${hero?`<img class="home-hero" src="${esc(typeof hero==='string'?hero:hero.src)}" alt="${text(hero.title)||t('首页主视觉','Homepage hero')}">`:`<div class="hero-pending">${t('首页主图 · 待选','Homepage image · awaiting selection')}<span>${t('陈艺钊 / 建筑与摄影','Chen Yizhao / Architecture & Photography')}</span></div>`}<div class="featured">${[0,1,2].map(i=>{const f=data.home.featured[i];return f?`<a class="feature" href="${esc(f.href)}" aria-label="${text(f.title)}"><img src="${esc(f.src)}" alt="${text(f.title)}"></a>`:`<div class="feature empty">${t(i<2?'建筑封面待选':'摄影封面待选',i<2?'Architecture<br>selection pending':'Photography<br>selection pending')}</div>`;}).join('')}</div></section>`;
  }else if(section==='about'){
    html=`<section class="page about">${heading(t('个人介绍','Introduction'),t('关于','About'))}<div class="about-grid"><img class="portrait" src="${esc(data.about.portrait)}" alt="${t('陈艺钊个人照片','Portrait of Chen Yizhao')}"><div class="about-copy">${data.about.paragraphs.map(p=>`<p>${field(p)}</p>`).join('')}</div></div></section>`;
  }else if(section==='contact'){
    html=`<section class="page">${heading(t('联系方式','Get in touch'),t('联系','Contact'))}<div class="contact-copy"><p class="eyebrow">${t('邮箱','Email')}</p><a href="mailto:${esc(data.contact.email)}">${esc(data.contact.email)}</a><p class="eyebrow">${t('工作地点','Workplace')}</p><address>${field(data.contact.location)}</address></div></section>`;
  }else if(['architecture','photography'].includes(section)){
    const item=data[section].find(x=>x.id===id);
    if(!id){
      const items=chronological(data[section],direction);
      html=`<section class="page">${heading(t('作品档案','Selected archive'),t(...labels[section]))}${toolbar(items)}<div class="grid">${items.map(item=>`<a class="card" href="${href(section,item.id)}"><img src="${esc(item.cover)}" alt="${text(item.title)}" loading="lazy"><h2>${text(item.title)}</h2><p>${field(item.period||item.date)}${section==='architecture'?` · ${field(item.type)} · ${field(item.location)}`:` · ${item.images.length} ${t('张','images')} · ${field(item.location)}`}</p></a>`).join('')}</div></section>`;
    }else if(!item){html=notFound();}
    else if(section==='photography'){
      currentImages=chronological(item.images.map(image=>({...image,seriesLocation:item.location})),direction);
      html=`<section class="page"><a class="back" href="${href(section)}">← ${t('摄影','Photography')}</a>${heading(t('摄影分集','Photography series'),text(item.title))}${toolbar(currentImages)}<p class="eyebrow">${t('分集拍摄地点','Series locations')} / ${field(item.location)}</p><div class="wall">${currentImages.map(photo).join('')}</div></section>`;
    }else{
      currentImages=item.images;
      html=`<article class="page"><a class="back" href="${href(section)}">← ${t('建筑','Architecture')}</a>${heading(t('建筑项目','Architecture project'),text(item.title))}<dl class="project-info">${[[t('项目','Project'),item.title],[t('年份','Year'),item.date],[t('地点','Location'),item.location],[t('类型','Type'),item.type],[t('参与角色','Role'),item.role]].map(([label,value])=>`<div><dt>${label}</dt><dd>${field(value)}</dd></div>`).join('')}<div class="description"><dt>${t('设计说明','Description')}</dt><dd>${field(item.description)}</dd></div></dl><div class="project-images">${currentImages.map(photo).join('')}</div><div class="documents">${(item.documents||[]).map(d=>`<a href="${esc(d.src)}" target="_blank" rel="noopener">${text(d.title)} ↗</a>`).join('')}</div></article>`;
    }
  }else{html=notFound();}
  $('#main').innerHTML=html;
  const sort=$('#sort');if(sort)sort.onchange=()=>{direction=sort.value;render(false);};
  document.querySelectorAll('[data-photo]').forEach(button=>button.onclick=()=>openImage(Number(button.dataset.photo),button));
  if(resetScroll){window.scrollTo(0,0);$('#sidebar').classList.remove('open');$('#menu').setAttribute('aria-expanded','false');}
}
function notFound(){return `<section class="page">${heading('404',t('未找到页面','Page not found'))}<a href="#/">${t('返回首页','Back to index')} →</a></section>`;}
function openImage(index,button){activeImages=currentImages;activeIndex=index;returnFocus=button;showImage();$('#lightbox').showModal();$('#close').focus();}
function showImage(){
  const image=activeImages[activeIndex];if(!image)return;
  $('#full-image').src=image.src;$('#full-image').alt=localized(image.title,lang)||image.source||'';
  $('#metadata').innerHTML=`${localized(image.title,lang)?`<strong>${text(image.title)}</strong>`:''}<span>${image.width} × ${image.height} px</span><span>${t('日期','Date')} / ${field(image.date)}</span><span>${image.location?t('地点','Location'):t('分集地点','Series locations')} / ${field(image.location||image.seriesLocation)}</span>`;
  $('#counter').textContent=`${String(activeIndex+1).padStart(2,'0')} / ${String(activeImages.length).padStart(2,'0')}`;
  $('#previous').disabled=activeImages.length<2;$('#next').disabled=activeImages.length<2;
}
function step(delta){activeIndex=(activeIndex+delta+activeImages.length)%activeImages.length;showImage();}
$('#close').onclick=()=>$('#lightbox').close();$('#previous').onclick=()=>step(-1);$('#next').onclick=()=>step(1);
$('#lightbox').addEventListener('close',()=>returnFocus?.isConnected&&returnFocus.focus({preventScroll:true}));
document.addEventListener('keydown',e=>{if(!$('#lightbox').open)return;if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}if(e.key==='ArrowRight'){e.preventDefault();step(1);}});
let touchX;$('#full-image').addEventListener('touchstart',e=>touchX=e.changedTouches[0].clientX,{passive:true});$('#full-image').addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>50)step(delta<0?1:-1);},{passive:true});
$('#menu').onclick=()=>{const open=$('#sidebar').classList.toggle('open');$('#menu').setAttribute('aria-expanded',String(open));};
window.addEventListener('hashchange',()=>{if($('#lightbox').open)$('#lightbox').close();render();});
try{const response=await fetch('data/site.json');if(!response.ok)throw new Error(response.status);data=await response.json();if(data.home.mode==='random')data.home=randomHomepage(data);render();}catch(error){$('#main').innerHTML=`<div class="error"><p>无法读取网站内容 / Unable to load site data.</p><p>请双击“启动网站.cmd”后访问本地网址，请勿直接打开 index.html。</p><p>Use the local launcher instead of opening index.html directly.</p></div>`;console.error(error);}
