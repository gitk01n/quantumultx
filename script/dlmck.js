// Quantumult X 脚本：达美乐ck获取
// 作者：franky
/***********************************************************************************
[rewrite_local]
^https:\/\/game\.dominos\.com\.cn\/.+\/getuser? url script-request-header https://raw.githubusercontent.com/gitk01n/quantumultx/refs/heads/main/script/dlmck.js
[MITM]
hostname = game.dominos.com.cn
************************************************************************************/
const url = $request.url;
const method = $request.method;
const headers = $request.headers;

// Define the regular expression to match the target URL
const targetUrlPattern = /^https:\/\/game\.dominos\.com\.cn\/cocoalava\/v2\/getUser/;

if (targetUrlPattern.test(url) && method === 'GET') {
  const authorizationHeader = headers['Authorization'] || headers['authorization']; // Check both cases

  if (authorizationHeader) {
    // Extract the Bearer token
    const token = authorizationHeader.replace('Bearer ', '');

    // Store in BoxJs using $persistentStore.write
    // This will create a variable named 'dmlck' in BoxJs
    $persistentStore.write(token, 'dmlck');
    console.log(`Successfully extracted Dominos Authorization token and stored in BoxJs: ${token}`);
    $notify('Dominos Auth Token Extracted', '', `Token: ${token}`);
  } else {
    console.log('Authorization header not found in the request.');
  }
} else {
  console.log('Request URL or method does not match the target for Dominos Authorization extraction.');
}

$done({});
