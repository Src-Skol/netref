class Browser {
    currentWebsite = ""
    currentTitle = ""
    encodedWebSite = ""
    encodedTitle = ""

    loadingSite = ""

    lastSpeedTestDate = 0
    downloadSpeed = 0
    uploadSpeed = 0

    mouseoverInterval = 0

    screenshot = ""


    screenshotTime = Date.now()
    screenshotSite = ""
    previousScreenshotSite = ""
    previousScreenshotImage = ""

    machineName = ""
    emailAddress = ""
    directoryId = ""

    connectedToApp = false
    connectedToWebserver = false

    localConfig = "http://localhost:5555/config"


    extensionHost = "https://webserver.net-ref.com/extension/cloud/update"
    filesHost = "https://files.net-ref.com/screenshot/upload"
    denyHost = "https://webserver.net-ref.com/block?redirected_url="


    defaultExtensionHost = "https://webserver.net-ref.com/extension/cloud/update"
    defaultFilesHost = "https://files.net-ref.com/screenshot/upload"
    defaultDenyHost = "https://webserver.net-ref.com/block?redirected_url="

    configIsDefault = true


    constructor() {
    }

    getEmailAddress() {
        try {
            // unless the user has enabled "Account Sync", this will be empty. We change the default to 'ANY' to support cases where the
            // account is not in the "sync" state.
            chrome.identity.getProfileUserInfo({accountStatus: 'ANY'}, function(info) {
                try {
                    browser.emailAddress = encodeURIComponent(info.email).toLowerCase()
                } catch (e) {
                    browser.emailAddress = ""
                }

                // run 5 seconds AFTER it's been retrieved
                setTimeout(browser.getEmailAddress, 5000)
            })
        } catch (ignored) {
            setTimeout(browser.getEmailAddress, 5000)
        }
    }

    getDirectoryId() {
        try {
            chrome.enterprise.deviceAttributes.getDirectoryDeviceId(function (id) {
                if (id.length > 0) {
                    browser.directoryId = id
                } else {
                    browser.directoryId = ""
                }

                // run 5 seconds AFTER it's been retrieved
                setTimeout(browser.getDirectoryId, 5000)
            })
        } catch (ignored) {
            setTimeout(browser.getDirectoryId, 5000)
        }
    }

    getSerialNumber() {
        try {
            chrome.enterprise.deviceAttributes.getDeviceSerialNumber(function (id) {
                if (id.length > 0) {
                    browser.machineName = id
                } else {
                    browser.machineName = ""
                }


                // run 5 seconds AFTER it's been retrieved
                setTimeout(browser.getSerialNumber, 5000)
            })
        } catch (ignored) {
            setTimeout(browser.getSerialNumber, 5000)
        }
    }

    getAssetId() {
        try {
            chrome.enterprise.deviceAttributes.getDeviceAssetId(function (id) {
                if (id.length > 0) {
                    browser.machineName = id
                } else {
                    browser.machineName = ""
                }

                // run 5 seconds AFTER it's been retrieved
                setTimeout(browser.getAssetId, 5000)
            })
        } catch (ignored) {
            setTimeout(browser.getAssetId, 5000)
        }
    }

    getLocalConfigUrl() {
        try {
            // ALWAYS try to connect to local CONFIG every 5 seconds.
            // IF WE CAN CONNECT... this will then notify the rest of the app
            fetch(browser.localConfig, {
                mode: "no-cors"
            })
            .then(function (response) {
                let newState = response.status === 200
                if (newState !== browser.connectedToApp) {
                    // the state changed! Trigger updates.
                    console.log("Local connection state changed (" + browser.connectedToApp + " -> " + newState + ")")
                }

                if (newState) {
                    browser.parseUpdatesConfiguration(response)
                }

                browser.connectedToApp = newState
            })
            .catch(function(e) {
                let newState = false
                if (newState !== browser.connectedToApp) {
                    // the state changed! Trigger updates.
                    console.log("Local connection state changed (" + browser.connectedToApp + " -> " + newState + ")")
                }

                browser.connectedToApp = newState
            })
        } finally {
            if (!browser.connectedToApp && !browser.connectedToWebserver) {
                browser.resetUpdatesConfiguration()
            }

            setTimeout(browser.getLocalConfigUrl, 5000)
        }
    }

    getRemoteConfigUrl() {
        try {
            if (browser.connectedToApp) {
                // don't try to get remote config if we are connected to the local machine
                browser.connectedToWebserver = false
                return
            }

            if (browser.emailAddress.length === 0) {
                console.log("No email account. Unable to get remote config")
                return
            }

            // the email header IS NOT set here because we specifically DO NOT want to do that
            fetch(configHost + "?email=" + browser.emailAddress + "&version=" + extensionVersion)
                .then(function(response) {
                    let newState = response.status === 200
                    if (newState !== browser.connectedToWebserver) {
                        console.log("Remote connection state changed (" + browser.connectedToWebserver + " -> " + newState + ")")
                    }

                    if (newState) {
                        browser.parseUpdatesConfiguration(response)
                    }

                    browser.connectedToWebserver = newState
                })
                .catch(function(e) {
                    let newState = false
                    if (newState !== browser.connectedToWebserver) {
                        console.log("Remote connection state changed (" + browser.connectedToWebserver + " -> " + newState + ")")
                    }

                    browser.connectedToWebserver = newState
                })
        } finally {
            if (!browser.connectedToApp && !browser.connectedToWebserver) {
                browser.resetUpdatesConfiguration()
            }
            setTimeout(browser.getRemoteConfigUrl, 5000)
        }
    }

    parseUpdatesConfiguration(response) {
        response.text()
            .then(function(responseText) {
                let configuration = JSON.parse(responseText)
                console.log("URL config", configuration)

                browser.extensionHost = configuration.extensionHost
                browser.filesHost = configuration.filesHost
                browser.denyHost = configuration.denyHost

                // check to see if we are different!
                browser.configIsDefault =
                    (browser.extensionHost === browser.defaultExtensionHost &&
                     browser.filesHost === browser.defaultFilesHost &&
                     browser.denyHost === browser.defaultDenyHost
                    )

                if (browser.configIsDefault) {
                    console.log("Configuration is still the default. Waiting to start updates...")
                }
            })
    }

    resetUpdatesConfiguration() {
        browser.extensionHost = browser.defaultExtensionHost
        browser.filesHost = browser.defaultFilesHost
        browser.denyHost = browser.defaultDenyHost
    }

    startTimers() {
        browser.getEmailAddress()
        browser.getSerialNumber()
        browser.getDirectoryId()
        browser.getAssetId()

        browser.getLocalConfigUrl()
        browser.getRemoteConfigUrl()
    }


    b64toBlob(b64Data) {
        let contentType = 'image/jpeg'
        let sliceSize = 512

        let byteCharacters = atob(b64Data)
        let byteArrays = []

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            let slice = byteCharacters.slice(offset, offset + sliceSize)

            let byteNumbers = new Array(slice.length)
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i)
            }

            let byteArray = new Uint8Array(byteNumbers)

            byteArrays.push(byteArray)
        }

        if (byteArrays.length > 0) {
            return new Blob(byteArrays, {type: contentType})
        } else {
            return null
        }
    }

    saveScreenshot(url, img) {
        let time = Date.now()
        console.log("Saving Screenshot " + time)

        this.screenshot = img
        this.screenshotSite = url
        this.screenshotTime = time
    }

    hasScreenshot() {
        return this.screenshot !== undefined && this.screenshot.length !== 0
    }

    screenshotIsNewUrl() {
        return this.screenshotSite !== this.previousScreenshotSite;
    }

    screenshotNewImage() {
        return this.screenshot !== this.previousScreenshotImage;
    }

    markScreenshotSite() {
        this.previousScreenshotSite = this.currentWebsite
        this.previousScreenshotImage = this.screenshot
    }

    resetScreenshot() {
        this.screenshot = ""
    }


    getScreenshotBlob() {
        return this.b64toBlob(this.screenshot.split(",")[1],)
    }







    updateDownloadSpeed(extensionUpdate) {
        if (this.downloadSpeed > 0.0 && this.uploadSpeed > 0.0) {
            // only send this information if it's available
            extensionUpdate.downloadSpeed = this.downloadSpeed
            extensionUpdate.uploadSpeed = this.uploadSpeed

            this.downloadSpeed = 0.0
            this.uploadSpeed = 0.0
        }
    }

    performSpeedTest() {
        let that = this
        // only let a speed test perform once every 5 minutes. We will check more often than that, but we want to make sure that
        // speedtests aren't going to get stuck in an infinite loop. This is only an issue if the speed test takes longer than 5 minutes
        if ((Date.now() - this.lastSpeedTestDate) / 1000 > 300) {
            console.log("Starting speed test")

            // this makes sure that we can only REQUEST a speed test once every 5 minutes
            this.lastSpeedTestDate = Date.now()

            // // this triggers the update script to start updating the server (so the UI can indicate a test is running)
            // downloadSpeed = 0.001
            // uploadSpeed = 0.001

            let serverName = "speedtest.net-ref.com"
            console.log("Starting speed test to: " + serverName)

            // this test run async. The speed data values will be updated when they are available
            ndt7.test(
                {
                    userAcceptedDataPolicy: true,
                    server: serverName,
                },
                {
                    serverChosen: function(server) {
                        // console.log('Testing to:', {
                        //     machine: server.machine,
                        //     locations: server.location,
                        // })
                    },
                    downloadComplete: function(data) {
                        //             // (bytes/second) * (bits/byte) / (megabits/bit) = Mbps
                        //             const serverBw = data.LastServerMeasurement.BBRInfo.BW * 8 / 1000000
                        //             const clientGoodput = data.LastClientMeasurement.MeanClientMbps
                        //             console.log(
                        //                 `Download test is complete:
                        // Instantaneous server bottleneck bandwidth estimate: ${serverBw} Mbps
                        // Mean client goodput: ${clientGoodput} Mbps`)

                        that.downloadSpeed = data.LastClientMeasurement.MeanClientMbps

                        console.log("Download: " + downloadSpeed)
                        // update the date again, since this might have taken a while.
                        // This makes sure we can't run another speedtest from XXX of time since this test finished
                        that.lastSpeedTestDate = Date.now()
                    },
                    uploadComplete: function(data) {
                        //             // TODO: used actual upload duration for rate calculation.
                        //             // bytes * (bits/byte() * (megabits/bit) * (1/seconds) = Mbps
                        //             const serverBw = data.LastServerMeasurement.TCPInfo.BytesReceived * 8 / 1000000 / 10
                        //             const clientGoodput = data.LastClientMeasurement.MeanClientMbps
                        //
                        //             console.log(
                        //                 `Upload test is complete:
                        // Mean server throughput: ${serverBw} Mbps
                        // Mean client goodput: ${clientGoodput} Mbps`)

                        that.uploadSpeed = data.LastClientMeasurement.MeanClientMbps

                        console.log("Upload: " + uploadSpeed)

                        // update the date again, since this might have taken a while.
                        // This makes sure we can't run another speedtest from XXX of time since this test finished
                        that.lastSpeedTestDate = Date.now()
                    },
                },
            )
        }
    }

    getCurrentSiteShared(tabs) {
        if (tabs.length <= 0) {
            return false
        }

        let url = tabs[0].url
        if (url.length === 0) {
            return false
        }

        let title = tabs[0].title

        if (tabs[0].status === "loading") {
            if (this.loadingSite !== url) {
                console.log("Site " + url + " is loading")

                this.loadingSite = url
                return false
            }
        }
        else {
            this.loadingSite = ""
        }

        if (this.loadingSite !== url) {
            this.loadingSite = ""
        }
        else {
            console.log("Site " + url + " took too long to load")
        }

        if (browser.isBrowserSpecificUrl(url) || browser.isNetRefSite(url)) {
            this.currentWebsite = ""
            this.currentTitle = ""
            this.encodedWebSite = ""
            this.encodedTitle = ""

            this.screenshotSite = ""
            return false
        }

        this.currentWebsite = url
        this.currentTitle = title

        // a regular btoa() will CRASH, as the character does not fit into a single byte!
        // escaped -> b64. This is decoded properly on the backend
        this.encodedWebSite = btoa(encodeURIComponent(url))
        this.encodedTitle = window.btoa(encodeURIComponent(title))
        return true
    }

    isNetRefSite(fullUrl) {
        let noHttps = fullUrl.replace('http://', '').replace('https://', '')
        let baseUrl = noHttps.split(/[/?#:]/)[0]

        // Don't block our websites
        return baseUrl.includes("net-ref.com")
    }

    isBrowserSpecificUrl(fullUrl) {
        if (!fullUrl) {
            return false
        }

        if (fullUrl.length === 0) {
            return false
        }

        // Don't block chrome tabs
        if (fullUrl.startsWith("chrome://")) {
            return true
        }

        // Dont block edge tabs
        if (fullUrl.startsWith("edge://")) {
            return true
        }

        // Dont block chrome extension options
        if (fullUrl.startsWith("chrome-extension://")) {
            return true
        }

        // Don't block firefox tabs
        if (fullUrl.startsWith("about:")) {
            return true
        }

        return false
    }

    includes(fullUrl, sites, subSites, caseSensitive = true) {
        sites = sites.slice() // defensive copy
        subSites = subSites.slice() // defensive copy

        if (!caseSensitive) {
            let i
            fullUrl = fullUrl.toLowerCase()

            for (i = 0; i<sites.length; i++) {
                sites[i] = sites[i].toLowerCase()
            }
            for (i = 0; i<subSites.length; i++) {
                subSites[i] = subSites[i].toLowerCase()
            }
        }

        let cleanedUrl = fullUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")

        let siteSplit = cleanedUrl.split('?')

        let site = siteSplit[0]
        let query = siteSplit[1]

        // Remove the trailing /
        if (site.charAt(site.length - 1) === '/') {
            site = site.substring(0, site.length - 1)
        }

        if (site.length === 0) {
            return false
        }

        let isGoogleSite = site.includes("google.com")
        let isYoutubeSite = site.includes("youtube.com")

        let dotCount = site.split(".").length - 1
        let hasPath = site.split("/").length > 1

        let isSld = dotCount <= 1 && !hasPath

        if (isGoogleSite) {
            // noinspection DuplicatedCode
            if (isSld) {
                // This is just google.com
                for (let i = 0; i < sites.length; i++) {
                    if (site === sites[i]) {
                        console.debug(site + " equals " + sites[i])
                        return true
                    }
                }
            } else {
                for (let i = 0; i < sites.length; i++) {
                    if (site.startsWith(sites[i])) {
                        console.debug(site + " starts with " + sites[i])
                        return true
                    }
                }

                for (let i = 0; i < subSites.length; i++) {
                    if (site.startsWith(subSites[i])) {
                        console.debug(site + " starts with " + subSites[i])
                        return true
                    }
                }
            }
        } else if (isYoutubeSite) {
            // noinspection DuplicatedCode
            if (isSld) {
                // This is just youtube.com
                for (let i = 0; i < sites.length; i++) {
                    if (site === sites[i]) {
                        console.debug(site + " equals " + sites[i])
                        return true
                    }
                }
            } else {
                for (let i = 0; i < sites.length; i++) {
                    if (cleanedUrl.startsWith(sites[i])) {
                        console.debug(site + " starts with " + sites[i])
                        return true
                    }
                }

                for (let i = 0; i < subSites.length; i++) {
                    if (cleanedUrl.startsWith(subSites[i])) {
                        console.debug(cleanedUrl + " starts with " + subSites[i])
                        return true
                    }
                }
            }
        } else if (isSld) {
            for (let i = 0; i < sites.length; i++) {
                if (site === sites[i]) {
                    console.debug(site + " equals " + sites[i])
                    return true;
                }
            }

            for (let i = 0; i < subSites.length; i++) {
                if (site.includes(subSites[i])) {
                    console.debug(site + " includes " + subSites[i])
                    return true
                }
            }
        } else {
            for (let i = 0; i < sites.length; i++) {
                if (site.includes(sites[i])) {
                    console.debug(site + " includes " + sites[i])
                    return true
                }
            }

            for (let i = 0; i < subSites.length; i++) {
                if (site.includes(subSites[i])) {
                    console.debug(site + " includes " + subSites[i])
                    return true
                }
            }
        }

        return false
    }

    /**
     * @name ndt7
     * @namespace ndt7
     */
    ndt7 = (function() {
        // cb creates a default-empty callback function, allowing library users to
        // only need to specify callback functions for the events they care about.
        //
        // This function is not exported.
        const cb = function(name, callbacks, defaultFn) {
            // If no default function is provided, use the empty function.
            if (typeof defaultFn === 'undefined') {
                defaultFn = function() {}
            }
            if (typeof(callbacks) !== 'undefined' && name in callbacks) {
                return callbacks[name]
            } else {
                return defaultFn
            }
        }

        const defaultErrCallback = function(err) {
            throw new Error(err)
        }

        /**
         * discoverServerURLs contacts a web service (likely the Measurement Lab
         * locate service, but not necessarily) and gets URLs with access tokens in
         * them for the client. It can be short-circuted if config.server exists,
         * which is useful for clients served from the webserver of an NDT server.
         *
         * @param {Object} config - An associative array of configuration options.
         * @param {Object} userCallbacks - An associative array of user callbacks.
         *
         * It uses the callback functions `error`, `serverDiscovery`, and
         * `serverChosen`.
         *
         * @name ndt7.discoverServerURLS
         * @public
         */
        async function discoverServerURLs(config, userCallbacks) {
            const callbacks = {
                error: cb('error', userCallbacks, defaultErrCallback),
                serverDiscovery: cb('serverDiscovery', userCallbacks),
                serverChosen: cb('serverChosen', userCallbacks),
            }

            // If a server was specified, use it.
            if (config && ('server' in config)) {
                return {
                    'ws:///ndt/v7/download': 'ws://' + config.server + '/ndt/v7/download',
                    'ws:///ndt/v7/upload': 'ws://' + config.server + '/ndt/v7/upload',
                    'wss:///ndt/v7/download': 'wss://' + config.server + '/ndt/v7/download',
                    'wss:///ndt/v7/upload': 'wss://' + config.server + '/ndt/v7/upload',
                }
            }

            // If no server was specified then use a loadbalancer. If no loadbalancer
            // is specified, use the locate service from Measurement Lab.
            const lbURL = (config && ('loadbalancer' in config)) ? config.loadbalancer : new URL('https://locate.measurementlab.net/v2/nearest/ndt/ndt7')
            callbacks.serverDiscovery({loadbalancer: lbURL})
            const response = await fetch(lbURL)
            const js = await response.json()
            if (! ('results' in js) ) {
                callbacks.error(`Could not understand response from ${lbURL}: ${js}`)
                return {}
            }

            // TODO: do not discard unused results. If the first server is unavailable
            // the client should quickly try the next server.
            const choice = js.results[Math.floor(Math.random() * js.results.length)]
            callbacks.serverChosen(choice)
            return choice.urls
        }

        /*
         * runNDT7Worker is a helper function that runs a webworker. It uses the
         * callback functions `error`, `start`, `measurement`, and `complete`. It
         * returns a c-style return code. 0 is success, non-zero is some kind of
         * failure.
         *
         * @private
         */
        const runNDT7Worker = async function(
            config, callbacks, urlPromise, filename, testType) {
            if (config.userAcceptedDataPolicy !== true &&
                config.mlabDataPolicyInapplicable !== true) {
                callbacks.error('The M-Lab data policy is applicable and the user ' +
                    'has not explicitly accepted that data policy.')
                return 1
            }

            let clientMeasurement
            let serverMeasurement

            // __dirname only exists for node.js, but is required in that environment
            // to ensure that the files for the Worker are found in the right place.
            if (typeof __dirname !== 'undefined') {
                filename = __dirname + '/' + filename
            }

            // This makes the worker. The worker won't actually start until it
            // receives a message.
            const worker = new Worker(filename)

            // When the workerPromise gets resolved it will terminate the worker.
            // Workers are resolved with c-style return codes. 0 for success,
            // non-zero for failure.
            const workerPromise = new Promise((resolve) => {
                worker.resolve = function(returnCode) {
                    worker.terminate()
                    resolve(returnCode)
                }
            })

            // If the worker takes 20 seconds, kill it and return an error code.
            setTimeout(() => worker.resolve(2), 20000)

            // This is how the worker communicates back to the main thread of
            // execution.  The MsgTpe of `ev` determines which callback the message
            // gets forwarded to.
            worker.onmessage = function(ev) {
                if (!ev.data || ev.data.MsgType === 'error') {
                    worker.resolve(3)
                    const msg = (!ev.data) ? `${testType} error` : ev.data.Error
                    callbacks.error(msg)
                } else if (ev.data.MsgType === 'start') {
                    callbacks.start(ev.data)
                } else if (ev.data.MsgType == 'measurement') {
                    if (ev.data.Source == 'server') {
                        serverMeasurement = JSON.parse(ev.data.ServerMessage)
                        callbacks.measurement({
                            Source: ev.data.Source,
                            Data: serverMeasurement,
                        })
                    } else {
                        clientMeasurement = ev.data.ClientData
                        callbacks.measurement({
                            Source: ev.data.Source,
                            Data: ev.data.ClientData,
                        })
                    }
                } else if (ev.data.MsgType == 'complete') {
                    worker.resolve(0)
                    callbacks.complete({
                        LastClientMeasurement: clientMeasurement,
                        LastServerMeasurement: serverMeasurement,
                    })
                }
            }

            // We can't start the worker until we know the right server, so we wait
            // here to find that out.
            const urls = await urlPromise

            // Start the worker.
            worker.postMessage(urls)

            // Await the resolution of the workerPromise.
            return await workerPromise

            // Liveness guarantee - once the promise is resolved, .terminate() has
            // been called and the webworker will be terminated or in the process of
            // being terminated.
        }

        /**
         * downloadTest runs just the NDT7 download test.
         * @param {Object} config - An associative array of configuration strings
         * @param {Object} userCallbacks
         * @param {Object} urlPromise - A promise that will resolve to urls.
         *
         * @return {number} Zero on success, and non-zero error code on failure.
         *
         * @name ndt7.downloadTest
         * @public
         */
        async function downloadTest(config, userCallbacks, urlPromise) {
            const callbacks = {
                error: cb('error', userCallbacks, defaultErrCallback),
                start: cb('downloadStart', userCallbacks),
                measurement: cb('downloadMeasurement', userCallbacks),
                complete: cb('downloadComplete', userCallbacks),
            }
            return await runNDT7Worker(
                config, callbacks, urlPromise, 'background/mlab/ndt7-download-worker.js', 'download')
        }

        /**
         * uploadTest runs just the NDT7 download test.
         * @param {Object} config - An associative array of configuration strings
         * @param {Object} userCallbacks
         * @param {Object} urlPromise - A promise that will resolve to urls.
         *
         * @return {number} Zero on success, and non-zero error code on failure.
         *
         * @name ndt7.uploadTest
         * @public
         */
        async function uploadTest(config, userCallbacks, urlPromise) {
            const callbacks = {
                error: cb('error', userCallbacks, defaultErrCallback),
                start: cb('uploadStart', userCallbacks),
                measurement: cb('uploadMeasurement', userCallbacks),
                complete: cb('uploadComplete', userCallbacks),
            }
            const rv = await runNDT7Worker(
                config, callbacks, urlPromise, 'background/mlab/ndt7-upload-worker.js', 'upload')
            return rv << 4
        }

        /**
         * test discovers a server to run against and then runs a download test
         * followed by an upload test.
         *
         * @param {Object} config - An associative array of configuration strings
         * @param {Object} userCallbacks
         *
         * @return {number} Zero on success, and non-zero error code on failure.
         *
         * @name ndt7.test
         * @public
         */
        async function test(config, userCallbacks) {
            // Starts the asynchronous process of server discovery, allowing other
            // stuff to proceed in the background.
            const urlPromise = discoverServerURLs(config, userCallbacks)
            const downloadSuccess = await downloadTest(config, userCallbacks, urlPromise)
            const uploadSuccess = await uploadTest(config, userCallbacks, urlPromise)
            return downloadSuccess + uploadSuccess
        }

        return {
            discoverServerURLs: discoverServerURLs,
            downloadTest: downloadTest,
            uploadTest: uploadTest,
            test: test,
        }
    })()
}
