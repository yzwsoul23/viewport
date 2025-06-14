// 存储所有题目
let questions = [];
let correctAnswers = {};
let db;

// 初始化数据库
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('QuizDatabase', 1);
        
        request.onerror = (event) => {
            console.error('数据库打开失败:', event.target.errorCode);
            reject(event.target.errorCode);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('数据库连接成功');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // 创建题库存储对象
            if (!db.objectStoreNames.contains('questions')) {
                db.createObjectStore('questions', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// 保存题库到数据库
function saveQuestionsToDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('数据库未初始化');
            return;
        }
        
        const transaction = db.transaction(['questions'], 'readwrite');
        const store = transaction.objectStore('questions');
        
        // 清空旧数据
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
            // 添加新数据
            const data = {
                questions: questions,
                correctAnswers: correctAnswers,
                timestamp: new Date().getTime()
            };
            
            const addRequest = store.add(data);
            
            addRequest.onsuccess = () => {
                console.log('题库保存成功');
                resolve();
            };
            
            addRequest.onerror = (event) => {
                console.error('题库保存失败:', event.target.error);
                reject(event.target.error);
            };
        };
    });
}

// 从数据库加载题库
function loadQuestionsFromDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('数据库未初始化');
            return;
        }
        
        const transaction = db.transaction(['questions'], 'readonly');
        const store = transaction.objectStore('questions');
        
        // 获取最新的题库数据
        const request = store.openCursor(null, 'prev');
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const data = cursor.value;
                questions = data.questions;
                correctAnswers = data.correctAnswers;
                console.log('题库加载成功');
                resolve(data);
            } else {
                console.log('没有找到题库数据');
                resolve(null);
            }
        };
        
        request.onerror = (event) => {
            console.error('题库加载失败:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 显示正确答案
function showCorrectAnswers(question) {
    const type = question.dataset.type;
    const questionNumber = question.querySelector('h3').textContent.split('.')[0];
    const questionId = 'q' + questionNumber;
    const options = question.querySelectorAll('.options label');

    // 重置所有选项的样式
    options.forEach(option => {
        option.classList.remove('correct', 'incorrect');
    });

    if (type === 'single' || type === 'true-false') {
        const correctOption = question.querySelector(`input[value="${correctAnswers[questionId]}"]`).parentElement;
        correctOption.classList.add('correct');
    } else if (type === 'multiple') {
        const correct = correctAnswers[questionId];
        // 标记所有正确选项
        correct.forEach(value => {
            question.querySelector(`input[value="${value}"]`).parentElement.classList.add('correct');
        });
    }
}

// 搜索功能
function searchQuestions() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const questions = document.querySelectorAll('.question');
    
    questions.forEach(question => {
        const questionText = question.querySelector('h3').textContent.toLowerCase();
        const options = question.querySelectorAll('.options label');
        let found = false;

        // 检查题目文本
        if (questionText.includes(searchText)) {
            found = true;
        }

        // 检查选项文本
        options.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            if (optionText.includes(searchText)) {
                found = true;
            }
        });

        // 显示或隐藏问题
        if (found) {
            question.style.display = 'block';
            showCorrectAnswers(question);
        } else {
            question.style.display = 'none';
        }
    });
}

// 检查答案
function checkAnswers() {
    const questions = document.querySelectorAll('.question');
    let score = 0;
    let total = questions.length;

    questions.forEach(question => {
        const type = question.dataset.type;
        const questionNumber = question.querySelector('h3').textContent.split('.')[0];
        const questionId = 'q' + questionNumber;
        const options = question.querySelectorAll('.options label');

        // 重置所有选项的样式
        options.forEach(option => {
            option.classList.remove('incorrect');
        });

        if (type === 'single' || type === 'true-false') {
            const selected = question.querySelector('input[type="radio"]:checked');
            if (selected) {
                if (selected.value === correctAnswers[questionId]) {
                    score++;
                } else {
                    selected.parentElement.classList.add('incorrect');
                }
            }
        } else if (type === 'multiple') {
            const selected = Array.from(question.querySelectorAll('input[type="checkbox"]:checked'))
                .map(input => input.value);
            const correct = correctAnswers[questionId];
            
            // 标记错误选项
            selected.forEach(value => {
                if (!correct.includes(value)) {
                    question.querySelector(`input[value="${value}"]`).parentElement.classList.add('incorrect');
                }
            });
            
            if (selected.length === correct.length && 
                selected.every(value => correct.includes(value))) {
                score++;
            }
        }
    });

    // 显示结果
    alert(`得分：${score}/${total}`);
}

// 创建题目HTML
function createQuestionHTML(question, index) {
    const type = question.type;
    const options = question.options;
    const correctAnswer = question.correctAnswer;
    
    let optionsHTML = '';
    if (type === 'single') {
        options.forEach((option, i) => {
            const value = String.fromCharCode(65 + i);
            // 提取选项内容，去除前面的字母和冒号
            const optionText = option.substring(2).trim();
            optionsHTML += `
                <label>
                    <input type="radio" name="q${index}" value="${value}">
                    ${value}. ${optionText}
                </label>
            `;
        });
    } else if (type === 'multiple') {
        options.forEach((option, i) => {
            const value = String.fromCharCode(65 + i);
            // 提取选项内容，去除前面的字母和冒号
            const optionText = option.substring(2).trim();
            optionsHTML += `
                <label>
                    <input type="checkbox" name="q${index}" value="${value}">
                    ${value}. ${optionText}
                </label>
            `;
        });
    } else if (type === 'true-false') {
        optionsHTML = `
            <label>
                <input type="radio" name="q${index}" value="A">
                正确
            </label>
            <label>
                <input type="radio" name="q${index}" value="B">
                错误
            </label>
        `;
    }

    // 提取题目内容，去除前面的序号
    const titleParts = question.title.split('.');
    titleParts.shift(); // 移除第一部分（序号）
    const titleText = titleParts.join('.').trim();

    return `
        <div class="question" data-type="${type}">
            <h3>${index}. ${titleText}</h3>
            <div class="options">
                ${optionsHTML}
            </div>
        </div>
    `;
}

// 解析题目文本
function parseQuestions(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const questions = [];
    let currentQuestion = null;
    let currentType = 'single'; // 默认题型为单选题
    
    for (let line of lines) {
        // 检查题型标记
        if (line === '单选题') {
            currentType = 'single';
            continue;
        } else if (line === '多选题') {
            currentType = 'multiple';
            continue;
        } else if (line === '判断题') {
            currentType = 'true-false';
            continue;
        }

        // 检查是否是题目（以数字和点开头）
        if (/^\d+\./.test(line)) {
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            currentQuestion = {
                title: line,
                type: currentType,
                options: [],
                correctAnswer: []
            };
        }
        // 检查是否是选项（以字母和冒号开头）
        else if (/^[A-Z]:/.test(line)) {
            if (currentQuestion) {
                currentQuestion.options.push(line);
            }
        }
        // 检查是否是答案
        else if (line.startsWith('正确答案：')) {
            if (currentQuestion) {
                const answer = line.substring(5).trim();
                if (currentType === 'true-false') {
                    currentQuestion.correctAnswer = [answer === '对' ? 'A' : 'B'];
                } else if (currentType === 'multiple') {
                    currentQuestion.correctAnswer = answer.split(' ').map(a => a.trim());
                } else {
                    currentQuestion.correctAnswer = [answer];
                }
            }
        }
    }
    
    if (currentQuestion) {
        questions.push(currentQuestion);
    }
    
    return questions;
}

// 导入题库
function importQuestions(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        questions = parseQuestions(text);
        correctAnswers = {};
        
        // 更新正确答案映射
        questions.forEach((q, index) => {
            correctAnswers[`q${index + 1}`] = q.correctAnswer;
        });
        
        // 更新页面显示
        renderQuestions();
        
        // 保存到数据库
        saveQuestionsToDatabase()
            .then(() => {
                console.log('题库已保存到数据库');
            })
            .catch(error => {
                console.error('保存题库失败:', error);
            });
    };
    reader.readAsText(file);
}

// 渲染题目到页面
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = questions.map((q, i) => createQuestionHTML(q, i + 1)).join('');
    
    // 显示所有正确答案
    document.querySelectorAll('.question').forEach(question => {
        showCorrectAnswers(question);
    });
}

// 导出题库
function exportQuestions() {
    let text = '';
    let currentType = '';
    
    questions.forEach((q, index) => {
        // 添加题型标记
        if (q.type !== currentType) {
            currentType = q.type;
            if (currentType === 'single') {
                text += '单选题\n';
            } else if (currentType === 'multiple') {
                text += '多选题\n';
            } else if (currentType === 'true-false') {
                text += '判断题\n';
            }
        }
        
        // 添加题目
        text += `${index + 1}. ${q.title}\n`;
        
        // 添加选项
        q.options.forEach(option => {
            text += `${option}\n`;
        });
        
        // 添加答案
        if (q.type === 'true-false') {
            text += `正确答案：${q.correctAnswer[0] === 'A' ? '对' : '错'}\n\n`;
        } else {
            text += `正确答案：${q.correctAnswer.join(' ')}\n\n`;
        }
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 初始化数据库
    initDatabase()
        .then(() => {
            // 尝试从数据库加载题库
            return loadQuestionsFromDatabase();
        })
        .then(data => {
            if (data) {
                // 如果有数据，渲染到页面
                renderQuestions();
            }
        })
        .catch(error => {
            console.error('数据库操作失败:', error);
        });

    // 文件导入监听
    document.getElementById('fileInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            importQuestions(e.target.files[0]);
        }
    });

    // 搜索监听
    document.getElementById('searchInput').addEventListener('input', searchQuestions);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchQuestions();
        }
    });
}); 
