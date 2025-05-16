import JSZip from "jszip"

// 存储当前所有弹窗的数组
let errorPopups = []

export function postError(err) {
    let message = `${err.name}: ${err.message}`
    console.error(message)
    postErrorMessage(message)
}

export function postErrorMessage(message) {
    // 创建弹窗元素
    const errorPopup = document.createElement('div')
    errorPopup.className = 'error-popup'
    // 创建错误消息文本
    const errorText = document.createElement('p')
    errorText.textContent = message
    errorPopup.appendChild(errorText)
    // 将弹窗添加到页面
    document.body.appendChild(errorPopup)
    // 将弹窗添加到数组
    errorPopups.push(errorPopup)
    // 使用 setTimeout 确保 DOM 已渲染后再计算位置
    setTimeout(() => {
        updatePopupPositions()
    }, 0)
    // 点击弹窗时淡出并移除
    errorPopup.addEventListener('click', function () {
        errorPopup.classList.add('fade-out')
        setTimeout(() => {
            document.body.removeChild(errorPopup)
            // 从数组中移除
            errorPopups = errorPopups.filter(popup => popup !== errorPopup)
            // 重新计算剩余弹窗位置
            updatePopupPositions()
        }, 300) // 等待淡出动画完成
    })
}

function updatePopupPositions() {
    const startTop = 20 // 第一个弹窗距离顶部的距离
    const spacing = 10  // 弹窗之间的间距

    let currentTop = startTop
    errorPopups.forEach(popup => {
        popup.style.top = `${currentTop}px`
        currentTop += popup.offsetHeight + spacing
    })
}

export async function packDownload(files) {
    let content, fileName
    if (files.length == 1) {
        content = files[0].data
        fileName = files[0].name
    } else {
        const zip = new JSZip()
        for (let { path, data } of files) zip.file(path, data)
        content = await zip.generateAsync({ type: 'blob' })
        fileName = `assets-${Date.now()}.zip`
    }
    // 创建下载链接并触发点击
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url;
    a.download = fileName
    document.body.appendChild(a)
    a.click()
}

export async function proxyFetch(url) {
    if (url.startsWith('https://resources.download.minecraft.net'))
        url = url.replace('https://resources.download.minecraft.net', 'https://proxy.mcdev.tech/mc-resource')
    return await fetch(url).catch(postError)
}