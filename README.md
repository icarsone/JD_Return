# 京东退货详情修改器

这是一个可部署到 Vercel 的静态页面，用内置模板生成修改后的京东退货详情 HTML。

## 修改模板

编辑 `template-source.html`，把“商品寄回地址”区域的值改成这些占位符：

```html
寄回地址 {{RETURN_ADDRESS}}
收件人 {{RETURN_NAME}}
联系电话 {{RETURN_PHONE}}
```

也兼容旧的地址占位符 `{{USER_INPUT}}`。

改完后运行：

```bash
npm run build:template
```

这会重新生成 `template.js`，部署到 Vercel 时也会自动执行。

## 部署到 Vercel
codes
把这个目录作为项目上传到 GitHub，然后在 Vercel 导入仓库即可。Vercel 会运行 `npm run build` 并把当前目录作为静态站点输出。
