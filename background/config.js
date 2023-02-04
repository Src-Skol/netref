// noinspection JSUnresolvedVariable

class Config {
    // this is in minutes.
    defaultInactivityTimeout = 15
    inactivityTimeout = 15
    studentIsActive = true

    lastScreenshotUploadTime = Date.now()


    timeEnum = Object.freeze({"DISTRICT":0, "ALWAYS":1, "NEVER":2, "CUSTOM":3})
    stateEnum = Object.freeze({"ALLOW":0, "WHITELIST":1, "BLACKLIST":2, "BLOCK":3})
    state = this.stateEnum.ALLOW


    emptyArray = []
    emptyMap = Object.fromEntries(new Map())

    blockedSites = new Set()
    siteBytesMap = new Map()



    needsConfig = true

    districtName = "Default"
    studentDbId = "-1"

    tabLimit = -1
    queryDelay = 5

    screenshotDelay = 60
    screenshotQuality = 75

    districtOperatingDays = [0, 1, 2, 3, 4, 5, 6]

    districtMonitoringHours = this.timeEnum.ALWAYS
    districtMonitoringStartTime = "00:00:00"
    districtMonitoringEndTime = "23:59:59"

    districtControlHours = this.timeEnum.ALWAYS
    districtControlStartTime = "00:00:00"
    districtControlEndTime = "23:59:59"

    districtScreenshotHours = this.timeEnum.NEVER
    districtScreenshotStartTime = "00:00:00"
    districtScreenshotEndTime = "23:59:59"
    districtScreenshotBlackRules = []

    districtInternetHours = this.timeEnum.ALWAYS
    districtInternetStartTime = "00:00:00"
    districtInternetEndTime = "23:59:59"

    schoolMonitoringHours = this.timeEnum.DISTRICT
    schoolMonitoringStartTime = "00:00:00"
    schoolMonitoringEndTime = "23:59:59"

    schoolControlHours = this.timeEnum.DISTRICT
    schoolControlStartTime = "00:00:00"
    schoolControlEndTime = "23:59:59"

    schoolScreenshotHours = this.timeEnum.DISTRICT
    schoolScreenshotStartTime = "00:00:00"
    schoolScreenshotEndTime = "23:59:59"

    schoolInternetHours = this.timeEnum.DISTRICT
    schoolInternetStartTime = "00:00:00"
    schoolInternetEndTime = "23:59:59"


    timeoutDistrictSites = []
    timeoutDistrictSubSites = []

    timeoutStudentSites = []
    timeoutStudentSubSites = []

    permDistrictWhiteSites = []
    permDistrictWhiteSubSites = []
    permDistrictBlackSites = []
    permDistrictBlackSubSites = []

    permStudentWhiteSites = []
    permStudentWhiteSubSites = []
    permStudentBlackSites = []
    permStudentBlackSubSites = []

    teacherWhiteSites = []
    teacherWhiteSubSites = []
    teacherBlackSites = []
    teacherBlackSubSites = []

    constructor() { }


    // this is called on an update timer
    parseConfig(configuration) {
        if (isQA) {
            console.log("Student config", configuration)
        }

        try {
            let hasRuleUpdate = configuration.hasRuleUpdate

            this.studentDbId = configuration.dbId

            this.districtName = configuration.districtName

            if (configuration.hasOwnProperty('tL')) {
                if (configuration.tL > 0 && this.tabLimit !== configuration.tL) {
                    limitTabs(configuration.tL)
                }
                this.tabLimit = configuration.tL
            }

            this.queryDelay = configuration.qD
            this.screenshotDelay = configuration.sD
            this.screenshotQuality = configuration.sQ

            // in minutes, and we have to convert
            this.inactivityTimeout = configuration.iT
            if (this.inactivityTimeout === 0) {
                this.inactivityTimeout = this.defaultInactivityTimeout
            }

            if (configuration.hasOwnProperty('dOD')) {
                this.districtOperatingDays = configuration.dOD
            }

            this.districtMonitoringHours = this.getTimeOption(configuration.dMH)
            this.districtMonitoringStartTime = configuration.dMST
            this.districtMonitoringEndTime = configuration.dMET

            this.districtControlHours = this.getTimeOption(configuration.dCH)
            this.districtControlStartTime = configuration.dCST
            this.districtControlEndTime = configuration.dCET

            this.districtScreenshotHours = this.getTimeOption(configuration.dSH)
            this.districtScreenshotStartTime = configuration.dSST
            this.districtScreenshotEndTime = configuration.dSET
            this.districtScreenshotBlackRules = configuration.sSBR

            this.districtInternetHours = this.getTimeOption(configuration.dIH)
            this.districtInternetStartTime = configuration.dIST
            this.districtInternetEndTime = configuration.dIET

            this.schoolMonitoringHours = this.getTimeOption(configuration.sMH)
            this.schoolMonitoringStartTime = configuration.sMST
            this.schoolMonitoringEndTime = configuration.sMET

            this.schoolControlHours = this.getTimeOption(configuration.sCH)
            this.schoolControlStartTime = configuration.sCST
            this.schoolControlEndTime = configuration.sCET

            this.schoolScreenshotHours = this.getTimeOption(configuration.sSH)
            this.schoolScreenshotStartTime = configuration.sSST
            this.schoolScreenshotEndTime = configuration.sSET

            this.schoolInternetHours = this.getTimeOption(configuration.sIH)
            this.schoolInternetStartTime = configuration.sIST
            this.schoolInternetEndTime = configuration.sIET

            if (hasRuleUpdate) {
                this.splitRules(configuration.tDR, this.timeoutDistrictSites, this.timeoutDistrictSubSites)

                this.splitRules(configuration.tSR, this.timeoutStudentSites, this.timeoutStudentSubSites)

                this.splitRules(configuration.pDWR, this.permDistrictWhiteSites, this.permDistrictWhiteSubSites)
                this.splitRules(configuration.pDBR, this.permDistrictBlackSites, this.permDistrictBlackSubSites)

                this.splitRules(configuration.pSWR, this.permStudentWhiteSites, this.permStudentWhiteSubSites)
                this.splitRules(configuration.pSBR, this.permStudentBlackSites, this.permStudentBlackSubSites)

                switch (configuration.ruleState) {
                    case "ALLOW":
                        if (this.state !== this.stateEnum.ALLOW) {
                            // when we move to the ALLOW state, we want to force screenshots to start up again.
                            browser.cachedScreenshot = ""
                        }
                        this.state = this.stateEnum.ALLOW
                        break
                    case "WHITELIST":
                        this.state = this.stateEnum.WHITELIST
                        break
                    case "BLACKLIST":
                        this.state = this.stateEnum.BLACKLIST
                        break
                    case "BLOCK":
                        this.state = this.stateEnum.BLOCK
                        break
                }

                this.splitRules(configuration.tWR, this.teacherWhiteSites, this.teacherWhiteSubSites)
                this.splitRules(configuration.tBR, this.teacherBlackSites, this.teacherBlackSubSites)
            }
        } catch (e) {
            console.log("Error setting configuration", e)
        }

        try {
            openTab(configuration.oS)
            closeTab(configuration.cS)
        } catch (e) {
            console.log("Error configuring tabs", e)
        }

        let messageSender = configuration.mS
        let messageText = configuration.mT
        if (messageSender !== "" && messageText !== "") {
            pushNotification(messageSender, messageText)
        }

        if (configuration.sST === true) {
            try {
                browser.performSpeedTest()
            } catch (e) {
                browser.lastSpeedTestDate = 0 // rerun the speedtest
                console.log("Error performing speed test", e)
            }
        }

        this.needsConfig = false
    }

    getTimeOption(timeOptionString) {
        switch (timeOptionString) {
            case "DISTRICT":
                return this.timeEnum.DISTRICT
            case "ALWAYS":
                return this.timeEnum.ALWAYS
            case "NEVER":
                return this.timeEnum.NEVER
            case "CUSTOM":
                return this.timeEnum.CUSTOM
        }
    }


    splitRules(rules, sites, subSites) {
        sites.length = 0
        subSites.length = 0

        for (let i = 0; i < rules.length; i++) {
            let site = rules[i]

            let dotCount = site.split(".").length - 1
            let hasPath = site.split("/").length > 1

            if (dotCount <= 1 && !hasPath) {
                sites.push(site)
            } else {
                subSites.push(site)
            }
        }
    }


    updateStudentActivity() {
        console.log("Update: " + new Date())

        let formData = new FormData()
        let extensionUpdate = {}
        let myself = this


        let allowedToMonitor = this.shouldMonitor()


        if (this.inactivityTimeout === 15) {
            this.studentIsActive = true
        }

        extensionUpdate.needsConfig = this.needsConfig

        // if we are not allowed to monitor, we still must send activity updates as the config is sent in the response.
        // There WILL NOT be valid info if we are not allowed to monitor...
        if (allowedToMonitor && this.studentIsActive) {
            extensionUpdate.encodedWebSite = browser.encodedWebSite
            extensionUpdate.encodedTitle = browser.encodedTitle
        } else {
            extensionUpdate.encodedWebSite = ""
            extensionUpdate.encodedTitle = ""
        }

        if (allowedToMonitor) {
            extensionUpdate.blockedSites = Array.from(this.blockedSites)
            extensionUpdate.siteBytesMap = Object.fromEntries(this.siteBytesMap)
        } else {
            extensionUpdate.blockedSites = this.emptyArray
            extensionUpdate.siteBytesMap = this.emptyMap
        }


        extensionUpdate.screenshotFileName = ""
        extensionUpdate.directoryId = browser.directoryId

        browser.updateDownloadSpeed(extensionUpdate)





        let screenshotTimeElapsed = (Date.now() - this.lastScreenshotUploadTime) / 1000

        // only allow a screenshot
        //  - if we are allowed to monitor
        //  - we are only connected to our webservers directly
        //  - we permit screenshots
        //  - we have a screenshot
        //  - our screenshot is
        //    - new (via URL)  OR
        //    - new (via screen changing and DELAY from last screenshot is expired)
        let allowScreenshot = allowedToMonitor && !browser.connectedToApp && browser.hasScreenshot() && this.shouldScreenshot() &&
            (browser.screenshotIsNewUrl() || (screenshotTimeElapsed > config.screenshotDelay && browser.screenshotNewImage()))

        let blockedScreenshotForSite = allowScreenshot && browser.includes(browser.screenshotSite.toLowerCase(), config.districtScreenshotBlackRules, [], false)

        // if the screenshot URL is a site that we forbid screenshots on, don't send the screenshot.
        if (blockedScreenshotForSite) {
            console.log("Not taking screenshot of " + browser.screenshotSite + ", as it is in the blocked screenshots list configured for the district.")
            allowScreenshot = false
        }

        if (!allowScreenshot && !browser.connectedToApp) {
            // for debugging when connected to the webserver
            console.log("    Screenshot")
            console.log("      Allowed to Monitor: " + allowedToMonitor)
            console.log("      Connected to App  : " + browser.connectedToApp)
            console.log("      hasScreenshot()   : " + browser.hasScreenshot())
            console.log("      shouldScreenshot(): " + this.shouldScreenshot())
            console.log("      screenshotIsNewUrl() : " + browser.screenshotIsNewUrl())
            console.log("      screenshotNewImage() : " + browser.screenshotNewImage())
            console.log("      elapsed Time() : " + screenshotTimeElapsed)
            console.log("      blockedSite    : " + blockedScreenshotForSite)
        }


        if (allowScreenshot) {
            let fileName = this.districtName + "/" + this.studentDbId + "/" + moment().format("YYYYMMDD[/]H[/]m[_]s") + ".jpg"

            formData.append("name", fileName)

            // Convert the screenshot to a blob to upload
            let blob = browser.getScreenshotBlob()
            if (blob) {
                console.log("Attempting to upload screenshot....")

                // only attempt upload if we have a screenshot
                formData.append("screenshot", blob)

                // screenshot request
                fetch(browser.filesHost, {
                    method: "POST",
                    body: formData,
                })
                .then(function(response) {
                    if (!response.ok) {
                        // if there was a problem with uploading the screenshot, we don't send it along as part of the student activity
                        console.log("Error uploading screenshot, code: " + response.status)
                    } else {
                        console.log("Upload screenshot success.")
                        extensionUpdate.screenshotFileName = fileName

                        // only reset the screenshot once we successfully upload it.
                        browser.resetScreenshot()
                        browser.markScreenshotSite()
                        myself.lastScreenshotUploadTime = Date.now()
                    }

                    // send student activity AFTER we upload the screenshot
                    myself.sendStudentActivity(extensionUpdate)
                })
                .catch(function(e) {
                    console.log("Failed to upload screenshot: ", e)

                    // sending of activity (on error uploading screenshot, so we always send activity)
                    myself.sendStudentActivity(extensionUpdate)
                })
            } else {
                console.log("Invalid screenshot...")
                // sending of activity with no VALID screenshot update
                myself.sendStudentActivity(extensionUpdate)

            }
        } else {
            console.log("Not sending screenshot")
            // not sending a screenshot, but still send updates
            myself.sendStudentActivity(extensionUpdate)
        }

        this.blockedSites = new Set()
        this.siteBytesMap = new Map()
    }

    // this is called on the update timer, so this doesn't need to be rescheduled
    sendStudentActivity(extensionUpdate) {
        let extensionHost = browser.extensionHost
        let studentEmail = browser.emailAddress
        let machineName = browser.machineName


        let hasScreenshot = extensionUpdate.screenshotFileName !== undefined && extensionUpdate.screenshotFileName.length !== 0
        let bodyData = JSON.stringify(extensionUpdate)

        console.log("Sending update for: " + browser.currentTitle)
        console.log("Sending update for: " + browser.currentWebsite)
        console.log("Sending screenshot: " + hasScreenshot)
        //console.log(bodyData)

        // update request
        fetch(extensionHost + "?type=chrome&email=" + studentEmail + "&machine=" + machineName + "&version=" + extensionVersion, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: bodyData,
        })
            .then(function(response) {
                if (response.status === 200) {
                    response.text().then(function(responseText) {
                        try {
                            let configuration = JSON.parse(responseText)
                            config.parseConfig(configuration)
                        } catch (e) {
                            console.log(e)
                            config.reset()
                        }
                    })
                } else if (response.status === 205) {
                    console.log("Outside School Network")
                    config.reset()
                } else {
                    console.log("Request: " + extensionHost + "?type=chrome" + " : Email:" + studentEmail + "  ::  Status: " + response.status)
                    config.reset()
                }
            })
            .catch(function(e) {
                console.log("ERROR", e)
                config.reset()
            })
    }


    shouldMonitor() {
        let dayOfWeek = new Date().getDay()

        if (this.districtOperatingDays.includes(dayOfWeek)) {
            return this.inTimeRange(this.districtMonitoringHours, this.districtMonitoringStartTime, this.districtMonitoringEndTime,
                this.schoolMonitoringHours, this.schoolMonitoringStartTime, this.schoolMonitoringEndTime)
        } else {
            return false
        }
    }

    shouldScreenshot() {
        let dayOfWeek = new Date().getDay()

        if (this.districtOperatingDays.includes(dayOfWeek)) {
            return this.inTimeRange(this.districtScreenshotHours, this.districtScreenshotStartTime, this.districtScreenshotEndTime,
                this.schoolScreenshotHours, this.schoolScreenshotStartTime, this.schoolScreenshotEndTime)
        } else {
            return false
        }
    }

    shouldControlTimeRange() {
        return this.inTimeRange(this.districtControlHours, this.districtControlStartTime, this.districtControlEndTime,
            this.schoolControlHours, this.schoolControlStartTime, this.schoolControlEndTime)
    }

    shouldAllowInternet() {
        return this.inTimeRange(this.districtInternetHours, this.districtInternetStartTime, this.districtInternetEndTime,
            this.schoolInternetHours, this.schoolInternetStartTime, this.schoolInternetEndTime)
    }

    isBetween(startTime, endTime) {
        let today = new Date()

        let startDate = new Date(today.getMonth() + 1 + "/" + today.getDate() + "/" + today.getFullYear() + " " + startTime)
        let endDate = new Date(today.getMonth() + 1 + "/" + today.getDate() + "/" + today.getFullYear() + " " + endTime)

        if (endDate < startDate) {
            endDate.setDate(endDate.getDate() + 1)
        }

        return startDate <= today && today <= endDate
    }

    inTimeRange(districtTimeOption, districtStartTime, districtEndTime,
                schoolTimeOption, schoolStartTime, schoolEndTime) {

        if (schoolTimeOption === this.timeEnum.DISTRICT) {
            if (districtTimeOption === this.timeEnum.ALWAYS) {
                return true
            } else if (districtTimeOption === this.timeEnum.NEVER) {
                return false
            } else {
                return this.isBetween(districtStartTime, districtEndTime)
            }
        } else {
            if (schoolTimeOption === this.timeEnum.ALWAYS) {
                return true
            } else if (schoolTimeOption === this.timeEnum.NEVER) {
                return false
            } else {
                return this.isBetween(schoolStartTime, schoolEndTime)
            }
        }
    }

    // context here is from a window callback via the netrefPlugin.js
    storeSiteByteMap(details) {
        if (details.fromCache === true) {
            return
        }

        let initiator = details.initiator
        if (initiator === undefined || browser.isBrowserSpecificUrl(initiator)) {
            return
        }

        let url = initiator.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")

        for (let i = 0; i < details.responseHeaders.length; i++) {
            let header = details.responseHeaders[i]
            if (header.name === "content-length") {
                let bytes = parseInt(header.value)

                if (bytes === 0) {
                    return
                }

                let currentBytes = 0
                if (config.siteBytesMap.has(url)) {
                    currentBytes = config.siteBytesMap.get(url)
                }

                currentBytes += bytes

                config.siteBytesMap.set(url, currentBytes)
            }
        }
    }

    // return true if the site should be blocked.
    blockSite(siteInLowerCase) {
        let dayOfWeek = new Date().getDay()

        if (!this.districtOperatingDays.includes(dayOfWeek)) {
            console.log("Not allowed to control access. Allowing")
            return false
        }

        if (!this.shouldControlTimeRange()) {
            console.debug("Not allowed to control. Allowing")
            return false
        }

        if (!this.shouldAllowInternet()) {
            console.log("Internet not allowed. Blocking")
            return true
        }

        // timeouts are ALWAYS first to be checked
        // if a site is in the student timeout sites, the site is blocked
        if (this.timeoutStudentSites.length !== 0 || this.timeoutStudentSubSites.length !== 0) {
            // timeout sites are ALLOWED sites
            return !browser.includes(siteInLowerCase, this.timeoutStudentSites, this.timeoutStudentSubSites)
        }

        // If a site is in the district timout sites, the site is blocked
        if (this.timeoutDistrictSites.length !== 0 || this.timeoutDistrictSubSites.length !== 0) {
            // timeout sites are ALLOWED sites
            return !browser.includes(siteInLowerCase, this.timeoutDistrictSites, this.timeoutDistrictSubSites)
        }


        // district first, then student
        if (browser.includes(siteInLowerCase, this.permDistrictWhiteSites, this.permDistrictWhiteSubSites)) {
            return false
        }
        if (browser.includes(siteInLowerCase, this.permDistrictBlackSites, this.permDistrictBlackSubSites)) {
            return true
        }

        // now students
        if (browser.includes(siteInLowerCase, this.permStudentWhiteSites, this.permStudentWhiteSubSites)) {
            return false
        }
        if (browser.includes(siteInLowerCase, this.permStudentBlackSites, this.permStudentBlackSubSites)) {
            return true
        }

        // classroom/teacher state
        switch (this.state) {
            case this.stateEnum.ALLOW:
                return false
            case this.stateEnum.WHITELIST:
                return !browser.includes(siteInLowerCase, this.teacherWhiteSites, this.teacherWhiteSubSites)
            case this.stateEnum.BLACKLIST:
                return browser.includes(siteInLowerCase, this.teacherBlackSites, this.teacherBlackSubSites)
            case this.stateEnum.BLOCK:
                return true
        }
    }

    reset() {
        console.log("Resetting")

        this.state = this.stateEnum.ALLOW

        this.needsConfig = true

        this.timeoutStudentSites = []
        this.timeoutStudentSubSites = []

        this.permDistrictWhiteSites = []
        this.permDistrictWhiteSubSites = []
        this.permDistrictBlackSites = []
        this.permDistrictBlackSubSites = []

        this.permStudentWhiteSites = []
        this.permStudentWhiteSubSites = []
        this.permStudentBlackSites = []
        this.permStudentBlackSubSites = []

        this.teacherWhiteSites = []
        this.teacherWhiteSubSites = []
        this.teacherBlackSites = []
        this.teacherBlackSubSites = []

        this.districtInternetHours = this.timeEnum.ALWAYS
        this.districtInternetStartTime = "00:00:00"
        this.districtInternetEndTime = "23:59:59"

        this.schoolInternetHours = this.timeEnum.DISTRICT
        this.schoolInternetStartTime = "00:00:00"
        this.schoolInternetEndTime = "23:59:59"
    }
}
