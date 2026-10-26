/* 画稿日历：本地交互原型。示例数据与真实订单严格区分。 */
const KEY = 'huagao-calendar-v1';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const parseDate = (value) => value ? new Date(`${value}T12:00:00`) : null;
const addDays = (date, days) => { const result = new Date(date); result.setDate(result.getDate()+days); return result; };
const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth()+months, 1);
const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}`;
const dateLabel = (value) => value ? `${Number(value.slice(5,7))}月${Number(value.slice(8,10))}日` : '未填写';
const longDate = (value) => value ? `${value.slice(0,4)}年${Number(value.slice(5,7))}月${Number(value.slice(8,10))}日` : '未填写';
const escapeHtml = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeLabels = value => [...new Set(String(value||'').split(' · ').map(x=>x.trim()).filter(Boolean))];
const statusLabel = value => value;
const recordedHours = order => order.workHours!==''&&order.workHours!=null&&Number.isFinite(Number(order.workHours))&&Number(order.workHours)>=0?Number(order.workHours):null;
const money = (value) => Number(value||0).toLocaleString('zh-CN',{maximumFractionDigits:2});
const colorFor = (item) => item.source === '画加' ? 'blue' : item.source === 'QQ' ? 'green' : 'violet';
const today = new Date();

function makeDemo(){
  const base = new Date(today.getFullYear(), today.getMonth(), 1);
  const d = n => ymd(new Date(base.getFullYear(), base.getMonth(), n));
  return [
    {id:'demo-1',title:'角色半身像 · 暮色',source:'画加',type:'半身',status:'进行中',paid:'paid',amount:380,paymentDate:d(6),planStart:d(5),planEnd:d(10),deadline:d(12),actualStart:d(5),actualEnd:'',availability:'工作日 20:00 后',requirements:'暖色夕阳；保留角色发饰。',references:'聊天记录中的角色设定图',revisions:'草稿反馈：眼神再柔和一些'},
    {id:'demo-2',title:'头像委托 · 雪',source:'QQ',type:'头像',status:'未开始',paid:'paid',amount:160,paymentDate:'',planStart:d(11),planEnd:d(15),deadline:d(17),actualStart:'',actualEnd:'',availability:'周末下午',requirements:'冷色调，白色围巾。',references:'客户提供的头像参考图',revisions:''},
    {id:'demo-3',title:'朋友的生日贺图',source:'QQ',type:'插画',status:'未开始',paid:'free',amount:0,paymentDate:'',planStart:d(17),planEnd:d(22),deadline:d(24),actualStart:'',actualEnd:'',availability:'晚间比较方便',requirements:'双人场景，以海边为背景。',references:'聊天中的人物照片',revisions:''},
    {id:'demo-4',title:'原创角色立绘',source:'画加',type:'立绘',status:'进行中',paid:'paid',amount:680,paymentDate:d(13),planStart:d(18),planEnd:d(28),deadline:d(29),actualStart:d(18),actualEnd:'',availability:'每天 19:00–22:00',requirements:'层次丰富的旅行服装，腰间有小包。',references:'服装设定与色卡',revisions:'线稿反馈：帽檐稍微缩小'},
    {id:'demo-5',title:'表情包四格',source:'QQ',type:'表情包',status:'已完成',paid:'paid',amount:240,paymentDate:d(21),planStart:d(20),planEnd:d(23),deadline:d(25),actualStart:d(20),actualEnd:d(23),availability:'',requirements:'四种不同的情绪。',references:'',revisions:'成图反馈：第二格嘴角上扬'},
    {id:'demo-6',title:'水彩风封面',source:'其他',type:'封面',status:'未开始',paid:'paid',amount:520,paymentDate:'',planStart:d(27),planEnd:d(34),deadline:d(36),actualStart:'',actualEnd:'',availability:'工作日午后',requirements:'夜空、树影与人物剪影。',references:'',revisions:''}
  ];
}
function readData(){
  try { const raw=localStorage.getItem(KEY); if(raw){const data=JSON.parse(raw);if(Array.isArray(data.orders)) return data;} } catch(error){console.warn('无法读取本地记录',error);}
  return {orders:makeDemo(),demo:true};
}
let data=readData();
function fillMissingCompletionDates(){
  const orders=data.orders.map(order=>order.status==='已完成'&&!order.actualEnd&&order.deadline?{...order,actualEnd:order.deadline}:order);
  if(orders.every((order,index)=>order===data.orders[index]))return;
  try{
    if(!localStorage.getItem('huagao-before-completion-dates-20261026'))localStorage.setItem('huagao-before-completion-dates-20261026',JSON.stringify(data));
    const updated={...data,orders};localStorage.setItem(KEY,JSON.stringify(updated));data=updated;
  }catch(error){console.warn('完成日期补填失败，原有记录已保留',error);}
}
fillMissingCompletionDates();
data.typeTags=[...new Set([...(data.typeTags||['半身','头像','立绘']),...data.orders.map(o=>o.type)].flatMap(typeLabels))];
data.sourceTags=[...new Set(['画加','QQ',...(data.sourceTags||[]),...data.orders.map(o=>o.source)].filter(Boolean))];
const chartMetrics={source:'count',type:'count'};
let view='calendar', previousView='calendar', selectedId=null, editingId=null, selectedDate=ymd(today), orderFilter='all';
let calendarMonth=new Date(today.getFullYear(),today.getMonth(),1), statsMonth=new Date(today.getFullYear(),today.getMonth(),1);
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch(error){showToast('本机存储空间不足，请先备份并清理浏览器空间。'); console.warn(error);return false;}}
function showToast(message){const el=$('#toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.add('hidden'),3200);}
function findOrder(id){return data.orders.find(item=>item.id===id);}
function deleteOrder(id){
  const order=findOrder(id);
  if(!order||!confirm(`确定删除「${order.title}」吗？此操作无法撤销。`))return;
  const previous=data;data={...data,orders:data.orders.filter(item=>item.id!==id)};
  if(!persist()){data=previous;return;}
  closeDrawer();closeForm();if(selectedId===id)selectedId=null;
  renderCounts();setView(view==='detail'?'orders':view);showToast('稿件已删除');
}
function warning(item){return !!(item.planEnd&&item.deadline&&item.planEnd>item.deadline);}

function setView(next){
  if(next!=='detail'&&$('#orderForm').classList.contains('inline-order-form'))closeForm();
  if(next!=='detail')previousView=next;
  view=next;
  for(const name of ['calendar','orders','stats','detail']) $(`#${name}View`).classList.toggle('hidden',name!==next);
  $$('.nav-item,.mobile-tabbar button[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===next));
  $('#breadcrumbCurrent').textContent=({calendar:'月历',orders:'所有稿件',stats:'月度统计',detail:'稿件详情'})[next];
  if(next==='calendar')renderCalendar();
  if(next==='orders')renderOrders();
  if(next==='stats')renderStats();
  if(next==='detail')renderDetail();
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderCounts(){
  $('#activeCount').textContent=data.orders.filter(o=>o.status==='进行中').length;
  $('#deadlineCount').textContent=CalendarCore.upcoming(data.orders,ymd(new Date())).length;
  $('#demoBanner').classList.toggle('hidden',!data.demo);
}
let suppressBandClickUntil=0;
function calendarDateAt(x,y){
  const week=$$('.calendar-week').find(el=>{const r=el.getBoundingClientRect();return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;});
  if(!week)return null;
  const rect=week.getBoundingClientRect(),column=Math.min(6,Math.floor((x-rect.left)/(rect.width/7)));
  return CalendarCore.shift(week.dataset.start,column);
}
function startPlanDrag(event,item,edge){
  if(event.button!==0)return;
  event.stopPropagation();event.preventDefault();
  const anchor=calendarDateAt(event.clientX,event.clientY);if(!anchor)return;
  const band=event.currentTarget,origin={x:event.clientX,y:event.clientY},initial={start:item.planStart,end:item.planEnd};
  let dragging=false,target=null;
  const label=document.createElement('div');label.className='drag-label';
  function move(e){
    if(e.pointerId!==event.pointerId)return;
    if(!dragging&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)<6)return;
    e.preventDefault();dragging=true;suppressBandClickUntil=Date.now()+500;
    band.closest('.week-band').classList.add('is-dragging');if(!label.isConnected)document.body.append(label);
    target=calendarDateAt(e.clientX,e.clientY);
    $$('.drag-target').forEach(el=>el.classList.remove('drag-target'));
    const delta=target?CalendarCore.dayIndex(target)-CalendarCore.dayIndex(anchor):0;
    const range=CalendarCore.resize(initial,edge,delta),begin=range.start,end=range.end;
    label.textContent=target?`${dateLabel(begin)} → ${dateLabel(end)}`:'拖回日历内调整工期';
    label.style.left=`${Math.min(e.clientX+12,window.innerWidth-260)}px`;label.style.top=`${Math.max(8,e.clientY-42)}px`;
    if(target)$$('.calendar-day').forEach(el=>el.classList.toggle('drag-target',el.dataset.date>=begin&&el.dataset.date<=end));
  }
  function finish(e){
    if(e.pointerId!==event.pointerId)return;
    document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',finish);document.removeEventListener('pointercancel',finish);
    label.remove();band.closest('.week-band').classList.remove('is-dragging');$$('.drag-target').forEach(el=>el.classList.remove('drag-target'));
    if(!dragging)return;
    suppressBandClickUntil=Date.now()+500;
    if(e.type==='pointercancel'||!target)return;
    const delta=CalendarCore.dayIndex(target)-CalendarCore.dayIndex(anchor);if(!delta)return;
    const range=CalendarCore.resize(initial,edge,delta);item.planStart=range.start;item.planEnd=range.end;
    if(!persist()){item.planStart=initial.start;item.planEnd=initial.end;return;}
    selectedDate=edge==='start'?range.start:range.end;renderCalendar();
    showToast(warning(item)?'工期已更新；预计完成日晚于截稿日，请确认。':'预计工期已更新，截稿日保持不变');
  }
  document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
}
function renderCalendar(){
  renderCounts();
  $('#monthTitle').textContent=`${calendarMonth.getFullYear()}年${calendarMonth.getMonth()+1}月`;
  const grid=$('#calendarGrid'); grid.innerHTML='';
  const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);
  const offset=(first.getDay()+6)%7;
  const start=addDays(first,-offset);
  const last=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0);
  const totalWeeks=Math.ceil((offset+last.getDate())/7);
  for(let week=0;week<totalWeeks;week++){
    const weekStart=addDays(start,week*7),weekEl=document.createElement('div');weekEl.className='calendar-week';
    weekEl.dataset.start=ymd(weekStart);
    const layout=CalendarCore.layout(data.orders,ymd(weekStart));
    const lastRow=layout.lanes+3;
    weekEl.style.gridTemplateRows=`34px ${layout.lanes?`repeat(${layout.lanes}, 26px)`:''} minmax(26px, auto) minmax(8px, 1fr)`;
    for(let day=0;day<7;day++){
      const current=addDays(weekStart,day), key=ymd(current),dayEl=document.createElement('button');
      const due=data.orders.filter(o=>o.deadline===key);
      dayEl.type='button';dayEl.className='calendar-day'+(current.getMonth()!==calendarMonth.getMonth()?' outside':'')+(key===ymd(today)?' today':'')+(key===selectedDate?' selected':'');
      dayEl.dataset.date=key;dayEl.style.gridColumn=String(day+1);dayEl.style.gridRow=`1 / ${lastRow+1}`;
      dayEl.setAttribute('aria-label',`${longDate(key)}，${due.length}个截稿日`);
      dayEl.setAttribute('aria-pressed',String(key===selectedDate));
      if(key===ymd(today))dayEl.setAttribute('aria-current','date');
      dayEl.innerHTML=`<span class="day-number">${current.getDate()}</span>`;
      dayEl.addEventListener('click',()=>openDay(key));weekEl.append(dayEl);
      if(due.length){
        const deadlines=document.createElement('div');deadlines.className='day-deadlines';
        deadlines.style.gridColumn=String(day+1);deadlines.style.gridRow=String(layout.lanes+2);
        due.forEach(o=>{const chip=document.createElement('button');chip.type='button';chip.className='deadline-chip';chip.textContent=o.title;chip.title=`截稿：${o.title}`;chip.addEventListener('click',()=>{selectedDate=key;renderCalendar();openPreview(o.id);});deadlines.append(chip);});weekEl.append(deadlines);
      }
    }
    for(const segment of layout.segments){
      const band=document.createElement('div');
      band.className=`week-band ${colorFor(segment.item)}`;
      band.dataset.orderId=segment.item.id;
      band.style.gridColumn=`${segment.start+1} / ${segment.end+2}`;
      band.style.gridRow=String(segment.lane+2);
      band.title=`${segment.item.title} · 预计 ${dateLabel(segment.item.planStart)}—${dateLabel(segment.item.planEnd)}`;
      const body=document.createElement('button');body.type='button';body.className='event-body';body.textContent=segment.item.title;body.setAttribute('aria-label',band.title);
      body.addEventListener('click',()=>{if(Date.now()<suppressBandClickUntil)return;openPreview(segment.item.id);});band.append(body);
      for(const edge of ['start','end']){
        const atEdge=CalendarCore.shift(ymd(weekStart),edge==='start'?segment.start:segment.end)===segment.item[edge==='start'?'planStart':'planEnd'];
        if(!atEdge)continue;
        const handle=document.createElement('button');handle.type='button';handle.className=`event-handle ${edge}`;
        handle.setAttribute('aria-label',`${edge==='start'?'调整开工日':'调整完成日'}：${segment.item.title}`);handle.title=`拖动${edge==='start'?'开工日':'完成日'}，方向键可逐日调整`;
        handle.addEventListener('pointerdown',event=>startPlanDrag(event,segment.item,edge));
        handle.addEventListener('click',event=>event.stopPropagation());
        handle.addEventListener('keydown',event=>{
          if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();
          const initial={start:segment.item.planStart,end:segment.item.planEnd},range=CalendarCore.resize(initial,edge,event.key==='ArrowLeft'?-1:1);
          segment.item.planStart=range.start;segment.item.planEnd=range.end;
          if(!persist()){segment.item.planStart=initial.start;segment.item.planEnd=initial.end;return;}
          renderCalendar();const newHandle=[...document.querySelectorAll('.event-handle')].find(el=>el.getAttribute('aria-label')===handle.getAttribute('aria-label'));newHandle?.focus();showToast(warning(segment.item)?'工期已更新；预计完成日晚于截稿日，请确认。':'预计工期已更新');
        });
        if(edge==='start')band.prepend(handle);else band.append(handle);
      }
      weekEl.append(band);
    }
    grid.append(weekEl);
  }
  const key=monthKey(calendarMonth),monthOrders=data.orders.filter(o=>o.deadline?.startsWith(key));
  $('#monthSummary').textContent=`本月 ${monthOrders.length} 个截稿日`;
  $('#monthSummaryText').textContent=monthOrders.length?` · ${monthOrders.filter(o=>o.status!=='已完成').length} 个尚未完成`:' · 暂无截稿安排';
}
function openDrawer(html){EditorControls.closePicker();$('#drawerContent').innerHTML=html;$('#drawerScrim').classList.remove('hidden');$('#previewDrawer').classList.remove('hidden');document.body.style.overflow='hidden';}
function closeDrawer(){ EditorControls.closePicker();$('#drawerScrim').classList.add('hidden');$('#previewDrawer').classList.add('hidden');document.body.style.overflow=''; }
function openDay(date){
  selectedDate=date;renderCalendar();
  const orders=data.orders.filter(o=>o.deadline===date||(o.planStart&&o.planEnd&&date>=o.planStart&&date<=o.planEnd));
  const html=`<div class="drawer-content"><div class="drawer-kicker">${date.slice(0,4)}年</div><h2 class="drawer-date-heading">${dateLabel(date)}的安排</h2>${orders.length?orders.map(o=>`<button class="date-order-row" data-preview="${escapeHtml(o.id)}"><strong>${escapeHtml(o.title)}</strong><span>${o.deadline===date?'● 今日截稿　':''}${o.planStart&&date>=o.planStart&&date<=o.planEnd?'预计工期内　':''}${escapeHtml(statusLabel(o.status))}</span></button>`).join(''):'<p class="drawer-empty">这一天还没有安排稿件。</p>'}<div class="drawer-day-actions"><button data-new-date="${date}">＋ 在这一天安排稿件</button></div></div>`;
  openDrawer(html);
}
function updatePreview(id,field,value){
  const item=findOrder(id);if(!item)return;
  if(!['status','paid','type','amount','planRange','deadline'].includes(field))return;
  if(field==='status'&&!['未开始','进行中','已完成'].includes(value))return;
  if(field==='paid'&&!['paid','free'].includes(value))return;
  const updated=field==='planRange'?{...item,planStart:value.start,planEnd:value.end}:{...item,[field]:field==='amount'?Number(value):value};
  if(field==='planRange'&&updated.planStart&&updated.planEnd&&updated.planEnd<updated.planStart){showToast('预计完成日不能早于预计开工日。');return;}
  if(field==='amount'&&(!Number.isFinite(updated.amount)||updated.amount<0)){showToast('请填写有效的非负金额。');openPreview(id);return;}
  if(updated.paid==='free')updated.amount=0;
  if(updated.status==='已完成'&&!updated.actualEnd)updated.actualEnd=updated.deadline||'';
  if(updated.actualStart&&updated.actualEnd&&updated.actualEnd<updated.actualStart){showToast('实际完成日早于实际开工日，请在详情中调整日期。');openPreview(id);return;}
  const previous=data;data={...data,orders:data.orders.map(o=>o.id===id?updated:o),typeTags:[...new Set([...(data.typeTags||[]),...typeLabels(updated.type)])]};
  if(!persist()){data=previous;openPreview(id);return;}
  renderCounts();
  if(view==='orders')renderOrders();else if(view==='stats')renderStats();else if(view==='detail')renderDetail();else renderCalendar();
  openPreview(id);$(`[data-quick-field="${field}"]`)?.focus();showToast('已保存');
}
function closePreviewPicker(){
  $('#previewPropertyPicker')?.remove();
  $$('#drawerContent [data-picker-field]').forEach(button=>button.setAttribute('aria-expanded','false'));
}
function openPreviewPicker(id,field,trigger){
  const alreadyOpen=$('#previewPropertyPicker')?.dataset.field===field;
  closePreviewPicker();EditorControls.closePicker();if(alreadyOpen)return;
  const item=findOrder(id);if(!item)return;
  const picker=document.createElement('div');picker.id='previewPropertyPicker';picker.className='property-picker';picker.dataset.field=field;
  picker.setAttribute('role','dialog');picker.setAttribute('aria-label',({status:'选择进度',paid:'选择付费类型',type:'选择稿件类型'})[field]);
  const options=field==='status'?[['未开始','未开始'],['进行中','进行中'],['已完成','已完成']]:field==='paid'?[['paid','有偿'],['free','无偿']]:[...new Set([...(data.typeTags||[]),...data.orders.map(o=>o.type)].flatMap(typeLabels))].map(type=>[type,type]);
  for(const [value,label] of options){
    const selected=field==='type'?typeLabels(item.type).includes(value):item[field]===value;
    const button=document.createElement('button');button.type='button';button.className='property-choice';button.setAttribute('aria-pressed',String(selected));
    const text=document.createElement('span');text.className='quick-tag'+(field==='status'?' quick-status '+value:'');text.textContent=label;button.append(text);
    const check=document.createElement('span');check.textContent=selected?'✓':'';check.setAttribute('aria-hidden','true');button.append(check);
    button.addEventListener('click',()=>{
      const types=typeLabels(findOrder(id)?.type);
      updatePreview(id,field,field==='type'?(types.includes(value)?types.filter(t=>t!==value):[...types,value]).join(' · '):value);
      if(field==='type')openPreviewPicker(id,field,$('#drawerContent [data-picker-field="type"]'));
      else $('#drawerContent [data-picker-field="'+field+'"]').focus();
    });picker.append(button);
  }
  if(field==='type'){
    const row=document.createElement('form');row.className='property-create';row.innerHTML='<input aria-label="添加稿件类型" maxlength="30" placeholder="新标签"><button type="submit">添加</button>';
    row.addEventListener('submit',event=>{event.preventDefault();const value=row.querySelector('input').value.trim();if(!value)return;updatePreview(id,'type',[...new Set([...typeLabels(findOrder(id)?.type),value])].join(' · '));openPreviewPicker(id,'type',$('#drawerContent [data-picker-field="type"]'));});picker.append(row);
  }
  trigger.closest('dd').append(picker);trigger.setAttribute('aria-expanded','true');picker.querySelector('button')?.focus();
}
function openPreview(id){
  const item=findOrder(id);if(!item)return;selectedId=id;
  const sticker=(field,label,extra='')=>`<button type="button" class="quick-tag ${extra}" data-picker-field="${field}" aria-haspopup="dialog" aria-expanded="false" aria-label="${({status:'稿件进度',paid:'付费类型',type:'稿件类型'})[field]}">${escapeHtml(label)}</button>`;
  const html=`<div class="drawer-content"><div class="drawer-topline"><span class="drawer-kicker">${escapeHtml(item.source||'未填写来源')}</span></div><h2 class="drawer-title">${escapeHtml(item.title)}</h2><dl class="drawer-facts"><div><dt>进度</dt><dd>${sticker('status',statusLabel(item.status),'quick-status '+item.status)}</dd></div><div><dt>付费类型</dt><dd class="quick-payment">${sticker('paid',item.paid==='free'?'无偿':'有偿')}${item.paid==='paid'?`<label class="quick-amount">¥ <input aria-label="稿件金额" data-quick-field="amount" type="number" min="0" step="0.01" value="${escapeHtml(item.amount??0)}"></label>`:'<span class="quick-zero">¥0</span>'}</dd></div><div><dt>稿件类型</dt><dd><div class="quick-stickers">${typeLabels(item.type).map(type=>sticker('type',type)).join('')}${sticker('type','＋','quick-add')}</div></dd></div><div><dt>预计工期</dt><dd><button type="button" class="preview-date" data-preview-date="planRange" aria-label="修改预计工期">${item.planStart||item.planEnd?`${dateLabel(item.planStart)} — ${dateLabel(item.planEnd)}`:'选择预计工期'}</button></dd></div><div><dt>截稿日期</dt><dd><button type="button" class="preview-date" data-preview-date="deadline" aria-label="修改截稿日期">${item.deadline?longDate(item.deadline):'选择截稿日期'}</button></dd></div></dl>${warning(item)?'<div class="detail-warning">预计完成日晚于截稿日，请确认排期。</div>':''}<div class="drawer-section"><h3>甲方要求</h3><p class="${item.requirements?'':'empty-note'}">${escapeHtml(item.requirements||'暂无要求记录')}</p></div><div class="drawer-section"><h3>最近修改意见</h3><p class="${item.revisions?'':'empty-note'}">${escapeHtml(item.revisions?.split('\n').filter(Boolean).at(-1)||'暂无修改记录')}</p></div><button class="detail-link" id="drawerDetailBtn">查看详细信息 <span>→</span></button></div>`;
  openDrawer(html);
  $$('#drawerContent [data-preview-date]').forEach(button=>button.addEventListener('click',()=>{
    closePreviewPicker();const field=button.dataset.previewDate;
    EditorControls.pickDates(button,field==='planRange'?{start:item.planStart,end:item.planEnd}:{start:item.deadline},values=>updatePreview(id,field,field==='planRange'?values:values.start));
  }));
  $$('#drawerContent [data-picker-field]').forEach(button=>button.addEventListener('click',()=>openPreviewPicker(id,button.dataset.pickerField,button)));
  $$('#drawerContent [data-quick-field]').forEach(control=>control.addEventListener('change',()=>updatePreview(id,control.dataset.quickField,control.value)));
  $('#drawerDetailBtn').addEventListener('click',()=>{closeDrawer();setView('detail');});
  const deleteButton=document.createElement('button');deleteButton.className='order-delete';deleteButton.textContent='删除稿件';deleteButton.type='button';
  deleteButton.addEventListener('click',()=>deleteOrder(item.id));
  $('#drawerDetailBtn').before(deleteButton);
}
function openUpcoming(){
  const start=ymd(new Date()),end=CalendarCore.shift(start,6),orders=CalendarCore.upcoming(data.orders,start);
  openDrawer(`<div class="drawer-content"><div class="drawer-kicker">${dateLabel(start)} — ${dateLabel(end)} · 含今天</div><h2 class="drawer-date-heading">未来 7 天截稿</h2><p class="drawer-empty">${orders.length} 个未完成稿件，按截稿日排列</p>${orders.length?orders.map(o=>`<button class="date-order-row" data-preview="${escapeHtml(o.id)}"><strong>${escapeHtml(o.title)}</strong><span>${dateLabel(o.deadline)}${o.deadline===start?' · 今天截稿':''}　${escapeHtml(o.source)}　${escapeHtml(statusLabel(o.status))}</span></button>`).join(''):'<p class="drawer-empty">未来 7 天没有待交稿件。</p>'}</div>`);
}
function renderOrders(){
  renderCounts();const list=$('#ordersList');
  const orders=data.orders.filter(o=>orderFilter==='all'||o.status===orderFilter).sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'));
  $('#orderCountLabel').textContent=`${orders.length} 个稿件`;
  list.innerHTML=orders.length?orders.map(o=>`<button class="order-list-row" data-preview="${escapeHtml(o.id)}"><span class="order-title">${escapeHtml(o.title)}<span class="order-sub">${escapeHtml(o.source)} · ${escapeHtml(o.type||'未分类')}</span></span><span class="order-cell order-type">${o.paid==='free'?'无偿':`¥${money(o.amount)}`}</span><span class="order-cell">${o.deadline?dateLabel(o.deadline)+' 截稿':'未定截稿'}</span><span class="order-cell"><span class="status-pill ${escapeHtml(o.status)}">${escapeHtml(statusLabel(o.status))}</span></span><span class="order-chevron">›</span></button>`).join(''):'<div class="empty-list"><strong>还没有稿件</strong>点击「新建稿件」，把第一份排期放进日历。</div>';
}
function renderStats(){
  renderCounts();const key=monthKey(statsMonth);$('#statsMonthTitle').textContent=`${statsMonth.getFullYear()}年${statsMonth.getMonth()+1}月`;
  const receipts=data.orders.filter(o=>o.paid==='paid'&&o.status==='已完成'&&o.actualEnd?.startsWith(key));
  $('#incomeValue').textContent=money(receipts.reduce((sum,o)=>sum+Number(o.amount||0),0));
  const missingDates=data.orders.filter(o=>o.paid==='paid'&&o.status==='已完成'&&!o.actualEnd).length;
  $('#incomeCaption').textContent=(receipts.length?`${receipts.length} 笔本月完成的有偿稿件`:'暂无在本月完成的有偿稿件')+(missingDates?`；另有 ${missingDates} 笔已完成的有偿稿件未填完成日期，暂未计入`: '');
  const due=data.orders.filter(o=>o.deadline?.startsWith(key));
  $('#dueValue').textContent=due.length;$('#completedValue').textContent=data.orders.filter(o=>o.actualEnd?.startsWith(key)).length;$('#inProgressValue').textContent=data.orders.filter(o=>o.status==='进行中').length;
  const chart=(items,field)=>{
    const amountMode=chartMetrics[field]==='amount';
    const valueFor=order=>amountMode?(order.paid==='paid'?Number(order.amount)||0:0):1;
    const total=items.reduce((sum,order)=>sum+valueFor(order),0),values={};
    items.forEach(order=>{const labels=field==='type'?typeLabels(order.type):[order.source];for(const label of labels.length?labels:['未分类']){const key=label||'未分类';values[key]=(values[key]||0)+valueFor(order);}});
    const entries=Object.entries(values).sort((a,b)=>b[1]-a[1]);
    return entries.length?entries.map(([label,value])=>`<div class="chart-row${amountMode?' chart-amount-row':''}"><span>${escapeHtml(label)}</span><div class="chart-track"><div class="chart-fill" style="width:${total?Math.round(value/total*100):0}%"></div></div><strong>${amountMode?'¥'+money(value):value}</strong></div>`).join(''):'<div class="chart-empty">本月没有截稿稿件</div>';
  };
  $('#sourceChart').innerHTML=chart(due,'source');$('#typeChart').innerHTML=chart(due,'type');
  $('#sourceChartCaption').textContent=chartMetrics.source==='amount'?'本月截稿稿件的报价汇总，无偿计 ¥0':'这个月截稿的稿件来自哪里';
  $('#typeChartCaption').textContent=chartMetrics.type==='amount'?'本月截稿稿件报价；多标签分别计入，金额不宜相加':'这个月主要在画什么';
  $$('[data-chart][data-metric]').forEach(button=>{const selected=chartMetrics[button.dataset.chart]===button.dataset.metric;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  const actual=data.orders.filter(o=>o.status==='已完成'&&o.actualEnd?.startsWith(key)).sort((a,b)=>a.actualEnd.localeCompare(b.actualEnd));
  const recorded=actual.filter(order=>recordedHours(order)!==null),missing=actual.length-recorded.length;
  $('#workHoursTotal').textContent=`累计 ${money(recorded.reduce((sum,order)=>sum+recordedHours(order),0))} 小时`;
  $('#workHoursCaption').textContent='手动填写绘画耗时，按实际完成月份汇总。'+(missing?`还有 ${missing} 个稿件未记录，暂未计入。`:'');
  $('#actualList').innerHTML=actual.length?actual.map(order=>`<div class="actual-row"><strong>${escapeHtml(order.title)}</strong><label class="hours-input"><input type="number" min="0" step="0.01" data-hours-id="${escapeHtml(order.id)}" aria-label="${escapeHtml(order.title)}的绘画耗时" value="${recordedHours(order)??''}" placeholder="未记录"><span>小时</span></label></div>`).join(''):'<div class="chart-empty">本月还没有已完成的稿件。完成后可在这里填写绘画耗时。</div>';
  $$('#actualList [data-hours-id]').forEach(input=>input.addEventListener('change',()=>{
    const hours=input.value===''?'':Number(input.value);
    if(hours!==''&&(!Number.isFinite(hours)||hours<0)){showToast('请填写有效的非负小时数。');renderStats();return;}
    const previous=data;data={...data,orders:data.orders.map(order=>order.id===input.dataset.hoursId?{...order,workHours:hours}:order)};
    if(!persist()){data=previous;renderStats();return;}renderStats();showToast('绘画耗时已保存');
  }));
}
function referenceHtml(value){
  if(!value?.trim())return '<p class="empty-note">还没有参考资料记录。</p>';
  return value.split('\n').filter(Boolean).map(line=>{const trimmed=line.trim();if(/^https?:\/\//i.test(trimmed)){const safe=escapeHtml(trimmed);return `<a class="detail-ref-link" href="${safe}" target="_blank" rel="noopener noreferrer">↗ ${safe}</a>`;}return `<p>${escapeHtml(trimmed)}</p>`;}).join('');
}
function restoreFormHome(){
  const form=$('#orderForm');
  if(form.classList.contains('inline-order-form')){
    form.classList.remove('inline-order-form');$('#orderModal .modal-card').append(form);
  }
}
function renderDetail(edit=false){
  const o=findOrder(selectedId);if(!o){setView(previousView);return;}
  EditorControls.closePicker();restoreFormHome();editingId=null;
  const property=(label,value)=>`<div class="detail-property"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
  const section=(label,value)=>value?.trim()?`<section class="detail-content-section"><h3>${label}</h3><p>${escapeHtml(value)}</p></section>`:'';
  const dates=[property('截稿日期',o.deadline?longDate(o.deadline):'未定')];
  if(o.planStart||o.planEnd)dates.push(property('预计工期',`${dateLabel(o.planStart)} — ${dateLabel(o.planEnd)}`));
  if(o.actualStart)dates.push(property('实际开工日',longDate(o.actualStart)));
  if(o.actualEnd)dates.push(property('实际完成日',longDate(o.actualEnd)));
  if(recordedHours(o)!==null)dates.push(property('绘画耗时',`${money(recordedHours(o))} 小时`));
  if(o.availability)dates.push(property('甲方在线时间',o.availability));
  $('#detailContent').innerHTML=`<div class="detail-heading"><div><div class="eyebrow">${escapeHtml(o.source||'')}</div><h1>${escapeHtml(o.title)}</h1><div class="detail-meta"><span class="status-pill ${escapeHtml(o.status)}">${escapeHtml(statusLabel(o.status))}</span><span class="detail-tag">${o.paid==='free'?'无偿':`有偿 · ¥${money(o.amount)}`}</span>${typeLabels(o.type).map(type=>`<span class="detail-tag">${escapeHtml(type)}</span>`).join('')}</div></div><div class="detail-actions"><button type="button" class="order-delete" id="detailDeleteOrder">删除稿件</button><button type="button" class="detail-edit" id="detailEditOrder">编辑</button></div></div><div id="detailEditorHost"></div>`;
  $('#detailDeleteOrder').addEventListener('click',()=>deleteOrder(o.id));
  $('#detailEditOrder').addEventListener('click',()=>renderDetail(true));
  if(edit){$('#detailEditOrder').classList.add('hidden');openForm(o.id,'',true);return;}
  $('#detailEditorHost').innerHTML=`${warning(o)?'<div class="detail-warning">预计完成日晚于截稿日，请确认排期。</div>':''}<div class="detail-layout"><div class="detail-property-list">${dates.join('')}</div><div>${section('设定文字与甲方要求',o.requirements)}${o.attachments?.length?'<section class="detail-content-section"><h3>参考图片与附件</h3><div class="attachment-list" id="detailAttachments"></div></section>':''}${section('修改记录',o.revisions)}${o.references?.trim()?`<details class="legacy-references"><summary>参考说明</summary>${referenceHtml(o.references)}</details>`:''}</div></div>`;
  if(o.attachments?.length)Attachments.render($('#detailAttachments'),o.attachments);
}
function openForm(id=null,presetDate='',inline=false){
  restoreFormHome();
  editingId=id;const o=id?findOrder(id):null;
  $('#modalTitle').textContent=o?'编辑稿件':'新建稿件';$('#deleteOrderBtn').classList.toggle('hidden',!o);
  const form=$('#orderForm');form.reset();
  const fields=['title','source','type','status','paid','amount','workHours','planStart','planEnd','deadline','actualStart','actualEnd','availability','requirements','references','revisions'];
  if(o)fields.forEach(name=>{form.elements[name].value=o[name]??'';});
  else if(presetDate)form.elements.planStart.value=presetDate;
  EditorControls.configure(o||{},data.typeTags||['半身','头像','立绘'],data.sourceTags||[]);
  Attachments.setDraft(o?.attachments||[]);
  updateDateWarning();
  if(inline){
    $('#orderModal').classList.add('hidden');form.classList.add('inline-order-form');
    $('#detailEditorHost').append(form);document.body.style.overflow='';
  }else{
    $('#orderModal').classList.remove('hidden');document.body.style.overflow='hidden';setTimeout(()=>form.elements.title.focus(),30);
  }
}
function closeForm(){restoreFormHome();EditorControls.closePicker();$('#orderModal').classList.add('hidden');document.body.style.overflow='';editingId=null;}
function updateDateWarning(){const f=$('#orderForm').elements;$('#dateWarning').classList.toggle('hidden',!(f.planEnd.value&&f.deadline.value&&f.planEnd.value>f.deadline.value));}
async function saveForm(event){
  event.preventDefault();const form=event.currentTarget,values=Object.fromEntries(new FormData(form).entries());
  if(values.status==='已完成'&&!values.actualEnd)values.actualEnd=values.deadline||'';
  values.title=values.title.trim();if(!values.title){showToast('请填写稿件名称。');return;}
  values.source=EditorControls.getSource();delete values.customSource;if(!values.source){showToast('请填写自定义来源。');return;}
  if(values.planStart&&values.planEnd&&values.planEnd<values.planStart){showToast('预计完成日不能早于预计开工日。');return;}
  if(values.actualStart&&values.actualEnd&&values.actualEnd<values.actualStart){showToast('实际完成日不能早于实际开工日。');return;}
  values.amount=values.paid==='free'?0:Number(values.amount||0);
  values.workHours=values.workHours===''?'':Number(values.workHours);
  if(values.workHours!==''&&(!Number.isFinite(values.workHours)||values.workHours<0)){showToast('请填写有效的非负小时数。');return;}
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='正在保存…';const saveId=editingId;
  try{
    values.attachments=await Attachments.saveDraft();
    const previous=data;data={...data,orders:[...data.orders],typeTags:[...EditorControls.getTags()],sourceTags:[...EditorControls.getSources()]};
    if(saveId){const index=data.orders.findIndex(o=>o.id===saveId);if(index>=0)data.orders[index]={...data.orders[index],...values};}
    else{values.id=`order-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;data.orders.push(values);selectedId=values.id;}
    if(!persist()){data=previous;return;}
    closeForm();renderCounts();if(view==='detail')renderDetail();else if(view==='orders')renderOrders();else if(view==='stats')renderStats();else renderCalendar();showToast('稿件已保存');
  }catch(error){showToast('附件未能保存，请检查浏览器存储空间后重试。');}
  finally{submit.disabled=false;submit.textContent='保存稿件';}
}
function clearDemo(){
  data={orders:[],demo:false,typeTags:data.typeTags,sourceTags:data.sourceTags};persist();closeDrawer();setView('calendar');showToast('示例稿件已清空，可以开始录单了');
}
async function exportBackup(){
  let files;try{files=await Attachments.exportFiles(data.orders);}catch(error){showToast(error.message||'附件备份失败，请重试。');return;}
  const blob=new Blob([JSON.stringify({version:2,orders:data.orders,typeTags:data.typeTags,sourceTags:data.sourceTags,files},null,2)],{type:'application/json'});
  const link=document.createElement('a'),url=URL.createObjectURL(blob);
  link.href=url;link.download=`画稿日历备份-${ymd(new Date())}.json`;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast('备份文件已导出');
}
async function importBackup(file){
  if(!file)return;
  if(file.size>100*1024*1024){showToast('备份文件过大，请选择小于 100 MB 的 JSON 文件。');return;}
  try{
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed.orders)||parsed.orders.length>1000)throw new Error('格式不正确');
    const fields=['title','source','type','status','paid','paymentDate','planStart','planEnd','deadline','actualStart','actualEnd','availability','requirements','references','revisions'];
    const orders=parsed.orders.map((raw,index)=>{
      if(!raw||typeof raw!=='object'||typeof raw.title!=='string')throw new Error('格式不正确');
      const item={id:`import-${Date.now()}-${index}`,amount:Number(raw.amount)||0,workHours:recordedHours(raw)??''};
      fields.forEach(key=>item[key]=typeof raw[key]==='string'?raw[key].slice(0,10000):'');
      if(!['未开始','进行中','已完成'].includes(item.status))item.status='未开始';
      if(!['paid','free'].includes(item.paid))item.paid='free';
      for(const key of ['paymentDate','planStart','planEnd','deadline','actualStart','actualEnd'])if(item[key]&&!/^\d{4}-\d{2}-\d{2}$/.test(item[key]))item[key]='';
      if(item.status==='已完成'&&!item.actualEnd)item.actualEnd=item.deadline||'';
      item.attachments=Array.isArray(raw.attachments)?raw.attachments.map(a=>({id:String(a.id),name:String(a.name||'附件').slice(0,250),type:String(a.type||''),size:Number(a.size)||0})):[];
      return item;
    });
    if(!confirm(`导入将替换本机现有的 ${data.orders.length} 个稿件。确定导入 ${orders.length} 个稿件吗？`))return;
    await Attachments.restoreFiles(orders,parsed.files||[]);
    const previous=data;data={orders,demo:false,sourceTags:[...new Set(['画加','QQ',...(Array.isArray(parsed.sourceTags)?parsed.sourceTags.filter(x=>typeof x==='string'):[]),...orders.map(o=>o.source)].filter(Boolean))],typeTags:[...new Set([...(Array.isArray(parsed.typeTags)?parsed.typeTags.filter(x=>typeof x==='string'):[]),...orders.map(o=>o.type).filter(Boolean)])]};if(!persist()){data=previous;return;}setView('orders');showToast(`已导入 ${orders.length} 个稿件`);
  }catch(error){showToast('无法导入：请选择画稿日历导出的 JSON 备份。');}
  finally{$('#importFile').value='';}
}
function bind(){
  $$('[data-chart][data-metric]').forEach(button=>button.addEventListener('click',()=>{chartMetrics[button.dataset.chart]=button.dataset.metric;renderStats();}));
  $$('.nav-item,.mobile-tabbar button[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
  $$('[data-action="new"]').forEach(el=>el.addEventListener('click',()=>openForm()));
  $('#prevMonth').addEventListener('click',()=>{calendarMonth=addMonths(calendarMonth,-1);renderCalendar();});
  $('#nextMonth').addEventListener('click',()=>{calendarMonth=addMonths(calendarMonth,1);renderCalendar();});
  $('#todayBtn').addEventListener('click',()=>{const now=new Date();calendarMonth=new Date(now.getFullYear(),now.getMonth(),1);openDay(ymd(now));$('.calendar-day.selected')?.scrollIntoView({block:'nearest',behavior:'smooth'});});
  $('#statsPrev').addEventListener('click',()=>{statsMonth=addMonths(statsMonth,-1);renderStats();});
  $('#statsNext').addEventListener('click',()=>{statsMonth=addMonths(statsMonth,1);renderStats();});
  $('#closeDrawer').addEventListener('click',closeDrawer);$('#drawerScrim').addEventListener('click',closeDrawer);
  $('#closeModal').addEventListener('click',closeForm);$('#cancelModal').addEventListener('click',()=>{closeForm();if(view==='detail')renderDetail();});
  $('#orderForm').addEventListener('submit',saveForm);
  $('#orderForm').elements.status.addEventListener('change',()=>{
    const fields=$('#orderForm').elements;
    if(fields.status.value==='已完成'&&!fields.actualEnd.value){
      fields.actualEnd.value=fields.deadline.value;EditorControls.syncDates();
    }
  });
  ['planEnd','deadline'].forEach(name=>$('#orderForm').elements[name].addEventListener('change',updateDateWarning));
  $('#clearDemoBtn').addEventListener('click',clearDemo);
  $('#exportBtn').addEventListener('click',exportBackup);
  $('#importBtn').addEventListener('click',()=>$('#importFile').click());
  $('#importFile').addEventListener('change',event=>importBackup(event.target.files?.[0]));
  $('#backFromDetail').addEventListener('click',()=>setView(previousView));
  $('#deleteOrderBtn').addEventListener('click',()=>deleteOrder(editingId));
  $('#helpBtn').addEventListener('click',()=>showToast('点击日历日期查看安排；点击色带预览稿件；新建稿件可以随时补充信息。'));
  $$('.list-toolbar .segmented button').forEach(el=>el.addEventListener('click',()=>{orderFilter=el.dataset.statusFilter;$$('.list-toolbar .segmented button').forEach(b=>b.classList.toggle('selected',b===el));renderOrders();}));
  $$('.side-filter').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.filter==='unfinished'){orderFilter='进行中';setView('orders');$$('.list-toolbar .segmented button').forEach(b=>b.classList.toggle('selected',b.dataset.statusFilter===orderFilter));}else{setView('calendar');openUpcoming();}}));
  document.addEventListener('click',event=>{const preview=event.target.closest('[data-preview]');if(preview)openPreview(preview.dataset.preview);const newDate=event.target.closest('[data-new-date]');if(newDate){const date=newDate.dataset.newDate;closeDrawer();openForm(null,date);}});
  document.addEventListener('pointerdown',event=>{if($('#previewPropertyPicker')&&!event.target.closest('#previewPropertyPicker,[data-picker-field]'))closePreviewPicker();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){if($('#previewPropertyPicker')){closePreviewPicker();return;}if(document.querySelector('.image-preview[open]'))return;if(EditorControls.pickerOpen())EditorControls.closePicker();else if(!$('#orderModal').classList.contains('hidden'))closeForm();else if(!$('#previewDrawer').classList.contains('hidden'))closeDrawer();}});
}
EditorControls.init($('#orderForm'));Attachments.init($('#orderForm'),showToast);bind();setView('calendar');
