import { error, success } from "./debug";
import axios from "axios";

let apiBase = "https://api.premid.app/v2/";
let defaultLanguage: any, currLanguage: any;

export async function updateStrings() {
  try {
    defaultLanguage = (
      await axios(`langFile/extension/en`, {
        baseURL: apiBase
      })
    ).data;

    currLanguage = (
      await axios(`langFile/extension/${chrome.i18n.getUILanguage()}`, {
        baseURL: apiBase
      })
    ).data;

    success("langManager.ts", "Updated translations");
  } catch (e) {
    error("langManager.ts", `Error while fetching langFiles: ${e.message}`);
    return;
  }

  if (currLanguage.error) currLanguage = undefined;

  if (typeof defaultLanguage === "undefined") return;
  if (typeof currLanguage === "undefined")
    chrome.storage.local.set({
      languages: {
        default: defaultLanguage
      }
    });
  else
    chrome.storage.local.set({
      languages: {
        default: defaultLanguage,
        user: currLanguage
      }
    });
}

let initialLoader: boolean = null;
export async function loadStrings() {
  if (initialLoader == null) initialLoader = true;
  else initialLoader = false;

  return new Promise(resolve => {
    if (typeof defaultLanguage !== "undefined") resolve();

    if (initialLoader) {
      chrome.storage.local.get("languages", ({ languages }) => {
        defaultLanguage = languages.default;
        if (typeof languages.user !== "undefined")
          currLanguage = languages.user;

        resolve();
      });
    } else {
      let loadStatus = setInterval(() => {
        if (typeof defaultLanguage !== "undefined") {
          clearInterval(loadStatus);
          resolve();
        }
      }, 5);
    }
  });
}

export function getStrings() {
  return new Promise(async resolve => {
    await loadStrings();

    if (currLanguage === "undefined") resolve({ en: defaultLanguage });
    else
      resolve({
        [chrome.i18n.getUILanguage()]: currLanguage,
        en: defaultLanguage
      });
  });
}

export function getString(string: string) {
  return new Promise(async resolve => {
    await loadStrings();

    if (
      typeof currLanguage !== "undefined" &&
      typeof currLanguage[string] !== "undefined"
    )
      resolve(currLanguage[string]);
    else if (typeof defaultLanguage[string] !== "undefined")
      resolve(defaultLanguage[string]);
    else {
      error("langManager.ts", `String ${string} not found`);
      //TODO Find something better
      resolve();
    }
  });
}
