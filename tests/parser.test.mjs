import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../address-parser.js', import.meta.url), 'utf8'), context);
const parse = context.JDAddressParser.parse;
const address = '广东省深圳市南山区科技园1号';
const cases = [
  ['姓名电话地址', `张三 13800138000 ${address}`, '张三', '13800138000', address],
  ['地址姓名电话', `${address} 张三 13800138000`, '张三', '13800138000', address],
  ['地址电话姓名', `${address}\n13800138000\n张三`, '张三', '13800138000', address],
  ['逗号分隔', `张三，13800138000，${address}`, '张三', '13800138000', address],
  ['标准字段', `收件人：张三\n联系电话：13800138000\n寄回地址：${address}`, '张三', '13800138000', address],
  ['一行字段', `地址：${address} 收件人：张三 手机：13800138000`, '张三', '13800138000', address],
  ['括号字段', `【收货人】张三 【手机号码】13800138000 【收货地址】${address}`, '张三', '13800138000', address],
  ['地区与详细地址', '收货人：李四\n手机：13912345678\n所在地区：浙江省 杭州市 西湖区\n详细地址：文三路100号2楼\n邮编：310000', '李四', '13912345678', '浙江省 杭州市 西湖区 文三路100号2楼'],
  ['带国家代码空格', `张三 +86 138 0013 8000 ${address}`, '张三', '13800138000', address],
  ['全角数字', `张三，１３８００１３８０００，${address}`, '张三', '13800138000', address],
  ['连续文本', `张三13800138000${address}`, '张三', '13800138000', address],
  ['姓名紧贴省份', `张三${address} 13800138000`, '张三', '13800138000', address],
  ['座机分机', `联系人：王五\n电话：0755-12345678转123\n地址：${address}`, '王五', '0755-12345678转123', address],
  ['收件部门', `收件人：售后服务部\n电话：400-123-4567\n退货地址：${address}\n备注：请发顺丰`, '售后服务部', '400-123-4567', address],
  ['英文带标签', '收件人：Jane Doe\n手机：13800138000\n地址：1 Test Road', 'Jane Doe', '13800138000', '1 Test Road'],
  ['仅地址', address, '', '', address],
  ['地址标签混合联系人', `收货地址：${address}，张三，13800138000`, '张三', '13800138000', address],
  ['括号姓名及国家代码', `${address}，(张三)，(+86)13800138000`, '张三', '13800138000', address],
  ['括号座机区号', `收件人：张三\n电话：(0755)12345678\n地址：${address}`, '张三', '0755-12345678', address],
];
for (const [label, input, name, phone, expectedAddress] of cases) test(label, () => {
  const actual = parse(input); assert.equal(actual.name, name); assert.equal(actual.phone, phone); assert.equal(actual.address, expectedAddress);
});
test('多个号码需核对', () => { assert.match(parse(`张三 13800138000 13900139000 ${address}`).warnings.join(), /多个电话/); });
test('隐藏号码需核对', () => { assert.equal(parse(`张三 138****8000 ${address}`).phone, '138****8000'); assert.match(parse(`张三 138****8000 ${address}`).warnings.join(), /隐藏/); });
test('不从订单号中提取手机', () => { assert.equal(parse('订单号 91380013800012345').phone, ''); });
test('不会执行输入内容', () => { assert.match(parse('收件人：<script>alert(1)</script>\n地址：测试地址\n电话：13800138000').name, /<script>/); });
