import * as utils from './utils/api.js';
import banner from './utils/banner.js';
import log from './utils/logger.js';
import { delay } from './utils/helper.js'
import readline from 'readline';

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 封装问题函数
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 格式化代理地址
const formatProxy = (proxy) => {
    if (!proxy) return null;
    
    // 如果已经是正确格式就直接返回
    if (proxy.startsWith('http://') || proxy.startsWith('https://')) {
        return proxy;
    }

    try {
        // 清理输入
        proxy = proxy.trim();
        
        // 处理格式: ip:port:username:password
        const parts = proxy.split(':');
        
        // 处理四部分格式 (ip:port:username:password)
        if (parts.length === 4) {
            const [ip, port, username, password] = parts;
            // 验证IP格式
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                return `http://${username}:${password}@${ip}:${port}`;
            }
        }
        
        // 处理两部分格式 (ip:port)
        if (parts.length === 2) {
            const [ip, port] = parts;
            // 验证IP格式
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                return `http://${ip}:${port}`;
            }
        }

        // 处理socks5格式
        if (proxy.toLowerCase().includes('socks5://')) {
            return proxy;
        }

        // 尝试解析其他格式
        if (parts.length >= 2) {
            // 尝试从任何格式中提取IP和端口
            const ipMatch = proxy.match(/(\d{1,3}\.){3}\d{1,3}/);
            const portMatch = proxy.match(/:(\d+)/);
            
            if (ipMatch && portMatch) {
                const ip = ipMatch[0];
                const port = portMatch[1];
                
                // 如果包含用户名和密码
                const userPassMatch = proxy.match(/([^:]+):([^@]+)@/);
                if (userPassMatch) {
                    const [_, username, password] = userPassMatch;
                    return `http://${username}:${password}@${ip}:${port}`;
                }
                
                return `http://${ip}:${port}`;
            }
        }
    } catch (error) {
        console.error('代理格式化错误:', error.message);
    }

    // 如果无法解析，返回原始格式
    return proxy.startsWith('http') ? proxy : `http://${proxy}`;
};

const main = async () => {
    log.info(banner);
    await delay(3);

    let tokens = [];
    let accountProxies = []; // 存储每个账号的代理列表

    while (true) {
        const token = await question('请输入令牌 (输入空行完成): ');
        if (!token.trim()) break;
        
        tokens.push(token.trim());
        
        const useProxy = await question('是否为此账号配置代理? (y/n): ');
        if (useProxy.toLowerCase() === 'y') {
            let accountProxy = [];
            const multiProxy = await question('是否配置多个代理? (y/n): ');
            
            if (multiProxy.toLowerCase() === 'y') {
                while (true) {
                    const proxy = await question('请输入代理地址 (格式: ip:port:username:password 或 ip:port，输入空行完成): ');
                    if (!proxy.trim()) break;
                    
                    const formattedProxy = formatProxy(proxy.trim());
                    if (formattedProxy) {
                        accountProxy.push(formattedProxy);
                    }
                }
            } else {
                const proxy = await question('请输入代理地址 (格式: ip:port:username:password 或 ip:port): ');
                const formattedProxy = formatProxy(proxy.trim());
                if (formattedProxy) {
                    accountProxy.push(formattedProxy);
                }
            }
            accountProxies.push(accountProxy);
        } else {
            accountProxies.push([]);
        }
        
        log.info(`成功配置账号 ${tokens.length}`);
    }

    if (tokens.length === 0) {
        log.error('未输入有效的令牌');
        rl.close();
        return;
    }

    // 关闭readline接口
    rl.close();

    try {
        log.info(`正在为所有账户启动程序: ${tokens.length}`);

        // 修改为顺序初始化账号，而不是并行
        for (let index = 0; index < tokens.length; index++) {
            const token = tokens[index];
            const proxyList = accountProxies[index];

            try {
                // 获取用户信息 (使用第一个代理)
                const userData = await utils.getUserInfo(token, proxyList[0]);

                if (userData?.data) {
                    const { email, verified, current_tier, points_balance } = userData.data
                    log.info(`账户 ${index + 1} 信息:`, { 
                        邮箱: email, 
                        已验证: verified, 
                        当前等级: current_tier, 
                        积分余额: points_balance 
                    });
                }

                // 如果配置了多个代理，为每个代理创建独立的任务
                if (proxyList.length > 0) {
                    proxyList.forEach((proxy, proxyIndex) => {
                        // 初始检查奖励
                        checkUserRewards(token, proxy, index, proxyIndex);

                        // 设置定期ping和收益检查
                        setInterval(async () => {
                            const connectRes = await utils.connect(token, proxy);
                            log.info(`账户 ${index + 1} 代理 ${proxyIndex + 1} Ping 结果:`, connectRes || { message: '未知错误' });

                            const result = await utils.getEarnings(token, proxy);
                            log.info(`账户 ${index + 1} 代理 ${proxyIndex + 1} 收益结果:`, result?.data || { message: '未知错误' });
                        }, 1000 * 30); // 每30秒运行一次

                        // 设置每日奖励检查
                        setInterval(async () => {
                            await checkUserRewards(token, proxy, index, proxyIndex);
                        }, 1000 * 60 * 60 * 24); // 每24小时检查一次
                    });
                } else {
                    // 无代理情况
                    // 初始检查奖励
                    await checkUserRewards(token, null, index);

                    // 设置定期ping和收益检查
                    setInterval(async () => {
                        const connectRes = await utils.connect(token, null);
                        log.info(`账户 ${index + 1} Ping 结果:`, connectRes || { message: '未知错误' });

                        const result = await utils.getEarnings(token, null);
                        log.info(`账户 ${index + 1} 收益结果:`, result?.data || { message: '未知错误' });
                    }, 1000 * 30);

                    // 设置每日奖励检查
                    setInterval(async () => {
                        await checkUserRewards(token, null, index);
                    }, 1000 * 60 * 60 * 24);
                }

                // 添加延迟，避免同时初始化太多账号
                await delay(10); // 每个账号初始化后等待10秒

            } catch (error) {
                log.error(`处理账户 ${index + 1} 时出错: ${error.message}`);
                // 出错后也等待一段时间再继续下一个账号
                await delay(5);
            }
        }
    } catch (error) {
        log.error(`主循环出错: ${error.message}`);
    }
};

// 检查和领取用户奖励的函数
const checkUserRewards = async (token, proxy, index, proxyIndex = 0) => {
    try {
        const response = await utils.getUserRef(token, proxy)
        const { total_unclaimed_points } = response?.data || 0;
        if (total_unclaimed_points > 0) {
            const proxyInfo = proxy ? ` 代理 ${proxyIndex + 1}` : '';
            log.info(`账户 ${index + 1}${proxyInfo} 有 ${total_unclaimed_points} 个未领取的积分，正在尝试领取...`);
            const claimResponse = await utils.claimPoints(token, proxy);
            if (claimResponse.code === 200) {
                log.info(`账户 ${index + 1}${proxyInfo} 成功领取了 ${total_unclaimed_points} 个积分！`);
            }
        }
    } catch (error) {
        const proxyInfo = proxy ? ` 代理 ${proxyIndex + 1}` : '';
        log.error(`检查账户 ${index + 1}${proxyInfo} 奖励时出错: ${error.message}`);
    }
}

// 处理进程终止信号
process.on('SIGINT', () => {
    log.warn(`收到终止信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log.warn(`收到终止信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});

// 运行主函数
main();
