import { loadMCVersions, mcVersions } from "./assets"
import { navigateToPath, setState, updateBackButtonState, updateFiles } from "./filelist"

window.onload = async _ => {
    updateBackButtonState()
    updateFiles([])
    setState({ isLoading: true, loadingMessage: 'Loading Minecraft Versions...' })
    await loadMCVersions()
    let mcVersion = document.getElementById('mcVersion')
    mcVersion.innerHTML = '<option value="">Select a version</option>'
    Object.keys(mcVersions).forEach(x => mcVersion.innerHTML += `<option value=${x}>${x}</option>`)
    setState({ isLoading: false })
}

window.switchVersion = _ => navigateToPath('/')
