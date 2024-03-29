import { appVersion, socket, supportedAppVersion } from "../socketManager";

import cpObj from "../functions/cpObj";
import isEquivalent from "../functions/isEquivalent";
import { platformType } from "../presenceManager";
import setActivity from "../functions/setActivity";
import { setStorage } from "../functions/asyncStorage";
import { start } from "./generic";

//* Some debug stuff to prevent timestamp jumping
export let oldObject: any = null;
export let oldActivity: any = null;

export function setOldObject(object: any) {
	oldObject = object;
}

const formatNum = n =>
	Array.from(String(n))
		.reverse()
		.map((a, i) => {
			if (i % 1 == 0 && i > 0) return a + ".";
			return a;
		})
		.reverse()
		.join("");

chrome.runtime.onConnect.addListener(function(port) {
	handleTabs(port);
	handlePopup(port);
	handlePresence(port);
	handleAppTs(port);
});

function handleTabs(port: chrome.runtime.Port) {
	if (port.name === "tabs") {
		const sendResponse = () => {
			port.postMessage({
				connected: socket.connected
			});
		};

		sendResponse();

		socket.on("connect", sendResponse);
		socket.on("disconnect", sendResponse);

		port.onDisconnect.addListener(() => {
			socket.removeListener("connect", sendResponse);
			socket.removeListener("disconnect", sendResponse);
		});
	}
}

function handlePopup(port: chrome.runtime.Port) {
	if (port.name === "popup") {
		const sendResponse = () => {
			port.postMessage({
				connected: socket.connected,
				appVersionSupported: supportedAppVersion()
			});
		};

		sendResponse();

		socket.on("connect", sendResponse);
		socket.on("disconnect", sendResponse);

		port.onDisconnect.addListener(() => {
			socket.removeListener("connect", sendResponse);
			socket.removeListener("disconnect", sendResponse);
		});

		port.onMessage.addListener(msg => {
			if (msg.action === "loadLocalPresence")
				if (socket.connected) socket.emit("selectLocalPresence");
		});
	}
}

async function handlePresence(port: chrome.runtime.Port) {
	if (port.name === "contentScript") {
		port.onMessage.addListener(async msg => {
			if (
				typeof msg.presence === "undefined" ||
				typeof msg.presence.presenceData === "undefined"
			)
				return;

			const platform: platformType = await new Promise(resolve =>
				chrome.runtime.getPlatformInfo(info =>
					resolve({ os: info.os, arch: info.arch })
				)
			);

			if (typeof msg.presence.presenceData.largeImageKey !== "undefined")
				msg.presence.presenceData.largeImageText =
					`PreMiD ${platform.os === "linux" ? "🐧 " : ""}• v${formatNum(
						appVersion
					)}` +
					"⁣   " +
					`⁣⁣Extension • v${chrome.runtime.getManifest().version_name}`;

			if (oldObject == null) {
				oldObject = cpObj(msg.presence.presenceData);
				oldActivity = msg.presence;
				setActivity(msg.presence);
				return;
			}

			//* Check differences and if there aren't any return

			const check = cpObj(oldObject);
			delete check.startTimestamp;
			delete check.endTimestamp;

			const check1 = cpObj(msg.presence.presenceData);
			delete check1.startTimestamp;
			delete check1.endTimestamp;

			if (
				!(
					isEquivalent(check, check1) &&
					(oldObject.endTimestamp + 1 ===
						msg.presence.presenceData.endTimestamp ||
						oldObject.endTimestamp - 1 ===
							msg.presence.presenceData.endTimestamp ||
						oldObject.endTimestamp === msg.presence.presenceData.endTimestamp)
				)
			) {
				oldActivity = msg.presence;
				setActivity(msg.presence);
			}

			//* No presence update when either startTimestamp / endTimestamp removed
			if (
				(oldObject.startTimestamp !== undefined &&
					msg.presence.presenceData.startTimestamp === undefined) ||
				(oldObject.startTimestamp === undefined &&
					msg.presence.presenceData.startTimestamp !== undefined) ||
				(oldObject.endTimestamp !== undefined &&
					msg.presence.presenceData.endTimestamp === undefined) ||
				(oldObject.endTimestamp === undefined &&
					msg.presence.presenceData.endTimestamp !== undefined)
			) {
				oldActivity = msg.presence;
				setActivity(msg.presence);
			}

			oldObject = cpObj(msg.presence.presenceData);
			return;
		});
	}
}

function handleAppTs(port: chrome.runtime.Port) {
	if (port.name === "app.ts") {
		port.onMessage.addListener(async msg => {
			if (msg.action === "reinit") {
				await setStorage("local", {
					defaultAdded: false
				});

				let success = false;

				if (navigator.onLine) {
					try {
						await start();
						success = true;
					} catch (e) {
						// error
					}
				}

				port.postMessage({
					action: "reinit",
					success
				});
			}
		});
	}
}