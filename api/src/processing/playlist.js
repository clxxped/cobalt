
import { env } from "../config.js";

let youtubeClient = null;
let soundcloudClient = null;

async function getYoutubeClient() {
    if (!youtubeClient) {
        const { Client } = await import("youtubei");
        youtubeClient = new Client();
    }
    return youtubeClient;
}

async function getSoundcloudClient() {
    if (!soundcloudClient) {
        const { Soundcloud } = await import("soundcloud.ts");
        soundcloudClient = new Soundcloud();
    }
    return soundcloudClient;
}

function getPlaylistLimit() {
    const maxItems = Number(env.playlistMaxItems);
    return Number.isFinite(maxItems) && maxItems > 0 ? maxItems : 30;
}

function extractYoutubePlaylistId(urlStr) {
    try {
        const url = new URL(urlStr);
        const list = url.searchParams.get("list");
        return list || null;
    } catch {
        return null;
    }
}

function isSoundcloudPlaylist(urlStr) {
    return /soundcloud\.com\/[a-z0-9_-]+\/sets\/[a-z0-9_-]+/i.test(urlStr);
}

async function getYouTubeVideos(playlistId) {
    const client = await getYoutubeClient();
    const playlist = await client.getPlaylist(playlistId);

    if (!playlist) {
        return { error: "playlist.invalid_link", status: 400 };
    }

    const videos = playlist.videos;

    if ("next" in videos) {
        await videos.next(0);
    }

    const playlistLimit = getPlaylistLimit();

    if (playlist.videoCount > playlistLimit) {
        return { error: "playlist.limit_exceeded", status: 400 };
    }

    const videoItems = "items" in videos ? videos.items : videos;
    const urls = videoItems.map((vid) => `https://youtu.be/${vid.id}`);

    return { urls };
}

async function getSoundcloudTracks(playlistUrl) {
    const client = await getSoundcloudClient();
    const playlist = await client.playlists.getAlt(playlistUrl);

    if (!playlist) {
        return { error: "playlist.invalid_link", status: 400 };
    }

    const playlistLimit = getPlaylistLimit();

    if (playlist.tracks.length > playlistLimit) {
        return { error: "playlist.limit_exceeded", status: 400 };
    }

    const urls = playlist.tracks.map((track) => track.permalink_url);

    return { urls };
}

export async function getPlaylistLinks(playlistUrl) {
    try {
        if (!playlistUrl) {
            return { error: "playlist.no_link", status: 400 };
        }

        const youtubePlaylistId = extractYoutubePlaylistId(playlistUrl);
        const isSoundcloud = isSoundcloudPlaylist(playlistUrl);

        if (youtubePlaylistId) {
            return await getYouTubeVideos(youtubePlaylistId);
        } else if (isSoundcloud) {
            return await getSoundcloudTracks(playlistUrl);
        }

        return { error: "playlist.invalid_link", status: 400 };
    } catch (error) {
        return { error: "playlist.fetch_error", status: 500 };
    }
}
