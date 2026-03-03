// == 全局变量自动同步青龙 (劫持版) ==
// 功能：任何脚本执行 $persistentStore.write 时，自动同步该变量到青龙
// 触发：无需手动操作，脚本运行自动触发

(async () => {
    // 防止重复注入
    if (window.__qlSyncInjected) return;
    window.__qlSyncInjected = true;

    const SCRIPT_NAME = "🔁 全局同步青龙";
    const IGNORE_KEYS = ["QL_HOST", "QL_ID", "QL_SEC", "AUTO_SYNC"];
    
    // 1. 读取配置
    const getConfig = () => ({
        host: $persistentStore.read("QL_HOST")?.trim() || "",
        id: $persistentStore.read("QL_ID")?.trim() || "",
        sec: $persistentStore.read("QL_SEC")?.trim() || "",
        enable: $persistentStore.read("AUTO_SYNC") === "true"
    });

    // 2. 获取青龙 Token 并缓存
    let qlToken = null;
    let tokenExpire = 0; // 缓存过期时间

    const getToken = async (config) => {
        if (Date.now() < tokenExpire && qlToken) return qlToken;
        try {
            const res = await $task.fetch({
                url: `${config.host}/open/auth/token?client_id=${config.id}&client_secret=${config.sec}`
            });
            const data = JSON.parse(res.body);
            if (data.code === 200) {
                qlToken = data.data.token;
                tokenExpire = Date.now() + 30 * 60 * 1000; // 缓存30分钟
                return qlToken;
            }
        } catch (e) {}
        throw new Error("获取Token失败");
    };

    // 3. 同步单个变量到青龙
    const syncToQL = async (key, value) => {
        const config = getConfig();
        // 开关关闭、配置缺失、忽略列表 直接返回
        if (!config.enable || !config.host || !config.id || !config.sec || IGNORE_KEYS.includes(key)) {
            return;
        }
        // 空值不同步
        if (value === null || value === undefined || value === "") {
            return;
        }

        try {
            const token = await getToken(config);
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            };

            // 先查询是否存在
            const searchRes = await $task.fetch({
                url: `${config.host}/open/envs?searchValue=${key}`,
                headers: headers
            });
            const searchData = JSON.parse(searchRes.body);
            const existItem = searchData.data?.find(item => item.name === key);

            let res, action;
            if (existItem) {
                // 存在则更新
                res = await $task.fetch({
                    url: `${config.host}/open/envs`,
                    method: "PUT",
                    headers: headers,
                    body: JSON.stringify({
                        id: existItem.id,
                        name: key,
                        value: value
                    })
                });
                action = "更新";
            } else {
                // 不存在则新增
                res = await $task.fetch({
                    url: `${config.host}/open/envs`,
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        name: key,
                        value: value
                    })
                });
                action = "新增";
            }

            const result = JSON.parse(res.body);
            if (result.code === 200) {
                console.log(`[${SCRIPT_NAME}] ✅ ${action}: ${key}`);
            } else {
                throw new Error(result.message || "接口错误");
            }
        } catch (e) {
            console.log(`[${SCRIPT_NAME}] ❌ 同步${key}失败: ${e.message}`);
        }
    };

    // 4. 核心：劫持 $persistentStore.write 方法
    const originalWrite = $persistentStore.write;
    $persistentStore.write = function (value, key) {
        // 1. 执行原生方法：写入 BoxJS（必须保留，不影响原脚本逻辑）
        const result = originalWrite.call(this, value, key);
        
        // 2. 异步执行同步：不阻塞原脚本的运行
        syncToQL(key, value).catch(err => console.error(err));
        
        // 3. 返回原生结果
        return result;
    };

    console.log(`[${SCRIPT_NAME}] ✅ 全局劫持已生效`);
})();
