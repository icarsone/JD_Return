(function () {
  'use strict';
  var historyKey='jd-return-editor-history-v1', memoryHistory=[], parseTimer, storageAvailable=true;
  var byId=function(id) { return document.getElementById(id); };
  var form=byId('returnForm'), smartInput=byId('smartInput'), message=byId('message');
  var fields={address:byId('address'),name:byId('name'),phone:byId('phone')};
  function say(text,error) { message.textContent=text; message.className='message'+(error?' error':''); }
  function readHistory() {
    if(!storageAvailable) return memoryHistory;
    try {
      var data=JSON.parse(localStorage.getItem(historyKey)||'[]');
      memoryHistory=Array.isArray(data)?data.filter(function(item) { return item && typeof item.address==='string' && typeof item.name==='string' && typeof item.phone==='string'; }).slice(0,12):[];
    } catch(e) { storageAvailable=false; }
    return memoryHistory;
  }
  function writeHistory(items) { memoryHistory=items.slice(0,12); try { if(storageAvailable) localStorage.setItem(historyKey,JSON.stringify(memoryHistory)); } catch(e) { storageAvailable=false; } }
  function fill(record) { Object.keys(fields).forEach(function(key) { fields[key].value=record[key]||''; }); }
  function renderHistory() {
    var list=byId('historyList'), items=readHistory(); list.textContent='';
    byId('historyCount').textContent=items.length?items.length+' 条本机记录':'暂无记录'; byId('clearHistory').disabled=!items.length;
    if (!items.length) { var empty=document.createElement('p'); empty.className='empty'; empty.textContent='生成后的地址会保存在这里，仅当前浏览器可见。'; list.appendChild(empty); }
    items.forEach(function(item) {
      var button=document.createElement('button'); button.type='button'; button.className='history-item';
      var title=document.createElement('strong'); title.textContent=item.name+' · '+item.phone;
      var address=document.createElement('span'); address.textContent=item.address;
      button.appendChild(title); button.appendChild(address);
      button.addEventListener('click',function() { fill(item); say('已填入历史记录，可修改后重新生成。'); }); list.appendChild(button);
    });
  }
  function recognize(text) {
    clearTimeout(parseTimer);
    if (!text.trim()) { say('请先粘贴收件信息。',true); return; }
    var result=window.JDAddressParser.parse(text); fill(result);
    say(result.warnings.length?'已识别部分信息。'+result.warnings.join('；')+'。':'已识别地址、收件人和电话，请核对后生成。',result.warnings.length>0);
  }
  byId('recognize').addEventListener('click',function() { clearTimeout(parseTimer); recognize(smartInput.value); });
  smartInput.addEventListener('input',function() { clearTimeout(parseTimer); if(smartInput.value.trim()) parseTimer=setTimeout(function() { recognize(smartInput.value); },200); });
  fields.address.addEventListener('paste',function(event) {
    var clipboard=event.clipboardData||window.clipboardData; if(!clipboard) return;
    var text=clipboard.getData('text'), parsed=window.JDAddressParser.parse(text);
    if(parsed.phone || /收件人|收货人|联系人|姓名/.test(text)) { event.preventDefault(); smartInput.value=text; recognize(text); }
  });
  form.addEventListener('submit',function(event) {
    clearTimeout(parseTimer); var record={};
    Object.keys(fields).forEach(function(key) { record[key]=fields[key].value.trim(); fields[key].value=record[key]; });
    var missing=Object.keys(fields).filter(function(key) { return !record[key]; });
    if(missing.length) { event.preventDefault(); fields[missing[0]].focus(); say('请完整填写寄回地址、收件人和联系电话。',true); return; }
    record.createdAt=Date.now(); var items=readHistory().filter(function(item) { return item.address!==record.address || item.name!==record.name || item.phone!==record.phone; });
    writeHistory([record].concat(items)); renderHistory(); say('正在生成页面…');
    // Native same-tab POST: no popup, blob or storage permission needed.
  });
  byId('resetForm').addEventListener('click',function() { clearTimeout(parseTimer); form.reset(); smartInput.value=''; say(''); smartInput.focus(); });
  byId('clearHistory').addEventListener('click',function() { writeHistory([]); renderHistory(); say('历史记录已清空。'); });
  window.addEventListener('pageshow',function(event) { if(event.persisted) { renderHistory(); say('可修改寄回信息后再次生成。'); } });
  renderHistory();
})();
