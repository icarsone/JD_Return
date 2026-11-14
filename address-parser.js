(function (root) {
  'use strict';
  var region = /北京市|天津市|上海市|重庆市|内蒙古自治区|广西壮族自治区|宁夏回族自治区|新疆维吾尔自治区|西藏自治区|黑龙江省|北京|天津|上海|重庆|内蒙古|广西|宁夏|新疆|西藏|香港|澳门|黑龙江|吉林|辽宁|河北|河南|山东|山西|陕西|甘肃|青海|江苏|浙江|安徽|江西|福建|湖北|湖南|广东|海南|四川|贵州|云南|台湾/;
  var surname = /^[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛范彭郎鲁韦昌马苗方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵季贾路娄江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯管卢莫经房裘缪干解应宗丁宣邓单洪包左石崔吉龚程邢裴陆荣翁荀羊甄曲封芮储靳段富巫乌焦巴牧山谷车侯全班仰秋仲伊宫宁仇祖武符刘景詹龙叶黎白蒲卓谭劳申翟赖牛寿通边燕温庄柴瞿连艾向古耿满文寇曾关查游权盖桓公欧阳上官司马诸葛夏侯东方皇甫尉迟公孙慕容令狐长孙宇文司徒司空]/;
  function clean(v) { return v.replace(/^[\s,;，；、|:：\-]+|[\s,;，；、|:：\-]+$/g, '').replace(/[ \t]+/g, ' '); }
  function isName(v) { return /^[\u3400-\u9fff·]{2,8}$/.test(v) && surname.test(v) && !/(省|市|区|县|镇|村|街|路|号|楼|栋|室|园|单元|地址|电话|备注)/.test(v); }
  function parse(value) {
    var text = String(value || '').replace(/[！-～]/g, function(c) { return String.fromCharCode(c.charCodeAt(0)-65248); }).replace(/\u3000|\u00a0/g, ' ').replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\r\n?/g, '\n').replace(/[【】\[\]]/g, ' ').replace(/\((\+?86)\)\s*(?=1[3-9])/g, '$1 ').replace(/\((0\d{2,3})\)[ -]?(?=\d{7,8})/g, '$1-').trim();
    var result = { address: '', name: '', phone: '', warnings: [] };
    if (!text) return result;
    // Complete numbers only: order IDs must not be treated as mobile numbers.
    var pattern = /(^|[^\d*Xx])((?:(?:\+?86)[ -]?)?1[3-9](?:[ -]?[\d*Xx]){9}|0\d{2,3}[ -]?\d{7,8}(?:[ -]*(?:转|分机|ext\.?|#|-)[ -]*\d{1,6})?|(?:400|800)[ -]?\d{3}[ -]?\d{4})(?![\d*Xx])/g;
    var phones = [];
    var stripped = text.replace(pattern, function(whole, prefix, phone, offset) {
      var before = text.slice(Math.max(0,offset-16),offset+prefix.length);
      var number = phone.replace(/^(?:\+?86)[ -]?(?=1[3-9])/, '').replace(/ /g, '').replace(/x/g, 'X');
      if (/^1[3-9]/.test(number)) number = number.replace(/-/g, '');
      phones.push({ value: number, labelled: /(?:电话|手机|联系方式|号码)\s*[:：]?\s*$/.test(before) });
      return prefix+'\n';
    });
    if (phones.length) {
      result.phone = (phones.filter(function(p) { return p.labelled; })[0] || phones[0]).value;
      if (phones.some(function(p) { return p.value !== result.phone; })) result.warnings.push('发现多个电话，请确认联系电话');
      if (/[\*X]/.test(result.phone)) result.warnings.push('电话含隐藏号码，请核对能否联系');
    }
    var labels = /(寄回收件人|收件人姓名|收货人姓名|收货人|收件人|联系人|收件姓名|姓名|收件电话|收货电话|手机号码|联系电话|联系方式|电话号码|手机号|手机|电话|所在地区|省市区|收货地址|收件地址|详细地址|寄回地址|退货地址|联系地址|地址|地区|邮政编码|邮编|备注|温馨提示)\s*[:：]?\s*/g;
    var matches = [], match;
    while ((match=labels.exec(stripped))) {
      var previous = match.index ? stripped.charAt(match.index-1) : '';
      if (match.index===0 || /[\s,，;；|]/.test(previous) || /[:：]/.test(match[0])) matches.push({index:match.index,end:labels.lastIndex,label:match[1]});
    }
    var generic = [], addresses = [];
    if (matches.length) {
      generic.push(stripped.slice(0,matches[0].index));
      matches.forEach(function(field,index) {
        var content=clean(stripped.slice(field.end,index+1<matches.length ? matches[index+1].index : stripped.length));
        if (/地址|地区|省市区/.test(field.label)) addresses.push(content);
        else if (/姓名|收货人|收件人|联系人/.test(field.label)) {
          var lines=content.split(/[\n,，;；|]/).map(clean).filter(Boolean);
          result.name=lines.shift() || ''; generic=generic.concat(lines);
        } else if (/电话|手机|联系方式/.test(field.label) && content) generic.push(content);
        // Remarks and postal codes are metadata, not part of the address.
      });
    } else generic.push(stripped);
    var remaining=[];
    addresses.concat(generic).join('\n').split(/[\n,，;；|\t]/).map(clean).filter(Boolean).forEach(function(piece) {
      if (/^\([^()]+\)$/.test(piece) && isName(piece.slice(1,-1))) piece=piece.slice(1,-1);
      if (!result.name && result.phone && isName(piece)) { result.name=piece; return; }
      var start=piece.search(region);
      if (!result.name && result.phone && start>0 && isName(clean(piece.slice(0,start)))) { result.name=clean(piece.slice(0,start)); piece=piece.slice(start); }
      var words=piece.split(/\s+/);
      if (!result.name && result.phone && words.length>1) {
        if (isName(words[0])) result.name=words.shift();
        else if (isName(words[words.length-1])) result.name=words.pop();
        piece=words.join(' ');
      }
      if (piece) remaining.push(piece);
    });
    result.address=remaining.map(clean).filter(Boolean).join(' ').replace(/\s*\n\s*/g,' ');
    result.name=clean(result.name);
    if (!result.name) result.warnings.push('未确定收件人，请补充');
    if (!result.phone) result.warnings.push('未找到联系电话，请补充');
    if (!result.address) result.warnings.push('未找到寄回地址，请补充');
    return result;
  }
  root.JDAddressParser={parse:parse};
})(typeof window!=='undefined' ? window : globalThis);
