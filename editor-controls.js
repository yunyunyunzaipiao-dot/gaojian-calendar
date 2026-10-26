globalThis.EditorControls = (() => {
  const dateText=value=>value?value.replaceAll('-',' / '):'选择日期';
  const splitTypes=value=>String(value||'').split(' · ').map(x=>x.trim()).filter(Boolean);
  let form, tags=[],sources=[],currentType=[],popup=null,activeTrigger=null;
  const fields=new Map();
  function fieldButton(input,label){
    input.type='hidden';
    const button=document.createElement('button');button.type='button';button.className='date-trigger';button.dataset.dateField=input.name;
    button.setAttribute('aria-label',label);input.after(button);
    fields.set(input.name,{input,button,label});
    button.addEventListener('click',()=>openPicker(button,input));
  }
  function init(target){
    form=target;
    const oldSource=form.elements.source,source=document.createElement('input');source.type='hidden';source.name='source';
    const sourceSection=document.createElement('div');sourceSection.className='form-field full';
    sourceSection.innerHTML='<span id="sourceLabel">来源</span><div class="type-options" id="sourceOptions" role="group" aria-labelledby="sourceLabel"></div><div class="tag-create"><input id="newSource" maxlength="40" placeholder="添加新的来源标签" aria-label="新来源标签"><button type="button" id="addSource">＋ 添加</button></div>';
    oldSource.closest('label').replaceWith(sourceSection);sourceSection.prepend(source);
    sourceSection.querySelector('#addSource').addEventListener('click',addSource);
    sourceSection.querySelector('#newSource').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addSource();}});
    const type=form.elements.type;type.type='hidden';
    const host=type.closest('label'),section=document.createElement('div');section.className='form-field full type-field';
    section.innerHTML='<span id="typeLabel">稿件类型</span><div class="type-options" id="typeOptions" role="group" aria-labelledby="typeLabel"></div><div class="tag-create"><input id="newType" maxlength="30" placeholder="添加新的类型标签" aria-label="新类型标签"><button type="button" id="addType">＋ 添加</button></div>';
    host.replaceWith(section);section.prepend(type);
    section.querySelector('#addType').addEventListener('click',addTag);
    section.querySelector('#newType').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addTag();}});
    [...form.querySelectorAll('input[type="date"]')].filter(input=>!['planStart','planEnd'].includes(input.name)).forEach(input=>fieldButton(input,input.closest('label').querySelector('span').textContent));
    const start=form.elements.planStart,end=form.elements.planEnd,startField=start.closest('label'),endField=end.closest('label');
    start.type=end.type='hidden';startField.classList.add('full');startField.querySelector('span').textContent='预计工期';startField.append(end);endField.remove();
    const range=document.createElement('button');range.type='button';range.className='date-trigger';range.id='planRangeTrigger';range.setAttribute('aria-label','预计工期，选择开始和结束日期');startField.append(range);
    range.addEventListener('click',()=>openPicker(range,start,end));
    form.elements.paid.addEventListener('change',updatePaid);
    document.addEventListener('pointerdown',e=>{if(popup&&!popup.contains(e.target)&&e.target!==activeTrigger)closePicker();});
    window.addEventListener('resize',closePicker);
  }
  function renderSources(){
    const host=document.querySelector('#sourceOptions');host.replaceChildren();
    sources.forEach(source=>{const button=document.createElement('button');button.type='button';button.className='type-chip'+(source===form.elements.source.value?' chosen':'');button.textContent=source;button.setAttribute('aria-pressed',String(source===form.elements.source.value));button.addEventListener('click',()=>{form.elements.source.value=source;renderSources();});host.append(button);});
  }
  function addSource(){
    const input=document.querySelector('#newSource'),source=input.value.trim();if(!source)return;
    if(!sources.includes(source))sources.push(source);form.elements.source.value=source;input.value='';renderSources();
  }
  function updatePaid(){const free=form.elements.paid.value==='free';form.elements.amount.closest('label').classList.toggle('hidden',free);if(free)form.elements.amount.value='0';}
  function renderTags(){
    const host=document.querySelector('#typeOptions');host.replaceChildren();
    tags.forEach(tag=>{const b=document.createElement('button');b.type='button';b.className='type-chip'+(currentType.includes(tag)?' chosen':'');b.setAttribute('aria-pressed',String(currentType.includes(tag)));b.textContent=tag;b.addEventListener('click',()=>{currentType=currentType.includes(tag)?currentType.filter(t=>t!==tag):[...currentType,tag];form.elements.type.value=currentType.join(' · ');renderTags();});host.append(b);});
  }
  function addTag(){const input=document.querySelector('#newType'),tag=input.value.trim();if(!tag)return;if(!tags.includes(tag))tags.push(tag);currentType=[...new Set([...currentType,tag])];form.elements.type.value=currentType.join(' · ');input.value='';renderTags();}
  function configure(order={},savedTags=[],savedSources=[]){
    tags=[...new Set([...savedTags,order.type||''].flatMap(splitTypes))];currentType=splitTypes(order.type);form.elements.type.value=currentType.join(' · ');
    sources=[...new Set(['画加','QQ',...savedSources,order.source].filter(Boolean))];form.elements.source.value=order.source||'画加';document.querySelector('#newSource').value='';renderSources();
    document.querySelector('#newType').value='';updatePaid();renderTags();syncDates();
  }
  function syncDates(){
    fields.forEach(({input,button})=>{button.textContent=dateText(input.value);button.classList.toggle('has-value',!!input.value);});
    const start=form.elements.planStart.value,end=form.elements.planEnd.value;
    document.querySelector('#planRangeTrigger').textContent=start||end?`${dateText(start)} → ${dateText(end)}`:'选择开始日期 → 结束日期';
  }
  function closePicker(){if(!popup)return;popup.remove();popup=null;activeTrigger?.focus();activeTrigger=null;}
  function openPicker(trigger,input,endInput,onCommit){
    closePicker();activeTrigger=trigger;
    let start=input.value,end=endInput?.value||'',selecting='start';
    const initial=start?new Date(start+'T12:00:00'):new Date();let month=new Date(initial.getFullYear(),initial.getMonth(),1);
    popup=document.createElement('div');popup.className='date-popover';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',endInput?'选择预计工期':'选择日期');document.body.append(popup);
    function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
    function draw(){
      popup.replaceChildren();
      const top=document.createElement('div');top.className='picker-values';
      const startButton=document.createElement('button');startButton.type='button';startButton.textContent=start||'开始日期';startButton.className=selecting==='start'?'active':'';startButton.addEventListener('click',()=>{selecting='start';draw();});top.append(startButton);
      if(endInput){const endButton=document.createElement('button');endButton.type='button';endButton.textContent=end||'结束日期';endButton.className=selecting==='end'?'active':'';endButton.addEventListener('click',()=>{selecting='end';draw();});top.append(endButton);}popup.append(top);
      const heading=document.createElement('div');heading.className='picker-heading';
      const title=document.createElement('strong');title.textContent=`${month.getFullYear()}年${month.getMonth()+1}月`;heading.append(title);
      for(const [text,delta,label] of [['‹',-1,'日期控件上个月'],['›',1,'日期控件下个月']]){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+delta,1);draw();});heading.append(b);}popup.append(heading);
      const grid=document.createElement('div');grid.className='picker-grid';for(const day of ['一','二','三','四','五','六','日']){const label=document.createElement('span');label.className='picker-weekday';label.textContent=day;grid.append(label);}
      const first=new Date(month);first.setDate(1-((month.getDay()+6)%7));
      for(let i=0;i<42;i++){
        const date=new Date(first);date.setDate(first.getDate()+i);const value=key(date),b=document.createElement('button');b.type='button';b.textContent=date.getDate();b.dataset.pickerDate=value;b.setAttribute('aria-label',value);
        b.className=(date.getMonth()!==month.getMonth()?'muted ':'')+(value===start||value===end?'endpoint ':'')+(start&&end&&value>start&&value<end?'in-range ':'')+(value===key(new Date())?'is-today':'');
        b.addEventListener('click',()=>{
          if(!endInput){start=value;}
          else if(selecting==='start'){start=value;end='';selecting='end';}
          else{if(!start)start=value;else end=value;if(end&&end<start)[start,end]=[end,start];selecting='start';}
          draw();
        });grid.append(b);
      }popup.append(grid);
      const hint=document.createElement('p');hint.className='picker-hint';hint.textContent=endInput?(selecting==='end'?'再点击结束日期，可切换月份。':'点击开始日期，再点击结束日期。'):'选择日期后点击确定。';popup.append(hint);
      const footer=document.createElement('div');footer.className='picker-footer';
      const clear=document.createElement('button');clear.type='button';clear.textContent='清除';clear.addEventListener('click',()=>{input.value='';if(endInput)endInput.value='';commit();});
      const current=document.createElement('button');current.type='button';current.textContent='今天';current.addEventListener('click',()=>{start=key(new Date());end='';selecting=endInput?'end':'start';month=new Date(new Date().getFullYear(),new Date().getMonth(),1);draw();});
      const apply=document.createElement('button');apply.type='button';apply.className='picker-apply';apply.textContent='确定';apply.disabled=!start||(!!endInput&&!end);apply.addEventListener('click',()=>{input.value=start;if(endInput)endInput.value=end;commit();});footer.append(clear,current,apply);popup.append(footer);
      const r=trigger.getBoundingClientRect();popup.style.left=`${Math.max(8,Math.min(r.left,window.innerWidth-316))}px`;popup.style.top=`${Math.max(8,Math.min(r.bottom+6,window.innerHeight-popup.offsetHeight-8))}px`;
    }
    function commit(){if(onCommit){const values={start:input.value,end:endInput?.value||''};closePicker();onCommit(values);return;}syncDates();input.dispatchEvent(new Event('change',{bubbles:true}));endInput?.dispatchEvent(new Event('change',{bubbles:true}));closePicker();}
    draw();popup.querySelector('button').focus();
  }
  function pickDates(trigger,values,onCommit){
    const start=document.createElement('input');start.value=values.start||'';
    const end=Object.hasOwn(values,'end')?document.createElement('input'):null;
    if(end)end.value=values.end||'';
    openPicker(trigger,start,end,onCommit);
  }
  return {pickDates,init,configure,syncDates,closePicker,pickerOpen:()=>!!popup,getTags:()=>tags,getSources:()=>sources,getSource:()=>form.elements.source.value.trim()};
})();
