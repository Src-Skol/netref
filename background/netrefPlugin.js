// try {
//     importScripts(
//         "helpers/moment.min.js",
//     )
// } catch (e) {
//     console.log(e)
// }


// NOTE: This extension is also alongside the native agents.
let extensionVersion = chrome.runtime.getManifest().version

let isQA = chrome.runtime.getManifest().name.endsWith(" QA")

let configHost = "https://webserver.net-ref.com/extension/config"
if (isQA) {
    configHost = "https://webservertwo.net-ref.com/extension/config"
}

let mainLoopStart = false
let openTabs = 0
let previousScreenshot = ""

let siteManagementId = 0
let sendActivityId = 0

let browser = new Browser()
let config = new Config()

chrome.webRequest.onCompleted.addListener(config.storeSiteByteMap,
    {
        urls: [
            "<all_urls>",
        ]
    },
    ["responseHeaders"]
)

chrome.runtime.onMessage.addListener(
    function (request) {
        config.studentIsActive = true
        clearInterval(browser.mouseoverInterval)

        let timeOut = config.inactivityTimeout * 60 * 1000

        browser.mouseoverInterval = setInterval(() => {
            console.log("Setting student active -> false")
            config.studentIsActive = false
        }, timeOut)

        return true
    })

chrome.tabs.onCreated.addListener(function (tab) {
    openTabs++
    config.studentIsActive = true

    if (config.tabLimit > 0 && openTabs > config.tabLimit) {
        chrome.tabs.remove(tab.id, function() {  })
    }
})


chrome.tabs.onRemoved.addListener(function (tab) {
    openTabs--
    config.studentIsActive = true
})

chrome.tabs.onActiveChanged.addListener(function(tab) {
    // same timeout as closing tabs when blocked
    setTimeout(getCurrentSiteAndScreenshot, 500)
    setTimeout(updateServer, 1000)
});

// on a timer
function redirectBlockedSites() {
    try {
        chrome.windows.getAll({populate: true}, function (windows) {
            windows.forEach(function (window) {
                window.tabs.forEach(function (tab) {
                    let url = tab.url
                    let siteInLowerCase = url.toLowerCase()
                    if (browser.isBrowserSpecificUrl(siteInLowerCase)) {
                        // never block browser specific urls.
                    } else {
                        if (config.blockSite(siteInLowerCase)) {
                            // we should block this url

                            // if we are a netref website, don't block it.
                            if (!browser.isNetRefSite(siteInLowerCase)) {
                                if (url === browser.currentWebsite) {
                                    console.log("Blocked website is current website. Clearing cached data.")

                                    browser.currentWebsite = ""
                                    browser.encodedWebSite = ""
                                    browser.encodedTitle = ""

                                    browser.screenshot = ""
                                    browser.screenshotSite = ""
                                }

                                config.blockedSites.add(new URL(url).host)

                                let redirectUrl = browser.denyHost + btoa(url)
                                chrome.tabs.update(tab.id, {url:redirectUrl})
                            }
                        } else {
                            // we should not be blocking this website.
                            if (url.startsWith(browser.denyHost)) {
                                let origUrl = atob(tab.url.substring(browser.denyHost.length))

                                // only if we're actually allowed to show it based on our rules
                                if (!config.blockSite(origUrl)) {
                                    console.log("Formerly blocked page, we should allow: " + origUrl)
                                    chrome.tabs.update(tab.id, {url:origUrl})
                                }
                            }
                        }
                    }
                })
            })
        })
    } finally {
        setTimeout(redirectBlockedSites,  500)
    }
}


function pushNotification(senderName, messageText) {
    let opt = {
        type: "basic",
        title: "Message from your teacher (" + senderName + ")",
        message: messageText,
        iconUrl: "img/icon.png"
    }

    chrome.notifications.create(opt)
}

function openTab(sites) {
    if (sites.length === 0) {
        return
    }

    for (let i = 0; i < sites.length; i++) {
        let site = sites[i]

        chrome.tabs.query({}, function (tabs) {
            let tabId = -1

            for (let i = 0; i < tabs.length; i++) {
                let url = tabs[i].url.toLowerCase()

                if (url.includes(site)) {
                    tabId = tabs[i].id
                    break
                }
            }

            if (tabId === -1) {
                chrome.tabs.create({url: "https://" + site.toString()})
            } else {
                chrome.tabs.update(tabId, {"active": true})
            }
        })
    }
}

function closeTab(sites) {
    if (sites.length === 0) {
        return
    }

    chrome.tabs.query({ url: sites}, function (tabs) {
        let tabIds = tabs.map(function (tab) {
            return tab.id
        })
        chrome.tabs.remove(tabIds)
    })
}


function processUpdates() {
    if (browser.configIsDefault && !browser.connectedToApp && !browser.connectedToWebserver) {
        // quick updates until we are connected
        setTimeout(processUpdates, 1000)
        return
    }

    // only called once
    if (!mainLoopStart) {
        mainLoopStart = true
        getCurrentSiteAndScreenshot() // loads of callbacks in this!
        updateServer()
    }
}

function updateServer() {
    clearTimeout(sendActivityId)
    // unless the user has enabled "Account Sync", this will be empty. We change the default to 'ANY' to support cases where the
    // account is not in the "sync" state.
    try {
        // email is required if we are connected to our servers
        if (!browser.connectedToApp && browser.emailAddress.length === 0) {
            console.log("No email account and not connected to app. Unable to send activity")
            return
        }

        if (browser.configIsDefault) {
            // if we don't have a config yet, don't try to send an update (because the info will be incorrect, and screenshots get funny)
            console.log("Configuration is still the default. Waiting to update activity...")
        } else {
            config.updateStudentActivity()
        }

        // only reschedule quickly (or as prescribed) if there are no errors
        if (browser.connectedToApp) {
            // faster updates to local app
            sendActivityId = setTimeout(updateServer, 1000)
        } else {
            sendActivityId = setTimeout(updateServer, config.queryDelay * 1000)
        }
    } catch (e) {
        // always make sure to schedule this.
        sendActivityId = setTimeout(updateServer, 5000)
    }
}


function getCurrentSiteAndScreenshot() {
    clearTimeout(siteManagementId)

    try {
        // NOTE: this will not work on chrome:// pages!
        chrome.tabs.query({ active: true, lastFocusedWindow: true}, function (tabs) {
            if (browser.getCurrentSiteShared(tabs)) {
                let url = tabs[0].url

                chrome.tabs.captureVisibleTab(null, {format: "jpeg", quality: config.screenshotQuality}, function (img) {
                    if (img === undefined) {
                        // this can happen with the chrome.google.com site (this is undocumented)
                        console.log("Invalid screenshot, unable to continue.")
                        return
                    }

                    if (previousScreenshot !== img) {
                        previousScreenshot = img
                        browser.saveScreenshot(url, img)

                        // no matter what, the screenshot changed. The student is likely still active and looking at something (like a movie)
                        config.studentIsActive = true
                    } else {
                        console.log("Screenshot is the same.")
                    }
                })
            }
        })
    } catch (e) {
        console.log("error getting current site", e)
    } finally {
        // queryDelay is in seconds
        let delay = 5
        if (config.queryDelay < delay) {
            delay = config.queryDelay
        }
        if (config.screenshotDelay < delay) {
            delay = config.screenshotDelay
        }
        siteManagementId = setTimeout(getCurrentSiteAndScreenshot, delay * 1000)
    }
}

function limitTabs(tabLimit) {
    if (tabLimit > 0) {
        try {
            chrome.windows.getAll({populate: true}, function (windows) {
                try {
                    // recount everything
                    let tabCount = 0

                    // count all tabs in all windows
                    windows.forEach(function (window) {
                        tabCount += window.tabs.length
                    })

                    // reset the tab count
                    openTabs = tabCount

                    console.log("Open tabs: " + tabCount)

                    if (tabCount <= tabLimit) {
                        console.log("Tab limit not reached")
                        return
                    }

                    // check all windows and tabs and make sure the current site stays open. Only close if it's the ONLY site keeping us over the limit
                    windows.forEach(function (window) {
                        window.tabs.forEach(function (tab) {
                            if (tabCount > tabLimit) {
                                let url = tab.url
                                if (url !== browser.currentWebsite) {
                                    // We want to keep the current tab open if possible, so we make multiple rounds when checking
                                    tabCount--
                                    chrome.tabs.remove(tab.id, function () {  })
                                }
                            }
                        })
                    })


                    // got here because there are not enough tabs closed AND one of those tabs are the "current" tab in a window
                    windows.forEach(function (window) {
                        window.tabs.forEach(function (tab) {
                            if (tabCount > tabLimit) {
                                tabCount--
                                chrome.tabs.remove(tab.id, function () {  })
                            }
                        })
                    })
                } catch (e) {
                    console.log("Error configuring tabs: ", e)
                    setTimeout(function(){ limitTabs(tabLimit) }, 5000);
                }
            })
        } catch (e) {
            console.log("Error configuring tabs: ", e)
            setTimeout(function(){ limitTabs(tabLimit) }, 5000);
        }
    }
}


browser.startTimers()

processUpdates()
redirectBlockedSites()
getCurrentSiteAndScreenshot()
limitTabs(config.tabLimit)
