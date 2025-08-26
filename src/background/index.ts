import browser, { DeclarativeNetRequest } from 'webextension-polyfill'
import accountService from '../services/account'
import { setBadgeText } from '../services/badge'
import cookie from '../services/cookie'
import ruleService from '../services/rule'
import { RequestMessage, Response } from '../types'

const RESOURCE_TYPES: DeclarativeNetRequest.ResourceType[] = [
  'main_frame',
  'sub_frame',
  'csp_report',
  'websocket',
  'xmlhttprequest',
]

async function syncAccounts() {
  const usernameCookie = await cookie.get('dotcom_user')
  const sessionCookie = await cookie.get('user_session')

  if (!usernameCookie || !sessionCookie) {
    return
  }

  const { value: account } = usernameCookie
  if (!account) {
    return
  }

  await accountService.upsert(account, await cookie.getAll())
  const accounts = await accountService.getAll()
  console.info('synced accounts', accounts)

  await updateDynamicRequestRules()

  const res = await fetch(`https://github.com/${account}.png?size=100`)
  if (res.status === 200) {
    accountService.saveAvatar(account, res.url)
  }

  await setBadgeText(account.slice(0, 2))
}

async function removeAccount(accountName: string) {
  await accountService.remove(accountName)
  await updateDynamicRequestRules()
}

async function buildCookieValue(accountName: string): Promise<string | null> {
  const account = await accountService.find(accountName)
  const cookies = account?.cookies || []

  if (!cookies.length) {
    return null
  }

  return cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .concat(`__account__=${accountName}`)
    .join('; ')
}

async function buildAddRules(): Promise<DeclarativeNetRequest.Rule[]> {
  const requestRules: DeclarativeNetRequest.Rule[] = []
  const autoSwitchRules = await ruleService.getAll()

  for (const [index, rule] of autoSwitchRules.entries()) {
    const cookieValue = await buildCookieValue(rule.account)
    if (!cookieValue) {
      continue
    }

    requestRules.push({
      id: index + 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Cookie',
            operation: 'set',
            value: cookieValue,
          },
        ],
      },
      condition: {
        regexFilter: `${rule.urlPattern}|__account__=${rule.account}`,
        resourceTypes: RESOURCE_TYPES,
      },
    })
  }
  return requestRules
}

async function updateDynamicRequestRules() {
  if (!browser.declarativeNetRequest) {
    return
  }

  const existingRules = await browser.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existingRules.map((rule) => rule.id)
  const addRules = await buildAddRules()

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  })

  const rules = await browser.declarativeNetRequest.getDynamicRules()
  console.info('Current dynamic rules:', rules)
}

// Watch the requests, if the main_frame url matches any of the auto switch rules, switch to the account
function watchAutoSwitchRequests() {
  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      ruleService.getAll().then((autoSwitchRules) => {
        for (const rule of autoSwitchRules) {
          if (new RegExp(rule.urlPattern).test(details.url)) {
            console.info('onBeforeRequest: found an auto switch rule for url', details.url, rule)
            return accountService.switchTo(rule.account)
          }
        }
      })
    },
    {
      urls: ['https://github.com/*'],
      types: ['main_frame'],
    },
  )
}

// Some enterprise / SAML (Okta) flows set additional cookies (e.g. _gh_sso) without
// changing the dotcom_user cookie. Previously we only synced account cookies when
// dotcom_user changed, so the saved snapshot missed SSO cookies; restoring the old
// snapshot caused GitHub to repeatedly demand SSO re-auth (loop). We now also
// re-sync on changes to a set of auth-related cookies, debounced to avoid bursts.
function watchCookies() {
  const AUTH_COOKIES = new Set([
    'dotcom_user', // primary username cookie
    'user_session', // session identifier
    '_gh_sso', // SSO session marker (enterprise)
    'logged_in', // login state flag
  ])

  let syncTimer: number | undefined
  function scheduleSync() {
    if (syncTimer) {
      clearTimeout(syncTimer)
    }
    // Debounce multiple rapid cookie updates during login / SSO handshake
    syncTimer = setTimeout(() => {
      syncAccounts().catch((e) => console.warn('Failed to sync accounts after auth cookie change', e))
      syncTimer = undefined
    }, 300) as unknown as number
  }

  browser.cookies.onChanged.addListener(async (changeInfo) => {
    const { cookie: changedCookie, removed } = changeInfo

    if (!AUTH_COOKIES.has(changedCookie.name)) {
      return
    }

    if (removed) {
      if (changedCookie.name === 'dotcom_user') {
        console.info('dotcom_user cookie removed')
        await setBadgeText('...')
      }
      // If the username is removed we can't really sync until it's set again.
      return
    }

    if (changedCookie.name === 'dotcom_user') {
      console.info('New dotcom_user cookie', changedCookie.value)
    } else {
      console.info('Auth-related cookie changed', changedCookie.name)
    }
    scheduleSync()
  })
}

function handleMessage(message: RequestMessage) {
  const { type } = message
  switch (type) {
    case 'getAccounts':
      return accountService.getAllNames()
    case 'switchAccount':
      return accountService.switchTo(message.account)
    case 'removeAccount':
      return removeAccount(message.account)
    case 'clearCookies':
      return cookie.clear()
    case 'getAutoSwitchRules':
      return ruleService.getAll()
  }
}

function listenMessage() {
  browser.runtime.onMessage.addListener(
    async (request: RequestMessage, _sender): Promise<Response<unknown>> => {
      try {
        const data = await handleMessage(request)
        return { success: true, data }
      } catch (error: unknown) {
        return { success: false, error: error as Error }
      }
    },
  )
}

function interceptRequests() {
  browser.webRequest.onBeforeSendHeaders.addListener(
    async (details) => {
      if (!details.requestHeaders) {
        return { requestHeaders: details.requestHeaders }
      }

      const autoSwitchRules = await ruleService.getAll()
      for (const rule of autoSwitchRules) {
        const urlPattern = `${rule.urlPattern}|__account__=${rule.account}`
        if (new RegExp(urlPattern).test(details.url)) {
          const cookieValue = await buildCookieValue(rule.account)
          if (cookieValue) {
            for (const header of details.requestHeaders) {
              if (header.name.toLowerCase() === 'cookie') {
                header.value = cookieValue
              }
            }
          }
          console.info('interceptRequests: found an auto switch rule for url', details.url, rule)
          return { requestHeaders: details.requestHeaders }
        }
      }

      return { requestHeaders: details.requestHeaders }
    },
    {
      urls: ['https://github.com/*'],
      types: RESOURCE_TYPES,
    },
    ['blocking', 'requestHeaders'],
  )
}

async function init() {
  await syncAccounts()

  watchAutoSwitchRequests()
  watchCookies()
  listenMessage()

  if (!browser.declarativeNetRequest) {
    interceptRequests()
  }

  /*
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    console.info('onRuleMatchedDebug', info)
  })*/
}

init()
