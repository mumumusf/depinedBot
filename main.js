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

    // 处理格式: ip:port:username:password
    const parts = proxy.split(':');
    if (parts.length === 4) {
        const [ip, port, username, password] = parts;
        return `http://${username}:${password}@${ip}:${port}`;
    }
    
    // 处理格式: ip:port
    if (parts.length === 2) {
        return `http://${proxy}`;
    }

    return null;
};

const main = async () => {
    log.info(banner);
    await delay(3);

    let tokens = [];
    let proxies = [];

    // 直接输入令牌
    const tokenInput = await question('请输入令牌 (多个令牌用逗号分隔): ');
    tokens = tokenInput.split(',').map(t => t.trim()).filter(t => t);

    if (tokens.length === 0) {
        log.error('未输入有效的令牌');
        rl.close();
        return;
    }

    const useProxy = await question('是否使用代理? (y/n): ');
    if (useProxy.toLowerCase() === 'y') {
        const proxyInput = await question('请输入代理地址 (多个代理用逗号分隔，格式: ip:port:username:password 或 ip:port): ');
        proxies = proxyInput.split(',')
            .map(p => p.trim())
            .map(formatProxy)
            .filter(p => p);
    }

    // 关闭readline接口
    rl.close();

    try {
        log.info(`正在为所有账户启动程序:`, tokens.length);

        const tasks = tokens.map(async (token, index) => {
            const proxy = proxies.length > 0 ? proxies[index % proxies.length] : null;
            try {
                // 获取用户信息
                const userData = await utils.getUserInfo(token, proxy);

                if (userData?.data) {
                    const { email, verified, current_tier, points_balance } = userData.data
                    log.info(`账户 ${index + 1} 信息:`, { email, verified, current_tier, points_balance });
                }

                // 初始检查奖励
                await checkUserRewards(token, proxy, index);

                // 设置定期ping和收益检查
                setInterval(async () => {
                    const connectRes = await utils.connect(token, proxy);
                    log.info(`账户 ${index + 1} Ping 结果:`, connectRes || { message: '未知错误' });

                    const result = await utils.getEarnings(token, proxy);
                    log.info(`账户 ${index + 1} 收益结果:`, result?.data || { message: '未知错误' });
                }, 1000 * 30); // 每30秒运行一次

                // 设置每日奖励检查
                setInterval(async () => {
                    await checkUserRewards(token, proxy, index);
                }, 1000 * 60 * 60 * 24); // 每24小时检查一次

            } catch (error) {
                log.error(`处理账户 ${index + 1} 时出错: ${error.message}`);
            }
        });

        await Promise.all(tasks);
    } catch (error) {
        log.error(`主循环出错: ${error.message}`);
    }
};

// 检查和领取用户奖励的函数
const checkUserRewards = async (token, proxy, index) => {
    try {
        const response = await utils.getUserRef(token, proxy)
        const { total_unclaimed_points } = response?.data || 0;
        if (total_unclaimed_points > 0) {
            log.info(`账户 ${index + 1} 有 ${total_unclaimed_points} 个未领取的积分，正在尝试领取...`);
            const claimResponse = await utils.claimPoints(token, proxy);
            if (claimResponse.code === 200) {
                log.info(`账户 ${index + 1} 成功领取了 ${total_unclaimed_points} 个积分！`);
            }
        }
    } catch (error) {
        log.error(`检查用户奖励时出错: ${error.message}`);
    }
}

// 处理进程终止信号
process.on('SIGINT', () => {
    log.warn(`收到 SIGINT 信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log.warn(`收到 SIGTERM 信号，正在清理并退出程序...`);
    rl.close();
    process.exit(0);
});

// 运行主函数
main();
