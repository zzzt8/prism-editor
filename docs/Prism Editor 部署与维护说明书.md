1.1 当前系统结构
Prism Editor 现在由 3 部分组成：
dev-tool：工作流编辑/发布端
user-app：实习生/普通用户使用端
server：后端 API + SQLite 数据库
当前线上访问地址：
dev-tool：
https://dev-tool.prismlab.top

user-app：
https://user-app.prismlab.top
当前服务器：
服务器公网 IP：
120.79.207.242

系统：
Ubuntu 22.04

面板：
1Panel

反向代理：
OpenResty

后端服务：
prism-server，监听 127.0.0.1:3001

Cloudflare Tunnel：
cloudflared，负责把 dev-tool.prismlab.top 和 user-app.prismlab.top 转发到服务器本地服务
整体结构：
浏览器
  ↓
Cloudflare HTTPS
  ↓
Cloudflare Tunnel
  ↓
服务器 OpenResty
  ├─ dev-tool → localhost:80
  ├─ user-app → localhost:8080
  └─ /api → 127.0.0.1:3001

---
1. 怎么连接服务器
1.1 用 PowerShell 连接服务器
在 Windows 电脑打开 PowerShell：
ssh root@120.79.207.242
然后输入服务器密码。
成功后会进入类似：
root@iZwz93daen6fdv8emkgs97Z:~#
这说明已经连上服务器。
1.2 进入项目源码目录
服务器上的项目源码在：
/opt/prism-editor
进入目录：
cd /opt/prism-editor
查看当前代码版本：
git log -1 --oneline
查看当前代码是否有未提交变化：
git status -sb

---
2. 服务器上几个重要目录
2.1 项目源码目录
/opt/prism-editor
这里放的是 GitHub 拉下来的完整源码，包括：
apps/dev-tool
apps/user-app
server
packages
后端 build、Prisma、server 代码都在这里。
2.2 dev-tool 前端发布目录
/opt/1panel/www/sites/prism-dev-tool/index
这里放的是 dev-tool 构建后的静态文件：
index.html
assets/
favicon.svg
不要把源码直接放这里，只放 build 出来的 dist 文件。
2.3 user-app 前端发布目录
/opt/1panel/www/sites/prism-user-app/index
这里放的是 user-app 构建后的静态文件：
index.html
assets/
favicon.svg
2.4 后端环境变量
/opt/prism-editor/server/.env
这里放后端配置，例如：
JWT_SECRET
DATABASE_URL
NODE_ENV
CORS_ORIGIN
这个文件绝对不要上传到 GitHub。
2.5 Cloudflare Tunnel 配置
/etc/cloudflared/config.yml
当前应该类似：
tunnel: prism-editor-tunnel
credentials-file: /root/.cloudflared/749321e3-8e68-49e0-a3c9-500b4c10a982.json

ingress:
  - hostname: dev-tool.prismlab.top
    service: http://localhost:80

  - hostname: user-app.prismlab.top
    service: http://localhost:8080

  - service: http_status:404

---
3. 常用服务命令
3.1 查看后端服务状态
systemctl status prism-server --no-pager
正常应该看到：
Active: active (running)
3.2 重启后端服务
systemctl restart prism-server
3.3 查看后端日志
最近 100 行日志：
journalctl -u prism-server -n 100 --no-pager
实时日志：
journalctl -u prism-server -f
3.4 测试后端是否正常
服务器内执行：
curl "http://127.0.0.1:3001/api/health"
正常返回：
{"status":"ok","timestamp":"..."}
测试已发布工作流接口：
curl "http://127.0.0.1:3001/api/published?limit=100"
正常返回类似：
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 0,
    "totalPages": 0
  }
}
如果返回：
{"error":"Unauthorized"}
说明 published 公开读取接口又被鉴权挡住了。

---
4. Cloudflare Tunnel 相关命令
4.1 查看 Tunnel 服务状态
systemctl status cloudflared --no-pager
正常应该看到：
Active: active (running)
并且日志里有：
Registered tunnel connection
4.2 重启 Tunnel
systemctl restart cloudflared
4.3 查看 Tunnel 日志
journalctl -u cloudflared -n 100 --no-pager
实时日志：
journalctl -u cloudflared -f
4.4 查看 Tunnel 配置
cat /etc/cloudflared/config.yml
4.5 注意 Cloudflare DNS
Cloudflare DNS 里应该是 Tunnel 记录，而不是 A 记录。
应该类似：
Tunnel    dev-tool    prism-editor-tunnel
Tunnel    user-app    prism-editor-tunnel
不要用：
A    dev-tool    120.79.207.242
A    user-app    120.79.207.242
如果用 A 记录直连阿里云大陆 ECS，会触发备案拦截。

---
5. 本地开发后怎么更新服务器
总原则
每次更新前先判断你改了什么：
只改后端 server：
需要更新服务器源码、build 后端、重启 prism-server。

只改前端 dev-tool / user-app：
需要本地 build，上传 dist zip，覆盖 1Panel 网站目录。

前后端都改：
两套流程都要做。

---
6. 本地提交到 GitHub
在本地 PowerShell：
cd C:/PM/Product/prism-editor

git status -sb
git add .
git commit -m "你的提交说明"
git push origin main
例如：
git commit -m "fix: publish workflows to server"
注意：
不要提交 .env
不要提交 node_modules
不要提交服务器密码
不要提交 Cloudflare Token
不要提交 JWT_SECRET
不要提交任何 API key

---
7. 更新后端 server
7.1 正常 GitHub 拉取方式
连接服务器：
ssh root@120.79.207.242
服务器执行：
cd /opt/prism-editor
git pull --ff-only origin main
如果成功，继续：
pnpm --filter @prism/server build
systemctl restart prism-server
systemctl status prism-server --no-pager
然后测试：
curl "http://127.0.0.1:3001/api/health"
curl "http://127.0.0.1:3001/api/published?limit=100"
7.2 如果 git pull 报错或卡住
服务器连接 GitHub 有时会不稳定。可以先执行：
git config --global http.version HTTP/1.1
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
然后再试：
git pull --ff-only origin main
如果还是失败，走“本地打包源码上传”的备用方案。

---
8. GitHub 拉不动时的备用方案
在本地 PowerShell：
cd C:/PM/Product/prism-editor

git archive --format=tar HEAD -o prism-update.tar

scp C:/PM/Product/prism-editor/prism-update.tar root@120.79.207.242:/tmp/prism-update.tar
服务器执行：
cd /opt/prism-editor

tar -xf /tmp/prism-update.tar -C /opt/prism-editor

pnpm --filter @prism/server build

systemctl restart prism-server
systemctl status prism-server --no-pager
然后测试：
curl "http://127.0.0.1:3001/api/health"
curl "http://127.0.0.1:3001/api/published?limit=100"

---
9. 如果 Prisma 数据库结构变了
如果 Cursor 改了：
server/prisma/schema.prisma
或者改了数据库表结构，需要执行：
cd /opt/prism-editor

pnpm --filter @prism/server db:generate
pnpm --filter @prism/server exec prisma db push

pnpm --filter @prism/server build

systemctl restart prism-server
然后检查：
curl "http://127.0.0.1:3001/api/health"

---
10. 更新前端 dev-tool 和 user-app
10.1 本地 build
在本地 PowerShell：
cd C:/PM/Product/prism-editor

pnpm build:dev-tool
pnpm build:user-app
如果都成功，继续打包。
10.2 打包成 zip
Compress-Archive -Path .\apps\dev-tool\dist\* -DestinationPath .\dev-tool-dist.zip -Force

Compress-Archive -Path .\apps\user-app\dist\* -DestinationPath .\user-app-dist.zip -Force
10.3 上传到服务器
scp C:/PM/Product/prism-editor/dev-tool-dist.zip root@120.79.207.242:/tmp/dev-tool-dist.zip

scp C:/PM/Product/prism-editor/user-app-dist.zip root@120.79.207.242:/tmp/user-app-dist.zip
10.4 服务器解压覆盖
连接服务器：
ssh root@120.79.207.242
覆盖 dev-tool：
cd /opt/1panel/www/sites/prism-dev-tool/index

rm -rf ./*

unzip -o /tmp/dev-tool-dist.zip -d /opt/1panel/www/sites/prism-dev-tool/index
覆盖 user-app：
cd /opt/1panel/www/sites/prism-user-app/index

rm -rf ./*

unzip -o /tmp/user-app-dist.zip -d /opt/1panel/www/sites/prism-user-app/index
检查文件：
ls -la /opt/1panel/www/sites/prism-dev-tool/index
ls -la /opt/1panel/www/sites/prism-user-app/index
应该看到：
index.html
assets
favicon.svg
10.5 浏览器强刷
打开：
https://dev-tool.prismlab.top
https://user-app.prismlab.top
然后按：
Ctrl + F5
手机端建议重新打开页面，必要时清缓存。

---
11. 不同修改场景该传什么
11.1 只改了后端
例如改了：
server/src/routes/published.ts
server/src/routes/workflows.ts
server/src/app.ts
server/prisma/schema.prisma
需要做：
git push
服务器 git pull
pnpm --filter @prism/server build
systemctl restart prism-server
不需要重新上传前端 zip。
11.2 只改了 dev-tool
例如改了：
apps/dev-tool/...
packages/shared-types/...
packages/workflow-core/...
packages/image-ops/...
需要做：
pnpm build:dev-tool
压缩 dev-tool-dist.zip
上传 dev-tool-dist.zip
覆盖 /opt/1panel/www/sites/prism-dev-tool/index
如果 shared package 同时被 user-app 使用，user-app 也要重新 build。
11.3 只改了 user-app
例如改了：
apps/user-app/...
需要做：
pnpm build:user-app
压缩 user-app-dist.zip
上传 user-app-dist.zip
覆盖 /opt/1panel/www/sites/prism-user-app/index
11.4 前后端都改了
需要全部做：
1. git push
2. 服务器更新后端
3. 重启 prism-server
4. 本地 build 两个前端
5. 上传两个 zip
6. 覆盖两个前端目录
7. 强刷浏览器

---
12. 发布工作流的正确流程
12.1 管理员发布
进入：
https://dev-tool.prismlab.top
然后：
登录
打开或创建工作流
点击发布 / Publish
填写名称
确认发布
发布成功后，服务器数据库应该有数据。
12.2 检查发布是否真的进入服务器
服务器执行：
curl "http://127.0.0.1:3001/api/published?limit=100"
或者浏览器打开：
https://user-app.prismlab.top/api/published?limit=100
如果能看到工作流数据，说明发布成功。
12.3 实习生使用
实习生打开：
https://user-app.prismlab.top
正常应该直接看到你发布的工作流。
实习生不需要：
登录
导入 JSON
连接服务器
知道 dev-tool

---
13. 关于 IndexedDB 的重要原则
当前项目曾经最大的问题是：核心数据过度依赖 IndexedDB。
以后记住：
Server DB 是唯一事实来源。
IndexedDB 只能做本地草稿、缓存、离线副本。
必须存在服务器的数据：
工作流列表
工作流详情
已发布工作流
版本记录
团队共享模板
实习生需要访问的内容
可以存在 IndexedDB 的数据：
编辑器临时草稿
自动保存防崩溃缓存
画布视图状态
撤销/重做栈
本地最近打开记录
判断标准：
如果换设备还应该存在，就必须进 server。
如果只和当前浏览器有关，才可以放 IndexedDB。

---
14. 常见问题排查
14.1 user-app 手机看不到工作流
先测接口：
https://user-app.prismlab.top/api/published?limit=100
如果返回：
{"data":[]}
说明服务器数据库里没有已发布工作流，需要重新在 dev-tool 发布。
如果返回：
{"error":"Unauthorized"}
说明 published 公开读取接口又被鉴权拦住了。
如果接口有数据但页面不显示，说明 user-app 前端渲染逻辑有问题，或者前端没有更新。
14.2 发布按钮卡住
查看后端是否启动：
systemctl status prism-server --no-pager
测试：
curl "http://127.0.0.1:3001/api/health"
看日志：
journalctl -u prism-server -n 100 --no-pager
14.3 页面还是旧版本
可能是浏览器缓存。
处理：
Ctrl + F5
无痕窗口测试
手机清缓存
也可能是服务器前端目录没有覆盖成功。
检查：
ls -la /opt/1panel/www/sites/prism-dev-tool/index
ls -la /opt/1panel/www/sites/prism-user-app/index
14.4 域名打不开或 404
检查 Tunnel：
systemctl status cloudflared --no-pager
journalctl -u cloudflared -n 100 --no-pager
检查本地服务：
curl -I http://localhost
curl -I http://localhost:8080
curl "http://localhost/api/health"
curl "http://localhost:8080/api/health"
检查 Cloudflare DNS 是否是 Tunnel 记录，不要是 A 记录。
14.5 后端 3001 不要暴露公网
后端只应该本地访问：
127.0.0.1:3001
阿里云安全组不要开放：
3001
14.6 GitHub 拉取失败
先设置 HTTP/1.1：
git config --global http.version HTTP/1.1
再试：
git pull --ff-only origin main
如果还是失败，用本地 git archive 上传源码。

---
15. 备份
15.1 备份后端 .env
mkdir -p /opt/backups/prism-editor

cp /opt/prism-editor/server/.env /opt/backups/prism-editor/server.env.backup
15.2 查找数据库文件
find /opt/prism-editor/server -name "*.db" -type f
假设找到：
/opt/prism-editor/server/prod.db
备份：
cp /opt/prism-editor/server/prod.db /opt/backups/prism-editor/prod.db.backup
15.3 每次大改前建议备份
mkdir -p /opt/backups/prism-editor/$(date +%Y%m%d-%H%M%S)

---
16. 安全注意事项
不要把这些东西放进 GitHub：
.env
JWT_SECRET
Cloudflare Token
数据库密码
API key
服务器密码
私钥
不要把 API key 写进前端代码。
前端是所有人都能看到的，所谓“隐藏在前端”不是安全。
如果以后接入第三方 API，要放在：
server/.env
云平台 Secret
服务端代理
不要放在：
apps/dev-tool
apps/user-app
前端环境变量
GitHub 仓库

---
17. 最推荐的日常更新流程
每次 Cursor 改完后，按这个顺序：
1. 本地 build 测试
2. git status 看改了什么
3. git add / commit / push
4. 判断是否需要更新后端
5. 判断是否需要更新前端
6. 服务器更新
7. 重启 prism-server
8. 覆盖前端 dist
9. Ctrl + F5 强刷
10. 测试 /api/health
11. 测试 /api/published
12. dev-tool 发布一个工作流
13. user-app 用无痕窗口和手机验证
最重要的验收标准：
电脑普通窗口能看到
电脑无痕窗口能看到
手机能看到
刷新后还在
不用导入 JSON
不用登录 user-app
只要这几条成立，就说明 server-first 链路是通的。