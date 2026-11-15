
import env from "$lib/env";
import API from "$lib/api/api";
import settings from "$lib/state/settings";
import lazySettingGetter from "$lib/settings/lazy-get";
import { currentApiURL } from "$lib/api/api-url";

import { get } from "svelte/store";
import { t } from "$lib/i18n/translations";
import { uuid } from "$lib/util";
import { downloadFile } from "$lib/download";
import { createDialog } from "$lib/state/dialogs";
import { downloadButtonState } from "$lib/state/omnibox";
import { createSavePipeline } from "$lib/task-manager/queue";
import { waitForItemCompletion } from "$lib/state/task-manager/queue";
import {
    addPendingItem,
    markPendingAsDone,
    markPendingAsError
} from "$lib/state/task-manager/queue";
import { openQueuePopover } from "$lib/state/queue-visibility";

import type { CobaltSaveRequestBody } from "$lib/types/api";

type SavingHandlerArgs = {
    url?: string;
    request?: CobaltSaveRequestBody;
    oldTaskId?: string;
};

const isPlaylistURL = (url: string): boolean => {
    try {
        const urlObj = new URL(url);

        if (
            (urlObj.hostname === "youtube.com" ||
                urlObj.hostname.endsWith(".youtube.com")) &&
            urlObj.pathname === "/playlist" &&
            urlObj.searchParams.get("list")
        ) {
            return true;
        }

        if (
            (urlObj.hostname === "soundcloud.com" ||
                urlObj.hostname.endsWith(".soundcloud.com")) &&
            urlObj.pathname.includes("/sets/")
        ) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
};

const fetchPlaylistLinks = async (playlistUrl: string): Promise<string[]> => {
    const urlMatch = playlistUrl.match(/^(https?:\/\/.+?)(https?:\/\/)/i);

    if (urlMatch) {
        playlistUrl = urlMatch[1];
    }

    const apiUrl = currentApiURL();

    let response: Response;

    try {
        response = await fetch(`${apiUrl}/playlist/getlinks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: playlistUrl })
        });
    } catch {
        throw new Error("error.api.unreachable");
    }

    let data: any;

    try {
        data = await response.json();
    } catch {
        throw new Error("error.api.unknown");
    }

    if (data?.status === "error") {
        throw new Error(
            data.error?.code || "error.api.unknown"
        );
    }

    if (!response.ok) {
        throw new Error("error.api.unknown");
    }

    if (!Array.isArray(data)) {
        throw new Error("error.api.unknown");
    }

    return data;
};

const processPlaylistItem = async (
    itemId: string,
    videoUrl: string,
    getSetting: ReturnType<typeof lazySettingGetter>
): Promise<void> => {
    const requestBody: CobaltSaveRequestBody = {
        url: videoUrl,
        localProcessing: get(settings).save.localProcessing,
        alwaysProxy: getSetting("save", "alwaysProxy"),
        downloadMode: getSetting("save", "downloadMode"),
        subtitleLang: getSetting("save", "subtitleLang"),
        filenameStyle: getSetting("save", "filenameStyle"),
        disableMetadata: getSetting("save", "disableMetadata"),
        audioFormat: getSetting("save", "audioFormat"),
        audioBitrate: getSetting("save", "audioBitrate"),
        tiktokFullAudio: getSetting("save", "tiktokFullAudio"),
        youtubeDubLang: getSetting("save", "youtubeDubLang"),
        youtubeBetterAudio: getSetting("save", "youtubeBetterAudio"),
        videoQuality: getSetting("save", "videoQuality"),
        youtubeVideoCodec: getSetting("save", "youtubeVideoCodec"),
        youtubeVideoContainer: getSetting("save", "youtubeVideoContainer"),
        youtubeHLS: env.ENABLE_DEPRECATED_YOUTUBE_HLS
            ? getSetting("save", "youtubeHLS")
            : undefined,
        allowH265: getSetting("save", "allowH265"),
        convertGif: getSetting("save", "convertGif"),
    };

    const response = await API.request(requestBody);

    console.log(
        `[playlist] Item ${itemId} (${videoUrl}): API response status = ${response?.status}`
    );

    if (!response) {
        markPendingAsError(itemId, "error.api.unreachable");
        return;
    }

    if (response.status === "error") {
        markPendingAsError(itemId, response.error.code);
        return;
    }

    if (response.status === "redirect") {
        downloadFile({ url: response.url, urlType: "redirect" });
        markPendingAsDone(itemId);
    } else if (response.status === "tunnel") {
        try {
            console.log(`[playlist] Item ${itemId}: Tunnel URL = ${response.url}`);

            const tunnelResponse = await fetch(response.url);

            console.log(
                `[playlist] Item ${itemId}: Response status = ${tunnelResponse.status}`
            );

            if (!tunnelResponse.ok) {
                markPendingAsError(
                    itemId,
                    `error.tunnel.${tunnelResponse.status}`
                );
                return;
            }

            const blob = await tunnelResponse.blob();
            const filename = response.filename || `download_${itemId}`;
            const file = new File([blob], filename, { type: blob.type });

            downloadFile({ file });
            markPendingAsDone(itemId);
        } catch (e) {
            console.error(`[playlist] Item ${itemId}: Fetch error`, e);
            markPendingAsError(itemId, "error.tunnel.fetch");
        }
    } else if (response.status === "local-processing") {
        createSavePipeline(response, requestBody, itemId);

        const result = await waitForItemCompletion(itemId);

        if (!result.success) {
            console.error(
                `[playlist] Item ${itemId}: Pipeline failed with error: ${result.errorCode}`
            );
        }
    } else if (response.status === "picker" && response.picker.length > 0) {
        downloadFile({ url: response.picker[0].url });
        markPendingAsDone(itemId);
    } else {
        markPendingAsError(itemId, "error.api.fetch.empty");
    }
};

export const savingHandler = async ({
    url,
    request,
    oldTaskId
}: SavingHandlerArgs) => {
    downloadButtonState.set("think");

    const error = (errorText: string) => {
        return createDialog({
            id: "save-error",
            type: "small",
            meowbalt: "error",
            buttons: [
                {
                    text: get(t)("button.gotit"),
                    main: true,
                    action: () => {},
                },
            ],
            bodyText: errorText,
        });
    };

    const getSetting = lazySettingGetter(get(settings));

    if (!request && !url) return;

    if (url && !request && isPlaylistURL(url)) {
        let links: string[];

        try {
            links = await fetchPlaylistLinks(url);
        } catch (e) {
            downloadButtonState.set("error");

            const errorCode =
                e instanceof Error
                    ? e.message
                    : "error.api.unknown";

            return error(get(t)(errorCode));
        }

        if (links.length === 0) {
            downloadButtonState.set("error");
            return error(get(t)("error.api.fetch.empty"));
        }

        downloadButtonState.set("done");

        const pendingItems: { id: string; url: string }[] = links.map(
            (link, index) => {
                const id = uuid();

                addPendingItem({
                    id,
                    state: "pending",
                    url: link,
                    filename: `Playlist item ${index + 1}`,
                    mediaType: "video",
                });

                return { id, url: link };
            }
        );

        openQueuePopover();

        const delay = (ms: number) =>
            new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < pendingItems.length; i++) {
            const { id, url: videoUrl } = pendingItems[i];

            await processPlaylistItem(id, videoUrl, getSetting);

            if (i < pendingItems.length - 1) {
                await delay(1500);
            }
        }

        return;
    }

    const selectedRequest = request || {
        url: url!,

        localProcessing: get(settings).save.localProcessing,

        alwaysProxy: getSetting("save", "alwaysProxy"),
        downloadMode: getSetting("save", "downloadMode"),

        subtitleLang: getSetting("save", "subtitleLang"),
        filenameStyle: getSetting("save", "filenameStyle"),
        disableMetadata: getSetting("save", "disableMetadata"),

        audioFormat: getSetting("save", "audioFormat"),
        audioBitrate: getSetting("save", "audioBitrate"),
        tiktokFullAudio: getSetting("save", "tiktokFullAudio"),
        youtubeDubLang: getSetting("save", "youtubeDubLang"),
        youtubeBetterAudio: getSetting("save", "youtubeBetterAudio"),

        videoQuality: getSetting("save", "videoQuality"),
        youtubeVideoCodec: getSetting("save", "youtubeVideoCodec"),
        youtubeVideoContainer: getSetting("save", "youtubeVideoContainer"),
        youtubeHLS: env.ENABLE_DEPRECATED_YOUTUBE_HLS
            ? getSetting("save", "youtubeHLS")
            : undefined,

        allowH265: getSetting("save", "allowH265"),
        convertGif: getSetting("save", "convertGif"),
    };

    const response = await API.request(selectedRequest);

    if (!response) {
        downloadButtonState.set("error");
        return error(get(t)("error.api.unreachable"));
    }

    if (response.status === "error") {
        downloadButtonState.set("error");

        return error(
            get(t)(response.error.code, response?.error?.context)
        );
    }

    if (response.status === "redirect") {
        downloadButtonState.set("done");

        return downloadFile({
            url: response.url,
            urlType: "redirect",
        });
    }

    if (response.status === "tunnel") {
        downloadButtonState.set("check");

        const probeResult = await API.probeCobaltTunnel(response.url);

        if (probeResult === 200) {
            downloadButtonState.set("done");

            return downloadFile({
                url: response.url,
            });
        } else {
            downloadButtonState.set("error");
            return error(get(t)("error.tunnel.probe"));
        }
    }

    if (response.status === "local-processing") {
        downloadButtonState.set("done");
        return createSavePipeline(response, selectedRequest, oldTaskId);
    }

    if (response.status === "picker") {
        downloadButtonState.set("done");

        const buttons = [
            {
                text: get(t)("button.done"),
                main: true,
                action: () => {},
            },
        ];

        if (response.audio) {
            const pickerAudio = response.audio;

            buttons.unshift({
                text: get(t)("button.download.audio"),
                main: false,
                action: () => {
                    downloadFile({
                        url: pickerAudio,
                    });
                },
            });
        }

        return createDialog({
            id: "download-picker",
            type: "picker",
            items: response.picker,
            buttons,
        });
    }

    downloadButtonState.set("error");
    return error(get(t)("error.api.unknown_response"));
};
