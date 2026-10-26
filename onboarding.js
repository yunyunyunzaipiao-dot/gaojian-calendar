/* Illustrated onboarding is independent of commission data. */
globalThis.Onboarding = (() => {
  const KEY='gaojian-onboarding-v1';
  let dialog,step=-1,returnFocus,navigate;
  const steps=[
    {title:'先把稿件记下来',text:'点击“新建稿件”，填写名称、预计工期和截稿日。其他资料可以之后再补。',art:'<div class="tour-example-label">示例 · 不会创建真实稿件</div><div class="tour-example-title">春日头像</div><div class="tour-sample-row">预计工期 <strong>10月5日 → 10月8日</strong></div><div class="tour-sample-row">截稿日期 <strong>10月10日</strong></div><span class="tour-sample-action">＋ 新建稿件</span>'},
    {title:'色带是计划，标记是截稿日',text:'点击日期看当天安排。拖动色带左端调整开工日，右端调整完成日，截稿日期独立保存。',art:'<div class="tour-example-label">示例月历</div><div class="tour-mini-week"><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><div class="tour-mini-band">┃ 春日头像 ┃</div><div class="tour-mini-deadline">● 截稿</div></div>'},
    {title:'点开稿件，随手更新',text:'点击月历色带或稿件列表，就能打开预览。进度、付费类型、标签和日期都可直接修改，即时保存；详细资料点“查看详细信息”。',art:'<div class="tour-example-label">稿件预览示意</div><div class="tour-example-title">春日头像</div><div class="tour-sample-row">进度 <span class="tour-sample-pill">● 进行中</span></div><div class="tour-sample-row">付费类型 <span class="tour-sample-tag">有偿</span></div><div class="tour-sample-row">稿件类型 <span class="tour-sample-tag">头像</span></div>'},
    {title:'最后，记得备份',text:'稿件只保存在当前浏览器，换浏览器或设备不会自动同步，清除网站数据可能丢失记录。在“所有稿件”列表下方导出备份；导入会替换现有稿件。',art:'<div class="tour-example-label">所有稿件 → 本机数据</div><div class="tour-backup-sample"><span class="tour-sample-action">导出备份 ↓</span><span class="tour-sample-tag">导入备份 ↑</span></div><p class="tour-example-note">重要稿件录入后，记得留一份备份。</p>'}
  ];
  function finish(){
    try{localStorage.setItem(KEY,'seen');}catch{}
    dialog.close();returnFocus?.focus();
  }
  function draw(){
    if(step<0){
      dialog.innerHTML='<div class="tour-kicker">欢迎使用稿件日历</div><h2 id="tourTitle">把接稿安排得清楚一点</h2><p class="tour-description">用一分钟认识录单、排期、进度和备份。教程只作展示，不会修改你的稿件。</p><div class="tour-footer"><button type="button" class="secondary-button" data-tour="skip">先自己看看</button><button type="button" class="primary-button" data-tour="next">一分钟上手</button></div>';
    }else{
      const current=steps[step];
      dialog.innerHTML=`<div class="tour-top"><span class="tour-kicker">一分钟上手 · ${step+1} / 4</span><button type="button" class="tour-skip" data-tour="skip">跳过</button></div><h2 id="tourTitle">${current.title}</h2><div class="tour-illustration" aria-label="虚构教程示意">${current.art}</div><p class="tour-description">${current.text}</p>${step===3?'<button type="button" class="tour-backup-link" data-tour="backup">去看看备份入口 →</button>':''}<div class="tour-footer"><button type="button" class="secondary-button" data-tour="back" ${step===0?'disabled':''}>上一步</button><button type="button" class="primary-button" data-tour="next">${step===3?'开始排单':'下一步'}</button></div>`;
    }
    dialog.querySelectorAll('[data-tour]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.tour;
      if(action==='skip'){finish();return;}
      if(action==='backup'){finish();navigate('orders');document.querySelector('#exportBtn').scrollIntoView({block:'center',behavior:'smooth'});document.querySelector('#exportBtn').focus({preventScroll:true});return;}
      if(action==='next'&&step===3){finish();return;}
      step+=action==='back'?-1:1;draw();dialog.querySelector('[data-tour="next"]').focus();
    }));
  }
  function open(welcome=false){
    if(dialog.open)return;returnFocus=document.activeElement;step=welcome?-1:0;draw();dialog.showModal();dialog.querySelector('[data-tour="next"]').focus();
  }
  function init(options){
    navigate=options.navigate;dialog=document.createElement('dialog');dialog.className='onboarding-dialog';dialog.id='onboardingDialog';dialog.setAttribute('aria-labelledby','tourTitle');document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish();}});
    document.querySelector('#helpBtn').addEventListener('click',()=>open());
    let seen=false;try{seen=localStorage.getItem(KEY)==='seen';}catch{}
    if(!seen)open(true);
  }
  return {init,open};
})();
