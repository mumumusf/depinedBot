import randomUseragent from 'random-useragent';
import log from './logger.js';
import { newAgent } from './helper.js';

const userAgent = randomUseragent.getRandom();
const headers = {
    'accept': 'application/json',
    'user-agent': userAgent,
    'Origin': 'chrome-extension://pjlappmodaidbdjhmhifbnnmmkkicjoc',
    'Content-Type': 'application/json',
    "X-Requested-With": "XMLHttpRequest"
};

const fetchWithTimeout = async (url, options = {}, timeout = 60000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { 
            ...options, 
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export async function getUserInfo(token, proxy) {
    const agent = newAgent(proxy);
    const url = 'https://api.depined.org/api/user/details';
    try {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                ...headers,
                'Authorization': `Bearer ${token}`,
            },
            agent,
        });
        return await response.json();
    } catch (error) {
        log.error('获取用户信息失败:', error.message || error);
        return null;
    }
}

export const getUserRef = async (token, proxy) => {
    const agent = newAgent(proxy);
    const url = 'https://api.depined.org/api/referrals/stats';
    try {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                ...headers,
                'Authorization': `Bearer ${token}`,
            },
            agent,
        });
        return await response.json();
    } catch (error) {
        log.error('获取推荐统计失败:', error.message || error);
        return null;
    }
};

export const getEarnings = async (token, proxy) => {
    const agent = newAgent(proxy);
    const url = 'https://api.depined.org/api/stats/epoch-earnings';
    try {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                ...headers,
                'Authorization': `Bearer ${token}`,
            },
            agent,
        });
        return await response.json();
    } catch (error) {
        log.error('获取收益信息失败:', error.message || error);
        return null;
    }
};

export const connect = async (token, proxy) => {
    const agent = newAgent(proxy);
    const url = 'https://api.depined.org/api/user/widget-connect';
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ connected: true }),
            agent,
        });
        const data = await response.json();
        log.info('节点连接成功');
        return data;
    } catch (error) {
        log.error(`节点连接失败: ${error.message}`);
        return null;
    }
};

export const claimPoints = async (token, proxy) => {
    const agent = newAgent(proxy);
    const url = 'https://api.depined.org/api/referrals/claim_points';
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({}),
            agent,
        });
        const data = await response.json();
        log.info('积分领取成功');
        return data;
    } catch (error) {
        log.error(`领取积分失败: ${error.message}`);
        return null;
    }
};
