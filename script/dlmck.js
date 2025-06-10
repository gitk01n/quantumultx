// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser?/ url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
const $ = new Env("达美乐小游戏");
const ckName = "dml_ck";

function getCookie() {
    if ($request && $request.method != 'OPTIONS') {
        const authHeader = $request.headers['Authorization'] || $request.headers['authorization'];
        if (authHeader) {
            const bearerToken = authHeader.match(/Bearer\s+(\S+)/i)?.[1];
            if (bearerToken) {
                $.setdata(bearerToken, ckName);
                $.msg($.name, "", "获取Token成功🎉");
            } else {
                $.msg($.name, "", "Authorization格式错误");
            }
        } else {
            $.msg($.name, "", "未找到Authorization头");
        }
    }
}

getCookie();
$done({});
