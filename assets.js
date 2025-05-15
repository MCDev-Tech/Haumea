import JSZip from "jszip"
import { updateLoadingMessage } from "./filelist"
import { postError, proxyFetch } from "./util"

export let mcVersions = {}, latestVersion
let filesByVersion = {}

export async function pullCache(mcVersion, path, hash) {
    let blob = await proxyFetch(`https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`).then(res => res.blob()).catch(postError)
    filesByVersion[mcVersion][path] = { type: 'direct', blob: blob }
    return blob
}

export async function loadMCVersions() {
    let versions = await proxyFetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json').then(res => res.json()).catch(postError)
    for (let { id, type, url } of versions.versions)
        mcVersions[id] = { type, url }
    latestVersion = versions.latest.release
}

export async function loadVersionAssets(mcVersion) {
    if (!mcVersions[mcVersion] || filesByVersion[mcVersion]) return
    let { url } = mcVersions[mcVersion]
    let meta = await proxyFetch(url).then(res => res.json()).catch(postError)
    let clientJarUrl = meta?.downloads?.client?.url, assetsIndexUrl = meta?.assetIndex?.url
    filesByVersion[mcVersion] = await resolveAssetsIndex(assetsIndexUrl)
    if (document.getElementById('unzip-jar').checked)
        Object.assign(filesByVersion[mcVersion], await resolveJar(clientJarUrl))
}

const resolveJar = async url => {
    let start = Date.now()
    updateLoadingMessage('Downloading client jar...')
    console.log('Start download ' + url)
    const response = await proxyFetch(url).then(res => res.blob()).catch(postError)
    console.log('Start resolve jar')
    updateLoadingMessage('Unzipping jar, this may take a while...')
    const zip = await JSZip.loadAsync(response)
    const files = {}
    for (const [relativePath, file] of Object.entries(zip.files))
        if (!file.dir && (relativePath.startsWith('assets') || relativePath.startsWith('data')))
            files['/' + relativePath] = { type: 'direct', blob: await file.async('blob') }
    let end = Date.now() - start
    console.log(`Resolve jar in ${end / 1000} seconds`)
    return files
}

const resolveAssetsIndex = async url => {
    updateLoadingMessage('Downloading assets index...')
    const index = await proxyFetch(url).then(res => res.json()).catch(postError)
    let assets = {}
    Object.keys(index.objects).forEach(x => assets['/assets/' + x] = { type: 'index', hash: index.objects[x].hash })
    return assets
}

export async function getFilesInPath(path) {
    let mcVersion = document.getElementById('mcVersion').value
    if (!mcVersions[mcVersion]) return []
    await loadVersionAssets(mcVersion)
    let files = filesByVersion[mcVersion]
    return findFilesInFolder(files, path)
}

const findFilesInFolder = (files, folderPath) => {
    const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : folderPath + '/'
    const result = []
    const seenNames = new Set()

    Object.entries(files).forEach(pair => {
        let [filePath, data] = pair
        if (filePath.startsWith(normalizedFolderPath)) {
            const remainingPath = filePath.slice(normalizedFolderPath.length)
            const isFile = !remainingPath.includes('/') && !filePath.endsWith('/')
            const isFolder = remainingPath.includes('/') || filePath.endsWith('/')
            if (isFile) result.push({
                name: remainingPath,
                type: 'file',
                path: filePath,
                data: data
            })
            else if (isFolder) {
                const firstLevelName = remainingPath.split('/')[0]
                const folderFullPath = `${normalizedFolderPath}${firstLevelName}/`
                if (!seenNames.has(folderFullPath)) {
                    seenNames.add(folderFullPath)
                    result.push({
                        name: firstLevelName,
                        type: 'folder',
                        path: folderFullPath,
                    })
                }
            }
        }
    })
    return result
}