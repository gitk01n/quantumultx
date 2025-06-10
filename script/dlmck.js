// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
const $ = new Env("达美乐小游戏");
const ckName = "dml_ck";
async function getCookie() {
    if ($request && $request.method != 'OPTIONS') {
        const tokenValue = $request.headers['Authorization']  $request.headers['authorization'];
        if (tokenValue) {
            $.setdata(tokenValue, ckName);
            $.msg($.name, "", "获取Cookie成功🎉");
        } else {
            $.msg($.name, "", "错误获取Cookie失败");
        }
    }
}
