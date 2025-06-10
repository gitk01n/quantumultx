// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
const urlRegex = /^https:\/\/game\.dominos\.com\.cn\/.+\/getuser?/;
const variableName = "dmlck";

if (urlRegex.test($request.url)) {
    const authHeader = $request.headers['Authorization'] || $request.headers['authorization'];
    if (authHeader) {
        const bearerToken = authHeader.match(/Bearer\s+(\S+)/i);
        if (bearerToken && bearerToken[1]) {
            $prefs.setValueForKey(bearerToken[1], variableName);
            console.log(`成功提取并存储 ${variableName}: ${bearerToken[1]}`);
        } else {
            console.log("Authorization 头中没有找到有效的 Bearer token");
        }
    } else {
        console.log("请求头中没有找到 Authorization 字段");
    }
}

$done({});
