import { pullCache } from "./assets";
import { createLoadingOverlay } from "./filelist";
import { postError, postErrorMessage, proxyFetch } from "./util";

const modal = document.getElementById('contentModal');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileDisplay = document.getElementById('fileDisplay');
const closeBtn = document.querySelector('.close');

closeBtn.onclick = _ => {
    modal.style.display = "none";
    fileDisplay.innerHTML = '';
}

// 点击弹窗外部关闭
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
        fileDisplay.innerHTML = '';
    }
}

/**
 * 显示文件内容的函数
 * @param {string} fileName - 文件名，用于判断文件类型
 * @param {Blob|string} content - 文件内容，可以是Blob对象或URL字符串
 */
export async function displayContent(file) {
    let { name, data, path } = file
    fileNameDisplay.textContent = 'Preview: ' + name;
    const fileType = getFileType(name);

    modal.style.display = "block";
    try {
        if (data.type == 'direct') await displayBlobContent(data.blob, fileType);
        else if (data.type == 'index') await displayUrlContent(data, path, fileType);
        else postErrorMessage('Unsupported data type')
    } catch (error) {
        console.error('Failed to display content:', error);
        fileDisplay.innerHTML = `<div class="text-content">Cannot display content: ${error.message}</div>`;
        postError(error)
    }
}

/**
 * 根据文件名获取文件类型
 * @param {string} fileName 
 * @returns {string} 文件类型
 */
function getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    // 图片类型
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    if (imageExtensions.includes(extension))
        return 'picture'
    // 音频类型
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    if (audioExtensions.includes(extension))
        return 'sound';
    return 'text';
}

/**
 * 显示Blob内容
 * @param {Blob} blob 
 * @param {string} fileType 
 */
async function displayBlobContent(blob, fileType) {
    if (fileType === 'picture') {
        const url = URL.createObjectURL(blob);
        fileDisplay.innerHTML = `<img src="${url}">`;
    } else if (fileType === 'sound') {
        const url = URL.createObjectURL(blob);
        fileDisplay.innerHTML = `<audio controls><source src="${url}" type="${blob.type}">Your browser don't support audio</audio>`;
    } else {
        const text = await blob.text();
        displayTextWithLineNumbers(text);
    }
}

/**
 * 显示URL内容
 * @param {string} url 
 * @param {string} fileType 
 */
async function displayUrlContent(data, path, fileType) {
    if (fileType === 'picture')
        fileDisplay.innerHTML = `<img src="${data.url}">`;
    else if (fileType === 'sound')
        fileDisplay.innerHTML = `<audio controls><source src="${data.url}">Your browser don't support audio</audio>`;
    else {
        let overlay = createLoadingOverlay('Loading content...')
        let fileDisplay = document.getElementById('fileDisplay')
        fileDisplay.appendChild(overlay)
        let mcVersion = document.getElementById('mcVersion').value
        data.blob = await pullCache(mcVersion, path, data.url)
        fileDisplay.removeChild(overlay)
        displayTextWithLineNumbers(await data.blob.text())
    }
}

/**
 * 显示带行号的文本内容
 * @param {string} text 
 */
function displayTextWithLineNumbers(text) {
    const lines = text.split('\n');
    const lineCount = lines.length;
    // 创建行号HTML - 只创建可见区域的行号
    let lineNumbersHTML = '';
    for (let i = 1; i <= lineCount; i++)
        lineNumbersHTML += `${i}<br>`;
    // 构建显示区域
    fileDisplay.innerHTML = `
        <div class="text-container">
            <div class="line-numbers">${lineNumbersHTML}</div>
            <div class="text-content-wrapper">
                <div class="text-content">${escapeHtml(text)}</div>
            </div>
        </div>
    `;
    // 同步滚动
    const lineNumbers = fileDisplay.querySelector('.line-numbers');
    const textContentWrapper = fileDisplay.querySelector('.text-content-wrapper');
    textContentWrapper.addEventListener('scroll', function () {
        lineNumbers.scrollTop = textContentWrapper.scrollTop;
    });
}

/**
 * HTML转义，防止XSS攻击
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}