/* File bytes live in IndexedDB; orders contain only attachment metadata. */
globalThis.Attachments = (() => {
  let dbPromise,draft=[],pending=new Map(),urls=[],host,onMessage=()=>{};
  const isImage=file=>/^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(file.type);
  const uid=()=>crypto.randomUUID?.()||`file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function db(){
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('huagao-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{dbPromise=null;reject(r.error);};});return dbPromise;
  }
  async function get(id){const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction('files').objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function putAll(files){if(!files.length)return;const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('files','readwrite');files.forEach(file=>tx.objectStore('files').put(file));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  function objectUrl(blob){const url=URL.createObjectURL(blob);urls.push(url);return url;}
  function resetUrls(){urls.forEach(url=>URL.revokeObjectURL(url));urls=[];}
  function init(form,message){
    onMessage=message;const old=form.elements.references,oldField=old.closest('label');old.type='hidden';
    const section=document.createElement('section');section.className='form-field full attachment-field';
    section.innerHTML='<span>参考图片与附件</span><div class="attachment-drop" id="attachmentDrop" tabindex="0" role="group" aria-label="参考资料，可在此粘贴图片"><strong>在这里粘贴图片</strong><span>也可以拖入图片或文件</span><button type="button" id="chooseFiles">选择图片或附件</button><input type="file" multiple id="attachmentFiles" hidden><small>单个文件最多 20 MB · 保存在当前浏览器</small></div><div id="attachmentDraft" class="attachment-list"></div>';
    oldField.replaceWith(section);old.classList.add('hidden');old.name='references';section.append(old);host=section.querySelector('#attachmentDraft');
    const input=section.querySelector('#attachmentFiles'),drop=section.querySelector('#attachmentDrop');
    section.querySelector('#chooseFiles').addEventListener('click',()=>input.click());input.addEventListener('change',()=>{addFiles(input.files);input.value='';});
    drop.addEventListener('paste',e=>{const files=[...e.clipboardData.items].filter(x=>x.kind==='file').map(x=>x.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();addFiles(files);}else onMessage('剪贴板里没有图片，请复制图片后再粘贴。');});
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over');});drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');addFiles(e.dataTransfer.files);});
  }
  function setDraft(files=[]){resetUrls();draft=files.map(x=>({...x}));pending=new Map();render(host,draft,true);}
  function addFiles(files){
    for(const file of files){if(file.size>20*1024*1024){onMessage(`${file.name} 超过 20 MB，请压缩后添加。`);continue;}
      const meta={id:uid(),name:file.name||`粘贴图片-${Date.now()}.png`,type:file.type,size:file.size};draft.push(meta);pending.set(meta.id,{...meta,blob:file});
    }render(host,draft,true);
  }
  async function render(container,files,editable=false){
    if(!container)return;container.replaceChildren();const token=Symbol();container.renderToken=token;
    if(!files.length){const empty=document.createElement('p');empty.className='empty-note';empty.textContent='暂无图片或附件';container.append(empty);return;}
    for(const meta of files){
      const card=document.createElement('div');card.className='attachment-card';
      const caption=document.createElement('div');caption.className='attachment-caption';const name=document.createElement('span');name.textContent=meta.name;name.title=meta.name;caption.append(name);
      const download=document.createElement('button');download.type='button';download.textContent='下载';download.setAttribute('aria-label',`下载 ${meta.name}`);caption.append(download);
      if(editable){const remove=document.createElement('button');remove.type='button';remove.textContent='移除';remove.setAttribute('aria-label',`移除 ${meta.name}`);remove.addEventListener('click',()=>{draft=draft.filter(x=>x.id!==meta.id);pending.delete(meta.id);render(host,draft,true);});caption.append(remove);}
      card.append(caption);container.append(card);
      try{
        const stored=pending.get(meta.id)||await get(meta.id);if(container.renderToken!==token)return;
        if(!stored?.blob)throw new Error('文件未找到');
        const url=objectUrl(stored.blob);
        if(isImage(meta)){const image=document.createElement('img');image.src=url;image.alt=meta.name;image.loading='lazy';image.addEventListener('click',()=>preview(url,meta.name));card.prepend(image);}
        else{const icon=document.createElement('div');icon.className='attachment-file';icon.textContent=`▤  ${(Number(meta.size||0)/1024).toFixed(0)} KB`;card.prepend(icon);}
        download.addEventListener('click',()=>{const a=document.createElement('a');a.href=url;a.download=meta.name;a.click();});
      }catch{const missing=document.createElement('p');missing.className='attachment-error';missing.textContent='附件未找到，请重新添加或导入包含附件的备份。';card.prepend(missing);download.disabled=true;}
    }
  }
  function preview(url,name){const dialog=document.createElement('dialog');dialog.className='image-preview';const close=document.createElement('button');close.textContent='关闭';close.type='button';close.addEventListener('click',()=>dialog.close());const image=document.createElement('img');image.src=url;image.alt=name;dialog.append(close,image);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();}
  async function saveDraft(){await putAll([...pending.values()]);return draft.map(x=>({...x}));}
  function asDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
  async function exportFiles(orders){const result=[];const ids=[...new Set(orders.flatMap(o=>(o.attachments||[]).map(x=>x.id)))];for(const id of ids){const file=await get(id);if(!file?.blob)throw new Error('有附件缺失，请重新添加后再备份。');result.push({id,data:await asDataUrl(file.blob)});}return result;}
  async function restoreFiles(orders,files=[]){
    const map=new Map(files.map(x=>[x.id,x.data])),stored=[];
    for(const order of orders)for(const meta of order.attachments||[]){const encoded=map.get(meta.id);if(typeof encoded!=='string'||!/^data:[^,]*;base64,/.test(encoded))throw new Error('附件内容缺失');const text=atob(encoded.slice(encoded.indexOf(',')+1));const bytes=Uint8Array.from(text,c=>c.charCodeAt(0));const newId=uid();stored.push({...meta,id:newId,blob:new Blob([bytes],{type:meta.type||'application/octet-stream'})});meta.id=newId;}
    await putAll(stored);
  }
  return {init,setDraft,saveDraft,render,exportFiles,restoreFiles};
})();
