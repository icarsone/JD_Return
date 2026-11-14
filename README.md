# 京东退货详情修改器

部署地址：https://tuihuo.sim101.cn/ 。运行在阿里云 ECS，通过 Nginx + Python 3 提供服务，无第三方识别 API、数据库或 Node 服务端依赖。

## 功能

- 粘贴自动识别地址、收件人和电话，支持常见的一行、多行、带字段名、全角数字、国内手机号、座机分机及隐藏号码。
- 支持直接在「寄回地址」框粘贴完整信息。缺失字段、多个电话或隐藏号码会提示核对；复杂或含歧义文本仍需手动修改。
- 生成结果通过原生表单 POST 返回普通 HTTPS 网页，不依赖 blob 跳转、弹窗或浏览器存储权限。另可下载 HTML。
- 仅在当前浏览器保存最多 12 条历史；存储被限制时仍可生成。服务器不保存填写的个人信息，不记录请求正文。
- 页面不向京东提交修改，生成的是内置模板的副本。

## 本地运行和验证

```sh
node scripts/build-template.mjs
python3 server.py --port 8765
# 打开 http://127.0.0.1:8765/
node --test tests/parser.test.mjs
python3 -m unittest discover -s tests -p test_server.py -v
```

构建结果为 `dist/public/` 和非公开模板 `dist/template.html`。不要将仓库根目录或模板直接作为公开静态目录。

## 修改模板

编辑 `template-source.html` 的寄回区域，保留三个占位符：`{{RETURN_ADDRESS}}`、`{{RETURN_NAME}}`、`{{RETURN_PHONE}}`，然后重新构建。构建会移除保存网页时混入的翻译扩展内容。字段由服务端校验并 HTML 转义后进行单次替换。

## 阿里云部署

服务器 SSH 别名为 `sim101`（也支持 `aliyun`）。服务目录 `/opt/jd-return/current` 指向版本目录，systemd 服务为 `jd-return`，监听 `127.0.0.1:4321`。

```sh
ssh sim101
systemctl status jd-return
nginx -t
curl -fsS https://tuihuo.sim101.cn/healthz
```

构建后将 `server.py`、`dist/`、`deploy/` 复制到新的 `/opt/jd-return/releases/<版本>/`，切换 `current` 软链接并执行 `systemctl restart jd-return`。确认健康检查成功后再处理 Nginx 配置。配置示例见 `deploy/`；首次签证书前使用 `nginx-http.conf`，证书就绪后使用 `nginx.conf`。

HTTPS 证书由 Certbot 管理，HTTP-01 验证目录为 `/var/www/sim101-acme`，续期后自动重载 Nginx。域名 A 记录指向 ECS。`vercel.json` 已关闭 Git 自动部署；正式站点不再通过 Vercel 提供。

手机夸克及小米浏览器已针对原生页面生成流程处理兼容性；桌面手机尺寸验证不等同于两款浏览器的真机验收。
