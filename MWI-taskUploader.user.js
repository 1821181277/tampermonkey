// ==UserScript==
// @name         MWI Task Uploader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动获取MWI任务列表并上传到指定服务器
// @author       fennel
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadUrl  
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 配置
    const CONFIG = {
        UPLOAD_URL: "http://47.122.64.120:8080/api/tasks/upload", // 替换为您的服务器URL
        UPLOAD_INTERVAL: 30000, // 上传间隔(毫秒)
        ENABLED: true // 启用/禁用上传功能
    };

    // 任务类型映射
    const TASK_TYPES = {
        "Milking": "milking",
        "Foraging": "foraging",
        "Woodcutting": "woodcutting",
        "Cheesesmithing": "cheesesmithing",
        "Crafting": "crafting",
        "Tailoring": "tailoring",
        "Cooking": "cooking",
        "Brewing": "brewing",
        "Alchemy": "alchemy",
        "Enhancing": "enhancing",
        "Defeat": "combat",
        // 中文版本
        "挤奶": "milking",
        "采摘": "foraging",
        "伐木": "woodcutting",
        "奶酪锻造": "cheesesmithing",
        "制作": "crafting",
        "缝纫": "tailoring",
        "烹饪": "cooking",
        "冲泡": "brewing",
        "炼金": "alchemy",
        "强化": "enhancing",
        "击败": "combat"
    };

    // 获取任务数据
    function getTasksData() {
        const tasks = [];
        const taskElements = document.querySelectorAll("div.TasksPanel_taskList__2xh4k div.RandomTask_randomTask__3B9fA");
        const userName=document.querySelector(".CharacterName_name__1amXp").textContent;

        if (taskElements.length === 0) {
            console.log("MWI Task Uploader: 未找到任务元素");
            return null;
        }

        taskElements.forEach(taskElement => {
            try {
                // 获取任务名称
                const nameElement = taskElement.querySelector(".RandomTask_name__1hl1b");
                if (!nameElement) return;

                const progressDiv = Array.from(taskElement.querySelectorAll("div"))
                .find(div => div.textContent.startsWith("进度:"));

                const progressText = progressDiv.textContent.trim();
                const fullTaskName = nameElement.textContent.trim();

                // 解析任务类型和名称
                let taskType = "unknown";
                let taskName = fullTaskName;

                if (fullTaskName.includes(" - ")) {
                    const parts = fullTaskName.split(" - ");
                    const typePart = parts[0];
                    taskName = parts[1];

                    if (TASK_TYPES[typePart]) {
                        taskType = TASK_TYPES[typePart];
                    }
                }



                // 添加到任务列表
                tasks.push({
                    type: taskType,
                    name: taskName,
                    fullName: fullTaskName,
                    progress:progressText
                });
            } catch (error) {
                console.error("MWI Task Uploader: 解析任务时出错", error);
            }
        });

        return {
            tasks: tasks,
            userName: userName,
            totalCount: tasks.length,
            timestamp: new Date().toISOString(),
            location: window.location.href
        };
    }

    // 上传任务数据
    function uploadTasks(data) {
        if (!CONFIG.ENABLED || !CONFIG.UPLOAD_URL) {
            console.log("MWI Task Uploader: 上传功能已禁用或未配置URL");
            return;
        }

        console.log("MWI Task Uploader: 开始上传任务数据", data);

        GM_xmlhttpRequest({
            method: "POST",
            url: CONFIG.UPLOAD_URL,
            data: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            },
            onload: function(response) {
                console.log("MWI Task Uploader: 任务上传成功", response.status, response.responseText);
            },
            onerror: function(error) {
                console.error("MWI Task Uploader: 任务上传失败", error);
            }
        });
    }

    // 主函数 - 获取并上传任务
    function processAndUploadTasks() {
        const tasksData = getTasksData();
        if (tasksData && tasksData.tasks.length > 0) {
            uploadTasks(tasksData);
        }
    }

    // 使用MutationObserver监听DOM变化
    function setupObserver() {
        const observer = new MutationObserver(function(mutations) {
            let shouldProcess = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 检查是否有任务相关的元素被添加
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && (
                            node.classList.contains('RandomTask_randomTask__3B9fA') ||
                            (node.querySelector && node.querySelector('.RandomTask_randomTask__3B9fA'))
                        )) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }

                if (shouldProcess) break;
            }

            if (shouldProcess) {
                // 延迟处理以确保DOM完全更新
                setTimeout(processAndUploadTasks, 1000);
            }
        });

        // 开始观察DOM变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log("MWI Task Uploader: DOM观察器已启动");
    }

    // 初始化
    function init() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(init, 2000); // 额外等待2秒确保游戏界面加载
            });
            return;
        }

        // 设置定时上传
        setInterval(processAndUploadTasks, CONFIG.UPLOAD_INTERVAL);

        // 设置DOM观察器
        setupObserver();

        // 立即执行一次上传
        setTimeout(processAndUploadTasks, 5000);

        console.log("MWI Task Uploader: 脚本已初始化");
    }

    // 启动脚本
    init();
})();
