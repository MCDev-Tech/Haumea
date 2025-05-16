import { getFilesInPath, pullCache } from "./assets"
import { displayContent } from "./preview"
import { packDownload } from "./util"

// 全局状态
const state = {
    currentPath: '/',
    originalFiles: [],
    currentFiles: [],
    selectedFiles: new Set(),
    isLoading: false,
    loadingMessage: 'Loading...'
}

// DOM 元素
const fileListContainer = document.getElementById('fileListContainer')
const breadcrumbs = document.getElementById('breadcrumbs')
const searchInput = document.getElementById('searchInput')
const sortSelect = document.getElementById('sortSelect')
const downloadBtn = document.getElementById('downloadBtn')

export function updateFiles(files) {
    state.originalFiles = [...files]
    applySearchAndSort()
    renderFileList()
    renderBreadcrumbs()
}

export function updateLoadingMessage(message) {
    state.loadingMessage = message
    renderFileList()
}

function applySearchAndSort() {
    const searchTerm = searchInput.value.toLowerCase().trim()
    const sortOption = sortSelect.value

    let filteredFiles = state.originalFiles
    if (searchTerm)
        filteredFiles = filteredFiles.filter(file => file.name.toLowerCase().includes(searchTerm))

    const [sortBy, sortOrder] = sortOption.split('-')
    const sortFactor = sortOrder === 'asc' ? 1 : -1
    state.currentFiles = [...filteredFiles].sort((a, b) => {
        if (sortBy === 'type') {
            const aIsFolder = a.type === 'folder' ? 0 : 1
            const bIsFolder = b.type === 'folder' ? 0 : 1
            if (aIsFolder !== bIsFolder)
                return aIsFolder - bIsFolder
            return a.name.localeCompare(b.name) * sortFactor
        }
        return 0
    })
}

window.goBack = _ => {
    const pathParts = state.currentPath.split('/').filter(part => part)
    if (pathParts.length === 0) return
    navigateToPath('/' + pathParts.slice(0, -1).join('/'))
}

function renderFileList() {
    fileListContainer.innerHTML = ''
    if (state.isLoading) {
        fileListContainer.appendChild(createLoadingOverlay(state.loadingMessage))
        return
    }
    if (state.currentFiles.length === 0) {
        fileListContainer.appendChild(createEmptyState())
        return
    }
    state.currentFiles.forEach(file => {
        // 图标
        const iconDiv = document.createElement('div')
        iconDiv.className = `icon-base ${file.type === 'folder' ? 'folder-icon' : 'file-icon'}`
        // 文件名
        const nameDiv = document.createElement('div')
        nameDiv.className = 'file-name'
        nameDiv.textContent = file.name
        // 勾选框（仅文件显示）
        let checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'checkbox'
        checkbox.checked = state.selectedFiles.has(file)
        checkbox.disabled = file.type === 'folder'
        //整体
        const item = document.createElement('div')
        item.className = 'file-item'
        item.dataset.path = file.path
        item.onclick = (e) => {
            if (e.target.type === 'checkbox') return
            onClickObject(file, checkbox)
        }
        item.ondblclick = _ => onDoubleClickObject(file)

        // 勾选状态管理
        checkbox.onchange = (e) => {
            if (e.target.checked) state.selectedFiles.add(file)
            else state.selectedFiles.delete(file)
            updateDownloadButtonState()
        }
        item.appendChild(checkbox)
        item.appendChild(iconDiv)
        item.appendChild(nameDiv)
        fileListContainer.appendChild(item)
    })

    updateDownloadButtonState()
}

// 渲染面包屑导航
function renderBreadcrumbs() {
    breadcrumbs.innerHTML = ''
    const pathParts = state.currentPath.split('/').filter(part => part)
    let currentPath = ''
    // 添加根目录
    addBreadcrumbItem('/', '/')
    // 添加子目录
    pathParts.forEach((part, index) => {
        currentPath += `/${part}`
        const isLast = index === pathParts.length - 1
        addBreadcrumbItem(currentPath, part, isLast)
    })
}

function addBreadcrumbItem(path, name, isLast = false) {
    if (isLast) {
        const span = document.createElement('span')
        span.className = 'breadcrumb-item font-bold'
        span.textContent = name
        breadcrumbs.appendChild(span)
    } else {
        const link = document.createElement('div')
        link.className = 'breadcrumb-item'
        link.href = '#'
        link.textContent = name
        link.onclick = (e) => {
            e.preventDefault()
            navigateToPath(path)
        }
        breadcrumbs.appendChild(link)

        const separator = document.createElement('span')
        separator.className = 'breadcrumb-separator'
        separator.textContent = '>'
        breadcrumbs.appendChild(separator)
    }
}

export async function navigateToPath(path) {
    state.selectedFiles.clear()
    setState({ currentPath: path })
    updateBackButtonState()
    setState({ isLoading: true, loadingMessage: 'Loading Files...' })
    updateFiles(await getFilesInPath(path))
    setState({ isLoading: false })
}

const onClickObject = async (targetFile, checkbox) => {
    if (targetFile.type !== 'folder') checkbox.checked ^= true
}

const onDoubleClickObject = async targetFile => {
    if (targetFile.type === 'folder')
        navigateToPath(state.currentPath === '/' ? `/${targetFile.name}` : `${state.currentPath}/${targetFile.name}`)
    else displayContent(targetFile)
}

const downloadAll = async files => {
    setState({ isLoading: true, loadingMessage: 'Downloading...' });
    console.log('开始下载文件:', [...files])
    let mcVersion = document.getElementById('mcVersion').value
    for (let { path, data } of files.filter(x => x.data.type == 'index'))
        data.blob = await pullCache(mcVersion, path, data.url)
    await packDownload(files.map(x => {
        let path = x.path.replace(state.currentPath)
        return { path: path, data: x.data.blob, name: x.name }
    }))
    state.selectedFiles.clear()
    updateDownloadButtonState()
    setState({ isLoading: false })
}

window.handleDownloadAll = _ => {
    downloadAll([...state.selectedFiles])
}

const updateDownloadButtonState = _ => {
    downloadBtn.disabled = state.selectedFiles.size === 0
}

export function createLoadingOverlay(text) {
    const overlay = document.createElement('div')
    overlay.className = 'loading-overlay'
    const spinner = document.createElement('div')
    spinner.className = 'spinner'
    const message = document.createElement('div')
    message.className = 'loading-message'
    message.textContent = text
    overlay.appendChild(spinner)
    overlay.appendChild(message)
    return overlay
}

const createEmptyState = _ => {
    const emptyState = document.createElement('div')
    emptyState.className = 'empty-state'
    const icon = document.createElement('div')
    icon.className = 'file-icon folder-icon'
    icon.style.width = '40px'
    icon.style.height = '40px'
    icon.style.marginBottom = '10px'
    const text = document.createElement('div')
    text.textContent = 'No File Found'
    emptyState.appendChild(icon)
    emptyState.appendChild(text)
    return emptyState
}

export function setState(newState) {
    Object.assign(state, newState)
    renderFileList()
}

window.reloadFileList = _ => {
    applySearchAndSort()
    renderFileList()
}

export function updateBackButtonState() {
    const pathParts = state.currentPath.split('/').filter(part => part)
    document.getElementById('backBtn').disabled = pathParts.length === 0
}